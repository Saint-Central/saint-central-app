import { Platform } from "react-native";

export default {
  // New modern color palette
  // Main colors
  primary: "#6366F1", // Indigo
  secondary: "#8B5CF6", // Violet
  tertiary: "#EC4899", // Pink

  // Accent colors
  accent1: "#22D3EE", // Cyan
  accent2: "#F472B6", // Pink
  accent3: "#34D399", // Emerald
  accent4: "#FB923C", // Orange

  // Neutrals
  neutral900: "#020617", // Almost black
  neutral800: "#0F172A",
  neutral700: "#1E293B",
  neutral600: "#475569",
  neutral500: "#64748B",
  neutral400: "#94A3B8",
  neutral300: "#CBD5E1",
  neutral200: "#E2E8F0",
  neutral100: "#F1F5F9",
  neutral50: "#F8FAFC", // Almost white

  // Special colors
  success: "#10B981", // Emerald
  warning: "#F59E0B", // Amber
  error: "#EF4444", // Red
  info: "#3B82F6", // Blue

  // Text
  textDark: "#0F172A",
  textMedium: "#475569",
  textLight: "#94A3B8",
  textWhite: "#FFFFFF",

  // UI Elements
  cardBg: "#FFFFFF",
  pageBg: "#F8FAFC",
  divider: "#E2E8F0",
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.2)",

  // Gradients
  gradientPrimary: ["#6366F1", "#8B5CF6"],
  gradientSecondary: ["#8B5CF6", "#D946EF"],
  gradientSuccess: ["#10B981", "#34D399"],
  gradientWarning: ["#F59E0B", "#FB923C"],
  gradientDanger: ["#EF4444", "#E11D48"],
  gradientInfo: ["#3B82F6", "#60A5FA"],
  gradientLight: ["#F8FAFC", "#F1F5F9"],
  gradientNeutral: ["#475569", "#64748B"],
  gradientCool: ["#22D3EE", "#38BDF8"],
  gradientWarm: ["#FB923C", "#F87171"],

  // Typography
  fontRegular: "400",
  fontMedium: "500",
  fontSemiBold: "600",
  fontBold: "700",

  // Radius
  radiusSmall: 8,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusXL: 24,
  radiusFull: 9999,

  // Spacing
  spacingXS: 4,
  spacingS: 8,
  spacingM: 12,
  spacingL: 16,
  spacingXL: 24,
  spacing2XL: 32,
  spacing3XL: 48,
  spacing4XL: 64,

  // Effects
  shadowLight: {
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  shadowMedium: {
    shadowColor: "rgba(0,0,0,0.12)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  shadowHeavy: {
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  // Animation presets for fast performance
  animSpringFast: {
    tension: 300,
    friction: 20,
    useNativeDriver: true,
  },
  animSpringMedium: {
    tension: 200,
    friction: 18,
    useNativeDriver: true,
  },
  animSpringGentle: {
    tension: 140,
    friction: 15,
    useNativeDriver: true,
  },
  animTimingFast: {
    duration: 200,
    useNativeDriver: true,
  },
  animTimingMedium: {
    duration: 300,
    useNativeDriver: true,
  },

  // Layout
  topBarHeight: Platform.OS === "ios" ? 44 : 56,
  statusBarSpacing: Platform.OS === "ios" ? 44 : 24,
} as const;
