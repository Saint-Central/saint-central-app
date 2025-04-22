import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  StatusBar,
  TouchableOpacity,
  Alert,
  Platform,
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/supabaseClient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolate,
  useDerivedValue,
  runOnJS,
  FadeInDown,
  FadeOutUp,
  SlideInUp,
  SlideInDown,
  cancelAnimation,
  withDelay,
  withSequence,
  Easing,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import theme from "../../../theme";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { FlashList } from "@shopify/flash-list";

// Custom components
import MessageItem from "./components/MessageItem";
import DateDivider from "./components/DateDivider";
import MessageInputArea from "./components/MessageInputArea";
import MinistryInfoPanel from "./components/MinistryInfoPanel";
import {
  LoadingScreen,
  ErrorScreen,
  EmptyMessagesScreen,
  MessageLoading,
  LoadMoreHeader,
  AllMessagesLoaded,
} from "./components/LoadingStates";

// Hooks
import useMinistry from "./hooks/useMinistry";
import useMessages from "./hooks/useMessages";

// Utils
import { renderUserAvatar, renderMinistryAvatar } from "./utils/renderUtils";
import { styles } from "./styles";
import { Message, MessageGroup, User } from "./types";

// Animated components
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Constants
const HEADER_HEIGHT = Platform.OS === "ios" ? 90 : 70;
const MESSAGE_ANIMATION_DELAY = 30; // ms delay between message animations

// Constants for new features
const LAST_READ_KEY = (ministryId: number, userId: string) => `last_read_${ministryId}_${userId}`;

export default function MinistryChat(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const ministryId = typeof params.id === "string" ? parseInt(params.id) : 0;

  // Window dimensions for responsive design
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

  // States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [showMinistryInfo, setShowMinistryInfo] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);

  // New state for tracking unread messages and scrolling
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(false);
  const [oldestUnreadMessageIndex, setOldestUnreadMessageIndex] = useState<number | null>(null);

  // Track if we've scrolled to unread message already
  const hasScrolledToUnreadRef = useRef<boolean>(false);

  // Ref to store the content height before loading more messages
  const prevContentHeightRef = useRef<number>(0);

  // Ref to track first initial load
  const firstLoadRef = useRef<boolean>(false);

  // Custom hooks
  const {
    ministry,
    isMember,
    loading,
    error,
    fetchMinistryDetails,
    leaveMinistry,
    refreshMembershipStatus,
  } = useMinistry(ministryId);

  const {
    messages,
    messageLoading,
    isLoadingMore,
    allMessagesLoaded,
    newMessage,
    setNewMessage,
    fetchMessages,
    fetchUserForMessage,
    sendMessage,
    messageLoadingRef,
    isLoadingMoreRef,
  } = useMessages(ministryId, currentUser);

  // Refs
  const messageListRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  const prevMinistryIdRef = useRef<number | null>(null);
  const scrollOffsetRef = useRef<number>(0);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const infoSlideAnim = useSharedValue(0);
  const keyboardAnim = useSharedValue(0);
  const refreshAnim = useSharedValue(0);
  const headerBlurIntensity = useSharedValue(0);
  const navbarOpacity = useSharedValue(1);
  const pulseAnim = useSharedValue(0);
  const typingIndicatorAnim = useSharedValue(0);
  const refreshIconRotation = useSharedValue(0);

  // Derived animation values
  const headerOpacity = useDerivedValue(() => {
    return interpolate(scrollY.value, [0, 60], [0, 1], Extrapolate.CLAMP);
  });

  const headerElevation = useDerivedValue(() => {
    return interpolate(scrollY.value, [0, 60], [0, 8], Extrapolate.CLAMP);
  });

  // Update headerBlurIntensity using derived value
  useDerivedValue(() => {
    headerBlurIntensity.value = interpolate(scrollY.value, [0, 60], [0, 20], Extrapolate.CLAMP);
  });

  // Animated styles
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    shadowOpacity: interpolate(headerOpacity.value, [0, 1], [0, 0.15]),
    elevation: headerElevation.value,
  }));

  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: headerBlurIntensity.value / 20,
  }));

  const infoSlideStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(infoSlideAnim.value, [0, 1], [SCREEN_WIDTH, 0]),
      },
    ],
  }));

  const keyboardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(keyboardAnim.value, [0, 1], [0, -keyboardHeight]) }],
  }));

  const loadingIndicatorStyle = useAnimatedStyle(() => ({
    opacity: refreshAnim.value,
    transform: [{ rotate: `${refreshIconRotation.value * 360}deg` }],
  }));

  const navbarStyle = useAnimatedStyle(() => ({
    opacity: navbarOpacity.value,
    transform: [
      {
        translateY: interpolate(
          navbarOpacity.value,
          [0, 1],
          [-HEADER_HEIGHT, 0],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const pulseAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 0.5, 1], [0.6, 1, 0.6]),
    transform: [{ scale: interpolate(pulseAnim.value, [0, 0.5, 1], [0.95, 1.05, 0.95]) }],
  }));

  const typingIndicatorStyle = useAnimatedStyle(() => ({
    opacity: typingIndicatorAnim.value,
    transform: [{ translateY: interpolate(typingIndicatorAnim.value, [0, 1], [10, 0]) }],
  }));

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting current user:", userError);
          return;
        }

        if (user) {
          const { data: userData, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.error("Error fetching user profile:", profileError);
            return;
          }

          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error in getCurrentUser:", error);
      }
    };

    // Start fade animation and pulse effect
    fadeAnim.value = withTiming(1, { duration: 400 });
    startPulseAnimation();

    getCurrentUser();
  }, []);

  // Reset when ministry ID changes
  useEffect(() => {
    if (prevMinistryIdRef.current === ministryId) return;

    console.log(`Ministry ID changed from ${prevMinistryIdRef.current} to ${ministryId}`);
    prevMinistryIdRef.current = ministryId;

    // Reset any component-specific state when changing ministries
    setIsInputFocused(false);
    setKeyboardHeight(0);
    setShowMinistryInfo(false);
    setIsRefreshing(false);
    setIsScrolling(false);

    // Reset animation values
    infoSlideAnim.value = 0;
    keyboardAnim.value = 0;
    fadeAnim.value = withTiming(1, { duration: 400 });
    startPulseAnimation();

    let isComponentMounted = true;
    let messageSubscription: any = null;
    let appStateSubscription: any = null;
    let keyboardShowSubscription: any = null;
    let keyboardHideSubscription: any = null;

    // Set up real-time subscription to messages
    const channelId = `ministry_messages_${ministryId}_${Date.now()}`;

    messageSubscription = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ministry_messages",
          filter: `ministry_id=eq.${ministryId}`,
        },
        (payload) => {
          if (isComponentMounted) {
            fetchUserForMessage(payload.new as Message);
            // Show typing indicator briefly
            showTypingIndicator();
            // Mark this as a new message for auto-scrolling
            isNewMessageRef.current = true;
            // Provide haptic feedback for new message
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            // Scroll to bottom for new messages with a delay to ensure rendering is complete
            setTimeout(() => {
              if (isComponentMounted && messageListRef.current) {
                messageListRef.current.scrollToEnd({ animated: true });
              }
            }, 300);
          }
        },
      )
      .subscribe();

    // Set up app state listener
    if (Platform.OS !== "web" && AppState) {
      try {
        appStateSubscription = AppState.addEventListener(
          "change",
          (nextAppState: AppStateStatus) => {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
              if (isComponentMounted) {
                // Refresh data when app comes to foreground
                startRefreshAnimation();
                fetchMessages();
                refreshMembershipStatus();
                setTimeout(() => {
                  stopRefreshAnimation();
                }, 1000);
              }
            }
            appStateRef.current = nextAppState;
          },
        );
      } catch (error) {
        console.log("AppState not available", error);
      }
    }

    // Set up keyboard listeners
    if (Keyboard) {
      keyboardShowSubscription = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
        (e) => {
          setIsInputFocused(true);
          setKeyboardHeight(e.endCoordinates.height);

          // Handle keyboard animation
          keyboardAnim.value = withTiming(1, { duration: 250 });

          // Hide navbar when keyboard appears
          navbarOpacity.value = withTiming(0, { duration: 200 });

          setTimeout(
            () => {
              if (messageListRef.current && messages.length > 0 && isComponentMounted) {
                messageListRef.current.scrollToEnd({ animated: true });
              }
            },
            Platform.OS === "ios" ? 150 : 100,
          );
        },
      );

      keyboardHideSubscription = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
        () => {
          setIsInputFocused(false);
          setKeyboardHeight(0);

          // Handle keyboard animation
          keyboardAnim.value = withTiming(0, { duration: 200 });

          // Show navbar when keyboard disappears
          navbarOpacity.value = withTiming(1, { duration: 200 });
        },
      );
    }

    // Clean up
    return () => {
      console.log(`Cleaning up ministry ${ministryId} subscription and listeners`);
      isComponentMounted = false;

      if (messageSubscription) {
        try {
          supabase.removeChannel(messageSubscription);
        } catch (error) {
          console.error("Error removing subscription:", error);
        }
      }

      if (appStateSubscription?.remove) {
        appStateSubscription.remove();
      }

      if (keyboardShowSubscription) {
        keyboardShowSubscription.remove();
      }

      if (keyboardHideSubscription) {
        keyboardHideSubscription.remove();
      }
    };
  }, [ministryId]);

  // Load ministry details
  useEffect(() => {
    startRefreshAnimation();
    fetchMinistryDetails();

    return () => {
      stopRefreshAnimation();
    };
  }, [ministryId]);

  // Pulse animation for loading states and interactions
  const startPulseAnimation = () => {
    pulseAnim.value = 0;
    pulseAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  };

  // Refresh animation
  const startRefreshAnimation = () => {
    refreshAnim.value = withTiming(1, { duration: 300 });
    refreshIconRotation.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.linear }),
      -1,
      false,
    );
  };

  const stopRefreshAnimation = () => {
    refreshAnim.value = withTiming(0, { duration: 300 });
    cancelAnimation(refreshIconRotation);
    refreshIconRotation.value = 0;
  };

  // Typing indicator animation
  const showTypingIndicator = () => {
    typingIndicatorAnim.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(1500, withTiming(0, { duration: 300 })),
    );
  };

  // Toggle ministry info panel
  const toggleMinistryInfo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setShowMinistryInfo((prev) => {
      infoSlideAnim.value = withSpring(!prev ? 1 : 0, {
        damping: 15,
        stiffness: 90,
        mass: 1,
      });
      return !prev;
    });
  }, [infoSlideAnim]);

  // Navigate back with animation
  const navigateBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    fadeAnim.value = withTiming(0, { duration: 300 });

    setTimeout(() => {
      router.push("/(tabs)/MinistriesScreen");
    }, 300);
  }, [router, fadeAnim]);

  // Handle leave ministry
  const handleLeaveMinistry = useCallback(async () => {
    try {
      startRefreshAnimation();
      await leaveMinistry();

      fadeAnim.value = withTiming(0, { duration: 300 });
      setTimeout(() => {
        router.push("/(tabs)/MinistriesScreen");
      }, 300);
    } catch (error) {
      console.log("User cancelled or error:", error);
    } finally {
      stopRefreshAnimation();
    }
  }, [leaveMinistry, router]);

  // Group messages by date with optimized memoization
  const groupedMessages = useMemo(() => {
    const groups: MessageGroup[] = [];
    const seenMessageIds = new Set<string | number>();

    messages.forEach((message) => {
      if (seenMessageIds.has(message.id)) return;

      seenMessageIds.add(message.id);
      const messageDate = new Date(message.sent_at).toDateString();

      const existingGroup = groups.find(
        (group) => new Date(group.date).toDateString() === messageDate,
      );

      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({
          date: message.sent_at,
          messages: [message],
        });
      }
    });

    return groups;
  }, [messages]);

  // Render message group
  const renderMessageGroup = useCallback(
    ({ item, index }: { item: MessageGroup; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()} key={item.date}>
        <DateDivider date={item.date} />
        {item.messages.map((message, msgIndex) => (
          <MessageItem
            key={`msg-${message.id}`}
            message={message}
            isCurrentUser={message.user_id === currentUser?.id}
            renderUserAvatar={renderUserAvatar}
            index={msgIndex}
            totalInGroup={item.messages.length}
          />
        ))}
      </Animated.View>
    ),
    [currentUser],
  );

  // Handle loading more messages (store scroll position)
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && !allMessagesLoaded && !messageLoading && messages.length > 0) {
      console.log("Triggering load more messages");

      // Store current content height before fetching more
      if (messageListRef.current) {
        prevContentHeightRef.current = messageListRef.current.getContentScrollableHeight?.() || 0;
        console.log(`Stored previous content height: ${prevContentHeightRef.current}`);
      }

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      fetchMessages(true); // Load older messages
    }
  }, [isLoadingMore, allMessagesLoaded, messageLoading, messages.length, fetchMessages]);

  // Track if we're receiving a new message for proper scroll behavior
  const isNewMessageRef = useRef(false);

  // Called when new messages are received (via real-time)
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMore) {
      // Only mark as a new message if not loading older messages
      isNewMessageRef.current = true;
    }
    return () => {
      // Reset after render cycle
      isNewMessageRef.current = false;
    };
  }, [messages.length, isLoadingMore]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    startRefreshAnimation();

    // Pass isRefresh=true to maintain pagination state and merge new messages
    fetchMessages(false, true).finally(() => {
      setTimeout(() => {
        setIsRefreshing(false);
        stopRefreshAnimation();
      }, 800); // Minimum refresh time for better UX
    });
  }, [fetchMessages, startRefreshAnimation, stopRefreshAnimation]);

  // KeyExtractor for FlashList
  const keyExtractor = useCallback(
    (item: MessageGroup) => `group-${item.date}-${item.messages[0]?.id || "no-msgs"}`,
    [],
  );

  // Load last read timestamp on mount
  useEffect(() => {
    if (!currentUser || !ministryId) return;

    const loadLastRead = async () => {
      try {
        const key = LAST_READ_KEY(ministryId, currentUser.id);
        const storedTimestamp = await AsyncStorage.getItem(key);
        console.log(`Loaded last read timestamp for ministry ${ministryId}: ${storedTimestamp}`);
        setLastReadTimestamp(storedTimestamp);
      } catch (error) {
        console.error("Error loading last read timestamp:", error);
      }
    };

    loadLastRead();
  }, [currentUser, ministryId]);

  // Save last read timestamp when leaving the screen or when the component unmounts
  const saveLastRead = useCallback(async () => {
    if (!currentUser || !ministryId || messages.length === 0) return;

    try {
      // Use the most recent message as the last read timestamp
      const mostRecentMessage = messages[messages.length - 1];
      const key = LAST_READ_KEY(ministryId, currentUser.id);
      await AsyncStorage.setItem(key, mostRecentMessage.sent_at);
      console.log(
        `Saved last read timestamp for ministry ${ministryId}: ${mostRecentMessage.sent_at}`,
      );
    } catch (error) {
      console.error("Error saving last read timestamp:", error);
    }
  }, [currentUser, ministryId, messages]);

  // Save last read timestamp when navigating away or on unmount
  useEffect(() => {
    return () => {
      saveLastRead();
    };
  }, [saveLastRead]);

  // Also save when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === "active" &&
        (nextAppState === "inactive" || nextAppState === "background")
      ) {
        saveLastRead();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [saveLastRead]);

  // On initial load complete, scroll to the most recent message
  useEffect(() => {
    if (!messageLoading && !firstLoadRef.current && messages.length > 0) {
      firstLoadRef.current = true;
      // scroll to bottom
      messageListRef.current?.scrollToEnd({ animated: false });
    }
  }, [messageLoading]);

  // Loading state
  if (loading) {
    return <LoadingScreen loadingIndicatorStyle={loadingIndicatorStyle} />;
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ErrorScreen
          error={typeof error === "string" ? error : error.message || "An unknown error occurred"}
          fadeStyle={fadeStyle}
          navigateBack={navigateBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: 0 }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Animated Gradient Background */}
      <LinearGradient
        colors={[theme.pageBg, theme.neutral50, theme.pageBg]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Floating header with blur effect */}
      <Animated.View style={[styles.floatingHeader, headerStyle]}>
        <BlurView style={{ flex: 1 }} tint="light" intensity={20} />
      </Animated.View>

      {/* Header */}
      <Animated.View style={[styles.header, navbarStyle]}>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ministryTitleContainer}
          onPress={toggleMinistryInfo}
          activeOpacity={0.7}
        >
          <MotiView
            style={styles.headerAvatar}
            from={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "timing", duration: 400 }}
          >
            {renderMinistryAvatar(ministry)}
          </MotiView>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {ministry?.name || "Ministry"}
            </Text>
            <Text style={styles.memberCount}>
              {ministry?.member_count || 0} {ministry?.member_count === 1 ? "member" : "members"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoButton}
          onPress={toggleMinistryInfo}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Keyboard avoiding view for messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.chatContainer}>
          <Animated.View
            style={[
              styles.messagesContainer,
              fadeStyle,
              isInputFocused && styles.messagesContainerWithKeyboard,
            ]}
          >
            {/* Typing indicator (appears when new messages come in) */}
            <Animated.View style={[styles.typingIndicator, typingIndicatorStyle]}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>New message</Text>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            </Animated.View>

            {messageLoading && messages.length === 0 ? (
              <MessageLoading loadingIndicatorStyle={loadingIndicatorStyle} />
            ) : messages.length === 0 ? (
              <EmptyMessagesScreen />
            ) : (
              <FlashList
                ref={messageListRef}
                data={groupedMessages}
                renderItem={renderMessageGroup}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.messagesList}
                // When user scrolls near top, load older messages
                onScroll={({ nativeEvent }) => {
                  if (
                    nativeEvent.contentOffset.y <= 20 &&
                    !isLoadingMore &&
                    !allMessagesLoaded &&
                    messages.length > 0
                  ) {
                    handleLoadMore();
                  }
                }}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                drawDistance={300}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                // Show loading more at top or 'all loaded' banner
                ListHeaderComponent={
                  isLoadingMore ? (
                    <LoadMoreHeader />
                  ) : allMessagesLoaded && messages.length > 0 ? (
                    <AllMessagesLoaded />
                  ) : null
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.2}
                // Maintain scroll position when older messages prepend
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 20,
                }}
                // Scroll to bottom on initial load
                onContentSizeChange={() => {
                  if (!firstLoadRef.current) {
                    firstLoadRef.current = true;
                    messageListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
              />
            )}
          </Animated.View>
        </View>

        {/* Message input area */}
        <Animated.View
          style={[
            styles.inputAreaContainer,
            {
              paddingBottom: keyboardHeight > 0 ? 5 : Math.max(insets.bottom, 10) + 50,
            },
            keyboardStyle,
          ]}
          entering={SlideInUp.springify()}
        >
          <MessageInputArea
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={() => {
              // Send the message first
              sendMessage();

              // Then scroll to bottom with a small delay to allow rendering
              setTimeout(() => {
                if (messageListRef.current) {
                  messageListRef.current.scrollToEnd({ animated: true });
                }
              }, 300);
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            messageListRef={messageListRef}
          />
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Ministry info panel */}
      <MinistryInfoPanel
        ministry={ministry}
        isMember={isMember}
        infoSlideAnim={infoSlideAnim}
        SCREEN_WIDTH={SCREEN_WIDTH}
        infoSlideStyle={infoSlideStyle}
        toggleMinistryInfo={toggleMinistryInfo}
        renderMinistryAvatar={() => renderMinistryAvatar(ministry)}
        handleLeaveMinistry={handleLeaveMinistry}
        visible={showMinistryInfo}
      />
    </SafeAreaView>
  );
}
