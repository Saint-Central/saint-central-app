// Export components
export { default as EventCard } from "./components/EventCard";
export { default as Calendar } from "./components/Calendar";
export { default as EventForm } from "./components/EventForm";
export { default as EventDetail } from "./components/EventDetail";

// Export hooks
export { default as useChurchEvents } from "./hooks/useChurchEvents";
export { default as useCalendar } from "./hooks/useCalendar";
export { default as useEventForm } from "./hooks/useEventForm";

// Export types
export * from "./types";

// Export utilities
export { THEME } from "./theme";
export { styles } from "./styles";
export * from "./utils/dateUtils";
export * from "./utils/calendarUtils";
export * from "./utils/eventUtils";

import React, { useEffect } from "react";
import ChurchEvents from "./church_events";
import { useLocalSearchParams } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Only export the screen component as default
export default function ChurchEventsScreen() {
  // Get the route parameters using the Expo Router hook
  const params = useLocalSearchParams();
  const { churchId, eventId } = params;

  console.log("Index route params:", { churchId, eventId });

  return (
    <GestureHandlerRootView style={{ flex: 1, width: "100%", height: "100%" }}>
      <ChurchEvents churchId={churchId} eventId={eventId} />
    </GestureHandlerRootView>
  );
}
