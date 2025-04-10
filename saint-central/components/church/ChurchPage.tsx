import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Church, ChurchMember } from "@/types/church";
import ChurchPageContent from "@/components/church/ChurchPageContent";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchProfileCard from "@/components/church/ChurchProfileCard";
import theme from "@/theme";

type Props = {
  church: Church;
  userData: { username: string; profileImage: string };
  member?: ChurchMember | null;
};

const TABS = ["Home", "Events", "Ministries", "Community"];

export default function ChurchPage({ church, member, userData }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  // Get screen dimensions for responsiveness
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH > 768;

  // Refs for animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const appearAnim = useRef(new Animated.Value(0)).current;

  // Page tab animations
  const tabAnimations = useRef(TABS.map(() => new Animated.Value(0))).current;
  const tabScrollX = useRef(new Animated.Value(0)).current;

  // Animate page elements on mount
  useEffect(() => {
    Animated.stagger(50, [
      Animated.spring(appearAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      ...tabAnimations.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 250,
          friction: 24,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }, []);

  // Handle sidebar animation
  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Animated values for header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0.96, 1],
    extrapolate: "clamp",
  });

  // Content animations when sidebar is open
  const contentTranslate = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * (isTablet ? 0.4 : 0.55)],
  });

  const contentScale = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isTablet ? 0.95 : 0.88],
  });

  const contentRadius = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, theme.radiusXL],
  });

  // Tab handling
  const handleTabPress = (tabIndex: number) => {
    setActiveTab(TABS[tabIndex]);

    // Animate the pressed tab
    Animated.sequence([
      Animated.timing(tabAnimations[tabIndex], {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(tabAnimations[tabIndex], {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Generate tab indicator position
  const tabIndicatorTranslate = useRef(
    tabScrollX.interpolate({
      inputRange: TABS.map((_, i) => i * SCREEN_WIDTH),
      outputRange: TABS.map((_, i) => i * (SCREEN_WIDTH / TABS.length)),
      extrapolate: "clamp",
    }),
  ).current;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent={false} backgroundColor="#FFFFFF" barStyle="dark-content" />

      <ChurchSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={userData.username}
        profileImage={userData.profileImage}
      />

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
        >
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: sidebarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.6],
                }),
              },
            ]}
          />
        </TouchableOpacity>
      )}

      {/* Fixed Header with Hamburger */}
      <View style={styles.fixedHeader}>
        <TouchableOpacity style={styles.fixedHeaderButton} onPress={toggleSidebar}>
          <Ionicons name="menu" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Main content with animations */}
      <View style={styles.overlayBackgroundFill} />
      <Animated.View
        style={[
          styles.mainContainer,
          {
            opacity: appearAnim,
            transform: [{ translateX: contentTranslate }, { scale: contentScale }],
            borderRadius: contentRadius,
          },
        ]}
      >
        {/* Floating header */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: headerOpacity,
              transform: [{ scale: headerScale }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerSpacer} />

            <Text style={styles.headerTitle} numberOfLines={1}>
              {church.name}
            </Text>

            <View style={styles.headerSpacer} />
          </View>
        </Animated.View>

        {/* Page content */}
        <Animated.ScrollView
          style={{ flex: 1, backgroundColor: "#FFFFFF" }}
          contentContainerStyle={[
            styles.scrollViewContent,
            isTablet && styles.tabletScrollViewContent,
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
        >
          {/* Church Page Header */}
          <ChurchPageHeader church={church} userData={userData} onPressMenu={toggleSidebar} />

          {/* Tabs navigation */}
          <View style={[styles.tabsContainer, isTablet && styles.tabletTabsContainer]}>
            {TABS.map((tab, index) => (
              <TouchableOpacity
                key={tab}
                style={styles.tabButton}
                onPress={() => handleTabPress(index)}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: tabAnimations[index] }],
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isTablet && styles.tabletTabText,
                      activeTab === tab && styles.activeTabText,
                    ]}
                  >
                    {tab}
                  </Text>
                </Animated.View>

                {activeTab === tab && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Dynamic content based on active tab */}
          <View style={[styles.tabContent, isTablet && styles.tabletTabContent]}>
            {activeTab === "Home" && (
              <ChurchPageContent church={church} member={member} userData={userData} />
            )}

            {activeTab === "Events" && (
              <View style={styles.comingSoonContainer}>
                <FontAwesome5 name="calendar-alt" size={42} color={theme.primary} />
                <Text style={styles.comingSoonTitle}>Events Coming Soon</Text>
                <Text style={styles.comingSoonText}>
                  Stay tuned for upcoming church events and activities
                </Text>
              </View>
            )}

            {activeTab === "Ministries" && (
              <View style={styles.comingSoonContainer}>
                <FontAwesome5 name="church" size={42} color={theme.primary} />
                <Text style={styles.comingSoonTitle}>Ministries Coming Soon</Text>
                <Text style={styles.comingSoonText}>
                  Information about our church ministries will be available soon
                </Text>
              </View>
            )}

            {activeTab === "Community" && (
              <View style={styles.comingSoonContainer}>
                <FontAwesome5 name="users" size={42} color={theme.primary} />
                <Text style={styles.comingSoonTitle}>Community Coming Soon</Text>
                <Text style={styles.comingSoonText}>
                  Connect with our community members and join discussions
                </Text>
              </View>
            )}
          </View>
        </Animated.ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  overlayBackgroundFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 48,
    backgroundColor: "#FFFFFF",
    zIndex: 99,
  },
  mainContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.neutral900,
    zIndex: 10,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 100,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 225, 0.3)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacingL,
    height: "100%",
    paddingTop: 4,
    paddingBottom: 6,
  },
  fixedHeader: {
    position: "absolute",
    top: 60,
    left: 0,
    paddingLeft: theme.spacingL,
    paddingTop: 0,
    zIndex: 101, // Higher than other headers
  },
  fixedHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.neutral100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.neutral200,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.neutral100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.neutral200,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
    maxWidth: "70%",
  },
  scrollViewContent: {
    paddingTop: 48,
    paddingBottom: 100,
  },
  tabletScrollViewContent: {
    paddingHorizontal: theme.spacing2XL,
    maxWidth: 1024,
    alignSelf: "center",
    width: "100%",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: theme.spacingL,
    marginTop: theme.spacingXL,
    marginBottom: theme.spacingM,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.neutral100,
    padding: 4,
    ...theme.shadowLight,
  },
  tabletTabsContainer: {
    marginHorizontal: 0,
    maxWidth: 500,
    alignSelf: "center",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: theme.fontMedium,
    color: theme.textMedium,
    textAlign: "center",
  },
  tabletTabText: {
    fontSize: 16,
  },
  activeTabText: {
    color: theme.primary,
    fontWeight: theme.fontSemiBold,
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: 20,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusFull,
    left: "50%",
    marginLeft: -10,
  },
  tabContent: {
    paddingHorizontal: theme.spacingL,
  },
  tabletTabContent: {
    paddingHorizontal: 0,
  },
  comingSoonContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacingXL,
    marginTop: theme.spacing2XL,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginTop: theme.spacingL,
    marginBottom: theme.spacingS,
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: theme.fontRegular,
    color: theme.textMedium,
    textAlign: "center",
    lineHeight: 24,
  },
});
