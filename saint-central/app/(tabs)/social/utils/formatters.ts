/**
 * Format date to a readable string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} • ${date.toLocaleDateString()}`;
};

/**
 * Format number with K, M suffix for thousands and millions
 */
export const formatNumber = (number: number | undefined | null): string => {
  if (number === undefined || number === null) return "0";

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return number.toString();
};

/**
 * Parse selected groups from various formats
 */
export const parseSelectedGroups = (selected_groups: any): string[] => {
  if (Array.isArray(selected_groups)) {
    return selected_groups;
  } else if (typeof selected_groups === "string") {
    try {
      // Try JSON parsing first
      return JSON.parse(selected_groups);
    } catch (e) {
      // Fallback: remove any brackets and split by comma
      return selected_groups
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};
