import { useState, useEffect, useRef } from "react";
import { Animated, Dimensions } from "react-native";
import { CalendarDay, ChurchEvent } from "../types";
import { generateCalendarData } from "../utils/calendarUtils";
import { getDateKey } from "../utils/dateUtils";

const { height } = Dimensions.get("window");

export const useCalendar = (events: ChurchEvent[], loading: boolean) => {
  // Calendar states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [calendarView, setCalendarView] = useState<"month" | "list">("list");
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<ChurchEvent[]>([]);

  // Animation values
  const dayAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const detailSlideAnim = useRef(new Animated.Value(height)).current;

  // Update calendar when month or events change
  useEffect(() => {
    if (events.length > 0 || !loading) {
      const newCalendarData = generateCalendarData(currentMonth, events);
      setCalendarData(newCalendarData);

      // Initialize animations for days
      newCalendarData.forEach((day) => {
        const dateKey = getDateKey(day.date);
        if (!dayAnimations[dateKey]) {
          dayAnimations[dateKey] = new Animated.Value(0);
        }
      });
    }
  }, [currentMonth, events, loading]);

  // Animation for calendar and UI elements
  useEffect(() => {
    // Animate calendar days
    const animations = Object.values(dayAnimations).map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    );

    Animated.stagger(20, animations).start();

    // Animate page elements
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
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
    Animated.timing(detailSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setShowDateDetail(true);
  };

  // Close date detail view
  const closeDateDetail = () => {
    Animated.timing(detailSlideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowDateDetail(false);
    });
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
