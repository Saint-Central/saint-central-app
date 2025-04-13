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
  Keyboard,
  Dimensions,
  Pressable,
  DrawerLayoutAndroid,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../supabaseClient";
import { Ionicons, FontAwesome5, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Interface definitions
interface Church {
  id: number;
  name: string;
  category: string;
  description: string;
  founded: string;
  phone: string;
  email: string;
  mass_schedule: string;
  website: string;
  image?: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
}

interface ChurchMember {
  id: number;
  church_id: number;
  user_id: string;
  joined_at: string;
  role: string;
  hide_email: boolean;
  hide_phone: boolean;
  hide_name: boolean;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
  profile_image?: string;
  phone_number?: string;
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

interface Ministry {
  id: number;
  church_id: number;
  name: string;
  description: string;
  is_system_generated?: boolean;
  created_at: string;
  image_url?: string;
}

// AsyncStorage keys for caching
const MINISTRY_MESSAGES_CACHE_KEY = (ministryId: number) => `ministry_messages_${ministryId}`;
const CHURCH_MEMBERS_CACHE_KEY = (churchId: number) => `church_members_${churchId}`;
const CHURCH_CACHE_KEY = (churchId: number) => `church_details_${churchId}`;

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

// Create memoized components to improve performance
const MessageItem = React.memo(({
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
});

// Create a memoized date divider component
const DateDivider = React.memo(({ date }: { date: string }) => (
  <View style={styles.dateDividerContainer}>
    <View style={styles.dateDividerLine} />
    <View style={styles.dateDividerTextContainer}>
      <Text style={styles.dateDividerText}>{formatMessageDate(date)}</Text>
    </View>
    <View style={styles.dateDividerLine} />
  </View>
));

// Create load more header component
const LoadingHeader = React.memo(() => (
  <View style={styles.loadMoreHeader}>
    <ActivityIndicator size="small" color="#5B6EF5" />
    <Text style={styles.loadMoreText}>Loading older messages...</Text>
  </View>
));

// Enhanced Member item component for the sidebar with admin controls
const MemberItem = React.memo(({ 
  member, 
  isAdmin,
  currentUserRole,
  currentUserId,
  onRemoveMember,
  onBanMember 
}: { 
  member: User & { role?: string };
  isAdmin: boolean;
  currentUserRole: string;
  currentUserId: string;
  onRemoveMember: (userId: string) => void;
  onBanMember: (userId: string) => void;
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const avatarColor = getAvatarColor(`${member.first_name} ${member.last_name}`);
  const initials = getInitials(`${member.first_name} ${member.last_name}`);
  const canManageMember = (currentUserRole === 'admin' || currentUserRole === 'owner') && 
                         member.id !== currentUserId && 
                         member.role !== 'owner'; // Can't manage owners
  
  const toggleOptions = () => {
    if (canManageMember) {
      setShowOptions(!showOptions);
    }
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.memberItem}
        onPress={toggleOptions}
        activeOpacity={canManageMember ? 0.7 : 1}
      >
        <View style={styles.memberAvatar}>
          {member.profile_image ? (
            <Image source={{ uri: member.profile_image }} style={styles.memberAvatarImage} />
          ) : (
            <View style={[styles.memberAvatarPlaceholder, { backgroundColor: avatarColor }]}>
              <Text style={styles.memberAvatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.memberInfoContainer}>
          <Text style={styles.memberName}>{member.first_name} {member.last_name}</Text>
          {member.role && (
            <View style={[
              styles.roleBadge, 
              member.role === 'admin' ? styles.adminBadge : 
              member.role === 'owner' ? styles.ownerBadge : 
              styles.memberBadge
            ]}>
              <Text style={styles.roleBadgeText}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Text>
            </View>
          )}
        </View>
        
        {canManageMember && (
          <TouchableOpacity 
            style={styles.memberOptionsButton}
            onPress={toggleOptions}
          >
            <MaterialIcons name="more-vert" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      
      {showOptions && (
        <Animated.View 
          style={styles.memberOptionsContainer}
        >
          <TouchableOpacity 
            style={styles.memberOptionItem}
            onPress={() => {
              setShowOptions(false);
              onRemoveMember(member.id);
            }}
          >
            <Ionicons name="person-remove-outline" size={16} color="#EF4444" />
            <Text style={styles.memberOptionText}>Remove from chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.memberOptionItem}
            onPress={() => {
              setShowOptions(false);
              onBanMember(member.id);
            }}
          >
            <Ionicons name="ban-outline" size={16} color="#EF4444" />
            <Text style={styles.memberOptionText}>Ban user</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
});

// Input area component
const InputArea = React.memo(({
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
  const [inputHeight, setInputHeight] = useState(40);
  const inputRef = useRef<TextInput>(null);

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(40, height), 120);
    setInputHeight(newHeight);
  };

  const handleSend = () => {
    if (!value.trim()) return;
    
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Vibration.vibrate(10); // Light haptic feedback
    }
    
    onSend();
    
    // Better focus management
    inputRef.current?.focus();
    
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
        onPress={() => inputRef.current?.focus()}
      >
        <Ionicons name="add-circle-outline" size={24} color="#5B6EF5" />
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        style={[styles.messageInput, { height: inputHeight }]}
        placeholder="Type a message..."
        placeholderTextColor="#A3A3A3"
        value={value}
        onChangeText={onChangeText}
        onContentSizeChange={handleContentSizeChange}
        multiline
        maxLength={1000}
        onFocus={onFocus}
        onBlur={onBlur}
        blurOnSubmit={false}
        keyboardType="default"
        textAlignVertical="center"
        autoCapitalize="sentences"
        returnKeyType="default"
        enablesReturnKeyAutomatically={true}
        selectionColor="#5B6EF5"
      />

      <Pressable
        style={({ pressed }) => [
          styles.sendButton,
          !value.trim() && styles.sendButtonDisabled,
          pressed && value.trim() && styles.sendButtonPressed,
        ]}
        onPress={handleSend}
        disabled={!value.trim()}
      >
        <Ionicons name="paper-plane" size={20} color={value.trim() ? "#FFFFFF" : "#A3A3A3"} />
      </Pressable>
    </View>
  );
});

// Scroll to bottom button component
const ScrollToBottomButton = React.memo(({
  visible,
  showIndicator,
  count,
  onPress
}: {
  visible: boolean;
  showIndicator: boolean;
  count: number;
  onPress: () => void;
}) => {
  if (!visible) return null;
  
  return (
    <TouchableOpacity
      style={styles.scrollToBottomButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.scrollButtonContent}>
        <Ionicons name="arrow-down" size={20} color="#FFFFFF" />
        {showIndicator && count > 0 && (
          <View style={styles.newMessageBadge}>
            <Text style={styles.newMessageBadgeText}>
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Function to check if a Community Chat ministry exists, and create one if it doesn't
async function ensureCommunityChat(churchId: number, userId: string) {
  try {
    // First check if a Community Chat ministry already exists for this church
    const { data: existingMinistry, error: checkError } = await supabase
      .from('ministries')
      .select('id')
      .eq('church_id', churchId)
      .eq('name', 'Community Chat')
      .maybeSingle();

    // If it already exists, return it
    if (existingMinistry) {
      return { 
        ministryId: existingMinistry.id, 
        created: false, 
        error: null 
      };
    }
    
    // If it doesn't exist, create it
    const { data: newMinistry, error: createError } = await supabase
      .from('ministries')
      .insert({
        church_id: churchId,
        name: 'Community Chat',
        description: 'Church-wide community chat for all members',
        created_at: new Date().toISOString(),
        is_system_generated: true
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating Community Chat ministry:', createError);
      return { ministryId: null, created: false, error: createError };
    }

    // Also add the user as a member of this ministry
    if (newMinistry) {
      const { error: memberError } = await supabase
        .from('ministry_members')
        .insert({
          ministry_id: newMinistry.id,
          user_id: userId,
          church_id: churchId,
          joined_at: new Date().toISOString(),
          role: 'member'
        });

      if (memberError) {
        console.error('Error adding user to Community Chat:', memberError);
      }
    }

    return { 
      ministryId: newMinistry?.id || null, 
      created: true, 
      error: null 
    };
  } catch (error) {
    console.error('Error in ensureCommunityChat:', error);
    return { ministryId: null, created: false, error };
  }
}

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  // Get church ID from params or current user's church
  const [churchId, setChurchId] = useState<number | null>(null);
  const [communityMinistry, setCommunityMinistry] = useState<Ministry | null>(null);
  
  // Screen dimensions for responsive design
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
  
  // State variables
  const [church, setChurch] = useState<Church | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<(User & { role?: string })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  
  // State for pagination and loading
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [allMessagesLoaded, setAllMessagesLoaded] = useState<boolean>(false);
  
  // UI state
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(false);
  const [recentlySentMessageIds, setRecentlySentMessageIds] = useState<Set<string | number>>(new Set());
  
  // New UI state for enhanced scrolling
  const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState<boolean>(false);
  const [newMessageCount, setNewMessageCount] = useState<number>(0);
  
  // Refs
  const messageListRef = useRef<FlatList<any>>(null);
  const drawerRef = useRef<DrawerLayoutAndroid>(null);
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingUp = useRef<boolean>(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  
  // Enhanced sidebar animation using standard React Native Animated
  const sidebarTranslateX = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, 0],
  });

  // Overlay animation for modal effect
  const overlayOpacity = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  
  // Header animations based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 5],
    extrapolate: 'clamp',
  });

  // Get current user and setup
  useEffect(() => {
    const setupScreen = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
  
        if (userError) {
          console.error("Error getting current user:", userError);
          throw userError;
        }
  
        if (!user) {
          console.error("No user logged in");
          Alert.alert("Error", "You must be logged in to view the community");
          router.replace("/(auth)/auth");
          return;
        }
  
        // Get user profile
        const { data: userData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
  
        if (profileError) {
          console.error("Error fetching user profile:", profileError);
        } else {
          setCurrentUser(userData);
        }
  
        // Get user's church and role
        const { data: churchMember, error: churchMemberError } = await supabase
          .from("church_members")
          .select("church_id, role")
          .eq("user_id", user.id)
          .single();
  
        if (churchMemberError) {
          console.error("Error fetching church member data:", churchMemberError);
          Alert.alert("Error", "You must be a member of a church to view community");
          router.replace("/(tabs)/home");
          return;
        }
  
        const userChurchId = churchMember.church_id;
        setChurchId(userChurchId);
        setCurrentUserRole(churchMember.role || "member");
        
        // Ensure Community Chat ministry exists
        const { ministryId, error: minError } = await ensureCommunityChat(userChurchId, user.id);
        
        if (minError || !ministryId) {
          console.error("Error ensuring community chat:", minError);
          Alert.alert(
            "Community Chat Unavailable",
            "Could not access community chat. Please try again later."
          );
          router.back();
          return;
        }
        
        // Get ministry details
        const { data: ministryData, error: ministryError } = await supabase
          .from("ministries")
          .select("*")
          .eq("id", ministryId)
          .single();
          
        if (ministryError) {
          console.error("Error fetching ministry details:", ministryError);
          Alert.alert("Error", "Could not load community chat details");
          router.back();
          return;
        }
        
        setCommunityMinistry(ministryData);
        
        // Animate content fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();
        
        // Load church data and messages
        await fetchData(userChurchId, ministryId);
      } catch (error) {
        console.error("Error in setupScreen:", error);
        setError(error instanceof Error ? error : new Error("An error occurred during setup"));
        setLoading(false);
      }
    };
  
    setupScreen();
    
    // Set up keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setIsInputFocused(true);
        setKeyboardHeight(e.endCoordinates.height);
        
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          if (messageListRef.current) {
            messageListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsInputFocused(false);
        setKeyboardHeight(0);
      }
    );
    
    // Clean up listeners
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  // Setup real-time messaging
  useEffect(() => {
    if (!communityMinistry) return;
    
    // Setup real-time subscription with improved connection handling
    const setupRealtimeMessaging = () => {
      const channel = supabase
        .channel(`community_chat_${communityMinistry.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ministry_messages",
            filter: `ministry_id=eq.${communityMinistry.id}`,
          },
          (payload) => {
            handleRealtimeMessage(payload.new as Message);
          }
        )
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") {
            console.warn("Subscription status:", status);
            
            // Retry subscription on failure after a delay
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setTimeout(() => {
                console.log("Retrying subscription...");
                setupRealtimeMessaging();
              }, 5000);
            }
          }
        });
        
      return channel;
    };
    
    // Initialize the subscription
    const subscription = setupRealtimeMessaging();
    
    // Load initial messages
    if (communityMinistry) {
      // Try loading from cache first
      AsyncStorage.getItem(MINISTRY_MESSAGES_CACHE_KEY(communityMinistry.id))
        .then(cachedMessages => {
          if (cachedMessages) {
            try {
              const parsedMessages = JSON.parse(cachedMessages);
              if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                console.log("Using cached messages");
                setMessages(parsedMessages);
                
                // Still fetch fresh messages but don't show loading indicator
                fetchMessages(communityMinistry.id);
              } else {
                // Cache exists but is empty, do normal fetch
                fetchMessages(communityMinistry.id);
              }
            } catch (error) {
              console.error("Error parsing cached messages:", error);
              fetchMessages(communityMinistry.id);
            }
          } else {
            // No cache, do normal fetch
            fetchMessages(communityMinistry.id);
          }
        })
        .catch(error => {
          console.error("Error reading message cache:", error);
          fetchMessages(communityMinistry.id);
        });
    }
    
    // Clean up
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [communityMinistry]);

  // Fetch all necessary data
  const fetchData = async (churchId: number, ministryId: number) => {
    try {
      setLoading(true);
      
      // Fetch church details
      const { data: churchData, error: churchError } = await supabase
        .from("churches")
        .select("*")
        .eq("id", churchId)
        .single();
      
      if (churchError) {
        console.error("Error fetching church data:", churchError);
        throw churchError;
      }
      
      setChurch(churchData);
      await AsyncStorage.setItem(CHURCH_CACHE_KEY(churchId), JSON.stringify(churchData));
      
      // Fetch messages
      await fetchMessages(ministryId);
      
      // Fetch church members
      await fetchMembers(churchId);
    } catch (error) {
      console.error("Error in fetchData:", error);
      setError(error instanceof Error ? error : new Error("Failed to load data"));
    } finally {
      setLoading(false);
    }
  };

  // Enhanced message fetching with improved pagination and caching
  const fetchMessages = async (ministryId: number, loadOlder: boolean = false) => {
    try {
      // Avoid unnecessary calls if all messages are already loaded
      if (loadOlder && allMessagesLoaded) {
        console.log("All messages already loaded");
        return;
      }
      
      // Set appropriate loading states
      if (loadOlder) {
        setIsLoadingMore(true);
      } else if (messages.length === 0) {
        setMessageLoading(true);
      }
      
      // Keep track of current messages if loading older messages
      const currentMessages = loadOlder ? [...messages] : [];
      
      // Build the database query with proper pagination
      let query = supabase
        .from("ministry_messages")
        .select("*")
        .eq("ministry_id", ministryId)
        .order("sent_at", { ascending: false }) // Newest first for pagination
        .limit(20);
      
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
        } else {
          // No messages found for initial load
          setMessages([]);
        }
        setMessageLoading(false);
        setIsLoadingMore(false);
        return;
      }
      
      // Sort messages newest to oldest for processing
      const sortedMessages = [...messagesData].sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
      );
      
      // Update the oldest message timestamp for next pagination
      if (sortedMessages.length > 0) {
        const oldestMessage = sortedMessages[sortedMessages.length - 1];
        setOldestMessageTimestamp(oldestMessage.sent_at);
      }
      
      // Get unique user IDs from messages for efficient fetching
      const userIds = [...new Set(messagesData.map((msg) => msg.user_id))];
      
      // Create a cache of already known users to avoid unnecessary fetching
      const knownUsers = new Map<string, User>();
      
      // Populate known users from current messages
      messages.forEach(msg => {
        if (msg.user && msg.user.id) {
          knownUsers.set(msg.user.id, msg.user);
        }
      });
      
      // Filter user IDs to only fetch those we don't have cached
      const userIdsToFetch = userIds.filter(id => !knownUsers.has(id));
      
      // Only fetch users we don't already have
      let userMap: Record<string, User> = {};
      if (userIdsToFetch.length > 0) {
        try {
          const { data: usersData } = await supabase
            .from("users")
            .select("id, email, first_name, last_name, profile_image, created_at, updated_at, phone_number")
            .in("id", userIdsToFetch);
            
          // Add fetched users to our map
          if (usersData) {
            usersData.forEach(user => {
              userMap[user.id] = user;
            });
          }
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      }
      
      // Add known users to the map
      knownUsers.forEach((user, id) => {
        userMap[id] = user;
      });
      
      // Process and attach user data to messages
      const messagesWithUsers = sortedMessages
        .map((message) => ({
          ...message,
          user: userMap[message.user_id] || undefined,
          _status: "sent" as "sending" | "sent" | "error",
        }))
        .reverse(); // Reverse back to chronological order for display
      
      // Update state with new messages
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
          MINISTRY_MESSAGES_CACHE_KEY(ministryId),
          JSON.stringify(combinedMessages)
        ).catch(err => console.error("Error updating message cache:", err));
      } else {
        // Initial load - replace messages
        setMessages(messagesWithUsers);
        
        // Update cache
        AsyncStorage.setItem(
          MINISTRY_MESSAGES_CACHE_KEY(ministryId),
          JSON.stringify(messagesWithUsers)
        ).catch(err => console.error("Error updating message cache:", err));
        
        // Scroll to bottom after initial messages are loaded
        setTimeout(() => {
          messageListRef.current?.scrollToEnd({ animated: false });
        }, 300);
      }
    } catch (error) {
      console.error("Error in fetchMessages:", error);
      Alert.alert("Error", "Failed to load messages. Please try again.");
    } finally {
      setMessageLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Enhanced fetch church members to include roles
  const fetchMembers = async (churchId: number) => {
    try {
      setMembersLoading(true);
      
      // Get members of this church with roles
      const { data: memberData, error: memberError } = await supabase
        .from("church_members")
        .select("user_id, role")
        .eq("church_id", churchId);
      
      if (memberError) {
        console.error("Error fetching church members:", memberError);
        throw memberError;
      }
      
      if (!memberData || memberData.length === 0) {
        setMembers([]);
        setMembersLoading(false);
        return;
      }
      
      // Create a map of user_id to role
      const userRoleMap = new Map();
      memberData.forEach(member => {
        userRoleMap.set(member.user_id, member.role);
      });
      
      // Get user IDs from member data
      const userIds = memberData.map(member => member.user_id);
      
      // Fetch user details for all members
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, profile_image, created_at, updated_at, phone_number")
        .in("id", userIds);
      
      if (usersError) {
        console.error("Error fetching member details:", usersError);
        throw usersError;
      }
      
      // Add role to user objects
      const membersWithRoles = usersData.map(user => ({
        ...user,
        role: userRoleMap.get(user.id) || "member"
      }));
      
      // First sort by role importance: owner > admin > member
      // Then sort alphabetically by first name within each role group
      const sortedMembers = membersWithRoles.sort((a, b) => {
        const roleOrder = { "owner": 0, "admin": 1, "member": 2 };
        const roleA = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
        const roleB = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
        
        if (roleA !== roleB) {
          return roleA - roleB;
        }
        return a.first_name.localeCompare(b.first_name);
      });
      
      setMembers(sortedMembers);
      
      // Cache member data
      AsyncStorage.setItem(
        CHURCH_MEMBERS_CACHE_KEY(churchId),
        JSON.stringify(sortedMembers)
      );
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setMembersLoading(false);
    }
  };

  // Optimized handling of real-time messages with better duplicate detection
  const handleRealtimeMessage = async (message: Message) => {
    try {
      // Enhanced duplicate detection - more thorough checks
      // 1. Check by ID if it's already in our messages
      // 2. Check by content, user_id and timestamp to catch optimistic updates
      // 3. Check if it's in our recently sent IDs set
      const isExistingMessage = messages.some(msg => msg.id === message.id);
      const isSimilarMessage = messages.some(msg => 
        msg.user_id === message.user_id && 
        msg.message_text === message.message_text && 
        Math.abs(new Date(msg.sent_at).getTime() - new Date(message.sent_at).getTime()) < 5000
      );
      const isRecentlySent = recentlySentMessageIds.has(message.id);
      
      // Skip the message if it's a duplicate by any criteria
      if (isExistingMessage || isSimilarMessage || isRecentlySent) {
        console.log("Skipping duplicate real-time message:", message.id);
        return;
      }
      
      // Look for cached user data first before fetching
      let messageUser = messages.find(msg => msg.user_id === message.user_id)?.user;
      
      // If we don't have user data cached, fetch it
      if (!messageUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", message.user_id)
          .single();
          
        if (userData) {
          messageUser = userData;
        }
      }
      
      // Create complete message object with user data
      const newMessage = {
        ...message,
        user: messageUser,
        _status: "sent" as "sending" | "sent" | "error",
      };
      
      // Update messages state with the new message
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, newMessage];
        
        // Update cache in background
        if (communityMinistry) {
          AsyncStorage.setItem(
            MINISTRY_MESSAGES_CACHE_KEY(communityMinistry.id),
            JSON.stringify(updatedMessages)
          ).catch(err => console.error("Error updating message cache:", err));
        }
        
        return updatedMessages;
      });
      
      // Smart scrolling based on user position
      const shouldAutoScroll = !isUserScrollingUp.current;
      
      if (shouldAutoScroll) {
        // If user is at bottom, scroll to show new message
        setTimeout(() => {
          messageListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // If user is scrolled up, show new message indicator 
        setNewMessageCount(prev => prev + 1);
        setShowNewMessageIndicator(true);
      }
    } catch (error) {
      console.error("Error handling real-time message:", error);
    }
  };

  // Improved send message with better optimistic updates and error handling
  const sendMessage = async () => {
    if (!newMessage.trim() || !communityMinistry || !currentUser) return;
    
    try {
      // Get message text and clear input immediately
      const messageText = newMessage.trim();
      setNewMessage("");
      
      // Generate unique temporary ID
      const tempId = `temp-${Date.now()}`;
      
      // Create temporary message for optimistic UI update
      const now = new Date().toISOString();
      const tempMessage = {
        id: tempId,
        ministry_id: communityMinistry.id,
        user_id: currentUser.id,
        sent_at: now,
        message_text: messageText,
        user: currentUser,
        _status: "sending" as "sending" | "sent" | "error",
      };
      
      // Add message to state optimistically
      setMessages((prev) => [...prev, tempMessage]);
      
      // Scroll to bottom to show the new message
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      
      // Send message to server
      const { data, error } = await supabase
        .from("ministry_messages")
        .insert({
          ministry_id: communityMinistry.id,
          user_id: currentUser.id,
          message_text: messageText,
        })
        .select();
      
      if (error) {
        console.error("Error sending message:", error);
        
        // Update message status to error
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, _status: "error" } : msg))
        );
        
        // Update cache with error status
        if (communityMinistry) {
          const updatedMessages = messages.map((msg) =>
            msg.id === tempId ? { ...msg, _status: "error" } : msg
          );
          
          AsyncStorage.setItem(
            MINISTRY_MESSAGES_CACHE_KEY(communityMinistry.id),
            JSON.stringify(updatedMessages)
          ).catch(err => console.error("Error updating message cache:", err));
        }
      } else if (data && data[0]) {
        // Add server-generated ID to recently sent list to prevent duplicates
        setRecentlySentMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(data[0].id);
          
          // Clean up old IDs after 5 seconds
          setTimeout(() => {
            setRecentlySentMessageIds((current) => {
              const updatedSet = new Set(current);
              updatedSet.delete(data[0].id);
              return updatedSet;
            });
          }, 5000);
          
          return newSet;
        });
        
        // Replace temp message with actual message from server
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...data[0], user: currentUser, _status: "sent" } : msg
          )
        );
        
        // Update cache with the confirmed message
        if (communityMinistry) {
          const updatedMessages = messages.map((msg) =>
            msg.id === tempId ? { ...data[0], user: currentUser, _status: "sent" } : msg
          );
          
          AsyncStorage.setItem(
            MINISTRY_MESSAGES_CACHE_KEY(communityMinistry.id),
            JSON.stringify(updatedMessages)
          ).catch(err => console.error("Error updating message cache:", err));
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  // Enhanced toggle sidebar with animation from MinistryDetails component
  const toggleSidebar = () => {
    const newState = !isSidebarVisible;
    setIsSidebarVisible(newState);
    
    // Animate sidebar using Animated API
    Animated.timing(sidebarAnim, {
      toValue: newState ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      // If closing, update state after animation completes
      if (!newState) {
        setIsSidebarVisible(false);
      }
    });
  };

  // Handle removal of member from chat
  const handleRemoveMember = async (userId: string) => {
    if (!churchId || !communityMinistry || !currentUser) return;
    
    try {
      // Confirm with user first
      Alert.alert(
        "Remove Member",
        "Are you sure you want to remove this user from the community chat?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              // Show loading indicator
              setMembersLoading(true);
              
              // Remove the user from the ministry_members table
              const { error } = await supabase
                .from("ministry_members")
                .delete()
                .match({
                  ministry_id: communityMinistry.id,
                  user_id: userId,
                });
              
              if (error) {
                console.error("Error removing member:", error);
                Alert.alert("Error", "Failed to remove member. Please try again.");
              } else {
                // Update members list
                setMembers(prevMembers => 
                  prevMembers.filter(member => member.id !== userId)
                );
                
                // Show success message
                Alert.alert("Success", "Member has been removed from the community chat.");
              }
              
              setMembersLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error removing member:", error);
      Alert.alert("Error", "Failed to remove member. Please try again.");
      setMembersLoading(false);
    }
  };
  
  // Handle banning a user
  const handleBanMember = async (userId: string) => {
    if (!churchId || !communityMinistry || !currentUser) return;
    
    try {
      // Confirm with user first
      Alert.alert(
        "Ban Member",
        "Are you sure you want to ban this user? They will be removed from the chat and won't be able to rejoin.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Ban",
            style: "destructive",
            onPress: async () => {
              // Show loading indicator
              setMembersLoading(true);
              
              // First remove from ministry_members
              const { error: removeError } = await supabase
                .from("ministry_members")
                .delete()
                .match({
                  ministry_id: communityMinistry.id,
                  user_id: userId,
                });
              
              if (removeError) {
                console.error("Error removing member before ban:", removeError);
                Alert.alert("Error", "Failed to ban member. Please try again.");
                setMembersLoading(false);
                return;
              }
              
              // Then add to banned_users table
              const { error: banError } = await supabase
                .from("banned_users")
                .insert({
                  ministry_id: communityMinistry.id,
                  user_id: userId,
                  banned_by: currentUser.id,
                  banned_at: new Date().toISOString(),
                });
              
              if (banError) {
                console.error("Error banning member:", banError);
                Alert.alert("Error", "Failed to ban member. Please try again.");
              } else {
                // Update members list
                setMembers(prevMembers => 
                  prevMembers.filter(member => member.id !== userId)
                );
                
                // Show success message
                Alert.alert("Success", "Member has been banned from the community chat.");
              }
              
              setMembersLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error banning member:", error);
      Alert.alert("Error", "Failed to ban member. Please try again.");
      setMembersLoading(false);
    }
  };

  // Enhanced scroll handler with improved detection for loading older messages
  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number }, layoutMeasurement: any, contentSize: any } }) => {
    // Track scroll position for header opacity
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
    
    // Get detailed scroll information
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    
    // Check if we're near the top (within 10% of visible height)
    const isNearTop = offsetY < (layoutMeasurement.height * 0.1);
    
    // Load more messages if near top and not already loading/finished
    if (isNearTop && 
        !isLoadingMore && 
        !allMessagesLoaded && 
        messages.length >= 15 && 
        communityMinistry) {
      // Debounce loading to prevent multiple calls
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
      
      loadMoreTimeoutRef.current = setTimeout(() => {
        console.log("Loading older messages...");
        fetchMessages(communityMinistry.id, true);
      }, 300);
    }
    
    // Check if user has scrolled up from bottom to show scroll button
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const isScrolledUp = distanceFromBottom > 300; // Show button when 300px from bottom
    
    // Update scroll button visibility
    setShowScrollToBottom(isScrolledUp);
  };

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

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    const seenMessageIds = new Set<string | number>();
    
    messages.forEach((message) => {
      // Skip duplicates
      if (seenMessageIds.has(message.id)) {
        return;
      }
      
      // Add ID to seen set
      seenMessageIds.add(message.id);
      
      const messageDate = new Date(message.sent_at).toDateString();
      
      // Find existing group or create new one
      const existingGroup = groups.find(
        (group) => new Date(group.date).toDateString() === messageDate
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
    ({ item }: { item: { date: string; messages: Message[] } }) => (
      <View key={item.date}>
        <DateDivider date={item.date} />
        {item.messages.map((message) => (
          <View key={`msg-${message.id}-${message._status}`}>
            <MessageItem
              message={message}
              isCurrentUser={message.user_id === currentUser?.id}
              renderUserAvatar={renderUserAvatar}
            />
          </View>
        ))}
      </View>
    ),
    [currentUser?.id, renderUserAvatar]
  );

  // Enhanced render sidebar content with admin controls
  const renderSidebarContent = () => (
    <View style={styles.sidebarContainer}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarHeaderText}>Community Members</Text>
        {membersLoading ? (
          <ActivityIndicator size="small" color="#5B6EF5" />
        ) : (
          <Text style={styles.memberCount}>{members.length} members</Text>
        )}
      </View>
      
      <FlatList
        data={members}
        renderItem={({ item }) => (
          <MemberItem 
            member={item} 
            isAdmin={currentUserRole === 'admin' || currentUserRole === 'owner'}
            currentUserRole={currentUserRole}
            currentUserId={currentUser?.id || ''}
            onRemoveMember={handleRemoveMember}
            onBanMember={handleBanMember}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.membersList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  // Navigate back
  const navigateBack = () => {
    router.back();
  };

  // Scroll to bottom handler
  const scrollToBottom = () => {
    messageListRef.current?.scrollToEnd({ animated: true });
    setShowNewMessageIndicator(false);
    setNewMessageCount(0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={styles.loadingText}>Loading community...</Text>
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
            {error?.message || "Could not load community"}
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={navigateBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // For Android, use the native DrawerLayoutAndroid component
  if (Platform.OS === 'android') {
    return (
      <DrawerLayoutAndroid
        ref={drawerRef}
        drawerWidth={280}
        drawerPosition="right"
        renderNavigationView={renderSidebarContent}
        onDrawerOpen={() => setIsSidebarVisible(true)}
        onDrawerClose={() => setIsSidebarVisible(false)}
      >
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          
          {/* Floating header effect */}
          <Animated.View
            style={[
              styles.floatingHeader,
              {
                opacity: headerOpacity,
                elevation: headerElevation
              }
            ]}
          >
            <BlurView intensity={85} tint="light" style={styles.blurView} />
          </Animated.View>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
              <Ionicons name="arrow-back" size={24} color="#5B6EF5" />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {church?.name || "Community"}
              </Text>
              <Text style={styles.headerSubtitle}>Community Chat</Text>
            </View>
            
            <TouchableOpacity
              style={styles.membersButton}
              onPress={toggleSidebar}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={24} color="#5B6EF5" />
              <View style={styles.memberCountBadge}>
                <Text style={styles.memberCountBadgeText}>{members.length || 0}</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Main chat content */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            keyboardVerticalOffset={Platform.select({ ios: 100, android: 0 })}
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
                      { paddingBottom: 120 }, // Ensure padding for last message
                    ]}
                    onScroll={handleScroll}
                    scrollEventThrottle={200}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={11}
                    removeClippedSubviews={true}
                    maintainVisibleContentPosition={{
                      minIndexForVisible: 0,
                      autoscrollToTopThreshold: 10,
                    }}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => {
                      if (messages.length > 0 && !isLoadingMore && !isUserScrollingUp.current) {
                        messageListRef.current?.scrollToEnd({ animated: false });
                      }
                    }}
                    onLayout={() => {
                      if (messages.length > 0 && !isLoadingMore && !isUserScrollingUp.current) {
                        messageListRef.current?.scrollToEnd({ animated: false });
                      }
                    }}
                    ListHeaderComponent={isLoadingMore ? <LoadingHeader /> : null}
                    onScrollBeginDrag={() => {
                      isUserScrollingUp.current = true;
                    }}
                    onMomentumScrollEnd={() => {
                      // Reset the flag after scrolling stops with a small delay
                      setTimeout(() => {
                        isUserScrollingUp.current = false;
                      }, 300);
                    }}
                  />
                )}
              </Animated.View>
              
              {/* Scroll to bottom button */}
              <ScrollToBottomButton 
                visible={showScrollToBottom}
                showIndicator={showNewMessageIndicator}
                count={newMessageCount}
                onPress={scrollToBottom}
              />
            </View>
          </KeyboardAvoidingView>
          
          {/* Input area for new messages */}
          <View
            style={[
              styles.inputAreaContainer,
              {
                bottom: keyboardHeight > 0 ? keyboardHeight : 0,
                paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 10),
                marginBottom: keyboardHeight > 0 ? 0 : 60,
              },
            ]}
          >
            <InputArea
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
          </View>
        </SafeAreaView>
      </DrawerLayoutAndroid>
    );
  }

  // For iOS, use an enhanced custom sidebar implementation with the animation from MinistryDetails component
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Floating header effect */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerOpacity,
            shadowOpacity: headerOpacity,
          }
        ]}
      >
        <BlurView intensity={85} tint="light" style={styles.blurView} />
      </Animated.View>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
          <Ionicons name="arrow-back" size={24} color="#5B6EF5" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {church?.name || "Community"}
          </Text>
          <Text style={styles.headerSubtitle}>Community Chat</Text>
        </View>
        
        <TouchableOpacity
          style={styles.membersButton}
          onPress={toggleSidebar}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={24} color="#5B6EF5" />
          <View style={styles.memberCountBadge}>
            <Text style={styles.memberCountBadgeText}>{members.length || 0}</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Main container */}
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
                  { paddingBottom: 120 },
                ]}
                onScroll={handleScroll}
                scrollEventThrottle={200}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={11}
                removeClippedSubviews={true}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 10,
                }}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (messages.length > 0 && !isLoadingMore && !isUserScrollingUp.current) {
                    messageListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                onLayout={() => {
                  if (messages.length > 0 && !isLoadingMore && !isUserScrollingUp.current) {
                    messageListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                ListHeaderComponent={isLoadingMore ? <LoadingHeader /> : null}
                onScrollBeginDrag={() => {
                  isUserScrollingUp.current = true;
                }}
                onMomentumScrollEnd={() => {
                  setTimeout(() => {
                    isUserScrollingUp.current = false;
                  }, 300);
                }}
              />
            )}
          </Animated.View>
          
          {/* Scroll to bottom button */}
          <ScrollToBottomButton 
            visible={showScrollToBottom}
            showIndicator={showNewMessageIndicator}
            count={newMessageCount}
            onPress={scrollToBottom}
          />
        </View>
      </KeyboardAvoidingView>
      
      {/* Input area for new messages */}
      <View
        style={[
          styles.inputAreaContainer,
          {
            bottom: keyboardHeight > 0 ? keyboardHeight : 0,
            paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 10),
            marginBottom: keyboardHeight > 0 ? 0 : 60,
          },
        ]}
      >
        <InputArea
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
      </View>
      
      {/* Modal-like background overlay when sidebar is open */}
      {isSidebarVisible && (
        <Animated.View 
          style={[
            styles.sidebarOverlay,
            {
              opacity: overlayOpacity
            }
          ]}
          onTouchEnd={toggleSidebar}
        />
      )}
      
      {/* Animated sidebar panel from MinistryDetails */}
      {isSidebarVisible && (
        <Animated.View 
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: sidebarTranslateX }]
            }
          ]}
        >
          <View style={styles.sidebarCloseHeader}>
            <TouchableOpacity 
              style={styles.sidebarCloseButton}
              onPress={toggleSidebar}
            >
              <Ionicons name="close" size={24} color="#4A55A2" />
            </TouchableOpacity>
            <Text style={styles.sidebarHeaderTitle}>Community Members</Text>
          </View>
          
          {renderSidebarContent()}
        </Animated.View>
      )}
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
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  membersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
    position: "relative",
  },
  memberCountBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#5B6EF5",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  memberCountBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  chatContainer: {
    flex: 1,
    position: "relative",
    flexDirection: "column",
  },
  messagesContainer: {
    flex: 1,
    padding: 8,
    paddingBottom: 0,
  },
  messagesContainerWithKeyboard: {
    paddingBottom: 0,
  },
  messagesList: {
    paddingVertical: 10,
    paddingBottom: 100,
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
    maxWidth: "80%",
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
    flexShrink: 1,
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
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 25,
    zIndex: 1000,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
    marginHorizontal: 8,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#5B6EF5",
    justifyContent: "center",
    alignItems: "center",
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
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5B6EF5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  scrollButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMessageBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  newMessageBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Enhanced sidebar styles using MinistryDetails approach
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 999,
  },
  sidebar: {
    position: 'absolute',
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
  sidebarCloseHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEEF7",
  },
  sidebarCloseButton: {
    padding: 8,
  },
  sidebarHeaderTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  sidebarContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  sidebarHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FD",
  },
  sidebarHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  membersList: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  // Enhanced member item with admin controls
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarInitials: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  memberInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 16,
    color: "#1F2937",
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  adminBadge: {
    backgroundColor: "#9061F9",
  },
  ownerBadge: {
    backgroundColor: "#F59E0B",
  },
  memberBadge: {
    backgroundColor: "#6B7280",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  memberOptionsButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  memberOptionsContainer: {
    marginLeft: 68,
    marginTop: -8,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    padding: 4,
  },
  memberOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  memberOptionText: {
    fontSize: 14,
    color: "#EF4444",
    marginLeft: 8,
  },
});