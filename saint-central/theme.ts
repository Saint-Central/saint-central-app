import { Platform } from "react-native";

export default {
  // typography
  textColor: "#1E293B",
  textColorMuted: "#475569",
  textColorSubtle: "#94A3B8",
  textErrorColor: "rgb(248 113 113)",
  textWeightSemibold: "700",
  textWeightBold: "800",
  // cards
  infoCardGradientStart: "rgba(58, 134, 255, 0.05)",
  infoCardGradientEnd: "rgba(67, 97, 238, 0.15)",
  infoCardBorderColor: "rgba(203, 213, 225, 0.5)",
  errorCardBackground: "rgba(255, 238, 240, 1)",
  // buttons
  destructiveBackground: "rgb(222, 59, 78)",
  // spacing
  spacingTopBar: Platform.OS === "ios" ? 40 : 30,
  spacingTopBarExtra: Platform.OS === "ios" ? 50 : 40,
} as const;
