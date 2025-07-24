import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import theme from "@/theme";
import { BlurView } from "expo-blur";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Quick action data - more compact
const quickActions = [
  {
    id: 1,
    icon: "pray",
    iconSet: "FontAwesome5",
    title: "Prayer",
    gradient: ["#9333EA", "#7C3AED"],
  },
  {
    id: 2,
    icon: "calendar-check",
    iconSet: "FontAwesome5",
    title: "Events",
    gradient: ["#EC4899", "#DB2777"],
  },
  {
    id: 3,
    icon: "heart",
    iconSet: "FontAwesome5",
    title: "Donate",
    gradient: ["#10B981", "#059669"],
  },
  {
    id: 4,
    icon: "users",
    iconSet: "FontAwesome5",
    title: "Social",
    gradient: ["#F59E0B", "#EA580C"],
  },
];

// Featured content
const featuredContent = {
  title: "Easter Celebration",
  subtitle: "Join us for a special service",
  date: "April 9, 2024",
  image: require("../../assets/images/riverside.png"),
  gradient: ["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"] as [string, string],
};

// Service times
const serviceTimes = [
  { day: "SUN", time: "9:00 AM", type: "Traditional", active: true },
  { day: "SUN", time: "11:00 AM", type: "Contemporary", active: true },
  { day: "WED", time: "7:00 PM", type: "Bible Study", active: false },
  { day: "FRI", time: "6:00 PM", type: "Youth Group", active: false },
];

// Categories with updated design
const categories = [
  {
    id: 1,
    title: "Faith",
    icon: "book-cross",
    iconSet: "MaterialCommunityIcons",
    description: "Daily devotionals and Bible reading plans",
    color: "#7C3AED",
    route: "/faith",
    badge: "New",
  },
  {
    id: 2,
    title: "Women's Ministry",
    icon: "flower-tulip-outline",
    iconSet: "MaterialCommunityIcons",
    description: "Fellowship and growth opportunities",
    color: "#DB2777",
    route: "/womens-ministry",
  },
  {
    id: 3,
    title: "Culture & Testimonies",
    icon: "comment-quote-outline",
    iconSet: "MaterialCommunityIcons",
    description: "Testimonies of faith and transformation",
    color: "#0891B2",
    route: "/culture-and-testimonies",
  },
  {
    id: 4,
    title: "News",
    icon: "newspaper-variant-outline",
    iconSet: "MaterialCommunityIcons",
    description: "Latest updates and announcements",
    color: "#EA580C",
    route: "/news",
  },
];

// Share Story Section Component
const ShareStorySection = () => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay: 800, // Delay to appear after other animations
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.shareStorySection,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.shareStoryButton}
        activeOpacity={0.8}
        onPress={() => router.push("/posts" as any)}
      >
        <LinearGradient
          colors={["#9333EA", "#7C3AED"]}
          style={styles.shareStoryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.shareStoryContent}>
            <View style={styles.shareStoryIcon}>
              <FontAwesome5 name="plus" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.shareStoryText}>
              <Text style={styles.shareStoryTitle}>Share Your Story</Text>
              <Text style={styles.shareStorySubtitle}>Inspire others with your faith journey</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Quick Action Button
const QuickActionButton = ({ action, index }: { action: any; index: number }) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const IconComponent = action.iconSet === "FontAwesome5" ? FontAwesome5 : MaterialCommunityIcons;

  const handlePress = () => {
    switch (action.title) {
      case "Prayer":
        router.push("/PrayerIntentions" as any);
        break;
      case "Events":
        router.push("/events" as any);
        break;
      case "Donate":
        router.push("/donate" as any);
        break;
      case "Social":
        router.push("/community" as any);
        break;
      default:
        break;
    }
  };

  return (
    <Animated.View
      style={[
        styles.quickActionContainer,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
        <LinearGradient
          colors={action.gradient}
          style={styles.quickActionButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <IconComponent name={action.icon} size={24} color="#FFFFFF" />
          <Text style={styles.quickActionTitle}>{action.title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Featured Section
const FeaturedSection = () => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featuredSection,
        {
          opacity: fadeIn,
          transform: [{ translateY: slideIn }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.featuredCard}
        activeOpacity={0.9}
        onPress={() => router.push("/events")}
      >
        <ImageBackground
          source={featuredContent.image}
          style={styles.featuredImage}
          imageStyle={styles.featuredImageStyle}
        >
          <LinearGradient colors={featuredContent.gradient} style={styles.featuredOverlay}>
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>FEATURED EVENT</Text>
            </View>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle}>{featuredContent.title}</Text>
              <Text style={styles.featuredSubtitle}>{featuredContent.subtitle}</Text>
              <View style={styles.featuredDate}>
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                <Text style={styles.featuredDateText}>{featuredContent.date}</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Service Time Card
const ServiceTimeCard = ({ service, index }: { service: any; index: number }) => {
  const translateX = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 600,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateX }],
      }}
    >
      <TouchableOpacity
        style={[styles.serviceCard, service.active && styles.serviceCardActive]}
        activeOpacity={0.7}
      >
        <View style={styles.serviceDay}>
          <Text style={[styles.serviceDayText, service.active && styles.serviceDayTextActive]}>
            {service.day}
          </Text>
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTime}>{service.time}</Text>
          <Text style={styles.serviceType}>{service.type}</Text>
        </View>
        {service.active && (
          <View style={styles.serviceLive}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>TODAY</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Category Card with new design
const CategoryCard = ({ category, index }: { category: any; index: number }) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        delay: 600 + index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: 600 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const IconComponent =
    category.iconSet === "MaterialCommunityIcons" ? MaterialCommunityIcons : FontAwesome5;

  return (
    <Animated.View
      style={[
        styles.categoryCardWrapper,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.categoryCard}
        activeOpacity={0.8}
        onPress={() => router.push(category.route as any)}
      >
        <LinearGradient
          colors={[`${category.color}08`, `${category.color}03`]}
          style={styles.categoryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
            <IconComponent name={category.icon} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.categoryContent}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              {category.badge && (
                <View style={[styles.categoryBadge, { backgroundColor: category.color }]}>
                  <Text style={styles.categoryBadgeText}>{category.badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.categoryDescription}>{category.description}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DiscoverScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Sticky Header - Safe Area Background */}
      <View style={[styles.stickyHeader, { height: insets.top }]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Safe Area Spacing */}
        <View style={{ height: insets.top }} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.headerTitle}>Discover Your Faith</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          {quickActions.map((action, index) => (
            <QuickActionButton key={action.id} action={action} index={index} />
          ))}
        </View>

        {/* Featured Event */}
        <FeaturedSection />

        {/* Service Times */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Times</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesList}
          >
            {serviceTimes.map((service, index) => (
              <ServiceTimeCard key={index} service={service} index={index} />
            ))}
          </ScrollView>
        </View>

        {/* Divider with Cross */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <MaterialCommunityIcons
            name="cross"
            size={24}
            color={theme.textLight}
            style={styles.dividerIcon}
          />
          <View style={styles.dividerLine} />
        </View>

        {/* Share Your Story Section */}
        <ShareStorySection />

        {/* Explore Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore More</Text>
          </View>
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} />
            ))}
          </View>
        </View>

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <MaterialCommunityIcons name="format-quote-open" size={28} color={theme.primary} />
          <Text style={styles.quoteText}>
            "For I know the plans I have for you, declares the Lord, plans to prosper you and not to
            harm you, plans to give you hope and a future."
          </Text>
          <Text style={styles.quoteAttribution}>Jeremiah 29:11</Text>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Sticky Header - Safe Area Background
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: theme.pageBg,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: theme.primary,
    marginBottom: 4,
    fontWeight: theme.fontMedium,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    letterSpacing: -0.5,
  },

  // Quick Actions
  quickActionsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  quickActionContainer: {
    flex: 1,
  },
  quickActionButton: {
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: theme.fontSemiBold,
    color: "#FFFFFF",
  },

  // Featured Section
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  featuredCard: {
    borderRadius: 24,
    overflow: "hidden",
    height: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredImageStyle: {
    borderRadius: 24,
  },
  featuredOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: theme.fontBold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  featuredContent: {
    gap: 8,
  },
  featuredTitle: {
    fontSize: 28,
    fontWeight: theme.fontBold,
    color: "#FFFFFF",
  },
  featuredSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
  },
  featuredDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  featuredDateText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },

  // Service Times
  servicesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  serviceCardActive: {
    borderColor: theme.primary,
    borderWidth: 2,
  },
  serviceDay: {
    marginBottom: 8,
  },
  serviceDayText: {
    fontSize: 12,
    fontWeight: theme.fontBold,
    color: theme.textLight,
    letterSpacing: 1,
  },
  serviceDayTextActive: {
    color: theme.primary,
  },
  serviceInfo: {
    gap: 2,
  },
  serviceTime: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  serviceType: {
    fontSize: 13,
    color: theme.textLight,
  },
  serviceLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveText: {
    fontSize: 11,
    fontWeight: theme.fontBold,
    color: "#10B981",
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  sectionLink: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: theme.fontMedium,
  },

  // Categories
  categoriesGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCardWrapper: {
    width: "100%",
  },
  categoryCard: {
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  categoryGradient: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: 20,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryContent: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: theme.fontBold,
    color: "#FFFFFF",
  },
  categoryDescription: {
    fontSize: 14,
    color: theme.textLight,
    lineHeight: 20,
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
    marginVertical: 40,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.divider,
  },
  dividerIcon: {
    marginHorizontal: 20,
  },

  // Quote
  quoteContainer: {
    paddingHorizontal: 40,
    alignItems: "center",
    marginBottom: 32,
  },
  quoteText: {
    fontSize: 18,
    color: theme.textLight,
    textAlign: "center",
    lineHeight: 28,
    marginVertical: 16,
    fontStyle: "italic",
  },
  quoteAttribution: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: theme.fontSemiBold,
  },

  // Share Story Section
  shareStorySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  shareStoryButton: {
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  shareStoryGradient: {
    padding: 20,
  },
  shareStoryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  shareStoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareStoryText: {
    flex: 1,
  },
  shareStoryTitle: {
    fontSize: 18,
    fontWeight: theme.fontSemiBold,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  shareStorySubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },

  // Bottom
  bottomSpacer: {
    height: 100,
  },
});