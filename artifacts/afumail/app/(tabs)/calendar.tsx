import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  duration: string;
  color: string;
  day: number;
}

const EVENTS: CalendarEvent[] = [
  { id: "ev1", title: "Design Review", time: "2:00 PM", duration: "1 hr", color: "#4F46E5", day: new Date().getDate() },
  { id: "ev2", title: "Team All-Hands", time: "10:00 AM", duration: "1.5 hrs", color: "#0891B2", day: new Date().getDate() + 1 },
  { id: "ev3", title: "Product Sync", time: "9:00 AM", duration: "30 min", color: "#059669", day: new Date().getDate() + 2 },
  { id: "ev4", title: "1:1 with Alex", time: "4:00 PM", duration: "30 min", color: "#D97706", day: new Date().getDate() },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  const todayEvents = EVENTS.filter((e) => e.day === selectedDay && isCurrentMonth);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={prevMonth} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={8}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Weekday labels */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((d) => (
            <Text
              key={d}
              style={[styles.weekdayLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, idx) => {
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = day === selectedDay;
            const hasEvent = day !== null && EVENTS.some((e) => e.day === day && isCurrentMonth);

            return (
              <Pressable
                key={idx}
                onPress={() => day !== null && setSelectedDay(day)}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: colors.primary, borderRadius: 22 },
                ]}
              >
                {day !== null && (
                  <>
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: isSelected
                            ? colors.primaryForeground
                            : isToday
                            ? colors.accent
                            : colors.foreground,
                          fontFamily: isToday || isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
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
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {isCurrentMonth && selectedDay === today.getDate()
              ? "Today"
              : `${MONTHS[month]} ${selectedDay}`}
          </Text>

          {todayEvents.length === 0 ? (
            <View style={styles.noEvents}>
              <Feather name="calendar" size={32} color={colors.mutedForeground} />
              <Text style={[styles.noEventsText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No events
              </Text>
            </View>
          ) : (
            todayEvents.map((event) => (
              <Pressable
                key={event.id}
                style={({ pressed }) => [
                  styles.eventCard,
                  {
                    backgroundColor: pressed ? colors.secondary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                <View style={styles.eventContent}>
                  <Text style={[styles.eventTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {event.time} · {event.duration}
                  </Text>
                </View>
                <Feather name="video" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dayText: {
    fontSize: 15,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  eventsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  noEvents: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  noEventsText: {
    fontSize: 15,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    gap: 12,
    paddingRight: 14,
  },
  eventColorBar: {
    width: 4,
    alignSelf: "stretch",
  },
  eventContent: {
    flex: 1,
    paddingVertical: 14,
    gap: 3,
  },
  eventTitle: {
    fontSize: 15,
  },
  eventTime: {
    fontSize: 13,
  },
});
