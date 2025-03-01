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
  interpolateColor,
  useDerivedValue,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { FontAwesome5 } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// Animated tab icon with smooth transitions
const AnimatedTabIcon = ({
  name,
  focused,
  index,
  activeIndex,
}: {
  name: string;
  focused: boolean;
  index: number;
  activeIndex: number;
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const circleScale = useSharedValue(0);
  const circleOpacity = useSharedValue(0);

  // Animate based on focus state
  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.2, { damping: 14, stiffness: 100 });
      circleScale.value = withSpring(1, { damping: 14, stiffness: 80 });
      circleOpacity.value = withSpring(1, { damping: 20 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 100 });
      circleScale.value = withSpring(0, { damping: 14, stiffness: 80 });
      circleOpacity.value = withSpring(0, { damping: 20 });
    }
  }, [focused]);

  // Derived color value for smooth transitions
  const color = useDerivedValue(() => {
    return interpolateColor(
      circleOpacity.value,
      [0, 1],
      ["rgba(255, 255, 255, 0.6)", "#FAC898"]
    );
  });

  // Animated styles
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    zIndex: 2,
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    opacity: circleOpacity.value * 0.2,
    backgroundColor: "#FAC898",
  }));

  // Render icon based on tab name
  const getIcon = () => {
    switch (name) {
      case "home":
        return (
          <FontAwesome5
            name="church"
            size={24}
            color={focused ? "#FAC898" : "rgba(255, 255, 255, 0.6)"}
            solid={focused}
          />
        );
      case "discover":
        return (
          <FontAwesome5
            name="compass"
            size={24}
            color={focused ? "#FAC898" : "rgba(255, 255, 255, 0.6)"}
            solid={focused}
          />
        );
      case "community":
        return (
          <FontAwesome5
            name="praying-hands"
            size={24}
            color={focused ? "#FAC898" : "rgba(255, 255, 255, 0.6)"}
            solid={focused}
          />
        );
      case "me":
        return (
          <FontAwesome5
            name="user-alt"
            size={24}
            color={focused ? "#FAC898" : "rgba(255, 255, 255, 0.6)"}
            solid={focused}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[styles.focusCircle, circleStyle]} />
      <Animated.View style={iconStyle}>{getIcon()}</Animated.View>
    </View>
  );
};

// Custom tab bar with seamless design
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarWrapper}>
        {/* Glass effect background with proper shadows */}
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={30}
            tint="dark"
            style={[StyleSheet.absoluteFill, styles.blurView]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBar]} />
        )}

        {/* Top accent line with gradient fade effect */}
        <View style={styles.accentLine} />

        {/* Tab buttons */}
        <View style={styles.tabButtonsRow}>
          {state.routes.map((route: any, index: number) => {
            // Skip hidden tabs
            if (
              route.name === "Lent2025" ||
              route.name.includes("faith/") ||
              route.name.includes("womens-ministry/") ||
              route.name.includes("culture-and-testimonies/") ||
              route.name.includes("news/") ||
              route.name === "donate"
            ) {
              return null;
            }

            const isFocused = state.index === index;

            const onPress = () => {
              navigation.navigate(route.name);
            };

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabButton}
                onPress={onPress}
                activeOpacity={0.8}
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
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="me" options={{ title: "Me" }} />

      {/* Hidden screens */}
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarWrapper: {
    width: width - 32,
    height: 60, // Reduced height since we removed labels
    borderRadius: 30, // More circular without labels
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  blurView: {
    borderRadius: 30,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  androidBar: {
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderRadius: 30,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  accentLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "#FAC898",
    opacity: 0.8,
    zIndex: 1,
  },
  tabButtonsRow: {
    flexDirection: "row",
    height: "100%",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
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
    height: 50,
    width: 50,
  },
  focusCircle: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    zIndex: 1,
  },
});
