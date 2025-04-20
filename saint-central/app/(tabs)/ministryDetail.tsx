import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  AppState,
  AppStateStatus,
  Keyboard,
  Vibration,
  Pressable,
  Dimensions,
  TouchableWithoutFeedback,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../supabaseClient";
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolate,
  runOnJS,
  SlideInRight,
  SlideOutRight,
  FadeIn,
  FadeOut,
  ZoomIn,
  BounceIn,
  useAnimatedScrollHandler,
  useDerivedValue,
  Layout,
  Easing,
} from "react-native-reanimated";
import { PanGestureHandler, Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import theme from "../../theme";

// Animated variations of components
const AnimatedFlashList = Animated.createAnimatedComponent(FlatList);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Interface definitions
interface Ministry {
  id: number;
  church_id: number;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

interface MinistryMember {
  id: number;
  ministry_id: number;
  user_id: string;
  church_id: number;
  joined_at: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  profile_image?: string;
}

interface Message {
  id: number | string;
  ministry_id: number;
  user_id: string;
  sent_at: string;
  message_text: string;
  attachment_url?: string;
  user?: User;
  _status: "sending" | "sent" | "error";
}

// AsyncStorage keys for caching
const MEMBERSHIP_CACHE_KEY = (ministryId: number, userId: string) =>
  `ministry_membership_${ministryId}_${userId}`;
const MINISTRY_CACHE_KEY = (ministryId: number) => `ministry_details_${ministryId}`;
const MESSAGES_CACHE_KEY = (ministryId: number) => `ministry_messages_${ministryId}`;

// Time formatting functions
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // If within the last week, return day name
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  // Otherwise return date
  return date.toLocaleDateString([], { month: "numeric", day: "numeric" });
};

const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatMessageDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // Return date
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

// Avatar utilities
const AVATAR_COLORS = [
  theme.primary,
  theme.secondary,
  theme.tertiary,
  theme.accent1,
  theme.accent2,
  theme.accent3,
  theme.accent4,
];

const getAvatarColor = (name: string): string => {
  if (!name) return AVATAR_COLORS[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const getInitials = (name: string): string => {
  if (!name) return "?";

  const words = name.split(" ");
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// Create a memoized message component with Reanimated
const MessageItem = ({
  message,
  isCurrentUser,
  renderUserAvatar,
  index,
}: {
  message: Message;
  isCurrentUser: boolean;
  renderUserAvatar: (user?: User) => JSX.Element;
  index: number;
}) => {
  const isSending = message._status === "sending";
  const isError = message._status === "error";

  // Animated bubble styles
  const bubbleStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 300 }),
      transform: [
        {
          translateY: withTiming(0, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
        },
      ],
    };
  });

  return (
    <Animated.View
      entering={SlideInRight.duration(300)
        .delay(index * 50)
        .springify()}
      layout={Layout.springify()}
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
    >
      {!isCurrentUser && <View style={styles.messageAvatar}>{renderUserAvatar(message.user)}</View>}

      <Animated.View
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isSending && styles.sendingMessage,
          isError && styles.errorMessage,
          bubbleStyle,
        ]}
      >
        {!isCurrentUser && (
          <Text style={styles.messageUsername}>
            {message.user ? `${message.user.first_name} ${message.user.last_name}` : "Unknown User"}
          </Text>
        )}

        <Text
          style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText,
          ]}
        >
          {message.message_text}
        </Text>

        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isCurrentUser && styles.currentUserMessageTime]}>
            {formatMessageTime(message.sent_at)}
          </Text>

          {isCurrentUser && (
            <View style={styles.messageStatus}>
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={isCurrentUser ? theme.neutral100 : theme.neutral400}
                  style={styles.statusIcon}
                />
              ) : isError ? (
                <TouchableOpacity onPress={() => Alert.alert("Message failed to send")}>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={theme.error}
                    style={styles.statusIcon}
                  />
                </TouchableOpacity>
              ) : (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={isCurrentUser ? theme.neutral100 : theme.primary}
                  style={styles.statusIcon}
                />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const MemoizedMessageItem = React.memo(MessageItem);

// Create a memoized date divider component with simplified rendering
const DateDivider = ({ date }: { date: string }) => (
  <View style={styles.dateDividerContainer}>
    <View style={styles.dateDividerLine} />
    <View style={styles.dateDividerTextContainer}>
      <Text style={styles.dateDividerText}>{formatMessageDate(date)}</Text>
    </View>
    <View style={styles.dateDividerLine} />
  </View>
);

const MemoizedDateDivider = React.memo(DateDivider);

// Create load more header component with Reanimated
const LoadingHeader = React.memo(() => (
  <View style={styles.loadMoreHeader}>
    <ActivityIndicator size="small" color={theme.primary} />
    <Text style={styles.loadMoreText}>Loading older messages...</Text>
  </View>
));

// Optimized Message Input Area Component
const InputArea = ({
  value,
  onChangeText,
  onSend,
  onFocus,
  onBlur,
  messageListRef,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onFocus: () => void;
  onBlur: () => void;
  messageListRef: React.RefObject<Animated.FlatList<any>>;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [inputHeight, setInputHeight] = useState(40);
  const inputLocalRef = useRef<TextInput>(null);

  // Animation value for send button
  const sendButtonScale = useSharedValue(1);

  // Animated styles for send button
  const sendButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sendButtonScale.value }],
    };
  });

  // Synchronize with parent state only when necessary
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(40, height), 120);
    setInputHeight(newHeight);
  };

  const handleLocalChange = (text: string) => {
    setLocalValue(text);
    // Update parent state directly, removing requestAnimationFrame
    onChangeText(text);
  };

  const handleSend = () => {
    if (!localValue.trim()) return;

    // Animate button press - simplified animation
    sendButtonScale.value = withSpring(0.9);
    setTimeout(() => {
      sendButtonScale.value = withSpring(1);
    }, 100);

    // Haptic feedback
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onSend();
    setLocalValue("");

    // Better focus management
    inputLocalRef.current?.focus();

    // Ensure we scroll to the bottom after sending
    setTimeout(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollToEnd({ animated: true });
      }
    }, 150);
  };

  // Always return the same JSX structure
  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity
        style={styles.attachButton}
        activeOpacity={0.7}
        onPress={() => {
          inputLocalRef.current?.focus();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
      </TouchableOpacity>

      <TextInput
        ref={inputLocalRef}
        style={[styles.messageInput, { height: inputHeight }]}
        placeholder="Type a message..."
        placeholderTextColor={theme.neutral400}
        value={localValue}
        onChangeText={handleLocalChange}
        onContentSizeChange={handleContentSizeChange}
        multiline
        maxLength={1000}
        onFocus={onFocus}
        onBlur={onBlur}
        blurOnSubmit={false}
        contextMenuHidden={false}
        keyboardType="default"
        textAlignVertical="center"
        autoCapitalize="sentences"
        returnKeyType="default"
        enablesReturnKeyAutomatically={false}
        selectionColor={theme.primary}
      />

      <Animated.View style={sendButtonStyle}>
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            !localValue.trim() && styles.sendButtonDisabled,
            pressed && localValue.trim() && styles.sendButtonPressed,
          ]}
          onPress={handleSend}
          disabled={!localValue.trim()}
        >
          <Ionicons
            name="paper-plane"
            size={20}
            color={localValue.trim() ? theme.neutral50 : theme.neutral400}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const MessageInputArea = React.memo(
  InputArea,
  (prevProps, nextProps) => prevProps.value === nextProps.value,
);

// Move this component outside the main function component (before or after)
const MinistryInfoPanel = ({
  ministry,
  isMember,
  infoSlideAnim,
  SCREEN_WIDTH,
  infoSlideStyle,
  toggleMinistryInfo,
  renderMinistryAvatar,
  handleLeaveMinistry,
  visible,
}: {
  ministry: Ministry | null;
  isMember: boolean;
  infoSlideAnim: Animated.SharedValue<number>;
  SCREEN_WIDTH: number;
  infoSlideStyle: any;
  toggleMinistryInfo: () => void;
  renderMinistryAvatar: () => React.ReactNode;
  handleLeaveMinistry: () => void;
  visible: boolean;
}) => {
  // Gesture handler for swiping panel
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX > 0) {
        const newValue = Math.max(0, 1 - e.translationX / SCREEN_WIDTH);
        infoSlideAnim.value = newValue;
      }
    })
    .onEnd((e) => {
      if (e.translationX > SCREEN_WIDTH * 0.4) {
        infoSlideAnim.value = withSpring(0);
        runOnJS(toggleMinistryInfo)();
      } else {
        infoSlideAnim.value = withSpring(1);
      }
    });

  return (
    <Animated.View
      style={[styles.ministryInfoPanel, infoSlideStyle, { display: visible ? "flex" : "none" }]}
    >
      <GestureDetector gesture={panGesture}>
        <View style={styles.ministryInfoContainer}>
          <View style={styles.ministryInfoHeader}>
            <TouchableOpacity
              style={styles.closeInfoButton}
              onPress={toggleMinistryInfo}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.ministryInfoTitle}>Ministry Details</Text>
          </View>

          <View style={styles.ministryInfoContent}>
            <Animated.View
              style={styles.ministryInfoAvatar}
              entering={BounceIn.delay(100).duration(600)}
            >
              {renderMinistryAvatar()}
            </Animated.View>

            <Animated.Text
              style={styles.ministryInfoName}
              entering={FadeIn.delay(300).duration(500)}
            >
              {ministry?.name}
            </Animated.Text>

            <Animated.Text
              style={styles.ministryInfoMembers}
              entering={FadeIn.delay(400).duration(500)}
            >
              {ministry?.member_count || 0} {ministry?.member_count === 1 ? "member" : "members"}
            </Animated.Text>

            <Animated.View
              style={styles.ministryInfoDescriptionContainer}
              entering={SlideInRight.delay(500).duration(500).springify()}
            >
              <Text style={styles.ministryInfoDescriptionTitle}>About</Text>
              <Text style={styles.ministryInfoDescription}>
                {ministry?.description || "No description available."}
              </Text>
            </Animated.View>

            {isMember && (
              <Animated.View entering={FadeIn.delay(600).duration(500)}>
                <TouchableOpacity
                  style={styles.leaveMinistryButton}
                  onPress={handleLeaveMinistry}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaveMinistryButtonText}>Leave Ministry</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

// Main component
export default function MinistryDetails(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const ministryId = typeof params.id === "string" ? parseInt(params.id) : 0;

  // Window dimensions for responsive design
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

  // State variables
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<MinistryMember[]>([]);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isMember, setIsMember] = useState<boolean>(false);
  // State to track pagination
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [allMessagesLoaded, setAllMessagesLoaded] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cachedMembershipChecked, setCachedMembershipChecked] = useState<boolean>(false);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [showMinistryInfo, setShowMinistryInfo] = useState<boolean>(false);
  const [recentlySentMessageIds, setRecentlySentMessageIds] = useState<Set<string | number>>(
    new Set(),
  );

  // ALL refs must be declared here
  const messageListRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  // Additional refs that might be needed - declare them all here
  const keyboardListenerRef = useRef<any>(null);
  const tempMessagesRef = useRef<any>(null);

  // Shared animation values with Reanimated
  const fadeAnim = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const infoSlideAnim = useSharedValue(0);
  const keyboardAnim = useSharedValue(0);
  const refreshAnim = useSharedValue(0);
  const loadMoreAnim = useSharedValue(0);

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

  // Loading animation styles moved here to ensure hooks run unconditionally
  const loadingIndicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: refreshAnim.value,
      transform: [{ rotate: `${refreshAnim.value * 360}deg` }],
    };
  });

  // Loading messages animation style moved here
  const loadMoreStyle = useAnimatedStyle(() => {
    return {
      opacity: loadMoreAnim.value,
    };
  });

  // Scroll handler for animations - simplified version
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      // Only update scrollY for header animations
      scrollY.value = event.contentOffset.y;
    },
  });

  // Separate function for handling scroll to load more
  const handleScroll = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;

      // Only attempt to load more if we're near the top, not already loading, and have more to load
      if (
        offsetY < 50 && // Increased threshold from 20 to 50 pixels
        !isLoadingMore &&
        !messageLoading &&
        !allMessagesLoaded &&
        messages.length >= 10 // Reduced threshold to trigger loading sooner
      ) {
        // Set loading state immediately to prevent multiple calls
        setIsLoadingMore(true);
        // Safe delay before actual loading
        setTimeout(() => {
          fetchMessages(true);
        }, 100);
      }
    },
    [isLoadingMore, messageLoading, allMessagesLoaded, messages.length],
  );

  // Function to load more messages - simplified
  const handleLoadMoreMessages = useCallback(() => {
    if (!isLoadingMore && !allMessagesLoaded && !messageLoading) {
      fetchMessages(true);
    }
  }, [isLoadingMore, allMessagesLoaded, messageLoading]);

  // Enhanced keyboard handling function
  const handleKeyboardAnimation = useCallback(() => {
    if (keyboardHeight > 0) {
      // When keyboard is open
      keyboardAnim.value = withTiming(1, { duration: 250 });

      // Ensure we scroll to bottom when keyboard appears
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (messageListRef.current && messages.length > 0) {
            messageListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      });
    } else {
      // When keyboard is closed
      keyboardAnim.value = withTiming(0, { duration: 200 });

      // Allow some time for the keyboard to fully hide before scrolling
      setTimeout(() => {
        if (messageListRef.current && messages.length > 0) {
          messageListRef.current.scrollToEnd({ animated: false });
        }
      }, 100);
    }
  }, [keyboardHeight, keyboardAnim, messages.length]);

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
  }, []);

  // Check cached membership status on initial load
  useEffect(() => {
    const checkCachedMembership = async () => {
      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("No user logged in or error:", userError);
          setCachedMembershipChecked(true);
          fetchData();
          return;
        }

        // Check cached membership status first
        const cachedMembership = await AsyncStorage.getItem(
          MEMBERSHIP_CACHE_KEY(ministryId, user.id),
        );

        if (cachedMembership) {
          try {
            const membershipData = JSON.parse(cachedMembership);
            const isUserMember = membershipData.isMember === true;

            // Set the membership status from cache
            setIsMember(isUserMember);
            console.log("Using cached membership status:", isUserMember);

            // If we have cached ministry data, use that too
            const cachedMinistry = await AsyncStorage.getItem(MINISTRY_CACHE_KEY(ministryId));

            if (cachedMinistry) {
              try {
                const ministryData = JSON.parse(cachedMinistry);
                setMinistry({
                  ...ministryData,
                  is_member: isUserMember,
                });
              } catch (e) {
                console.error("Error parsing cached ministry:", e);
              }
            }

            // If we have cached messages, use those too
            const cachedMessages = await AsyncStorage.getItem(MESSAGES_CACHE_KEY(ministryId));

            if (cachedMessages) {
              try {
                const messagesData = JSON.parse(cachedMessages);
                setMessages(messagesData);
              } catch (e) {
                console.error("Error parsing cached messages:", e);
              }
            }
          } catch (e) {
            console.error("Error parsing cached membership:", e);
          }
        }

        // Mark cached membership as checked
        setCachedMembershipChecked(true);

        // Regardless of cached status, fetch fresh data
        fetchData();
      } catch (error) {
        console.error("Error checking cached membership:", error);
        // If there's an error, proceed to fetch data from server anyway
        setCachedMembershipChecked(true);
        fetchData();
      }
    };

    checkCachedMembership();

    // Animate content fade in with Reanimated
    fadeAnim.value = withTiming(1, { duration: 500 });
  }, [ministryId, fadeAnim]);

  // Set up real-time subscription to messages with better error handling
  useEffect(() => {
    let isComponentMounted = true;

    // Set up real-time subscription to messages
    const messageSubscription = supabase
      .channel("ministry_messages")
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
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          console.warn("Subscription status:", status);
        }
      });

    // Handle app going to background/foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("App has come to the foreground!");
        // App came to foreground, refresh messages and membership
        if (isComponentMounted) {
          fetchMessages();
          refreshMembershipStatus();
        }
      }

      appStateRef.current = nextAppState;
    };

    // Set up app state listener
    let appStateSubscription: any = null;
    if (Platform.OS !== "web" && AppState) {
      try {
        appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
      } catch (error) {
        console.log("AppState not available", error);
      }
    }

    // Enhanced keyboard event listeners
    let keyboardShowSubscription: any = null;
    let keyboardHideSubscription: any = null;

    // Set up keyboard listeners
    if (Keyboard) {
      keyboardShowSubscription = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
        (e) => {
          setIsInputFocused(true);
          setKeyboardHeight(e.endCoordinates.height);

          // Improved timing for scroll animation
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

          // Allow some time for the keyboard to fully hide before scrolling
          setTimeout(() => {
            if (messageListRef.current && messages.length > 0) {
              messageListRef.current.scrollToEnd({ animated: false });
            }
          }, 100);
        },
      );
    }

    // Handle keyboard animation when component mounts
    handleKeyboardAnimation();

    // Clean up all subscriptions and listeners
    return () => {
      isComponentMounted = false;

      try {
        supabase.removeChannel(messageSubscription);
      } catch (error) {
        console.error("Error removing subscription:", error);
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
  }, [handleKeyboardAnimation]);

  // Use effect for screen focus - load data
  useEffect(() => {
    console.log("Screen focused, loading fresh data");
    // Reset pagination state
    setOldestMessageTimestamp(null);
    setAllMessagesLoaded(false);
    // Fetch fresh data
    fetchData();
  }, [ministryId]);

  // Toggle ministry info panel with Reanimated
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

  // Function to refresh membership status - both from server and update cache
  async function refreshMembershipStatus(): Promise<void> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user for membership refresh:", userError);
        return;
      }

      // Get membership status directly with a specific query
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("id, role")
        .eq("ministry_id", ministryId)
        .eq("user_id", user.id)
        .eq("role", "member")
        .maybeSingle();

      // Update membership status based on direct query
      const isUserMember = !membershipError && membershipData !== null;

      // Cache the membership status
      await AsyncStorage.setItem(
        MEMBERSHIP_CACHE_KEY(ministryId, user.id),
        JSON.stringify({
          isMember: isUserMember,
          lastChecked: new Date().toISOString(),
          role: membershipData?.role || null,
        }),
      );

      // Only update if there's a change to avoid unnecessary re-renders
      if (isUserMember !== isMember) {
        console.log("Membership status changed, updating UI...");
        setIsMember(isUserMember);

        // Update ministry state if available
        if (ministry) {
          const updatedMinistry = {
            ...ministry,
            is_member: isUserMember,
          };
          setMinistry(updatedMinistry);

          // Update ministry cache
          await AsyncStorage.setItem(
            MINISTRY_CACHE_KEY(ministryId),
            JSON.stringify(updatedMinistry),
          );
        }
      }
    } catch (error) {
      console.error("Error refreshing membership status:", error);
    }
  }

  // Fetch all necessary data
  async function fetchData(): Promise<void> {
    try {
      if (!cachedMembershipChecked) {
        // Wait for cached membership check to complete first
        return;
      }

      setLoading(true);
      // Start refresh animation
      refreshAnim.value = withRepeat(withTiming(1, { duration: 700 }), -1, false);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        console.error("No user logged in");
        throw new Error("No user logged in");
      }

      // Fetch the current user's profile
      const { data: userData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        // Continue anyway as we can still show the ministry
      } else {
        setCurrentUser(userData);
      }

      // Fetch ministry details
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministries")
        .select("*")
        .eq("id", ministryId)
        .single();

      if (ministryError) {
        console.error("Error fetching ministry data:", ministryError);
        throw ministryError;
      }

      // Verify membership status directly from the database
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("id, role")
        .eq("ministry_id", ministryId)
        .eq("user_id", user.id)
        .eq("role", "member")
        .maybeSingle();

      // Set membership status based on direct query
      const isUserMember = !membershipError && membershipData !== null;

      // Update membership cache
      await AsyncStorage.setItem(
        MEMBERSHIP_CACHE_KEY(ministryId, user.id),
        JSON.stringify({
          isMember: isUserMember,
          lastChecked: new Date().toISOString(),
          role: membershipData?.role || null,
        }),
      );

      setIsMember(isUserMember);

      // Fetch ministry members for member count
      const { data: membersData, error: membersError } = await supabase
        .from("ministry_members")
        .select("*")
        .eq("ministry_id", ministryId)
        .eq("role", "member");

      if (membersError) {
        console.error("Error fetching ministry members:", membersError);
        // Continue anyway as we can still show the ministry with estimated count
      } else {
        setMembers(membersData || []);
      }

      // Update ministry with member count and membership status
      const updatedMinistry = {
        ...ministryData,
        member_count: membersData?.length || 0,
        is_member: isUserMember,
      };

      setMinistry(updatedMinistry);

      // Update ministry cache
      await AsyncStorage.setItem(MINISTRY_CACHE_KEY(ministryId), JSON.stringify(updatedMinistry));

      // Fetch messages
      await fetchMessages();
    } catch (error) {
      console.error("Error in data fetch:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      // Stop refresh animation
      refreshAnim.value = withTiming(0, { duration: 300 });
      setLoading(false);
    }
  }

  // Optimized message fetching with pagination and cache - completely rewritten for stability
  async function fetchMessages(loadOlder: boolean = false): Promise<void> {
    try {
      // Prevent duplicate loading
      if (loadOlder && isLoadingMore) {
        console.log("Already loading older messages");
        return;
      }

      if (!loadOlder && messageLoading) {
        console.log("Already loading initial messages");
        return;
      }

      // Don't automatically assume all messages are loaded - removed allMessagesLoaded check

      // Set loading state
      if (loadOlder) {
        console.log("Setting isLoadingMore to true");
        setIsLoadingMore(true);
      } else {
        setMessageLoading(true);
      }

      console.log(
        `Fetching ${loadOlder ? "older" : "initial"} messages from timestamp: ${oldestMessageTimestamp || "none"}`,
      );

      // Get existing messages for reference
      const currentMessages = [...messages];

      try {
        // Build query
        let query = supabase
          .from("ministry_messages")
          .select("*")
          .eq("ministry_id", ministryId)
          .order("sent_at", { ascending: false })
          .limit(20); // Increased from 10 to 20 for better pagination

        // If loading older messages, use the oldest timestamp as reference
        if (loadOlder && oldestMessageTimestamp) {
          console.log(`Using timestamp for pagination: ${oldestMessageTimestamp}`);
          query = query.lt("sent_at", oldestMessageTimestamp);
        }

        // Execute the query
        const { data: messagesData, error: messagesError } = await query;

        // Handle errors
        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
          if (loadOlder) setIsLoadingMore(false);
          else setMessageLoading(false);
          return;
        }

        // Check if we got any messages
        if (!messagesData || messagesData.length === 0) {
          console.log("No messages found or reached the end");
          if (loadOlder) setAllMessagesLoaded(true);
          if (loadOlder) setIsLoadingMore(false);
          else setMessageLoading(false);
          return;
        }

        console.log(`Got ${messagesData.length} messages from server`);

        // Sort messages newest to oldest
        const sortedMessages = [...messagesData];

        // Update the oldest message timestamp for pagination
        if (sortedMessages.length > 0) {
          const oldestMessage = sortedMessages[sortedMessages.length - 1];
          console.log(`Setting new oldest timestamp: ${oldestMessage.sent_at}`);
          setOldestMessageTimestamp(oldestMessage.sent_at);
        }

        // Get user IDs from messages
        const userIds = [...new Set(messagesData.map((msg) => msg.user_id))];

        // Fetch user data if we have user IDs
        if (userIds.length > 0) {
          try {
            const { data: usersData } = await supabase.from("users").select("*").in("id", userIds);

            // Create user map
            const userMap: { [key: string]: User } = {};
            if (usersData) {
              usersData.forEach((user) => {
                userMap[user.id] = user;
              });
            }

            // Add users to state
            setUsers((prev) => ({ ...prev, ...userMap }));

            // Process messages with user data
            const processedMessages = sortedMessages
              .map((message) => ({
                ...message,
                user: userMap[message.user_id] || users[message.user_id],
                _status: "sent",
              }))
              .reverse(); // Reverse for chronological order

            // Update state with the processed messages
            if (loadOlder) {
              // Filter out duplicates for older messages
              const existingIds = new Set(currentMessages.map((msg) => msg.id));
              const uniqueMessages = processedMessages.filter((msg) => !existingIds.has(msg.id));

              console.log(`Adding ${uniqueMessages.length} new messages to the beginning`);

              if (uniqueMessages.length === 0) {
                // No new unique messages found
                // Don't mark as all loaded yet, might be a temporary issue
                // Only set allMessagesLoaded if we got fewer than the max messages
                if (sortedMessages.length < 20) {
                  console.log(
                    "No new unique messages and got fewer than requested, marking as all loaded",
                  );
                  setAllMessagesLoaded(true);
                } else {
                  // We need to adjust the timestamp to skip duplicates
                  console.log(
                    "Got duplicates but full batch size - adjusting timestamp and trying again",
                  );
                  if (oldestMessageTimestamp) {
                    const adjustedDate = new Date(oldestMessageTimestamp);
                    adjustedDate.setMilliseconds(adjustedDate.getMilliseconds() - 10); // Go back 10ms to avoid timestamp collision
                    setOldestMessageTimestamp(adjustedDate.toISOString());
                  }
                }
                setIsLoadingMore(false);
              } else {
                // Update state with new messages at the beginning
                setMessages((prev) => {
                  const newMessages = [...uniqueMessages, ...prev];

                  // Update cache after state update
                  AsyncStorage.setItem(
                    MESSAGES_CACHE_KEY(ministryId),
                    JSON.stringify(newMessages),
                  ).catch((err) => console.error("Cache error:", err));

                  return newMessages;
                });

                // If we got fewer messages than the limit, we might be at the end
                if (sortedMessages.length < 20) {
                  console.log("Got fewer messages than requested limit, likely at the end");
                  setAllMessagesLoaded(true);
                }

                // Reset loading state after successful update
                setTimeout(() => {
                  setIsLoadingMore(false);
                }, 300);
              }
            } else {
              // For initial load, just replace all messages
              setMessages(processedMessages);

              // Reset allMessagesLoaded for initial load
              setAllMessagesLoaded(false);

              // Update cache
              AsyncStorage.setItem(
                MESSAGES_CACHE_KEY(ministryId),
                JSON.stringify(processedMessages),
              ).catch((err) => console.error("Cache error:", err));

              // Reset loading state and scroll to bottom
              setTimeout(() => {
                setMessageLoading(false);
                if (messageListRef.current) {
                  messageListRef.current.scrollToEnd({ animated: false });
                }
              }, 200);
            }
          } catch (userError) {
            console.error("Error fetching users:", userError);
            // Handle error case
            if (loadOlder) setIsLoadingMore(false);
            else setMessageLoading(false);
          }
        } else {
          // No user IDs, just process messages
          const simpleMessages = sortedMessages
            .map((message) => ({
              ...message,
              _status: "sent",
            }))
            .reverse();

          if (loadOlder) {
            // Add to beginning after filtering duplicates
            const existingIds = new Set(currentMessages.map((msg) => msg.id));
            const uniqueMessages = simpleMessages.filter((msg) => !existingIds.has(msg.id));

            if (uniqueMessages.length > 0) {
              setMessages((prev) => [...uniqueMessages, ...prev]);

              // Only mark all loaded if we got fewer than requested
              if (sortedMessages.length < 20) {
                setAllMessagesLoaded(true);
              }
            } else if (sortedMessages.length < 20) {
              setAllMessagesLoaded(true);
            }

            setIsLoadingMore(false);
          } else {
            // Replace all
            setMessages(simpleMessages);
            setAllMessagesLoaded(false);
            setMessageLoading(false);
          }
        }
      } catch (innerError) {
        console.error("Error in message processing:", innerError);
        if (loadOlder) setIsLoadingMore(false);
        else setMessageLoading(false);
      }
    } catch (error) {
      console.error("Error in fetchMessages:", error);
      if (loadOlder) setIsLoadingMore(false);
      else setMessageLoading(false);
    }
  }

  // Safe helper for handling older messages
  const handleOlderMessages = (newMessages: Message[], currentMessages: Message[]) => {
    try {
      // Check for duplicate messages
      const existingIds = new Set(currentMessages.map((msg) => msg.id));
      const uniqueNewMessages = newMessages.filter((msg) => !existingIds.has(msg.id));

      if (uniqueNewMessages.length === 0) {
        console.log("No new unique messages found");
        setAllMessagesLoaded(true);
        setIsLoadingMore(false);
        return;
      }

      console.log(`Adding ${uniqueNewMessages.length} older messages`);

      // Update messages with a delay
      setTimeout(() => {
        setMessages((prev) => {
          const updatedMessages = [...uniqueNewMessages, ...prev];

          // Cache messages
          AsyncStorage.setItem(
            MESSAGES_CACHE_KEY(ministryId),
            JSON.stringify(updatedMessages),
          ).catch((err) => console.error("Cache error:", err));

          return updatedMessages;
        });

        // Clear loading state after update
        setIsLoadingMore(false);
      }, 300);
    } catch (error) {
      console.error("Error handling older messages:", error);
      setIsLoadingMore(false);
    }
  };

  // Safe helper for handling initial messages
  const handleInitialMessages = (messages: Message[]) => {
    try {
      // Set initial messages
      setMessages(messages);

      // Cache messages
      AsyncStorage.setItem(MESSAGES_CACHE_KEY(ministryId), JSON.stringify(messages)).catch((err) =>
        console.error("Cache error:", err),
      );

      // Clear loading state after update
      setTimeout(() => {
        setMessageLoading(false);

        // Safely scroll to bottom
        setTimeout(() => {
          if (messageListRef.current) {
            messageListRef.current.scrollToEnd({ animated: false });
          }
        }, 50);
      }, 300);
    } catch (error) {
      console.error("Error handling initial messages:", error);
      setMessageLoading(false);
    }
  };

  // Improved fetchUserForMessage to handle real-time updates
  async function fetchUserForMessage(message: Message): Promise<void> {
    try {
      // Even more thorough duplicate detection
      // 1. Check recentlySentMessageIds
      // 2. Check existing message IDs
      // 3. Check for temp messages with the same content
      const isExactDuplicate = messages.some((m) => m.id === message.id);
      const isContentDuplicate = messages.some(
        (m) =>
          m.message_text === message.message_text &&
          m.user_id === message.user_id &&
          Math.abs(new Date(m.sent_at).getTime() - new Date(message.sent_at).getTime()) < 5000,
      );

      const isDuplicate =
        recentlySentMessageIds.has(message.id) || isExactDuplicate || isContentDuplicate;

      if (isDuplicate) {
        console.log("Skipping duplicate message:", message.id);
        return;
      }

      // Check if we already have the user
      const existingUser = users[message.user_id];

      let userToAttach = existingUser;

      // If we don't have the user, fetch it
      if (!existingUser) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", message.user_id)
          .single();

        if (userError) {
          console.error("Error fetching user:", userError);
          // Continue with unknown user rather than failing
          userToAttach = {
            id: message.user_id,
            first_name: "Unknown",
            last_name: "User",
            email: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        } else {
          userToAttach = userData;
          // Update the users object separately to avoid unnecessary renders
          setUsers((prev) => ({
            ...prev,
            [userData.id]: userData,
          }));
        }
      }

      // Create new message with user data
      const newMessage = {
        ...message,
        user: userToAttach,
        _status: "sent" as "sending" | "sent" | "error",
      };

      // Update messages with the new message
      setMessages((prev) => {
        const updatedMessages = [...prev, newMessage];

        // Update cache after state is updated
        setTimeout(() => {
          AsyncStorage.setItem(
            MESSAGES_CACHE_KEY(ministryId),
            JSON.stringify(updatedMessages),
          ).catch((err) => console.error("Cache update error:", err));
        }, 0);

        return updatedMessages;
      });

      // Use haptic feedback for new message notification
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Improved scroll to bottom with new messages
      // Wait for state update to complete, then scroll
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (messageListRef.current) {
            messageListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      });
    } catch (error) {
      console.error("Error in fetchUserForMessage:", error);
    }
  }

  // Function to trigger the ministry-notifications edge function with specific message ID
  async function triggerNotificationsEdgeFunction(messageId: number): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke("ministry-notifications", {
        method: "POST",
        body: {
          source: "app",
          ministryId: ministryId,
          messageId: messageId, // Pass the specific message ID
        },
      });

      if (error) {
        console.error("Error triggering notifications edge function:", error);
      } else {
        console.log("Notifications edge function triggered for message:", messageId, data);
      }
    } catch (error) {
      console.error("Exception triggering notifications edge function:", error);
    }
  }

  // Improved send message function with temporary state handling and notification
  async function sendMessage(): Promise<void> {
    if (!newMessage.trim() || !isMember) return;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Auth error when sending message:", authError);
        Alert.alert("Error", "You need to be logged in to send messages");
        return;
      }

      // Store the message text and clear input immediately
      const messageText = newMessage.trim();
      setNewMessage("");

      // Generate a unique temporary ID
      const tempId = `temp-${Date.now()}`;

      // Create temporary message with current timestamp
      const now = new Date().toISOString();
      const tempMessage = {
        id: tempId,
        ministry_id: ministryId,
        user_id: user.id,
        sent_at: now,
        message_text: messageText,
        user: currentUser || undefined,
        _status: "sending" as "sending" | "sent" | "error",
      };

      // Add message to state optimistically
      setMessages((prev) => [...prev, tempMessage]);

      // Use haptic feedback
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Scroll to bottom after adding the message with smooth animation
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 50);

      // Send message to server
      const { data, error } = await supabase
        .from("ministry_messages")
        .insert({
          ministry_id: ministryId,
          user_id: user.id,
          message_text: messageText,
          push_sent: false, // Setting to false so the edge function can handle it
        })
        .select();

      if (error) {
        console.error("Error sending message:", error);

        // Haptic feedback for error
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }

        // Update message status to error
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, _status: "error" } : msg)),
        );

        // Update cache with the error status
        const updatedMessages = messages.map((msg) =>
          msg.id === tempId ? { ...msg, _status: "error" } : msg,
        );

        AsyncStorage.setItem(MESSAGES_CACHE_KEY(ministryId), JSON.stringify(updatedMessages)).catch(
          (err) => console.error("Cache update error:", err),
        );
      } else if (data && data[0]) {
        // Haptic feedback for success
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Add the server-generated ID to our recently sent list to prevent duplicates
        setRecentlySentMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(data[0].id);
          // Clean up old IDs after 5 seconds to prevent the set from growing too large
          setTimeout(() => {
            setRecentlySentMessageIds((current) => {
              const updatedSet = new Set(current);
              updatedSet.delete(data[0].id);
              return updatedSet;
            });
          }, 5000);
          return newSet;
        });

        // Replace temporary message with actual message from server
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...data[0], user: currentUser, _status: "sent" } : msg,
          ),
        );

        // Update cache with the sent message
        const updatedMessages = messages.map((msg) =>
          msg.id === tempId ? { ...data[0], user: currentUser, _status: "sent" } : msg,
        );

        AsyncStorage.setItem(MESSAGES_CACHE_KEY(ministryId), JSON.stringify(updatedMessages)).catch(
          (err) => console.error("Cache update error:", err),
        );

        // Trigger notification for the specific message that was just sent
        if (ministry?.name && data[0].id) {
          try {
            // Pass the specific message ID to the edge function
            await triggerNotificationsEdgeFunction(data[0].id);
          } catch (notifError) {
            console.error("Error triggering notification:", notifError);
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }

  // Leave a ministry with improved error handling and animation
  async function handleLeaveMinistry(): Promise<void> {
    Alert.alert("Leave Ministry", "Are you sure you want to leave this ministry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

            // Start leave animation
            refreshAnim.value = withRepeat(withTiming(1, { duration: 700 }), -1, false);

            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
              console.error("Auth error when leaving ministry:", authError);
              Alert.alert("Error", "Authentication error. Please try again.");
              return;
            }

            const { error } = await supabase
              .from("ministry_members")
              .delete()
              .eq("ministry_id", ministryId)
              .eq("user_id", user.id);

            if (error) {
              console.error("Error leaving ministry:", error);
              Alert.alert("Error", "Could not leave the ministry. Please try again.");
              return;
            }

            // Haptic feedback for successful leave
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // Update local state and cache
            setIsMember(false);

            if (ministry) {
              const updatedMinistry = {
                ...ministry,
                is_member: false,
                member_count: (ministry.member_count || 1) - 1,
              };

              setMinistry(updatedMinistry);

              // Update ministry cache
              await AsyncStorage.setItem(
                MINISTRY_CACHE_KEY(ministryId),
                JSON.stringify(updatedMinistry),
              );
            }

            // Update membership cache
            await AsyncStorage.setItem(
              MEMBERSHIP_CACHE_KEY(ministryId, user.id),
              JSON.stringify({
                isMember: false,
                lastChecked: new Date().toISOString(),
                role: null,
              }),
            );

            Alert.alert("Success", "You have left the ministry");

            // Animate exit before navigation
            fadeAnim.value = withTiming(0, { duration: 300 });
            setTimeout(() => {
              router.push("/(tabs)/MinistriesScreen");
            }, 300);
          } catch (error) {
            console.error("Error in handleLeaveMinistry:", error);
            Alert.alert("Error", "Could not leave the ministry. Please try again.");
          } finally {
            refreshAnim.value = withTiming(0, { duration: 300 });
            setLoading(false);
          }
        },
      },
    ]);
  }

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

  // Render ministry avatar
  const renderMinistryAvatar = () => {
    if (ministry?.image_url) {
      return <Image source={{ uri: ministry.image_url }} style={styles.ministryAvatarImage} />;
    }

    // Placeholder with initials
    const avatarColor = getAvatarColor(ministry?.name || "");
    const initials = getInitials(ministry?.name || "");

    return (
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.ministryAvatarPlaceholder}
      >
        <Text style={styles.ministryAvatarInitials}>{initials}</Text>
      </LinearGradient>
    );
  };

  // Render user avatar for messages
  const renderUserAvatar = (user?: User) => {
    if (user?.profile_image) {
      return <Image source={{ uri: user.profile_image }} style={styles.userAvatarImage} />;
    }

    // Placeholder with initials
    const name = user ? `${user.first_name} ${user.last_name}` : "";
    const avatarColor = getAvatarColor(name);
    const initials = getInitials(name);

    return (
      <LinearGradient
        colors={[avatarColor, avatarColor === theme.primary ? theme.secondary : theme.primary]}
        style={styles.userAvatarPlaceholder}
      >
        <Text style={styles.userAvatarInitials}>{initials}</Text>
      </LinearGradient>
    );
  };

  // Group messages by date - memoize to prevent unnecessary calculations
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];

    // Create a Set to track seen message IDs
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

  // Render message group with optimized performance
  const renderMessageGroup = useCallback(
    ({ item }: { item: { date: string; messages: Message[] }; index: number }) => (
      <View key={item.date}>
        <MemoizedDateDivider date={item.date} />
        {item.messages.map((message) => (
          <View key={`msg-${message.id}`}>
            <MemoizedMessageItem
              message={message}
              isCurrentUser={message.user_id === currentUser?.id}
              renderUserAvatar={renderUserAvatar}
              index={0} // Remove index-based animations
            />
          </View>
        ))}
      </View>
    ),
    [currentUser, renderUserAvatar],
  );

  // Keyextractor for the FlatList
  const keyExtractor = useCallback(
    (item: { date: string; messages: Message[] }) =>
      `group-${item.date}-${item.messages[0]?.id || "no-msgs"}`,
    [],
  );

  // Memoized message input component - add back with simplified implementation
  const messageInputComponent = useMemo(() => {
    return (
      <MessageInputArea
        value={newMessage}
        onChangeText={setNewMessage}
        onSend={sendMessage}
        onFocus={() => {
          setIsInputFocused(true);
          // Simplified scrolling logic
          setTimeout(() => {
            if (messageListRef.current) {
              messageListRef.current.scrollToEnd({ animated: false });
            }
          }, 50);
        }}
        onBlur={() => setIsInputFocused(false)}
        messageListRef={messageListRef}
      />
    );
  }, [newMessage, sendMessage]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={loadingIndicatorStyle}>
          <ActivityIndicator size="large" color={theme.primary} />
        </Animated.View>
        <Animated.Text entering={FadeIn.duration(400)} style={styles.loadingText}>
          Loading ministry chat...
        </Animated.Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Animated.View style={[styles.errorContainer, fadeStyle]} entering={FadeIn.duration(500)}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load ministry information"}
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={navigateBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </Animated.View>
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
          <View style={styles.headerAvatar}>{renderMinistryAvatar()}</View>
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

      {/* Improved keyboard handling with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }} // REMOVED marginBottom
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        // REMOVED keyboardVerticalOffset
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
              <Animated.View
                style={[styles.messageLoadingContainer, loadingIndicatorStyle]}
                entering={FadeIn.duration(400)}
              >
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.messageLoadingText}>Loading messages...</Text>
              </Animated.View>
            ) : messages.length === 0 ? (
              <Animated.View style={styles.emptyMessagesContainer} entering={FadeIn.duration(600)}>
                <LinearGradient colors={theme.gradientPrimary} style={styles.emptyMessagesIcon}>
                  <FontAwesome5 name="comment-dots" size={40} color={theme.neutral50} />
                </LinearGradient>
                <Text style={styles.emptyMessagesTitle}>No Messages Yet</Text>
                <Text style={styles.emptyMessagesSubtitle}>
                  Be the first to start a conversation!
                </Text>
              </Animated.View>
            ) : (
              <FlatList
                ref={messageListRef}
                data={groupedMessages}
                renderItem={renderMessageGroup}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.messagesList}
                onScroll={(e) => {
                  // Just update scroll position for header opacity
                  const nativeEvent = e.nativeEvent;
                  scrollY.value = nativeEvent.contentOffset.y;

                  // Check for scroll position to load more - IMPROVED DETECTION
                  // For older messages, we need to check when scrolling near the top
                  if (
                    nativeEvent.contentOffset.y < 50 && // Increased threshold to 50
                    !isLoadingMore &&
                    !allMessagesLoaded &&
                    messages.length >= 10 && // Reduced threshold to load more sooner
                    !messageLoading
                  ) {
                    console.log("Near top of list, loading older messages...");
                    // Set loading state and fetch older messages
                    setIsLoadingMore(true);
                    // Use requestAnimationFrame for smoother performance
                    requestAnimationFrame(() => {
                      fetchMessages(true).catch((err) => {
                        console.error("Error loading older messages:", err);
                        // Reset loading state on error
                        setIsLoadingMore(false);
                      });
                    });
                  }
                }}
                scrollEventThrottle={200} // Less frequent checks for better performance
                bounces={true}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                initialNumToRender={10} // Reduced to improve initial load time
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
                ListHeaderComponent={
                  <>
                    {isLoadingMore && (
                      <View style={styles.loadMoreHeader}>
                        <ActivityIndicator size="small" color={theme.primary} />
                        <Text style={styles.loadMoreText}>Loading messages...</Text>
                      </View>
                    )}
                    {/* Debug info to help diagnose message loading issues */}
                    {__DEV__ && (
                      <View style={styles.debugInfoContainer}>
                        <Text style={styles.debugInfoText}>
                          Messages: {messages.length} | Loading: {isLoadingMore ? "Yes" : "No"} |
                          All loaded: {allMessagesLoaded ? "Yes" : "No"}
                        </Text>
                        <Text style={styles.debugInfoText}>
                          Oldest timestamp:{" "}
                          {oldestMessageTimestamp
                            ? new Date(oldestMessageTimestamp).toLocaleTimeString()
                            : "None"}
                        </Text>
                        <TouchableOpacity
                          style={{
                            marginTop: 4,
                            backgroundColor: theme.primary,
                            padding: 4,
                            borderRadius: 4,
                          }}
                          onPress={() => {
                            setAllMessagesLoaded(false);
                            fetchMessages(true);
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 10, textAlign: "center" }}>
                            Force Load More
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                }
              />
            )}
          </Animated.View>
        </View>
        {/* Input area moved inside KeyboardAvoidingView */}
        <View
          style={[
            styles.inputAreaContainer,
            {
              // Conditional padding: slightly reduced values
              paddingBottom: keyboardHeight > 0 ? 5 : Math.max(insets.bottom, 10) + 50,
            },
          ]}
        >
          {messageInputComponent}
        </View>
      </KeyboardAvoidingView>

      {/* Sliding Ministry Info Panel */}
      <MinistryInfoPanel
        ministry={ministry}
        isMember={isMember}
        infoSlideAnim={infoSlideAnim}
        SCREEN_WIDTH={SCREEN_WIDTH}
        infoSlideStyle={infoSlideStyle}
        toggleMinistryInfo={toggleMinistryInfo}
        renderMinistryAvatar={renderMinistryAvatar}
        handleLeaveMinistry={handleLeaveMinistry}
        visible={showMinistryInfo} // Pass visibility as a prop instead of conditional rendering
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 90 : 60,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    ...theme.shadowLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingTop: Platform.OS === "ios" ? 40 : 16,
    paddingBottom: 10,
    backgroundColor: theme.neutral50,
    zIndex: 10,
    ...theme.shadowLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.neutral100,
  },
  ministryTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingS,
    borderRadius: theme.radiusMedium,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    marginRight: theme.spacingM,
    overflow: "hidden",
    backgroundColor: theme.neutral200,
    ...theme.shadowLight,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: theme.fontSemiBold,
    color: theme.neutral900,
  },
  memberCount: {
    fontSize: 12,
    color: theme.neutral600,
    marginTop: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.neutral100,
  },
  chatContainer: {
    flex: 1,
    position: "relative",
    flexDirection: "column",
  },
  messagesContainer: {
    flex: 1,
    padding: theme.spacingS,
    paddingBottom: 0,
  },
  messagesContainerWithKeyboard: {
    paddingBottom: 0,
  },
  messagesList: {
    paddingVertical: theme.spacingM,
    paddingBottom: theme.spacingM, // Larger padding to keep last message above input
  },
  messageLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageLoadingText: {
    marginTop: theme.spacingM,
    fontSize: 16,
    color: theme.neutral600,
    fontWeight: theme.fontMedium,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacingXL,
  },
  emptyMessagesIcon: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing2XL,
    ...theme.shadowMedium,
  },
  emptyMessagesTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.neutral900,
    marginBottom: theme.spacingM,
  },
  emptyMessagesSubtitle: {
    fontSize: 16,
    color: theme.neutral600,
    textAlign: "center",
    lineHeight: 22,
  },
  dateDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacingL,
    paddingHorizontal: theme.spacingL,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.divider,
  },
  dateDividerTextContainer: {
    backgroundColor: theme.neutral100,
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingS,
    borderRadius: theme.radiusMedium,
    marginHorizontal: theme.spacingS,
    ...theme.shadowLight,
  },
  dateDividerText: {
    fontSize: 12,
    color: theme.neutral600,
    fontWeight: theme.fontMedium,
  },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: theme.spacingS,
  },
  currentUserMessage: {
    justifyContent: "flex-end",
  },
  otherUserMessage: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 34,
    height: 34,
    borderRadius: theme.radiusFull,
    marginRight: theme.spacingS,
    alignSelf: "flex-end",
    marginBottom: 6,
    ...theme.shadowLight,
  },
  userAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: theme.radiusFull,
  },
  userAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarInitials: {
    fontSize: 13,
    fontWeight: theme.fontBold,
    color: theme.neutral50,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
    borderRadius: theme.radiusLarge,
    marginBottom: 4,
  },
  currentUserBubble: {
    backgroundColor: theme.primary,
    borderBottomRightRadius: 4,
    ...theme.shadowLight,
  },
  otherUserBubble: {
    backgroundColor: theme.neutral50,
    borderBottomLeftRadius: 4,
    ...theme.shadowLight,
  },
  sendingMessage: {
    opacity: 0.7,
  },
  errorMessage: {
    borderWidth: 1,
    borderColor: theme.error,
  },
  messageUsername: {
    fontSize: 12,
    fontWeight: theme.fontBold,
    color: theme.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  currentUserMessageText: {
    color: theme.neutral50,
  },
  otherUserMessageText: {
    color: theme.neutral900,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    color: theme.neutral400,
  },
  currentUserMessageTime: {
    color: theme.neutral200,
  },
  messageStatus: {
    marginLeft: 4,
  },
  statusIcon: {
    marginLeft: 2,
  },
  inputAreaContainer: {
    backgroundColor: theme.neutral50,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
    paddingTop: theme.spacingS,
    minHeight: 70,
    ...theme.shadowMedium, // Keep shadow
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacingS,
    paddingHorizontal: theme.spacingM,
    backgroundColor: theme.neutral50,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.neutral100,
  },
  messageInput: {
    flex: 1,
    backgroundColor: theme.neutral100,
    borderRadius: 24,
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
    maxHeight: 120,
    fontSize: 16,
    color: theme.neutral900,
    borderWidth: 1,
    borderColor: theme.divider,
    textAlignVertical: "center",
    ...theme.shadowLight,
    marginHorizontal: theme.spacingS,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: theme.spacingS,
    ...theme.shadowLight,
  },
  sendButtonDisabled: {
    backgroundColor: theme.neutral300,
  },
  sendButtonPressed: {
    backgroundColor: theme.secondary,
    transform: [{ scale: 0.95 }],
  },
  ministryAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
  },
  ministryAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
  },
  ministryAvatarInitials: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.neutral50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
  },
  loadingText: {
    marginTop: theme.spacingL,
    fontSize: 18,
    color: theme.neutral600,
    fontWeight: theme.fontMedium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacingXL,
    backgroundColor: theme.pageBg,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.neutral900,
    marginTop: theme.spacingL,
    marginBottom: theme.spacingS,
  },
  errorText: {
    fontSize: 16,
    color: theme.neutral600,
    textAlign: "center",
    marginBottom: theme.spacing2XL,
  },
  errorButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacing2XL,
    paddingVertical: theme.spacingM,
    borderRadius: theme.radiusLarge,
    ...theme.shadowMedium,
  },
  errorButtonText: {
    color: theme.neutral50,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  // Style for the loading more indicator at the top
  loadMoreHeader: {
    padding: theme.spacingL,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: `${theme.primary}10`,
    borderRadius: theme.radiusMedium,
    margin: theme.spacingS,
  },
  loadMoreText: {
    marginLeft: theme.spacingS,
    fontSize: 14,
    color: theme.neutral600,
  },
  ministryInfoPanel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "85%",
    backgroundColor: theme.neutral50,
    zIndex: 1000,
    ...theme.shadowHeavy,
  },
  ministryInfoContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  ministryInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: theme.spacingM,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  closeInfoButton: {
    padding: theme.spacingS,
  },
  ministryInfoTitle: {
    flex: 1,
    marginLeft: theme.spacingS,
    fontSize: 18,
    fontWeight: theme.fontSemiBold,
    color: theme.neutral900,
    textAlign: "center",
  },
  ministryInfoContent: {
    flex: 1,
    padding: theme.spacing2XL,
    alignItems: "center",
  },
  ministryInfoAvatar: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    marginBottom: theme.spacingL,
    ...theme.shadowMedium,
  },
  ministryInfoName: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.neutral900,
    textAlign: "center",
    marginBottom: theme.spacingS,
  },
  ministryInfoMembers: {
    fontSize: 16,
    color: theme.neutral600,
    marginBottom: theme.spacing2XL,
  },
  ministryInfoDescriptionContainer: {
    width: "100%",
    padding: theme.spacingL,
    backgroundColor: theme.neutral100,
    borderRadius: theme.radiusLarge,
    marginBottom: theme.spacing3XL,
    ...theme.shadowLight,
  },
  ministryInfoDescriptionTitle: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.primary,
    marginBottom: theme.spacingS,
  },
  ministryInfoDescription: {
    fontSize: 15,
    color: theme.neutral700,
    lineHeight: 22,
  },
  leaveMinistryButton: {
    paddingHorizontal: theme.spacing2XL,
    paddingVertical: theme.spacingM,
    backgroundColor: `${theme.error}20`,
    borderRadius: theme.radiusLarge,
    borderWidth: 1,
    borderColor: `${theme.error}40`,
  },
  leaveMinistryButtonText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.error,
  },
  // Debug styles
  debugInfoContainer: {
    padding: 8,
    backgroundColor: "#333",
    margin: 4,
    borderRadius: 4,
  },
  debugInfoText: {
    color: "#fff",
    fontSize: 10,
  },
});
