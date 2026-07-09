/**
 * Developer Docs — publicly accessible without signing in.
 * Shows the AfuMail OAuth 2.1 / OIDC integration guide for developers
 * building apps that use "Sign in with AfuMail".
 */
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiUrl } from "@/lib/api-base";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = "overview" | "flow" | "endpoints" | "scopes" | "security" | "errors";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "book-open" },
  { id: "flow", label: "Flow", icon: "git-merge" },
  { id: "endpoints", label: "Endpoints", icon: "code" },
  { id: "scopes", label: "Scopes", icon: "shield" },
  { id: "security", label: "Security", icon: "lock" },
  { id: "errors", label: "Errors", icon: "alert-circle" },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DeveloperDocsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            AfuMail for Developers
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            OAuth 2.1 · OpenID Connect · PKCE
          </Text>
        </View>
        <Pressable
          onPress={() => Linking.openURL("https://mail.afuchat.com/developer")}
          style={[styles.webDocsBtn, { borderColor: colors.border }]}
        >
          <Feather name="external-link" size={14} color={colors.foreground} />
          <Text style={[styles.webDocsBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            Full Docs
          </Text>
        </Pressable>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && { borderBottomColor: colors.foreground },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === tab.id ? colors.foreground : colors.mutedForeground,
                  fontFamily: activeTab === tab.id ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {activeTab === "overview" && <OverviewTab colors={colors} />}
        {activeTab === "flow" && <FlowTab colors={colors} />}
        {activeTab === "endpoints" && <EndpointsTab colors={colors} />}
        {activeTab === "scopes" && <ScopesTab colors={colors} />}
        {activeTab === "security" && <SecurityTab colors={colors} />}
        {activeTab === "errors" && <ErrorsTab colors={colors} />}
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Callout({ icon, text, colors }: { icon: string; text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.callout, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "40" }]}>
      <Feather name={icon as never} size={16} color={colors.accent} style={{ marginTop: 1 }} />
      <Text style={[styles.calloutText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {text}
      </Text>
    </View>
  );
}

function InfoCard({
  icon,
  title,
  body,
  colors,
}: {
  icon: string;
  title: string;
  body: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.infoIconBox, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as never} size={18} color={colors.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {title}
        </Text>
        <Text style={[styles.infoBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function FlowStep({ n, title, body, colors }: { n: number; title: string; body: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.flowStep}>
      <View style={[styles.flowNum, { backgroundColor: colors.accent }]}>
        <Text style={[styles.flowNumText, { fontFamily: "Inter_700Bold" }]}>{n}</Text>
      </View>
      <View style={styles.flowConnector}>
        {n < 6 && <View style={[styles.flowLine, { backgroundColor: colors.border }]} />}
      </View>
      <View style={[styles.flowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.flowTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {title}
        </Text>
        <Text style={[styles.flowBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function EndpointRow({
  method,
  path,
  desc,
  auth,
  colors,
}: {
  method: "GET" | "POST" | "DELETE";
  path: string;
  desc: string;
  auth: string;
  colors: ReturnType<typeof useColors>;
}) {
  const methodColor = method === "GET" ? "#22c55e" : method === "POST" ? colors.accent : "#ef4444";
  const methodBg = method === "GET" ? "#22c55e22" : method === "POST" ? colors.accent + "22" : "#ef444422";

  return (
    <View style={[styles.endpointCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.endpointHeader}>
        <View style={[styles.methodBadge, { backgroundColor: methodBg }]}>
          <Text style={[styles.methodText, { color: methodColor, fontFamily: "Inter_700Bold" }]}>{method}</Text>
        </View>
        <Text style={[styles.endpointPath, { color: colors.foreground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {path}
        </Text>
      </View>
      <Text style={[styles.endpointDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {desc}
      </Text>
      <View style={[styles.authBadge, { backgroundColor: colors.secondary }]}>
        <Feather name="lock" size={10} color={colors.mutedForeground} />
        <Text style={[styles.authBadgeText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          {auth}
        </Text>
      </View>
    </View>
  );
}

function ScopeRow({
  name,
  claims,
  desc,
  colors,
}: {
  name: string;
  claims: string;
  desc: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.scopeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.scopeHeader}>
        <View style={[styles.scopeNameBadge, { backgroundColor: colors.accent + "22" }]}>
          <Text style={[styles.scopeNameText, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>
            {name}
          </Text>
        </View>
        <Text style={[styles.scopeClaims, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {claims}
        </Text>
      </View>
      <Text style={[styles.scopeDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {desc}
      </Text>
    </View>
  );
}

function SecurityItem({ icon, title, body, colors }: { icon: string; title: string; body: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.securityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.securityIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as never} size={16} color={colors.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.securityTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {title}
        </Text>
        <Text style={[styles.securityBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function ErrorRow({ code, http, desc, colors }: { code: string; http: string; desc: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.errorRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.errorCode, { fontFamily: "Inter_600SemiBold" }]}>{code}</Text>
      <View style={[styles.httpBadge, { backgroundColor: "#ef444422" }]}>
        <Text style={[styles.httpText, { color: "#ef4444", fontFamily: "Inter_700Bold" }]}>{http}</Text>
      </View>
      <Text style={[styles.errorDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {desc}
      </Text>
    </View>
  );
}

// ─── Tab content ─────────────────────────────────────────────────────────────

function OverviewTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const docsUrl = "https://lqowocmjmhbkoxlwyxku.supabase.co/functions/v1/oauth/.well-known/openid-configuration";
  return (
    <View>
      {/* Hero banner */}
      <View style={[styles.heroBanner, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "30" }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.accent }]}>
          <Feather name="shield" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Sign in with AfuMail
          </Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Let your users authenticate with their AfuMail account. One account, every Afu app.
          </Text>
        </View>
      </View>

      <Section title="What is AfuMail OAuth?">
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          AfuMail is the{" "}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
            identity foundation of the entire Afu ecosystem
          </Text>
          . Every user creates one AfuMail account and uses it across every Afu product — AfuChat,
          Engagera, AfuCloud, MMRadio — without ever creating another account.
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          The OAuth platform is built on open standards: <Text style={{ color: colors.foreground }}>OAuth 2.1</Text>,{" "}
          <Text style={{ color: colors.foreground }}>OpenID Connect</Text>, and{" "}
          <Text style={{ color: colors.foreground }}>PKCE</Text>. If you've integrated Google Sign-In before,
          this will feel familiar.
        </Text>
      </Section>

      <Section title="Key capabilities">
        <InfoCard icon="shield-off" title="No passwords shared" body="Your app never sees the user's password. Authentication always happens on AfuMail's own UI." colors={colors} />
        <InfoCard icon="refresh-cw" title="Token rotation" body="Refresh tokens rotate on every use. Stolen tokens are automatically invalidated." colors={colors} />
        <InfoCard icon="check-circle" title="User consent" body="Users explicitly approve what your app can access and can revoke access at any time from Settings." colors={colors} />
        <InfoCard icon="globe" title="Standard OIDC" body="OIDC-compatible userinfo endpoint. Use any standard OAuth 2.1 library in your app." colors={colors} />
      </Section>

      <Section title="Base URLs">
        <View style={[styles.urlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.urlRow}>
            <Text style={[styles.urlLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Production API
            </Text>
            <Text style={[styles.urlValue, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              https://lqowocmjmhbkoxlwyxku.supabase.co/functions/v1
            </Text>
          </View>
          <View style={[styles.urlDivider, { backgroundColor: colors.border }]} />
          <View style={styles.urlRow}>
            <Text style={[styles.urlLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Consent screen
            </Text>
            <Text style={[styles.urlValue, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              https://mail.afuchat.com/oauth/authorize
            </Text>
          </View>
          <View style={[styles.urlDivider, { backgroundColor: colors.border }]} />
          <View style={styles.urlRow}>
            <Text style={[styles.urlLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              OIDC Discovery
            </Text>
            <Text style={[styles.urlValue, { color: colors.accent, fontFamily: "Inter_400Regular" }]}>
              /functions/v1/oauth/.well-known/openid-configuration
            </Text>
          </View>
        </View>
      </Section>

      <Callout
        icon="book-open"
        text={`Full documentation with code examples in JavaScript, Python, and cURL is available at:\n${docsUrl}`}
        colors={colors}
      />

      <Pressable
        onPress={() => Linking.openURL(docsUrl)}
        style={[styles.docsBtn, { backgroundColor: colors.foreground }]}
      >
        <Feather name="external-link" size={16} color={colors.background} />
        <Text style={[styles.docsBtnText, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
          Open Full Documentation
        </Text>
      </Pressable>
    </View>
  );
}

function FlowTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View>
      <Section title="Authorization Code Flow (PKCE)">
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          AfuMail implements the <Text style={{ color: colors.foreground }}>OAuth 2.1 Authorization Code flow with PKCE</Text>.
          PKCE (Proof Key for Code Exchange) is mandatory — there are no exceptions and no client secrets.
        </Text>
      </Section>

      <View style={styles.flowList}>
        <FlowStep n={1} title="Generate PKCE" body="Create a random 64-byte code verifier. Hash it with SHA-256 to get the code challenge. Store the verifier secretly in your app." colors={colors} />
        <FlowStep n={2} title="Redirect to consent screen" body="Send the user to mail.afuchat.com/oauth/authorize with your client_id, redirect_uri, code_challenge, and scopes." colors={colors} />
        <FlowStep n={3} title="User signs in and approves" body="AfuMail handles the login UI. The user sees exactly what your app is requesting and taps Allow or Deny." colors={colors} />
        <FlowStep n={4} title="Receive authorization code" body="AfuMail redirects back to your redirect_uri with ?code=...&state=... The code expires in 60 seconds and is single-use." colors={colors} />
        <FlowStep n={5} title="Exchange code for tokens" body="POST the code and your code_verifier to /functions/v1/oauth/token. AfuMail verifies the PKCE hash and issues an access + refresh token." colors={colors} />
        <FlowStep n={6} title="Fetch user profile" body="GET /functions/v1/oauth/userinfo with Authorization: Bearer <access_token>. Returns the user's ID, name, username, and email." colors={colors} />
      </View>

      <Callout
        icon="alert-triangle"
        text="Always verify the state parameter at your callback to prevent CSRF attacks. If state doesn't match what you sent, abort the flow."
        colors={colors}
      />

      <Section title="Token lifetimes">
        <View style={[styles.lifetimeTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { token: "Authorization code", ttl: "60 seconds", note: "Single-use" },
            { token: "Access token", ttl: "1 hour", note: "Use for API calls" },
            { token: "Refresh token", ttl: "30 days", note: "Rotates on each use" },
          ].map((row, i, arr) => (
            <View key={row.token}>
              <View style={styles.lifetimeRow}>
                <Text style={[styles.lifetimeToken, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {row.token}
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={[styles.lifetimeTtl, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                  {row.ttl}
                </Text>
                <Text style={[styles.lifetimeNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {row.note}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.lifetimeDivider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </Section>
    </View>
  );
}

function EndpointsTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View>
      <Section title="All OAuth Endpoints">
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          All endpoints are under <Text style={{ color: colors.foreground }}>https://lqowocmjmhbkoxlwyxku.supabase.co/functions/v1/oauth/</Text>
        </Text>
      </Section>

      <EndpointRow method="GET" path="/functions/v1/oauth/.well-known/openid-configuration" desc="OIDC Discovery document. Auto-configure any OIDC library from this URL." auth="Public" colors={colors} />
      <EndpointRow method="GET" path="/functions/v1/oauth/clients/:clientId" desc="Client metadata and redirect URI validation. Used by the consent screen." auth="Public" colors={colors} />
      <EndpointRow method="POST" path="/functions/v1/oauth/authorize" desc="Mint a one-time authorization code after user approves consent." auth="AfuMail session" colors={colors} />
      <EndpointRow method="POST" path="/functions/v1/oauth/token" desc="Exchange authorization code for tokens, or rotate a refresh token." auth="Public" colors={colors} />
      <EndpointRow method="GET" path="/functions/v1/oauth/userinfo" desc="OIDC userinfo — returns name, username, email for the token's user." auth="OAuth access token" colors={colors} />
      <EndpointRow method="POST" path="/functions/v1/oauth/revoke" desc="RFC 7009 token revocation. Accepts access or refresh tokens." auth="Public" colors={colors} />
      <EndpointRow method="POST" path="/functions/v1/oauth/introspect" desc="RFC 7662 token introspection — check if a token is active." auth="AfuMail session" colors={colors} />
      <EndpointRow method="GET" path="/functions/v1/oauth/grants" desc="List all apps the signed-in user has authorized." auth="AfuMail session" colors={colors} />
      <EndpointRow method="DELETE" path="/functions/v1/oauth/grants/:clientId" desc="Revoke all tokens issued to a specific client (user-initiated)." auth="AfuMail session" colors={colors} />

      <Callout
        icon="info"
        text={`"AfuMail session" means Authorization: Bearer <supabase-access-token> from the user's AfuMail login. "OAuth access token" means the opaque token returned by /functions/v1/oauth/token.`}
        colors={colors}
      />
    </View>
  );
}

function ScopesTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View>
      <Section title="Available Scopes">
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Scopes control which user data your app can access. Request only what you need — users
          see exactly what they're approving on the consent screen.
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Pass multiple scopes as a space-separated string: <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>scope=profile email</Text>
        </Text>
      </Section>

      <ScopeRow
        name="profile"
        claims="name, preferred_username"
        desc="Access the user's display name and @username. Does not include the email address."
        colors={colors}
      />
      <ScopeRow
        name="email"
        claims="email, email_verified"
        desc="Access the user's AfuMail address. email_verified is always true — AfuMail verifies email at registration."
        colors={colors}
      />

      <Section title="UserInfo response by scope">
        <View style={[styles.claimsTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { claim: "sub", scope: "always", desc: "Permanent user ID (UUID)" },
            { claim: "name", scope: "profile", desc: "Full display name" },
            { claim: "preferred_username", scope: "profile", desc: "@username (without the @)" },
            { claim: "email", scope: "email", desc: "AfuMail address (user@afumail.com)" },
            { claim: "email_verified", scope: "email", desc: "Always true for AfuMail accounts" },
          ].map((row, i, arr) => (
            <View key={row.claim}>
              <View style={styles.claimsRow}>
                <Text style={[styles.claimName, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {row.claim}
                </Text>
                <View style={[styles.claimScope, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.claimScopeText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    {row.scope}
                  </Text>
                </View>
                <Text style={[styles.claimDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {row.desc}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.lifetimeDivider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </Section>

      <Callout
        icon="zoom-in"
        text="Additional scopes (inbox.read, calendar.read, etc.) are planned and will be added here when available."
        colors={colors}
      />
    </View>
  );
}

function SecurityTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View>
      <Section title="Security Model">
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          AfuMail is designed for enterprise-grade security. Every decision follows OAuth 2.1
          best practices and security best current practices (BCP 212).
        </Text>
      </Section>

      <SecurityItem icon="key" title="PKCE Required" body="All clients must use PKCE with S256. There is no way to get tokens without it — this prevents authorization code interception attacks even on public clients." colors={colors} />
      <SecurityItem icon="refresh-cw" title="Token Rotation" body="Every refresh token use issues a new access + refresh pair. The old tokens are immediately revoked. Stolen refresh tokens can't be reused." colors={colors} />
      <SecurityItem icon="clock" title="Short-lived Tokens" body="Access tokens expire in 1 hour. Authorization codes expire in 60 seconds and are single-use. Minimizes the blast radius of a leaked token." colors={colors} />
      <SecurityItem icon="target" title="Exact Redirect URI Matching" body="redirect_uri values are matched exactly — no wildcards, no partial matches, no open redirects. Every permitted URI must be pre-registered." colors={colors} />
      <SecurityItem icon="shield" title="No Client Secrets" body="AfuMail uses public client semantics (OAuth 2.1). PKCE replaces client secrets and is safe for browser and mobile apps." colors={colors} />
      <SecurityItem icon="eye-off" title="Passwords Never Leave AfuMail" body="Your app never receives, sees, or stores user passwords. Authentication always happens on AfuMail's own interface." colors={colors} />
      <SecurityItem icon="user-check" title="User Consent" body="Users explicitly approve what each app can access. They can revoke access at any time from Settings → Connected Accounts." colors={colors} />
      <SecurityItem icon="activity" title="Audit Logs" body="Every authorization, token issue, and revocation is recorded. Users can see their login history and active sessions." colors={colors} />
    </View>
  );
}

function ErrorsTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View>
      <Section title="Error Response Format">
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          AfuMail follows RFC 6749 error response format. All errors are JSON with an{" "}
          <Text style={{ color: colors.foreground }}>error</Text> field and an optional{" "}
          <Text style={{ color: colors.foreground }}>error_description</Text>.
        </Text>
      </Section>

      <View style={[styles.errorTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ErrorRow code="invalid_request" http="400" desc="Missing or malformed request parameters." colors={colors} />
        <ErrorRow code="invalid_grant" http="400" desc="Authorization code is invalid, expired, used, or PKCE verification failed." colors={colors} />
        <ErrorRow code="unsupported_grant_type" http="400" desc="grant_type is not authorization_code or refresh_token." colors={colors} />
        <ErrorRow code="invalid_token" http="401" desc="Access token is invalid, expired, or revoked." colors={colors} />
        <ErrorRow code="unauthorized" http="401" desc="No valid AfuMail session token (for session-gated endpoints)." colors={colors} />
        <ErrorRow code="access_denied" http="—" desc="User denied the consent screen. Returned as ?error=access_denied in the redirect URL." colors={colors} />
        <ErrorRow code="server_error" http="500" desc="An unexpected error occurred. Retry after a short delay." colors={colors} />
      </View>

      <Section title="Callback errors">
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          When the user denies or an error occurs before the token stage, AfuMail redirects to
          your redirect_uri with query parameters instead of a code:
        </Text>
        <View style={[styles.codeBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.codeText, { color: colors.foreground, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" }]}>
            {"https://yourapp.com/cb\n  ?error=access_denied\n  &state=<your-state>"}
          </Text>
        </View>
        <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Always check for <Text style={{ color: colors.foreground }}>?error=</Text> in your callback before
          processing the <Text style={{ color: colors.foreground }}>?code=</Text>.
        </Text>
      </Section>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  webDocsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  webDocsBtnText: { fontSize: 12 },

  // Tab bar
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
  },
  tabBarContent: { paddingHorizontal: 12, gap: 4 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13 },

  // Content
  content: { padding: 20 },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 10,
    color: "#fafafa", // fallback; ideally pass colors
  },
  body: { fontSize: 14, lineHeight: 22, marginBottom: 10 },

  // Callout
  callout: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
    alignItems: "flex-start",
  },
  calloutText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Info cards
  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { fontSize: 14, marginBottom: 3 },
  infoBody: { fontSize: 13, lineHeight: 19 },

  // Hero banner
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 17, marginBottom: 4 },
  heroSub: { fontSize: 13, lineHeight: 19 },

  // URL card
  urlCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  urlRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, flexWrap: "wrap" },
  urlLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 90 },
  urlValue: { fontSize: 13, flex: 1 },
  urlDivider: { height: 1 },

  // Docs button
  docsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginVertical: 16,
  },
  docsBtnText: { fontSize: 15 },

  // Flow
  flowList: { marginBottom: 24 },
  flowStep: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 0,
    position: "relative",
  },
  flowNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    zIndex: 1,
  },
  flowNumText: { color: "#fff", fontSize: 12 },
  flowConnector: {
    width: 24,
    alignItems: "center",
  },
  flowLine: {
    position: "absolute",
    top: 28,
    bottom: -8,
    width: 2,
    left: 11,
    zIndex: 0,
  },
  flowCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    marginLeft: 4,
  },
  flowTitle: { fontSize: 14, marginBottom: 4 },
  flowBody: { fontSize: 13, lineHeight: 19 },

  // Lifetime table
  lifetimeTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  lifetimeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  lifetimeToken: { fontSize: 13, flex: 1 },
  lifetimeTtl: { fontSize: 13 },
  lifetimeNote: { fontSize: 12 },
  lifetimeDivider: { height: 1 },

  // Endpoints
  endpointCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  endpointHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  methodBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  methodText: { fontSize: 11, letterSpacing: 0.5 },
  endpointPath: { fontSize: 13, flex: 1 },
  endpointDesc: { fontSize: 13, lineHeight: 19 },
  authBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  authBadgeText: { fontSize: 11 },

  // Scopes
  scopeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  scopeHeader: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  scopeNameBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  scopeNameText: { fontSize: 13 },
  scopeClaims: { fontSize: 12 },
  scopeDesc: { fontSize: 13, lineHeight: 19 },

  // Claims table
  claimsTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  claimsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  claimName: { fontSize: 13, minWidth: 130 },
  claimScope: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  claimScopeText: { fontSize: 11 },
  claimDesc: { fontSize: 12, flex: 1 },

  // Security
  securityItem: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  securityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: { fontSize: 14, marginBottom: 3 },
  securityBody: { fontSize: 13, lineHeight: 19 },

  // Errors
  errorTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  errorRow: {
    padding: 12,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  errorCode: { fontSize: 13, color: "#ef4444" },
  httpBadge: { alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  httpText: { fontSize: 11 },
  errorDesc: { fontSize: 13, lineHeight: 19 },

  // Code block
  codeBlock: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
  },
  codeText: { fontSize: 12, lineHeight: 20 },
});
