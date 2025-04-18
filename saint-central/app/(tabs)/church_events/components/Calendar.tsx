import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  ZoomIn,
  Layout,
  BounceIn,
  interpolate,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { CalendarDay } from "../types";
import THEME from "../../../../theme";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

interface CalendarProps {
  loading: boolean;
  currentMonth: Date;
  calendarData: CalendarDay[][];
  selectedDate: Date | null;
  dayAnimations: any;
  onDaySelect: (date: Date) => void;
  onChangeMonth: (direction: "prev" | "next") => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Calendar: React.FC<CalendarProps> = ({
  loading,
  currentMonth,
  calendarData,
  selectedDate,
  dayAnimations,
  onDaySelect,
  onChangeMonth,
}) => {
  // Animation for month change
  const monthChangeDirection = useSharedValue<"left" | "right" | null>(null);

  const handlePrevMonth = () => {
    monthChangeDirection.value = "left";
    onChangeMonth("prev");
  };

  const handleNextMonth = () => {
    monthChangeDirection.value = "right";
    onChangeMonth("next");
  };

  // Get days of week headings
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Format month name
  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={calendarStyles.container}>
      {/* Month navigation */}
      <View style={calendarStyles.header}>
        <TouchableOpacity style={calendarStyles.navButton} onPress={handlePrevMonth}>
          <Feather name="chevron-left" size={24} color={THEME.textDark} />
        </TouchableOpacity>

        <Animated.View layout={Layout.springify()} style={calendarStyles.monthContainer}>
          <Animated.Text style={calendarStyles.monthText} layout={Layout.springify()}>
            {monthName}
          </Animated.Text>
        </Animated.View>

        <TouchableOpacity style={calendarStyles.navButton} onPress={handleNextMonth}>
          <Feather name="chevron-right" size={24} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      {/* Days of week header */}
      <View style={calendarStyles.daysHeader}>
        {dayNames.map((day, index) => (
          <View key={day} style={calendarStyles.dayNameContainer}>
            <Text
              style={[
                calendarStyles.dayName,
                index === 0 || index === 6 ? calendarStyles.weekend : null,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <Animated.View style={calendarStyles.calendarGrid} layout={Layout.springify()}>
        {calendarData.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={calendarStyles.weekRow}>
            {week.map((day, dayIndex) => {
              const isSelected =
                selectedDate && day.date.toDateString() === selectedDate.toDateString();

              const hasEvents = day.events.length > 0;

              return (
                <AnimatedTouchable
                  key={`day-${day.date.getTime()}`}
                  style={[
                    calendarStyles.dayCell,
                    !day.isCurrentMonth && calendarStyles.otherMonthDay,
                    day.isToday && calendarStyles.today,
                    isSelected && calendarStyles.selectedDay,
                  ]}
                  onPress={() => onDaySelect(day.date)}
                  layout={Layout.springify()}
                  entering={BounceIn.delay(50 * (weekIndex * 7 + dayIndex)).duration(200)}
                >
                  <Animated.View
                    style={[
                      calendarStyles.dayNumber,
                      isSelected && calendarStyles.selectedDayNumber,
                    ]}
                  >
                    <Text
                      style={[
                        calendarStyles.dayNumberText,
                        !day.isCurrentMonth && calendarStyles.otherMonthText,
                        day.isToday && calendarStyles.todayText,
                        isSelected && calendarStyles.selectedDayText,
                      ]}
                    >
                      {day.dayOfMonth}
                    </Text>
                  </Animated.View>

                  {/* Events indicator */}
                  {hasEvents && (
                    <View style={calendarStyles.eventIndicatorContainer}>
                      {day.events.slice(0, 3).map((event, i) => (
                        <View
                          key={`indicator-${i}`}
                          style={[
                            calendarStyles.eventIndicator,
                            { backgroundColor: event.color || THEME.primary },
                          ]}
                        />
                      ))}
                      {day.events.length > 3 && (
                        <View style={calendarStyles.moreEventsIndicator}>
                          <Text style={calendarStyles.moreEventsText}>
                            +{day.events.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </AnimatedTouchable>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const calendarStyles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    margin: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  monthContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.textDark,
    textAlign: "center",
  },
  daysHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  dayNameContainer: {
    flex: 1,
    alignItems: "center",
  },
  dayName: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textMedium,
  },
  weekend: {
    color: THEME.primary,
  },
  calendarGrid: {},
  weekRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  dayCell: {
    flex: 1,
    height: 60,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  today: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  selectedDay: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dayNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDayNumber: {
    backgroundColor: THEME.primary,
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: "500",
    color: THEME.textDark,
  },
  otherMonthText: {
    color: THEME.textLight,
  },
  todayText: {
    fontWeight: "700",
    color: THEME.primary,
  },
  selectedDayText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  eventIndicatorContainer: {
    flexDirection: "row",
    marginTop: 4,
    height: 5,
    alignItems: "center",
  },
  eventIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  moreEventsIndicator: {
    marginLeft: 2,
  },
  moreEventsText: {
    fontSize: 8,
    color: THEME.textMedium,
  },
});

export default Calendar;
