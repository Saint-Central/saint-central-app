import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
} from "react-native";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import theme from "../../../theme";

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
} from "./components/LoadingStates";

// Hooks
import useMinistry from "./hooks/useMinistry";
import useMessages from "./hooks/useMessages";

// Utils
import { renderUserAvatar, renderMinistryAvatar } from "./utils/renderUtils";
import { styles } from "./styles";
import { Message, MessageGroup, User } from "./types";

// Animated variants of components
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Main component
export default function MinistryDetails(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const ministryId = typeof params.id === "string" ? parseInt(params.id) : 0;

  // Window dimensions for responsive design
  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [showMinistryInfo, setShowMinistryInfo] = useState<boolean>(false);

  // Use custom hooks
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
  } = useMessages(ministryId, currentUser);

  // Refs
  const messageListRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  const prevMinistryIdRef = useRef<number | null>(null);

  // Shared animation values
  const fadeAnim = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const infoSlideAnim = useSharedValue(0);
  const keyboardAnim = useSharedValue(0);
  const refreshAnim = useSharedValue(0);

  // Derived values
  const headerOpacity = useDerivedValue(() => {
    return interpolate(scrollY.value, [0, 80], [0, 1], Extrapolate.CLAMP);
  });

  const headerElevation = useDerivedValue(() => {
    return interpolate(scrollY.value, [0, 80], [0, 5], Extrapolate.CLAMP);
  });

  // Animated styles
  const fadeStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
    };
  });

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
      shadowOpacity: interpolate(headerOpacity.value, [0, 1], [0, 0.1]),
      elevation: headerElevation.value,
    };
  });

  const infoSlideStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(infoSlideAnim.value, [0, 1], [SCREEN_WIDTH, 0]),
        },
      ],
    };
  });

  const keyboardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: interpolate(keyboardAnim.value, [0, 1], [0, -keyboardHeight]) }],
    };
  });

  // Loading animation style
  const loadingIndicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: refreshAnim.value,
      transform: [{ rotate: `${refreshAnim.value * 360}deg` }],
    };
  });

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

    getCurrentUser();

    // Animate content fade in
    fadeAnim.value = withTiming(1, { duration: 500 });
  }, []);

  // Set up real-time subscription to messages
  useEffect(() => {
    console.log(`Setting up real-time subscription for ministry ${ministryId}`);

    // Prevent too many recreations
    if (prevMinistryIdRef.current === ministryId) {
      console.log(`Subscription already exists for ministry ${ministryId}, skipping setup`);
      return;
    }

    prevMinistryIdRef.current = ministryId;

    let isComponentMounted = true;
    let messageSubscription: any = null;
    let appStateSubscription: any = null;
    let keyboardShowSubscription: any = null;
    let keyboardHideSubscription: any = null;

    // Create a unique channel id for this subscription to avoid conflicts
    const channelId = `ministry_messages_${ministryId}_${Date.now()}`;

    // Set up real-time subscription to messages
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
            // Only update if component is still mounted
            fetchUserForMessage(payload.new as Message);
          }
        },
      )
      .subscribe();

    console.log(`Subscribed to channel ${channelId} for ministry ${ministryId}`);

    // Set up app state listener
    if (Platform.OS !== "web" && AppState) {
      try {
        appStateSubscription = AppState.addEventListener(
          "change",
          (nextAppState: AppStateStatus) => {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
              // App came to foreground, refresh messages and membership
              if (isComponentMounted) {
                console.log("App returned to foreground, refreshing data");
                fetchMessages();
                refreshMembershipStatus();
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

          // Scroll to bottom when keyboard appears
          setTimeout(
            () => {
              if (messageListRef.current && messages.length > 0) {
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

          // Allow some time for the keyboard to fully hide before scrolling
          setTimeout(() => {
            if (messageListRef.current && messages.length > 0) {
              messageListRef.current.scrollToEnd({ animated: false });
            }
          }, 100);
        },
      );
    }

    // Clean up all subscriptions and listeners
    return () => {
      console.log(`Cleaning up subscriptions for ministry ${ministryId}, channel ${channelId}`);
      isComponentMounted = false;

      // Clean up message subscription
      if (messageSubscription) {
        try {
          supabase.removeChannel(messageSubscription);
        } catch (error) {
          console.error("Error removing subscription:", error);
        }
      }

      // Clean up app state subscription
      if (appStateSubscription?.remove) {
        appStateSubscription.remove();
      }

      // Clean up keyboard subscriptions
      if (keyboardShowSubscription) {
        keyboardShowSubscription.remove();
      }

      if (keyboardHideSubscription) {
        keyboardHideSubscription.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ministryId]);

  // Load data when component mounts
  useEffect(() => {
    console.log(`Loading ministry details for ministry ID: ${ministryId}`);

    // Start refresh animation
    refreshAnim.value = withRepeat(withTiming(1, { duration: 700 }), -1, false);

    // Fetch ministry details
    fetchMinistryDetails();

    // We don't need to call fetchMessages here since we've added
    // a dedicated useEffect in the useMessages hook that handles
    // cache loading and network fetching appropriately

    // Stop refresh animation after loading
    return () => {
      console.log(`Cleaning up ministry data for ministry ID: ${ministryId}`);
      refreshAnim.value = withTiming(0, { duration: 300 });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ministryId]); // Only depend on ministryId

  // Toggle ministry info panel
  const toggleMinistryInfo = useCallback(() => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Toggle state and animate in a single operation
    setShowMinistryInfo((prev) => {
      // Animate info panel slide based on new state
      infoSlideAnim.value = withSpring(!prev ? 1 : 0);
      return !prev;
    });
  }, [infoSlideAnim]);

  // Navigate back with animation
  const navigateBack = useCallback(() => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate exit before navigation
    fadeAnim.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      router.push("/(tabs)/MinistriesScreen");
    }, 300);
  }, [router, fadeAnim]);

  // Handle leave ministry with animation
  const handleLeaveMinistry = useCallback(async () => {
    try {
      // Start animation
      refreshAnim.value = withRepeat(withTiming(1, { duration: 700 }), -1, false);

      // Leave ministry
      await leaveMinistry();

      // Animate exit before navigation
      fadeAnim.value = withTiming(0, { duration: 300 });
      setTimeout(() => {
        router.push("/(tabs)/MinistriesScreen");
      }, 300);
    } catch (error) {
      console.log("User cancelled or error:", error);
    } finally {
      // Stop animation
      refreshAnim.value = withTiming(0, { duration: 300 });
    }
  }, [leaveMinistry, refreshAnim, fadeAnim, router]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: MessageGroup[] = [];
    const seenMessageIds = new Set<string | number>();

    messages.forEach((message) => {
      // Skip duplicate messages
      if (seenMessageIds.has(message.id)) {
        return;
      }

      // Add ID to seen set
      seenMessageIds.add(message.id);

      const messageDate = new Date(message.sent_at).toDateString();

      // Find existing group or create new one
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
    ({ item }: { item: MessageGroup; index: number }) => (
      <View key={item.date}>
        <DateDivider date={item.date} />
        {item.messages.map((message, index) => (
          <View key={`msg-${message.id}`}>
            <MessageItem
              message={message}
              isCurrentUser={message.user_id === currentUser?.id}
              renderUserAvatar={renderUserAvatar}
              index={index}
            />
          </View>
        ))}
      </View>
    ),
    [currentUser],
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback(
    (item: MessageGroup) => `group-${item.date}-${item.messages[0]?.id || "no-msgs"}`,
    [],
  );

  // Handle loading more messages
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && !allMessagesLoaded && !messageLoading && messages.length > 0) {
      console.log(`Triggering load more with ${messages.length} messages loaded`);
      fetchMessages(true);
    } else {
      const reasons = [];
      if (isLoadingMore) reasons.push("already loading");
      if (allMessagesLoaded) reasons.push("all messages loaded");
      if (messageLoading) reasons.push("initial loading in progress");
      if (messages.length === 0) reasons.push("no messages");
      console.log(`Load more prevented: ${reasons.join(", ")}`);
    }
  }, [isLoadingMore, allMessagesLoaded, messageLoading, messages.length, fetchMessages]);

  // Render loading state
  if (loading) {
    return <LoadingScreen loadingIndicatorStyle={loadingIndicatorStyle} />;
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ErrorScreen error={error} fadeStyle={fadeStyle} navigateBack={navigateBack} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: 0 }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Floating header effect with BlurView */}
      <AnimatedBlurView style={[styles.floatingHeader, headerStyle]} intensity={85} tint="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ministryTitleContainer}
          onPress={toggleMinistryInfo}
          activeOpacity={0.7}
        >
          <View style={styles.headerAvatar}>{renderMinistryAvatar(ministry)}</View>
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
      </View>

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
            {messageLoading && messages.length === 0 ? (
              <MessageLoading loadingIndicatorStyle={loadingIndicatorStyle} />
            ) : messages.length === 0 ? (
              <EmptyMessagesScreen />
            ) : (
              <FlatList
                ref={messageListRef}
                data={groupedMessages}
                renderItem={renderMessageGroup}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.messagesList}
                onScroll={(e) => {
                  // Update scroll position for header opacity
                  scrollY.value = e.nativeEvent.contentOffset.y;

                  // Check if we should load more messages - only trigger when near the top
                  if (e.nativeEvent.contentOffset.y < 20 && messages.length > 0) {
                    console.log("Triggered load more from scroll (near top)");
                    handleLoadMore();
                  }
                }}
                onEndReached={() => {
                  // This is a backup for when the user scrolls to the bottom but has very few messages
                  // It only applies when scrolling down with few messages
                  if (
                    messages.length > 0 &&
                    messages.length < 10 &&
                    !isLoadingMore &&
                    !allMessagesLoaded
                  ) {
                    console.log("Triggered load more from onEndReached");
                    handleLoadMore();
                  }
                }}
                onEndReachedThreshold={0.1}
                scrollEventThrottle={200}
                bounces={true}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                updateCellsBatchingPeriod={100}
                windowSize={5}
                onContentSizeChange={() => {
                  if (messages.length > 0 && !isLoadingMore) {
                    setTimeout(() => {
                      if (messageListRef.current) {
                        messageListRef.current.scrollToEnd({ animated: false });
                      }
                    }, 100);
                  }
                }}
                ListHeaderComponent={isLoadingMore ? <LoadMoreHeader /> : null}
              />
            )}
          </Animated.View>
        </View>

        {/* Message input area */}
        <View
          style={[
            styles.inputAreaContainer,
            {
              paddingBottom: keyboardHeight > 0 ? 5 : Math.max(insets.bottom, 10) + 50,
            },
          ]}
        >
          <MessageInputArea
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={sendMessage}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            messageListRef={messageListRef}
          />
        </View>
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
