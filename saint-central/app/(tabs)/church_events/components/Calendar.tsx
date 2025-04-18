import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CalendarDay } from "../types";
import { styles } from "../styles";
import THEME from "../../../../theme";
import { formatMonth, getDayName, getDateKey } from "../utils/dateUtils";

interface CalendarProps {
  loading: boolean;
  currentMonth: Date;
  calendarData: CalendarDay[];
  selectedDate: Date;
  dayAnimations: { [key: string]: Animated.Value };
  onDaySelect: (day: CalendarDay) => void;
  onChangeMonth: (direction: 1 | -1) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  loading,
  currentMonth,
  calendarData,
  selectedDate,
  dayAnimations,
  onDaySelect,
  onChangeMonth,
}) => {
  // Render a single calendar day
  const renderCalendarDay = (day: CalendarDay, index: number) => {
    const dateKey = getDateKey(day.date);
    const animation = dayAnimations[dateKey] || new Animated.Value(1); // Fallback
    const isSelected =
      day.date.getFullYear() === selectedDate.getFullYear() &&
      day.date.getMonth() === selectedDate.getMonth() &&
      day.date.getDate() === selectedDate.getDate();

    return (
      <Animated.View
        key={dateKey}
        style={{
          opacity: animation,
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={[
            styles.calendarDay,
            !day.isCurrentMonth && styles.calendarDayOtherMonth,
            isSelected && styles.calendarDaySelected,
          ]}
          onPress={() => onDaySelect(day)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.dayNumberContainer,
              day.isToday && styles.todayContainer,
              isSelected && styles.selectedDayNumberContainer,
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                !day.isCurrentMonth && { opacity: 0.5 },
                day.isToday && styles.todayNumber,
                isSelected && styles.selectedDayNumber,
              ]}
            >
              {day.dayOfMonth}
            </Text>
          </View>
          {day.events.length > 0 && (
            <View style={styles.dayEventsIndicator}>
              {day.events.length <= 3 ? (
                day.events.map((event, i) => {
                  const color = event.is_recurring ? THEME.primary : "#4299E1";
                  return <View key={i} style={[styles.eventDot, { backgroundColor: color }]} />;
                })
              ) : (
                <View
                  style={{
                    backgroundColor: THEME.primary,
                    borderRadius: 10,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                  }}
                >
                  <Text
                    style={{
                      color: THEME.textWhite,
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {day.events.length}
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render calendar weeks
  const renderCalendarWeeks = () => {
    const weeks = [];
    for (let i = 0; i < calendarData.length; i += 7) {
      const weekDays = calendarData.slice(i, i + 7);
      weeks.push(
        <View key={i} style={styles.calendarWeek}>
          {weekDays.map((day, index) => renderCalendarDay(day, i + index))}
        </View>,
      );
    }
    return weeks;
  };

  return (
    <View>
      {/* Month Navigation */}
      <View style={styles.monthNavigation}>
        <TouchableOpacity style={styles.monthNavArrow} onPress={() => onChangeMonth(-1)}>
          <Feather name="chevron-left" size={24} color={THEME.textMedium} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{formatMonth(currentMonth)}</Text>
        <TouchableOpacity style={styles.monthNavArrow} onPress={() => onChangeMonth(1)}>
          <Feather name="chevron-right" size={24} color={THEME.textMedium} />
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.dayLabelsRow}>
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <View key={day} style={styles.dayLabelContainer}>
              <Text style={styles.dayLabel}>{getDayName(day, true)}</Text>
            </View>
          ))}
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.loadingText}>Loading calendar...</Text>
          </View>
        ) : (
          <View style={styles.calendarGrid}>{renderCalendarWeeks()}</View>
        )}
      </View>
    </View>
  );
};

export default Calendar;
