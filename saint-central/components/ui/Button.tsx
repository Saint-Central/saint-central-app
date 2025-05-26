import theme from "@/theme";
import { ReactNode } from "react";
import {
  TouchableOpacity,
  type GestureResponderEvent,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";

type Variant = "outline";
type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

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
      style={[styles.shared, getSizeStyles(size), styles[variant ?? "primary"], style]}
    >
      {children}
    </TouchableOpacity>
  );
}
const sizeStyles: Record<Size, ViewStyle> = {
  xs: {
    height: 24,
  },
  sm: {
    height: 32,
  },
  md: { height: 46 },
  lg: { height: 56 },
  xl: { height: 64 },
  "2xl": { height: 76 },
  "3xl": { height: 92 },
};

const getSizeStyles = (size: Size) => {
  return StyleSheet.create({ view: sizeStyles[size] }).view;
};

const styles = StyleSheet.create({
  shared: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingInline: 10,
  },
  primary: {
    backgroundColor: theme.secondary,
  },
  outline: { borderWidth: 1, borderColor: theme.neutral300, backgroundColor: theme.neutral50 },
});
