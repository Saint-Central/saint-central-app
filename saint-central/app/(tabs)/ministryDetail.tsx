// MinistryDetails.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
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
  Keyboard,
  Vibration,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

// Interface definitions based on Supabase schema
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
  id: number;
  ministry_id: number;
  user_id: string;
  sent_at: string;
  message_text: string;
  attachment_url?: string;
  user?: User;
  _status?: 'sending' | 'sent' | 'error';
}

// Type definition for navigation
type RootStackParamList = {
  home: { refresh?: boolean };
  ministriesScreen: undefined;
  ministryDetail: { ministryId: number };
  createMinistry: { selectedPresetId?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;
type MinistryDetailRouteProp = RouteProp<RootStackParamList, 'ministryDetail'>;

// Time formatting functions
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  // Otherwise return date
  return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
};

const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
};

// Get avatar color based on name
const getAvatarColor = (name: string): string => {
  const colors = [
    '#25D366', // WhatsApp Green
    '#34B7F1', // WhatsApp Blue
    '#075E54', // WhatsApp Dark Green
    '#128C7E', // WhatsApp Teal
    '#4CAF50', // Material Green
    '#2196F3', // Material Blue
    '#673AB7', // Material Deep Purple
    '#FF9800', // Material Orange
  ];
  
  // Simple hash function to pick a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate initials from name
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// AsyncStorage keys for caching
const MEMBERSHIP_CACHE_KEY = (ministryId: number, userId: string) => 
  `ministry_membership_${ministryId}_${userId}`;
const MINISTRY_CACHE_KEY = (ministryId: number) => 
  `ministry_details_${ministryId}`;
const MESSAGES_CACHE_KEY = (ministryId: number) => 
  `ministry_messages_${ministryId}`;

export default function MinistryDetails(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MinistryDetailRouteProp>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const ministryId = typeof params.id === 'string' ? parseInt(params.id) : 0;
  
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<MinistryMember[]>([]);
  const [users, setUsers] = useState<{[key: string]: User}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isMember, setIsMember] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cachedMembershipChecked, setCachedMembershipChecked] = useState<boolean>(false);
  
  // Ref for FlatList to scroll to bottom
  const messageListRef = useRef<FlatList>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(userData);
      }
    };
    getCurrentUser();
  }, []);
  
  // Check cached membership status on initial load
  useEffect(() => {
    const checkCachedMembership = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error("No user logged in");
          return;
        }
        
        // Check cached membership status first
        const cachedMembership = await AsyncStorage.getItem(
          MEMBERSHIP_CACHE_KEY(ministryId, user.id)
        );
        
        if (cachedMembership) {
          const membershipData = JSON.parse(cachedMembership);
          const isUserMember = membershipData.isMember === true;
          
          // Set the membership status from cache
          setIsMember(isUserMember);
          console.log("Using cached membership status:", isUserMember);
          
          // If we have cached ministry data, use that too
          const cachedMinistry = await AsyncStorage.getItem(
            MINISTRY_CACHE_KEY(ministryId)
          );
          
          if (cachedMinistry) {
            const ministryData = JSON.parse(cachedMinistry);
            setMinistry({
              ...ministryData,
              is_member: isUserMember
            });
          }
          
          // If we have cached messages, use those too
          const cachedMessages = await AsyncStorage.getItem(
            MESSAGES_CACHE_KEY(ministryId)
          );
          
          if (cachedMessages) {
            const messagesData = JSON.parse(cachedMessages);
            setMessages(messagesData);
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
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Set up real-time subscription to messages
    const messageSubscription = supabase
      .channel('ministry_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ministry_messages',
        filter: `ministry_id=eq.${ministryId}`
      }, (payload) => {
        // Fetch the user info for the new message
        fetchUserForMessage(payload.new as Message);
      })
      .subscribe();
      
    // Handle app going to background/foreground
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App came to foreground, refresh messages and membership
        fetchMessages();
        refreshMembershipStatus();
      }
    };
    
    // Set up app state listener (if on React Native)
    let appStateSubscription: any = null;
    if (Platform.OS !== 'web' && AppState) {
      try {
        appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
      } catch (error) {
        console.log('AppState not available', error);
      }
    }
      
    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(messageSubscription);
      if (appStateSubscription && appStateSubscription.remove) {
        appStateSubscription.remove();
      }
    };
  }, [ministryId]);
  
  // Use useFocusEffect for membership status refresh
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, refreshing all data');
      // Reset states when screen comes into focus
      setMessages([]);
      setMembers([]);
      setUsers({});
      // Fetch fresh data
      fetchData();
      return () => {
        // Cleanup when screen is unfocused
        console.log('Screen unfocused');
      };
    }, [ministryId])
  );
  
  // Header animations based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 15],
    extrapolate: "clamp",
  });
  
  // Function to refresh membership status - both from server and update cache
  async function refreshMembershipStatus(): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
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
          role: membershipData?.role || null
        })
      );
      
      // Only update if there's a change to avoid unnecessary re-renders
      if (isUserMember !== isMember) {
        console.log("Membership status changed, updating UI...");
        setIsMember(isUserMember);
        
        // Update ministry state if available
        if (ministry) {
          const updatedMinistry = {
            ...ministry,
            is_member: isUserMember
          };
          setMinistry(updatedMinistry);
          
          // Update ministry cache
          await AsyncStorage.setItem(
            MINISTRY_CACHE_KEY(ministryId),
            JSON.stringify(updatedMinistry)
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
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
          role: membershipData?.role || null
        })
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
        is_member: isUserMember
      };
      
      setMinistry(updatedMinistry);
      
      // Update ministry cache
      await AsyncStorage.setItem(
        MINISTRY_CACHE_KEY(ministryId),
        JSON.stringify(updatedMinistry)
      );
      
      // Fetch messages
      await fetchMessages();
      
    } catch (error) {
      console.error("Error in data fetch:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  
  // Fetch messages with pagination and cache
  async function fetchMessages(limit: number = 50, offset: number = 0): Promise<void> {
    try {
      setMessageLoading(true);
      
      // Fetch messages for this ministry with pagination
      const { data: messagesData, error: messagesError } = await supabase
        .from("ministry_messages")
        .select("*")
        .eq("ministry_id", ministryId)
        .order("sent_at", { ascending: true })
        .range(offset, offset + limit - 1);
        
      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        throw messagesError;
      }
      
      // Get unique user IDs from messages
      const userIds = [...new Set(messagesData?.map(msg => msg.user_id) || [])];
      
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
          const userMap = usersData?.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {} as {[key: string]: User}) || {};
          
          // Update the users state with new users
          setUsers(prevUsers => ({
            ...prevUsers,
            ...userMap
          }));
          
          // Attach user data to messages
          const messagesWithUsers = messagesData?.map(message => ({
            ...message,
            user: userMap[message.user_id] || users[message.user_id]
          })) || [];
          
          // If this is the first load or a refresh, replace messages
          // Otherwise append the new messages to the existing ones
          let updatedMessages: Message[];
          if (offset === 0) {
            updatedMessages = messagesWithUsers;
            setMessages(messagesWithUsers);
          } else {
            updatedMessages = [...messagesWithUsers, ...messages];
            setMessages(prevMessages => [...messagesWithUsers, ...prevMessages]);
          }
          
          // Cache the messages
          await AsyncStorage.setItem(
            MESSAGES_CACHE_KEY(ministryId),
            JSON.stringify(updatedMessages)
          );
        }
      } else {
        let updatedMessages: Message[];
        if (offset === 0) {
          updatedMessages = messagesData || [];
          setMessages(messagesData || []);
        } else {
          updatedMessages = [...(messagesData || []), ...messages];
          setMessages(prevMessages => [...(messagesData || []), ...prevMessages]);
        }
        
        // Cache the messages
        await AsyncStorage.setItem(
          MESSAGES_CACHE_KEY(ministryId),
          JSON.stringify(updatedMessages)
        );
      }
      
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessageLoading(false);
    }
  }
  
  // Fetch user for a new message
  async function fetchUserForMessage(message: Message): Promise<void> {
    try {
      // Check if we already have this user's data
      if (users[message.user_id]) {
        const newMessage = {
          ...message,
          user: users[message.user_id]
        };
        
        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        
        // Update message cache
        await AsyncStorage.setItem(
          MESSAGES_CACHE_KEY(ministryId),
          JSON.stringify(updatedMessages)
        );
        
        // Scroll to bottom after message is added
        setTimeout(() => {
          messageListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        return;
      }
      
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", message.user_id)
        .single();
        
      if (userError) {
        console.error("Error fetching user:", userError);
        // Add message without user data
        const updatedMessages = [...messages, message];
        setMessages(updatedMessages);
        
        // Update message cache
        await AsyncStorage.setItem(
          MESSAGES_CACHE_KEY(ministryId),
          JSON.stringify(updatedMessages)
        );
      } else {
        // Add user to users map
        const updatedUsers = {
          ...users,
          [userData.id]: userData
        };
        
        setUsers(updatedUsers);
        
        // Add message with user data
        const newMessage = {
          ...message,
          user: userData
        };
        
        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        
        // Update message cache
        await AsyncStorage.setItem(
          MESSAGES_CACHE_KEY(ministryId),
          JSON.stringify(updatedMessages)
        );
      }
      
      // Scroll to bottom after message is added
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error("Error fetching user for message:", error);
    }
  }
  
  // Send a new message
  async function sendMessage(): Promise<void> {
    if (!newMessage.trim() || !isMember) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear input immediately
      const messageText = newMessage.trim();
      setNewMessage("");

      // Create temporary message
      const tempMessage: Message = {
        id: Date.now(),
        ministry_id: ministryId,
        user_id: user.id,
        sent_at: new Date().toISOString(),
        message_text: messageText,
        user: currentUser || undefined,
        _status: 'sending'
      };

      setMessages(prev => [...prev, tempMessage]);
      messageListRef.current?.scrollToEnd({ animated: true });

      const { error } = await supabase
        .from("ministry_messages")
        .insert({
          ministry_id: ministryId,
          user_id: user.id,
          message_text: messageText
        });

      if (error) {
        console.error("Error sending message:", error);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...msg, _status: 'error' } 
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  }
  
  // Leave a ministry
  async function handleLeaveMinistry(): Promise<void> {
    Alert.alert(
      "Leave Ministry",
      "Are you sure you want to leave this ministry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { error } = await supabase
                .from("ministry_members")
                .delete()
                .eq("ministry_id", ministryId)
                .eq("user_id", user.id);

              if (error) throw error;

              Alert.alert("Success", "You have left the ministry");
              router.push("/(tabs)/MinistriesScreen");
            } catch (error) {
              console.error("Error leaving ministry:", error);
              Alert.alert("Error", "Could not leave the ministry");
            }
          }
        }
      ]
    );
  }
  
  // Navigate back
  const navigateBack = () => {
    router.push("/(tabs)/MinistriesScreen");
  };
  
  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  
  // Render ministry avatar
  const renderMinistryAvatar = () => {
    if (ministry?.image_url) {
      return (
        <Image 
          source={{ uri: ministry.image_url }} 
          style={styles.ministryAvatarImage} 
        />
      );
    }
    
    // Placeholder with initials
    const avatarColor = getAvatarColor(ministry?.name || "");
    const initials = getInitials(ministry?.name || "");
    
    return (
      <View 
        style={[
          styles.ministryAvatarPlaceholder, 
          { backgroundColor: avatarColor }
        ]}
      >
        <Text style={styles.ministryAvatarInitials}>{initials}</Text>
      </View>
    );
  };
  
  // Render user avatar for messages
  const renderUserAvatar = (user?: User) => {
    if (user?.profile_image) {
      return (
        <Image 
          source={{ uri: user.profile_image }} 
          style={styles.userAvatarImage} 
        />
      );
    }
    
    // Placeholder with initials
    const name = user ? `${user.first_name} ${user.last_name}` : "";
    const avatarColor = getAvatarColor(name);
    const initials = getInitials(name);
    
    return (
      <View 
        style={[
          styles.userAvatarPlaceholder, 
          { backgroundColor: avatarColor }
        ]}
      >
        <Text style={styles.userAvatarInitials}>{initials}</Text>
      </View>
    );
  };
  
  // Group messages by date
  const groupedMessages = () => {
    const groups: {date: string, messages: Message[]}[] = [];
    
    messages.forEach(message => {
      const messageDate = new Date(message.sent_at).toDateString();
      
      // Find existing group or create new one
      const existingGroup = groups.find(group => 
        new Date(group.date).toDateString() === messageDate
      );
      
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({
          date: message.sent_at,
          messages: [message]
        });
      }
    });
    
    return groups;
  };
  
  // Render message item
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.user_id === currentUser?.id;
    const isSending = item._status === 'sending';
    const isError = item._status === 'error';
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && (
          <View style={styles.messageAvatar}>
            {renderUserAvatar(item.user)}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isSending && styles.sendingMessage,
          isError && styles.errorMessage
        ]}>
          {!isCurrentUser && (
            <Text style={styles.messageUsername}>
              {item.user ? `${item.user.first_name} ${item.user.last_name}` : "Unknown User"}
            </Text>
          )}
          
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText
          ]}>
            {item.message_text}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {formatMessageTime(item.sent_at)}
            </Text>
            
            {isCurrentUser && (
              <View style={styles.messageStatus}>
                {isSending ? (
                  <ActivityIndicator size="small" color="#64748B" style={styles.statusIcon} />
                ) : isError ? (
                  <TouchableOpacity onPress={() => Alert.alert("Message failed to send")}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" style={styles.statusIcon} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="checkmark-done" size={14} color="#64748B" style={styles.statusIcon} />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };
  
  // Render date divider
  const renderDateDivider = (date: string) => (
    <View style={styles.dateDividerContainer}>
      <View style={styles.dateDividerLine} />
      <Text style={styles.dateDividerText}>{formatMessageDate(date)}</Text>
      <View style={styles.dateDividerLine} />
    </View>
  );
  
  // Render message group
  const renderMessageGroup = ({ item }: { item: {date: string, messages: Message[]} }) => (
    <View key={item.date}>
      {renderDateDivider(item.date)}
      {item.messages.map(message => (
        <View key={message.id}>
          {renderMessageItem({ item: message })}
        </View>
      ))}
    </View>
  );
  
  // Input Area Component props type
  interface MessageInputAreaProps {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
  }

  // Input Area Component
  const MessageInputArea = ({ value, onChangeText, onSend }: MessageInputAreaProps) => {
    const [isComposing, setIsComposing] = useState(false);
    const [inputHeight, setInputHeight] = useState(40);
    
    // Handle content size change for auto-expanding input
    const handleContentSizeChange = (event: any) => {
      const { height } = event.nativeEvent.contentSize;
      const newHeight = Math.min(Math.max(40, height), 120); // min 40, max 120
      setInputHeight(newHeight);
    };
    
    return (
      <View style={styles.inputContainer}>
        {/* Attachment button */}
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="add-circle-outline" size={24} color="#64748B" />
        </TouchableOpacity>
        
        {/* Message input */}
        <TextInput
          style={[styles.messageInput, { height: inputHeight }]}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={1000}
          onFocus={() => setIsComposing(true)}
          onBlur={() => setIsComposing(false)}
          onContentSizeChange={handleContentSizeChange}
        />
        
        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            !value.trim() && styles.sendButtonDisabled
          ]}
          onPress={() => {
            Keyboard.dismiss();
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
              Vibration.vibrate(10); // Light haptic feedback
            }
            onSend();
          }}
          disabled={!value.trim()}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={value.trim() ? "#FFFFFF" : "#94A3B8"} 
          />
        </TouchableOpacity>
      </View>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading ministry details...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF006E" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load ministry information"}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={navigateBack}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      
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
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        
        <View style={styles.ministryTitleContainer}>
          <View style={styles.headerAvatar}>
            {renderMinistryAvatar()}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {ministry?.name || "Ministry"}
            </Text>
            <Text style={styles.memberCount}>
              {ministry?.member_count || 0} {ministry?.member_count === 1 ? "member" : "members"}
            </Text>
          </View>
        </View>
        
        {isMember && (
          <TouchableOpacity 
            style={styles.leaveButton}
            onPress={handleLeaveMinistry}
          >
            <Text style={styles.joinButtonText}>Leave</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Ministry Info */}
      <View style={styles.ministryInfoContainer}>
        <Text style={styles.ministryDescription}>
          {ministry?.description || "No description available."}
        </Text>
      </View>
      
      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
      >
        <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
          {messageLoading && messages.length === 0 ? (
            <View style={styles.messageLoadingContainer}>
              <ActivityIndicator size="small" color="#2196F3" />
              <Text style={styles.messageLoadingText}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyMessagesContainer}>
              <FontAwesome5 name="comment-dots" size={48} color="#C0C0C0" />
              <Text style={styles.emptyMessagesTitle}>No Messages Yet</Text>
              <Text style={styles.emptyMessagesSubtitle}>
                Be the first to start a conversation!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={messageListRef}
              data={groupedMessages()}
              renderItem={renderMessageGroup}
              keyExtractor={(item) => item.date}
              contentContainerStyle={[
                styles.messagesList,
                { paddingBottom: Math.max(insets.bottom, 20) }  // Add padding based on safe area
              ]}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              initialNumToRender={20}
              onContentSizeChange={() => {
                messageListRef.current?.scrollToEnd({ animated: false });
              }}
              onLayout={() => {
                messageListRef.current?.scrollToEnd({ animated: false });
              }}
              // Add pull up to load more
              onEndReached={() => {
                if (messages.length >= 50 && !messageLoading) {
                  fetchMessages(50, messages.length);
                }
              }}
              onEndReachedThreshold={0.2}
              ListFooterComponent={messages.length >= 50 && messageLoading ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color="#2196F3" />
                  <Text style={styles.loadMoreText}>Loading more messages...</Text>
                </View>
              ) : null}
            />
          )}
        </Animated.View>
        
        {/* Message Input Area with bottom insets padding */}
        <View style={{ paddingBottom: insets.bottom }}>
          <MessageInputArea 
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  },
  backButton: {
    padding: 8,
  },
  ministryTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: "hidden",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  memberCount: {
    fontSize: 12,
    color: "#64748B",
  },
  joinButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  leaveButton: {
    backgroundColor: "#EF4444", // Red color for leave button
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  ministryInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  ministryDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  chatContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  messagesContainer: {
    flex: 1,
    padding: 8,
  },
  messagesList: {
    paddingBottom: 8,
  },
  messageLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyMessagesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
  },
  emptyMessagesSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },
  dateDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dateDividerText: {
    fontSize: 12,
    color: "#64748B",
    marginHorizontal: 8,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: "flex-end",
    marginBottom: 6,
  },
  userAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#075E54",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  currentUserBubble: {
    backgroundColor: "#DCF8C6", // WhatsApp light green for sent messages
    borderTopRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: "#FFFFFF", // White for received messages
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sendingMessage: {
    opacity: 0.7,
  },
  errorMessage: {
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  messageUsername: {
    fontSize: 13,
    fontWeight: "700",
    color: "#075E54", // WhatsApp dark green
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  currentUserMessageText: {
    color: "#1E293B",
  },
  otherUserMessageText: {
    color: "#1E293B",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 2,
  },
  messageTime: {
    fontSize: 11,
    color: "#64748B",
  },
  messageStatus: {
    marginLeft: 4,
  },
  statusIcon: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12, // Slightly more padding on Android
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    elevation: 5, // Add elevation on Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#25D366", // WhatsApp green
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#E2E8F0",
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
    backgroundColor: "#075E54",
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
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#64748B",
  },
});