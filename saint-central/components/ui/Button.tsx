import theme from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import {
  TouchableOpacity,
  type GestureResponderEvent,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";

type Props = {
  children: ReactNode;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
};

export default function Button({ children, onPressIn, onPressOut, onPress, style }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
    >
      <LinearGradient
        colors={[theme.primaryGradientStart, theme.primaryGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.primaryButton, style]}
      >
        {children}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
