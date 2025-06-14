import { Platform } from "react-native";

export default {
  // Church theme inspired colors - dark theme with green accents
  // Main colors
  primary: "#22c55e", // Church green from components
  secondary: "#16a34a", // Darker green
  tertiary: "#15803d", // Even darker green

  // Accent colors
  accent1: "#22c55e", // Primary green
  accent2: "#16a34a", // Secondary green
  accent3: "#059669", // Emerald accent

  // Dark theme neutrals (from church components)
  neutral900: "#0f1419", // Main dark background
  neutral800: "#1a202c",
  neutral700: "#2d3748",
  neutral600: "#4a5568",
  neutral500: "#718096",
  neutral400: "#a0aec0",
  neutral300: "#cbd5e0",
  neutral200: "#e2e8f0",
  neutral100: "#f7fafc",
  neutral50: "#ffffff",

  // Special colors
  success: "#22c55e", // Green
  warning: "#f59e0b", // Amber
  error: "#ef4444", // Red
  info: "#3b82f6", // Blue

  // Text (adapted for dark theme)
  textDark: "#0f1419",
  textMedium: "rgba(255,255,255,0.7)",
  textLight: "rgba(255,255,255,0.6)",
  textWhite: "#ffffff",

  // UI Elements (dark theme)
  cardBg: "rgba(255,255,255,0.05)",
  pageBg: "#0f1419",
  divider: "rgba(255,255,255,0.1)",
  overlay: "rgba(15, 20, 25, 0.8)",
  overlayLight: "rgba(15, 20, 25, 0.4)",

  // Gradients (updated for dark theme)
  gradientPrimary: ["#22c55e", "#16a34a"],
  gradientSecondary: ["#16a34a", "#15803d"],
  gradientSuccess: ["#22c55e", "#059669"],
  gradientWarning: ["#f59e0b", "#d97706"],
  gradientDanger: ["#ef4444", "#dc2626"],
  gradientInfo: ["#3b82f6", "#2563eb"],
  gradientLight: ["#f7fafc", "#e2e8f0"],
  gradientNeutral: ["#4a5568", "#718096"],
  gradientCool: ["#3b82f6", "#1d4ed8"],
  gradientWarm: ["#22c55e", "#059669"],

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

  // Effects (updated for dark theme)
  shadowLight: {
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  shadowMedium: {
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  shadowHeavy: {
    shadowColor: "rgba(0,0,0,0.5)",
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
