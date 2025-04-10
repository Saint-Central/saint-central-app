import { MaterialIcons, Ionicons } from "@expo/vector-icons";
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
import theme from "@/theme";

type Props = {
  icon?: ReactNode;
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  withArrow?: boolean;
  variant?: "primary" | "secondary" | "outline";
};

export function ChurchActionButton({
  icon,
  children,
  onPress,
  withArrow = true,
  variant = "primary",
}: Props) {
  const [pressAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      tension: 400,
      friction: 15,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 400,
      friction: 15,
      useNativeDriver: true,
    }).start();
  };

  const getButtonStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondaryButton;
      case "outline":
        return styles.outlineButton;
      default:
        return styles.primaryButton;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.button,
          getButtonStyle(),
          {
            transform: [{ scale: pressAnim }],
          },
        ]}
      >
        <View style={styles.contentContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <View style={styles.textContainer}>{children}</View>
          {withArrow && (
            <View style={styles.arrowContainer}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={variant === "outline" ? theme.neutral600 : theme.neutral300}
              />
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacingS,
  },
  button: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    ...theme.shadowLight,
  },
  primaryButton: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.neutral100,
  },
  secondaryButton: {
    backgroundColor: theme.neutral50,
    borderWidth: 1,
    borderColor: theme.neutral100,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.neutral200,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacingL,
  },
  iconContainer: {
    marginRight: theme.spacingM,
  },
  textContainer: {
    flex: 1,
  },
  arrowContainer: {
    marginLeft: theme.spacingS,
    width: 24,
    height: 24,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.neutral100,
    justifyContent: "center",
    alignItems: "center",
  },
});
