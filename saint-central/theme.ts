import { Platform } from "react-native";

export default {
  // Christian Dark Theme - Clean black with sacred accents
  // Main colors
  primary: "#fbbf24", // Golden (divine light)
  secondary: "#dc2626", // Crimson (sacrifice/love)
  tertiary: "#2563eb", // Royal blue (heaven)

  // Accent colors
  accent1: "#fbbf24", // Gold (glory)
  accent2: "#ffffff", // Pure white (holiness)
  accent3: "#dc2626", // Sacred crimson

  // Clean dark neutrals
  neutral900: "#000000", // Pure black
  neutral800: "#0a0a0a", // Deep black
  neutral700: "#171717", // Dark charcoal
  neutral600: "#262626", // Medium charcoal
  neutral500: "#404040", // Light charcoal
  neutral400: "#737373", // Gray
  neutral300: "#a3a3a3", // Light gray
  neutral200: "#d4d4d4", // Very light gray
  neutral100: "#f5f5f5", // Off white
  neutral50: "#ffffff", // Pure white

  // Special colors
  success: "#22c55e", // Life green
  warning: "#f59e0b", // Amber
  error: "#dc2626", // Sacred red
  info: "#2563eb", // Heaven blue

  // Text (clean dark theme)
  textDark: "#000000",
  textMedium: "rgba(255, 255, 255, 0.8)", // White with opacity
  textLight: "rgba(255, 255, 255, 0.6)", // Softer white
  textWhite: "#ffffff", // Pure white

  // UI Elements (clean dark theme)
  cardBg: "rgba(255, 255, 255, 0.03)", // Subtle white overlay
  pageBg: "#000000", // Pure black
  divider: "rgba(251, 191, 36, 0.2)", // Golden divider
  overlay: "rgba(0, 0, 0, 0.9)", // Black overlay
  overlayLight: "rgba(0, 0, 0, 0.5)", // Light black overlay

  // Gradients (clean dark theme)
  gradientPrimary: ["#fbbf24", "#f59e0b"], // Golden glory
  gradientSecondary: ["#dc2626", "#b91c1c"], // Sacred crimson
  gradientSuccess: ["#22c55e", "#16a34a"], // Life green
  gradientWarning: ["#f59e0b", "#d97706"], // Amber
  gradientDanger: ["#dc2626", "#b91c1c"], // Sacred red
  gradientInfo: ["#2563eb", "#1d4ed8"], // Heaven blue
  gradientLight: ["#ffffff", "#f5f5f5"], // Pure light
  gradientNeutral: ["#404040", "#737373"], // Charcoal blend
  gradientCool: ["#2563eb", "#1e40af"], // Cool blue
  gradientWarm: ["#fbbf24", "#dc2626"], // Golden to crimson

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

  // Effects (clean dark shadows)
  shadowLight: {
    shadowColor: "rgba(0,0,0,0.5)", // Black shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  shadowMedium: {
    shadowColor: "rgba(0,0,0,0.6)", // Deeper black shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  shadowHeavy: {
    shadowColor: "rgba(0,0,0,0.7)", // Deep black shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
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
