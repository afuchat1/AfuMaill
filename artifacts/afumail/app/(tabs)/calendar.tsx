import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvents } from "@/lib/supabase";
import type { CalendarEvent } from "@/lib/supabase";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EVENT_COLORS = [
  "#4F46E5", "#0891B2", "#059669", "#D97706",
  "#DC2626", "#7C3AED", "#DB2777", "#2563EB",
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const DURATIONS = ["30 min", "1 hr", "1.5 hr", "2 hr", "3 hr"];

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const [createVisible, setCreateVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [newColor, setNewColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const hourScrollRef = useRef<ScrollView>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  async function loadEvents() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getCalendarEvents(user.id, year, month);
      setEvents(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, [year, month, user?.id]);

  useEffect(() => {
    if (createVisible) {
      setNewTitle("");
      setIsAllDay(false);
      setSelectedHour(9);
      setSelectedMinute(0);
      setSelectedDuration(null);
      setNewColor(EVENT_COLORS[0]);
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({ x: 9 * 68, animated: false });
      }, 100);
    }
  }, [createVisible]);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDay(1);
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  }

  const selectedDateISO = toISO(year, month, selectedDay);
  const selectedDayEvents = events.filter((e) => e.event_date === selectedDateISO);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const daysWithEvents = new Set(events.map((e) => Number(e.event_date.split("-")[2])));

  async function handleCreateEvent() {
    if (!user || !newTitle.trim()) return;
    setSaving(true);
    try {
      const timeStr = isAllDay ? null : formatTime(selectedHour, selectedMinute);
      const ev = await createCalendarEvent({
        owner_id: user.id,
        title: newTitle.trim(),
        event_date: selectedDateISO,
        event_time: timeStr,
        duration: selectedDuration,
        color: newColor,
        note: "",
      });
      setEvents((prev) => [...prev, ev]);
      setCreateVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setSaving(false);
  }

  async function handleDeleteEvent(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await deleteCalendarEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={prevMonth} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={8}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Weekday labels */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={[styles.weekdayLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {d}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, idx) => {
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = day === selectedDay;
            const hasEvent = day !== null && daysWithEvents.has(day);

            return (
              <Pressable
                key={idx}
                onPress={() => day !== null && setSelectedDay(day)}
                style={[styles.dayCell, isSelected && { backgroundColor: colors.primary, borderRadius: 22 }]}
              >
                {day !== null && (
                  <>
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: isSelected ? colors.primaryForeground : isToday ? colors.accent : colors.foreground,
                          fontFamily: isToday || isSelected ? "Inter_700Bold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {day}
                    </Text>
                    {hasEvent && !isSelected && (
                      <View style={[styles.eventDot, { backgroundColor: colors.accent }]} />
                    )}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Events for selected day */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {isCurrentMonth && selectedDay === today.getDate() ? "Today" : `${MONTHS[month]} ${selectedDay}`}
            </Text>
            <Pressable
              onPress={() => setCreateVisible(true)}
              style={({ pressed }) => [
                styles.addEventBtn,
                { backgroundColor: pressed ? colors.accent + "CC" : colors.accent },
              ]}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={[styles.addEventText, { fontFamily: "Inter_700Bold" }]}>Add Event</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : selectedDayEvents.length === 0 ? (
            <View style={styles.noEvents}>
              <Feather name="calendar" size={32} color={colors.mutedForeground} />
              <Text style={[styles.noEventsText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No events scheduled
              </Text>
              <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }]}>
                Tap "Add Event" to create one
              </Text>
            </View>
          ) : (
            selectedDayEvents.map((event) => (
              <Pressable
                key={event.id}
                style={({ pressed }) => [
                  styles.eventCard,
                  { backgroundColor: pressed ? colors.secondary : colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                <View style={styles.eventContent}>
                  <Text style={[styles.eventTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    {event.title}
                  </Text>
                  {(event.event_time || event.duration) && (
                    <Text style={[styles.eventTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {[event.event_time, event.duration].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => handleDeleteEvent(event.id)} hitSlop={8}>
                  <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                </Pressable>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Create Event Bottom Sheet ── */}
      <BottomSheet visible={createVisible} onClose={() => setCreateVisible(false)}>
        <ScrollView
          style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            New Event — {MONTHS[month]} {selectedDay}
          </Text>

          {/* Title */}
          <TextInput
            style={[styles.titleInput, { color: colors.foreground, backgroundColor: colors.secondary, fontFamily: "Inter_400Regular" }]}
            placeholder="Event title"
            placeholderTextColor={colors.mutedForeground}
            value={newTitle}
            onChangeText={setNewTitle}
            returnKeyType="done"
          />

          {/* All day toggle */}
          <View style={[styles.allDayRow, { borderColor: colors.border }]}>
            <Feather name="sun" size={16} color={colors.mutedForeground} />
            <Text style={[styles.pickerLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>All day</Text>
            <Switch
              value={isAllDay}
              onValueChange={(v) => { setIsAllDay(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Time picker */}
          {!isAllDay && (
            <View style={styles.pickerSection}>
              <View style={styles.pickerHeader}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Time</Text>
              </View>

              {/* Hour strip */}
              <ScrollView
                ref={hourScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {HOURS.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => { setSelectedHour(h); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      styles.chip,
                      { backgroundColor: selectedHour === h ? colors.primary : colors.secondary },
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: selectedHour === h ? colors.primaryForeground : colors.foreground, fontFamily: selectedHour === h ? "Inter_600SemiBold" : "Inter_400Regular" },
                    ]}>
                      {formatHour(h)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Minute chips */}
              <View style={styles.chipRow}>
                {MINUTES.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => { setSelectedMinute(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      styles.chip,
                      { backgroundColor: selectedMinute === m ? colors.accent : colors.secondary },
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: selectedMinute === m ? "#FFFFFF" : colors.foreground, fontFamily: selectedMinute === m ? "Inter_600SemiBold" : "Inter_400Regular" },
                    ]}>
                      :{String(m).padStart(2, "0")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Duration picker */}
          {!isAllDay && (
            <View style={styles.pickerSection}>
              <View style={styles.pickerHeader}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Duration</Text>
              </View>
              <View style={[styles.chipRow, { flexWrap: "wrap" }]}>
                {DURATIONS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => {
                      setSelectedDuration(selectedDuration === d ? null : d);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.chip,
                      { backgroundColor: selectedDuration === d ? colors.accent : colors.secondary },
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: selectedDuration === d ? "#FFFFFF" : colors.foreground, fontFamily: selectedDuration === d ? "Inter_600SemiBold" : "Inter_400Regular" },
                    ]}>
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Color picker */}
          <View style={styles.pickerSection}>
            <View style={styles.pickerHeader}>
              <Feather name="droplet" size={14} color={colors.mutedForeground} />
              <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Color</Text>
            </View>
            <View style={styles.colorRow}>
              {EVENT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => { setNewColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    newColor === c && styles.colorSwatchSelected,
                  ]}
                >
                  {newColor === c && <Feather name="check" size={14} color="#FFFFFF" />}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Create button */}
          <Pressable
            onPress={handleCreateEvent}
            disabled={saving || !newTitle.trim()}
            style={[
              styles.createBtn,
              { backgroundColor: newTitle.trim() ? colors.primary : colors.muted },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.createBtnText, { color: newTitle.trim() ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                Create Event
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18 },
  weekdayRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8 },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 12, letterSpacing: 0.4 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12 },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  dayText: { fontSize: 15 },
  eventDot: { width: 5, height: 5, borderRadius: 2.5 },
  eventsSection: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  eventsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  addEventBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100 },
  addEventText: { fontSize: 13, color: "#FFFFFF" },
  noEvents: { alignItems: "center", paddingVertical: 32, gap: 8 },
  noEventsText: { fontSize: 15 },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    gap: 12,
    paddingRight: 14,
  },
  eventColorBar: { width: 4, alignSelf: "stretch" },
  eventContent: { flex: 1, paddingVertical: 14, gap: 3 },
  eventTitle: { fontSize: 15 },
  eventTime: { fontSize: 13 },

  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 18, letterSpacing: -0.3 },

  titleInput: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
  },

  allDayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },

  pickerSection: { gap: 10 },
  pickerHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  pickerLabel: { fontSize: 13 },

  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  chipText: { fontSize: 13 },

  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.3)",
    elevation: 3,
  },
  createBtn: { borderRadius: 100, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  createBtnText: { fontSize: 15 },
});
