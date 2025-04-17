import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  useDerivedValue,
} from "react-native-reanimated";
import { Church, ChurchMember } from "@/types/church";
import ChurchPageContent from "@/components/church/ChurchPageContent";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import theme from "@/theme";
import { supabase } from "../../supabaseClient"; // Import the Supabase client
import { useNavigation } from "@react-navigation/native"; // Import navigation hook

// Define interfaces for our database models
interface Ministry {
  id: number;
  image_url: string;
  church_id: number;
  name: string;
  description: string;
  created_at: string;
  is_system_generated: boolean;
}

interface ChurchEvent {
  id: number;
  time: string;
  created_by: string;
  title: string;
  image_url: string;
  excerpt: string;
  video_link: string | null;
  author_name: string;
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_days_of_week: number[] | null;
  church_id: number;
  event_location: string;
}

type Props = {
  church: Church;
  userData: { username: string; profileImage: string };
  member?: ChurchMember | null;
};

const TABS = ["Home", "Events", "Ministries", "Community"];

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function ChurchPage({ church, member, userData }: Props) {
  const navigation = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  // Add state for events and ministries
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState<boolean>(false);
  const [isMinistriesLoading, setIsMinistriesLoading] = useState<boolean>(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [ministriesError, setMinistriesError] = useState<string | null>(null);

  // Get screen dimensions for responsiveness
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH > 768;

  // Shared values for animations
  const scrollY = useSharedValue(0);
  const sidebarAnim = useSharedValue(0);
  const appearAnim = useSharedValue(0);

  // Page tab animations
  const tabAnimations = useRef(TABS.map(() => useSharedValue(0))).current;
  const tabScrollX = useSharedValue(0);

  // Fetch events and ministries on mount
  useEffect(() => {
    if (church?.id) {
      fetchEvents();
      fetchMinistries();
    }
  }, [church?.id]);

  // Function to fetch events from Supabase - MODIFIED to load all events
  const fetchEvents = async () => {
    if (!church?.id) return;

    try {
      setIsEventsLoading(true);
      setEventsError(null);

      // Modified query to load all events without date filtering
      const { data, error } = await supabase
        .from("church_events")
        .select("*")
        .eq("church_id", church.id)
        .order("time", { ascending: true });

      if (error) {
        throw error;
      }

      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEventsError("Failed to load events. Please try again later.");
    } finally {
      setIsEventsLoading(false);
    }
  };

  // Function to fetch ministries from Supabase
  const fetchMinistries = async () => {
    if (!church?.id) return;

    try {
      setIsMinistriesLoading(true);
      setMinistriesError(null);

      // Use Supabase client to fetch ministries
      const { data, error } = await supabase
        .from("ministries")
        .select("*")
        .eq("church_id", church.id)
        .order("name");

      if (error) {
        throw error;
      }

      setMinistries(data || []);
    } catch (error) {
      console.error("Error fetching ministries:", error);
      setMinistriesError("Failed to load ministries. Please try again later.");
    } finally {
      setIsMinistriesLoading(false);
    }
  };

  // Animate page elements on mount
  useEffect(() => {
    // Initial animation sequence using Reanimated 3
    appearAnim.value = withSpring(1, {
      damping: 20,
      stiffness: 300,
      mass: 1,
    });

    // Animate tabs with staggered delay
    tabAnimations.forEach((anim, index) => {
      anim.value = withDelay(
        50 * index,
        withSpring(1, {
          damping: 24,
          stiffness: 250,
          mass: 1,
        }),
      );
    });
  }, []);

  // Handle sidebar animation
  useEffect(() => {
    sidebarAnim.value = withTiming(sidebarOpen ? 1 : 0, { duration: 200 });
  }, [sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Scroll event handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animated styles for header
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 50], [0, 1], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [0, 50], [0.96, 1], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Content animations when sidebar is open
  const contentAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      sidebarAnim.value,
      [0, 1],
      [0, SCREEN_WIDTH * (isTablet ? 0.4 : 0.55)],
    );

    const scale = interpolate(sidebarAnim.value, [0, 1], [1, isTablet ? 0.95 : 0.88]);
    const borderRadius = interpolate(sidebarAnim.value, [0, 1], [0, theme.radiusXL]);

    return {
      opacity: appearAnim.value,
      transform: [{ translateX }, { scale }],
      borderRadius,
    };
  });

  // Overlay animation
  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(sidebarAnim.value, [0, 1], [0, 0.6]),
    };
  });

  // Tab handling
  const handleTabPress = (tabIndex: number) => {
    setActiveTab(TABS[tabIndex]);

    // Animate the pressed tab with sequence
    tabAnimations[tabIndex].value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, {
        damping: 10,
        stiffness: 300,
        mass: 1,
      }),
    );
  };

  // Generate tab indicator position
  const tabIndicatorPosition = useDerivedValue(() => {
    return interpolate(
      tabScrollX.value,
      TABS.map((_, i) => i * SCREEN_WIDTH),
      TABS.map((_, i) => i * (SCREEN_WIDTH / TABS.length)),
      Extrapolate.CLAMP,
    );
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Component for Event Card - IMPROVED STYLING
  const EventCard = ({ event }: { event: ChurchEvent }) => {
    const navigateToEventDetails = () => {
      // @ts-ignore - Ignoring type checking for navigation
      navigation.navigate("church_events", {
        eventId: event.id,
        churchId: church.id,
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={navigateToEventDetails}
        style={[styles.eventCard, isTablet && styles.tabletEventCard]}
      >
        {event.image_url && (
          <Image
            source={{ uri: event.image_url }}
            style={isTablet ? styles.tabletEventImage : styles.eventImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.eventDetails}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.eventTimeContainer}>
            <Ionicons name="calendar" size={16} color={theme.primary} />
            <Text style={styles.eventTime}>
              {formatDate(event.time)} at {formatTime(event.time)}
            </Text>
          </View>
          {event.event_location && (
            <View style={styles.eventLocationContainer}>
              <Ionicons name="location" size={16} color={theme.textMedium} />
              <Text style={styles.eventLocation}>{event.event_location}</Text>
            </View>
          )}
          {event.excerpt && (
            <Text style={styles.eventExcerpt} numberOfLines={3}>
              {event.excerpt}
            </Text>
          )}
          {event.is_recurring && (
            <View style={styles.recurringBadge}>
              <Ionicons name="repeat" size={12} color="#FFFFFF" />
              <Text style={styles.recurringText}>Recurring</Text>
            </View>
          )}
          <TouchableOpacity style={styles.viewDetailsButton} onPress={navigateToEventDetails}>
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Component for Ministry Card - IMPROVED STYLING & MODIFIED NAVIGATION
  const MinistryCard = ({ ministry }: { ministry: Ministry }) => {
    const navigateToJoinMinistry = () => {
      // MODIFIED: Navigate to JoinMinistryScreen instead of MinistriesScreen
      // Pass id instead of ministryId to match what JoinMinistryScreen expects
      // @ts-ignore - Ignoring type checking for navigation
      navigation.navigate("JoinMinistryScreen", {
        id: ministry.id,
        churchId: church.id,
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={navigateToJoinMinistry}
        style={[styles.ministryCard, isTablet && styles.tabletMinistryCard]}
      >
        {ministry.image_url && (
          <Image
            source={{ uri: ministry.image_url }}
            style={isTablet ? styles.tabletMinistryImage : styles.ministryImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.ministryDetails}>
          <Text style={styles.ministryTitle}>{ministry.name}</Text>
          {ministry.description && (
            <Text style={styles.ministryDescription} numberOfLines={3}>
              {ministry.description}
            </Text>
          )}
          <TouchableOpacity style={styles.joinButton} onPress={navigateToJoinMinistry}>
            <Text style={styles.joinButtonText}>Join Ministry</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Events Tab Content
  const EventsTab = () => {
    if (isEventsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      );
    }

    if (eventsError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{eventsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchEvents}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (events.length === 0) {
      return (
        <View style={styles.comingSoonContainer}>
          <FontAwesome5 name="calendar-alt" size={42} color={theme.primary} />
          <Text style={styles.comingSoonTitle}>No Events Found</Text>
          <Text style={styles.comingSoonText}>
            There are no upcoming events scheduled at this time.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.eventsContainer}>
        <Text style={styles.sectionTitle}>All Events</Text>
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </View>
    );
  };

  // Ministries Tab Content
  const MinistriesTab = () => {
    if (isMinistriesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading ministries...</Text>
        </View>
      );
    }

    if (ministriesError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{ministriesError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMinistries}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (ministries.length === 0) {
      return (
        <View style={styles.comingSoonContainer}>
          <FontAwesome5 name="church" size={42} color={theme.primary} />
          <Text style={styles.comingSoonTitle}>No Ministries Found</Text>
          <Text style={styles.comingSoonText}>There are no ministries available at this time.</Text>
        </View>
      );
    }

    return (
      <View style={styles.ministriesContainer}>
        <Text style={styles.sectionTitle}>Our Ministries</Text>
        {ministries.map((ministry) => (
          <MinistryCard key={ministry.id} ministry={ministry} />
        ))}
      </View>
    );
  };

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
          <Animated.View style={[styles.overlay, overlayAnimatedStyle]} />
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
      <Animated.View style={[styles.mainContainer, contentAnimatedStyle]}>
        {/* Floating header */}
        <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
          <View style={styles.headerContent}>
            <View style={styles.headerSpacer} />

            <Text style={styles.headerTitle} numberOfLines={1}>
              {church.name}
            </Text>

            <View style={styles.headerSpacer} />
          </View>
        </Animated.View>

        {/* Page content */}
        <AnimatedScrollView
          style={{ flex: 1, backgroundColor: "#FFFFFF" }}
          contentContainerStyle={[
            styles.scrollViewContent,
            isTablet && styles.tabletScrollViewContent,
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
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
                  style={useAnimatedStyle(() => ({
                    transform: [{ scale: tabAnimations[index].value }],
                  }))}
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

            {activeTab === "Events" && <EventsTab />}

            {activeTab === "Ministries" && <MinistriesTab />}

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
        </AnimatedScrollView>
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
  // Styles for Events and Ministries - IMPROVED
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacingXL,
    marginTop: theme.spacing2XL,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: theme.fontMedium,
    color: theme.textMedium,
    marginTop: theme.spacingM,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacingXL,
    marginTop: theme.spacing2XL,
  },
  errorText: {
    fontSize: 16,
    fontWeight: theme.fontMedium,
    color: theme.textError,
    textAlign: "center",
    marginBottom: theme.spacingL,
  },
  retryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
    borderRadius: theme.radiusL,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: theme.spacingL,
  },
  eventsContainer: {
    paddingVertical: theme.spacingL,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radiusL,
    marginBottom: theme.spacingL,
    overflow: "hidden",
    ...theme.shadowMedium,
    borderWidth: 1,
    borderColor: theme.neutral200,
  },
  eventImage: {
    height: 200,
    width: "100%",
  },
  tabletEventCard: {
    flexDirection: "row",
    height: 200,
  },
  tabletEventImage: {
    width: 280,
    height: "100%",
  },
  eventDetails: {
    padding: theme.spacingL,
    flex: 1,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: theme.spacingM,
    lineHeight: 26,
  },
  eventTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingM,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: theme.fontMedium,
    color: theme.primary,
    marginLeft: 6,
  },
  eventLocationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingM,
  },
  eventLocation: {
    fontSize: 14,
    color: theme.textMedium,
    marginLeft: 6,
  },
  eventExcerpt: {
    fontSize: 14,
    color: theme.textMedium,
    lineHeight: 20,
    marginBottom: theme.spacingM,
  },
  recurringBadge: {
    position: "absolute",
    top: theme.spacingM,
    right: theme.spacingM,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusL,
    paddingHorizontal: theme.spacingS,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  recurringText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: theme.fontSemiBold,
    marginLeft: 4,
  },
  viewDetailsButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingS,
    borderRadius: theme.radiusL,
    alignSelf: "flex-start",
    marginTop: theme.spacingS,
  },
  viewDetailsText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
    fontSize: 12,
  },
  ministriesContainer: {
    paddingVertical: theme.spacingL,
  },
  ministryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radiusL,
    marginBottom: theme.spacingL,
    overflow: "hidden",
    ...theme.shadowMedium,
    borderWidth: 1,
    borderColor: theme.neutral200,
  },
  tabletMinistryCard: {
    flexDirection: "row",
    height: 180,
  },
  ministryImage: {
    height: 160,
    width: "100%",
  },
  tabletMinistryImage: {
    width: 240,
    height: "100%",
  },
  ministryDetails: {
    padding: theme.spacingL,
    flex: 1,
  },
  ministryTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: theme.spacingS,
  },
  ministryDescription: {
    fontSize: 14,
    color: theme.textMedium,
    lineHeight: 20,
    marginBottom: theme.spacingM,
  },
  joinButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingS,
    borderRadius: theme.radiusL,
    alignSelf: "flex-start",
    marginTop: theme.spacingS,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
    fontSize: 12,
  },
});
