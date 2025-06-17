import { Platform } from "react-native";

export default {
  // Christian Dark Theme - Warm and inviting with sacred accents
  // Main colors
  primary: "#f59e0b", // Warm amber (divine warmth)
  secondary: "#ef4444", // Warm red (love/passion)
  tertiary: "#3b82f6", // Softer blue (peace)

  // Accent colors
  accent1: "#fbbf24", // Soft gold (glory)
  accent2: "#fef3c7", // Warm cream (light)
  accent3: "#f87171", // Soft coral (warmth)

  // Warm dark neutrals
  neutral900: "#0a0908", // Warm black
  neutral800: "#1a1815", // Warm deep brown
  neutral700: "#292521", // Warm dark brown
  neutral600: "#3d3a34", // Warm medium brown
  neutral500: "#57534e", // Warm brown
  neutral400: "#78716c", // Warm gray
  neutral300: "#a8a29e", // Warm light gray
  neutral200: "#d6d3d1", // Warm very light gray
  neutral100: "#f5f5f4", // Warm off white
  neutral50: "#fafaf9", // Warm white

  // Special colors
  success: "#34d399", // Soft mint green
  warning: "#fbbf24", // Warm yellow
  error: "#f87171", // Soft coral red
  info: "#60a5fa", // Soft sky blue

  // Text (warm dark theme)
  textDark: "#1a1815",
  textMedium: "rgba(254, 243, 199, 0.85)", // Warm cream with opacity
  textLight: "rgba(254, 243, 199, 0.65)", // Softer warm cream
  textWhite: "#fef3c7", // Warm cream white

  // UI Elements (warm dark theme)
  cardBg: "rgba(254, 243, 199, 0.04)", // Subtle warm overlay
  pageBg: "#0a0908", // Warm black
  divider: "rgba(245, 158, 11, 0.25)", // Warm amber divider
  overlay: "rgba(10, 9, 8, 0.85)", // Warm black overlay
  overlayLight: "rgba(10, 9, 8, 0.5)", // Light warm black overlay

  // Gradients (warm dark theme)
  gradientPrimary: ["#fbbf24", "#f59e0b"], // Warm golden glow
  gradientSecondary: ["#f87171", "#ef4444"], // Warm coral to red
  gradientSuccess: ["#34d399", "#10b981"], // Soft mint green
  gradientWarning: ["#fbbf24", "#f59e0b"], // Warm amber
  gradientDanger: ["#f87171", "#ef4444"], // Warm coral red
  gradientInfo: ["#60a5fa", "#3b82f6"], // Soft sky blue
  gradientLight: ["#fef3c7", "#f5f5f4"], // Warm cream light
  gradientNeutral: ["#57534e", "#78716c"], // Warm brown blend
  gradientCool: ["#60a5fa", "#3b82f6"], // Soft blue
  gradientWarm: ["#fbbf24", "#f87171"], // Golden to coral

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
