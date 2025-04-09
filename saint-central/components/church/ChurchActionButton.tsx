import { MaterialIcons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  icon?: ReactNode;
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  withArrow?: boolean;
};

export function ChurchActionButton({ icon, children, onPress, withArrow = true }: Props) {
  const [pressAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.quickActionButton, { transform: [{ scale: pressAnim }] }]}>
        <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.buttonGradient}>
          <View style={styles.buttonContent}>
            {icon && <View style={styles.buttonIconWrapper}>{icon}</View>}
            {children}
            {withArrow && (
              <View style={styles.arrowContainer}>
                <LinearGradient colors={["#F1F5F9", "#E2E8F0"]} style={styles.arrowGradient}>
                  <MaterialIcons name="arrow-forward-ios" size={14} color="#94A3B8" />
                </LinearGradient>
              </View>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  buttonIconWrapper: {
    marginRight: 16,
  },
  arrowContainer: {
    marginLeft: "auto",
  },
  arrowGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionButton: {
    borderRadius: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonGradient: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(241, 245, 249, 0.8)",
  },
});
