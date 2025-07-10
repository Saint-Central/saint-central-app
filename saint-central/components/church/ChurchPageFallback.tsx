import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import theme from "@/theme";

type Props = {
  error?: Error | null;
};

// Floating elements for background decoration
const FloatingElement = ({ delay, size, icon }: { delay: number; size: number; icon: string }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 3000 }),
          withTiming(20, { duration: 3000 })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.1, { duration: 2000 }),
          withTiming(0.3, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingElement, { width: size, height: size }, animatedStyle]}>
      <FontAwesome5 name={icon} size={size * 0.6} color="rgba(255, 255, 255, 0.1)" />
    </Animated.View>
  );
};

export default function ChurchPageFallback({ error }: Props) {
  const router = useRouter();

  // Animation values
  const fadeAnim = useSharedValue(0);
  const contentAnim = useSharedValue(0);
  const heroImageAnim = useSharedValue(0);
  const cardAnim = useSharedValue(0);
  const buttonAnimValues = [0, 1].map(() => useSharedValue(0));

  // Handle animations
  useEffect(() => {
    // Hero image animation
    heroImageAnim.value = withTiming(1, { duration: 1200 });

    // Main content fade in
    fadeAnim.value = withDelay(400, withTiming(1, { duration: 800 }));

    // Content slide up
    contentAnim.value = withDelay(600, withSpring(1, { damping: 12, stiffness: 40 }));

    // Card scale animation
    cardAnim.value = withDelay(800, withSpring(1, { damping: 10, stiffness: 35 }));

    // Button animations with stagger
    buttonAnimValues.forEach((anim, index) => {
      anim.value = withDelay(
        1000 + index * 150,
        withSpring(1, { damping: 8, stiffness: 50 })
      );
    });
  }, []);

  // Animated styles
  const heroImageStyle = useAnimatedStyle(() => ({
    opacity: heroImageAnim.value,
    transform: [
      { scale: heroImageAnim.value },
      { translateY: (1 - heroImageAnim.value) * 50 },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: (1 - contentAnim.value) * 30 }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardAnim.value }],
    opacity: cardAnim.value,
  }));

  const buttonStyles = buttonAnimValues.map((anim) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: anim.value }, { translateY: (1 - anim.value) * 20 }],
      opacity: anim.value,
    }))
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background floating elements */}
      <FloatingElement delay={0} size={60} icon="cross" />
      <FloatingElement delay={500} size={40} icon="praying-hands" />
      <FloatingElement delay={1000} size={50} icon="dove" />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Animated.View style={[styles.heroImageContainer, heroImageStyle]}>
          <LinearGradient
            colors={[theme.primary + "20", theme.accent1 + "30", theme.accent2 + "20"]}
            style={styles.heroImageGradient}
          >
            <View style={styles.heroIconWrapper}>
              <View style={styles.heroIconOuter}>
                <View style={styles.heroIconInner}>
                  <FontAwesome5 name="church" size={32} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Main Content */}
      <Animated.View style={[styles.mainContent, contentStyle]}>
        {error ? (
          <View style={styles.errorContainer}>
            <LinearGradient
              colors={["rgba(239, 68, 68, 0.1)", "rgba(220, 38, 38, 0.15)"]}
              style={styles.errorGradient}
            >
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle-outline" size={24} color={theme.error} />
              </View>
              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>Something went wrong</Text>
                <Text style={styles.errorText}>Please try again later</Text>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <>
            {/* Welcome Card */}
            <Animated.View style={[styles.welcomeCard, cardStyle]}>
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.08)",
                  "rgba(255, 255, 255, 0.12)",
                  "rgba(255, 255, 255, 0.06)"
                ]}
                style={styles.welcomeCardGradient}
              >
                <View style={styles.welcomeContent}>
                  <Text style={styles.welcomeTitle}>Find Your Spiritual Home</Text>
                  <Text style={styles.welcomeDescription}>
                    Connect with a vibrant church community where faith grows, friendships flourish, 
                    and purpose is discovered together.
                  </Text>
                  
                  {/* Features */}
                  <View style={styles.featuresContainer}>
                    <FeatureItem
                      icon="people-outline"
                      text="Join a community"
                      color={theme.primary}
                    />
                    <FeatureItem
                      icon="calendar-outline"
                      text="Attend events"
                      color={theme.accent2}
                    />
                    <FeatureItem
                      icon="school-outline"
                      text="Learn and grow"
                      color={theme.accent3}
                    />
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Animated.View style={[styles.actionButton, buttonStyles[0]]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.navigate("/churchSearch")}
                  style={styles.actionButtonTouchable}
                >
                  <LinearGradient
                    colors={[theme.primary, theme.accent1]}
                    style={styles.primaryActionGradient}
                  >
                    <View style={styles.actionButtonContent}>
                      <View style={styles.actionButtonIconContainer}>
                        <MaterialCommunityIcons name="magnify" size={22} color="#FFFFFF" />
                      </View>
                      <View style={styles.actionButtonTextContainer}>
                        <Text style={styles.actionButtonTitle}>Search Churches</Text>
                        <Text style={styles.actionButtonSubtitle}>Find nearby congregations</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.7)" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[styles.actionButton, buttonStyles[1]]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.navigate("/registerChurch")}
                  style={styles.actionButtonTouchable}
                >
                  <LinearGradient
                    colors={[theme.accent3, theme.secondary]}
                    style={styles.secondaryActionGradient}
                  >
                    <View style={styles.actionButtonContent}>
                      <View style={styles.actionButtonIconContainer}>
                        <FontAwesome5 name="plus-circle" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.actionButtonTextContainer}>
                        <Text style={styles.actionButtonTitle}>Register Church</Text>
                        <Text style={styles.actionButtonSubtitle}>Add your congregation</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.7)" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

// Feature Item Component
const FeatureItem = ({ icon, text, color }: { icon: string; text: string; color: string }) => (
  <View style={styles.featureItem}>
    <View style={[styles.featureIcon, { backgroundColor: color + "20" }]}>
      <Ionicons name={icon as any} size={16} color={color} />
    </View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  
  // Background decoration
  floatingElement: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },

  // Hero Section
  heroSection: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  heroImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
  },
  heroImageGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroIconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  heroIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heroIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Main Content
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Error State
  errorContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  errorGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  errorIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  errorContent: {
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  errorText: {
    fontSize: 14,
    color: theme.textLight,
    textAlign: "center",
  },

  // Welcome Card
  welcomeCard: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  welcomeCardGradient: {
    padding: 24,
  },
  welcomeContent: {
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.textWhite,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  welcomeDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textLight,
    textAlign: "center",
    marginBottom: 24,
  },

  // Features
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.textLight,
    textAlign: "center",
  },

  // Actions
  actionsContainer: {
    gap: 16,
  },
  actionButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  actionButtonTouchable: {
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryActionGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  secondaryActionGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  actionButtonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  actionButtonTextContainer: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  actionButtonSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 16,
  },
});