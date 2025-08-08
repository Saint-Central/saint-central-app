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
  Modal,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useCRUD } from "../../../utils/crudClient";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../supabaseClient";
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
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

const { width, height } = Dimensions.get("window");

// WhatsApp Theme colors
const THEME = {
  primary: "#25D366", // WhatsApp Green
  primaryLight: "#34E675",
  primaryDark: "#128C7E",
  secondary: "#075E54", // WhatsApp Dark Green
  secondaryLight: "#25D366",
  accent: "#128C7E",
  background: "#ECE5DD", // WhatsApp Chat Background
  surface: "#FFFFFF",
  text: "#111B21",
  textSecondary: "#667781",
  textLight: "#8696A0",
  border: "#E9EDEF",
  error: "#EA5455",
  success: "#25D366",
  divider: "#E9EDEF",
  ripple: "rgba(37, 211, 102, 0.1)",
  messageGreen: "#E7FFDB", // Sent message background
  headerGreen: "#008069", // Header background
  inputBg: "#F0F2F5", // Input area background
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
  push_sent?: boolean;
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

  // Hide the default header navigation for this screen
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Initialize CRUD client and auth
  const { select, selectOne, insert, update, delete: deleteRecord } = useCRUD();
  const { user, getAccessToken } = useAuth();

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
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Modal and members state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [ministryMembers, setMinistryMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

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

  // Register for push notifications
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // Function to register for push notifications
  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) {
        console.log("Push notifications not available on emulator");
        return;
      }

      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return;
      }

      // Get Expo push token
      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PROJECT_ID, // Add your Expo project ID here
        })
      ).data;

      console.log("Push token:", token);
      setPushToken(token);

      // Store token in Supabase if user is logged in
      await savePushToken(token);

      // Configure notification behavior
      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
    } catch (error) {
      console.error("Error registering for push notifications:", error);
    }
  };

  // Function to save push token using CRUD API
  const savePushToken = async (token: string) => {
    try {
      if (!user) return;

      const now = new Date().toISOString();

      // First check if token already exists for this user
      const existingToken = await selectOne("user_push_tokens", {
        where: {
          user_id: user.id,
          token: token,
        },
      });

      if (existingToken) {
        // Update existing token's last_used timestamp
        await update("user_push_tokens", { last_used: now }, { user_id: user.id, token: token });
        console.log("Push token updated successfully");
      } else {
        // Insert new token
        await insert("user_push_tokens", {
          user_id: user.id,
          token: token,
          device_type: Platform.OS,
          created_at: now,
          last_used: now,
        });
        console.log("Push token saved successfully");
      }
    } catch (error) {
      console.error("Error in savePushToken:", error);
    }
  };

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

  // Separate shared values for scroll to bottom button
  const scrollToBottomOpacity = useSharedValue(0);
  const scrollToBottomScale = useSharedValue(0.8);
  const scrollToBottomTranslateY = useSharedValue(20);

  // Update unread message indicator
  useEffect(() => {
    if (unreadMessages > 0) {
      scrollToBottomOpacity.value = withTiming(1, { duration: 200 });
      scrollToBottomScale.value = withSpring(1);
      scrollToBottomTranslateY.value = withTiming(0, { duration: 200 });
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
            console.log("🔔 REALTIME MESSAGE RECEIVED:", payload);
            console.log("🔔 Payload new data:", JSON.stringify(payload.new, null, 2));

            // Enhanced error handling with optional chaining
            try {
              // Get sender info
              const message = payload.new as Message;

              // Skip messages we've already handled to prevent duplicates
              if (messages.some((m) => m.id === message.id)) {
                console.log("Skipping duplicate message:", message.id);
                return;
              }

              const userData = await selectOne("users", {
                select: "first_name, last_name, profile_image",
                where: { id: message.user_id },
              });

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
                scrollToBottomOpacity.value = withTiming(1, { duration: 200 });
                scrollToBottomScale.value = withSpring(1);
                scrollToBottomTranslateY.value = withTiming(0, { duration: 200 });

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

  // Fetch ministry details using CRUD API
  const fetchMinistryDetails = async () => {
    try {
      console.log("Fetching ministry details for ID:", ministryId);
      const data = await selectOne("ministries", {
        select: "id, name, description, image_url",
        where: { id: ministryId },
      });

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

  // Fetch ministry members
  const fetchMinistryMembers = async () => {
    try {
      setLoadingMembers(true);

      // Get ministry members
      const members = await select("ministry_members", {
        where: {
          ministry_id: ministryId,
        },
      });

      if (members && members.length > 0) {
        // Filter out removed members
        const activeMembers = members.filter(
          (m) => m.role !== "removed" && m.member_status !== "removed",
        );

        // Get user details for each member
        const memberDetails = await Promise.all(
          activeMembers.map(async (member) => {
            const userDetails = await selectOne("users", {
              select: "id, first_name, last_name, profile_image",
              where: { id: member.user_id },
            });

            return {
              ...member,
              user_name: userDetails
                ? `${userDetails.first_name || ""} ${userDetails.last_name || ""}`.trim()
                : "Unknown User",
              user_avatar: userDetails?.profile_image,
              user_id: member.user_id,
              role: member.role || member.member_status || "member",
            };
          }),
        );

        // Remove duplicates based on user_id
        const uniqueMembers = memberDetails.filter(
          (member, index, self) => index === self.findIndex((m) => m.user_id === member.user_id),
        );

        // Sort by role (owner > admin > member)
        const sortedMembers = uniqueMembers.sort((a, b) => {
          const roleOrder = { owner: 0, leader: 1, admin: 2, member: 3 };
          return (roleOrder[a.role] || 3) - (roleOrder[b.role] || 3);
        });

        setMinistryMembers(sortedMembers);

        // Check current user's role in ministry
        const currentUserMember = activeMembers.find((m) => m.user_id === user?.id);
        console.log("Current user ministry member data:", currentUserMember);

        if (currentUserMember) {
          const ministryRole =
            currentUserMember.role || currentUserMember.member_status || "member";
          console.log("User ministry role:", ministryRole);
          setCurrentUserRole(ministryRole);
        }

        // Also check if user is church admin/owner (should have admin rights in all ministries)
        if (ministry) {
          const churchMember = await selectOne("church_members", {
            where: {
              user_id: user?.id,
              church_id: ministry.church_id,
            },
          });

          console.log("Church member data:", churchMember);

          if (churchMember) {
            const churchRole = churchMember.role?.toLowerCase();
            console.log("Church role:", churchRole);
            if (churchRole === "admin" || churchRole === "owner") {
              setCurrentUserRole(churchRole); // Church admins/owners have admin rights in ministries
              console.log("Set user role to church role:", churchRole);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching ministry members:", error);
      Alert.alert("Error", "Failed to load ministry members");
    } finally {
      setLoadingMembers(false);
    }
  };

  // Handle kicking a member
  const handleKickMember = async (memberId: string) => {
    try {
      // Show confirmation dialog
      Alert.alert(
        "Remove Member",
        "Are you sure you want to remove this member from the ministry?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                console.log("Attempting to remove member:", {
                  ministry_id: ministryId,
                  user_id: memberId,
                });

                // First, check if the member exists
                const existingMember = await selectOne("ministry_members", {
                  where: {
                    ministry_id: ministryId,
                    user_id: memberId,
                  },
                });

                console.log("Existing member data:", existingMember);

                if (!existingMember) {
                  Alert.alert("Error", "Member not found in this ministry");
                  return;
                }

                // Try to delete the member record instead of updating
                try {
                  // First try to update to removed status
                  await update(
                    "ministry_members",
                    { role: "removed" },
                    { ministry_id: ministryId, user_id: memberId },
                  );
                } catch (updateError) {
                  console.error("Update failed, trying delete:", updateError);
                  // If update fails, try deleting the record
                  const deleteResult = await deleteRecord("ministry_members", {
                    ministry_id: ministryId,
                    user_id: memberId,
                  });
                  console.log("Delete result:", deleteResult);
                }

                // Check if ministry is linked to a course and remove from course too
                try {
                  const linkedCourses = await select("courses", {
                    where: { ministry_id: ministryId },
                  });

                  if (linkedCourses && linkedCourses.length > 0) {
                    // Remove from all linked course enrollments
                    for (const course of linkedCourses) {
                      try {
                        await update(
                          "course_enrollments",
                          { is_active: false },
                          { course_id: course.id, user_id: memberId },
                        );
                      } catch (courseError) {
                        console.error("Error removing from course:", courseError);
                        // Try deleting if update fails
                        await deleteRecord("course_enrollments", {
                          course_id: course.id,
                          user_id: memberId,
                        });
                      }
                    }
                  }
                } catch (courseError) {
                  console.error("Error handling course removal:", courseError);
                }

                // Refresh members list
                fetchMinistryMembers();

                Alert.alert("Success", "Member has been removed from the ministry");
              } catch (error) {
                console.error("Error removing member:", error);
                console.error("Error details:", JSON.stringify(error, null, 2));
                Alert.alert("Error", "Failed to remove member. Please try again.");
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error in handleKickMember:", error);
    }
  };

  // Fetch current user using Auth and CRUD APIs
  const fetchCurrentUser = async () => {
    try {
      if (user) {
        console.log("Fetching user data for ID:", user.id);
        const userData = await selectOne("users", {
          select: "first_name, last_name, profile_image",
          where: { id: user.id },
        });

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

      if (!user) {
        throw new Error("No user logged in");
      }

      // Since CRUD API doesn't support ordering properly, let's get more messages and sort client-side
      let queryOptions: any = {
        select: "id, ministry_id, user_id, message_text, sent_at, attachment_url",
        where: { ministry_id: ministryId },
        limit: 100, // Get more messages to ensure we get recent ones
      };

      console.log("Query options:", JSON.stringify(queryOptions, null, 2));

      let data = await select("ministry_messages", queryOptions);

      console.log(`Fetched ${data?.length || 0} messages`);

      if (data && data.length > 0) {
        // Sort client-side by sent_at descending (newest first)
        data = data.sort(
          (a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
        );

        // For initial load, take only the most recent messages
        if (isInitial) {
          data = data.slice(0, MESSAGES_PER_PAGE);
        } else {
          // For pagination, skip the messages we already have
          const currentMessageIds = messages.map((m) => m.id);
          data = data.filter((msg) => !currentMessageIds.includes(msg.id));
          data = data.slice(0, MESSAGES_PER_PAGE);
        }

        console.log(`After sorting and filtering: ${data?.length || 0} messages`);
      }

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

        // Fetch user details for each message using CRUD API
        const messagesWithUsers = await Promise.all(
          data.map(async (message) => {
            const userData = await selectOne("users", {
              select: "first_name, last_name, profile_image",
              where: { id: message.user_id },
            });

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
      scrollToBottomOpacity.value = withTiming(0, { duration: 200 });
      scrollToBottomScale.value = withTiming(0.8, { duration: 200 });
      scrollToBottomTranslateY.value = withTiming(20, { duration: 200 });

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
        // Removed push_sent field - might not exist in database
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

      // Save using CRUD API - don't need to update local state as realtime will handle it
      console.log("=== ATTEMPTING TO SAVE MESSAGE ===");
      console.log("Current user:", currentUser);
      console.log("Ministry ID:", ministryId);
      console.log("Message to save:", JSON.stringify(newMessage, null, 2));
      console.log("Message data types:", {
        ministry_id: typeof newMessage.ministry_id,
        user_id: typeof newMessage.user_id,
        message_text: typeof newMessage.message_text,
        sent_at: typeof newMessage.sent_at,
        attachment_url: typeof newMessage.attachment_url,
        push_sent: typeof newMessage.push_sent,
      });

      try {
        const messageResponse = await insert("ministry_messages", newMessage);
        console.log("=== CRUD API RESPONSE ===");
        console.log("Raw response:", JSON.stringify(messageResponse, null, 2));
        console.log("Response type:", typeof messageResponse);
        console.log("Is array:", Array.isArray(messageResponse));

        // Handle case where API returns an array with the inserted record
        const messageData = Array.isArray(messageResponse) ? messageResponse[0] : messageResponse;
        console.log("Processed messageData:", JSON.stringify(messageData, null, 2));

        if (!messageData) {
          console.error("No message data returned from CRUD API");
          throw new Error("No message data returned from CRUD API");
        }

        // Check different possible ID field names
        const messageId = messageData.id || messageData._id || messageData.message_id;
        console.log("Message ID found:", messageId);

        if (!messageId) {
          console.error(
            "No ID field found in response. Available fields:",
            Object.keys(messageData),
          );
          throw new Error("Failed to save message - no ID returned");
        }

        console.log("✅ Message saved successfully with ID:", messageId);

        // Verify the message was actually saved by trying to fetch it back
        setTimeout(async () => {
          try {
            console.log("=== VERIFYING MESSAGE SAVE ===");
            const verifyMessage = await selectOne("ministry_messages", {
              where: { id: messageId },
            });
            console.log("Verification result:", verifyMessage ? "✅ Found" : "❌ Not found");
            if (verifyMessage) {
              console.log("Verified message data:", JSON.stringify(verifyMessage, null, 2));
            }

            // Also try to fetch all recent messages to see what's in the table
            console.log("=== CHECKING ALL RECENT MESSAGES ===");
            const allRecentMessages = await select("ministry_messages", {
              where: { ministry_id: ministryId },
              limit: 5,
            });
            console.log(
              `Found ${allRecentMessages?.length || 0} recent messages for ministry ${ministryId}`,
            );
            allRecentMessages?.forEach((msg, index) => {
              console.log(`Message ${index + 1}:`, {
                id: msg.id,
                text: msg.message_text,
                user_id: msg.user_id,
                sent_at: msg.sent_at,
              });
            });
          } catch (verifyError) {
            console.error("Error verifying message save:", verifyError);
          }
        }, 1000);

        // Trigger notifications
        await triggerNotifications(messageId);
      } catch (insertError) {
        console.error("=== CRUD INSERT ERROR ===");
        console.error("Error type:", typeof insertError);
        console.error("Error message:", insertError.message);
        console.error("Full error:", JSON.stringify(insertError, null, 2));
        throw insertError;
      }

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

  // Function to trigger notifications via your backend API
  const triggerNotifications = async (messageId: number) => {
    try {
      console.log(
        `Invoking notifications API with messageId: ${messageId}, ministryId: ${ministryId}`,
      );

      const accessToken = await getAccessToken();

      // For now, skip notifications since the endpoint isn't set up yet
      console.log("Skipping notifications - endpoint not configured");
      const data = { success: true, message: "Notifications skipped" };

      // TODO: Implement notification endpoint in your backend
      // const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/notifications/ministry`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${accessToken}`
      //   },
      //   body: JSON.stringify({
      //     messageId: messageId,
      //     ministryId: ministryId,
      //   })
      // });
      //
      // if (!response.ok) {
      //   throw new Error(`HTTP ${response.status}`);
      // }
      //
      // const data = await response.json();

      console.log("Notification result:", data);
    } catch (error) {
      console.error("Exception in triggerNotifications:", error);

      // Log additional details if available
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
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

      // Upload file via your backend API
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: fileName,
      } as any);
      formData.append("ministry_id", ministryId.toString());

      const accessToken = await getAccessToken();
      const uploadResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/uploads/ministry-attachment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      const publicUrl = uploadResult.url;

      // Track progress manually
      setUploadProgress(0.9);

      setAttachmentUrl(publicUrl);
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

      // Show scroll to bottom button
      scrollToBottomOpacity.value = withTiming(1, { duration: 200 });
      scrollToBottomScale.value = withSpring(1);
      scrollToBottomTranslateY.value = withTiming(0, { duration: 200 });
    } else if (offsetY <= 20 && isScrolledUp) {
      setIsScrolledUp(false);
      setUnreadMessages(0);

      // Hide scroll to bottom button
      scrollToBottomOpacity.value = withTiming(0, { duration: 200 });
      scrollToBottomScale.value = withTiming(0.8, { duration: 200 });
      scrollToBottomTranslateY.value = withTiming(20, { duration: 200 });
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

    // Animate button disappearing
    scrollToBottomOpacity.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(0, { duration: 200 }),
    );
    scrollToBottomScale.value = withSequence(
      withTiming(1.1, { duration: 100 }),
      withTiming(0.8, { duration: 200 }),
    );
    scrollToBottomTranslateY.value = withTiming(20, { duration: 200 });

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
      opacity: scrollToBottomOpacity.value,
      transform: [
        { scale: scrollToBottomScale.value },
        { translateY: scrollToBottomTranslateY.value },
      ],
      position: "absolute",
      bottom: Platform.OS === "ios" ? (keyboardVisible ? 190 : 145) : keyboardVisible ? 180 : 135,
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
      <View style={[styles.emptyContainer, { transform: [{ scaleY: -1 }] }]}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={35} color={THEME.primary} />
        </View>
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

  // Setup notification handlers
  useEffect(() => {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Set up notification received handler
    const notificationReceivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
        // You could update the unread count or refresh messages here
      },
    );

    // Set up notification response handler (when user taps notification)
    const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Notification response:", response);
        const data = response.notification.request.content.data;

        // If the notification is for this ministry, refresh messages
        if (data?.ministryId && data.ministryId === ministryId) {
          fetchMessages();
        }
        // If it's for a different ministry, navigate there
        else if (data?.ministryId && data.ministryId !== ministryId) {
          (navigation as any).navigate("ministry-chat", { id: data.ministryId });
        }
      },
    );

    // Clean up notification listeners
    return () => {
      Notifications.removeNotificationSubscription(notificationReceivedListener);
      Notifications.removeNotificationSubscription(notificationResponseListener);
    };
  }, [ministryId]);

  // Check if app was opened from a notification
  useEffect(() => {
    checkLastNotificationResponse();
  }, []);

  // Fetch members when modal opens
  useEffect(() => {
    if (showInfoModal && ministryId && ministry) {
      fetchMinistryMembers();
    }
  }, [showInfoModal, ministryId, ministry]);

  // Function to check if app was opened from a notification
  const checkLastNotificationResponse = async () => {
    try {
      const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();

      if (lastNotificationResponse) {
        const data = lastNotificationResponse.notification.request.content.data;
        console.log("App opened from notification with data:", data);

        // Handle based on notification data
        if (data?.ministryId) {
          // If we're already on this ministry chat, just refresh
          if (data.ministryId === ministryId) {
            fetchMessages();
          }
          // Otherwise navigate to the correct ministry chat
          else {
            (navigation as any).navigate("ministry-chat", { id: data.ministryId });
          }
        }
      }
    } catch (error) {
      console.error("Error checking last notification:", error);
    }
  };

  // Fixed keyExtractor to ensure unique keys
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={THEME.headerGreen} />

      {/* iOS Safe Area Background */}
      <View style={styles.iosSafeArea} />

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
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          {ministry?.image_url ? (
            <Image source={{ uri: ministry.image_url }} style={styles.ministryImage} />
          ) : (
            <View style={styles.ministryImagePlaceholder}>
              <Text style={styles.ministryInitials}>
                {ministry?.name ? getInitials(ministry.name) : "?"}
              </Text>
            </View>
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

        <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfoModal(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
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
        keyboardVerticalOffset={Platform.OS === "ios" ? -80 : 0}
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
        <Animated.View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachment}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={THEME.textSecondary} />
            ) : (
              <Feather name="paperclip" size={20} color={THEME.textSecondary} />
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
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Scroll to bottom button */}
      <Animated.View style={scrollToBottomButtonStyle}>
        <TouchableOpacity style={styles.scrollToBottomButton} onPress={scrollToBottom}>
          <View style={styles.scrollToBottomBlur}>
            <Ionicons name="chevron-down" size={20} color={THEME.textSecondary} />

            {unreadMessages > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadMessages}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Ministry Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ministry Members</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            {loadingMembers ? (
              <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 20 }} />
            ) : (
              <ScrollView style={styles.membersList}>
                {ministryMembers.map((member, index) => (
                  <View key={`member-${member.user_id}-${index}`} style={styles.memberItem}>
                    <View style={styles.memberInfo}>
                      {member.user_avatar ? (
                        <Image source={{ uri: member.user_avatar }} style={styles.memberAvatar} />
                      ) : (
                        <View
                          style={[
                            styles.memberAvatarPlaceholder,
                            { backgroundColor: getAvatarColor(member.user_id) },
                          ]}
                        >
                          <Text style={styles.memberAvatarText}>
                            {getInitials(member.user_name)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>{member.user_name}</Text>
                        <Text style={styles.memberRole}>
                          {member.role === "leader" || member.role === "owner"
                            ? "Owner"
                            : member.role === "admin"
                              ? "Admin"
                              : member.member_status === "leader"
                                ? "Owner"
                                : "Member"}
                        </Text>
                      </View>
                    </View>

                    {/* Show kick button for admins/owners, but not for self or other admins/owners */}
                    {(currentUserRole === "owner" ||
                      currentUserRole === "leader" ||
                      currentUserRole === "admin") &&
                      member.user_id !== user?.id &&
                      member.role !== "owner" &&
                      member.role !== "leader" &&
                      member.role !== "admin" && (
                        <TouchableOpacity
                          style={styles.kickButton}
                          onPress={() => handleKickMember(member.user_id)}
                        >
                          <Ionicons name="close-circle" size={24} color={THEME.error} />
                        </TouchableOpacity>
                      )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // WhatsApp UI Style
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  iosSafeArea: {
    backgroundColor: THEME.headerGreen,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 50 : 0,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    paddingTop: Platform.OS === "ios" ? 50 : 8,
    borderBottomWidth: 0,
    backgroundColor: THEME.headerGreen,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginRight: -4,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  ministryImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  ministryImagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  ministryInitials: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  ministryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0,
  },
  ministryDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
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
    padding: 8,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 2,
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
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  messageContent: {
    padding: 12,
    borderRadius: 18,
  },
  currentUserContent: {
    backgroundColor: THEME.messageGreen,
    borderRadius: 7,
    borderTopRightRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.08,
    shadowRadius: 0.5,
    elevation: 1,
    maxWidth: "80%",
  },
  otherUserContent: {
    backgroundColor: THEME.surface,
    borderRadius: 7,
    borderTopLeftRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.08,
    shadowRadius: 0.5,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.primary,
    marginBottom: 2,
    letterSpacing: 0,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0,
  },
  currentUserText: {
    color: THEME.text,
    fontWeight: "400",
  },
  otherUserText: {
    color: THEME.text,
    fontWeight: "400",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
    alignSelf: "flex-end",
  },
  currentUserTime: {
    color: THEME.textSecondary,
    fontSize: 11,
  },
  otherUserTime: {
    color: THEME.textSecondary,
    fontSize: 11,
  },
  dateContainer: {
    alignItems: "center",
    marginVertical: 8,
    width: "100%",
  },
  dateText: {
    fontSize: 12,
    color: THEME.textSecondary,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    overflow: "hidden",
    textAlign: "center",
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingVertical: 5,
    paddingBottom: 5,
    marginBottom: Platform.OS === "ios" ? 80 : 70,
    borderTopWidth: 0,
    backgroundColor: THEME.inputBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 2,
  },
  attachButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    marginBottom: 4,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 21,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 0,
    maxHeight: 100,
    minHeight: 42,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.03,
    shadowRadius: 0.5,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    maxHeight: 84,
    minHeight: 26,
    paddingTop: 0,
    paddingBottom: 0,
    letterSpacing: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.textLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  sendButtonActive: {
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
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
    marginTop: 250,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(37, 211, 102, 0.1)",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: THEME.text,
    marginBottom: 8,
    letterSpacing: 0,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: 0,
    maxWidth: "75%",
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
  // WhatsApp scroll to bottom button
  scrollToBottomButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  scrollToBottomBlur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.surface,
    borderWidth: 0.5,
    borderColor: THEME.border,
  },
  unreadBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.text,
  },
  membersList: {
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.text,
  },
  memberRole: {
    fontSize: 14,
    color: THEME.textSecondary,
    textTransform: "capitalize",
  },
  kickButton: {
    padding: 8,
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
