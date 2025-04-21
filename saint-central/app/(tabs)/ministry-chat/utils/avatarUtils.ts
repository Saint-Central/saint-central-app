import theme from "../../../../theme";

// Avatar colors array
export const AVATAR_COLORS = [
  theme.primary,
  theme.secondary,
  theme.tertiary,
  theme.accent1,
  theme.accent2,
  theme.accent3,
  theme.accent4,
];

// Get a consistent color for an avatar based on name
export const getAvatarColor = (name: string): string => {
  if (!name) return AVATAR_COLORS[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

// Get initials from a name (first and last letter)
export const getInitials = (name: string): string => {
  if (!name) return "?";

  const words = name.split(" ");
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};
