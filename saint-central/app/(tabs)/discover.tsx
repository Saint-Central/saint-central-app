import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
  Animated,
  ImageBackground,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import theme from "@/theme";
import { BlurView } from "expo-blur";

// Mapping gradients to category icons using theme colors
const gradientMap: Record<string, { start: string; end: string }> = {
  "praying-hands": { start: theme.primary, end: theme.secondary },
  users: { start: theme.tertiary, end: theme.accent2 },
  "book-open": { start: theme.accent3, end: theme.accent1 },
  church: { start: theme.accent4, end: theme.accent2 },
};

interface Category {
  id: number;
  title: string;
  icon: "praying-hands" | "users" | "book-open" | "church";
  description: string;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const categories: Category[] = [
    {
      id: 1,
      title: "Faith",
      icon: "praying-hands",
      description: "Explore resources to grow in your spiritual journey",
    },
    {
      id: 2,
      title: "Women's Ministry",
      icon: "users",
      description: "Connect with our community of women supporting each other",
    },
    {
      id: 3,
      title: "Culture & Testimonies",
      icon: "book-open",
      description: "Read inspiring stories and cultural perspectives",
    },
    {
      id: 4,
      title: "News",
      icon: "church",
      description: "Stay updated with the latest events and announcements",
    },
  ];

  // Floating header for when user scrolls
  const FloatingHeader = () => (
    <Animated.View
      style={[
        styles.floatingHeader,
        {
          opacity: headerOpacity,
          transform: [
            {
              translateY: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
          paddingTop: insets.top,
        },
      ]}
    >
      <BlurView intensity={85} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.floatingHeaderContent}>
        <Text style={styles.floatingHeaderTitle}>Discover</Text>
      </View>
    </Animated.View>
  );

  // Category card component with press animations
  const CategoryCard = ({ category }: { category: Category }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scale, {
        toValue: 0.97,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => {
            let path;
            if (category.title === "Women's Ministry") {
              path = "/womens-ministry";
            } else if (category.title === "Culture & Testimonies") {
              path = "/culture-and-testimonies";
            } else {
              path = `/${category.title.replace(/\s+/g, "-").toLowerCase()}`;
            }
            router.push(path as any);
          }}
        >
          <LinearGradient
            colors={[theme.neutral50, theme.neutral100]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={[gradientMap[category.icon].start, gradientMap[category.icon].end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <FontAwesome5 name={category.icon} size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{category.title}</Text>
                <Text style={styles.cardDescription}>{category.description}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.exploreText}>Explore</Text>
              <View style={styles.arrowContainer}>
                <FontAwesome5 name="arrow-right" size={14} color="#FFFFFF" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Event card component
  const EventCard = () => (
    <TouchableOpacity
      style={styles.eventCard}
      activeOpacity={0.9}
      onPress={() => router.push("/events")}
    >
      <LinearGradient
        colors={[
          `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(
            theme.primary.substring(3, 5),
            16,
          )}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.05)`,
          `rgba(${parseInt(theme.secondary.substring(1, 3), 16)}, ${parseInt(
            theme.secondary.substring(3, 5),
            16,
          )}, ${parseInt(theme.secondary.substring(5, 7), 16)}, 0.1)`,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.eventCardGradient}
      >
        <View style={styles.eventIconContainer}>
          <LinearGradient
            colors={theme.gradientWarm}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.eventIconBackground}
          >
            <FontAwesome5 name="calendar-alt" size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>Upcoming Events</Text>
          <Text style={styles.eventDescription}>Explore what's happening in our community</Text>
          <View style={styles.eventFooter}>
            <LinearGradient
              colors={theme.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.eventButton}
            >
              <Text style={styles.eventButtonText}>View All</Text>
              <FontAwesome5
                name="arrow-right"
                size={12}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Background header image that extends to edges */}
      <ImageBackground
        source={require("../../assets/images/jesus_on_cross.png")}
        style={[styles.header, { paddingTop: insets.top }]}
        resizeMode="cover"
        imageStyle={{ opacity: 0.75 }}
      >
        <LinearGradient
          colors={["rgba(45, 36, 31, 0.65)", "rgba(45, 36, 31, 0.1)"]}
          style={styles.headerOverlay}
        />
        <Animated.View
          style={[
            styles.headerContent,
            {
              marginTop: insets.top,
              opacity: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, -50],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>
            Explore resources and connect with our community
          </Text>
        </Animated.View>
      </ImageBackground>

      {/* Floating header that appears when scrolling */}
      <FloatingHeader />

      {/* Main scrollable content */}
      <SafeAreaView style={styles.safeAreaContainer} edges={["right", "left", "bottom"]}>
        <Animated.ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: 290 }]}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
        >
          {/* Main Content Container */}
          <View style={styles.mainContent}>
            {/* Upcoming Events Card */}
            <EventCard />

            {/* Section Title */}
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionTitleAccent} />
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>

            {/* Category Cards */}
            <View style={styles.cardsContainer}>
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </View>

            {/* Extra bottom spacing */}
            <View style={styles.navBarSpacer} />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  safeAreaContainer: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    marginTop: 0,
    paddingHorizontal: theme.spacingL,
    borderTopLeftRadius: theme.radiusLarge,
    borderTopRightRadius: theme.radiusLarge,
    backgroundColor: theme.pageBg,
    paddingTop: theme.spacingXL,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: `rgba(${parseInt(theme.divider.substring(1, 3), 16)}, ${parseInt(
      theme.divider.substring(3, 5),
      16,
    )}, ${parseInt(theme.divider.substring(5, 7), 16)}, 0.5)`,
  },
  floatingHeaderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  floatingHeaderTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 320,
    justifyContent: "flex-end",
    backgroundColor: theme.neutral200,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    paddingHorizontal: theme.spacingXL,
    paddingBottom: theme.spacing4XL,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: theme.fontBold,
    color: "#fff",
    marginBottom: theme.spacingS,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  eventCard: {
    marginBottom: theme.spacingXL,
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    ...theme.shadowMedium,
  },
  eventCardGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  eventIconContainer: {
    marginBottom: theme.spacingM,
  },
  eventIconBackground: {
    width: 48,
    height: 48,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  eventContent: {},
  eventTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: theme.spacingXS,
  },
  eventDescription: {
    fontSize: 15,
    color: theme.textMedium,
    marginBottom: theme.spacingL,
  },
  eventFooter: {
    alignItems: "flex-start",
  },
  eventButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacingS,
    paddingHorizontal: theme.spacingM,
    borderRadius: theme.radiusFull,
  },
  eventButtonText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
    fontSize: 14,
  },
  buttonIcon: {
    marginLeft: theme.spacingS,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingL,
  },
  sectionTitleAccent: {
    width: 4,
    height: 20,
    backgroundColor: theme.primary,
    borderRadius: 2,
    marginRight: theme.spacingS,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
  },
  cardsContainer: {
    marginBottom: theme.spacingXL,
    gap: theme.spacingL,
  },
  cardWrapper: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    ...theme.shadowLight,
  },
  card: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
  },
  cardGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: theme.spacingM,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
    marginBottom: theme.spacingXS,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.textMedium,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: theme.spacingS,
  },
  exploreText: {
    fontSize: 14,
    fontWeight: theme.fontMedium,
    color: theme.primary,
    marginRight: theme.spacingS,
  },
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  navBarSpacer: {
    height: 100,
  },
});
