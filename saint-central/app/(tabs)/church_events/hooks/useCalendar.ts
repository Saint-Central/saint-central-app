import { useState, useEffect } from "react";
import { Dimensions } from "react-native";
import { 
  useSharedValue, 
  withTiming, 
  withDelay, 
  Easing, 
  runOnJS, 
  SharedValue 
} from "react-native-reanimated";
import { CalendarDay, ChurchEvent, CalendarViewType } from "../types";
import { generateCalendarData } from "../utils/calendarUtils";
import { getDateKey } from "../utils/dateUtils";

const { height } = Dimensions.get("window");

// Use Reanimated for all animations for better performance
export const useCalendar = (events: ChurchEvent[], loading: boolean) => {
  // Calendar states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[][]>([]);
  const [calendarView, setCalendarView] = useState<CalendarViewType>("list");
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<ChurchEvent[]>([]);

  // Use Reanimated for all animations
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const detailSlideAnim = useSharedValue(height);

  // Use a single shared value for calendar entrance animation
  const calendarEntranceAnim = useSharedValue(0);

  // Update calendar when month or events change
  useEffect(() => {
    if (events.length > 0 || !loading) {
      const calendarDataFlat = generateCalendarData(currentMonth, events);

      // Convert 1D array to 2D array (weeks)
      const weeks: CalendarDay[][] = [];
      let week: CalendarDay[] = [];

      calendarDataFlat.forEach((day, index) => {
        week.push(day);
        if (week.length === 7 || index === calendarDataFlat.length - 1) {
          weeks.push([...week]);
          week = [];
        }
      });

      setCalendarData(weeks);

      // Animate calendar entrance with Reanimated
      calendarEntranceAnim.value = 0;
      calendarEntranceAnim.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.quad),
      });
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
    calendarEntranceAnim,
    fadeAnim,
    slideAnim,
    detailSlideAnim,
    changeMonth,
    selectDay,
    closeDateDetail,
  };
};

export default useCalendar;
