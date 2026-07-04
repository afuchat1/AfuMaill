import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { W } from "@/components/web/webColors";
import { useAuth } from "@/context/AuthContext";
import { apiUrl } from "@/lib/api-base";
import { supabase } from "@/lib/supabase";

interface DeveloperApp {
  clientId: string;
  name: string;
  logoUrl: string | null;
  redirectUris: string[];
  scopes: string[];
  clientType: "public" | "confidential";
  status: "active" | "suspended";
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

async function authedFetch(path: string, init?: RequestInit) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Your AfuMail session has expired. Please sign in again.");
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description ?? data.error ?? "Something went wrong. Please try again.");
  }
  return data;
}

/**
 * AfuMail Developer Dashboard.
 *
 * Self-service OAuth application registration. Only signed-in AfuMail users
 * can create apps here, and every app is permanently owned by its creator —
 * this page never shows apps belonging to anyone else. Confidential-app
 * secrets are shown exactly once at creation/rotation and never again,
 * matching how the api-server stores only their hash.
 */
export default function DeveloperAppsScreen() {
  const { user } = useAuth();
  const [apps, setApps] = useState<DeveloperApp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [revealSecret, setRevealSecret] = useState<{ clientId: string; secret: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authedFetch("/api/developer/apps");
      setApps(data.apps as DeveloperApp[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(app: DeveloperApp) {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${app.name}"? This immediately revokes every user's access and cannot be undone.`)) {
      return;
    }
    try {
      await authedFetch(`/api/developer/apps/${encodeURIComponent(app.clientId)}`, { method: "DELETE" });
      setApps((prev) => (prev ? prev.filter((a) => a.clientId !== app.clientId) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete the application.");
    }
  }

  async function handleRotateSecret(app: DeveloperApp) {
    try {
      const data = await authedFetch(`/api/developer/apps/${encodeURIComponent(app.clientId)}/rotate-secret`, {
        method: "POST",
      });
      setRevealSecret({ clientId: app.clientId, secret: data.clientSecret });
      setApps((prev) => (prev ? prev.map((a) => (a.clientId === app.clientId ? { ...a, hasSecret: true } : a)) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rotate the client secret.");
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Developer Dashboard</Text>
            <Text style={styles.subtitle}>
              Register OAuth applications that sign users in with their AfuMail account, {user?.name ?? ""}.
            </Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => setShowCreate(true)}>
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>New application</Text>
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-triangle" size={16} color={W.destructiveText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={W.accent} />
          </View>
        )}

        {!loading && apps && apps.length === 0 && (
          <View style={styles.empty}>
            <Feather name="grid" size={28} color={W.textMuted} />
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyText}>
              Register your first application to receive a client_id and start sign-in-with-AfuMail integration.
            </Text>
          </View>
        )}

        {!loading &&
          apps?.map((app) => (
            <AppCard key={app.clientId} app={app} onDelete={handleDelete} onRotateSecret={handleRotateSecret} />
          ))}
      </ScrollView>

      {showCreate && (
        <CreateAppModal
          onClose={() => setShowCreate(false)}
          onCreated={(app, secret) => {
            setApps((prev) => (prev ? [app, ...prev] : [app]));
            setShowCreate(false);
            if (secret) setRevealSecret({ clientId: app.clientId, secret });
          }}
          creating={creating}
          setCreating={setCreating}
        />
      )}

      {revealSecret && (
        <SecretModal
          secret={revealSecret.secret}
          onClose={() => setRevealSecret(null)}
        />
      )}
    </View>
  );
}

function AppCard({
  app,
  onDelete,
  onRotateSecret,
}: {
  app: DeveloperApp;
  onDelete: (app: DeveloperApp) => void;
  onRotateSecret: (app: DeveloperApp) => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyClientId() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(app.clientId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.appName}>{app.name}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: app.clientType === "confidential" ? W.accentLight : W.successLight },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: app.clientType === "confidential" ? W.accentText : W.success },
                ]}
              >
                {app.clientType === "confidential" ? "Confidential" : "Public (PKCE)"}
              </Text>
            </View>
            {app.status === "suspended" && (
              <View style={[styles.badge, { backgroundColor: W.destructiveLight }]}>
                <Text style={[styles.badgeText, { color: W.destructiveText }]}>Suspended</Text>
              </View>
            )}
          </View>
          <Pressable onPress={copyClientId} style={styles.clientIdRow}>
            <Text style={styles.clientIdText} selectable>
              {app.clientId}
            </Text>
            <Feather name={copied ? "check" : "copy"} size={13} color={W.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Redirect URIs</Text>
        {app.redirectUris.map((uri) => (
          <Text key={uri} style={styles.metaValue} numberOfLines={1}>
            {uri}
          </Text>
        ))}
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Scopes</Text>
        <Text style={styles.metaValue}>{app.scopes.join(", ")}</Text>
      </View>

      <View style={styles.actionsRow}>
        {app.clientType === "confidential" && (
          <Pressable style={styles.secondaryButton} onPress={() => onRotateSecret(app)}>
            <Feather name="refresh-cw" size={13} color={W.textPrimary} />
            <Text style={styles.secondaryButtonText}>{app.hasSecret ? "Rotate secret" : "Generate secret"}</Text>
          </Pressable>
        )}
        <Pressable style={styles.dangerButton} onPress={() => onDelete(app)}>
          <Feather name="trash-2" size={13} color={W.destructiveText} />
          <Text style={styles.dangerButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CreateAppModal({
  onClose,
  onCreated,
  creating,
  setCreating,
}: {
  onClose: () => void;
  onCreated: (app: DeveloperApp, secret: string | null) => void;
  creating: boolean;
  setCreating: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [clientType, setClientType] = useState<"public" | "confidential">("public");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);
    const uris = redirectUris
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (!name.trim() || uris.length === 0) {
      setFormError("Application name and at least one redirect URI are required.");
      return;
    }
    setCreating(true);
    try {
      const data = await authedFetch("/api/developer/apps", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), redirect_uris: uris, client_type: clientType }),
      });
      onCreated(data.app as DeveloperApp, data.clientSecret ?? null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to register the application.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New OAuth application</Text>

          <Text style={styles.inputLabel}>Application name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="My Cool App"
            placeholderTextColor={W.textMuted}
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Redirect URIs (one per line)</Text>
          <TextInput
            value={redirectUris}
            onChangeText={setRedirectUris}
            placeholder={"https://myapp.com/callback"}
            placeholderTextColor={W.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Text style={styles.inputLabel}>Client type</Text>
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeOption, clientType === "public" && styles.typeOptionActive]}
              onPress={() => setClientType("public")}
            >
              <Text style={[styles.typeOptionText, clientType === "public" && styles.typeOptionTextActive]}>
                Public (mobile / SPA)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.typeOption, clientType === "confidential" && styles.typeOptionActive]}
              onPress={() => setClientType("confidential")}
            >
              <Text style={[styles.typeOptionText, clientType === "confidential" && styles.typeOptionTextActive]}>
                Confidential (server)
              </Text>
            </Pressable>
          </View>
          <Text style={styles.typeHint}>
            {clientType === "public"
              ? "Uses PKCE only. Choose this for native, mobile, or browser apps that can't keep a secret safe."
              : "Also requires a client_secret at the token endpoint. Choose this only for a trusted backend server."}
          </Text>

          {formError && <Text style={styles.formError}>{formError}</Text>}

          <View style={styles.modalActions}>
            <Pressable style={styles.modalCancel} onPress={onClose} disabled={creating}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={creating}>
              {creating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SecretModal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Feather name="key" size={22} color={W.accent} />
          <Text style={styles.modalTitle}>Your client secret</Text>
          <Text style={styles.typeHint}>
            Copy it now — for your security, AfuMail cannot show this secret again. If you lose it, rotate to get a
            new one.
          </Text>
          <View style={styles.secretBox}>
            <Text style={styles.secretText} selectable>
              {secret}
            </Text>
            <Pressable onPress={copy}>
              <Feather name={copied ? "check" : "copy"} size={16} color={W.textMuted} />
            </Pressable>
          </View>
          <Pressable style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>I've copied it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: W.bg, minHeight: "100vh" as unknown as number },
  scroll: { padding: 32, maxWidth: 760, width: "100%", alignSelf: "center", gap: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "700", color: W.textPrimary },
  subtitle: { fontSize: 14, color: W.textSecondary, marginTop: 4, maxWidth: 440 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: W.destructiveLight,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: W.destructiveText, fontSize: 13, flex: 1 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: W.textPrimary },
  emptyText: { fontSize: 13, color: W.textMuted, textAlign: "center", maxWidth: 320 },
  card: { backgroundColor: W.bgCard, borderRadius: 14, borderWidth: 1, borderColor: W.border, padding: 18, gap: 4 },
  cardHeaderRow: { flexDirection: "row", alignItems: "flex-start" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  appName: { fontSize: 16, fontWeight: "700", color: W.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  clientIdRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  clientIdText: { fontFamily: "monospace" as never, fontSize: 12, color: W.textMuted },
  divider: { height: 1, backgroundColor: W.borderLight, marginVertical: 10 },
  metaRow: { marginBottom: 6 },
  metaLabel: { fontSize: 11, color: W.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 13, color: W.textSecondary },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: W.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: W.bgSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryButtonText: { fontSize: 12, fontWeight: "600", color: W.textPrimary },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: W.destructiveLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dangerButtonText: { fontSize: 12, fontWeight: "600", color: W.destructiveText },
  modalOverlay: { flex: 1, backgroundColor: "rgba(17,24,39,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 440, gap: 4 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: W.textPrimary, marginBottom: 6 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: W.textSecondary, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: W.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: W.textPrimary,
  },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: W.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeOptionActive: { borderColor: W.accent, backgroundColor: W.accentLight },
  typeOptionText: { fontSize: 12, fontWeight: "600", color: W.textSecondary },
  typeOptionTextActive: { color: W.accentText },
  typeHint: { fontSize: 12, color: W.textMuted, marginTop: 8, lineHeight: 17 },
  formError: { fontSize: 12, color: W.destructiveText, marginTop: 10 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modalCancelText: { fontSize: 13, fontWeight: "600", color: W.textSecondary },
  secretBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: W.bgSecondary,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  secretText: { fontFamily: "monospace" as never, fontSize: 12, color: W.textPrimary, flex: 1, marginRight: 8 },
});
