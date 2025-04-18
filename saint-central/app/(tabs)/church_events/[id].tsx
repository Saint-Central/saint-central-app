import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import ChurchEvents from "./church_events";

// This is a dynamic route handler for /church_events/[id]
export default function ChurchEventDetails() {
  const { id, churchId } = useLocalSearchParams();
  const router = useRouter();

  console.log("Dynamic route params:", { id, churchId });

  return <ChurchEvents eventId={id} churchId={churchId} />;
}
