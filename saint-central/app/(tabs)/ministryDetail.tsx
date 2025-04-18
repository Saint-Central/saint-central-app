import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  AppState,
  AppStateStatus,
  Keyboard,
  Vibration,
  Pressable,
  Dimensions,
  TouchableWithoutFeedback,
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
import {
  scheduleLocalNotification,
  sendMinistryNotification,
  setupMinistryMessagesListener,
} from "../../utils/notifications";

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
  "#4A55A2", // Royal Blue
  "#7895CB", // Light Blue
  "#A0C49D", // Sage Green
  "#917FB3", // Lavender
  "#E4A5FF", // Light Purple
  "#5272F2", // Bright Blue
  "#FFA1CF", // Pink
  "#FFCF96", // Peach
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

// Create a memoized message component to improve performance
const MessageItem = ({
  message,
  isCurrentUser,
  renderUserAvatar,
}: {
  message: Message;
  isCurrentUser: boolean;
  renderUserAvatar: (user?: User) => JSX.Element;
}) => {
  const isSending = message._status === "sending";
  const isError = message._status === "error";

  return (
    <View
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
    >
      {!isCurrentUser && <View style={styles.messageAvatar}>{renderUserAvatar(message.user)}</View>}

      <View
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isSending && styles.sendingMessage,
          isError && styles.errorMessage,
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
                  color={isCurrentUser ? "#E0E0FF" : "#A3A3A3"}
                  style={styles.statusIcon}
                />
              ) : isError ? (
                <TouchableOpacity onPress={() => Alert.alert("Message failed to send")}>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color="#EF4444"
                    style={styles.statusIcon}
                  />
                </TouchableOpacity>
              ) : (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={isCurrentUser ? "#E0E0FF" : "#5B6EF5"}
                  style={styles.statusIcon}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const MemoizedMessageItem = React.memo(MessageItem);
MessageItem.displayName = "MessageItem";

// Create a memoized date divider component
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
DateDivider.displayName = "DateDivider";

// Create load more header component
const LoadingHeader = React.memo(() => (
  <View style={styles.loadMoreHeader}>
    <ActivityIndicator size="small" color="#5B6EF5" />
    <Text style={styles.loadMoreText}>Loading older messages...</Text>
  </View>
));
LoadingHeader.displayName = "LoadingHeader";

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
  messageListRef: React.RefObject<FlatList<any>>;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [inputHeight, setInputHeight] = useState(40);
  const inputLocalRef = useRef<TextInput>(null);

  // Synchronize with parent state only when necessary
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(40, height), 120);
    setInputHeight(newHeight);
  };

  const handleLocalChange = (text: string) => {
    setLocalValue(text);

    // Use requestAnimationFrame to avoid UI jank
    if (Platform.OS !== "web") {
      requestAnimationFrame(() => {
        onChangeText(text);
      });
    } else {
      onChangeText(text);
    }
  };

  const handleSend = () => {
    if (!localValue.trim()) return;

    if (Platform.OS === "ios" || Platform.OS === "android") {
      Vibration.vibrate(10);
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

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity
        style={styles.attachButton}
        activeOpacity={0.7}
        onPress={() => inputLocalRef.current?.focus()}
      >
        <Ionicons name="add-circle-outline" size={24} color="#5B6EF5" />
      </TouchableOpacity>

      <TextInput
        ref={inputLocalRef}
        style={[styles.messageInput, { height: inputHeight }]}
        placeholder="Type a message..."
        placeholderTextColor="#A3A3A3"
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
        selectionColor="#5B6EF5"
      />

      <Pressable
        style={({ pressed }) => [
          styles.sendButton,
          !localValue.trim() && styles.sendButtonDisabled,
          pressed && localValue.trim() && styles.sendButtonPressed,
        ]}
        onPress={handleSend}
        disabled={!localValue.trim()}
      >
        <Ionicons name="paper-plane" size={20} color={localValue.trim() ? "#FFFFFF" : "#A3A3A3"} />
      </Pressable>
    </View>
  );
};

const MessageInputArea = React.memo(
  InputArea,
  (prevProps, nextProps) => prevProps.value === nextProps.value,
);
InputArea.displayName = "InputArea";

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

  // Refs
  const messageListRef = useRef<FlatList<any>>(null);
  const appStateRef = useRef(AppState.currentState);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const infoSlideAnim = useRef(new Animated.Value(0)).current;
  const inputBottomAnim = useRef(new Animated.Value(0)).current; // New animation for input box

  // Header animations based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 5],
    extrapolate: "clamp",
  });

  // Enhanced keyboard handling function - defined inside component
  const handleKeyboardAnimation = useCallback(() => {
    if (keyboardHeight > 0) {
      // When keyboard is open
      Animated.timing(inputBottomAnim, {
        toValue: keyboardHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();

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
      Animated.timing(inputBottomAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [keyboardHeight, inputBottomAnim, messages.length]);

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

    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [ministryId]);

  // Set up real-time subscription and app state handlers
  useEffect(() => {
    let isComponentMounted = true;

    // Set up real-time subscription to messages with better error handling
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

    // Set up notifications for this ministry when component mounts
    const notificationCleanup = setupMinistryMessagesListener([ministryId]);

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

    // Enhanced keyboard event listeners compatible with React Native
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
              if (messageListRef.current) {
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
            if (messageListRef.current) {
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

      // Clean up notification listener
      if (notificationCleanup) {
        notificationCleanup();
      }

      if (appStateSubscription && appStateSubscription.remove) {
        appStateSubscription.remove();
      }

      if (keyboardShowSubscription) {
        keyboardShowSubscription.remove();
      }

      if (keyboardHideSubscription) {
        keyboardHideSubscription.remove();
      }
    };
  }, []);

  // Use effect for screen focus - load data
  useEffect(() => {
    console.log("Screen focused, loading fresh data");
    // Reset pagination state
    setOldestMessageTimestamp(null);
    setAllMessagesLoaded(false);
    // Fetch fresh data
    fetchData();
  }, [ministryId]);

  // Toggle ministry info panel
  const toggleMinistryInfo = useCallback(() => {
    const newState = !showMinistryInfo;
    setShowMinistryInfo(newState);

    Animated.timing(infoSlideAnim, {
      toValue: newState ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showMinistryInfo, infoSlideAnim]);

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
      setLoading(false);
    }
  }

  // Optimized message fetching with pagination and cache
  async function fetchMessages(loadOlder: boolean = false): Promise<void> {
    try {
      if (loadOlder && allMessagesLoaded) {
        console.log("All messages already loaded");
        return;
      }

      if (loadOlder) {
        setIsLoadingMore(true);
      } else {
        setMessageLoading(true);
      }

      // Keep track of current messages if loading older messages
      const currentMessages = loadOlder ? [...messages] : [];

      // Determine the query parameters
      let query = supabase
        .from("ministry_messages")
        .select("*")
        .eq("ministry_id", ministryId)
        .order("sent_at", { ascending: false }) // Newest first for efficient pagination
        .limit(20); // Load 20 messages at a time

      // If loading older messages, use the oldest message timestamp as a cursor
      if (loadOlder && oldestMessageTimestamp) {
        query = query.lt("sent_at", oldestMessageTimestamp);
      }

      // Execute the query
      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        throw messagesError;
      }

      // Check if we've loaded all messages
      if (!messagesData || messagesData.length === 0) {
        if (loadOlder) {
          setAllMessagesLoaded(true);
          setIsLoadingMore(false);
        } else {
          setMessages([]);
        }
        setMessageLoading(false);
        return;
      }

      // Sort messages newest to oldest for processing
      const sortedMessages = [...messagesData].sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
      );

      // Update the oldest message timestamp for next pagination
      if (sortedMessages.length > 0) {
        const oldestMessage = sortedMessages[sortedMessages.length - 1];
        setOldestMessageTimestamp(oldestMessage.sent_at);
      }

      // Get unique user IDs from messages
      const userIds = [...new Set(messagesData.map((msg) => msg.user_id))];

      // Fetch user details for all message authors
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("*")
          .in("id", userIds);

        if (usersError) {
          console.error("Error fetching users:", usersError);
        } else {
          // Create a map of user IDs to user objects
          const userMap =
            usersData?.reduce(
              (acc, user) => {
                acc[user.id] = user;
                return acc;
              },
              {} as { [key: string]: User },
            ) || {};

          // Update the users state with new users
          setUsers((prevUsers) => ({
            ...prevUsers,
            ...userMap,
          }));

          // Attach user data to messages and reverse to chronological order for display
          const messagesWithUsers = sortedMessages
            .map((message) => ({
              ...message,
              user: userMap[message.user_id] || users[message.user_id],
              _status: "sent" as "sending" | "sent" | "error",
            }))
            .reverse(); // Reverse back to chronological order for display

          // If loading older messages, append to the beginning
          if (loadOlder) {
            // Check for duplicate messages
            const existingIds = new Set(currentMessages.map((msg) => msg.id));
            const uniqueNewMessages = messagesWithUsers.filter((msg) => !existingIds.has(msg.id));

            // Combine with existing messages, placing older messages at the beginning
            const combinedMessages = [...uniqueNewMessages, ...currentMessages];

            // Update state
            setMessages(combinedMessages);

            // Update cache
            AsyncStorage.setItem(
              MESSAGES_CACHE_KEY(ministryId),
              JSON.stringify(combinedMessages),
            ).catch((err) => console.error("Cache update error:", err));
          } else {
            // Initial load - replace messages
            setMessages(messagesWithUsers);

            // Cache the messages
            AsyncStorage.setItem(
              MESSAGES_CACHE_KEY(ministryId),
              JSON.stringify(messagesWithUsers),
            ).catch((err) => console.error("Cache update error:", err));

            // Scroll to bottom after initial messages are loaded
            setTimeout(() => {
              messageListRef.current?.scrollToEnd({ animated: false });
            }, 300);
          }
        }
      } else {
        // Handle the case where we have messages but no user IDs (unlikely but possible)
        const messagesReversed = [...sortedMessages].reverse();

        if (loadOlder) {
          const existingIds = new Set(currentMessages.map((msg) => msg.id));
          const uniqueNewMessages = messagesReversed.filter((msg) => !existingIds.has(msg.id));
          const combinedMessages = [...uniqueNewMessages, ...currentMessages];

          setMessages(combinedMessages);

          AsyncStorage.setItem(
            MESSAGES_CACHE_KEY(ministryId),
            JSON.stringify(combinedMessages),
          ).catch((err) => console.error("Cache update error:", err));
        } else {
          setMessages(messagesReversed);

          AsyncStorage.setItem(
            MESSAGES_CACHE_KEY(ministryId),
            JSON.stringify(messagesReversed),
          ).catch((err) => console.error("Cache update error:", err));

          setTimeout(() => {
            messageListRef.current?.scrollToEnd({ animated: false });
          }, 300);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessageLoading(false);
      setIsLoadingMore(false);
    }
  }

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

      // Scroll to bottom after adding the message
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
        })
        .select();

      if (error) {
        console.error("Error sending message:", error);

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

        // Send a notification for the ministry when a message is sent
        if (ministry?.name) {
          try {
            // Schedule a local notification to test notifications (will appear on the sender's device)
            // This is just for testing - in a real app, this would come from the server
            if (process.env.NODE_ENV === "development") {
              await scheduleLocalNotification(
                `New message in ${ministry.name}`,
                `${currentUser?.first_name || "Someone"}: ${messageText}`,
                { ministryId, messageId: data[0].id },
              );
            }

            // Send notification to other members (this would trigger push notifications via your backend)
            await sendMinistryNotification(
              ministryId,
              `New message in ${ministry.name}`,
              `${currentUser?.first_name || "Someone"}: ${messageText}`,
            );

            // Test direct notification to Supabase
            await testDirectNotification(messageText);
          } catch (notifError) {
            console.error("Error sending notification:", notifError);
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }

  // Add test function for direct Supabase notifications
  async function testDirectNotification(messageText: string): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        return;
      }

      // Insert directly into ministry_notifications table
      const { data, error } = await supabase
        .from("ministry_notifications")
        .insert({
          ministry_id: ministryId,
          sender_id: user.id,
          title: `New message in ${ministry?.name || "ministry"}`,
          message: `${currentUser?.first_name || "Someone"}: ${messageText}`,
        })
        .select();

      if (error) {
        console.error("Error creating notification:", error);
        Alert.alert("Notification Error", error.message);
      } else {
        console.log("Notification sent successfully:", data);
      }
    } catch (error) {
      console.error("Error in testDirectNotification:", error);
      Alert.alert("Error", "Failed to send test notification");
    }
  }

  // Leave a ministry with improved error handling
  async function handleLeaveMinistry(): Promise<void> {
    Alert.alert("Leave Ministry", "Are you sure you want to leave this ministry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

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
            router.push("/(tabs)/MinistriesScreen");
          } catch (error) {
            console.error("Error in handleLeaveMinistry:", error);
            Alert.alert("Error", "Could not leave the ministry. Please try again.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  // Navigate back
  const navigateBack = useCallback(() => {
    router.push("/(tabs)/MinistriesScreen");
  }, [router]);

  // Combine scroll handlers for header opacity and loading more messages
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      // Track scroll position for header opacity
      const offsetY = event.nativeEvent.contentOffset.y;
      scrollY.setValue(offsetY);

      // Check if we're at the top of the list (with some threshold)
      if (offsetY < 50 && !isLoadingMore && !allMessagesLoaded && messages.length >= 20) {
        console.log("Reached top, loading older messages");
        fetchMessages(true);
      }
    },
    [scrollY, isLoadingMore, allMessagesLoaded, messages.length],
  );

  // Render ministry avatar
  const renderMinistryAvatar = useCallback(() => {
    if (ministry?.image_url) {
      return <Image source={{ uri: ministry.image_url }} style={styles.ministryAvatarImage} />;
    }

    // Placeholder with initials
    const avatarColor = getAvatarColor(ministry?.name || "");
    const initials = getInitials(ministry?.name || "");

    return (
      <View style={[styles.ministryAvatarPlaceholder, { backgroundColor: avatarColor }]}>
        <Text style={styles.ministryAvatarInitials}>{initials}</Text>
      </View>
    );
  }, [ministry]);

  // Render user avatar for messages
  const renderUserAvatar = useCallback((user?: User) => {
    if (user?.profile_image) {
      return <Image source={{ uri: user.profile_image }} style={styles.userAvatarImage} />;
    }

    // Placeholder with initials
    const name = user ? `${user.first_name} ${user.last_name}` : "";
    const avatarColor = getAvatarColor(name);
    const initials = getInitials(name);

    return (
      <View style={[styles.userAvatarPlaceholder, { backgroundColor: avatarColor }]}>
        <Text style={styles.userAvatarInitials}>{initials}</Text>
      </View>
    );
  }, []);

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
    ({ item }: { item: { date: string; messages: Message[] } }) => (
      <View key={item.date}>
        <MemoizedDateDivider date={item.date} />
        {item.messages.map((message) => (
          <View key={`msg-${message.id}-${message._status}`}>
            <MemoizedMessageItem
              message={message}
              isCurrentUser={message.user_id === currentUser?.id}
              renderUserAvatar={renderUserAvatar}
            />
          </View>
        ))}
      </View>
    ),
    [currentUser?.id, renderUserAvatar],
  );

  // Ministry Info Panel Component
  const MinistryInfoPanel = useCallback(() => {
    const panelTranslateX = infoSlideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [SCREEN_WIDTH, 0],
    });

    return (
      <Animated.View
        style={[
          styles.ministryInfoPanel,
          {
            transform: [{ translateX: panelTranslateX }],
          },
        ]}
      >
        <View style={styles.ministryInfoHeader}>
          <TouchableOpacity style={styles.closeInfoButton} onPress={toggleMinistryInfo}>
            <Ionicons name="close" size={24} color="#4A55A2" />
          </TouchableOpacity>
          <Text style={styles.ministryInfoTitle}>Ministry Details</Text>
        </View>

        <View style={styles.ministryInfoContent}>
          <View style={styles.ministryInfoAvatar}>{renderMinistryAvatar()}</View>
          <Text style={styles.ministryInfoName}>{ministry?.name}</Text>
          <Text style={styles.ministryInfoMembers}>
            {ministry?.member_count || 0} {ministry?.member_count === 1 ? "member" : "members"}
          </Text>

          <View style={styles.ministryInfoDescriptionContainer}>
            <Text style={styles.ministryInfoDescriptionTitle}>About</Text>
            <Text style={styles.ministryInfoDescription}>
              {ministry?.description || "No description available."}
            </Text>
          </View>

          {isMember && (
            <TouchableOpacity style={styles.leaveMinistryButton} onPress={handleLeaveMinistry}>
              <Text style={styles.leaveMinistryButtonText}>Leave Ministry</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  }, [
    ministry,
    isMember,
    infoSlideAnim,
    SCREEN_WIDTH,
    toggleMinistryInfo,
    renderMinistryAvatar,
    handleLeaveMinistry,
  ]);

  // Memoized message input component
  const messageInputComponent = useMemo(() => {
    return (
      <MessageInputArea
        value={newMessage}
        onChangeText={setNewMessage}
        onSend={sendMessage}
        onFocus={() => {
          setIsInputFocused(true);
          setTimeout(() => messageListRef.current?.scrollToEnd({ animated: true }), 200);
        }}
        onBlur={() => setIsInputFocused(false)}
        messageListRef={messageListRef}
      />
    );
  }, [newMessage, sendMessage, messageListRef]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A55A2" />
        <Text style={styles.loadingText}>Loading ministry chat...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load ministry information"}
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={navigateBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: 0 }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Floating header effect */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerOpacity,
          },
        ]}
      >
        <BlurView intensity={85} tint="light" style={styles.blurView} />
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
          <Ionicons name="arrow-back" size={24} color="#5B6EF5" />
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
          <Ionicons name="information-circle-outline" size={24} color="#5B6EF5" />
        </TouchableOpacity>
      </View>

      {/* Improved keyboard handling with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={styles.chatContainer}>
          <Animated.View
            style={[
              styles.messagesContainer,
              { opacity: fadeAnim },
              isInputFocused && styles.messagesContainerWithKeyboard,
            ]}
          >
            {messageLoading && messages.length === 0 ? (
              <View style={styles.messageLoadingContainer}>
                <ActivityIndicator size="large" color="#5B6EF5" />
                <Text style={styles.messageLoadingText}>Loading messages...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyMessagesContainer}>
                <LinearGradient colors={["#5B6EF5", "#8B9DFF"]} style={styles.emptyMessagesIcon}>
                  <FontAwesome5 name="comment-dots" size={40} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.emptyMessagesTitle}>No Messages Yet</Text>
                <Text style={styles.emptyMessagesSubtitle}>
                  Be the first to start a conversation!
                </Text>
              </View>
            ) : (
              <FlatList
                ref={messageListRef}
                data={groupedMessages}
                renderItem={renderMessageGroup}
                keyExtractor={(item) => item.date}
                contentContainerStyle={[
                  styles.messagesList,
                  {
                    // Ensure adequate padding so last message is above input box
                    paddingBottom: 200,
                  },
                ]}
                onScroll={handleScroll}
                scrollEventThrottle={400} // Reduced for better performance
                refreshing={false}
                initialNumToRender={20}
                maxToRenderPerBatch={10}
                windowSize={21}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 10,
                }}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={Platform.OS === "android"}
                onContentSizeChange={() => {
                  if (messages.length > 0 && !isLoadingMore) {
                    messageListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                onLayout={() => {
                  if (messages.length > 0 && !isLoadingMore) {
                    messageListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                ListHeaderComponent={isLoadingMore ? <LoadingHeader /> : null}
              />
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* Fixed input area positioning - outside of KeyboardAvoidingView for better control */}
      <View
        style={[
          styles.inputAreaContainer,
          {
            // Set bottom position to ensure it's above the nav bar
            bottom: keyboardHeight > 0 ? keyboardHeight : 0,
            // Ensure it's well above the nav bar when keyboard is closed
            paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 10),
            marginBottom: keyboardHeight > 0 ? 0 : 60,
          },
        ]}
      >
        {messageInputComponent}
      </View>

      {/* Sliding Ministry Info Panel */}
      {showMinistryInfo && <MinistryInfoPanel />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 90 : 60,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 225, 0.5)",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 40 : 16,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
  },
  ministryTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  memberCount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
  },
  chatContainer: {
    flex: 1,
    position: "relative",
    flexDirection: "column",
  },
  messagesContainer: {
    flex: 1,
    padding: 8,
    paddingBottom: 0, // Removed extra padding that was causing issues
  },
  messagesContainerWithKeyboard: {
    paddingBottom: 0, // Removed conflicting padding
  },
  messagesList: {
    paddingVertical: 10,
    paddingBottom: 100, // Larger padding to keep last message above input
  },
  messageLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyMessagesIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyMessagesTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },
  emptyMessagesSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  dateDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dateDividerTextContainer: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  dateDividerText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 8,
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
    borderRadius: 17,
    marginRight: 8,
    alignSelf: "flex-end",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  userAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  userAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarInitials: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  messageBubble: {
    maxWidth: "80%", // Increased from 75%
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 4,
  },
  currentUserBubble: {
    backgroundColor: "#5B6EF5",
    borderBottomRightRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  otherUserBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  sendingMessage: {
    opacity: 0.7,
  },
  errorMessage: {
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  messageUsername: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B6EF5",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1, // Ensure text can shrink
  },
  currentUserMessageText: {
    color: "#FFFFFF",
  },
  otherUserMessageText: {
    color: "#1F2937",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  currentUserMessageTime: {
    color: "#E0E0FF",
  },
  messageStatus: {
    marginLeft: 4,
  },
  statusIcon: {
    marginLeft: 2,
  },
  inputAreaContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EAEEF7",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 }, // Increased shadow
    shadowOpacity: 0.15, // Increased opacity
    shadowRadius: 5, // Increased radius
    elevation: 25, // Increased elevation for Android
    zIndex: 1000, // Higher z-index to ensure it's above everything
    position: "absolute", // Absolute positioning
    bottom: 0, // Position at the bottom
    left: 0,
    right: 0,
    // Added minimum height to ensure consistent sizing
    minHeight: 70,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#F5F7FF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlignVertical: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#5B6EF5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  sendButtonPressed: {
    backgroundColor: "#4A55A2",
    transform: [{ scale: 0.95 }],
  },
  ministryAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  ministryAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  ministryAvatarInitials: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFC",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#5B6EF5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Style for the loading more indicator at the top
  loadMoreHeader: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "rgba(91, 110, 245, 0.1)",
    borderRadius: 8,
    margin: 8,
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  ministryInfoPanel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "85%",
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  ministryInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEEF7",
  },
  closeInfoButton: {
    padding: 8,
  },
  ministryInfoTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  ministryInfoContent: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  ministryInfoAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ministryInfoName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  ministryInfoMembers: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
  },
  ministryInfoDescriptionContainer: {
    width: "100%",
    padding: 16,
    backgroundColor: "#F5F7FF",
    borderRadius: 12,
    marginBottom: 32,
  },
  ministryInfoDescriptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5B6EF5",
    marginBottom: 8,
  },
  ministryInfoDescription: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  leaveMinistryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  leaveMinistryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});
