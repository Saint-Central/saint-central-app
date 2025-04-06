import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, View, StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";

interface TabBarProps {
  state: TabNavigationState<ParamListBase>;
  descriptors: Record<string, any>;
  navigation: any;
}

interface AnimatedTabIconProps {
  name: "home" | "discover" | "bible" | "profile";
  focused: boolean;
  index: number;
  activeIndex: number;
}

const ICON_SIZE = 20;

// Animated tab icon with smooth transitions
const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({ name, focused }) => {
  // Animation values with improved configurations
  const scale = useSharedValue(1);
  const circleScale = useSharedValue(0);
  const circleOpacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  // Enhance animations with rotation and improved timing
  useEffect(() => {
    // Animation configuration for more fluid movements
    const springConfig = {
      damping: 10,
      stiffness: 80,
      mass: 0.5,
      overshootClamping: false,
    };

    if (focused) {
      scale.value = withSpring(1.05, springConfig);
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
  }, [circleOpacity, circleScale, focused, rotation, scale, textOpacity, translateY]);

  // Animated styles
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    zIndex: 2,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      { translateY: withTiming(focused ? 0 : 5, { duration: 200 }) },
      { scale: textOpacity.value * 0.2 + 0.8 },
    ],
  }));

  // Refined icon selection with improved naming
  const icon = {
    home: {
      icon: <Feather name="home" size={ICON_SIZE} color="#FFFFFF" />,
      label: "Home",
    },
    discover: {
      icon: <Feather name="compass" size={ICON_SIZE} color="#FFFFFF" />,
      label: "Explore",
    },
    bible: {
      icon: <Feather name="book" size={ICON_SIZE} color="#FFFFFF" />,
      label: "Bible",
    },
    profile: {
      icon: <Feather name="user" size={ICON_SIZE} color="#FFFFFF" />,
      label: "Profile",
    },
  };

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[iconStyle, { opacity: focused ? 1 : 0.7 }]}>
        {icon[name].icon}
      </Animated.View>
      <Animated.Text style={[styles.tabLabel, textStyle]}>{icon[name].label}</Animated.Text>
    </View>
  );
};

const CustomTabBar: React.FC<TabBarProps> = ({ state, navigation }) => {
  // TODO: fix this by not polluting the app router with components in the root routes
  const visibleTabs = ["home", "discover", "bible", "profile"];

  // Track if Comments screen is active to keep Home tab selected
  const isCommentsScreen = state.routes.some(
    (route) => route.name === "" && state.index === state.routes.indexOf(route),
  );

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
          <LinearGradient colors={["#FAC898", "#FAC898"]} style={styles.accentLine} />

          {/* Tab buttons with improved spacing */}
          <View style={styles.tabButtonsRow}>
            {state.routes.map((route, index) => {
              if (!visibleTabs.includes(route.name)) {
                return null;
              }

              // Check if this tab is focused OR if it's home and comments screen is active
              const isFocused =
                state.index === index || (route.name === "home" && isCommentsScreen);

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  navigation.navigate(route.name);
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
                    name={route.name as AnimatedTabIconProps["name"]}
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
      {/* Main visible tabs - FeedScreen is directly specified, no need for duplicate home */}
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="bible" options={{ title: "Bible" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />

      {/* Hidden screens */}
      <Tabs.Screen name="RosaryPrayer" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="RosaryPrayer2" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="RosaryPrayer3" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="RosaryPrayer4" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="RosaryPrayer5" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="RosaryPrayer6" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="RosaryPrayer7" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="statistics" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="events" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="community" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="Bible" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="Lent2025" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="faith/index" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="faith/[id]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="womens-ministry/[id]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="womens-ministry/index" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="culture-and-testimonies/index" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="culture-and-testimonies/[id]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="news/index" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="donate" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="groups" options={{ tabBarButton: () => null }} />
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
