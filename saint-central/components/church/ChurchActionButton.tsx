import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { TouchableOpacity, View, StyleSheet, Text, type GestureResponderEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
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
  const pressAnim = useSharedValue(1);

  // Spring animation config
  const springConfig: WithSpringConfig = {
    damping: 15,
    stiffness: 400,
    mass: 1,
    overshootClamping: false,
  };

  const handlePressIn = () => {
    pressAnim.value = withSpring(0.97, springConfig);
  };

  const handlePressOut = () => {
    pressAnim.value = withSpring(1, springConfig);
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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressAnim.value }],
    };
  });

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.button, getButtonStyle(), animatedStyle]}>
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
