import { useState, useEffect } from "react";
import { Dimensions, Animated } from "react-native";
import { useSharedValue, withTiming, withDelay, Easing, runOnJS } from "react-native-reanimated";
import { CalendarDay, ChurchEvent } from "../types";
import { generateCalendarData } from "../utils/calendarUtils";
import { getDateKey } from "../utils/dateUtils";

const { height } = Dimensions.get("window");

// Use React Native's Animated API for day animations to avoid hook issues
// This is a safer approach as it doesn't involve creating hooks conditionally
export const useCalendar = (events: ChurchEvent[], loading: boolean) => {
  // Calendar states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [calendarView, setCalendarView] = useState<"month" | "list">("list");
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<ChurchEvent[]>([]);

  // Use Reanimated for global animations
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const detailSlideAnim = useSharedValue(height);

  // Use React Native's Animated API for day animations to avoid hook issues
  const [dayAnimations, setDayAnimations] = useState<Record<string, Animated.Value>>({});

  // Update calendar when month or events change
  useEffect(() => {
    if (events.length > 0 || !loading) {
      const newCalendarData = generateCalendarData(currentMonth, events);
      setCalendarData(newCalendarData);

      // Initialize animations for new days
      const newAnimations = { ...dayAnimations };

      newCalendarData.forEach((day) => {
        const dateKey = getDateKey(day.date);
        if (!newAnimations[dateKey]) {
          newAnimations[dateKey] = new Animated.Value(0);
        }
      });

      if (Object.keys(newAnimations).length !== Object.keys(dayAnimations).length) {
        setDayAnimations(newAnimations);
      }

      // Animate the day cells
      Animated.stagger(
        20,
        newCalendarData.map((day) => {
          const dateKey = getDateKey(day.date);
          return Animated.timing(newAnimations[dateKey], {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          });
        }),
      ).start();
    }
  }, [currentMonth, events, loading]);

  // Animation for page elements
  useEffect(() => {
    // Animate page elements with Reanimated
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withTiming(0, { duration: 900 });
  }, [calendarData]);

  // Change calendar month
  const changeMonth = (direction: 1 | -1) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // Handle day selection
  const selectDay = (day: CalendarDay) => {
    setSelectedDate(day.date);
    setSelectedDayEvents(day.events);

    // Animate the detail view
    detailSlideAnim.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });

    setShowDateDetail(true);
  };

  // Close date detail view with proper use of runOnJS
  const closeDateDetail = () => {
    const finish = () => {
      setShowDateDetail(false);
    };

    detailSlideAnim.value = withTiming(
      height,
      {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      },
      (isFinished) => {
        if (isFinished) {
          runOnJS(finish)();
        }
      },
    );
  };

  return {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    calendarData,
    calendarView,
    setCalendarView,
    showDateDetail,
    setShowDateDetail,
    selectedDayEvents,
    setSelectedDayEvents,
    dayAnimations,
    fadeAnim,
    slideAnim,
    detailSlideAnim,
    changeMonth,
    selectDay,
    closeDateDetail,
  };
};

export default useCalendar;
