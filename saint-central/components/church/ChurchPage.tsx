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
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
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
import { LinearGradient } from "expo-linear-gradient";
import { Church, ChurchMember } from "@/types/church";
import ChurchPageContent from "@/components/church/ChurchPageContent";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import theme from "@/theme";
import { supabase } from "../../supabaseClient";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";

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

// Spring animation config
const springConfig = {
  damping: 15,
  stiffness: 400,
  mass: 1,
  overshootClamping: false,
};

export default function ChurchPage({ church, member, userData }: Props) {
  const navigation = useNavigation();
  const router = useRouter();
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

  // Component for Event Card - MODERN DESIGN
  const EventCard = ({ event }: { event: ChurchEvent }) => {
    const pressAnim = useSharedValue(1);

    const handlePressIn = () => {
      pressAnim.value = withSpring(0.98, springConfig);
    };

    const handlePressOut = () => {
      pressAnim.value = withSpring(1, springConfig);
    };

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: pressAnim.value }],
      };
    });

    const navigateToEventDetails = () => {
      // Use Expo Router instead of React Navigation
      router.push({
        pathname: "/church_events",
        params: {
          id: event.id,
          churchId: church.id,
        },
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={navigateToEventDetails}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.eventCardWrapper}
      >
        <Animated.View
          style={[styles.eventCard, isTablet && styles.tabletEventCard, animatedStyle]}
        >
          <View style={styles.eventCardContent}>
            <View style={styles.eventImageContainer}>
              {event.image_url ? (
                <Image
                  source={{ uri: event.image_url }}
                  style={isTablet ? styles.tabletEventImage : styles.eventImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[theme.neutral100, theme.neutral200]}
                  style={isTablet ? styles.tabletEventImage : styles.eventImage}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <FontAwesome5 name="calendar-alt" size={28} color={theme.neutral400} />
                </LinearGradient>
              )}
            </View>

            <View style={styles.eventDetailsContainer}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.title}
                </Text>

                {event.is_recurring && (
                  <LinearGradient
                    colors={[theme.primary, theme.primary]}
                    style={styles.recurringBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="repeat" size={12} color="#FFFFFF" />
                    <Text style={styles.recurringText}>Recurring</Text>
                  </LinearGradient>
                )}
              </View>

              <View style={styles.eventMetaContainer}>
                <View style={styles.eventMetaItem}>
                  <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                  <Text style={styles.eventMetaText}>{formatDate(event.time)}</Text>
                </View>

                <View style={styles.eventMetaItem}>
                  <Ionicons name="time-outline" size={16} color={theme.primary} />
                  <Text style={styles.eventMetaText}>{formatTime(event.time)}</Text>
                </View>
              </View>

              {event.event_location && (
                <View style={styles.eventLocationContainer}>
                  <Ionicons name="location-outline" size={16} color={theme.textMedium} />
                  <Text style={styles.eventLocation} numberOfLines={1}>
                    {event.event_location}
                  </Text>
                </View>
              )}

              {event.excerpt && (
                <Text style={styles.eventExcerpt} numberOfLines={2}>
                  {event.excerpt}
                </Text>
              )}

              <View style={styles.eventFooter}>
                <TouchableOpacity style={styles.viewDetailsButton} onPress={navigateToEventDetails}>
                  <LinearGradient
                    colors={[theme.primary, theme.primary]}
                    style={styles.viewDetailsGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <View style={styles.arrowContainer}>
                      <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Component for Ministry Card - MODERN DESIGN
  const MinistryCard = ({ ministry }: { ministry: Ministry }) => {
    const pressAnim = useSharedValue(1);

    const handlePressIn = () => {
      pressAnim.value = withSpring(0.98, springConfig);
    };

    const handlePressOut = () => {
      pressAnim.value = withSpring(1, springConfig);
    };

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: pressAnim.value }],
      };
    });

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
        activeOpacity={0.9}
        onPress={navigateToJoinMinistry}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.ministryCardWrapper}
      >
        <Animated.View
          style={[styles.ministryCard, isTablet && styles.tabletMinistryCard, animatedStyle]}
        >
          <View style={styles.ministryCardContent}>
            <View style={styles.ministryImageContainer}>
              {ministry.image_url ? (
                <Image
                  source={{ uri: ministry.image_url }}
                  style={isTablet ? styles.tabletMinistryImage : styles.ministryImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[theme.neutral100, theme.neutral200]}
                  style={isTablet ? styles.tabletMinistryImage : styles.ministryImage}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <FontAwesome5 name="church" size={28} color={theme.neutral400} />
                </LinearGradient>
              )}
            </View>

            <View style={styles.ministryDetailsContainer}>
              <Text style={styles.ministryTitle} numberOfLines={2}>
                {ministry.name}
              </Text>

              {ministry.description && (
                <Text style={styles.ministryDescription} numberOfLines={isTablet ? 3 : 2}>
                  {ministry.description}
                </Text>
              )}

              <View style={styles.ministryFooter}>
                <TouchableOpacity style={styles.joinButton} onPress={navigateToJoinMinistry}>
                  <LinearGradient
                    colors={[theme.secondary, theme.secondary]}
                    style={styles.joinButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.joinButtonText}>Join Ministry</Text>
                    <View style={styles.arrowContainer}>
                      <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Events Tab Content
  const EventsTab = () => {
    if (isEventsLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.stateText}>Loading events...</Text>
        </View>
      );
    }

    if (eventsError) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={36} color={theme.error} />
          </View>
          <Text style={styles.errorText}>{eventsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchEvents}>
            <LinearGradient
              colors={[theme.primary, theme.primary]}
              style={styles.retryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (events.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.emptyIconContainer}>
            <FontAwesome5 name="calendar-alt" size={36} color={theme.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Events Found</Text>
          <Text style={styles.emptyText}>There are no upcoming events scheduled at this time.</Text>
        </View>
      );
    }

    return (
      <View style={styles.eventsContainer}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>All Events</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
        <View style={styles.eventsGrid}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>
      </View>
    );
  };

  // Ministries Tab Content
  const MinistriesTab = () => {
    if (isMinistriesLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.stateText}>Loading ministries...</Text>
        </View>
      );
    }

    if (ministriesError) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={36} color={theme.error} />
          </View>
          <Text style={styles.errorText}>{ministriesError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMinistries}>
            <LinearGradient
              colors={[theme.primary, theme.primary]}
              style={styles.retryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (ministries.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.emptyIconContainer}>
            <FontAwesome5 name="church" size={36} color={theme.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Ministries Found</Text>
          <Text style={styles.emptyText}>There are no ministries available at this time.</Text>
        </View>
      );
    }

    return (
      <View style={styles.ministriesContainer}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>Our Ministries</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
        <View style={styles.ministriesGrid}>
          {ministries.map((ministry) => (
            <MinistryCard key={ministry.id} ministry={ministry} />
          ))}
        </View>
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
              <View style={styles.communityButtonsContainer}>
                {/* Community Members Button */}
                <TouchableOpacity 
                  style={styles.prayerCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    // Navigate to community members section
                    router.push({
                      pathname: "/churchcommunity",
                      params: { churchId: church.id }
                    });
                  }}
                >
                  <View style={styles.prayerCardContent}>
                    <View style={styles.communityImageContainer}>
                      <Image 
                        source={require("../../assets/images/community-members.jpg")} 
                        style={styles.communityImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.communityDetailsContainer}>
                      <Text style={styles.communityCardTitle}>Community Members</Text>
                      <Text style={styles.communityCardDescription}>
                        Connect with our church family and discover ways to get involved.
                      </Text>
                      <TouchableOpacity style={styles.communityButton}>
                        <LinearGradient
                          colors={[theme.primary, theme.primary]}
                          style={styles.communityButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.communityButtonText}>Enter Community</Text>
                          <View style={styles.arrowContainer}>
                            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Prayer Intentions Button */}
                <TouchableOpacity 
                  style={styles.communityCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    // Navigate to prayer intentions section
                    router.push({
                      pathname: "/churchIntentions",
                      params: { churchId: church.id }
                    });
                  }}
                >
                  <View style={styles.communityCardContent}>
                    <View style={styles.communityImageContainer}>
                      <Image 
                        source={require("../../assets/images/prayer-intentions.jpg")} 
                        style={styles.communityImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.communityDetailsContainer}>
                      <Text style={styles.prayerCardTitle}>Prayer Intentions</Text>
                      <Text style={styles.prayerCardDescription}>
                        Share your prayer intentions, pray for others, and see how our community supports one another through faith.
                      </Text>
                      <TouchableOpacity style={styles.communityButton}>
                        <LinearGradient
                          colors={[theme.secondary, theme.secondary]}
                          style={styles.prayerButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.prayerButtonText}>View Prayer Intentions</Text>
                          <View style={styles.arrowContainer}>
                            <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
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

  // Common states styling
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacingXL,
    marginTop: theme.spacing2XL,
  },
  stateText: {
    fontSize: 16,
    fontWeight: theme.fontMedium,
    color: theme.textMedium,
    marginTop: theme.spacingM,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacingL,
  },
  errorText: {
    fontSize: 16,
    fontWeight: theme.fontMedium,
    color: theme.error,
    textAlign: "center",
    marginBottom: theme.spacingL,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    backgroundColor: `${theme.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacingL,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: theme.spacingS,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: theme.fontRegular,
    color: theme.textMedium,
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    marginTop: theme.spacingL,
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
  },
  retryButtonGradient: {
    paddingHorizontal: theme.spacingXL,
    paddingVertical: theme.spacingM,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
    fontSize: 14,
  },

  // Section headers
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingL,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginRight: theme.spacingM,
    letterSpacing: -0.5,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.neutral200,
  },

  // MODERN EVENTS STYLING
  eventsContainer: {
    paddingVertical: theme.spacingL,
  },
  eventsGrid: {
    flexDirection: "column",
    gap: 16,
  },
  eventCardWrapper: {
    marginBottom: 8,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.neutral200,
    ...theme.shadowLight,
  },
  eventCardContent: {
    flexDirection: "row",
    height: 160,
  },
  tabletEventCard: {
    height: 180,
  },
  eventImageContainer: {
    width: "30%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  eventImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  tabletEventImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  eventDetailsContainer: {
    flex: 1,
    padding: theme.spacingM,
    justifyContent: "space-between",
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    flex: 1,
  },
  recurringBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radiusMedium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  recurringText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: theme.fontSemiBold,
    marginLeft: 4,
  },
  eventMetaContainer: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  eventMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${theme.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radiusMedium,
    marginRight: 8,
    marginBottom: 4,
  },
  eventMetaText: {
    fontSize: 12,
    fontWeight: theme.fontMedium,
    color: theme.primary,
    marginLeft: 4,
  },
  eventLocationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: 13,
    color: theme.textMedium,
    marginLeft: 6,
    flex: 1,
  },
  eventExcerpt: {
    fontSize: 13,
    color: theme.textMedium,
    lineHeight: 18,
    marginBottom: 8,
  },
  eventFooter: {
    alignItems: "flex-start",
  },
  viewDetailsButton: {
    overflow: "hidden",
    borderRadius: theme.radiusMedium,
  },
  viewDetailsGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radiusMedium,
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
    fontSize: 12,
  },
  arrowContainer: {
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  // MODERN MINISTRIES STYLING
  ministriesContainer: {
    paddingVertical: theme.spacingL,
  },
  ministriesGrid: {
    flexDirection: "column",
    gap: 16,
  },
  ministryCardWrapper: {
    marginBottom: 8,
  },
  ministryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.neutral200,
    ...theme.shadowLight,
  },
  ministryCardContent: {
    flexDirection: "row",
    height: 140,
  },
  tabletMinistryCard: {
    height: 160,
  },
  ministryImageContainer: {
    width: "30%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  ministryImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  tabletMinistryImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  ministryDetailsContainer: {
    flex: 1,
    padding: theme.spacingM,
    justifyContent: "space-between",
  },
  ministryTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: 8,
  },
  ministryDescription: {
    fontSize: 13,
    color: theme.textMedium,
    lineHeight: 18,
    marginBottom: 8,
  },
  ministryFooter: {
    alignItems: "flex-start",
  },
  joinButton: {
    overflow: "hidden",
    borderRadius: theme.radiusMedium,
  },
  joinButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radiusMedium,
    flexDirection: "row",
    alignItems: "center",
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
    fontSize: 12,
  },

  // COMMUNITY TAB STYLING
  communityButtonsContainer: {
    paddingVertical: theme.spacingL,
    gap: 16,
  },
  communityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.neutral200,
    marginBottom: 12,
    ...theme.shadowLight,
  },
  prayerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.neutral200,
    marginBottom: 16,
    ...theme.shadowLight,
  },
  communityCardContent: {
    flexDirection: "row",
    height: 180,
  },
  prayerCardContent: {
    flexDirection: "row",
    height: 200,
  },
  communityImageContainer: {
    width: "40%",
    overflow: "hidden",
  },
  communityImage: {
    width: "100%",
    height: "100%",
  },
  communityDetailsContainer: {
    flex: 1,
    padding: theme.spacingM,
    justifyContent: "space-between",
  },
  communityCardTitle: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: 8,
  },
  prayerCardTitle: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: 12,
  },
  communityCardDescription: {
    fontSize: 14,
    color: theme.textMedium,
    lineHeight: 20,
    marginBottom: 16,
  },
  prayerCardDescription: {
    fontSize: 14,
    color: theme.textMedium,
    lineHeight: 20,
    marginBottom: 16,
  },
  communityButton: {
    alignSelf: "flex-start",
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
  },
  communityButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radiusMedium,
    flexDirection: "row",
    alignItems: "center",
  },
  prayerButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radiusMedium,
    flexDirection: "row",
    alignItems: "center",
  },
  communityButtonText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
    fontSize: 12,
  },
  prayerButtonText: {
    color: "#FFFFFF",
    fontWeight: theme.fontSemiBold,
    fontSize: 14,
  },
});