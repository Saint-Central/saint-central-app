import { Platform } from "react-native";

export default {
  // New warm and cozy color palette
  // Main colors
  primary: "#A87C5F", // Warm brown
  secondary: "#C27F55", // Soft terracotta
  tertiary: "#D8846B", // Soft coral

  // Accent colors
  accent1: "#9B8557", // Muted gold
  accent2: "#B97A65", // Muted rust
  accent3: "#7D9B6A", // Sage green
  accent4: "#C78D60", // Warm amber

  // Neutrals
  neutral900: "#2D241F", // Almost black with warm undertone
  neutral800: "#3A2E28",
  neutral700: "#4E3F37",
  neutral600: "#6B5A50",
  neutral500: "#8A7668",
  neutral400: "#A99686",
  neutral300: "#C7B9AD",
  neutral200: "#E2D7CE",
  neutral100: "#F2EBE4",
  neutral50: "#F9F5F1", // Almost white with warm undertone

  // Special colors
  success: "#7D9B6A", // Sage green
  warning: "#C78D60", // Warm amber
  error: "#BC6C64", // Dusty rose
  info: "#6B8A9B", // Muted blue

  // Text
  textDark: "#3A2E28",
  textMedium: "#6B5A50",
  textLight: "#A99686",
  textWhite: "#F9F5F1",

  // UI Elements
  cardBg: "#FFFFFF",
  pageBg: "#F9F5F1",
  divider: "#E2D7CE",
  overlay: "rgba(45, 36, 31, 0.5)",
  overlayLight: "rgba(45, 36, 31, 0.2)",

  // Gradients
  gradientPrimary: ["#A87C5F", "#C27F55"],
  gradientSecondary: ["#C27F55", "#D8846B"],
  gradientSuccess: ["#7D9B6A", "#96B585"],
  gradientWarning: ["#C78D60", "#D9A97C"],
  gradientDanger: ["#BC6C64", "#D28A82"],
  gradientInfo: ["#6B8A9B", "#89A5B3"],
  gradientLight: ["#F9F5F1", "#F2EBE4"],
  gradientNeutral: ["#6B5A50", "#8A7668"],
  gradientCool: ["#7B9DA0", "#A4BEC0"],
  gradientWarm: ["#C78D60", "#D8846B"],

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
    shadowColor: "rgba(45,36,31,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  shadowMedium: {
    shadowColor: "rgba(45,36,31,0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  shadowHeavy: {
    shadowColor: "rgba(45,36,31,0.12)",
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
