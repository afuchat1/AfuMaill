import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmailRow } from "@/components/EmailRow";
import type { Email } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "@afumail:recent_searches";
const MAX_RECENT = 8;
const SEARCH_FILTERS = ["All", "Unread", "Starred", "Attachments"];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { emails } = useEmails();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  // Load recent searches from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setRecentSearches(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  function saveRecent(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
    setRecentSearches(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function clearRecent() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecentSearches([]);
    AsyncStorage.removeItem(STORAGE_KEY);
  }

  function submitSearch() {
    if (query.trim()) saveRecent(query);
  }

  const results = useMemo<Email[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return emails.filter((e) => {
      const matchesText =
        e.subject.toLowerCase().includes(q) ||
        e.from.name.toLowerCase().includes(q) ||
        e.from.email.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q);

      if (!matchesText) return false;
      if (activeFilter === "Unread") return !e.read;
      if (activeFilter === "Starred") return e.starred;
      if (activeFilter === "Attachments") return e.attachments.length > 0;
      return true;
    });
  }, [query, emails, activeFilter]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Search mail"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      {!!query && (
        <View style={[styles.filtersRow, { borderBottomColor: colors.border }]}>
          {SEARCH_FILTERS.map((f) => {
            const active = activeFilter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.secondary, borderColor: active ? colors.primary : colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.primaryForeground : colors.foreground, fontFamily: active ? "Inter_700Bold" : "Inter_400Regular" },
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Content */}
      {!query ? (
        <View style={styles.recentSection}>
          {recentSearches.length > 0 ? (
            <>
              <View style={styles.recentHeader}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Recent
                </Text>
                <Pressable onPress={clearRecent} hitSlop={8}>
                  <Text style={[styles.clearText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Clear</Text>
                </Pressable>
              </View>
              {recentSearches.map((search) => (
                <Pressable
                  key={search}
                  onPress={() => { setQuery(search); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={({ pressed }) => [
                    styles.recentItem,
                    { backgroundColor: pressed ? colors.secondary : "transparent", borderBottomColor: colors.border },
                  ]}
                >
                  <Feather name="clock" size={15} color={colors.mutedForeground} />
                  <Text style={[styles.recentText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    {search}
                  </Text>
                  <Feather name="arrow-up-left" size={14} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="search" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Search Mail
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Search by sender, subject, or keyword
              </Text>
            </View>
          )}
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            No results
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Try a different search term
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EmailRow email={item} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },
  recentSection: { flex: 1 },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  clearText: { fontSize: 13 },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentText: { flex: 1, fontSize: 15 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 80 },
  emptyTitle: { fontSize: 18, marginTop: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
