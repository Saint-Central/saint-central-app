import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  useDerivedValue,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

interface Route {
  key: string;
  name: string;
}

interface TabState {
  index: number;
  routes: Route[];
}

interface TabBarProps {
  state: TabState;
  descriptors: Record<string, any>;
  navigation: any;
}

interface AnimatedTabIconProps {
  name: string;
  focused: boolean;
  index: number;
  activeIndex: number;
}

// Animated tab icon with smooth transitions
const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  name,
  focused,
  index,
  activeIndex,
}) => {
  // Animation values with improved configurations
  const scale = useSharedValue(1);
  const circleScale = useSharedValue(0);
  const circleOpacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  // Animation configuration for more fluid movements
  const springConfig = {
    damping: 10,
    stiffness: 80,
    mass: 0.5,
    overshootClamping: false,
  };

  // Enhance animations with rotation and improved timing
  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.15, springConfig);
      circleScale.value = withSpring(1, springConfig);
      circleOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withSpring(-4, springConfig);
      rotation.value = withTiming(0, { duration: 300 });
      textOpacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      });
    } else {
      scale.value = withSpring(1, springConfig);
      circleScale.value = withSpring(0, springConfig);
      circleOpacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.cubic),
      });
      translateY.value = withSpring(0, springConfig);
      rotation.value = withTiming(0, { duration: 300 });
      textOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [focused]);

  // Fixed white color for icons
  const iconColor = useDerivedValue(() => {
    return interpolateColor(
      circleOpacity.value,
      [0, 1],
      ["rgba(255, 255, 255, 0.7)", "#FFFFFF"]
    );
  });

  // Animated styles
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    zIndex: 2,
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    opacity: circleOpacity.value * 0.25,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: circleOpacity.value * 0.6,
    transform: [{ scale: circleScale.value * 1.15 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      { translateY: withTiming(focused ? 0 : 5, { duration: 200 }) },
      { scale: textOpacity.value * 0.2 + 0.8 },
    ],
  }));

  // Refined icon selection with improved naming
  const getIcon = () => {
    switch (name) {
      case "home":
        return (
          <Animated.View style={iconStyle}>
            <Feather name="home" size={22} color="#FFFFFF" />
          </Animated.View>
        );
      case "discover":
        return (
          <Animated.View style={iconStyle}>
            <Feather name="compass" size={22} color="#FFFFFF" />
          </Animated.View>
        );
      case "community":
        return (
          <Animated.View style={iconStyle}>
            <Feather name="users" size={22} color="#FFFFFF" />
          </Animated.View>
        );
      case "me":
        return (
          <Animated.View style={iconStyle}>
            <Feather name="user" size={22} color="#FFFFFF" />
          </Animated.View>
        );
      default:
        return null;
    }
  };

  // Refined labels with better naming
  const getLabel = () => {
    switch (name) {
      case "home":
        return "Home";
      case "discover":
        return "Explore";
      case "community":
        return "Connect";
      case "me":
        return "Me";
      default:
        return "";
    }
  };

  return (
    <View style={styles.iconContainer}>
      {/* Background glow effect */}
      <Animated.View style={[styles.shimmerCircle, shimmerStyle]} />

      {/* Main circle background */}
      <Animated.View style={[styles.focusCircle, circleStyle]} />

      {/* Icon */}
      {getIcon()}

      {/* Label with enhanced animation */}
      <Animated.Text style={[styles.tabLabel, textStyle]}>
        {getLabel()}
      </Animated.Text>
    </View>
  );
};

// Custom tab bar with seamless design and improved visual aesthetics
const CustomTabBar: React.FC<TabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const router = useRouter();

  // Only show these tabs in the tab bar
  const visibleTabs = ["home", "discover", "community", "me"];

  // Track if Home tab should appear selected (even when we're on the social screen)
  const socialRouteExists = state.routes.some(
    (route: Route) => route.name === "social/screens/FeedScreen"
  );
  const socialRouteIndex = state.routes.findIndex(
    (route: Route) => route.name === "social/screens/FeedScreen"
  );

  // Check if the current route path includes the FeedScreen
  const currentRoute = descriptors[state.routes[state.index].key]?.route;
  const isSocialScreen = currentRoute?.path?.includes(
    "/social/screens/FeedScreen"
  );

  // Update this to consider both conditions
  const isSocialActive =
    (socialRouteExists && state.index === socialRouteIndex) || isSocialScreen;

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarShadow}>
        <View style={styles.tabBarWrapper}>
          {/* Solid background with gradient overlay */}
          <View
            style={[
              StyleSheet.absoluteFill,
              Platform.OS === "ios" ? styles.blurView : styles.androidBar,
            ]}
          >
            <LinearGradient
              colors={["rgba(35, 35, 35, 0.98)", "rgba(20, 20, 20, 1)"]}
              style={StyleSheet.absoluteFill}
            />
            {Platform.OS === "ios" && (
              <BlurView
                intensity={15}
                tint="dark"
                style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
              />
            )}
          </View>

          {/* Solid accent line for more defined appearance */}
          <LinearGradient
            colors={["#FAC898", "#FAC898"]}
            style={styles.accentLine}
          />

          {/* Tab buttons with improved spacing */}
          <View style={styles.tabButtonsRow}>
            {state.routes.map((route: Route, index: number) => {
              if (!visibleTabs.includes(route.name)) {
                return null;
              }

              const { options } = descriptors[route.key];
              // Check if this tab is focused OR if it's home and social is active
              const isFocused =
                state.index === index ||
                (route.name === "home" && isSocialActive);

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  if (route.name === "home") {
                    router.push("/social/screens/FeedScreen");
                  } else {
                    navigation.navigate(route.name);
                  }
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  style={styles.tabButton}
                  onPress={onPress}
                  activeOpacity={0.65}
                >
                  <AnimatedTabIcon
                    name={route.name}
                    focused={isFocused}
                    index={index}
                    activeIndex={state.index}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Main visible tabs */}
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="me" options={{ title: "Me" }} />

      {/* Hidden screens */}
      <Tabs.Screen name="RosaryPrayer" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="events" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="bible" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="Lent2025" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="faith/index" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="faith/[id]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen
        name="womens-ministry/[id]"
        options={{ tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="womens-ministry/index"
        options={{ tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="culture-and-testimonies/index"
        options={{ tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="culture-and-testimonies/[id]"
        options={{ tabBarButton: () => null }}
      />
      <Tabs.Screen name="news/index" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="donate" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="groups" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="social" options={{ tabBarButton: () => null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
    width: "100%",
  },
  tabBarWrapper: {
    width: "100%",
    height: Platform.OS === "ios" ? 85 : 65,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
  },
  blurView: {
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(35, 35, 35, 0.95)",
  },
  androidBar: {
    backgroundColor: "rgba(25, 25, 25, 0.98)",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.2)",
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
    borderRadius: 0,
  },
  tabButtonsRow: {
    flexDirection: "row",
    height: "100%",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: 54,
    width: 60,
  },
  focusCircle: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(250, 200, 152, 0.6)",
    zIndex: 1,
  },
  shimmerCircle: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 0,
  },
  tabLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
});
