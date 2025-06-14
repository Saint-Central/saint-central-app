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
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import theme from "@/theme";
import { useCRUD } from "@/utils/crudClient";
import { useChurchContext } from "@/contexts/church";

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

  const [memberCount, setMemberCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { select } = useCRUD();

  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);

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

  // Animation for component mount
  useEffect(() => {
    // Fast animation on mount
    fadeAnim.value = withSpring(1, {
      damping: 18,
      stiffness: 250,
      mass: 1,
    });

    scaleAnim.value = withSpring(1, {
      damping: 18,
      stiffness: 250,
      mass: 1,
    });
  }, []);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ scale: scaleAnim.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, isTablet && styles.tabletContainer, animatedStyle]}>
      {/* Native iOS Header */}
      <View style={styles.nativeHeader}>
        {/* Top Status Row */}
        <View style={styles.topRow}>
          <View style={styles.greetingSection}>
            <Text style={styles.timeGreeting}>{getTimeGreeting()}</Text>
            <Text style={styles.userNameText}>{userData.username}</Text>
          </View>

          <View style={styles.topActions}>
            {/* Notification Bell */}
            <TouchableOpacity style={styles.notificationButton} activeOpacity={0.6}>
              <Ionicons name="notifications" size={22} color={theme.primary} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            {/* Profile Button */}
            <TouchableOpacity
              onPress={() => router.navigate("/profile")}
              style={styles.profileButton}
              activeOpacity={0.6}
            >
              {userData.profileImage ? (
                <Image
                  source={{ uri: userData.profileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>
                    {userData.username ? userData.username[0].toUpperCase() : "?"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Church Identity */}
        <View style={styles.churchIdentitySection}>
          {/* Church Image */}
          <View style={styles.churchImageContainer}>
            {church.image ? (
              <Image source={{ uri: church.image }} style={styles.churchImage} resizeMode="cover" />
            ) : (
              <View style={styles.churchImagePlaceholder}>
                <Ionicons name="church" size={64} color={theme.accent1} />
              </View>
            )}
          </View>

          {/* Church Info */}
          <View style={styles.churchInfo}>
            <Text style={[styles.churchName, isTablet && styles.tabletChurchName]}>
              {church.name}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={theme.textLight} />
              <Text style={styles.locationText}>{church.address.split(",")[0]}</Text>
            </View>
            <View style={styles.serviceTimeRow}>
              <Ionicons name="time" size={16} color={theme.accent2} />
              <Text style={styles.serviceTimeText}>Sunday 9:00 AM</Text>
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
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  tabletContainer: {
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
  },

  // Native iOS Header
  nativeHeader: {
    paddingHorizontal: theme.spacingL,
    paddingBottom: theme.spacingXL,
  },

  // Church Identity Section
  churchIdentitySection: {
    alignItems: "center",
    marginTop: theme.spacingL,
  },

  // Church Image Section
  churchImageContainer: {
    width: 160,
    height: 160,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: theme.spacingL,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 3,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  churchImage: {
    width: "100%",
    height: "100%",
  },
  churchImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },

  // Church Info Section
  churchInfo: {
    alignItems: "center",
    gap: theme.spacingXS,
  },

  // Top Row (Greeting + Actions)
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacingS,
  },
  greetingSection: {
    flex: 1,
  },
  timeGreeting: {
    fontSize: 15,
    color: theme.textLight,
    fontWeight: "400",
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 28,
    color: theme.textWhite,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacingM,
  },

  // Notification Button
  notificationButton: {
    position: "relative",
    padding: 4,
  },
  notificationDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    backgroundColor: theme.error,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.pageBg,
  },

  // Profile Button
  profileButton: {
    position: "relative",
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profilePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  profileInitial: {
    color: theme.textWhite,
    fontSize: 14,
    fontWeight: "600",
  },

  // Church Name
  churchName: {
    fontSize: 24,
    color: theme.textWhite,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 28,
    marginBottom: theme.spacingXS,
  },
  tabletChurchName: {
    fontSize: 28,
  },

  // Location Row
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  locationText: {
    color: theme.textLight,
    fontSize: 15,
    fontWeight: "400",
  },

  // Service Time Row
  serviceTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  serviceTimeText: {
    color: theme.accent2,
    fontSize: 15,
    fontWeight: "500",
  },
});
