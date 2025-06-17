import { LinearGradient } from "expo-linear-gradient";
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  GestureResponderEvent,
  useWindowDimensions,
  ImageBackground,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  withDelay,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import theme from "@/theme";
import { useCRUD } from "@/utils/crudClient";
import { useChurchContext } from "@/contexts/church";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  userData: { username: string; profileImage: string };
  onPressMenu: ((event: GestureResponderEvent) => void) | undefined;
};

export default function ChurchPageHeader({ userData, onPressMenu }: Props) {
  const {
    data: { church },
  } = useChurchContext();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const insets = useSafeAreaInsets();

  const [memberCount, setMemberCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { select } = useCRUD();

  // Enhanced animations
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const floatAnim = useSharedValue(0);
  const shimmerAnim = useSharedValue(0);
  const parallaxAnim = useSharedValue(0);

  // Fetch both counts in a single effect to reduce API calls
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setIsLoading(true);

        // Fetch both counts in parallel to reduce total requests
        const [members, events] = await Promise.all([
          select("church_members", {
            select: "id",
            where: { church_id: church.id },
          }),
          select("church_events", {
            select: "id",
            where: { church_id: church.id },
          }),
        ]);

        setMemberCount(members?.length || 0);
        setEventsCount(events?.length || 0);
      } catch (error) {
        console.error("Error in fetching counts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [church.id]);

  // Enhanced animation sequence
  useEffect(() => {
    // Staggered entrance animations
    fadeAnim.value = withDelay(200, withTiming(1, { duration: 800 }));
    scaleAnim.value = withDelay(400, withSpring(1, { damping: 15, stiffness: 150 }));
    
    // Floating animation for church image
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );

    // Shimmer effect
    shimmerAnim.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1
    );
  }, []);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ scale: scaleAnim.value }],
    };
  });

  const churchImageAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(floatAnim.value, [0, 1], [0, -8]);
    const scale = interpolate(floatAnim.value, [0, 0.5, 1], [1, 1.02, 1]);
    
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerAnim.value, [0, 1], [-100, 300]);
    
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View style={[styles.container, isTablet && styles.tabletContainer, containerAnimatedStyle]}>
      {/* Hero Section with Parallax Church Image */}
      <View style={[styles.heroSection, { height: 450 + insets.top }]}>
        {/* Background Image with Parallax Effect */}
        <View style={[styles.heroImageContainer, { top: -insets.top }]}>
          {church.image ? (
            <Animated.View style={[styles.heroImageWrapper, churchImageAnimatedStyle]}>
              <ImageBackground
                source={{ uri: church.image }}
                style={styles.heroBackgroundImage}
                resizeMode="cover"
              >
                {/* Gradient Overlay */}
                <LinearGradient
                  colors={[
                    'rgba(28,25,23,0.1)',
                    'rgba(28,25,23,0.3)',
                    'rgba(28,25,23,0.6)',
                    'rgba(41, 37, 36, 0.9)'
                  ]}
                  locations={[0, 0.3, 0.7, 1]}
                  style={styles.heroGradientOverlay}
                />
                
                {/* Shimmer Effect */}
                <Animated.View style={[styles.shimmerEffect, shimmerAnimatedStyle]}>
                  <LinearGradient
                    colors={['transparent', 'rgba(254,243,199,0.08)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                  />
                </Animated.View>
              </ImageBackground>
            </Animated.View>
          ) : (
            <View style={styles.heroPlaceholder}>
              <LinearGradient
                colors={[theme.primary, theme.accent1, theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroPlaceholderGradient}
              >
                <FontAwesome5 name="church" size={80} color={theme.accent2} />
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Floating Content Card */}
        <View style={styles.floatingCard}>
          {/* Top Status Row */}
          <View style={styles.topRow}>
            <View style={styles.greetingSection}>
              <Text style={styles.timeGreeting}>{getTimeGreeting()}</Text>
              <Text style={styles.userNameText}>{userData.username}</Text>
            </View>

            <View style={styles.topActions}>
              {/* Notification Bell */}
              <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
                <View style={styles.notificationIconContainer}>
                  <Ionicons name="notifications" size={20} color={theme.primary} />
                  <View style={styles.notificationDot} />
                </View>
              </TouchableOpacity>

              {/* Profile Button */}
              <TouchableOpacity
                onPress={() => router.navigate("/profile")}
                style={styles.profileButton}
                activeOpacity={0.7}
              >
                {userData.profileImage ? (
                  <Image
                    source={{ uri: userData.profileImage }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[theme.primary, theme.accent1]}
                    style={styles.profilePlaceholder}
                  >
                    <Text style={styles.profileInitial}>
                      {userData.username ? userData.username[0].toUpperCase() : "?"}
                    </Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Church Identity Card */}
          <View style={styles.churchCard}>
            <View style={styles.churchCardHeader}>
              <Text style={[styles.churchName, isTablet && styles.tabletChurchName]}>
                {church.name}
              </Text>
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={16} color={theme.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            <View style={styles.churchDetails}>
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={theme.primary} />
                </View>
                <Text style={styles.detailText}>{church.address.split(",")[0]}</Text>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={theme.accent2} />
                </View>
                <Text style={styles.detailText}>Sunday 9:00 AM</Text>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{isLoading ? "..." : eventsCount}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{isLoading ? "..." : memberCount}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>4.9</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    marginBottom: 0,
  },
  tabletContainer: {
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
  },

  // Hero Section
  heroSection: {
    position: "relative",
    height: 450,
    overflow: "hidden",
  },

  // Hero Image Container
  heroImageContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroImageWrapper: {
    flex: 1,
  },
  heroBackgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  heroGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Shimmer Effect
  shimmerEffect: {
    position: "absolute",
    top: 0,
    left: -100,
    right: 0,
    bottom: 0,
    width: 100,
  },
  shimmerGradient: {
    flex: 1,
    width: 100,
  },

  // Hero Placeholder
  heroPlaceholder: {
    flex: 1,
  },
  heroPlaceholderGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Floating Card
  floatingCard: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(254, 243, 199, 0.1)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.12)",
    backdropFilter: "blur(20px)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  // Top Row (Greeting + Actions)
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greetingSection: {
    flex: 1,
  },
  timeGreeting: {
    fontSize: 14,
    color: theme.textLight,
    fontWeight: "400",
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 22,
    color: theme.textWhite,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Notification Button
  notificationButton: {
    padding: 8,
  },
  notificationIconContainer: {
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: theme.error,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "rgba(254, 243, 199, 0.12)",
  },

  // Profile Button
  profileButton: {
    position: "relative",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(254, 243, 199, 0.2)",
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(254, 243, 199, 0.2)",
  },
  profileInitial: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: "700",
  },

  // Church Card
  churchCard: {
    backgroundColor: "rgba(254, 243, 199, 0.08)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.12)",
  },

  // Church Card Header
  churchCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  churchName: {
    fontSize: 20,
    color: theme.textWhite,
    fontWeight: "700",
    letterSpacing: -0.5,
    flex: 1,
    marginRight: 12,
  },
  tabletChurchName: {
    fontSize: 24,
  },

  // Verified Badge
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  verifiedText: {
    color: theme.success,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },

  // Church Details
  churchDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(254, 243, 199, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailText: {
    color: theme.textLight,
    fontSize: 14,
    fontWeight: "400",
    flex: 1,
  },

  // Quick Stats
  quickStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(254, 243, 199, 0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.12)",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(254, 243, 199, 0.1)",
  },
});
