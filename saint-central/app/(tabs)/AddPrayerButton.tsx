// AddPrayerButton.tsx - A completely new design from the ground up
import React, { useEffect, useRef } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// SVG components for the prayer-inspired design
const PrayerButtonSVG = () => (
  <View style={styles.svgContainer}>
    <View style={styles.circle1} />
    <View style={styles.circle2} />
    <View style={styles.droplet} />
    <View style={styles.dot1} />
    <View style={styles.dot2} />
    <View style={styles.dot3} />
  </View>
);

interface AddPrayerButtonProps {
  onPress: () => void;
  theme?: "light" | "dark" | "sepia";
}

const AddPrayerButton: React.FC<AddPrayerButtonProps> = ({ onPress, theme = "light" }) => {
  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;

  // Define colors based on theme
  const colors = {
    light: {
      primary: "#6A478F",
      secondary: "#8860B2",
      highlight: "#A578D5",
      background: "#FFFFFF",
      text: "#FFFFFF",
    },
    dark: {
      primary: "#9C64A6",
      secondary: "#7A4A8C",
      highlight: "#BF89CE",
      background: "#2D2D2D",
      text: "#FFFFFF",
    },
    sepia: {
      primary: "#7A503E",
      secondary: "#A46E58",
      highlight: "#C5917C",
      background: "#F8F0E3",
      text: "#F8F0E3",
    },
  };

  const themeColors = colors[theme];

  // Start animations when component mounts
  useEffect(() => {
    // Entrance animation
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Delayed text appearance
    Animated.timing(textOpacityAnim, {
      toValue: 1,
      duration: 300,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Infinite floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ]),
    ).start();

    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
      ]),
    ).start();
  }, []);

  // Handle button press with appropriate feedback
  const handlePress = () => {
    // Provide haptic feedback based on device capabilities
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Visual feedback animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Call the provided callback
    if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: floatAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      {/* Text label that appears above button */}
      <Animated.View
        style={[
          styles.labelContainer,
          {
            backgroundColor: themeColors.primary,
            opacity: textOpacityAnim,
          },
        ]}
      >
        <Text style={styles.labelText}>Add Prayer</Text>
      </Animated.View>

      {/* Main button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors.primary }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Background decorative elements */}
        <PrayerButtonSVG />

        {/* Center plus icon */}
        <View style={styles.iconContainer}>
          <Feather name="plus" size={28} color={themeColors.text} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    bottom: 20,
    alignItems: "center",
    zIndex: 10,
  },
  labelContainer: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    overflow: "hidden",
  },
  iconContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  svgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  // Decorative elements inspired by prayer symbols
  circle1: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    top: 14,
    left: 14,
  },
  circle2: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    top: 6,
    left: 6,
  },
  droplet: {
    position: "absolute",
    width: 18,
    height: 25,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    transform: [{ rotate: "45deg" }],
    bottom: 10,
    right: 12,
  },
  dot1: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    top: 15,
    right: 20,
  },
  dot2: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    top: 8,
    right: 28,
  },
  dot3: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    bottom: 18,
    left: 15,
  },
});

export default AddPrayerButton;
