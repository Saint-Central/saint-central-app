import { VisibilityType } from "./types";

// Helper: Convert the returned selected_groups field to a proper array
export const parseSelectedGroups = (selected_groups: any): (number | string)[] => {
  if (Array.isArray(selected_groups)) {
    return selected_groups;
  } else if (typeof selected_groups === "string") {
    try {
      return JSON.parse(selected_groups);
    } catch (e) {
      return selected_groups
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

// Helper: Convert the returned selected_friends field to a proper array
export const parseSelectedMembers = (selected_members: any): (number | string)[] => {
  if (Array.isArray(selected_members)) {
    return selected_members;
  } else if (typeof selected_members === "string") {
    try {
      return JSON.parse(selected_members);
    } catch (e) {
      return selected_members
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

// Define visibility options as plain data objects without JSX
export const VISIBILITY_OPTIONS = [
  {
    label: "Church",
    iconName: "home", // Feather icon name
  },
  {
    label: "Certain Groups",
    iconName: "users", // Feather icon name
  },
  {
    label: "Certain Members",
    iconName: "user-check", // Feather icon name
  },
  {
    label: "Just Me",
    iconName: "user", // Feather icon name
  },
];