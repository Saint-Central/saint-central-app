import { CalendarDay, ChurchEvent } from "../types";
import { isSameDay, getDateKey } from "./dateUtils";

/**
 * Generate calendar data for a specific month
 */
export const generateCalendarData = (date: Date, eventsData: ChurchEvent[]): CalendarDay[] => {
  const year = date.getFullYear();
  const month = date.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();

  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  const lastDate = lastDay.getDate();

  // Create array for calendar days
  const days: CalendarDay[] = [];

  // Add days from previous month to fill first week
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      date,
      dayOfMonth: prevMonthLastDay - i,
      dayOfWeek: date.getDay(),
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date()),
      events: getEventsForDay(date, eventsData),
    });
  }

  // Add days of current month
  const today = new Date();
  for (let i = 1; i <= lastDate; i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      dayOfMonth: i,
      dayOfWeek: date.getDay(),
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      events: getEventsForDay(date, eventsData),
    });
  }

  // Add days from next month to complete last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        dayOfMonth: i,
        dayOfWeek: date.getDay(),
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        events: getEventsForDay(date, eventsData),
      });
    }
  }

  return days;
};

/**
 * Get events for a specific day
 */
export const getEventsForDay = (date: Date, eventsData: ChurchEvent[]): ChurchEvent[] => {
  return eventsData.filter((event) => {
    const eventDate = new Date(event.time);
    return isSameDay(eventDate, date);
  });
};

/**
 * Get image URL with fallback
 */
export const getImageUrl = (url: string | null): string => {
  return url || "https://via.placeholder.com/400x200?text=Church+Event";
};

/**
 * Get YouTube video thumbnail
 */
export const getVideoThumbnail = (url: string | null): string | null => {
  if (!url) return null;

  // Extract video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
  }

  return null;
};
