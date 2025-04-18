// Date utility functions for ChurchEvents

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Get a unique key for a date
 */
export const getDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

/**
 * Format month name with year
 */
export const formatMonth = (date: Date): string => {
  return date.toLocaleString("default", { month: "long", year: "numeric" });
};

/**
 * Get day name, optionally in short form
 */
export const getDayName = (day: number, short = false): string => {
  const days = short
    ? ["S", "M", "T", "W", "T", "F", "S"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[day];
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(undefined, options);
};

/**
 * Format event date parts for display
 */
export const formatEventDay = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  return date.toLocaleString("default", { weekday: "long" });
};

export const formatEventMonth = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  return date.toLocaleString("default", { month: "long" });
};

export const formatEventDate = (dateTimeString: string): number => {
  const date = new Date(dateTimeString);
  return date.getDate();
};

export const formatEventTime = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
