import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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

const RECENT_SEARCHES = [
  "emails from Alex",
  "invoice June",
  "flight confirmation",
  "meeting notes",
];

const SEARCH_FILTERS = ["All", "Unread", "Starred", "Attachments", "People"];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { emails } = useEmails();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

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

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

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
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      {!!query && (
        <View style={[styles.filtersContainer, { borderBottomColor: colors.border }]}>
          <FlatList
            horizontal
            data={SEARCH_FILTERS}
            keyExtractor={(f) => f}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
            renderItem={({ item }) => {
              const active = activeFilter === item;
              return (
                <Pressable
                  onPress={() => setActiveFilter(item)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.secondary,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active ? colors.primaryForeground : colors.foreground,
                        fontFamily: active ? "Inter_500Medium" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* Content */}
      {!query ? (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Recent Searches
          </Text>
          {RECENT_SEARCHES.map((search) => (
            <Pressable
              key={search}
              onPress={() => setQuery(search)}
              style={({ pressed }) => [
                styles.recentItem,
                {
                  backgroundColor: pressed ? colors.secondary : "transparent",
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Feather name="clock" size={15} color={colors.mutedForeground} />
              <Text style={[styles.recentText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                {search}
              </Text>
              <Feather name="arrow-up-left" size={14} color={colors.mutedForeground} style={styles.recentArrow} />
            </Pressable>
          ))}
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
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
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filtersContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  recentSection: {
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
  },
  recentArrow: {
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
