import { Platform } from "react-native";

export default {
  // typography
  textForeground: "#1E293B",
  textForegroundMuted: "#475569",
  textForegroundSubtle: "#94A3B8",
  textErrorColor: "rgb(248 113 113)",
  fontLight: "300",
  fontNormal: "400",
  fontMedium: "500",
  fontBold: "700",
  fontExtraBold: "800",
  // cards
  cardBackground: "#FFFFFF",
  cardInfoBackground: "rgba(58, 134, 255, 0.05)",
  cardInfoGradientStart: "rgba(58, 134, 255, 0.05)",
  cardInfoGradientEnd: "rgba(67, 97, 238, 0.15)",
  cardInfoBorderColor: "rgba(203, 213, 225, 0.5)",
  cardErrorBackground: "rgba(255, 238, 240, 1)",
  // colors
  accent1: "#E9D9BC", // Bible study accent
  accent2: "#C8DFDF", // Sunday service accent
  accent3: "#F2D0A4", // Youth event accent
  accent4: "#D8E2DC", // Prayer breakfast accent
  shadowLight: "rgba(0, 0, 0, 0.1)",
  borderLight: "#EEEEEE", // Light borders
  backgroundBeige: "#F5F3EE", // Soft beige background
  backgroundDestructive: "rgb(222, 59, 78)",
  // buttons
  primary: "#3A86FF",
  primaryGradientStart: "#3A86FF",
  primaryGradientEnd: "#4361EE",
  buttonText: "#FFFFFF",
  // spacing
  spacingTopBar: Platform.OS === "ios" ? 40 : 30,
  spacingTopBarExtra: Platform.OS === "ios" ? 50 : 40,
} as const;
