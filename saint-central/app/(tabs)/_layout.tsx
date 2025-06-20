import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, View, StyleSheet, TouchableOpacity, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import theme from "@/theme";

interface TabBarProps {
  state: TabNavigationState<ParamListBase>;
  descriptors: Record<string, any>;
  navigation: any;
}

interface SimpleTabIconProps {
  name: "home" | "discover" | "Bible" | "profile";
  focused: boolean;
  index: number;
}

const ICON_SIZE = 24;

// Compact tab with Christian-themed animations
const SimpleTabIcon: React.FC<SimpleTabIconProps> = ({ name, focused, index }) => {
  const iconScale = useSharedValue(1);
  const iconRotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const iconOpacity = useSharedValue(0.5);
  const crossScale = useSharedValue(0);
  const crossRotation = useSharedValue(0);
  const holyLightOpacity = useSharedValue(0);
  const blessingRipple = useSharedValue(0);
  const lineWidth = useSharedValue(0);
  const starsOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (focused) {
      // Gentle haptic like a blessing
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Icon blessed with gentle growth (like spiritual awakening)
      iconScale.value = withSequence(
        withTiming(1.25, { duration: 300, easing: Easing.out(Easing.sin) }),
        withSpring(1.12, { damping: 12, stiffness: 200 })
      );
      
      // Gentle rotation (like prayer movement)
      iconRotation.value = withSequence(
        withTiming(10, { duration: 200, easing: Easing.out(Easing.sin) }),
        withSpring(0, { damping: 15, stiffness: 250 })
      );
      iconOpacity.value = withTiming(1, { duration: 400 });
      
      // Cross blessing animation (trinity-inspired 3 phases)
      crossScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 300 })
      );
      crossRotation.value = withTiming(360, { duration: 700, easing: Easing.out(Easing.quad) });
      
      // Holy light emanating (like divine presence)
      holyLightOpacity.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(0.8, { duration: 400, easing: Easing.out(Easing.sin) }),
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 400 })
      );
      
      // Blessing ripple (like divine touch)
      blessingRipple.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(2, { duration: 800, easing: Easing.out(Easing.sin) }),
        withTiming(0, { duration: 200 })
      );
      
      // Line indicator (like path of righteousness)
      lineWidth.value = withSpring(28, { damping: 18, stiffness: 250 });
      
      // Text revelation
      textOpacity.value = withTiming(1, { duration: 500 });
      
      // Stars of Bethlehem
      starsOpacity.value = withSequence(
        withTiming(0, { duration: 100 }),
        withTiming(1, { duration: 300 }),
        withTiming(0.7, { duration: 400 }),
        withTiming(0, { duration: 300 })
      );
    } else {
      iconScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      iconRotation.value = withTiming(0, { duration: 300 });
      iconOpacity.value = withTiming(0.5, { duration: 300 });
      crossScale.value = withSpring(0, { damping: 15, stiffness: 300 });
      crossRotation.value = withTiming(0, { duration: 200 });
      holyLightOpacity.value = withTiming(0, { duration: 200 });
      blessingRipple.value = 0;
      lineWidth.value = withSpring(0, { damping: 15, stiffness: 300 });
      textOpacity.value = withTiming(0, { duration: 200 });
      starsOpacity.value = 0;
    }
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` }
    ],
    opacity: iconOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const crossStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: crossScale.value },
      { rotate: `${crossRotation.value}deg` }
    ],
    opacity: crossScale.value,
  }));

  const holyLightStyle = useAnimatedStyle(() => ({
    opacity: holyLightOpacity.value,
    transform: [{ scale: interpolate(holyLightOpacity.value, [0, 1], [0.5, 1.5]) }],
  }));

  const blessingRippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blessingRipple.value }],
    opacity: interpolate(blessingRipple.value, [0, 0.5, 2], [0, 0.6, 0]),
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
    opacity: lineWidth.value > 0 ? 1 : 0,
  }));

  const starsStyle = useAnimatedStyle(() => ({
    opacity: starsOpacity.value,
    transform: [{ scale: starsOpacity.value }],
  }));

  // Icon mapping
  const iconData = {
    home: { 
      icon: <Ionicons name="home" size={ICON_SIZE} color={focused ? theme.accent1 : theme.textLight} />,
      label: "Home"
    },
    discover: { 
      icon: <Ionicons name="search" size={ICON_SIZE} color={focused ? theme.accent1 : theme.textLight} />,
      label: "Explore"
    },
    Bible: { 
      icon: <Ionicons name="book" size={ICON_SIZE} color={focused ? theme.accent1 : theme.textLight} />,
      label: "Bible"
    },
    profile: { 
      icon: <Ionicons name="person" size={ICON_SIZE} color={focused ? theme.accent1 : theme.textLight} />,
      label: "Profile"
    },
  };

  return (
    <View style={styles.tabContainer}>
      {/* Blessing ripple (divine touch) */}
      <Animated.View style={[styles.blessingRipple, blessingRippleStyle]}>
        <LinearGradient
          colors={[`${theme.accent2}40`, `${theme.accent1}30`, 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* Holy light emanation */}
      <Animated.View style={[styles.holyLight, holyLightStyle]}>
        <LinearGradient
          colors={['rgba(255,215,0,0.3)', `${theme.accent2}20`, 'transparent']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* Cross blessing */}
      <Animated.View style={[styles.crossBlessing, crossStyle]}>
        <MaterialCommunityIcons 
          name="cross" 
          size={16} 
          color={`${theme.accent2}80`} 
        />
      </Animated.View>
      
      {/* Stars of Bethlehem */}
      <Animated.View style={[styles.star1, starsStyle]}>
        <MaterialCommunityIcons name="star-four-points" size={6} color={theme.accent2} />
      </Animated.View>
      <Animated.View style={[styles.star2, starsStyle]}>
        <MaterialCommunityIcons name="star-four-points" size={4} color={theme.accent1} />
      </Animated.View>
      <Animated.View style={[styles.star3, starsStyle]}>
        <MaterialCommunityIcons name="star-four-points" size={5} color="#FFD700" />
      </Animated.View>
      
      {/* Icon */}
      <Animated.View style={iconStyle}>
        {iconData[name].icon}
      </Animated.View>
      
      {/* Text label */}
      <Animated.Text style={[styles.tabLabel, textStyle]}>
        {iconData[name].label}
      </Animated.Text>
      
      {/* Path of righteousness indicator */}
      <Animated.View style={[styles.pathIndicator, lineStyle]}>
        <LinearGradient
          colors={['#FFD700', theme.accent1, theme.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const SimpleModernTabBar: React.FC<TabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const visibleTabs = ["home", "discover", "Bible", "profile"];

  // Track if Comments screen is active
  const isCommentsScreen = state.routes.some(
    (route) => route.name === "" && state.index === state.routes.indexOf(route),
  );

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[theme.neutral900, theme.neutral800]}
          style={StyleSheet.absoluteFill}
        />
        {Platform.OS === "ios" && (
          <BlurView
            intensity={20}
            tint="dark"
            style={[StyleSheet.absoluteFill, { opacity: 0.8 }]}
          />
        )}
      </View>
      
      {/* Top border */}
      <View style={styles.topBorder} />
      
      {/* Tab buttons */}
      <View style={[styles.tabRow, { 
        height: 50 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 8, 0) : 0 
      }]}>
        {state.routes.map((route, index) => {
          if (!visibleTabs.includes(route.name)) {
            return null;
          }

          const isFocused = state.index === index || (route.name === "home" && isCommentsScreen);

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
              activeOpacity={0.7}
            >
              <SimpleTabIcon
                name={route.name as SimpleTabIconProps["name"]}
                focused={isFocused}
                index={index}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <SimpleModernTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Main visible tabs */}
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="Bible" options={{ title: "Bible" }} />
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
      <Tabs.Screen name="church_events" options={{ tabBarButton: () => null }} />
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
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(254, 243, 199, 0.1)",
  },
  
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 10,
    paddingTop: 2,
  },
  
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  
  tabContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 44,
    height: 44,
    position: "relative",
  },
  
  // Christian-themed elements
  blessingRipple: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
  },
  
  holyLight: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  
  crossBlessing: {
    position: "absolute",
    top: 2,
    right: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Stars of Bethlehem
  star1: {
    position: "absolute",
    top: 4,
    left: 6,
  },
  
  star2: {
    position: "absolute",
    top: 8,
    right: 4,
  },
  
  star3: {
    position: "absolute",
    bottom: 6,
    left: 4,
  },
  
  tabLabel: {
    position: "absolute",
    bottom: 3,
    fontSize: 8,
    fontWeight: theme.fontBold,
    color: theme.accent1,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  
  pathIndicator: {
    position: "absolute",
    bottom: -1,
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
});