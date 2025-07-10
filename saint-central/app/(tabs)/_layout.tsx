import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, View, StyleSheet, TouchableOpacity, Text, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
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

// Simple tab with minimal animations
const SimpleTabIcon: React.FC<SimpleTabIconProps> = ({ name, focused, index }) => {
  const iconScale = useSharedValue(1);
  const iconOpacity = useSharedValue(focused ? 1 : 0.6);
  const textOpacity = useSharedValue(focused ? 1 : 0);
  
  useEffect(() => {
    if (focused) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      iconScale.value = withSpring(1.1, { damping: 15, stiffness: 200 });
      iconOpacity.value = withTiming(1, { duration: 200 });
      textOpacity.value = withTiming(1, { duration: 200 });
    } else {
      iconScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      iconOpacity.value = withTiming(0.6, { duration: 200 });
      textOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
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
      {/* Icon */}
      <Animated.View style={iconStyle}>
        {iconData[name].icon}
      </Animated.View>
      
      {/* Text label - only shown when focused */}
      {focused && (
        <Animated.Text style={[styles.tabLabel, textStyle]}>
          {iconData[name].label}
        </Animated.Text>
      )}
      
    </View>
  );
};

const SimpleModernTabBar: React.FC<TabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const visibleTabs = ["home", "discover", "Bible", "profile"];
  const { width: screenWidth } = Dimensions.get('window');
  
  // Sliding underline indicator
  const underlineX = useSharedValue(0);
  
  // Track if Comments screen is active
  const isCommentsScreen = state.routes.some(
    (route) => route.name === "" && state.index === state.routes.indexOf(route),
  );

  // Calculate underline position based on active tab
  useEffect(() => {
    const activeIndex = visibleTabs.findIndex(tab => {
      const routeIndex = state.routes.findIndex(route => route.name === tab);
      return state.index === routeIndex || (tab === "home" && isCommentsScreen);
    });
    
    if (activeIndex !== -1) {
      // Calculate tab width (screen width minus padding divided by 4 tabs)
      const tabWidth = (screenWidth - 32) / 4; // 32px total horizontal padding (16px each side)
      const targetX = activeIndex * tabWidth + (tabWidth / 2) - 15; // Center the 30px underline in the tab
      underlineX.value = withSpring(targetX, { damping: 15, stiffness: 200 });
    }
  }, [state.index, isCommentsScreen, screenWidth]);

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Simplified Background */}
      <LinearGradient
        colors={[
          `${theme.neutral900}f8`, 
          `${theme.neutral800}f5`
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Simple Top border */}
      <View style={styles.topBorder} />
      
      {/* Tab buttons */}
      <View style={[styles.tabRow, { 
        height: 48 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 4, 0) : 4 
      }]}>
        {state.routes.map((route, index) => {
          if (!visibleTabs.includes(route.name)) {
            return null;
          }

          const isFocused = state.index === index || (route.name === "home" && isCommentsScreen);

          const onPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
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
              activeOpacity={0.8}
            >
              <SimpleTabIcon
                name={route.name as SimpleTabIconProps["name"]}
                focused={isFocused}
                index={index}
              />
            </TouchableOpacity>
          );
        })}
        
        {/* Sliding underline indicator positioned under text */}
        <Animated.View style={[styles.slidingUnderline, underlineStyle]}>
          <LinearGradient
            colors={[theme.accent1, theme.accent2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.slidingUnderlineGradient}
          />
        </Animated.View>
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
    ...Platform.select({
      ios: {
        shadowColor: theme.neutral900,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: `${theme.accent2}40`,
  },
  
  tabRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-evenly",
    paddingHorizontal: 16,
    paddingTop: 8,
    position: "relative",
  },
  
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    backgroundColor: "transparent",
  },
  
  tabContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    height: 40,
    position: "relative",
  },
  
  tabLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    color: theme.accent1,
    letterSpacing: 0.2,
  },
  
  slidingUnderline: {
    position: "absolute",
    top: 50, // paddingTop(8) + icon center(20) + icon half(12) + text marginTop(4) + text height(10) + small gap(6)
    width: 30,
    height: 2,
    borderRadius: 1,
    left: 16, // Start from the left padding
  },
  
  slidingUnderlineGradient: {
    flex: 1,
    borderRadius: 1,
  },
});