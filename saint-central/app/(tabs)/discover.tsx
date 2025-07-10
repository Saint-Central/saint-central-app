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

// Navigation button data
const navigationButtons = [
  {
    id: 1,
    icon: "praying-hands",
    title: "Rosary",
    subtitle: "Join in prayer",
    gradientColors: theme.gradientPrimary,
    route: "/rosary",
  },
  {
    id: 2,
    icon: "calendar-alt",
    title: "Calendar",
    subtitle: "Events & schedule",
    gradientColors: theme.gradientInfo,
    route: "/events",
  },
  {
    id: 3,
    icon: "heart",
    title: "Donations",
    subtitle: "Support our mission",
    gradientColors: theme.gradientSecondary,
    route: "/donate",
  },
  {
    id: 4,
    icon: "users",
    title: "Social",
    subtitle: "Connect with others",
    gradientColors: theme.gradientSuccess,
    route: "/social",
  },
];

// Category data
const categories = [
  {
    id: 1,
    title: "Faith",
    icon: "praying-hands",
    description: "Explore resources to grow in your spiritual journey",
    route: "/faith",
  },
  {
    id: 2,
    title: "Women's Ministry",
    icon: "users",
    description: "Connect with our community of women supporting each other",
    route: "/womens-ministry",
  },
  {
    id: 3,
    title: "Culture & Testimonies",
    icon: "book-open",
    description: "Read inspiring stories and cultural perspectives",
    route: "/culture-and-testimonies",
  },
  {
    id: 4,
    title: "News",
    icon: "church",
    description: "Stay updated with the latest events and announcements",
    route: "/news",
  },
];

// Simple Navigation Button Component
const NavigationButton = ({ button, onPress }: { button: any; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Simplified gradient background colors
  const bgColor1 = button.gradientColors[0] + "20"; // 20% opacity
  const bgColor2 = button.gradientColors[1] + "10"; // 10% opacity

  return (
    <View style={styles.navButtonWrapper}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.navButton}
          activeOpacity={0.8}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
        >
          <LinearGradient colors={[bgColor1, bgColor2]} style={styles.navButtonGradient}>
            <LinearGradient colors={button.gradientColors} style={styles.navButtonIcon}>
              <FontAwesome5 name={button.icon} size={16} color={theme.textWhite} />
            </LinearGradient>
            <View style={styles.navButtonContent}>
              <Text style={styles.navButtonTitle} numberOfLines={1}>
                {button.title}
              </Text>
              <Text style={styles.navButtonSubtitle} numberOfLines={2}>
                {button.subtitle}
              </Text>
            </View>
            <View style={styles.navButtonArrow}>
              <FontAwesome5 name="chevron-right" size={10} color={button.gradientColors[0]} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Category Card Component
const CategoryCard = ({ category, onPress }: { category: any; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const gradientMap: Record<string, string[]> = {
    "praying-hands": theme.gradientPrimary,
    users: theme.gradientSuccess,
    "book-open": theme.gradientInfo,
    church: theme.gradientSecondary,
  };

  return (
    <Animated.View style={[styles.categoryCardWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.categoryCard}
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <LinearGradient
          colors={[
            theme.cardBg,
            `rgba(${parseInt(theme.neutral700.substring(1, 3), 16)}, ${parseInt(theme.neutral700.substring(3, 5), 16)}, ${parseInt(theme.neutral700.substring(5, 7), 16)}, 0.3)`,
          ]}
          style={styles.categoryCardGradient}
        >
          <View style={styles.categoryCardHeader}>
            <LinearGradient
              colors={gradientMap[category.icon] || theme.gradientPrimary}
              style={styles.categoryIcon}
            >
              <FontAwesome5 name={category.icon} size={20} color={theme.textWhite} />
            </LinearGradient>
            <View style={styles.categoryCardContent}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
            </View>
          </View>
          <View style={styles.categoryCardFooter}>
            <Text style={styles.exploreText}>Explore</Text>
            <View style={styles.arrowContainer}>
              <FontAwesome5 name="arrow-right" size={12} color={theme.textWhite} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Featured Events Card
const FeaturedEventsCard = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity style={styles.featuredCard} activeOpacity={0.8} onPress={onPress}>
      <LinearGradient
        colors={[
          `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(theme.primary.substring(3, 5), 16)}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.1)`,
          `rgba(${parseInt(theme.accent1.substring(1, 3), 16)}, ${parseInt(theme.accent1.substring(3, 5), 16)}, ${parseInt(theme.accent1.substring(5, 7), 16)}, 0.05)`,
        ]}
        style={styles.featuredCardGradient}
      >
        <LinearGradient colors={theme.gradientWarm} style={styles.featuredIcon}>
          <FontAwesome5 name="star" size={22} color={theme.textWhite} />
        </LinearGradient>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle}>Community Events</Text>
          <Text style={styles.featuredDescription}>
            Discover amazing events, worship services, and community gatherings
          </Text>
          <LinearGradient colors={theme.gradientPrimary} style={styles.featuredButton}>
            <Text style={styles.featuredButtonText}>Explore Events</Text>
            <FontAwesome5 name="arrow-right" size={12} color={theme.textWhite} />
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

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

  // Floating header for when user scrolls
  const FloatingHeader = () => (
    <Animated.View
      style={[
        styles.floatingHeader,
        {
          opacity: headerOpacity,
          paddingTop: insets.top,
        },
      ]}
    >
      <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.floatingHeaderContent}>
        <Text style={styles.floatingHeaderTitle}>Discover Saint Central</Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Background header image */}
      <ImageBackground
        source={require("../../assets/images/riverside.png")}
        style={[styles.header, { paddingTop: insets.top }]}
        resizeMode="cover"
        imageStyle={{ opacity: 0.75 }}
      >
        <LinearGradient
          colors={["rgba(28, 25, 23, 0.7)", "rgba(28, 25, 23, 0.2)"]}
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
          <Text style={styles.headerTitle}>Discover Saint Central</Text>
          <Text style={styles.headerSubtitle}>
            Your gateway to faith, community, and spiritual growth
          </Text>
        </Animated.View>
      </ImageBackground>

      {/* Floating header */}
      <FloatingHeader />

      {/* Main scrollable content */}
      <SafeAreaView style={styles.safeAreaContainer} edges={["right", "left", "bottom"]}>
        <Animated.ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: 280 }]}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
        >
          <View style={styles.mainContent}>
            {/* Quick Access Navigation */}
            <View style={styles.quickAccessSection}>
              <View style={styles.sectionHeader}>
                <LinearGradient colors={theme.gradientWarm} style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Quick Access</Text>
                <Text style={styles.sectionSubtitle}>Your spiritual journey starts here</Text>
              </View>

              <View style={styles.navigationGrid}>
                {navigationButtons.map((button) => (
                  <NavigationButton
                    key={button.id}
                    button={button}
                    onPress={() => {
                      if (button.route === "/rosary") {
                        console.log("Navigate to Rosary");
                      } else {
                        router.push(button.route as any);
                      }
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Featured Events */}
            <FeaturedEventsCard onPress={() => router.push("/events")} />

            {/* Categories Section */}
            <View style={styles.categoriesSection}>
              <View style={styles.sectionHeader}>
                <LinearGradient colors={theme.gradientInfo} style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Explore Categories</Text>
                <Text style={styles.sectionSubtitle}>Discover content that inspires you</Text>
              </View>

              <View style={styles.categoriesGrid}>
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onPress={() => router.push(category.route as any)}
                  />
                ))}
              </View>
            </View>

            {/* Bottom spacing */}
            <View style={styles.bottomSpacer} />
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
    borderTopLeftRadius: theme.radiusXL,
    borderTopRightRadius: theme.radiusXL,
    backgroundColor: theme.pageBg,
    paddingTop: theme.spacingXL,
    paddingHorizontal: theme.spacingL,
  },

  // Header Styles
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingS,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.accent2,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Floating Header
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  floatingHeaderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: theme.spacingL,
  },
  floatingHeaderTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },

  // Section Styles
  sectionHeader: {
    alignItems: "center",
    marginBottom: theme.spacingXL,
  },
  sectionAccent: {
    width: 60,
    height: 4,
    borderRadius: theme.radiusFull,
    marginBottom: theme.spacingM,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingXS,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.textLight,
    textAlign: "center",
    lineHeight: 20,
  },

  // Quick Access Section
  quickAccessSection: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusXL,
    padding: theme.spacingXL,
    marginBottom: theme.spacing2XL,
    borderWidth: 1,
    borderColor: theme.divider,
    ...theme.shadowMedium,
  },
  navigationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: theme.spacingM,
  },

  // Navigation Button Styles
  navButtonWrapper: {
    width: "48%",
    marginBottom: theme.spacingM,
  },
  navButton: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    width: "100%",
  },
  navButtonGradient: {
    padding: theme.spacingM,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 75,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: theme.radiusLarge,
  },
  navButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingS,
    ...theme.shadowLight,
  },
  navButtonContent: {
    flex: 1,
    paddingRight: theme.spacingXS,
  },
  navButtonTitle: {
    fontSize: 14,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: 2,
  },
  navButtonSubtitle: {
    fontSize: 11,
    color: theme.textLight,
    lineHeight: 14,
  },
  navButtonArrow: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  // Featured Card Styles
  featuredCard: {
    borderRadius: theme.radiusXL,
    overflow: "hidden",
    marginBottom: theme.spacing2XL,
    ...theme.shadowMedium,
  },
  featuredCardGradient: {
    padding: theme.spacingXL,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: theme.radiusXL,
  },
  featuredIcon: {
    width: 60,
    height: 60,
    borderRadius: theme.radiusLarge,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingXL,
    ...theme.shadowMedium,
  },
  featuredContent: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingS,
  },
  featuredDescription: {
    fontSize: 14,
    color: theme.textLight,
    lineHeight: 20,
    marginBottom: theme.spacingL,
  },
  featuredButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: theme.spacingS,
    paddingHorizontal: theme.spacingL,
    borderRadius: theme.radiusFull,
    gap: theme.spacingS,
    ...theme.shadowLight,
  },
  featuredButtonText: {
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },

  // Categories Section
  categoriesSection: {
    marginBottom: theme.spacing2XL,
  },
  categoriesGrid: {
    gap: theme.spacingL,
  },

  // Category Card Styles
  categoryCardWrapper: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    ...theme.shadowLight,
  },
  categoryCard: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
  },
  categoryCardGradient: {
    padding: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: theme.radiusLarge,
  },
  categoryCardHeader: {
    flexDirection: "row",
    marginBottom: theme.spacingM,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
    ...theme.shadowLight,
  },
  categoryCardContent: {
    flex: 1,
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: theme.spacingXS,
  },
  categoryDescription: {
    fontSize: 13,
    color: theme.textLight,
    lineHeight: 18,
  },
  categoryCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
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

  // Spacing
  bottomSpacer: {
    height: 100,
  },
});
