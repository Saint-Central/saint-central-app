import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  withSequence,
  withRepeat,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Church, ChurchEvent } from "@/types/church";
import ChurchPageContent from "@/components/church/ChurchPageContent";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import theme from "@/theme";
import { useCRUD } from "@/utils/crudClient";
import { router, useRouter } from "expo-router";
import Error from "@/components/ui/Error";
import useScreen from "@/hooks/useScreen";
import { Course } from "@/types/course";
import Button from "@/components/ui/Button";
import { useChurchContext } from "@/contexts/church";
import { isAdminOrOwner } from "@/data/user";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  userData: { username: string; profileImage: string };
};

const TABS = ["Home", "Events", "Ministries", "Fellowship"];

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Spring animation config
const springConfig = {
  damping: 15,
  stiffness: 400,
  mass: 1,
  overshootClamping: false,
};

export default function ChurchPage({ userData }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  // Add state for events and ministries
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState<boolean>(false);
  const [isMinistriesLoading, setIsMinistriesLoading] = useState<boolean>(false);
  const [eventsError, setEventsError] = useState<string>("");
  const [ministriesError, setMinistriesError] = useState<string>("");
  const hasFetchedDataRef = useRef(false);

  const { selectOne, select } = useCRUD();
  const { SCREEN_WIDTH, isTablet } = useScreen();
  const insets = useSafeAreaInsets();

  // Shared values for animations
  const scrollY = useSharedValue(0);
  const sidebarAnim = useSharedValue(0);
  const appearAnim = useSharedValue(0);
  const tabContentAnim = useSharedValue(1);
  const tabSlideAnim = useSharedValue(0);
  const fixedButtonScale = useSharedValue(1);
  const fixedButtonRotation = useSharedValue(0);
  const headerShimmerAnim = useSharedValue(0);

  const {
    data: { church, member },
  } = useChurchContext();

  // Function to fetch events using CRUD API
  const fetchEvents = useCallback(async () => {
    if (!church?.id) return;

    try {
      setIsEventsLoading(true);
      setEventsError("");

      const events = await select("church_events", {
        select: "*",
        where: { church_id: church.id },
        order: "time",
      });

      setEvents(events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEventsError("Failed to load events. Please try again later.");
    } finally {
      setIsEventsLoading(false);
    }
  }, [church?.id, select]);

  // Function to fetch ministries using CRUD API
  const fetchMinistries = useCallback(async () => {
    if (!church?.id || !member?.user_id) return;

    try {
      setIsMinistriesLoading(true);
      setMinistriesError("");

      // Fetch ministries for this church
      const ministriesData = await select("ministries", {
        select: "*",
        where: { church_id: church.id },
      });

      // Sort by created_at descending
      const sortedMinistries = (ministriesData || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Fetch user's ministry memberships
      const userMemberships = await select("ministry_members", {
        select: "ministry_id",
        where: { 
          user_id: member.user_id,
          role: "member"
        }
      });

      const userMinistryIds = userMemberships?.map((m: any) => m.ministry_id) || [];

      // Process ministries with membership status
      const processedMinistries = sortedMinistries.map((ministry: any) => ({
        ...ministry,
        is_member: userMinistryIds.includes(ministry.id)
      }));

      setMinistries(processedMinistries);
    } catch (error) {
      console.error("Error fetching ministries:", error);
      setMinistriesError("Failed to load ministries. Please try again later.");
    } finally {
      setIsMinistriesLoading(false);
    }
  }, [church?.id, member?.user_id, select]);

  useEffect(() => {
    if (church?.id && !hasFetchedDataRef.current) {
      hasFetchedDataRef.current = true;
      fetchEvents();
      fetchMinistries();
    }
  }, [church?.id]);

  // Animate page elements on mount
  useEffect(() => {
    // Initial animation sequence using Reanimated 3
    appearAnim.value = withSpring(1, {
      damping: 20,
      stiffness: 300,
      mass: 1,
    });
    
    // Start header shimmer animation
    headerShimmerAnim.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      false
    );
  }, [appearAnim, headerShimmerAnim]);

  // Handle sidebar animation
  useEffect(() => {
    sidebarAnim.value = withTiming(sidebarOpen ? 1 : 0, { duration: 200 });
  }, [sidebarAnim, sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Ultra-smooth scroll handler
  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        // Use spring animation for ultra-smooth value updates
        scrollY.value = withSpring(event.contentOffset.y, {
          damping: 50,
          stiffness: 400,
          mass: 0.8,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        });
      },
    },
    []
  );

  // Ultra-smooth header animation
  const headerAnimatedStyle = useAnimatedStyle(() => {
    // Extended range for ultra-smooth interpolation
    const progress = interpolate(
      scrollY.value, 
      [0, 80, 120], 
      [0, 0.8, 1], 
      Extrapolate.CLAMP
    );
    
    // Natural easing curves for smoothness
    const easedProgress = interpolate(
      progress,
      [0, 1],
      [0, 1],
      Extrapolate.CLAMP,
      'easeOutCubic'
    );
    
    // Smooth transforms with natural motion
    const translateY = interpolate(easedProgress, [0, 1], [-20, 0]);
    const scale = interpolate(easedProgress, [0, 1], [0.98, 1]);
    
    return {
      opacity: easedProgress,
      transform: [{ translateY }, { scale }],
    };
  });

  // Ultra-smooth backdrop animation
  const headerBackdropStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value, 
      [0, 60, 120], 
      [0, 0.5, 1], 
      Extrapolate.CLAMP
    );
    
    const easedOpacity = interpolate(
      progress,
      [0, 1],
      [0, 0.95],
      Extrapolate.CLAMP,
      'easeOutQuart'
    );
    
    return {
      opacity: easedOpacity,
    };
  });

  // Ultra-smooth content animation
  const headerContentStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value, 
      [40, 100, 120], 
      [0, 0.7, 1], 
      Extrapolate.CLAMP
    );
    
    const easedProgress = interpolate(
      progress,
      [0, 1],
      [0, 1],
      Extrapolate.CLAMP,
      'easeOutQuint'
    );
    
    const translateY = interpolate(easedProgress, [0, 1], [3, 0]);
    
    return {
      opacity: easedProgress,
      transform: [{ translateY }],
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

  // Tab content animation
  const tabContentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: tabContentAnim.value,
      transform: [
        {
          translateY: interpolate(tabContentAnim.value, [0, 1], [30, 0]),
        },
        {
          translateX: interpolate(tabSlideAnim.value, [-1, 0, 1], [-SCREEN_WIDTH * 0.1, 0, SCREEN_WIDTH * 0.1]),
        },
        {
          scale: interpolate(tabContentAnim.value, [0, 1], [0.92, 1]),
        },
      ],
    };
  });

  // Tab handling with animation
  const handleTabPress = (tabIndex: number) => {
    const currentIndex = TABS.indexOf(activeTab);
    const direction = tabIndex > currentIndex ? 1 : -1;
    
    // Function to change tab state (needs to run on JS thread)
    const changeTab = () => {
      setActiveTab(TABS[tabIndex]);
    };
    
    // Animate out current content with slide
    tabContentAnim.value = withTiming(0, { duration: 200 });
    tabSlideAnim.value = withTiming(-direction * 0.3, { duration: 200 }, (finished) => {
      if (finished) {
        // Change tab and reset slide position using runOnJS
        runOnJS(changeTab)();
        tabSlideAnim.value = direction * 0.3;
        
        // Animate in new content
        tabContentAnim.value = withSpring(1, {
          damping: 18,
          stiffness: 280,
          mass: 0.9,
        });
        tabSlideAnim.value = withSpring(0, {
          damping: 18,
          stiffness: 280,
          mass: 0.9,
        });
      }
    });
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar translucent={true} backgroundColor="transparent" barStyle="light-content" />

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
      <View style={[styles.fixedHeader, { top: insets.top }]}>
        <AnimatedTouchableOpacity 
          style={[
            styles.fixedHeaderButton,
            useAnimatedStyle(() => ({
              transform: [
                { scale: fixedButtonScale.value },
                { rotate: `${fixedButtonRotation.value}deg` }
              ],
            }))
          ]} 
          onPress={() => {
            fixedButtonRotation.value = withSequence(
              withSpring(-5, { damping: 10, stiffness: 200 }),
              withSpring(5, { damping: 10, stiffness: 200 }),
              withSpring(0, { damping: 15, stiffness: 400 })
            );
            toggleSidebar();
          }}
          onPressIn={() => {
            fixedButtonScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
          }}
          onPressOut={() => {
            fixedButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
          }}
          activeOpacity={1}
        >
          <Animated.View
            style={useAnimatedStyle(() => ({
              transform: [{ rotate: `${interpolate(sidebarAnim.value, [0, 1], [0, 90])}deg` }],
            }))}
          >
            <Ionicons name="menu" size={24} color={theme.primary} />
          </Animated.View>
        </AnimatedTouchableOpacity>
      </View>

      {/* Safe Area Overlay with ultra-smooth animation */}
      <Animated.View 
        style={[
          styles.safeAreaOverlay, 
          useAnimatedStyle(() => {
            const progress = interpolate(
              scrollY.value, 
              [0, 60, 120], 
              [0, 0.3, 1], 
              Extrapolate.CLAMP
            );
            
            const easedOpacity = interpolate(
              progress,
              [0, 1],
              [0, 1],
              Extrapolate.CLAMP,
              'easeOutQuart'
            );
            
            return {
              opacity: easedOpacity,
              backgroundColor: theme.neutral900,
            };
          }),
          { height: insets.top }
        ]} 
      />

      {/* Main content with animations */}
      <Animated.View style={[styles.mainContainer, contentAnimatedStyle]}>
        {/* Enhanced Floating Sticky Header */}
        <Animated.View style={[styles.headerContainer, headerAnimatedStyle, { top: insets.top }]}>
          {/* Glass morphism backdrop */}
          <Animated.View style={[styles.headerBackdrop, headerBackdropStyle]}>
            {Platform.OS === 'ios' && (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            )}
          </Animated.View>
          
          {/* Gradient overlay */}
          <LinearGradient
            colors={['rgba(28,25,23,0.95)', 'rgba(28,25,23,0.85)', 'rgba(41,37,36,0.8)']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          
          {/* Header content with animation */}
          <Animated.View style={[styles.headerContent, headerContentStyle]}>
            {/* Empty space for hamburger menu */}
            <View style={styles.headerMenuSpacer} />

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {church?.name}
              </Text>
              <View style={styles.headerSubtitleContainer}>
                <View style={styles.onlineIndicator} />
                <Text style={styles.headerSubtitle}>Active Now</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.headerActionButton}
              activeOpacity={0.7}
            >
              <View style={styles.headerIconContainer}>
                <Ionicons name="notifications-outline" size={22} color={theme.accent2} />
                <View style={styles.headerNotificationDot} />
              </View>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Bottom border with animated shimmer */}
          <Animated.View style={[styles.headerBorder, headerBackdropStyle]}>
            <Animated.View
              style={[
                styles.headerBorderGradient,
                useAnimatedStyle(() => ({
                  transform: [{
                    translateX: interpolate(
                      headerShimmerAnim.value,
                      [0, 1],
                      [-200, 400]
                    ),
                  }],
                }))
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(254,243,199,0.3)', 'rgba(254,243,199,0.5)', 'rgba(254,243,199,0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, width: 200 }}
              />
            </Animated.View>
          </Animated.View>
        </Animated.View>

        {/* Page content */}
        <AnimatedScrollView
          style={{ flex: 1, backgroundColor: theme.pageBg }}
          contentContainerStyle={[
            styles.scrollViewContent,
            isTablet && styles.tabletScrollViewContent,
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
        >
          {/* Enhanced Church Page Header with Hero Image */}
          <ChurchPageHeader userData={userData} onPressMenu={toggleSidebar} />

          {/* Modern Tab Navigation */}
          <View style={[styles.modernTabsContainer, isTablet && styles.tabletTabsContainer]}>
            {TABS.map((tab, index) => {
              const tabButtonPressAnim = useSharedValue(1);
              
              const tabButtonAnimatedStyle = useAnimatedStyle(() => {
                return {
                  transform: [{ scale: tabButtonPressAnim.value }],
                };
              });

              const handleTabPressIn = () => {
                tabButtonPressAnim.value = withSpring(0.96, springConfig);
              };

              const handleTabPressOut = () => {
                tabButtonPressAnim.value = withSpring(1, springConfig);
              };

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.modernTabButton, activeTab === tab && styles.modernActiveTab]}
                  onPress={() => handleTabPress(index)}
                  onPressIn={handleTabPressIn}
                  onPressOut={handleTabPressOut}
                  activeOpacity={1}
                >
                  <Animated.View style={[StyleSheet.absoluteFill, tabButtonAnimatedStyle]}>
                    {activeTab === tab && (
                      <LinearGradient
                        colors={[theme.primary, theme.accent1]}
                        style={styles.modernActiveTabIndicator}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                  </Animated.View>
                  <Text
                    style={[
                      styles.modernTabText,
                      isTablet && styles.tabletTabText,
                      activeTab === tab && styles.modernActiveTabText,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dynamic content based on active tab */}
          <Animated.View style={[styles.tabContent, isTablet && styles.tabletTabContent, tabContentAnimatedStyle]}>
            {activeTab === "Home" && <ChurchPageContent userData={userData} />}

            {activeTab === "Events" && (
              <EventsTab
                events={events}
                church={church}
                loading={isEventsLoading}
                error={eventsError}
              />
            )}

            {activeTab === "Ministries" && isAdminOrOwner(member) && (
              <View style={styles.adminSection}>
                <View style={styles.adminCard}>
                  <MaterialCommunityIcons name="shield-account" size={24} color={theme.primary} />
                  <Text style={styles.adminCardTitle}>Admin Controls</Text>
                  <Button
                    onPress={() => {
                      router.push({
                        pathname: "/create-course",
                        params: {
                          churchId: member.church_id,
                          userId: member.user_id,
                          role: member.role,
                        },
                      });
                    }}
                    size="md"
                    style={styles.adminButton}
                  >
                    <Text style={styles.adminButtonText}>Create Ministry</Text>
                  </Button>
                </View>
              </View>
            )}
            {activeTab === "Ministries" && (
              <MinistriesTab ministries={ministries} loading={isMinistriesLoading} error={ministriesError} />
            )}

            {activeTab === "Fellowship" && (
              <View style={styles.modernComingSoonContainer}>
                <LinearGradient
                  colors={[theme.primary + "20", theme.accent1 + "15"]}
                  style={styles.comingSoonGradient}
                >
                  <FontAwesome5 name="users" size={48} color={theme.primary} />
                  <Text style={styles.modernComingSoonTitle}>Fellowship Coming Soon</Text>
                  <Text style={styles.modernComingSoonText}>
                    Connect with our church family and grow in faith together. 
                    This feature will include prayer groups, social events, and community discussions.
                  </Text>
                </LinearGradient>
              </View>
            )}
          </Animated.View>
        </AnimatedScrollView>
      </Animated.View>
    </View>
  );
}
// Events Tab Content
const EventsTab = ({
  events,
  church,
  loading,
  error,
}: {
  events: ChurchEvent[];
  church: Church;
  loading: boolean;
  error: string;
}) => {
  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.stateText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return <Error />;
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
          <EventCard key={event.id} event={event} church={church} />
        ))}
      </View>
    </View>
  );
};

const MinistriesTab = ({
  ministries,
  loading,
  error,
}: {
  ministries: any[];
  loading: boolean;
  error: string;
}) => {
  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.stateText}>Loading ministries...</Text>
      </View>
    );
  }

  if (error) {
    return <Error />;
  }

  if (!ministries.length) {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.emptyIconContainer}>
          <FontAwesome5 name="church" size={36} color={theme.primary} />
        </View>
        <Text style={styles.emptyTitle}>No Ministries Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.coursesContainer}>
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

const EventCard = ({ event, church }: { event: ChurchEvent; church: Church }) => {
  const router = useRouter();
  const { isTablet } = useScreen();

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
      <Animated.View style={[styles.eventCard, isTablet && styles.tabletEventCard, animatedStyle]}>
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
                colors={[theme.neutral700, theme.neutral600]}
                style={isTablet ? styles.tabletEventImage : styles.eventImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <FontAwesome5 name="calendar-alt" size={28} color={theme.primary} />
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
                  <Ionicons name="repeat" size={12} color={theme.textWhite} />
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

const MinistryCard = ({ ministry }: { ministry: any }) => {
  const { isTablet } = useScreen();
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

  const handlePress = () => {
    if (ministry.is_member) {
      // If user is a member, go directly to chat
      router.push({
        pathname: "/(tabs)/ministry-chat",
        params: { id: ministry.id.toString() },
      });
    } else {
      // If not a member, go to join screen
      router.push({
        pathname: "/(tabs)/JoinMinistryScreen",
        params: { ministryId: ministry.id.toString() },
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.courseCardContainer}
    >
      <Animated.View
        style={[styles.courseCard, isTablet && styles.tabletCourseCard, animatedStyle]}
      >
        <View style={styles.courseCardContent}>
          <View style={styles.courseImageContainer}>
            {ministry.image_url ? (
              <Image
                source={{ uri: ministry.image_url }}
                style={isTablet ? styles.tabletCourseImage : styles.courseImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[theme.neutral700, theme.neutral600]}
                style={isTablet ? styles.tabletCourseImage : styles.courseImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <FontAwesome5 name="church" size={28} color={theme.primary} />
              </LinearGradient>
            )}
          </View>

          <View style={styles.courseDetailsContainer}>
            <View style={styles.ministryTitleRow}>
              <Text style={styles.courseTitle} numberOfLines={2}>
                {ministry.name || "Ministry"}
              </Text>
              {ministry.private && (
                <Ionicons name="lock-closed" size={16} color={theme.primary} />
              )}
            </View>
            {ministry.description && (
              <Text style={styles.courseDescription} numberOfLines={isTablet ? 3 : 2}>
                {ministry.description}
              </Text>
            )}
            <View style={styles.courseFooter}>
              <Button size="xs">
                <Text style={styles.joinButtonText}>
                  {ministry.is_member ? "Open Chat" : ministry.private ? "Request to Join" : "Join Ministry"}
                </Text>
                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </View>
              </Button>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  safeAreaOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.neutral900,
    zIndex: 99,
  },
  mainContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: theme.pageBg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.neutral900,
    zIndex: 10,
  },
  headerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 64,
    zIndex: 100,
    overflow: "hidden",
  },
  headerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(28,25,23,0.3)",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacingM,
    height: "100%",
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerMenuSpacer: {
    width: 52, // Same width as the menu button to maintain alignment
  },
  headerActionButton: {
    padding: 8,
    position: "relative",
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(254,243,199,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(254,243,199,0.12)",
    position: "relative",
  },
  headerNotificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    backgroundColor: theme.error,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "rgba(28,25,23,0.9)",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.textWhite,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSubtitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.textLight,
    opacity: 0.8,
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.success,
  },
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    overflow: "hidden",
  },
  headerBorderGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 200,
  },
  fixedHeader: {
    position: "absolute",
    left: 0,
    paddingLeft: theme.spacingM,
    paddingTop: 8,
    zIndex: 101, // Higher than other headers
  },
  fixedHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(254, 243, 199, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.2)",
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerSpacer: {
    width: 36,
  },
  scrollViewContent: {
    paddingTop: 0,
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
    marginTop: theme.spacingM,
    marginBottom: theme.spacingL,
    backgroundColor: "rgba(254, 243, 199, 0.08)",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  // Modern Tab Styles
  modernTabsContainer: {
    flexDirection: "row",
    marginHorizontal: theme.spacingL,
    marginTop: theme.spacingL,
    marginBottom: theme.spacingL,
    backgroundColor: "rgba(254, 243, 199, 0.06)",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.08)",
  },
  tabletTabsContainer: {
    marginHorizontal: 0,
    maxWidth: 500,
    alignSelf: "center",
  },
  modernTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    position: "relative",
  },
  modernActiveTab: {
    // Style handled by gradient
  },
  modernTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.textLight,
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  modernActiveTabText: {
    color: theme.textWhite,
    fontWeight: "600",
  },
  modernActiveTabIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "400",
    color: theme.textLight,
    textAlign: "center",
  },
  tabletTabText: {
    fontSize: 16,
  },
  activeTabText: {
    color: theme.textWhite,
    fontWeight: "500",
  },
  activeTabIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderRadius: 8,
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
    color: theme.textWhite,
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
  // Admin Section
  adminSection: {
    paddingHorizontal: theme.spacingL,
    marginBottom: theme.spacingL,
  },
  adminCard: {
    backgroundColor: "rgba(254, 243, 199, 0.08)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    alignItems: "center",
    gap: 12,
  },
  adminCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
  },
  adminButton: {
    width: "100%",
    maxWidth: 200,
  },
  adminButtonText: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    fontSize: 14,
  },

  // Coming Soon Styles
  comingSoonContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacingXL,
    marginTop: theme.spacing2XL,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: "#FFFFFF",
    marginTop: theme.spacingL,
    marginBottom: theme.spacingS,
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: theme.fontRegular,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
  },

  // Modern Coming Soon
  modernComingSoonContainer: {
    paddingHorizontal: theme.spacingL,
    marginTop: theme.spacingL,
  },
  comingSoonGradient: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.08)",
  },
  modernComingSoonTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.textWhite,
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  modernComingSoonText: {
    fontSize: 15,
    fontWeight: "400",
    color: theme.textLight,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
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
    color: theme.textWhite,
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
    backgroundColor: "rgba(254, 243, 199, 0.06)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
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
    color: theme.textWhite,
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
    color: theme.textWhite,
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
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    fontSize: 12,
  },
  arrowContainer: {
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  // MODERN MINISTRIES STYLING
  coursesContainer: {
    paddingVertical: theme.spacingL,
  },
  ministriesGrid: {
    flexDirection: "column",
    gap: 16,
  },
  courseCardContainer: {
    marginBottom: 8,
  },
  courseCard: {
    backgroundColor: "rgba(254, 243, 199, 0.06)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  courseCardContent: {
    flexDirection: "row",
    height: 140,
  },
  tabletCourseCard: {
    height: 160,
  },
  courseImageContainer: {
    width: "30%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  courseImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  tabletCourseImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  courseDetailsContainer: {
    flex: 1,
    padding: theme.spacingM,
    justifyContent: "space-between",
  },
  ministryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    flex: 1,
  },
  courseDescription: {
    fontSize: 13,
    color: theme.textMedium,
    lineHeight: 18,
    marginBottom: 8,
  },
  courseFooter: {
    alignItems: "flex-start",
  },
  joinButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radiusMedium,
    flexDirection: "row",
    alignItems: "center",
  },
  joinButtonText: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    fontSize: 12,
  },
});
