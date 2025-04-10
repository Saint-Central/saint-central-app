import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  GestureResponderEvent,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Church } from "@/types/church";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import theme from "@/theme";
import { supabase } from "@/supabaseClient";

type Props = {
  church: Church;
  userData: { username: string; profileImage: string };
  onPressMenu: ((event: GestureResponderEvent) => void) | undefined;
};

export default function ChurchPageHeader({ church, userData, onPressMenu }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [memberCount, setMemberCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(12); // Default for now
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Fetch member count
  useEffect(() => {
    const fetchMemberCount = async () => {
      try {
        setIsLoading(true);
        const { count, error } = await supabase
          .from("church_members")
          .select("id", { count: "exact", head: true })
          .eq("church_id", church.id);

        if (error) {
          console.error("Error fetching member count:", error);
        } else {
          setMemberCount(count || 0);
        }
      } catch (error) {
        console.error("Error in fetching member count:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberCount();
  }, [church.id]);

  // Animation for component mount
  useEffect(() => {
    // Fast animation on mount
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 250,
        friction: 18,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 250,
        friction: 18,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        isTablet && styles.tabletContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Church name and location row */}
      <View style={[styles.titleRow, isTablet && styles.tabletTitleRow]}>
        <View style={styles.titleContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={[styles.churchName, isTablet && styles.tabletChurchName]} numberOfLines={2}>
            {church.name}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={theme.textMedium} />
            <Text style={styles.locationText} numberOfLines={1}>
              {church.address.split(",")[0]}
            </Text>
          </View>
        </View>

        {/* Profile button */}
        <TouchableOpacity
          onPress={() => router.navigate("/profile")}
          style={styles.profileButton}
          activeOpacity={0.8}
        >
          {userData.profileImage ? (
            <Image
              source={{ uri: userData.profileImage }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={theme.gradientPrimary}
              style={styles.profilePlaceholder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.profileInitial}>
                {userData.username ? userData.username[0].toUpperCase() : "?"}
              </Text>
            </LinearGradient>
          )}

          {/* Notification indicator */}
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      {/* Quick stats row */}
      <View style={[styles.statsContainer, isTablet && styles.tabletStatsContainer]}>
        <View style={styles.statItem}>
          <LinearGradient
            colors={theme.gradientInfo}
            style={styles.statIconBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="people" size={16} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.statValue}>{isLoading ? "..." : memberCount}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <LinearGradient
            colors={theme.gradientSuccess}
            style={styles.statIconBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="calendar" size={16} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.statValue}>{eventsCount}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <LinearGradient
            colors={theme.gradientWarm}
            style={styles.statIconBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="heart" size={16} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.statValue}>91%</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacingXL,
    paddingHorizontal: theme.spacingL,
    paddingTop: 0,
  },
  tabletContainer: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacingS,
  },
  tabletTitleRow: {
    paddingHorizontal: theme.spacingL,
  },
  titleContainer: {
    flex: 1,
    marginRight: theme.spacingL,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: theme.fontRegular,
    color: theme.textMedium,
    marginBottom: theme.spacingXS,
  },
  churchName: {
    fontSize: 28,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: theme.spacingS,
    letterSpacing: -0.5,
  },
  tabletChurchName: {
    fontSize: 32,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    fontWeight: theme.fontMedium,
    color: theme.textMedium,
    marginLeft: 4,
  },
  profileButton: {
    position: "relative",
    marginTop: theme.spacingXS,
  },
  profileImage: {
    width: 52,
    height: 52,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.neutral100,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profilePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: theme.radiusFull,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileInitial: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: theme.fontBold,
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.tertiary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacingXL,
    paddingHorizontal: theme.spacingM,
  },
  tabletStatsContainer: {
    maxWidth: 400,
    alignSelf: "center",
    marginTop: theme.spacing2XL,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statIconBackground: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusMedium,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacingS,
  },
  statValue: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: theme.fontRegular,
    color: theme.textMedium,
  },
});
