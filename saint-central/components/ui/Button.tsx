import theme from "@/theme";
import { ReactNode } from "react";
import {
  TouchableOpacity,
  type GestureResponderEvent,
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
} from "react-native";

type Variant = "outline";
type Size = "sm" | "md" | "lg";

type Props = {
  children?: ReactNode;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onPress?: (event: GestureResponderEvent) => void;
  size?: Size;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  children,
  onPressIn,
  onPressOut,
  onPress,
  size = "md",
  variant,
  style,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
    >
      <View style={[styles.shared, getSizeStyles(size), styles[variant ?? "primary"], style]}>
        {children}
      </View>
    </TouchableOpacity>
  );
}
const sizeStyles: Record<Size, ViewStyle> = {
  sm: {
    height: 32,
  },
  md: { height: 46 },
  lg: { height: 56 },
};

const getSizeStyles = (size: Size) => {
  return StyleSheet.create({ view: sizeStyles[size] });
};

const styles = StyleSheet.create({
  shared: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: theme.secondary,
  },
  outline: {},
});
