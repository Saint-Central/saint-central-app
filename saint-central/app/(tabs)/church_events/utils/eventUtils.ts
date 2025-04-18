import { ChurchEvent } from "../types";

/**
 * Get event icon and color based on title
 */
export const getEventIconAndColor = (event: ChurchEvent): { icon: string; color: string } => {
  const title = event.title.toLowerCase();
  if (title.includes("bible") || title.includes("study")) {
    return { icon: "book", color: "#4299E1" }; // Blue
  } else if (title.includes("sunday") || title.includes("service") || title.includes("worship")) {
    return { icon: "home", color: "#38B2AC" }; // Teal
  } else if (title.includes("youth") || title.includes("meetup") || title.includes("young")) {
    return { icon: "message-circle", color: "#ECC94B" }; // Yellow
  } else if (title.includes("prayer") || title.includes("breakfast")) {
    return { icon: "coffee", color: "#F56565" }; // Red
  } else if (title.includes("meeting") || title.includes("committee")) {
    return { icon: "users", color: "#9F7AEA" }; // Purple
  } else if (title.includes("music") || title.includes("choir") || title.includes("practice")) {
    return { icon: "music", color: "#ED8936" }; // Orange
  } else if (title.includes("volunteer") || title.includes("serve") || title.includes("outreach")) {
    return { icon: "heart", color: "#ED64A6" }; // Pink
  }
  return { icon: "calendar", color: "#718096" }; // Gray
};
