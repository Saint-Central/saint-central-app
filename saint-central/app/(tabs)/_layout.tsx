import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  interpolate,
  withRepeat,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import theme from "@/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TabBarProps {
  state: TabNavigationState<ParamListBase>;
  descriptors: Record<string, any>;
  navigation: any;
}

interface ModernTabIconProps {
  name: "home" | "discover" | "Bible" | "profile";
  focused: boolean;
  index: number;
}

const ICON_SIZE = 20;
const TAB_WIDTH = SCREEN_WIDTH / 4.5;

// Modern animated tab icon with morphing effects
const ModernTabIcon: React.FC<ModernTabIconProps> = ({ name, focused, index }) => {
  // Core animations
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const iconColor = useSharedValue(0);
  const morphProgress = useSharedValue(0);
  const bounceAnim = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  
  // Particle effects
  const particle1 = useSharedValue(0);
  const particle2 = useSharedValue(0);
  const particle3 = useSharedValue(0);

  useEffect(() => {
    const springConfig = {
      damping: 14,
      stiffness: 180,
      mass: 0.8,
    };

    if (focused) {
      // Main animations
      scale.value = withSequence(
        withSpring(1.1, springConfig),
        withSpring(1.05, { ...springConfig, damping: 10 })
      );
      rotation.value = 0; // Disabled rotation to prevent blur
      iconColor.value = withTiming(1, { duration: 300 });
      morphProgress.value = withSpring(1, springConfig);
      textOpacity.value = withTiming(1, { duration: 250 });
      
      // Bounce effect
      bounceAnim.value = withSequence(
        withTiming(1, { duration: 150 }),
        withSpring(0, springConfig)
      );
      
      // Particle animations
      particle1.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(100, withTiming(0, { duration: 400 }))
      );
      particle2.value = withSequence(
        withDelay(50, withTiming(1, { duration: 300 })),
        withDelay(150, withTiming(0, { duration: 400 }))
      );
      particle3.value = withSequence(
        withDelay(100, withTiming(1, { duration: 300 })),
        withDelay(200, withTiming(0, { duration: 400 }))
      );
    } else {
      scale.value = withSpring(1, springConfig);
      rotation.value = 0;
      iconColor.value = withTiming(0, { duration: 200 });
      morphProgress.value = withSpring(0, springConfig);
      textOpacity.value = withTiming(0, { duration: 150 });
      bounceAnim.value = 0;
      particle1.value = withTiming(0, { duration: 200 });
      particle2.value = withTiming(0, { duration: 200 });
      particle3.value = withTiming(0, { duration: 200 });
    }
  }, [focused, scale, rotation, iconColor, morphProgress, textOpacity, bounceAnim, particle1, particle2, particle3]);

  // Animated styles
  const iconStyle = useAnimatedStyle(() => {
    const translateY = Math.round(interpolate(bounceAnim.value, [0, 1], [0, -5]));
    
    return {
      transform: [
        { scale: scale.value },
        { translateY },
      ],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  // Particle styles
  const particleStyle1 = useAnimatedStyle(() => {
    const translateX = Math.round(interpolate(particle1.value, [0, 1], [0, -15]));
    const translateY = Math.round(interpolate(particle1.value, [0, 1], [0, -15]));
    const scale = interpolate(particle1.value, [0, 0.5, 1], [0, 1, 0]);
    
    return {
      opacity: particle1.value,
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  const particleStyle2 = useAnimatedStyle(() => {
    const translateX = Math.round(interpolate(particle2.value, [0, 1], [0, 15]));
    const translateY = Math.round(interpolate(particle2.value, [0, 1], [0, -12]));
    const scale = interpolate(particle2.value, [0, 0.5, 1], [0, 1, 0]);
    
    return {
      opacity: particle2.value,
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  const particleStyle3 = useAnimatedStyle(() => {
    const translateY = Math.round(interpolate(particle3.value, [0, 1], [0, -18]));
    const scale = interpolate(particle3.value, [0, 0.5, 1], [0, 1, 0]);
    
    return {
      opacity: particle3.value,
      transform: [{ translateY }, { scale }],
    };
  });

  // Background morph style
  const morphStyle = useAnimatedStyle(() => {
    const scale = interpolate(morphProgress.value, [0, 1], [0.8, 1]);
    const opacity = interpolate(morphProgress.value, [0, 1], [0, 1]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Icon mapping with modern icons
  const icons = {
    home: {
      icon: (color: any) => <Ionicons name="home-sharp" size={ICON_SIZE} color={color} />,
      label: "Home",
    },
    discover: {
      icon: (color: any) => <MaterialCommunityIcons name="compass-outline" size={ICON_SIZE} color={color} />,
      label: "Explore",
    },
    Bible: {
      icon: (color: any) => <MaterialCommunityIcons name="book-open-page-variant" size={ICON_SIZE} color={color} />,
      label: "Bible",
    },
    profile: {
      icon: (color: any) => <Ionicons name="person-sharp" size={ICON_SIZE} color={color} />,
      label: "Profile",
    },
  };

  return (
    <View style={styles.modernIconContainer}>
      {/* Morphing background */}
      <Animated.View style={[styles.morphBackground, morphStyle]}>
        <LinearGradient
          colors={[`${theme.primary}20`, `${theme.accent1}15`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* Particles */}
      <Animated.View style={[styles.particle, particleStyle1]}>
        <View style={[styles.particleDot, { backgroundColor: theme.accent1 }]} />
      </Animated.View>
      <Animated.View style={[styles.particle, particleStyle2]}>
        <View style={[styles.particleDot, { backgroundColor: theme.primary }]} />
      </Animated.View>
      <Animated.View style={[styles.particle, particleStyle3]}>
        <View style={[styles.particleDot, { backgroundColor: theme.accent2 }]} />
      </Animated.View>
      
      {/* Icon */}
      <Animated.View style={[iconStyle, { shouldRasterizeIOS: true, renderToHardwareTextureAndroid: true }]}>
        {icons[name].icon(focused ? theme.accent2 : theme.textLight)}
      </Animated.View>
      
      {/* Modern label */}
      {focused && (
        <Animated.Text style={[styles.modernLabel, labelStyle]}>
          {icons[name].label}
        </Animated.Text>
      )}
    </View>
  );
};

const ModernTabBar: React.FC<TabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const floatingAnim = useSharedValue(0);
  const morphAnim = useSharedValue(0);
  const activeIndicatorPosition = useSharedValue(0);
  
  const visibleTabs = ["home", "discover", "Bible", "profile"];

  // Track if Comments screen is active
  const isCommentsScreen = state.routes.some(
    (route) => route.name === "" && state.index === state.routes.indexOf(route),
  );

  // Get active tab index
  const activeTabIndex = visibleTabs.findIndex((tab) => {
    const route = state.routes.find((r) => r.name === tab);
    return route && (state.index === state.routes.indexOf(route) || (tab === "home" && isCommentsScreen));
  });

  // Floating animation
  useEffect(() => {
    floatingAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    
    morphAnim.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1
    );
  }, []);

  // Update indicator position
  useEffect(() => {
    if (activeTabIndex >= 0) {
      const containerWidth = SCREEN_WIDTH - 100; // 30px padding on each side + 20px internal padding on each side
      const tabWidth = containerWidth / visibleTabs.length;
      const startOffset = 20; // Internal padding
      const position = startOffset + (activeTabIndex * tabWidth) + (tabWidth / 2) - 20; // Center the 40px indicator
      activeIndicatorPosition.value = withSpring(position, {
        damping: 20,
        stiffness: 300,
      });
    }
  }, [activeTabIndex]);

  const floatingStyle = useAnimatedStyle(() => {
    const translateY = interpolate(floatingAnim.value, [0, 1], [0, -3]);
    
    return {
      transform: [{ translateY }],
    };
  });

  const morphStyle = useAnimatedStyle(() => {
    const scale = interpolate(morphAnim.value, [0, 0.5, 1], [1, 1.02, 1]);
    
    return {
      transform: [{ scale }],
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: activeIndicatorPosition.value }],
    };
  });

  return (
    <View style={[styles.modernContainer, { paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.floatingWrapper, floatingStyle]}>
        <Animated.View style={[styles.morphWrapper, morphStyle]}>
          <View style={styles.modernTabBar}>
            {/* Glass background */}
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={["rgba(28,25,23,0.92)", "rgba(41,37,36,0.95)"]}
                style={StyleSheet.absoluteFill}
              />
              {Platform.OS === "ios" && (
                <BlurView
                  intensity={30}
                  tint="dark"
                  style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
                />
              )}
            </View>
            
            {/* Animated indicator */}
            <Animated.View style={[styles.activeIndicator, indicatorStyle]}>
              <LinearGradient
                colors={[theme.primary, theme.accent1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.indicatorGradient}
              />
            </Animated.View>
            
            {/* Tab buttons */}
            <View style={styles.modernTabRow}>
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
                    style={styles.modernTabButton}
                    onPress={onPress}
                    activeOpacity={0.8}
                  >
                    <ModernTabIcon
                      name={route.name as ModernTabIconProps["name"]}
                      focused={isFocused}
                      index={index}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ModernTabBar {...props} />}
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
  // Modern container styles
  modernContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingWrapper: {
    width: "100%",
    paddingHorizontal: 30,
    paddingBottom: 5,
  },
  morphWrapper: {
    width: "100%",
  },
  modernTabBar: {
    height: 56,
    backgroundColor: "transparent",
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  
  // Tab row
  modernTabRow: {
    flexDirection: "row",
    height: "100%",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 20,
  },
  
  // Tab button
  modernTabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  
  // Icon container
  modernIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    height: 50,
  },
  
  // Morphing background
  morphBackground: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  
  // Particles
  particle: {
    position: "absolute",
    width: 3,
    height: 3,
  },
  particleDot: {
    width: "100%",
    height: "100%",
    borderRadius: 1.5,
  },
  
  // Modern label
  modernLabel: {
    position: "absolute",
    bottom: 8,
    fontSize: 8,
    fontWeight: theme.fontBold,
    color: theme.accent2,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  
  // Active indicator
  activeIndicator: {
    position: "absolute",
    bottom: 2,
    width: 40,
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  indicatorGradient: {
    flex: 1,
  },
});