import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Animated,
  ImageBackground,
  StatusBar,
  RefreshControl,
  ScrollView,
  LayoutAnimation,
  UIManager,
  useColorScheme,
} from "react-native";
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import { router } from "expo-router";

// Enable LayoutAnimation for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Interface definitions
interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  group: Group;
}

interface Intention {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: IntentionType;
  created_at: string;
  user: UserData;
  likes_count?: number | null;
  comments_count?: number | null;
  is_liked?: boolean;
  group_info?: Group | null;
  visibility?: "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups" | "Certain Friends";
  selectedGroups?: (number | string)[];
  selectedFriends?: (number | string)[];
}

type IntentionType =
  | "resolution"
  | "prayer"
  | "goal"
  | "spiritual"
  | "family"
  | "health"
  | "work"
  | "friends"
  | "world"
  | "personal"
  | "other";

interface Notification {
  message: string;
  type: "error" | "success";
}

interface Comment {
  id: string;
  user_id: string;
  commentable_id: string;
  commentable_type: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: UserData;
}

const INTENTION_TYPES = [
  { 
    key: "resolution",
    icon: "flag" as const,
    iconProvider: "FontAwesome" as const,
    gradient: ["#FF6B6B", "#FF8E8E"],
    description: "A commitment or promise to change or improve"
  },
  { 
    key: "prayer",
    icon: "star" as const,
    iconProvider: "FontAwesome" as const,
    gradient: ["#4ECDC4", "#45B7AF"],
    description: "A request for divine intervention or guidance"
  },
  { 
    key: "goal",
    icon: "target" as const,
    iconProvider: "Feather" as const,
    gradient: ["#FFD166", "#FFB700"],
    description: "An objective to achieve in your spiritual journey"
  },
  { 
    key: "spiritual",
    icon: "book-open" as const,
    iconProvider: "Feather" as const,
    gradient: ["#06D6A0", "#05C191"],
    description: "Related to faith, worship, or spiritual growth"
  },
  { 
    key: "family",
    icon: "users" as const,
    iconProvider: "Feather" as const,
    gradient: ["#118AB2", "#0F7A9D"],
    description: "Prayers or concerns for family members"
  },
  { 
    key: "health",
    icon: "heart" as const,
    iconProvider: "Feather" as const,
    gradient: ["#EF476F", "#D63E63"],
    description: "Physical or mental well-being concerns"
  },
  { 
    key: "work",
    icon: "briefcase" as const,
    iconProvider: "Feather" as const,
    gradient: ["#073B4C", "#052E3A"],
    description: "Career, job, or professional matters"
  },
  { 
    key: "friends",
    icon: "user-plus" as const,
    iconProvider: "Feather" as const,
    gradient: ["#7209B7", "#5F0A9E"],
    description: "Prayers for friends or social relationships"
  },
  { 
    key: "world",
    icon: "globe" as const,
    iconProvider: "Feather" as const,
    gradient: ["#3A0CA3", "#2F0A82"],
    description: "Global concerns or world events"
  },
  { 
    key: "personal",
    icon: "user" as const,
    iconProvider: "Feather" as const,
    gradient: ["#F72585", "#D61F73"],
    description: "Personal growth or individual matters"
  },
  { 
    key: "other",
    icon: "more-horizontal" as const,
    iconProvider: "Feather" as const,
    gradient: ["#6C757D", "#5A6268"],
    description: "Other types of intentions"
  }
];

const VISIBILITY_OPTIONS = [
  {
    key: "Friends",
    icon: "users",
    iconProvider: "Feather",
    description: "Visible to all your friends"
  },
  {
    key: "Certain Friends",
    icon: "user-check",
    iconProvider: "Feather",
    description: "Only visible to selected friends"
  },
  {
    key: "Certain Groups",
    icon: "grid",
    iconProvider: "Feather",
    description: "Only visible to selected groups"
  },
  {
    key: "Friends & Groups",
    icon: "globe",
    iconProvider: "FontAwesome",
    description: "Visible to all friends and groups"
  },
  { 
    key: "Just Me", 
    icon: "user",
    iconProvider: "Feather",
    description: "Only visible to you" 
  },
];

// Flag to use sample data or real data
const USE_SAMPLE_DATA = false;

// Parse selected groups helper function
const parseSelectedGroups = (selected_groups: any): (number | string)[] => {
  if (Array.isArray(selected_groups)) {
    return selected_groups;
  } else if (typeof selected_groups === "string") {
    try {
      // Try JSON parsing first
      return JSON.parse(selected_groups);
    } catch (e) {
      // Fallback: remove any brackets and split by comma
      return selected_groups
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

// Parse selected friends helper function
const parseSelectedFriends = (selected_friends: any): (number | string)[] => {
  if (Array.isArray(selected_friends)) {
    return selected_friends;
  } else if (typeof selected_friends === "string") {
    try {
      // Try JSON parsing first
      return JSON.parse(selected_friends);
    } catch (e) {
      // Fallback: remove any brackets and split by comma
      return selected_friends
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

// Main Component
const FaithCommunityApp = () => {
  // State
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("all");
  const [showIntentionModal, setShowIntentionModal] = useState<boolean>(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [newComment, setNewComment] = useState<string>("");
  const [newIntention, setNewIntention] = useState<{
    title: string;
    description: string;
    type: IntentionType;
    visibility: "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups" | "Certain Friends";
    selectedGroups: (number | string)[];
    selectedFriends: (number | string)[];
  }>({
    title: "",
    description: "",
    type: "prayer",
    visibility: "Friends",
    selectedGroups: [],
    selectedFriends: []
  });
  const [showTypeSelector, setShowTypeSelector] = useState<boolean>(false);
  const [showVisibilitySelector, setShowVisibilitySelector] = useState<boolean>(false);
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showFilterOptions, setShowFilterOptions] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<UserData[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<(number | string)[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<(number | string)[]>([]);
  const [editingIntention, setEditingIntention] = useState<Intention | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [intentionToDelete, setIntentionToDelete] = useState<string | null>(null);
  const [showGroupSelector, setShowGroupSelector] = useState<boolean>(false);
  const [showFriendSelector, setShowFriendSelector] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Theme and appearance
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const tabBarHeight = 80; // Estimated height
  
  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const filterOptionsAnim = useRef(new Animated.Value(0)).current;
  const likeAnimations = useRef(new Map()).current;
  
  // Header animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 60],
    extrapolate: 'clamp'
  });

  // Initialize - Fetch current user and data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setCurrentUserId(data.user.id);
        }

        await Promise.all([
          fetchIntentions(),
          fetchUserGroups(),
          fetchFriends(),
          fetchFriendRequestsCount(),
        ]);
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Effect to handle notification auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Effect to fetch user groups when currentUserId changes
  useEffect(() => {
    if (currentUserId) {
      fetchUserGroups();
    }
  }, [currentUserId]);

  // Effect to fetch intentions when filter changes
  useEffect(() => {
    fetchIntentions();
  }, [filter]);

  // Effect to fetch comments when expandedCommentId changes
  useEffect(() => {
    if (expandedCommentId) {
      fetchComments(expandedCommentId);
    }
  }, [expandedCommentId]);

  // Get animation reference for like button
  const getLikeAnimation = (intentionId: string): Animated.Value => {
    try {
      // Validate the intentionId
      if (!intentionId || typeof intentionId !== 'string') {
        console.error('Invalid intentionId provided to getLikeAnimation:', intentionId);
        // Return a default animation value as fallback
        return new Animated.Value(1);
      }

      // Check if animation exists for this ID, create if not
      if (!likeAnimations.has(intentionId)) {
        likeAnimations.set(intentionId, new Animated.Value(1));
      }

      // Return the animation
      return likeAnimations.get(intentionId);
    } catch (error) {
      console.error('Error in getLikeAnimation:', error);
      // Return a default animation value as fallback
      return new Animated.Value(1);
    }
  };

  // Fetch friend requests count
  const fetchFriendRequestsCount = async (): Promise<void> => {
    try {
      if (!currentUserId) return;
      
      const { data, error } = await supabase
        .from("friends")
        .select("id")
        .eq("user_id_2", currentUserId)
        .eq("status", "pending");
      
      if (error) throw error;
      setNotificationCount(data ? data.length : 0);
    } catch (error) {
      console.error("Error fetching friend requests count:", error);
    }
  };

  // Fetch user groups
  const fetchUserGroups = async (): Promise<void> => {
    try {
      if (!currentUserId) return;
      
      const { data, error } = await supabase
        .from("group_members")
        .select("group:groups(*)")
        .eq("user_id", currentUserId);
      
      if (error) throw error;
      
      const groups = data.map((item: any) => item.group);
      setUserGroups(groups || []);
    } catch (error) {
      console.error("Error fetching user groups:", error);
    }
  };

  // Fetch friends
  const fetchFriends = async (): Promise<void> => {
    try {
      if (!currentUserId) return;
      
      // Fetch friends where current user is user_id_1
      const { data: sentData, error: sentError } = await supabase
        .from("friends")
        .select(`
          user_id_2,
          user:users!friends_user_id_2_fkey(id, first_name, last_name, created_at)
        `)
        .eq("user_id_1", currentUserId)
        .eq("status", "accepted");
      
      if (sentError) throw sentError;
      
      // Fetch friends where current user is user_id_2
      const { data: receivedData, error: receivedError } = await supabase
        .from("friends")
        .select(`
          user_id_1,
          user:users!friends_user_id_1_fkey(id, first_name, last_name, created_at)
        `)
        .eq("user_id_2", currentUserId)
        .eq("status", "accepted");
      
      if (receivedError) throw receivedError;
      
      // Combine the lists
      const friendsList: UserData[] = [];
      
      sentData?.forEach((item: any) => {
        if (item.user) {
          friendsList.push(item.user);
        }
      });
      
      receivedData?.forEach((item: any) => {
        if (item.user) {
          friendsList.push(item.user);
        }
      });
      
      setFriends(friendsList);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  // Fetch intentions with proper filtering
  const fetchIntentions = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      if (!currentUserId) {
        setTimeout(() => {
          setIsLoading(false);
          setRefreshing(false);
        }, 500);
        return;
      }

      // Start building the query
      let query = supabase
        .from("intentions")
        .select(`*, user:users (*), visibility, selected_groups, selected_friends`)
        .order("created_at", { ascending: false });

      // Apply filter
      if (filter === "mine") {
        query = query.eq("user_id", currentUserId);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        setIntentions([]);
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      // Get user's friends IDs
      const { data: sentFriends, error: sentError } = await supabase
        .from("friends")
        .select("user_id_2")
        .eq("user_id_1", currentUserId)
        .eq("status", "accepted");
      
      if (sentError) throw sentError;

      const { data: receivedFriends, error: receivedError } = await supabase
        .from("friends")
        .select("user_id_1")
        .eq("user_id_2", currentUserId)
        .eq("status", "accepted");
      
      if (receivedError) throw receivedError;

      // Create a set of friend IDs
      const friendIds = new Set<string>();
      
      if (sentFriends) {
        sentFriends.forEach((row: { user_id_2: string }) => {
          friendIds.add(row.user_id_2);
        });
      }
      
      if (receivedFriends) {
        receivedFriends.forEach((row: { user_id_1: string }) => {
          friendIds.add(row.user_id_1);
        });
      }

      // Get user's group IDs
      const userGroupIds = userGroups.map(group => group.id);

      // Process and filter intentions
      const processedIntentions = await Promise.all(
        data.map(async (intention: any) => {
          // Parse selected groups and friends
          const selectedGroups = parseSelectedGroups(intention.selected_groups);
          const selectedFriends = parseSelectedFriends(intention.selected_friends);

          // Get like count
          const { count: likesCount, error: likesError } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: false })
            .eq("likeable_id", intention.id)
            .eq("likeable_type", "intentions");
          
          if (likesError) throw likesError;

          // Get comment count
          const { count: commentsCount, error: commentsError } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: false })
            .eq("commentable_id", intention.id)
            .eq("commentable_type", "intentions");
          
          if (commentsError) throw commentsError;

          // Check if user has liked this intention
          const { data: userLike, error: userLikeError } = await supabase
            .from("likes")
            .select("id")
            .eq("likeable_id", intention.id)
            .eq("likeable_type", "intentions")
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (userLikeError) throw userLikeError;

          // Check if intention should be visible based on filter
          let isVisible = true;
          
          if (filter === "friends") {
            isVisible = friendIds.has(intention.user_id);
          } else if (filter === "groups") {
            isVisible = intention.visibility === "Certain Groups" || 
              intention.visibility === "Friends & Groups";
            
            if (isVisible && intention.visibility === "Certain Groups") {
              isVisible = selectedGroups.some(groupId => 
                userGroupIds.includes(String(groupId))
              );
            }
          } else if (filter === "all") {
            // Check visibility permissions
            if (intention.user_id !== currentUserId) {
              switch(intention.visibility) {
                case "Just Me":
                  isVisible = false;
                  break;
                case "Friends":
                  isVisible = friendIds.has(intention.user_id);
                  break;
                case "Certain Friends":
                  isVisible = selectedFriends.includes(currentUserId);
                  break;
                case "Certain Groups":
                  isVisible = selectedGroups.some(groupId => 
                    userGroupIds.includes(String(groupId))
                  );
                  break;
                case "Friends & Groups":
                  isVisible = friendIds.has(intention.user_id) || 
                    userGroupIds.some(groupId => 
                      selectedGroups.includes(groupId)
                    );
                  break;
              }
            }
          }

          // Find shared group info if needed
          let groupInfo = null;
          
          if (isVisible && intention.user_id !== currentUserId && intention.visibility === "Certain Groups") {
            const sharedGroups = selectedGroups.filter(groupId => 
              userGroupIds.includes(String(groupId))
            );
            
            if (sharedGroups.length > 0) {
              const sharedGroupId = sharedGroups[0];
              const matchingGroup = userGroups.find(g => g.id === sharedGroupId);
              
              if (matchingGroup) {
                groupInfo = {
                  id: matchingGroup.id,
                  name: matchingGroup.name
                };
              }
            }
          }

          return {
            ...intention,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            is_liked: !!userLike,
            selectedGroups,
            selectedFriends,
            group_info: groupInfo,
            _isVisible: isVisible // Used for filtering
          };
        })
      );

      // Filter out invisible intentions
      const filteredIntentions = processedIntentions.filter(
        intention => intention._isVisible
      );

      setIntentions(filteredIntentions);
    } catch (error) {
      console.error("Error fetching intentions:", error);
      setNotification({
        message: "Error loading intentions. Please try again.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch comments for an intention
  const fetchComments = async (intentionId: string): Promise<void> => {
    try {
      if (!intentionId) {
        throw new Error("Invalid intention ID");
      }
      
      setCommentsLoading(true);
      
      const { data, error } = await supabase
        .from("comments")
        .select(`*, user:users(*)`)
        .eq("commentable_id", intentionId)
        .eq("commentable_type", "intentions")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
      setNotification({
        message: "Error loading comments. Please try again.",
        type: "error"
      });
    } finally {
      setCommentsLoading(false);
    }
  };

  // Toggle comment section
  const toggleComments = (intentionId: string): void => {
    try {
      // Validate intentionId
      if (!intentionId || typeof intentionId !== 'string') {
        console.error('Invalid intentionId:', intentionId);
        return;
      }

      // Configure animation for smooth transition
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      // Toggle comment section
      if (expandedCommentId === intentionId) {
        setExpandedCommentId(null);
      } else {
        setExpandedCommentId(intentionId);
        fetchComments(intentionId);
      }
    } catch (error) {
      console.error('Error toggling comments:', error);
    }
  };

  // Handle like intention
  const handleLikeIntention = async (intentionId: string): Promise<void> => {
    try {
      if (!currentUserId || !intentionId) return;
      
      Vibration.vibrate(50);
      
      // Find the intention
      const intention = intentions.find(i => i.id === intentionId);
      if (!intention) return;
      
      // Animate the like button
      const likeAnim = getLikeAnimation(intentionId);
      Animated.sequence([
        Animated.timing(likeAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(likeAnim, {
          toValue: 1.2,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(likeAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Update UI immediately for responsiveness
      setIntentions(intentions.map(item => {
        if (item.id === intentionId) {
          const newIsLiked = !item.is_liked;
          return {
            ...item,
            is_liked: newIsLiked,
            likes_count: newIsLiked 
              ? (item.likes_count || 0) + 1 
              : Math.max(0, (item.likes_count || 1) - 1)
          };
        }
        return item;
      }));
      
      // Update the database
      if (intention.is_liked) {
        // Unlike
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("likeable_id", intentionId)
          .eq("likeable_type", "intentions")
          .eq("user_id", currentUserId);
          
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("likes")
          .insert({
            user_id: currentUserId,
            likeable_id: intentionId,
            likeable_type: "intentions",
          });
          
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error liking intention:", error);
      setNotification({
        message: "Error updating like. Please try again.",
        type: "error"
      });
      
      // Revert UI change on error
      fetchIntentions();
    }
  };

  // Handle add comment
  const handleAddComment = async (intentionId: string): Promise<void> => {
    if (!newComment.trim()) {
      setNotification({ 
        message: "Please enter a comment", 
        type: "error" 
      });
      return;
    }
    
    try {
      if (!currentUserId) return;
      
      // Create a new comment
      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: currentUserId,
          commentable_id: intentionId,
          commentable_type: "intentions",
          content: newComment,
        })
        .select(`*, user:users(*)`);
      
      if (error) throw error;
      
      // Update UI with new comment
      if (data && data.length > 0) {
        setComments([data[0], ...comments]);
      }
      
      // Update comment count in intentions list
      setIntentions(intentions.map(intention => {
        if (intention.id === intentionId) {
          return {
            ...intention,
            comments_count: (intention.comments_count || 0) + 1
          };
        }
        return intention;
      }));
      
      // Clear input
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      setNotification({
        message: "Error posting comment. Please try again.",
        type: "error"
      });
    }
  };

  // Handle create intention
  const handleCreateIntention = async (): Promise<void> => {
    if (!newIntention.title.trim() || !newIntention.description.trim()) {
      setNotification({
        message: "Please fill in both title and description",
        type: "error"
      });
      return;
    }
    
    try {
      if (!currentUserId) return;
      
      // Prepare groups and friends based on visibility
      const finalSelectedGroups = 
        newIntention.visibility === "Certain Groups" ? selectedGroups : [];
      const finalSelectedFriends = 
        newIntention.visibility === "Certain Friends" ? selectedFriends : [];
      
      // Create new intention
      const { data, error } = await supabase
        .from("intentions")
        .insert({
          user_id: currentUserId,
          title: newIntention.title,
          description: newIntention.description,
          type: newIntention.type,
          visibility: newIntention.visibility,
          selected_groups: finalSelectedGroups.length > 0 ? JSON.stringify(finalSelectedGroups) : null,
          selected_friends: finalSelectedFriends.length > 0 ? JSON.stringify(finalSelectedFriends) : null,
        })
        .select();
      
      if (error) throw error;
      
      // Reset form and close modal
      setShowIntentionModal(false);
      setNewIntention({
        title: "",
        description: "",
        type: "prayer",
        visibility: "Friends",
        selectedGroups: [],
        selectedFriends: []
      });
      setSelectedGroups([]);
      setSelectedFriends([]);
      
      // Show success notification
      setNotification({
        message: "Intention created successfully!",
        type: "success"
      });
      
      // Refresh intentions list
      fetchIntentions();
    } catch (error) {
      console.error("Error creating intention:", error);
      setNotification({
        message: "Error creating intention. Please try again.",
        type: "error"
      });
    }
  };

  // Handle edit intention
  const handleEditIntention = (intention: Intention): void => {
    setEditingIntention(intention);
    setSelectedGroups(intention.selectedGroups || []);
    setSelectedFriends(intention.selectedFriends || []);
    setShowIntentionModal(true);
  };

  // Handle update intention
  const handleUpdateIntention = async (): Promise<void> => {
    if (!editingIntention) return;
    
    if (!editingIntention.title.trim() || !editingIntention.description.trim()) {
      setNotification({
        message: "Please fill in both title and description",
        type: "error"
      });
      return;
    }
    
    try {
      // Prepare groups and friends based on visibility
      const finalSelectedGroups = 
        editingIntention.visibility === "Certain Groups" ? selectedGroups : [];
      const finalSelectedFriends = 
        editingIntention.visibility === "Certain Friends" ? selectedFriends : [];
      
      // Update intention
      const { error } = await supabase
        .from("intentions")
        .update({
          title: editingIntention.title,
          description: editingIntention.description,
          type: editingIntention.type,
          visibility: editingIntention.visibility,
          selected_groups: finalSelectedGroups.length > 0 ? JSON.stringify(finalSelectedGroups) : null,
          selected_friends: finalSelectedFriends.length > 0 ? JSON.stringify(finalSelectedFriends) : null,
        })
        .eq("id", editingIntention.id);
      
      if (error) throw error;
      
      // Reset form and close modal
      setShowIntentionModal(false);
      setEditingIntention(null);
      setSelectedGroups([]);
      setSelectedFriends([]);
      
      // Show success notification
      setNotification({
        message: "Intention updated successfully!",
        type: "success"
      });
      
      // Refresh intentions list
      fetchIntentions();
    } catch (error) {
      console.error("Error updating intention:", error);
      setNotification({
        message: "Error updating intention. Please try again.",
        type: "error"
      });
    }
  };

  // Handle delete intention
  const handleDeleteIntention = async (): Promise<void> => {
    if (!intentionToDelete) return;
    
    try {
      // Delete intention
      const { error } = await supabase
        .from("intentions")
        .delete()
        .eq("id", intentionToDelete);
      
      if (error) throw error;
      
      // Reset state
      setShowDeleteConfirm(false);
      setIntentionToDelete(null);
      
      // Show success notification
      setNotification({
        message: "Intention deleted successfully!",
        type: "success"
      });
      
      // Refresh intentions list
      fetchIntentions();
    } catch (error) {
      console.error("Error deleting intention:", error);
      setNotification({
        message: "Error deleting intention. Please try again.",
        type: "error"
      });
    }
  };

  // Toggle group selection
  const toggleGroupSelection = (groupId: string | number): void => {
    setSelectedGroups(
      selectedGroups.includes(groupId)
        ? selectedGroups.filter(id => id !== groupId)
        : [...selectedGroups, groupId]
    );
  };

  // Toggle friend selection
  const toggleFriendSelection = (friendId: string): void => {
    setSelectedFriends(
      selectedFriends.includes(friendId)
        ? selectedFriends.filter(id => id !== friendId)
        : [...selectedFriends, friendId]
    );
  };

  // Handle refresh
  const onRefresh = (): void => {
    setRefreshing(true);
    fetchIntentions();
  };

  // Toggle search bar
  const toggleSearch = (): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchVisible(!isSearchVisible);
    Animated.timing(searchBarAnim, {
      toValue: isSearchVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: false
    }).start();
  };

  // Toggle filter options
  const toggleFilterOptions = (): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilterOptions(!showFilterOptions);
    Animated.timing(filterOptionsAnim, {
      toValue: showFilterOptions ? 0 : 1,
      duration: 300,
      useNativeDriver: false
    }).start();
  };

  // Apply filter
  const applyFilter = (filterType: string): void => {
    setFilter(filterType);
    setShowFilterOptions(false);
    fetchIntentions();
  };

  // Get intention type icon
  const getIntentionTypeIcon = (type: IntentionType): JSX.Element => {
    const intentionType = INTENTION_TYPES.find(t => t.key === type) || INTENTION_TYPES[10];
    if (intentionType.iconProvider === "FontAwesome") {
      return <FontAwesome name={intentionType.icon} size={12} color="#FFFFFF" />;
    }
    return <Feather name={intentionType.icon} size={12} color="#FFFFFF" />;
  };

  // Get intention type color
  const getIntentionTypeColor = (type: IntentionType): string => {
    const intentionType = INTENTION_TYPES.find(t => t.key === type) || INTENTION_TYPES[10];
    return intentionType.gradient[0];
  };

  // Format date to relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    
    return date.toLocaleDateString();
  };

  // Render intention card
  const renderIntentionCard = ({ item }: { item: Intention }): JSX.Element => {
    const isCurrentUser = item.user.id === currentUserId;
    const isCommentsExpanded = expandedCommentId === item.id;
    const typeColor = getIntentionTypeColor(item.type);
    const likeAnim = getLikeAnimation(item.id);
    
    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
          <View style={styles.userAvatar}>
            <Feather name="user" size={18} color="#FFF" />
          </View>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.userName}>
              {`${item.user.first_name} ${item.user.last_name}`}
              {isCurrentUser && <Text style={styles.youLabel}> • You</Text>}
            </Text>
            
            <View style={styles.metaContainer}>
              <View 
                style={[
                  styles.intentionTypeTag,
                  { backgroundColor: typeColor }
                ]}
              >
                {getIntentionTypeIcon(item.type)}
                <Text style={styles.intentionTypeText}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>
              
              <Text style={styles.timeText}>{formatRelativeTime(item.created_at)}</Text>
            </View>
            
            {item.group_info && (
              <View style={styles.groupTag}>
                <Feather name="users" size={12} color="#FFFFFF" />
                <Text style={styles.groupText}>{item.group_info.name}</Text>
              </View>
            )}
            
            <View style={styles.visibilityTag}>
              <Feather 
                name={
                  item.visibility === "Just Me" ? "lock" :
                  item.visibility === "Certain Friends" ? "user-check" :
                  item.visibility === "Certain Groups" ? "grid" :
                  item.visibility === "Friends & Groups" ? "globe" : "users"
                } 
                size={10} 
                color="#FFFFFF" 
              />
              <Text style={styles.visibilityText}>{item.visibility}</Text>
            </View>
          </View>
          
          {isCurrentUser && (
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={() => {
                setIntentionToDelete(item.id);
                setShowDeleteConfirm(true);
              }}
            >
              <Feather name="more-vertical" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.intentionTitle}>{item.title}</Text>
          <Text style={styles.intentionDescription}>{item.description}</Text>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionButton, item.is_liked && styles.actionButtonActive]}
            onPress={() => handleLikeIntention(item.id)}
          >
            <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
              <FontAwesome
                name={item.is_liked ? "heart" : "heart-o"}
                size={20}
                color={item.is_liked ? "#E9967A" : "#FFFFFF"}
              />
            </Animated.View>
            <Text style={[styles.actionText, item.is_liked && styles.actionTextActive]}>
              {item.likes_count ? `${item.likes_count}` : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => toggleComments(item.id)}
            accessible={true}
            accessibilityLabel={`${isCommentsExpanded ? "Hide" : "Show"} comments`}
            accessibilityRole="button"
          >
            <Feather 
              name="message-circle" 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionText}>
              {item.comments_count ? `${item.comments_count}` : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="share" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          
          {isCurrentUser && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEditIntention(item)}
            >
              <Feather name="edit-2" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {isCommentsExpanded && (
          <View style={styles.commentsSection}>
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a prayer or encouragement..."
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={() => handleAddComment(item.id)}
              >
                <Feather name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {commentsLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginVertical: 10 }} />
            ) : comments.length > 0 ? (
              <FlatList
                data={comments}
                keyExtractor={(comment) => comment.id}
                renderItem={({ item: comment }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentAvatar}>
                        <Feather name="user" size={14} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.commentAuthor}>
                          {`${comment.user.first_name} ${comment.user.last_name}`}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatRelativeTime(comment.created_at)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.commentContent}>{comment.content}</Text>
                  </View>
                )}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>Be the first to comment</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Background image (could replace with your own)
  const backgroundImage = { uri: "https://images.unsplash.com/photo-1501493870936-9c2e41625521?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80" };

  return (
    <ImageBackground source={backgroundImage} style={styles.backgroundImage}>
      <View style={styles.overlay} />
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.container}>
        {/* Notification */}
        {notification && (
          <View style={[
            styles.notificationContainer,
            notification.type === "error" ? styles.errorNotification : styles.successNotification
          ]}>
            <Text style={styles.notificationText}>{notification.message}</Text>
          </View>
        )}
        
        {/* Animated Header */}
        <Animated.View 
          style={[
            styles.animatedHeader, 
            { 
              height: headerHeight,
              opacity: headerOpacity,
            }
          ]}
        >
          <View style={styles.headerBlur}>
            <Text style={styles.headerTitle}>
              {filter === "all" ? "Community" : 
               filter === "mine" ? "My Posts" :
               filter === "friends" ? "Friends" : "Groups"}
            </Text>
          </View>
        </Animated.View>
        
        {/* Main Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={toggleFilterOptions}
            >
              <Feather name="filter" size={20} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>
                {filter === "all" ? "All" : 
                 filter === "mine" ? "Mine" :
                 filter === "friends" ? "Friends" : "Groups"}
              </Text>
              <Feather 
                name={showFilterOptions ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={toggleSearch}
            >
              <Feather name="search" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowNotifications(!showNotifications)}
            >
              <Feather name="bell" size={22} color="#FFFFFF" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Filter Options Dropdown */}
        {showFilterOptions && (
          <Animated.View 
            style={[
              styles.filterOptions,
              {
                opacity: filterOptionsAnim,
                transform: [
                  {
                    translateY: filterOptionsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={[styles.filterOption, filter === "all" && styles.activeFilterOption]}
              onPress={() => applyFilter("all")}
            >
              <Feather name="globe" size={16} color="#FFFFFF" />
              <Text style={styles.filterOptionText}>All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterOption, filter === "mine" && styles.activeFilterOption]}
              onPress={() => applyFilter("mine")}
            >
              <Feather name="user" size={16} color="#FFFFFF" />
              <Text style={styles.filterOptionText}>My Posts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterOption, filter === "friends" && styles.activeFilterOption]}
              onPress={() => applyFilter("friends")}
            >
              <Feather name="users" size={16} color="#FFFFFF" />
              <Text style={styles.filterOptionText}>Friends</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterOption, filter === "groups" && styles.activeFilterOption]}
              onPress={() => applyFilter("groups")}
            >
              <Feather name="grid" size={16} color="#FFFFFF" />
              <Text style={styles.filterOptionText}>Groups</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        
        {/* Search Bar */}
        {isSearchVisible && (
          <Animated.View 
            style={[
              styles.searchBarContainer,
              {
                opacity: searchBarAnim,
                transform: [
                  {
                    translateY: searchBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.searchBar}>
              <Feather name="search" size={20} color="#FFFFFF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search intentions..."
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Feather name="x" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.cancelSearchButton}
              onPress={toggleSearch}
            >
              <Text style={styles.cancelSearchText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        
        {/* Content */}
        <Animated.FlatList
          data={intentions}
          keyExtractor={(item) => item.id}
          renderItem={renderIntentionCard}
          contentContainerStyle={[
            styles.contentContainer, 
            { paddingBottom: tabBarHeight + 20 }
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              colors={["#FFFFFF"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="archive" size={60} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.emptyText}>No intentions found</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => {
                  setEditingIntention(null);
                  setShowIntentionModal(true);
                }}
              >
                <Text style={styles.createButtonText}>Create New Intention</Text>
              </TouchableOpacity>
            </View>
          }
        />
        
        {/* FAB */}
        <TouchableOpacity 
          style={[styles.fab, { bottom: tabBarHeight + 20 }]}
          onPress={() => {
            setEditingIntention(null);
            setShowIntentionModal(true);
          }}
        >
          <Animated.View 
            style={{ 
              transform: [
                { scale: fabAnim },
                { rotate: '0deg' }
              ]
            }}
          >
            <View
              style={[styles.fabGradient, { backgroundColor: '#E9967A' }]}
            >
              <Feather name="plus" size={24} color="#FFFFFF" />
            </View>
          </Animated.View>
        </TouchableOpacity>
        
        {/* Create/Edit Intention Modal */}
        <Modal
          visible={showIntentionModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setShowIntentionModal(false);
            setEditingIntention(null);
            setShowTypeSelector(false);
            setShowVisibilitySelector(false);
            setShowGroupSelector(false);
            setShowFriendSelector(false);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalBlur}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => {
                        setShowIntentionModal(false);
                        setEditingIntention(null);
                        setShowTypeSelector(false);
                        setShowVisibilitySelector(false);
                        setShowGroupSelector(false);
                        setShowFriendSelector(false);
                      }}
                    >
                      <Feather name="x" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                      {editingIntention ? "Edit Intention" : "Create Intention"}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.modalActionButton,
                        (!editingIntention ? 
                          !newIntention.title.trim() || !newIntention.description.trim() :
                          !editingIntention.title.trim() || !editingIntention.description.trim()
                        ) && styles.modalActionButtonDisabled
                      ]}
                      onPress={
                        editingIntention ? handleUpdateIntention : handleCreateIntention
                      }
                      disabled={
                        editingIntention ? 
                          !editingIntention.title.trim() || !editingIntention.description.trim() :
                          !newIntention.title.trim() || !newIntention.description.trim()
                      }
                    >
                      <Text style={styles.modalActionButtonText}>
                        {editingIntention ? "Save" : "Share"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalForm}>
                    {/* Type Selector */}
                    <TouchableOpacity
                      style={styles.selectorButton}
                      onPress={() => {
                        setShowTypeSelector(true);
                        setShowVisibilitySelector(false);
                        setShowGroupSelector(false);
                        setShowFriendSelector(false);
                      }}
                    >
                      <View style={styles.selectorLeft}>
                        <View
                          style={[
                            styles.typeIconContainer, 
                            { backgroundColor: getIntentionTypeColor(
                              editingIntention ? editingIntention.type : newIntention.type
                            ) }
                          ]}
                        >
                          {getIntentionTypeIcon(
                            editingIntention ? editingIntention.type : newIntention.type
                          )}
                        </View>
                        <Text style={styles.selectorLabel}>
                          {(editingIntention ? editingIntention.type : newIntention.type)
                            .charAt(0).toUpperCase() + 
                            (editingIntention ? editingIntention.type : newIntention.type).slice(1)}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    {/* Type Selector Panel */}
                    {showTypeSelector && (
                      <View style={styles.selectorPanel}>
                        <Text style={styles.selectorPanelTitle}>Choose Intention Type</Text>
                        <View style={styles.typeGrid}>
                          {INTENTION_TYPES.map((type) => (
                            <TouchableOpacity
                              key={type.key}
                              style={[
                                styles.typeGridItem,
                                (editingIntention ? 
                                  editingIntention.type === type.key : 
                                  newIntention.type === type.key
                                ) && styles.selectedTypeGridItem
                              ]}
                              onPress={() => {
                                if (editingIntention) {
                                  setEditingIntention({
                                    ...editingIntention,
                                    type: type.key as IntentionType
                                  });
                                } else {
                                  setNewIntention({
                                    ...newIntention,
                                    type: type.key as IntentionType
                                  });
                                }
                                setShowTypeSelector(false);
                              }}
                            >
                              <View
                                style={[styles.typeGridIconContainer, { backgroundColor: type.gradient[0] }]}
                              >
                                {type.iconProvider === "FontAwesome" ? (
                                  <FontAwesome name={type.icon} size={16} color="#FFFFFF" />
                                ) : (
                                  <Feather name={type.icon} size={16} color="#FFFFFF" />
                                )}
                              </View>
                              <Text style={styles.typeGridLabel}>
                                {type.key.charAt(0).toUpperCase() + type.key.slice(1)}
                              </Text>
                              <Text style={styles.typeGridDescription} numberOfLines={2}>
                                {type.description}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    
                    {/* Visibility Selector */}
                    <TouchableOpacity
                      style={styles.selectorButton}
                      onPress={() => {
                        setShowVisibilitySelector(true);
                        setShowTypeSelector(false);
                        setShowGroupSelector(false);
                        setShowFriendSelector(false);
                      }}
                    >
                      <View style={styles.selectorLeft}>
                        <View style={styles.visibilityIconContainer}>
                          <Feather
                            name={
                              (editingIntention ? editingIntention.visibility : newIntention.visibility) === "Just Me" ? "lock" :
                              (editingIntention ? editingIntention.visibility : newIntention.visibility) === "Certain Friends" ? "user-check" :
                              (editingIntention ? editingIntention.visibility : newIntention.visibility) === "Certain Groups" ? "grid" :
                              (editingIntention ? editingIntention.visibility : newIntention.visibility) === "Friends & Groups" ? "globe" : "users"
                            }
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text style={styles.selectorLabel}>
                          {editingIntention ? editingIntention.visibility : newIntention.visibility}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    {/* Visibility Selector Panel */}
                    {showVisibilitySelector && (
                      <View style={styles.selectorPanel}>
                        <Text style={styles.selectorPanelTitle}>Choose Who Can See</Text>
                        {VISIBILITY_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.key}
                            style={[
                              styles.visibilityOption,
                              (editingIntention ? 
                                editingIntention.visibility === option.key : 
                                newIntention.visibility === option.key
                              ) && styles.selectedVisibilityOption
                            ]}
                            onPress={() => {
                              if (editingIntention) {
                                setEditingIntention({
                                  ...editingIntention,
                                  visibility: option.key as "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups" | "Certain Friends"
                                });
                              } else {
                                setNewIntention({
                                  ...newIntention,
                                  visibility: option.key as "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups" | "Certain Friends"
                                });
                              }
                              setShowVisibilitySelector(false);
                              
                              // Show group or friend selectors if needed
                              if (option.key === "Certain Groups") {
                                setShowGroupSelector(true);
                              } else if (option.key === "Certain Friends") {
                                setShowFriendSelector(true);
                              }
                            }}
                          >
                            <View style={styles.visibilityOptionLeft}>
                              {option.iconProvider === "FontAwesome" ? (
                                <FontAwesome name={option.icon as keyof typeof FontAwesome.glyphMap} size={16} color="#FFFFFF" style={styles.visibilityOptionIcon} />
                              ) : (
                                <Feather name={option.icon as "users" | "user-check" | "grid" | "globe" | "user"} size={16} color="#FFFFFF" style={styles.visibilityOptionIcon} />
                              )}
                              <View>
                                <Text style={styles.visibilityOptionLabel}>{option.key}</Text>
                                <Text style={styles.visibilityOptionDescription}>{option.description}</Text>
                              </View>
                            </View>
                            {(editingIntention ? 
                              editingIntention.visibility === option.key : 
                              newIntention.visibility === option.key
                            ) && (
                              <Feather name="check" size={18} color="#4CAF50" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    
                    {/* Group Selector */}
                    {((editingIntention ? 
                      editingIntention.visibility : 
                      newIntention.visibility) === "Certain Groups") && (
                      <TouchableOpacity
                        style={[styles.selectorButton, { marginTop: 10 }]}
                        onPress={() => {
                          setShowGroupSelector(true);
                          setShowTypeSelector(false);
                          setShowVisibilitySelector(false);
                          setShowFriendSelector(false);
                        }}
                      >
                        <View style={styles.selectorLeft}>
                          <View style={styles.visibilityIconContainer}>
                            <Feather name="grid" size={16} color="#FFFFFF" />
                          </View>
                          <Text style={styles.selectorLabel}>
                            {selectedGroups.length > 0 
                              ? `${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''} selected` 
                              : "Select groups"}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    
                    {/* Group Selector Panel */}
                    {showGroupSelector && (
                      <View style={styles.selectorPanel}>
                        <Text style={styles.selectorPanelTitle}>Select Groups</Text>
                        {userGroups.length > 0 ? (
                          <View>
                            {userGroups.map((group) => (
                              <TouchableOpacity
                                key={group.id}
                                style={[
                                  styles.visibilityOption,
                                  selectedGroups.includes(group.id) && styles.selectedVisibilityOption
                                ]}
                                onPress={() => toggleGroupSelection(group.id)}
                              >
                                <View style={styles.visibilityOptionLeft}>
                                  <Feather 
                                    name="users" 
                                    size={16} 
                                    color="#FFFFFF" 
                                    style={styles.visibilityOptionIcon} 
                                  />
                                  <Text style={styles.visibilityOptionLabel}>{group.name}</Text>
                                </View>
                                {selectedGroups.includes(group.id) && (
                                  <Feather name="check" size={18} color="#4CAF50" />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.emptyText}>You're not a member of any groups yet.</Text>
                        )}
                      </View>
                    )}
                    
                    {/* Friend Selector */}
                    {((editingIntention ? 
                      editingIntention.visibility : 
                      newIntention.visibility) === "Certain Friends") && (
                      <TouchableOpacity
                        style={[styles.selectorButton, { marginTop: 10 }]}
                        onPress={() => {
                          setShowFriendSelector(true);
                          setShowTypeSelector(false);
                          setShowVisibilitySelector(false);
                          setShowGroupSelector(false);
                        }}
                      >
                        <View style={styles.selectorLeft}>
                          <View style={styles.visibilityIconContainer}>
                            <Feather name="user-plus" size={16} color="#FFFFFF" />
                          </View>
                          <Text style={styles.selectorLabel}>
                            {selectedFriends.length > 0 
                              ? `${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''} selected` 
                              : "Select friends"}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    
                    {/* Friend Selector Panel */}
                    {showFriendSelector && (
                      <View style={styles.selectorPanel}>
                        <Text style={styles.selectorPanelTitle}>Select Friends</Text>
                        {friends.length > 0 ? (
                          <View>
                            {friends.map((friend) => (
                              <TouchableOpacity
                                key={friend.id}
                                style={[
                                  styles.visibilityOption,
                                  selectedFriends.includes(friend.id) && styles.selectedVisibilityOption
                                ]}
                                onPress={() => toggleFriendSelection(friend.id)}
                              >
                                <View style={styles.visibilityOptionLeft}>
                                  <Feather 
                                    name="user" 
                                    size={16} 
                                    color="#FFFFFF" 
                                    style={styles.visibilityOptionIcon} 
                                  />
                                  <Text style={styles.visibilityOptionLabel}>
                                    {friend.first_name} {friend.last_name}
                                  </Text>
                                </View>
                                {selectedFriends.includes(friend.id) && (
                                  <Feather name="check" size={18} color="#4CAF50" />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.emptyText}>You don't have any friends added yet.</Text>
                        )}
                      </View>
                    )}
                    
                    {/* Title and Description */}
                    <View style={styles.formGroup}>
                      <TextInput
                        style={styles.titleInput}
                        placeholder="What's your intention?"
                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                        value={editingIntention ? editingIntention.title : newIntention.title}
                        onChangeText={(text) => {
                          if (editingIntention) {
                            setEditingIntention({
                              ...editingIntention,
                              title: text
                            });
                          } else {
                            setNewIntention({
                              ...newIntention,
                              title: text
                            });
                          }
                        }}
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <TextInput
                        style={styles.descriptionInput}
                        placeholder="Share more details..."
                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                        value={editingIntention ? editingIntention.description : newIntention.description}
                        onChangeText={(text) => {
                          if (editingIntention) {
                            setEditingIntention({
                              ...editingIntention,
                              description: text
                            });
                          } else {
                            setNewIntention({
                              ...newIntention,
                              description: text
                            });
                          }
                        }}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                      />
                    </View>
                    
                    {/* Scripture Lookup (New Feature) */}
                    <TouchableOpacity style={styles.scriptureButton}>
                      <MaterialIcons name="menu-book" size={20} color="#FFFFFF" />
                      <Text style={styles.scriptureButtonText}>Add Bible Reference</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        </Modal>
        
        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}
        >
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmModalContent}>
              <Text style={styles.confirmModalTitle}>Delete Intention</Text>
              <Text style={styles.confirmModalText}>
                Are you sure you want to delete this intention? This action cannot be undone.
              </Text>
              <View style={styles.confirmModalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setIntentionToDelete(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteIntention}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  // Main Container
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 20, 25, 0.93)",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  
  // Notification
  notificationContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 10,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  errorNotification: {
    backgroundColor: "rgba(220, 38, 38, 0.9)",
  },
  successNotification: {
    backgroundColor: "rgba(16, 185, 129, 0.9)",
  },
  notificationText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
    zIndex: 10,
  },
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
    backgroundColor: "rgba(20, 20, 25, 0.95)",
  },
  headerBlur: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    marginHorizontal: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#E9967A",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  
  // Filter Options
  filterOptions: {
    position: "absolute",
    top: Platform.OS === 'android' ? 100 : 70,
    left: 16,
    right: 16,
    backgroundColor: "rgba(30, 30, 35, 0.95)",
    borderRadius: 16,
    padding: 8,
    zIndex: 99,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  activeFilterOption: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  filterOptionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
  },
  
  // Search Bar
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#FFFFFF",
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 4,
  },
  cancelSearchButton: {
    marginLeft: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelSearchText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  
  // Cards
  cardContainer: {
    backgroundColor: "rgba(30, 30, 35, 0.8)",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  youLabel: {
    color: "#E9967A",
    fontWeight: "normal",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  intentionTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  intentionTypeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  groupTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  groupText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginLeft: 4,
  },
  visibilityTag: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  visibilityText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    marginLeft: 4,
  },
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: 16,
  },
  intentionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  intentionDescription: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 15,
    lineHeight: 22,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionButtonActive: {
    backgroundColor: "rgba(233, 150, 122, 0.1)",
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  actionTextActive: {
    color: "#E9967A",
  },
  
  // Comments
  commentsSection: {
    padding: 16,
    backgroundColor: "rgba(20, 20, 25, 0.5)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#FFFFFF",
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  commentItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  commentAuthor: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  commentTime: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  commentContent: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyComments: {
    padding: 12,
    alignItems: "center",
  },
  emptyCommentsText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
  
  // FAB
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBlur: {
    flex: 1,
    backgroundColor: "rgba(20, 20, 25, 0.95)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "rgba(20, 20, 25, 0.95)",
    margin: 10,
    marginTop: 50,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  modalActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#E9967A",
    borderRadius: 20,
  },
  modalActionButtonDisabled: {
    backgroundColor: "rgba(233, 150, 122, 0.5)",
  },
  modalActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalForm: {
    flex: 1,
    padding: 16,
  },
  
  // Type & Visibility Selectors
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  visibilityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectorLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  selectorPanel: {
    backgroundColor: "rgba(30, 30, 35, 0.98)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  selectorPanelTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  
  // Type Grid
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  typeGridItem: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  selectedTypeGridItem: {
    backgroundColor: "rgba(233, 150, 122, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.5)",
  },
  typeGridIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  typeGridLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  typeGridDescription: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    textAlign: "center",
  },
  
  // Visibility Options
  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedVisibilityOption: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  visibilityOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  visibilityOptionIcon: {
    marginRight: 12,
  },
  visibilityOptionLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  visibilityOptionDescription: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
  },
  
  // Form
  formGroup: {
    marginBottom: 16,
  },
  titleInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 16,
  },
  descriptionInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 16,
    minHeight: 120,
  },
  
  // Scripture Button (New Feature)
  scriptureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(89, 127, 236, 0.2)",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(89, 127, 236, 0.4)",
  },
  scriptureButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    marginTop: 20,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    marginVertical: 16,
  },
  createButton: {
    backgroundColor: "rgba(233, 150, 122, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.4)",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Delete Confirmation Modal
  confirmModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: "rgba(30, 30, 35, 0.95)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  confirmModalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  confirmModalText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  confirmModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "rgba(220, 38, 38, 0.8)",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  
  // Loading
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default FaithCommunityApp;