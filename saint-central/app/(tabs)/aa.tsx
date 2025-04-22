import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Image,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRoute, useNavigation } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
  withSequence,
  withDelay,
  runOnJS,
  SlideInRight,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

const { width, height } = Dimensions.get("window");

// Theme colors
const THEME = {
  primary: "#4F46E5", // Indigo
  primaryLight: "#818CF8",
  primaryDark: "#3730A3",
  secondary: "#10B981", // Emerald
  secondaryLight: "#34D399",
  accent: "#F59E0B", // Amber
  background: "#FFFFFF",
  surface: "#F8FAFC",
  text: "#1E293B",
  textSecondary: "#64748B",
  textLight: "#94A3B8",
  border: "#E2E8F0",
  error: "#EF4444",
  success: "#10B981",
  divider: "#CBD5E1",
  ripple: "rgba(79, 70, 229, 0.1)",
};

// Message interface
interface Message {
  id: string;
  ministry_id: number;
  user_id: string;
  message_text: string;
  sent_at: string;
  attachment_url?: string;
  sender_name?: string;
  sender_avatar_url?: string;
  is_current_user?: boolean;
  animateIn?: boolean;
}

// Ministry interface
interface Ministry {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  member_count?: number;
}

// User interface
interface User {
  id: string;
  full_name?: string;
  avatar_url?: string;
}

// Route params interface
interface RouteParams {
  id: string;
  [key: string]: any;
}

const MinistryChat = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const ministryId = (route.params as RouteParams)?.id
    ? parseInt((route.params as RouteParams).id)
    : null;

  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Pagination state for infinite scrolling
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<string | null>(null);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);
  const MESSAGES_PER_PAGE = 25;

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const subscriptionRef = useRef<any>(null);

  // Animated values
  const inputHeight = useSharedValue(50);
  const headerOpacity = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const sendButtonScale = useSharedValue(1);
  const typingIndicatorHeight = useSharedValue(0);

  // Fix keyboard issues by improving the behavior
  useEffect(() => {
    const keyboardWillShowListener =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillShow", (e) => {
            const keyboardHeight = e.endCoordinates.height;
            setKeyboardVisible(true);
          })
        : Keyboard.addListener("keyboardDidShow", () => {
            setKeyboardVisible(true);
          });

    const keyboardWillHideListener =
      Platform.OS === "ios"
        ? Keyboard.addListener("keyboardWillHide", () => {
            setKeyboardVisible(false);
          })
        : Keyboard.addListener("keyboardDidHide", () => {
            setKeyboardVisible(false);
          });

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Update the animation type for scrollToBottomAnimatedStyle
  const scrollToBottomAnimatedStyle = useSharedValue({
    opacity: 0,
    transform: [{ scale: 0.8 }, { translateY: 20 }],
    bottom: 90,
  });

  // Update unread message indicator
  useEffect(() => {
    if (unreadMessages > 0) {
      scrollToBottomAnimatedStyle.value = {
        ...scrollToBottomAnimatedStyle.value,
        opacity: 1,
      };
    }
  }, [unreadMessages]);

  // Fetch initial data
  useEffect(() => {
    if (!ministryId) {
      Alert.alert("Error", "No ministry ID provided");
      navigation.goBack();
      return;
    }

    // Reset pagination state when switching between chats
    setMessages([]);
    setLastMessageTimestamp(null);
    setHasMoreMessages(true);
    setInitialMessagesLoaded(false);
    setLoading(true);
    setUnreadMessages(0);
    setIsScrolledUp(false);

    fetchMinistryDetails();
    fetchCurrentUser();
    fetchMessages();
    const subscription = setupRealtimeSubscription();

    return () => {
      // Clean up subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        console.log("Unsubscribed from realtime channel");
      }
    };
  }, [ministryId]);

  // Add event listener for navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      console.log("Navigation event: beforeRemove");
      // Unsubscribe from realtime channel before leaving
      if (subscriptionRef.current) {
        console.log("Unsubscribing from channel due to navigation");
        subscriptionRef.current.unsubscribe();
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Setup real-time subscription - Updated for Supabase 2025
  const setupRealtimeSubscription = async () => {
    try {
      console.log("Setting up realtime subscription for ministry_id:", ministryId);

      // Use a unique channel identifier to prevent conflicts
      const channelId = `ministry_chat_${ministryId}_${Date.now()}`;

      // Subscribe to new messages with enhanced Supabase 2025 API
      subscriptionRef.current = supabase
        .channel(channelId, {
          config: {
            broadcast: { self: false },
            presence: { key: currentUser?.id || "anonymous" },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ministry_messages",
            filter: `ministry_id=eq.${ministryId}`,
          },
          async (payload) => {
            console.log("Real-time message received:", payload);

            // Enhanced error handling with optional chaining
            try {
              // Get sender info
              const message = payload.new as Message;

              // Skip messages we've already handled to prevent duplicates
              if (messages.some((m) => m.id === message.id)) {
                console.log("Skipping duplicate message:", message.id);
                return;
              }

              const { data: userData } = await supabase
                .from("users")
                .select("first_name, last_name, profile_image")
                .eq("id", message.user_id)
                .single();

              const fullName = userData
                ? `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
                : "Unknown User";

              const isCurrentUserMessage = message.user_id === currentUser?.id;

              // Format new message with additional unique key
              const formattedMessage: Message = {
                ...message,
                id: `${message.id}-${Date.now()}`, // Ensure unique ID
                sender_name: fullName,
                sender_avatar_url: userData?.profile_image,
                is_current_user: isCurrentUserMessage,
                animateIn: true,
              };

              // Add to state with animation flag
              setMessages((prev) => [formattedMessage, ...prev]);

              // Update unread count if scrolled up
              if (isScrolledUp && !isCurrentUserMessage) {
                setUnreadMessages((prev) => prev + 1);
                scrollToBottomAnimatedStyle.value = {
                  ...scrollToBottomAnimatedStyle.value,
                  opacity: 1,
                };

                // Haptic feedback
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else if (!isScrolledUp) {
                // Auto scroll to bottom for new messages
                setTimeout(() => {
                  if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ offset: 0, animated: true });
                  }
                }, 100);
              }
            } catch (err) {
              console.error("Error processing realtime message:", err);
            }
          },
        )
        .on("presence", { event: "sync" }, () => {
          // Handle presence sync with 2025 API format
          try {
            if (!subscriptionRef.current) return;

            const state = subscriptionRef.current.presenceState();
            console.log("Presence state:", state);

            // Extract typing users with improved error handling
            const typingUserIds: string[] = [];

            if (state) {
              Object.entries(state).forEach(([userId, userStates]) => {
                if (Array.isArray(userStates)) {
                  userStates.forEach((userState) => {
                    if (userState?.typing && userId !== currentUser?.id) {
                      typingUserIds.push(userId);
                    }
                  });
                }
              });
            }

            setTypingUsers(typingUserIds);
            const isAnyoneTyping = typingUserIds.length > 0;

            if (isAnyoneTyping) {
              typingIndicatorHeight.value = withTiming(40);
            } else {
              typingIndicatorHeight.value = withTiming(0);
            }
          } catch (err) {
            console.error("Error handling presence sync:", err);
          }
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          console.log("User joined:", key, newPresences);
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          console.log("User left:", key, leftPresences);
        })
        .subscribe(async (status, err) => {
          console.log("Subscription status:", status, err || "");

          if (status === "SUBSCRIBED" && currentUser) {
            try {
              // Track presence with enhanced error handling
              await subscriptionRef.current?.track({
                user_id: currentUser.id,
                online_at: new Date().toISOString(),
                typing: false,
                // New in 2025: Enhanced presence data
                client_info: {
                  platform: Platform.OS,
                  app_version: "1.0.0",
                  device_type: Platform.OS === "ios" ? "apple" : "android",
                },
              });
              console.log("Presence tracking started for user:", currentUser.id);
            } catch (trackError) {
              console.error("Error tracking presence:", trackError);
            }
          } else if (status === "CHANNEL_ERROR") {
            console.error("Channel error:", err);

            // Retry connection after error
            setTimeout(() => {
              console.log("Retrying subscription...");
              setupRealtimeSubscription();
            }, 3000);
          }
        });

      return subscriptionRef.current;
    } catch (error) {
      console.error("Error setting up realtime subscription:", error);
      return null;
    }
  };

  // Fetch ministry details
  const fetchMinistryDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name, description, image_url")
        .eq("id", ministryId)
        .single();

      if (error) throw error;

      if (data) {
        setMinistry(data);
        // Animate header after loading
        headerOpacity.value = withTiming(1, { duration: 500 });
      }
    } catch (error) {
      console.error("Error fetching ministry details:", error);
      Alert.alert("Error", "Failed to load ministry details");
    }
  };

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (user) {
        const { data: userData, error: userDataError } = await supabase
          .from("users")
          .select("first_name, last_name, profile_image")
          .eq("id", user.id)
          .single();

        if (userDataError) throw userDataError;

        setCurrentUser({
          id: user.id,
          full_name: userData
            ? `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
            : "User",
          avatar_url: userData?.profile_image,
        });
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  // Fetch messages with pagination support
  const fetchMessages = async (isInitial = true) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      console.log("Fetching messages, isInitial:", isInitial, "ministryId:", ministryId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No user logged in");
      }

      // Use timestamp-based pagination
      let query = supabase
        .from("ministry_messages")
        .select(
          `
          id,
          ministry_id,
          user_id,
          message_text,
          sent_at,
          attachment_url
        `,
        )
        .eq("ministry_id", ministryId)
        .order("sent_at", { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      // If not initial load and we have a last timestamp, use it for pagination
      if (!isInitial && lastMessageTimestamp) {
        console.log("Using timestamp for pagination:", lastMessageTimestamp);
        query = query.lt("sent_at", lastMessageTimestamp);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`Fetched ${data?.length || 0} messages`);

      if (data) {
        // Update pagination state
        if (data.length < MESSAGES_PER_PAGE) {
          console.log("No more messages to fetch");
          setHasMoreMessages(false);
        } else {
          setHasMoreMessages(true);
        }

        // Set last message timestamp for next pagination if there's data
        if (data.length > 0) {
          const oldestMessage = data[data.length - 1];
          console.log("Setting last timestamp:", oldestMessage.sent_at);
          setLastMessageTimestamp(oldestMessage.sent_at);
        }

        // Fetch user details for each message
        const messagesWithUsers = await Promise.all(
          data.map(async (message) => {
            const { data: userData } = await supabase
              .from("users")
              .select("first_name, last_name, profile_image")
              .eq("id", message.user_id)
              .single();

            const fullName = userData
              ? `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
              : "Unknown User";

            return {
              ...message,
              sender_name: fullName,
              sender_avatar_url: userData?.profile_image,
              is_current_user: message.user_id === user.id,
            };
          }),
        );

        // Add to existing messages if not initial load
        if (isInitial) {
          setMessages(messagesWithUsers);
          setInitialMessagesLoaded(true);

          // Scroll to the most recent message when initially loaded
          if (messagesWithUsers.length > 0) {
            setTimeout(() => {
              if (flatListRef.current) {
                console.log("Scrolling to top after initial messages load");
                flatListRef.current.scrollToOffset({ offset: 0, animated: false });
              }
            }, 100);
          }
        } else {
          setMessages((prev) => [...prev, ...messagesWithUsers]);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  // Handle input change
  const handleInputChange = (text: string) => {
    setMessageText(text);

    // Adjust input height based on content
    if (text.length > 40) {
      inputHeight.value = withTiming(80);
    } else {
      inputHeight.value = withTiming(50);
    }

    // Broadcast typing status
    if (text.length > 0 && !isTyping && subscriptionRef.current) {
      setIsTyping(true);
      subscriptionRef.current.track({
        user_id: currentUser?.id,
        online_at: new Date().toISOString(),
        typing: true,
      });
    } else if (text.length === 0 && isTyping && subscriptionRef.current) {
      setIsTyping(false);
      subscriptionRef.current.track({
        user_id: currentUser?.id,
        online_at: new Date().toISOString(),
        typing: false,
      });
    }
  };

  // Handle send message with improved optimistic update
  const handleSendMessage = async () => {
    if ((!messageText.trim() && !attachmentUrl) || !currentUser) return;

    try {
      // Capture message text before clearing input
      const msgText = messageText.trim();

      // Clear input immediately for better UX
      setMessageText("");
      setAttachmentUrl(null);
      setUploadProgress(0);
      inputHeight.value = withTiming(50);

      // Auto scroll to bottom
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }

      setIsScrolledUp(false);
      setUnreadMessages(0);
      scrollToBottomAnimatedStyle.value = {
        ...scrollToBottomAnimatedStyle.value,
        opacity: 0,
      };

      // Now set sending state and show animation
      setSending(true);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate send button
      sendButtonScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      );

      const newMessage = {
        ministry_id: Number(ministryId),
        user_id: currentUser.id,
        message_text: msgText,
        sent_at: new Date().toISOString(),
        attachment_url: attachmentUrl,
      };

      // Reset typing status
      if (subscriptionRef.current) {
        subscriptionRef.current.track({
          user_id: currentUser.id,
          online_at: new Date().toISOString(),
          typing: false,
        });
      }

      setIsTyping(false);

      // Save to Supabase - don't need to update local state as realtime will handle it
      const { error } = await supabase.from("ministry_messages").insert(newMessage);

      if (error) throw error;

      // Real-time subscription will handle adding the message to the list
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");

      // Keep the message in the input field if there was an error
      setMessageText(messageText);
    } finally {
      setSending(false);
    }
  };

  // Handle attachment upload - Updated for 2025 Supabase Storage API
  const handleAttachment = async () => {
    try {
      // Request permissions with enhanced error handling
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please grant access to your photo library");
        return;
      }

      // Modern 2025 image picker with enhanced options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        allowsMultipleSelection: false,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
        selectionLimit: 1,
        exif: false, // Don't include EXIF data for privacy
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Upload image
      setUploading(true);

      // Enhanced file naming for 2025
      const fileExt = asset.uri.split(".").pop();
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const fileName = `${currentUser?.id}-${timestamp}-${randomStr}.${fileExt}`;
      const filePath = `ministry_attachments/${ministryId}/${fileName}`;

      // Show progress updates
      setUploadProgress(0.1);

      // Convert uri to blob with progress tracking
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      setUploadProgress(0.3);

      // Modern Supabase Storage API for 2025
      const { data, error } = await supabase.storage.from("attachments").upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        upsert: true,
        cacheControl: "3600",
      } as any);

      if (error) throw error;

      // Track progress manually
      setUploadProgress(0.9);

      // Get public URL with enhanced CDN options
      const { data: urlData } = await supabase.storage.from("attachments").getPublicUrl(filePath, {
        transform: {
          width: 800,
          height: 800,
          quality: 80,
          format: "origin",
        },
      });

      setAttachmentUrl(urlData.publicUrl);
      setUploadProgress(1.0);

      // Haptic feedback for success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error uploading attachment:", error);
      Alert.alert("Error", "Failed to upload attachment");

      // Haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      // Hide progress after a short delay to show completion
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Handle scroll event more efficiently
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.value = offsetY;

    // Only update state if necessary to prevent re-renders
    if (offsetY > 70 && !isScrolledUp) {
      setIsScrolledUp(true);

      // Update animated value with smooth timing
      scrollToBottomAnimatedStyle.value = {
        ...scrollToBottomAnimatedStyle.value,
        opacity: 1,
        transform: [{ scale: 1 }, { translateY: 0 }],
      };
    } else if (offsetY <= 20 && isScrolledUp) {
      setIsScrolledUp(false);
      setUnreadMessages(0);

      // Update animated value with smooth timing
      scrollToBottomAnimatedStyle.value = {
        ...scrollToBottomAnimatedStyle.value,
        opacity: 0,
        transform: [{ scale: 0.8 }, { translateY: 20 }],
      };
    }
  };

  // Load more messages when reaching the end of the list
  const handleLoadMoreMessages = () => {
    if (!loadingMore && hasMoreMessages && initialMessagesLoaded) {
      console.log("Loading more messages, lastTimestamp:", lastMessageTimestamp);
      fetchMessages(false);
    } else {
      console.log(
        "Skipped loading more. loadingMore:",
        loadingMore,
        "hasMoreMessages:",
        hasMoreMessages,
        "initialMessagesLoaded:",
        initialMessagesLoaded,
      );
    }
  };

  // Handle scroll to bottom with improved animation
  const scrollToBottom = () => {
    // Don't attempt to scroll if older messages are still loading
    if (loadingMore) {
      console.log("Skipping scroll to bottom while loading older messages");
      return;
    }

    if (flatListRef.current) {
      // Use smooth scrolling
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }

    // Reset states
    setIsScrolledUp(false);
    setUnreadMessages(0);

    // Animate with withSequence for smoother transition
    scrollToBottomAnimatedStyle.value = {
      ...scrollToBottomAnimatedStyle.value,
      opacity: withSequence(withTiming(0.8, { duration: 100 }), withTiming(0, { duration: 200 })),
      transform: [
        {
          scale: withSequence(
            withTiming(1.1, { duration: 100 }),
            withTiming(0.8, { duration: 200 }),
          ),
        },
        { translateY: withTiming(20, { duration: 200 }) },
      ],
    };

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
      transform: [
        {
          translateY: interpolate(headerOpacity.value, [0, 1], [-10, 0], Extrapolate.CLAMP),
        },
      ],
    };
  });

  const inputAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: inputHeight.value,
    };
  });

  const sendButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sendButtonScale.value }],
    };
  });

  const typingIndicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: typingIndicatorHeight.value,
      opacity: interpolate(typingIndicatorHeight.value, [0, 40], [0, 1], Extrapolate.CLAMP),
      transform: [
        {
          translateY: interpolate(typingIndicatorHeight.value, [0, 40], [10, 0], Extrapolate.CLAMP),
        },
      ],
    };
  });

  // Animated scroll to bottom button style
  const scrollToBottomButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: scrollToBottomAnimatedStyle.value.opacity,
      transform: scrollToBottomAnimatedStyle.value.transform,
      position: "absolute",
      bottom: keyboardVisible ? 190 : 170,
      right: 16,
      zIndex: 100,
    };
  });

  // Format time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();

    // If today, return time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    // Otherwise show date and time
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  // Get avatar initials
  const getInitials = (name: string = "Unknown") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Get avatar background color
  const getAvatarColor = (userId: string) => {
    const colors = [
      THEME.primary,
      "#7C3AED", // Violet
      "#EC4899", // Pink
      THEME.secondary,
      "#3B82F6", // Blue
      "#8B5CF6", // Purple
      "#F97316", // Orange
      "#14B8A6", // Teal
    ];

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Memoize message rendering for better performance
  const renderMessage = useCallback(
    (item: Message, index: number) => {
      // Make sure we always set the correct is_current_user flag based on comparison with current user
      const isCurrentUser =
        item.is_current_user === true || (currentUser && item.user_id === currentUser.id);

      // Apply this corrected value back to the item to ensure consistency
      if (isCurrentUser !== item.is_current_user) {
        // Ensure we're setting a boolean, not null
        item.is_current_user = isCurrentUser === true;
      }

      const entering = item.animateIn ? SlideInRight.springify().mass(0.8) : FadeIn;
      const uniqueBubbleKey = `bubble-${item.id}-${index}`;

      return (
        <Animated.View
          key={uniqueBubbleKey}
          entering={entering}
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          ]}
        >
          {!isCurrentUser && (
            <View style={styles.avatarContainer}>
              {item.sender_avatar_url ? (
                <Image source={{ uri: item.sender_avatar_url }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: getAvatarColor(item.user_id) },
                  ]}
                >
                  <Text style={styles.avatarText}>{getInitials(item.sender_name)}</Text>
                </View>
              )}
            </View>
          )}

          <View
            style={[
              styles.messageContent,
              isCurrentUser ? styles.currentUserContent : styles.otherUserContent,
            ]}
          >
            {!isCurrentUser && <Text style={styles.senderName}>{item.sender_name}</Text>}

            {item.attachment_url && (
              <View style={styles.attachmentContainer}>
                <Image
                  source={{ uri: item.attachment_url }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {item.message_text && (
              <Text
                style={[
                  styles.messageText,
                  isCurrentUser ? styles.currentUserText : styles.otherUserText,
                ]}
              >
                {item.message_text}
              </Text>
            )}

            <Text
              style={[
                styles.messageTime,
                isCurrentUser ? styles.currentUserTime : styles.otherUserTime,
              ]}
            >
              {formatMessageTime(item.sent_at)}
            </Text>
          </View>
        </Animated.View>
      );
    },
    [currentUser?.id],
  );

  // Efficiently handle message rendering with memoization
  const _renderMessageItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const showDate =
        index === messages.length - 1 ||
        new Date(messages[index + 1]?.sent_at).toDateString() !==
          new Date(item.sent_at).toDateString();

      // Ensure the key is truly unique and consistent
      return (
        <View key={`msg-wrapper-${item.id}-${index}`} style={{ width: "100%" }}>
          {showDate && (
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {new Date(item.sent_at).toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}
          {renderMessage(item, index)}
        </View>
      );
    },
    [messages, currentUser, renderMessage],
  );

  // Render empty state
  const renderEmptyComponent = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={[`${THEME.primary}20`, `${THEME.primary}40`]}
          style={styles.emptyIconContainer}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={40} color={THEME.primary} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptySubtitle}>Be the first to send a message to this ministry!</Text>
      </View>
    );
  };

  // Render loading indicator at the end of the list
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoadingContainer}>
        <ActivityIndicator size="small" color={THEME.primary} />
        <Text style={styles.footerLoadingText}>Loading older messages...</Text>
      </View>
    );
  };

  // Add this useEffect to scroll to the most recent message when messages first load
  useEffect(() => {
    if (initialMessagesLoaded && messages.length > 0 && !loading) {
      // Short delay to ensure the list is rendered
      setTimeout(() => {
        if (flatListRef.current) {
          console.log("Scrolling to most recent message on initial load");
          flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
      }, 300);
    }
  }, [initialMessagesLoaded, loading]);

  // Fixed keyExtractor to ensure unique keys
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Ensure we unsubscribe when navigating away
            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe();
              console.log("Unsubscribed from channel due to back button");
            }
            (navigation as any).navigate("MinistriesScreen");
          }}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.primary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          {ministry?.image_url ? (
            <Image source={{ uri: ministry.image_url }} style={styles.ministryImage} />
          ) : (
            <LinearGradient
              colors={[THEME.primary, THEME.primaryDark]}
              style={styles.ministryImagePlaceholder}
            >
              <Text style={styles.ministryInitials}>
                {ministry?.name ? getInitials(ministry.name) : "?"}
              </Text>
            </LinearGradient>
          )}

          <View style={styles.headerTextContainer}>
            <Text style={styles.ministryName} numberOfLines={1}>
              {ministry?.name || "Ministry Chat"}
            </Text>
            <Text style={styles.ministryDescription} numberOfLines={1}>
              {ministry?.description || "Loading..."}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={THEME.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      )}

      {/* Messages list */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={_renderMessageItem}
          keyExtractor={(item, index) => `message-${item.id}-${index}`}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderFooter}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === "android"}
          windowSize={21}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={30}
          onEndReached={handleLoadMoreMessages}
          onEndReachedThreshold={0.5}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          initialNumToRender={15} // Render more items initially
          onContentSizeChange={() => {
            // Also try to scroll when content size changes
            if (initialMessagesLoaded && !isScrolledUp && messages.length > 0) {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
            }
          }}
        />

        {/* Typing indicator */}
        <Animated.View style={[styles.typingContainer, typingIndicatorAnimatedStyle]}>
          {typingUsers.length > 0 && (
            <View style={styles.typingContent}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, { marginLeft: 4 }]} />
                <View style={[styles.typingDot, { marginLeft: 4 }]} />
              </View>
              <Text style={styles.typingText}>
                {typingUsers.length === 1
                  ? "Someone is typing..."
                  : `${typingUsers.length} people are typing...`}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Attachment preview */}
        {attachmentUrl && (
          <View style={styles.attachmentPreviewContainer}>
            <Image
              source={{ uri: attachmentUrl }}
              style={styles.attachmentPreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeAttachmentButton}
              onPress={() => setAttachmentUrl(null)}
            >
              <Ionicons name="close-circle" size={20} color={THEME.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Upload progress indicator */}
        {uploading && (
          <View style={styles.uploadProgressContainer}>
            <Animated.View
              style={[styles.uploadProgressBar, { width: `${uploadProgress * 100}%` }]}
            />
          </View>
        )}

        {/* Message input */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              marginBottom: keyboardVisible ? 1 : 50, // Adjust margin based on keyboard visibility
            },
          ]}
        >
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachment}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={THEME.primary} />
            ) : (
              <Ionicons name="image-outline" size={26} color={THEME.primary} />
            )}
          </TouchableOpacity>

          <Animated.View style={[styles.textInputContainer, inputAnimatedStyle]}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              placeholder="Type a message..."
              value={messageText}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
              placeholderTextColor={THEME.textLight}
            />
          </Animated.View>

          <Animated.View style={sendButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                messageText.trim() || attachmentUrl ? styles.sendButtonActive : {},
              ]}
              onPress={handleSendMessage}
              disabled={(!messageText.trim() && !attachmentUrl) || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Scroll to bottom button */}
      <Animated.View style={scrollToBottomButtonStyle}>
        <TouchableOpacity style={styles.scrollToBottomButton} onPress={scrollToBottom}>
          <View style={styles.scrollToBottomBlur}>
            <Ionicons name="arrow-down" size={24} color={THEME.primary} />

            {unreadMessages > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadMessages}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Modern UI for 2025
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
    backgroundColor: THEME.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${THEME.primary}10`,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  ministryImage: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  ministryImagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  ministryInitials: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  ministryName: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.text,
    letterSpacing: -0.3,
  },
  ministryDescription: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${THEME.primary}10`,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: THEME.textSecondary,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 160,
  },
  messageContainer: {
    marginBottom: 14,
  },
  currentUserMessage: {
    alignSelf: "flex-end",
  },
  otherUserMessage: {
    alignSelf: "flex-start",
    maxWidth: "75%",
    flexDirection: "row",
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  messageContent: {
    padding: 12,
    borderRadius: 18,
  },
  currentUserContent: {
    backgroundColor: THEME.primary,
    borderRadius: 18,
    borderTopRightRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: THEME.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    maxWidth: "75%",
  },
  otherUserContent: {
    backgroundColor: THEME.surface,
    borderRadius: 18,
    borderTopLeftRadius: 2,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  senderName: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  currentUserText: {
    color: "#FFFFFF",
    fontWeight: "400",
  },
  otherUserText: {
    color: THEME.text,
    fontWeight: "400",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 5,
    alignSelf: "flex-end",
  },
  currentUserTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherUserTime: {
    color: THEME.textLight,
  },
  dateContainer: {
    alignItems: "center",
    marginVertical: 18,
    width: "100%",
  },
  dateText: {
    fontSize: 13,
    color: THEME.textSecondary,
    backgroundColor: `${THEME.textSecondary}10`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: "hidden",
    textAlign: "center",
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(226, 232, 240, 0.6)",
    backgroundColor: THEME.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    marginBottom: 50,
  },
  attachButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    maxHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.text,
    maxHeight: 100,
    minHeight: 36,
    paddingTop: 0,
    paddingBottom: 0,
    letterSpacing: -0.2,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME.textLight,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonActive: {
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  // Update upload progress indicator
  uploadProgressContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  uploadProgressBar: {
    height: "100%",
    backgroundColor: THEME.primary,
  },

  // Update empty state styles
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    height: 400,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.2,
    maxWidth: "80%",
  },
  attachmentPreviewContainer: {
    padding: 8,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    position: "relative",
  },
  attachmentPreview: {
    height: 100,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  removeAttachmentButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
  },
  // Modern scroll to bottom button for 2025
  scrollToBottomButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  scrollToBottomBlur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  unreadBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: THEME.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    shadowColor: THEME.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Typing indicator with modern styling
  typingContainer: {
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  typingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(100, 116, 139, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.primary,
    opacity: 0.7,
  },
  typingText: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontStyle: "italic",
    fontWeight: "500",
  },
  attachmentContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  attachmentImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
  },
  footerLoadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  footerLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: THEME.textSecondary,
  },
});

export default MinistryChat;
