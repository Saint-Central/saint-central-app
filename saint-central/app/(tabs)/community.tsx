import React, { useState, useEffect, useRef } from "react";
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
  LayoutAnimation,
  UIManager,
  InputAccessoryView,
  Keyboard,
  Easing,
  RefreshControl,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../supabaseClient";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";

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
type TabType =
  | "all"
  | "resolutions"
  | "prayers"
  | "goals"
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

interface FriendRequestSent {
  id: string;
  user_id_2: string;
  status: string;
  created_at: string;
  user_2: UserData;
}

interface FriendRequestIncoming {
  id: string;
  user_id_1: string;
  status: string;
  created_at: string;
  user_1: UserData;
}

interface Friend {
  id: string;
  friend: UserData;
  created_at?: string; // Make created_at optional
}

interface Like {
  id: string;
  user_id: string;
  likeable_id: string;
  likeable_type: string;
  created_at: string;
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

interface IntentionCardProps {
  item: Intention;
  currentUserId: string | null;
  onLike: (id: string, isLiked: boolean) => void;
  onComment: (intentionId: string) => void;
  onEdit: (intention: Intention) => void;
  onDelete: (id: string) => void;
  likeScaleAnim: Animated.Value;
  likeOpacityAnim: Animated.Value;
  isCommentsExpanded: boolean;
  comments: Comment[];
  newComment: string;
  setNewComment: (text: string) => void;
  handleAddComment: (intentionId: string) => void;
  commentsLoading: boolean;
}

// Import background image
const backgroundImageRequire = require("../../assets/images/community-image.jpg");

// Define visibility options with icons and in desired order
const visibilityOptions = [
  {
    label: "Friends",
    icon: <Feather name="users" size={16} color="#FFFFFF" />,
  },
  {
    label: "Certain Friends",
    icon: <Feather name="user-check" size={16} color="#FFFFFF" />,
  },
  {
    label: "Certain Groups",
    icon: <Feather name="grid" size={16} color="#FFFFFF" />,
  },
  {
    label: "Friends & Groups",
    icon: <FontAwesome name="globe" size={16} color="#FFFFFF" />,
  },
  { label: "Just Me", icon: <Feather name="user" size={16} color="#FFFFFF" /> },
];

// Helper: Convert the returned selected_groups field to a proper array.
// If it's already an array, return it; if it's a string, try to parse it.
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

// Helper: Convert the returned selected_friends field to a proper array.
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

// Separate IntentionCard component
const IntentionCard: React.FC<IntentionCardProps> = ({
  item,
  currentUserId,
  onLike,
  onComment,
  onEdit,
  onDelete,
  likeScaleAnim,
  likeOpacityAnim,
  isCommentsExpanded,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  commentsLoading,
}) => {
  const renderCommentItem = ({ item: comment }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Feather name="user" size={18} color="#fbbf24" />
        </View>
        <View style={styles.commentUser}>
          <Text style={styles.commentUserName}>
            {comment.user.first_name} {comment.user.last_name}
          </Text>
          <Text style={styles.commentTime}>
            {new Date(comment.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • {new Date(comment.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{comment.content}</Text>
    </View>
  );

  return (
    <View style={styles.intentionCard}>
      <LinearGradient
        colors={['rgba(251, 191, 36, 0.1)', 'transparent']}
        style={styles.cardGradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.intentionHeader}>
        <View style={styles.intentionAvatar}>
          <Feather name="user" size={18} color="#fbbf24" />
        </View>
        <View style={styles.intentionHeaderText}>
          <Text style={styles.intentionAuthor}>
            {item.user.first_name} {item.user.last_name}
            {item.user_id === currentUserId && <Text style={styles.authorTag}> • You</Text>}
          </Text>
          <View style={styles.intentionMeta}>
            <View style={styles.intentionTypeTag}>
              {item.type === "prayer" ? (
                <FontAwesome name="hand-peace-o" size={12} color="#fbbf24" />
              ) : item.type === "resolution" ? (
                <Feather name="book-open" size={12} color="#fbbf24" />
              ) : item.type === "goal" ? (
                <Feather name="target" size={12} color="#fbbf24" />
              ) : item.type === "spiritual" ? (
                <FontAwesome name="star" size={12} color="#fbbf24" />
              ) : item.type === "family" ? (
                <Feather name="users" size={12} color="#fbbf24" />
              ) : item.type === "health" ? (
                <Feather name="heart" size={12} color="#fbbf24" />
              ) : item.type === "work" ? (
                <Feather name="briefcase" size={12} color="#fbbf24" />
              ) : item.type === "friends" ? (
                <Feather name="user-plus" size={12} color="#fbbf24" />
              ) : item.type === "world" ? (
                <Feather name="globe" size={12} color="#fbbf24" />
              ) : item.type === "personal" ? (
                <Feather name="user" size={12} color="#fbbf24" />
              ) : (
                <Feather name="more-horizontal" size={12} color="#fbbf24" />
              )}
              <Text style={styles.intentionTypeText}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
            <Text style={styles.intentionTime}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              • {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {item.group_info && (
            <View style={styles.groupTag}>
              <Feather name="users" size={12} color="#fbbf24" />
              <Text style={styles.groupTagText}>Shared group(s): {item.group_info.name}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.intentionContent}>
        <Text style={styles.intentionTitle}>{item.title}</Text>
        <Text style={styles.intentionDescription}>{item.description}</Text>
      </View>
      <View style={styles.intentionActions}>
        <TouchableOpacity
          style={[styles.intentionAction, item.is_liked && styles.intentionActionActive]}
          onPress={() => onLike(item.id, !!item.is_liked)}
        >
          <View style={styles.likeButtonContainer}>
            <Animated.View
              style={[
                styles.likeRipple,
                {
                  opacity: likeOpacityAnim,
                  transform: [{ scale: Animated.multiply(likeScaleAnim, 2) }],
                },
              ]}
            />
            <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
              <FontAwesome
                name={item.is_liked ? "heart" : "heart-o"}
                size={13}
                color={item.is_liked ? "#f59e0b" : "#fbbf24"}
              />
            </Animated.View>
          </View>
          <Text style={[styles.actionText, item.is_liked && styles.actionTextActive]}>
            {item.is_liked ? "Liked" : "Support"}{item.likes_count ? ` (${item.likes_count})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.intentionAction} onPress={() => onComment(item.id)}>
          <Feather name="message-circle" size={13} color="#fbbf24" />
          <Text style={styles.actionText}>
            {isCommentsExpanded ? "Hide Comments" : "Comment"}{" "}
            {item.comments_count ? `(${item.comments_count})` : ""}
          </Text>
        </TouchableOpacity>
        {item.user_id === currentUserId && (
          <TouchableOpacity style={styles.intentionAction} onPress={() => onEdit(item)}>
            <Feather name="edit" size={13} color="#fbbf24" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {isCommentsExpanded && (
        <View style={styles.commentsSection}>
          <View style={styles.commentsDivider} />
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(254, 243, 199, 0.4)"
              value={newComment}
              onChangeText={setNewComment}
              multiline={true}
              inputAccessoryViewID="accessoryViewID"
            />
            <TouchableOpacity style={styles.sendButton} onPress={() => handleAddComment(item.id)}>
              <Feather name="send" size={22} color="#fbbf24" />
            </TouchableOpacity>
          </View>
          {commentsLoading ? (
            <ActivityIndicator size="small" color="#fbbf24" style={styles.commentsLoading} />
          ) : (
            <>
              {comments.length > 0 ? (
                <FlatList
                  data={comments}
                  renderItem={renderCommentItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.commentsList}
                />
              ) : (
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet.</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

export default function CommunityScreen() {
  // Auth and CRUD clients
  const { user, loading: authLoading } = useAuth();
  const { select, insert, update, delete: deleteRecord } = useCRUD();
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab] = useState<TabType>("all");
  const [intentionsFilter, setIntentionsFilter] = useState<"all" | "mine" | "friends" | "groups">(
    "all",
  );
  const [showIntentionModal, setShowIntentionModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingIntention, setEditingIntention] = useState<Intention | null>(null);
  const [showFriendsSearch, setShowFriendsSearch] = useState<boolean>(false);
  const [friendTab, setFriendTab] = useState<"search" | "requests" | "list">("search");
  const [sentRequests, setSentRequests] = useState<FriendRequestSent[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestIncoming[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
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
    selectedFriends: [],
  });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    intentionId: string | null;
  }>({ isOpen: false, intentionId: null });
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  // Get current user ID from AuthContext
  const currentUserId = user?.id || null;
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState<boolean>(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [showFabMenu, setShowFabMenu] = useState<boolean>(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  // Visibility dropdown states in modals
  const [showVisibilityDropdownNew, setShowVisibilityDropdownNew] = useState<boolean>(false);
  const [showVisibilityDropdownEdit, setShowVisibilityDropdownEdit] = useState<boolean>(false);
  // Use state to track focus of description so the accessory view appears
  const [createDescriptionFocused, setCreateDescriptionFocused] = useState(false);
  const [editDescriptionFocused, setEditDescriptionFocused] = useState(false);
  const headerRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const filterDropdownAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const likeScaleAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const likeOpacityAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const fabMenuAnimation = useRef(new Animated.Value(0)).current;
  const fabRotation = fabMenuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });
  // Add this near the top of the component where other state is defined
  const [selectedAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(0));

  // Pulsing animation for header
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  const toggleNewGroupSelection = (groupId: string) => {
    const currentSelected = newIntention.selectedGroups || [];
    if (currentSelected.includes(groupId)) {
      setNewIntention({
        ...newIntention,
        selectedGroups: currentSelected.filter((id) => id !== groupId),
      });
    } else {
      setNewIntention({
        ...newIntention,
        selectedGroups: [...currentSelected, groupId],
      });
    }
  };

  const toggleEditGroupSelection = (groupId: string) => {
    if (!editingIntention) return;
    const currentSelected = editingIntention.selectedGroups || [];
    if (currentSelected.includes(groupId)) {
      setEditingIntention({
        ...editingIntention,
        selectedGroups: currentSelected.filter((id) => id !== groupId),
      });
    } else {
      setEditingIntention({
        ...editingIntention,
        selectedGroups: [...currentSelected, groupId],
      });
    }
  };

  const toggleNewFriendSelection = (friendId: string) => {
    const currentSelected = newIntention.selectedFriends || [];
    const isSelected = currentSelected.includes(friendId);

    // Animate the selection
    Animated.spring(selectedAnim, {
      toValue: isSelected ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    setNewIntention({
      ...newIntention,
      selectedFriends: isSelected
        ? currentSelected.filter((id) => id !== friendId)
        : [...currentSelected, friendId],
    });
  };

  const toggleEditFriendSelection = (friendId: string) => {
    if (!editingIntention) return;
    const currentSelected = editingIntention.selectedFriends || [];
    if (currentSelected.includes(friendId)) {
      setEditingIntention({
        ...editingIntention,
        selectedFriends: currentSelected.filter((id) => id !== friendId),
      });
    } else {
      setEditingIntention({
        ...editingIntention,
        selectedFriends: [...currentSelected, friendId],
      });
    }
  };

  useEffect(() => {
    if (intentionsFilter === "all" && !groupsLoaded) return;
    fetchIntentions();
  }, [intentionsFilter, activeTab, groupsLoaded]);


  useEffect(() => {
    if (currentUserId) fetchUserGroups();
  }, [currentUserId]);

  useEffect(() => {
    setNotification(null);
    if (showFriendsSearch) {
      if (friendTab === "requests") fetchFriendRequests();
      else if (friendTab === "list") fetchFriends();
    }
  }, [showFriendsSearch, friendTab]);

  useEffect(() => {
    fetchIncomingRequestsCount();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (expandedCommentId) fetchComments(expandedCommentId);
  }, [expandedCommentId]);

  // Always render the dropdown, but disable pointer events when hidden.
  useEffect(() => {
    Animated.timing(filterDropdownAnim, {
      toValue: showFilterDropdown ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [showFilterDropdown]);

  const getLikeScaleAnimation = (intentionId: string): Animated.Value => {
    if (!likeScaleAnimations.current.has(intentionId)) {
      likeScaleAnimations.current.set(intentionId, new Animated.Value(1));
    }
    return likeScaleAnimations.current.get(intentionId) as Animated.Value;
  };

  const getLikeOpacityAnimation = (intentionId: string): Animated.Value => {
    if (!likeOpacityAnimations.current.has(intentionId)) {
      likeOpacityAnimations.current.set(intentionId, new Animated.Value(0));
    }
    return likeOpacityAnimations.current.get(intentionId) as Animated.Value;
  };

  const isUserFriend = async (currentUserId: string, userId: string): Promise<boolean> => {
    try {
      if (currentUserId === userId) return false;
      const { data: sent, error: sentError } = await supabase
        .from("friends")
        .select("id")
        .eq("user_id_1", currentUserId)
        .eq("user_id_2", userId)
        .eq("status", "accepted")
        .maybeSingle();
      if (sentError) throw sentError;
      const { data: received, error: receivedError } = await supabase
        .from("friends")
        .select("id")
        .eq("user_id_1", userId)
        .eq("user_id_2", currentUserId)
        .eq("status", "accepted")
        .maybeSingle();
      if (receivedError) throw receivedError;
      return !!(sent || received);
    } catch (error) {
      console.error("Error checking friendship:", error);
      return false;
    }
  };

  const getHeaderTitle = (): string => {
    switch (intentionsFilter) {
      case "mine":
        return "My Posts";
      case "friends":
        return "Friends";
      case "groups":
        return "Groups";
      default:
        return "Community";
    }
  };

  const fetchUserGroups = async (): Promise<void> => {
    try {
      if (!currentUserId) return;
      // Get group memberships for the current user
      const groupMemberships = await select("group_members", {
        where: { user_id: currentUserId },
        select: "group_id"
      });
      
      if (groupMemberships.length > 0) {
        // Get group details for all groups the user is a member of
        const groupIds = groupMemberships.map((gm: any) => gm.group_id);
        const groups = await select("groups", {
          where: { id: groupIds } // This will need to be handled by the CRUD API for IN queries
        });
        setUserGroups(groups || []);
      } else {
        setUserGroups([]);
      }
      
      setGroupsLoaded(true);
    } catch (error: any) {
      console.error("Error fetching user groups:", error);
      setUserGroups([]);
      setGroupsLoaded(true);
    }
  };

  const fetchIntentions = async (type?: IntentionType): Promise<void> => {
    try {
      setIsLoading(true);
      if (!user) throw new Error("Not authenticated");

      // First, fetch all intentions using crudClient
      const whereClause = type ? { type } : {};
      const allIntentions = await select("intentions", {
        where: whereClause
      });
      
      // Sort by created_at descending (newest first)
      allIntentions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Then fetch user data for each intention
      const userIds = [...new Set(allIntentions.map((intention: any) => intention.user_id))];
      const users = userIds.length > 0 ? await select("users", {
        where: { id: userIds }
      }) : [];

      // Create a user lookup map
      const userMap = users.reduce((acc: any, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});

      // Combine intentions with user data
      const intentionsWithUsers = allIntentions.map((intention: any) => ({
        ...intention,
        user: userMap[intention.user_id] || { first_name: 'Unknown', last_name: 'User' }
      }));

      // Get user's friends using crudClient
      const sentFriends = await select("friends", {
        where: { user_id_1: user.id, status: "accepted" },
        select: "user_id_2"
      });

      const receivedFriends = await select("friends", {
        where: { user_id_2: user.id, status: "accepted" },
        select: "user_id_1"
      });

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

      // Get user's group memberships and group members using crudClient
      const userGroupIds = userGroups.map((group) => group.id);
      const groupMembers = userGroupIds.length > 0 ? await select("group_members", {
        where: { group_id: userGroupIds }, // This will need IN query support
        select: "user_id, group_id"
      }) : [];

      // Create a map of group ID to member IDs
      const groupMembersMap = new Map<string, Set<string>>();
      if (groupMembers) {
        groupMembers.forEach((member: { user_id: string; group_id: string }) => {
          if (!groupMembersMap.has(member.group_id)) {
            groupMembersMap.set(member.group_id, new Set<string>());
          }
          groupMembersMap.get(member.group_id)?.add(member.user_id);
        });
      }

      // Filter intentions based on visibility settings
      const filteredIntentions = intentionsWithUsers?.filter((intention: any) => {
        // Parse selected groups
        const selectedGroups = parseSelectedGroups(intention.selected_groups);

        // Current user's own intentions always visible
        if (intention.user_id === user.id) {
          return true;
        }

        // Apply intentionsFilter specific filtering
        if (intentionsFilter === "mine") {
          return intention.user_id === user.id;
        } else if (intentionsFilter === "friends") {
          // In friends filter, only show posts from friends that are visible to friends
          return (
            friendIds.has(intention.user_id) &&
            (intention.visibility === "Friends" || intention.visibility === "Friends & Groups")
          );
        } else if (intentionsFilter === "groups") {
          // In groups filter, show only posts from group members that are visible to groups
          let isInSameGroup = false;
          // Check if post owner is in any of user's groups
          for (const groupId of userGroupIds) {
            const membersOfGroup = groupMembersMap.get(groupId);
            if (membersOfGroup && membersOfGroup.has(intention.user_id)) {
              isInSameGroup = true;
              break;
            }
          }

          // For "Certain Groups", check if the current user is in one of the selected groups
          if (intention.visibility === "Certain Groups") {
            // If no groups are selected, don't show the post
            if (!selectedGroups || selectedGroups.length === 0) return false;

            // Convert all to strings for consistent comparison
            const userGroupIdsStr = userGroupIds.map((id) => String(id));
            const selectedGroupsStr = selectedGroups.map((id) => String(id));

            // Debug log (remove in production)
            console.log("User groups:", userGroupIdsStr);
            console.log("Post selected groups:", selectedGroupsStr);

            // Check if there's any overlap between user's groups and post's selected groups
            const isInSelectedGroup = selectedGroupsStr.some((groupId) =>
              userGroupIdsStr.includes(groupId),
            );

            return isInSelectedGroup;
          }

          return (
            isInSameGroup &&
            (intention.visibility === "Friends & Groups" ||
              intention.visibility === "Certain Groups")
          );
        } else if (intentionsFilter === "all") {
          // In "all" filter, show:
          // 1. All of the user's own posts
          // 2. Posts visible to the user based on visibility settings

          switch (intention.visibility) {
            case "Just Me":
              // Only visible to creator
              return intention.user_id === user.id;

            case "Friends":
              // Visible to creator and friends
              return intention.user_id === user.id || friendIds.has(intention.user_id);

            case "Certain Friends":
              // Visible to creator and selected friends
              if (intention.user_id === user.id) return true;
              const selectedFriends = parseSelectedFriends(intention.selected_friends);
              return selectedFriends.includes(user.id);

            case "Certain Groups":
              // Visible to creator and members of selected groups
              if (intention.user_id === user.id) return true;

              // If no groups are selected, only show to creator
              if (!selectedGroups || selectedGroups.length === 0)
                return intention.user_id === user.id;

              // Convert all to strings for consistent comparison
              const userGroupIdsStr = userGroupIds.map((id) => String(id));
              const selectedGroupsStr = selectedGroups.map((id) => String(id));

              // Check if there's any overlap between user's groups and post's selected groups
              return selectedGroupsStr.some((groupId) => userGroupIdsStr.includes(groupId));

            case "Friends & Groups":
              // Visible to creator, friends, and group members
              if (intention.user_id === user.id || friendIds.has(intention.user_id)) {
                return true;
              }

              // Check if user is in same group as post creator
              for (const groupId of userGroupIds) {
                const membersOfGroup = groupMembersMap.get(groupId);
                if (membersOfGroup && membersOfGroup.has(intention.user_id)) {
                  return true;
                }
              }
              return false;

            default:
              return false;
          }
        }

        return false;
      });

      // Get like and comment counts, check if user has liked each intention
      const intentionsWithCounts = await Promise.all(
        (filteredIntentions || []).map(async (intention: any) => {
          // Get likes count using crudClient
          const likes = await select("likes", {
            where: { likeable_id: intention.id, likeable_type: "intentions" }
          });
          const likesCount = likes.length;

          // Get comments count using crudClient  
          const comments = await select("comments", {
            where: { commentable_id: intention.id, commentable_type: "intentions" }
          });
          const commentsCount = comments.length;

          // Check if user has liked this intention
          const userLike = await select("likes", {
            where: { 
              likeable_id: intention.id,
              likeable_type: "intentions",
              user_id: user.id
            },
            limit: 1
          });

          let groupInfo = null;
          if (userGroups.length > 0) {
            const showGroupInfo =
              (intentionsFilter === "groups" && intention.user_id !== user.id) ||
              (intention.user_id !== user.id && !(await isUserFriend(user.id, intention.user_id)));
            if (showGroupInfo) {
              const userGroupData = await select("group_members", {
                where: { user_id: intention.user_id },
                select: "group_id"
              });
              const currentUserGroups = await select("group_members", {
                where: { user_id: user.id },
                select: "group_id"
              });
              if (userGroupData && currentUserGroups) {
                const userGroupIds = userGroupData.map((g) => g.group_id);
                const currentUserGroupIds = currentUserGroups.map((g) => g.group_id);
                const sharedGroupIds = userGroupIds.filter((id) =>
                  currentUserGroupIds.includes(id),
                );
                if (sharedGroupIds.length > 0) {
                  const groupData = await select("groups", {
                    where: { id: sharedGroupIds[0] },
                    limit: 1
                  });
                  if (groupData && groupData.length > 0) {
                    groupInfo = groupData[0];
                  }
                }
              }
            }
          }

          return {
            ...intention,
            likes_count: likesCount,
            comments_count: commentsCount,
            is_liked: userLike.length > 0,
            group_info: groupInfo,
            selectedGroups: parseSelectedGroups(intention.selected_groups),
            selectedFriends: parseSelectedFriends(intention.selected_friends),
          };
        }),
      );

      setIntentions(intentionsWithCounts || []);
    } catch (error: any) {
      console.error("Error fetching intentions:", error);
      setIntentions([]);
      setNotification({
        message:
          "Error fetching intentions: " + (error instanceof Error ? error.message : String(error)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (intentionId: string): Promise<void> => {
    try {
      setCommentsLoading(true);
      // Fetch comments using crudClient
      const comments = await select("comments", {
        where: { commentable_id: intentionId, commentable_type: "intentions" }
      });
      
      // Sort comments by created_at descending (newest first)
      comments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Fetch user data for comments
      const userIds = [...new Set(comments.map((comment: any) => comment.user_id))];
      const users = userIds.length > 0 ? await select("users", {
        where: { id: userIds }
      }) : [];
      
      // Create user lookup map
      const userMap = users.reduce((acc: any, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      // Combine comments with user data
      const commentsWithUsers = comments.map((comment: any) => ({
        ...comment,
        user: userMap[comment.user_id] || { first_name: 'Unknown', last_name: 'User' }
      }));
      
      setComments(commentsWithUsers || []);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      setComments([]);
      setNotification({
        message:
          "Error fetching comments: " + (error instanceof Error ? error.message : String(error)),
        type: "error",
      });
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchFriendRequests = async (): Promise<void> => {
    try {
      setIsLoading(true);
      if (!user) throw new Error("Not authenticated");
      // Fetch sent friend requests using crudClient
      const sent = await select("friends", {
        where: { user_id_1: user.id, status: "pending" },
        select: "id, user_id_2, status, created_at"
      });
      
      // Fetch user data for sent requests
      const sentUserIds = sent.map((req: any) => req.user_id_2);
      const sentUsers = sentUserIds.length > 0 ? await select("users", {
        where: { id: sentUserIds }
      }) : [];
      
      const sentUserMap = sentUsers.reduce((acc: any, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});
      interface SentRow {
        id: string;
        user_id_2: string;
        status: string;
        created_at: string;
        user_2: UserData | UserData[];
      }
      const formattedSent: FriendRequestSent[] = sent.map((row: any) => ({
        ...row,
        user_2: sentUserMap[row.user_id_2] || { first_name: 'Unknown', last_name: 'User' }
      }));
      
      // Fetch incoming friend requests using crudClient
      const incoming = await select("friends", {
        where: { user_id_2: user.id, status: "pending" },
        select: "id, user_id_1, status, created_at"
      });
      
      // Fetch user data for incoming requests
      const incomingUserIds = incoming.map((req: any) => req.user_id_1);
      const incomingUsers = incomingUserIds.length > 0 ? await select("users", {
        where: { id: incomingUserIds }
      }) : [];
      
      const incomingUserMap = incomingUsers.reduce((acc: any, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});
      interface IncomingRow {
        id: string;
        user_id_1: string;
        status: string;
        created_at: string;
        user_1: UserData | UserData[];
      }
      const formattedIncoming: FriendRequestIncoming[] = incoming.map((row: any) => ({
        ...row,
        user_1: incomingUserMap[row.user_id_1] || { first_name: 'Unknown', last_name: 'User' }
      }));
      setSentRequests(formattedSent);
      setIncomingRequests(formattedIncoming);
      setFriendRequestCount(formattedIncoming.length);
    } catch (error: any) {
      console.error("Error fetching friend requests:", error);
      setNotification({
        message:
          "Error fetching friend requests: " +
          (error instanceof Error ? error.message : JSON.stringify(error)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIncomingRequestsCount = async (): Promise<void> => {
    try {
      if (!user) return;
      // Get incoming friend requests count using crudClient
      const data = await select("friends", {
        where: { user_id_2: user.id, status: "pending" },
        select: "id"
      });
      setFriendRequestCount(data ? data.length : 0);
    } catch (error: any) {
      console.error("Error fetching incoming friend requests count:", error);
    }
  };

  const fetchFriends = async (): Promise<void> => {
    try {
      if (!user) return;

      type FriendRow = {
        id: string;
        friend: {
          id: string;
          first_name: string;
          last_name: string;
          profile_image: string | null;
          created_at: string;
        };
      };

      // Fetch friends where the current user is user_id_1 using crudClient
      const sentFriends = await select("friends", {
        where: { user_id_1: user.id, status: "accepted" },
        select: "id, user_id_2"
      });

      // Fetch friends where the current user is user_id_2 using crudClient
      const receivedFriends = await select("friends", {
        where: { user_id_2: user.id, status: "accepted" },
        select: "id, user_id_1"
      });

      // Get all friend user IDs
      const friendUserIds = [
        ...sentFriends.map((f: any) => f.user_id_2),
        ...receivedFriends.map((f: any) => f.user_id_1)
      ];

      // Fetch user data for all friends
      const friendUsers = friendUserIds.length > 0 ? await select("users", {
        where: { id: friendUserIds },
        select: "id, first_name, last_name, profile_image, created_at"
      }) : [];

      // Create user lookup map
      const userMap = friendUsers.reduce((acc: any, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});

      // Format sent friends
      const formattedSentFriends = sentFriends.map((f: any) => ({
        id: f.id,
        friend: userMap[f.user_id_2] || { first_name: 'Unknown', last_name: 'User' }
      }));

      // Format received friends
      const formattedReceivedFriends = receivedFriends.map((f: any) => ({
        id: f.id,
        friend: userMap[f.user_id_1] || { first_name: 'Unknown', last_name: 'User' }
      }));

      // Combine all friends
      const formattedFriends: Friend[] = [
        ...formattedSentFriends,
        ...formattedReceivedFriends
      ].map((row) => ({
        id: row.id,
        friend: {
          id: row.friend.id,
          first_name: row.friend.first_name,
          last_name: row.friend.last_name,
          created_at: row.friend.created_at,
        },
      }));

      setFriends(formattedFriends);
    } catch (error) {
      console.error("Error in fetchFriends:", error);
    }
  };

  // Initialize friends when user is available
  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const handleLikeIntention = async (intentionId: string, isLiked: boolean): Promise<void> => {
    try {
      Vibration.vibrate(50);
      const scaleAnim = getLikeScaleAnimation(intentionId);
      const opacityAnim = getLikeOpacityAnimation(intentionId);
      if (!isLiked) {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1.5,
              friction: 3,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 3,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      } else {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
      if (!user) throw new Error("Not authenticated");
      if (isLiked) {
        // Delete the like using crudClient
        await deleteRecord("likes", {
          likeable_id: intentionId,
          likeable_type: "intentions",
          user_id: user.id
        });
      } else {
        // Check if intention exists first, then create like
        const intentionData = await select("intentions", {
          where: { id: intentionId },
          limit: 1
        });
        if (!intentionData || intentionData.length === 0) throw new Error("Intention not found");
        // Create the like using crudClient
        await insert("likes", {
          user_id: user.id,
          likeable_id: intentionId,
          likeable_type: "intentions",
        });
      }
      setIntentions(
        intentions.map((intention) =>
          intention.id === intentionId
            ? {
                ...intention,
                is_liked: !isLiked,
                likes_count: isLiked
                  ? (intention.likes_count || 1) - 1
                  : (intention.likes_count || 0) + 1,
              }
            : intention,
        ),
      );
    } catch (error: any) {
      console.error("Error toggling like:", error);
      setNotification({
        message: `Error ${isLiked ? "unliking" : "liking"} intention: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleAddComment = async (intentionId: string): Promise<void> => {
    if (!newComment.trim()) {
      setNotification({ message: "Please enter a comment", type: "error" });
      return;
    }
    try {
      if (!user) throw new Error("Not authenticated");
      // Create comment using crudClient
      const data = await insert("comments", {
        user_id: user.id,
        commentable_id: intentionId,
        commentable_type: "intentions",
        content: newComment,
      });
      
      // Add user info to the comment for display
      const commentWithUser = {
        ...data,
        user: {
          id: user.id,
          first_name: user.first_name || 'User',
          last_name: user.last_name || '',
          email: user.email || ''
        }
      };
      setComments([...comments, commentWithUser]);
      setIntentions(
        intentions.map((intention) =>
          intention.id === intentionId
            ? {
                ...intention,
                comments_count: (intention.comments_count || 0) + 1,
              }
            : intention,
        ),
      );
      setNewComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      setNotification({
        message: `Error adding comment: ${error instanceof Error ? error.message : String(error)}`,
        type: "error",
      });
    }
  };

  const handleToggleComments = (intentionId: string): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedCommentId === intentionId) setExpandedCommentId(null);
    else setExpandedCommentId(intentionId);
  };

  const handleCreateIntention = async (): Promise<void> => {
    if (!newIntention.title.trim() || !newIntention.description.trim()) {
      setNotification({
        message: "Please fill in both the title and description.",
        type: "error",
      });
      return;
    }
    try {
      if (!user) throw new Error("Not authenticated");
      // Create intention using crudClient
      await insert("intentions", {
        user_id: user.id,
        title: newIntention.title,
        description: newIntention.description,
        type: newIntention.type,
        visibility: newIntention.visibility,
        selected_groups:
          newIntention.visibility === "Certain Groups" ? newIntention.selectedGroups : [],
        selected_friends:
          newIntention.visibility === "Certain Friends" ? newIntention.selectedFriends : [],
      });
      setShowIntentionModal(false);
      setNewIntention({
        title: "",
        description: "",
        type: "prayer",
        visibility: "Friends",
        selectedGroups: [],
        selectedFriends: [],
      });
      setNotification({
        message: "Intention created successfully!",
        type: "success",
      });
      fetchIntentions();
    } catch (error: any) {
      console.error("Error creating intention:", error);
      setNotification({
        message: `Error creating intention: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleEditIntention = (intention: Intention): void => {
    setEditingIntention(intention);
    setShowEditModal(true);
  };

  const handleUpdateIntention = async (): Promise<void> => {
    if (
      !editingIntention ||
      !editingIntention.title.trim() ||
      !editingIntention.description.trim()
    ) {
      setNotification({
        message: "Please fill in both the title and description.",
        type: "error",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("intentions")
        .update({
          title: editingIntention.title,
          description: editingIntention.description,
          type: editingIntention.type,
          visibility: editingIntention.visibility,
          selected_groups:
            editingIntention.visibility === "Certain Groups"
              ? editingIntention.selectedGroups || []
              : [],
          selected_friends:
            editingIntention.visibility === "Certain Friends"
              ? editingIntention.selectedFriends || []
              : [],
        })
        .eq("id", editingIntention.id);
      if (error) throw error;
      setShowEditModal(false);
      setEditingIntention(null);
      setNotification({
        message: "Intention updated successfully!",
        type: "success",
      });
      fetchIntentions();
    } catch (error: any) {
      console.error("Error updating intention:", error);
      setNotification({
        message: `Error updating intention: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleDeleteClick = (intentionId: string): void => {
    setDeleteModal({ isOpen: true, intentionId });
  };

  const handleDeleteIntention = async (): Promise<void> => {
    const { intentionId } = deleteModal;
    if (!intentionId) {
      setDeleteModal({ isOpen: false, intentionId: null });
      return;
    }
    try {
      // Delete intention using crudClient
      await deleteRecord("intentions", { id: intentionId });
      setNotification({
        message: "Intention deleted successfully!",
        type: "success",
      });
      setDeleteModal({ isOpen: false, intentionId: null });
      fetchIntentions();
    } catch (error: any) {
      console.error("Error deleting intention:", error);
      setNotification({
        message: `Error deleting intention: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (!searchQuery.trim()) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*, created_at")
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .order("first_name", { ascending: true })
        .limit(20);
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setUsers([]);
      setNotification({
        message:
          "Error fetching users: " + (error instanceof Error ? error.message : String(error)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async (friendId: string): Promise<void> => {
    try {
      if (!user) throw new Error("Not authenticated");
      // Send friend request using crudClient
      await insert("friends", { 
        user_id_1: user.id, 
        user_id_2: friendId, 
        status: "pending" 
      });
      setNotification({ message: "Friend request sent!", type: "success" });
      fetchIncomingRequestsCount();
    } catch (error: any) {
      console.error("Error adding friend:", error);
      setNotification({
        message: `Error adding friend: ${error instanceof Error ? error.message : String(error)}`,
        type: "error",
      });
    }
  };

  const handleAcceptRequest = async (requestId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", requestId);
      if (error) throw error;
      setNotification({ message: "Friend request accepted!", type: "success" });
      fetchFriendRequests();
      fetchIncomingRequestsCount();
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      setNotification({
        message: `Error accepting request: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleDeclineRequest = async (requestId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from("friends")
        .update({ status: "declined" })
        .eq("id", requestId);
      if (error) throw error;
      setNotification({ message: "Friend request declined.", type: "success" });
      fetchFriendRequests();
      fetchIncomingRequestsCount();
    } catch (error: any) {
      console.error("Error declining friend request:", error);
      setNotification({
        message: `Error declining request: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleCancelRequest = async (requestId: string): Promise<void> => {
    try {
      // Cancel friend request using crudClient
      await deleteRecord("friends", { id: requestId });
      setNotification({ message: "Friend request canceled.", type: "success" });
      fetchFriendRequests();
      fetchIncomingRequestsCount();
    } catch (error: any) {
      console.error("Error canceling friend request:", error);
      setNotification({
        message: `Error canceling request: ${
          error instanceof Error ? error.message : String(error)
        }`,
        type: "error",
      });
    }
  };

  const handleRemoveFriend = async (friendRelationshipId: string): Promise<void> => {
    try {
      // Remove friend using crudClient
      await deleteRecord("friends", { id: friendRelationshipId });
      setNotification({
        message: "Friend removed successfully!",
        type: "success",
      });
      fetchFriends();
    } catch (error: any) {
      console.error("Error removing friend:", error);
      setNotification({
        message: `Error removing friend: ${error instanceof Error ? error.message : String(error)}`,
        type: "error",
      });
    }
  };

  const toggleFabMenu = (): void => {
    Animated.spring(fabMenuAnimation, {
      toValue: showFabMenu ? 0 : 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
    setShowFabMenu(!showFabMenu);
  };

  const handleFabOption = (option: string): void => {
    Animated.timing(fabMenuAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowFabMenu(false);
    });
    switch (option) {
      case "intention":
        setShowIntentionModal(true);
        break;
      case "friends":
        setShowFriendsSearch(true);
        setSearchQuery("");
        setUsers([]);
        setFriendTab("search");
        break;
      case "lent":
        router.push("/Lent2025");
        break;
      case "groups":
        router.push("/groups");
        break;
    }
  };

  const handleSelectFilter = (filter: "all" | "mine" | "friends" | "groups"): void => {
    setIntentionsFilter(filter);
    setShowFilterDropdown(false);
  };

  const onHeaderLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeaderHeight(height);
  };

  const renderIntentionCard = ({ item }: { item: Intention }): JSX.Element => {
    const scaleAnim = getLikeScaleAnimation(item.id);
    const opacityAnim = getLikeOpacityAnimation(item.id);
    const isCommentsExpanded = expandedCommentId === item.id;
    return (
      <IntentionCard
        item={item}
        currentUserId={currentUserId}
        onLike={handleLikeIntention}
        onComment={handleToggleComments}
        onEdit={handleEditIntention}
        onDelete={handleDeleteClick}
        likeScaleAnim={scaleAnim}
        likeOpacityAnim={opacityAnim}
        isCommentsExpanded={isCommentsExpanded}
        comments={comments}
        newComment={newComment}
        setNewComment={setNewComment}
        handleAddComment={handleAddComment}
        commentsLoading={commentsLoading}
      />
    );
  };

  const renderUserCard = ({ item }: { item: UserData }): JSX.Element => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Feather name="user" size={28} color="#fbbf24" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.userSubtitle}>
            Member since {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity style={styles.userAction}>
          <Feather name="message-circle" size={18} color="#fbbf24" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.userAction} onPress={() => handleAddFriend(item.id)}>
          <Feather name="heart" size={18} color="#fbbf24" />
          <Text style={styles.actionText}>Add Friend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequestCard = ({ item }: { item: FriendRequestSent }): JSX.Element => (
    <View style={styles.friendCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Feather name="user" size={28} color="#fbbf24" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.user_2.first_name} {item.user_2.last_name}
          </Text>
          <Text style={styles.userSubtitle}>
            Requested on {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.friendActions}>
        <Text style={styles.statusText}>Status: {item.status}</Text>
        <TouchableOpacity
          style={styles.requestCancelButton}
          onPress={() => handleCancelRequest(item.id)}
        >
          <Text style={styles.requestCancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderIncomingRequestCard = ({ item }: { item: FriendRequestIncoming }): JSX.Element => (
    <View style={styles.friendCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Feather name="user" size={28} color="#fbbf24" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.user_1.first_name} {item.user_1.last_name}
          </Text>
          <Text style={styles.userSubtitle}>
            Requested on {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.friendRequestActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequest(item.id)}>
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(item.id)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriendCard = ({ item }: { item: Friend }): JSX.Element => (
    <View style={styles.friendCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Feather name="user" size={28} color="#fbbf24" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.friend.first_name} {item.friend.last_name}
          </Text>
          <Text style={styles.userSubtitle}>
            {item.created_at
              ? `Friends since ${new Date(item.created_at).toLocaleDateString()}`
              : "Friends"}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFriend(item.id)}>
        <Feather name="trash-2" size={18} color="#f59e0b" />
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  // Show loading screen while authenticating or if user is not authenticated
  if (authLoading || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text style={styles.loadingText}>
            {authLoading ? "Loading..." : "Please sign in to continue"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={backgroundImageRequire} style={styles.backgroundImage}>
        <View style={[styles.backgroundOverlay, { opacity: 0.7 }]} />
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.header} ref={headerRef} onLayout={onHeaderLayout}>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&h=400&fit=crop' }}
              style={styles.headerBackground}
              imageStyle={styles.headerBackgroundImage}
            >
              <LinearGradient
                colors={['rgba(28, 25, 23, 0.4)', 'rgba(28, 25, 23, 0.7)', 'rgba(28, 25, 23, 0.9)']}
                style={styles.headerGradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              <Animated.View
                style={[
                  styles.animatedOverlay,
                  {
                    opacity: scrollY.interpolate({
                      inputRange: [0, 100],
                      outputRange: [0.3, 0],
                      extrapolate: 'clamp',
                    }),
                    transform: [{
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.02],
                      }),
                    }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(251, 191, 36, 0.2)', 'transparent', 'rgba(251, 191, 36, 0.1)']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  styles.pulseOverlay,
                  {
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.1, 0],
                    }),
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(251, 191, 36, 0.3)', 'rgba(245, 158, 11, 0.2)', 'transparent']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>
              <View style={styles.headerContent}>
                <Animated.Text 
                  style={[
                    styles.welcomeText,
                    {
                      opacity: scrollY.interpolate({
                        inputRange: [0, 50],
                        outputRange: [1, 0.3],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                >
                  Welcome to
                </Animated.Text>
                <TouchableOpacity
                  style={styles.headerTitleContainer}
                  onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
                  <View style={styles.headerFilterIndicator}>
                    <Feather
                      name={showFilterDropdown ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#fbbf24"
                    />
                  </View>
                </TouchableOpacity>
                <Animated.Text 
                  style={[
                    styles.headerSubtitle,
                    {
                      opacity: scrollY.interpolate({
                        inputRange: [0, 50],
                        outputRange: [1, 0.3],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                >
                  Share your faith journey with others
                </Animated.Text>
              </View>
            </ImageBackground>
          </View>
          {notification && (
            <View
              style={[
                styles.notification,
                notification.type === "error" ? styles.errorNotification : styles.successNotification,
              ]}
            >
              <Text style={styles.notificationText}>{notification.message}</Text>
            </View>
          )}
        {/* Always render dropdown with pointerEvents controlled */}
        <Animated.View
          pointerEvents={showFilterDropdown ? "auto" : "none"}
          style={[
            styles.filterDropdown,
            {
              top: headerHeight + 45,
              opacity: filterDropdownAnim,
              transform: [
                {
                  translateY: filterDropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.filterOption, intentionsFilter === "all" && styles.activeFilterOption]}
            onPress={() => handleSelectFilter("all")}
          >
            <Text
              style={[
                styles.filterOptionText,
                intentionsFilter === "all" && styles.activeFilterOptionText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterOption,
              intentionsFilter === "friends" && styles.activeFilterOption,
            ]}
            onPress={() => handleSelectFilter("friends")}
          >
            <Text
              style={[
                styles.filterOptionText,
                intentionsFilter === "friends" && styles.activeFilterOptionText,
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterOption,
              intentionsFilter === "groups" && styles.activeFilterOption,
            ]}
            onPress={() => handleSelectFilter("groups")}
          >
            <Text
              style={[
                styles.filterOptionText,
                intentionsFilter === "groups" && styles.activeFilterOptionText,
              ]}
            >
              Groups
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterOption, intentionsFilter === "mine" && styles.activeFilterOption]}
            onPress={() => handleSelectFilter("mine")}
          >
            <Text
              style={[
                styles.filterOptionText,
                intentionsFilter === "mine" && styles.activeFilterOptionText,
              ]}
            >
              My Posts
            </Text>
          </TouchableOpacity>
        </Animated.View>
        {!showFriendsSearch && (
          <Animated.FlatList
            data={intentions}
            renderItem={renderIntentionCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.intentionList}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchIntentions} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {intentionsFilter === "mine"
                    ? "No intentions yet."
                    : intentionsFilter === "friends"
                      ? "No friend intentions."
                      : intentionsFilter === "groups"
                        ? "No group intentions."
                        : "No posts to show."}
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowIntentionModal(true)}
                >
                  <Text style={styles.emptyStateButtonText}>Create New Intention</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
        {showFriendsSearch && (
          <View style={styles.friendsSection}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowFriendsSearch(false)}>
              <Feather name="arrow-left" size={24} color="#fbbf24" />
              <Text style={styles.backButtonText}>Back to Feed</Text>
            </TouchableOpacity>
            <View style={styles.friendsTabs}>
              <TouchableOpacity
                style={[styles.friendTab, friendTab === "search" && styles.activeFriendTab]}
                onPress={() => setFriendTab("search")}
              >
                <Text
                  style={[
                    styles.friendTabText,
                    friendTab === "search" && styles.activeFriendTabText,
                  ]}
                >
                  Search
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.friendTab, friendTab === "requests" && styles.activeFriendTab]}
                onPress={() => setFriendTab("requests")}
              >
                <Text
                  style={[
                    styles.friendTabText,
                    friendTab === "requests" && styles.activeFriendTabText,
                  ]}
                >
                  Requests
                </Text>
                {friendRequestCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{friendRequestCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.friendTab, friendTab === "list" && styles.activeFriendTab]}
                onPress={() => setFriendTab("list")}
              >
                <Text
                  style={[styles.friendTabText, friendTab === "list" && styles.activeFriendTabText]}
                >
                  Friends
                </Text>
              </TouchableOpacity>
            </View>
            {friendTab === "search" && (
              <>
                <View style={styles.searchContainer}>
                  <Feather name="search" size={22} color="#fbbf24" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search friends..."
                    placeholderTextColor="rgba(254, 243, 199, 0.4)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                  />
                </View>
                <FlatList
                  data={users}
                  renderItem={renderUserCard}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.userList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Search for friends</Text>
                    </View>
                  }
                />
              </>
            )}
            {friendTab === "requests" && (
              <>
                {sentRequests.length === 0 && incomingRequests.length === 0 ? (
                  <Text style={styles.noResultsText}>No friend requests.</Text>
                ) : (
                  <>
                    {sentRequests.length > 0 && (
                      <>
                        <Text style={styles.requestSubtitle}>Sent Requests</Text>
                        <FlatList
                          data={sentRequests}
                          renderItem={renderSentRequestCard}
                          keyExtractor={(item) => item.id}
                          contentContainerStyle={styles.requestList}
                          showsVerticalScrollIndicator={false}
                        />
                      </>
                    )}
                    {incomingRequests.length > 0 && (
                      <>
                        <Text style={styles.requestSubtitle}>Incoming Requests</Text>
                        <FlatList
                          data={incomingRequests}
                          renderItem={renderIncomingRequestCard}
                          keyExtractor={(item) => item.id}
                          contentContainerStyle={styles.requestList}
                          showsVerticalScrollIndicator={false}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {friendTab === "list" && (
              <>
                {friends.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No friends yet.</Text>
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => setFriendTab("search")}
                    >
                      <Text style={styles.emptyStateButtonText}>Find Friends</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={friends}
                    renderItem={renderFriendCard}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.friendsList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </>
            )}
          </View>
        )}
        <TouchableOpacity style={styles.fab} onPress={toggleFabMenu}>
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <Feather name="plus" size={26} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
        {showFabMenu && (
          <Animated.View
            style={[
              styles.fabMenu,
              {
                opacity: fabMenuAnimation,
                transform: [
                  {
                    translateY: fabMenuAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => handleFabOption("intention")}
            >
              <Feather name="edit" size={22} color="#fbbf24" />
              <Text style={styles.fabMenuItemText}>Add Intention</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => handleFabOption("friends")}>
              <Feather name="users" size={22} color="#fbbf24" />
              <Text style={styles.fabMenuItemText}>
                Friends{" "}
                {friendRequestCount > 0 && (
                  <Text style={styles.fabMenuBadge}> • {friendRequestCount}</Text>
                )}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => handleFabOption("lent")}>
              <Feather name="book-open" size={22} color="#fbbf24" />
              <Text style={styles.fabMenuItemText}>Lent 2025</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => handleFabOption("groups")}>
              <Feather name="users" size={22} color="#fbbf24" />
              <Text style={styles.fabMenuItemText}>Groups</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        <Modal
          visible={showIntentionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowIntentionModal(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>New Intention</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Type</Text>
                    <View style={styles.pickerContainer}>
                      {[
                        "prayer",
                        "resolution",
                        "goal",
                        "spiritual",
                        "family",
                        "health",
                        "work",
                        "friends",
                        "world",
                        "personal",
                        "other",
                      ].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeOption,
                            newIntention.type === type && styles.selectedTypeOption,
                          ]}
                          onPress={() =>
                            setNewIntention({
                              ...newIntention,
                              type: type as IntentionType,
                            })
                          }
                        >
                          <Text style={styles.typeOptionText}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Visibility</Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowVisibilityDropdownNew(!showVisibilityDropdownNew)}
                    >
                      <View style={styles.dropdownContent}>
                        {
                          visibilityOptions.find(
                            (option) => option.label === newIntention.visibility,
                          )?.icon
                        }
                        <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                          {newIntention.visibility}
                        </Text>
                      </View>
                      <Feather
                        name={showVisibilityDropdownNew ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#fbbf24"
                      />
                    </TouchableOpacity>
                    {showVisibilityDropdownNew && (
                      <View style={styles.dropdownOptions}>
                        {visibilityOptions.map((option) => (
                          <TouchableOpacity
                            key={option.label}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setNewIntention({
                                ...newIntention,
                                visibility: option.label as
                                  | "Friends"
                                  | "Certain Groups"
                                  | "Just Me"
                                  | "Friends & Groups"
                                  | "Certain Friends",
                                selectedGroups:
                                  option.label === "Certain Groups"
                                    ? newIntention.selectedGroups
                                    : [],
                                selectedFriends:
                                  option.label === "Certain Friends"
                                    ? newIntention.selectedFriends
                                    : [],
                              });
                              setShowVisibilityDropdownNew(false);
                            }}
                          >
                            <View style={styles.dropdownOptionContent}>
                              {option.icon}
                              <Text style={styles.dropdownOptionText}>{option.label}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {newIntention.visibility === "Certain Groups" && (
                      <View style={styles.groupSelectorContainer}>
                        <Text style={styles.groupSelectorLabel}>Select Groups:</Text>
                        <View style={styles.groupSelectorList}>
                          {userGroups.map((group) => (
                            <TouchableOpacity
                              key={group.id}
                              style={[
                                styles.groupOption,
                                newIntention.selectedGroups &&
                                newIntention.selectedGroups.includes(group.id)
                                  ? styles.groupOptionSelected
                                  : null,
                              ]}
                              onPress={() => toggleNewGroupSelection(group.id)}
                            >
                              <Text style={styles.groupOptionText}>{group.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    {newIntention.visibility === "Certain Friends" && (
                      <View style={styles.friendSelectorContainer}>
                        <Text style={styles.friendSelectorLabel}>
                          Select Friends ({friends.length})
                        </Text>
                        <ScrollView
                          style={styles.friendSelectorList}
                          contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}
                          showsVerticalScrollIndicator={true}
                        >
                          {friends.length === 0 ? (
                            <Text
                              style={[
                                styles.friendOptionText,
                                { textAlign: "center", marginTop: 10 },
                              ]}
                            >
                              No friends found. Add friends to share intentions with them.
                            </Text>
                          ) : (
                            friends.map((friend) => (
                              <TouchableOpacity
                                key={friend.id}
                                style={[
                                  styles.friendOption,
                                  newIntention.selectedFriends.includes(friend.friend.id)
                                    ? styles.friendOptionSelected
                                    : null,
                                ]}
                                onPress={() => toggleNewFriendSelection(friend.friend.id)}
                              >
                                <Text style={styles.friendOptionText}>
                                  {friend.friend.first_name} {friend.friend.last_name}
                                </Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Title</Text>
                    <TextInput
                      style={styles.formInput}
                      value={newIntention.title}
                      onChangeText={(text) => setNewIntention({ ...newIntention, title: text })}
                      placeholder="Enter title..."
                      placeholderTextColor="rgba(254, 243, 199, 0.4)"
                      inputAccessoryViewID="accessoryViewID"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Description</Text>
                    <View style={styles.textInputContainer}>
                      <TextInput
                        style={[
                          styles.formTextarea,
                          createDescriptionFocused && styles.formTextareaFocused,
                        ]}
                        value={newIntention.description}
                        onChangeText={(text) =>
                          setNewIntention({ ...newIntention, description: text })
                        }
                        placeholder="Enter description..."
                        placeholderTextColor="rgba(254, 243, 199, 0.4)"
                        multiline={true}
                        numberOfLines={4}
                        textAlignVertical="top"
                        inputAccessoryViewID="accessoryViewID"
                        onFocus={() => setCreateDescriptionFocused(true)}
                        onBlur={() => setCreateDescriptionFocused(false)}
                      />
                      {createDescriptionFocused && (
                        <TouchableOpacity
                          style={styles.closeButton}
                          onPress={() => {
                            Keyboard.dismiss();
                            setCreateDescriptionFocused(false);
                          }}
                        >
                          <Feather name="check" size={20} color="#fbbf24" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <InputAccessoryView nativeID="accessoryViewID">
                    <View style={styles.accessory}>
                      <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                        <Text style={styles.accessoryText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </InputAccessoryView>
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setShowIntentionModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.createButton} onPress={handleCreateIntention}>
                      <Text style={styles.createButtonText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <Modal
          visible={showEditModal && editingIntention !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowEditModal(false);
            setEditingIntention(null);
          }}
        >
          {editingIntention && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Intention</Text>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Type</Text>
                    <View style={styles.pickerContainer}>
                      {[
                        "prayer",
                        "resolution",
                        "goal",
                        "spiritual",
                        "family",
                        "health",
                        "work",
                        "friends",
                        "world",
                        "personal",
                        "other",
                      ].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeOption,
                            editingIntention.type === type && styles.selectedTypeOption,
                          ]}
                          onPress={() =>
                            setEditingIntention({
                              ...editingIntention,
                              type: type as IntentionType,
                            })
                          }
                        >
                          <Text style={styles.typeOptionText}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Visibility</Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowVisibilityDropdownEdit(!showVisibilityDropdownEdit)}
                    >
                      <View style={styles.dropdownContent}>
                        {
                          visibilityOptions.find(
                            (option) => option.label === editingIntention.visibility,
                          )?.icon
                        }
                        <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                          {editingIntention.visibility}
                        </Text>
                      </View>
                      <Feather
                        name={showVisibilityDropdownEdit ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#fbbf24"
                      />
                    </TouchableOpacity>
                    {showVisibilityDropdownEdit && (
                      <View style={styles.dropdownOptions}>
                        {visibilityOptions.map((option) => (
                          <TouchableOpacity
                            key={option.label}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setEditingIntention({
                                ...editingIntention,
                                visibility: option.label as
                                  | "Friends"
                                  | "Certain Groups"
                                  | "Just Me"
                                  | "Friends & Groups"
                                  | "Certain Friends",
                                selectedGroups:
                                  option.label === "Certain Groups"
                                    ? editingIntention.selectedGroups || []
                                    : [],
                                selectedFriends:
                                  option.label === "Certain Friends"
                                    ? editingIntention.selectedFriends || []
                                    : [],
                              });
                              setShowVisibilityDropdownEdit(false);
                            }}
                          >
                            <View style={styles.dropdownOptionContent}>
                              {option.icon}
                              <Text style={styles.dropdownOptionText}>{option.label}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {editingIntention.visibility === "Certain Groups" && (
                      <View style={styles.groupSelectorContainer}>
                        <Text style={styles.groupSelectorLabel}>Select Groups:</Text>
                        <View style={styles.groupSelectorList}>
                          {userGroups.map((group) => (
                            <TouchableOpacity
                              key={group.id}
                              style={[
                                styles.groupOption,
                                editingIntention.selectedGroups &&
                                editingIntention.selectedGroups.includes(group.id)
                                  ? styles.groupOptionSelected
                                  : null,
                              ]}
                              onPress={() => toggleEditGroupSelection(group.id)}
                            >
                              <Text style={styles.groupOptionText}>{group.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    {editingIntention.visibility === "Certain Friends" && (
                      <View style={styles.friendSelectorContainer}>
                        <Text style={styles.friendSelectorLabel}>
                          Select Friends ({friends.length})
                        </Text>
                        <ScrollView
                          style={styles.friendSelectorList}
                          contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}
                          showsVerticalScrollIndicator={true}
                        >
                          {friends.length === 0 ? (
                            <Text
                              style={[
                                styles.friendOptionText,
                                { textAlign: "center", marginTop: 10 },
                              ]}
                            >
                              No friends found. Add friends to share intentions with them.
                            </Text>
                          ) : (
                            friends.map((friend) => (
                              <TouchableOpacity
                                key={friend.id}
                                style={[
                                  styles.friendOption,
                                  editingIntention.selectedFriends?.includes(friend.friend.id)
                                    ? styles.friendOptionSelected
                                    : null,
                                ]}
                                onPress={() => toggleEditFriendSelection(friend.friend.id)}
                              >
                                <Text style={styles.friendOptionText}>
                                  {friend.friend.first_name} {friend.friend.last_name}
                                </Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Title</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editingIntention.title}
                      onChangeText={(text) =>
                        setEditingIntention({
                          ...editingIntention,
                          title: text,
                        })
                      }
                      placeholder="Enter title..."
                      placeholderTextColor="rgba(254, 243, 199, 0.4)"
                      inputAccessoryViewID="accessoryViewID"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Description</Text>
                    <TextInput
                      style={[
                        styles.formTextarea,
                        editDescriptionFocused && styles.formTextareaFocused,
                      ]}
                      value={editingIntention.description}
                      onChangeText={(text) =>
                        setEditingIntention({
                          ...editingIntention,
                          description: text,
                        })
                      }
                      placeholder="Enter description..."
                      placeholderTextColor="rgba(254, 243, 199, 0.4)"
                      multiline={true}
                      numberOfLines={4}
                      textAlignVertical="top"
                      inputAccessoryViewID="accessoryViewID"
                      onFocus={() => setEditDescriptionFocused(true)}
                      onBlur={() => setEditDescriptionFocused(false)}
                    />
                  </View>
                  <InputAccessoryView nativeID="accessoryViewID">
                    <View style={styles.accessory}>
                      <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                        <Text style={styles.accessoryText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </InputAccessoryView>
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        if (editingIntention) {
                          setDeleteModal({
                            isOpen: true,
                            intentionId: editingIntention.id,
                          });
                          setShowEditModal(false);
                        }
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowEditModal(false);
                        setEditingIntention(null);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.createButton} onPress={handleUpdateIntention}>
                      <Text style={styles.createButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}
        </Modal>
        <Modal
          visible={deleteModal.isOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDeleteModal({ isOpen: false, intentionId: null })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete Intention</Text>
              <Text style={styles.modalText}>Are you sure you want to delete this intention?</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setDeleteModal({ isOpen: false, intentionId: null })}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteIntention}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        )}
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setShowIntentionModal(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#fbbf24', '#f59e0b']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Feather name="plus" size={28} color="#1c1917" />
        </TouchableOpacity>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  // Advanced Background & Container
  backgroundImage: { 
    flex: 1, 
    width: "100%", 
    height: "100%" 
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28, 25, 23, 0.92)",
    backgroundBlendMode: 'multiply',
  },
  container: { 
    flex: 1, 
    position: 'relative',
    backgroundColor: 'transparent',
  },
  
  // Premium Gradient Overlay
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
    zIndex: -1,
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1917',
  },
  loadingText: {
    color: '#fbbf24',
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  // Notifications
  notification: {
    position: "absolute",
    top: 180,
    left: 20,
    right: 20,
    padding: 18,
    borderRadius: 20,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
    borderWidth: 1,
  },
  errorNotification: {
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderColor: "rgba(248, 113, 113, 0.25)",
    backdropFilter: 'blur(20px)',
  },
  successNotification: {
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.25)",
    backdropFilter: 'blur(20px)',
  },
  notificationText: {
    color: "#fef3c7",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  
  // Premium Header Design
  header: {
    borderBottomWidth: 0,
    zIndex: 10,
    position: 'relative',
    overflow: 'hidden',
    height: 220,
    marginTop: -44, // Pull up into safe area on iOS
  },
  headerBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerBackgroundImage: {
    opacity: 0.9,
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60, // Account for status bar
    paddingBottom: 24,
    justifyContent: 'center',
  },
  animatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  pulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(254, 243, 199, 0.8)',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(254, 243, 199, 0.6)',
    fontWeight: '400',
    letterSpacing: 0.3,
    marginTop: 8,
  },
  headerTitleContainer: { 
    flexDirection: "row", 
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  headerTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fef3c7",
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    position: 'relative',
  },
  headerTitleGlow: {
    position: 'absolute',
    fontSize: 36,
    fontWeight: "800",
    color: 'rgba(212, 165, 116, 0.2)',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(212, 165, 116, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  headerFilterIndicator: { 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "rgba(212, 165, 116, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 165, 116, 0.3)",
  },
  
  // Modern Filter Dropdown
  filterDropdown: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "rgba(15, 17, 28, 0.98)",
    borderRadius: 20,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 165, 116, 0.2)",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
    backdropFilter: 'blur(20px)',
  },
  filterOption: { 
    paddingVertical: 14, 
    paddingHorizontal: 18, 
    borderRadius: 16,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterOption: { 
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
    transform: [{ scale: 1.02 }],
  },
  filterOptionText: { 
    color: "#E5E7EB", 
    fontSize: 17, 
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  activeFilterOptionText: { 
    color: "#D4A574", 
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  
  // Premium Card Design
  intentionList: { 
    padding: 20, 
    paddingBottom: 140,
    gap: 20,
  },
  intentionCard: {
    backgroundColor: "rgba(41, 37, 36, 0.65)",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.15)",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(251, 191, 36, 0.3)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
    borderWidth: 1.5,
    borderColor: "rgba(212, 165, 116, 0.2)",
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    borderRadius: 28,
  },
  cardGlowEffect: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    height: 60,
    backgroundColor: 'rgba(212, 165, 116, 0.05)',
    borderRadius: 50,
    transform: [{ scaleX: 1.2 }],
  },
  // Card Header Styling
  intentionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  intentionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 2,
    borderColor: "rgba(251, 191, 36, 0.3)",
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatarGlow: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
    }),
  },
  intentionHeaderText: { 
    flex: 1,
    gap: 4,
  },
  intentionTitle: { 
    color: "#fef3c7", 
    fontSize: 19, 
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 2,
  },
  intentionSubtitle: {
    color: "rgba(212, 165, 116, 0.8)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  
  // Content Styling
  intentionDescription: {
    color: "rgba(254, 243, 199, 0.75)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 0,
    letterSpacing: 0.2,
  },
  
  // Premium Action Buttons
  intentionActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(251, 191, 36, 0.1)",
    gap: 6,
    flexWrap: "nowrap",
  },
  intentionAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flex: 0,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  intentionActionActive: { 
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderColor: "rgba(251, 191, 36, 0.4)",
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionButtonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(212, 165, 116, 0.05)',
    borderRadius: 25,
  },
  
  // Like Button Enhancement
  likeButtonContainer: {
    position: "relative",
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "rgba(212, 165, 116, 0.1)",
  },
  likeRipple: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  actionText: {
    color: "rgba(254, 243, 199, 0.75)",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
    letterSpacing: 0,
  },
  actionTextActive: { 
    color: "#fbbf24",
    fontWeight: "700",
  },
  
  // Modern Tag Design
  groupTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 165, 116, 0.15)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginTop: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212, 165, 116, 0.3)",
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  groupTagText: {
    color: "#D4A574",
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  
  // Comments Section
  commentsSection: { 
    marginTop: 16,
  },
  commentsDivider: {
    height: 1,
    backgroundColor: "rgba(212, 165, 116, 0.15)",
    marginVertical: 16,
  },
  commentsList: { 
    paddingVertical: 8,
    gap: 12,
  },
  commentsLoading: { 
    marginVertical: 20,
    alignItems: 'center',
  },
  // Modern Comment Styling
  commentItem: {
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.12)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(212, 165, 116, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "rgba(212, 165, 116, 0.3)",
  },
  commentUser: { 
    flex: 1,
    gap: 2,
  },
  commentUserName: { 
    color: "#fef3c7", 
    fontSize: 14, 
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  commentTime: { 
    color: "rgba(251, 191, 36, 0.6)", 
    fontSize: 11,
    fontWeight: "500",
  },
  commentContent: { 
    color: "rgba(254, 243, 199, 0.85)", 
    fontSize: 14, 
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  emptyComments: { 
    padding: 24, 
    alignItems: "center" 
  },
  emptyCommentsText: { 
    color: "rgba(255, 255, 255, 0.5)", 
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  
  // Modern Input Styling
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(212, 165, 116, 0.08)",
    borderRadius: 24,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "rgba(212, 165, 116, 0.2)",
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(254, 243, 199, 0.06)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fef3c7",
    marginRight: 12,
    maxHeight: 100,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(212, 165, 116, 0.2)",
    fontWeight: "500",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.3)",
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  // Floating Action Button
  floatingActionButton: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(212, 165, 116, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.6)',
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  fabGlow: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(212, 165, 116, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 25,
      },
    }),
  },
  fabPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    top: -7.5,
    left: -7.5,
  },

  // Modern Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    backgroundColor: "rgba(251, 191, 36, 0.04)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.12)",
    marginTop: 32,
    marginHorizontal: 20,
  },
  emptyStateText: {
    color: "rgba(254, 243, 199, 0.7)",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  emptyStateButton: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.35)",
    ...Platform.select({
      ios: {
        shadowColor: "#D4A574",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyStateButtonText: { 
    color: "#FFFFFF", 
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  
  // Content Elements
  intentionContent: { 
    paddingTop: 0,
    paddingBottom: 8,
  },
  intentionAuthor: { 
    color: "#fef3c7", 
    fontSize: 16, 
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  authorTag: {
    color: "rgba(251, 191, 36, 0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  intentionMeta: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 6,
    gap: 8,
  },
  intentionTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  intentionTypeText: { color: "#FAC898", fontSize: 12, marginLeft: 4 },
  intentionTime: { color: "rgba(254, 243, 199, 0.5)", fontSize: 12 },
  friendsSection: { flex: 1, paddingHorizontal: 15 },
  friendsTabs: {
    flexDirection: "row",
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  friendTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 30,
    marginHorizontal: 5,
    position: "relative",
  },
  activeFriendTab: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  friendTabText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  activeFriendTabText: { color: "#FFFFFF", fontWeight: "600" },
  tabBadge: {
    position: "absolute",
    top: -5,
    right: 20,
    backgroundColor: "#E9967A",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    marginVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 44, color: "#FFFFFF", fontSize: 16 },
  userList: { paddingBottom: 100 },
  userCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  userHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  userInfo: { flex: 1 },
  userName: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  userSubtitle: {
    color: "rgba(250, 200, 152, 0.9)",
    fontSize: 12,
    marginTop: 2,
  },
  userActions: { flexDirection: "row", justifyContent: "space-between" },
  userAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  requestSubtitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 10,
  },
  noResultsText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    paddingVertical: 20,
    textAlign: "center",
  },
  requestList: { paddingBottom: 100 },
  friendCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  friendActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  statusText: { color: "rgba(255, 255, 255, 0.8)", fontSize: 12 },
  requestCancelButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.4)",
  },
  requestCancelButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  friendRequestActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  acceptButton: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  acceptButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  declineButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.4)",
  },
  declineButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  friendsList: { paddingBottom: 100 },
  removeButton: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  removeButtonText: {
    color: "#E9967A",
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(28, 25, 23, 0.95)",
    justifyContent: "center",
    paddingVertical: 20,
    paddingBottom: 60,
  },
  modalContent: {
    backgroundColor: "rgba(41, 37, 36, 0.98)",
    borderRadius: 24,
    padding: 24,
    margin: 20,
    maxHeight: "80%",
    borderColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(251, 191, 36, 0.3)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    color: "#fef3c7",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  modalText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  formGroup: { marginBottom: 15 },
  formLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  typeOption: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    marginBottom: 8,
  },
  selectedTypeOption: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderColor: "rgba(250, 200, 152, 0.5)",
  },
  typeOptionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  formInput: {
    backgroundColor: "rgba(57, 53, 49, 0.6)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.15)",
    color: "#fef3c7",
    padding: 14,
    fontSize: 16,
  },
  formTextarea: {
    backgroundColor: "rgba(57, 53, 49, 0.6)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.15)",
    color: "#fef3c7",
    padding: 14,
    height: 120,
    fontSize: 16,
  },
  formTextareaFocused: { height: 200 },
  // Dropdown styles for visibility
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(41, 37, 36, 0.9)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 10,
  },
  dropdownText: { color: "#FFFFFF", fontSize: 16 },
  dropdownContent: { flexDirection: "row", alignItems: "center" },
  dropdownOptions: {
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    borderRadius: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  dropdownOption: { paddingVertical: 10, paddingHorizontal: 12 },
  dropdownOptionContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  dropdownOptionText: { color: "#FFFFFF", fontSize: 16 },
  // Group selector styles
  groupSelectorContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "rgba(41, 37, 36, 0.8)",
    borderRadius: 10,
  },
  groupSelectorLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  groupSelectorList: { flexDirection: "row", flexWrap: "wrap" },
  groupOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 8,
    marginBottom: 8,
  },
  groupOptionSelected: {
    backgroundColor: "rgba(250, 200, 152, 0.4)",
    borderColor: "rgba(250, 200, 152, 0.6)",
  },
  groupOptionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  // Accessory view for iOS keyboard
  accessory: { backgroundColor: "#222", padding: 10, alignItems: "flex-end" },
  accessoryText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: "rgba(120, 113, 108, 0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(168, 162, 158, 0.2)",
  },
  cancelButtonText: { 
    color: "#d6d3d1", 
    fontSize: 15, 
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(245, 158, 11, 0.5)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  createButtonText: { 
    color: "#1c1917", 
    fontSize: 15, 
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  deleteButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.4)",
  },
  deleteButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "rgba(245, 158, 11, 0.6)",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 1000,
  },
  textInputContainer: {
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  fabMenu: {
    position: "absolute",
    right: 20,
    bottom: 170,
    borderRadius: 15,
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    padding: 10,
    paddingVertical: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: 180,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  fabMenuItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "500",
  },
  fabMenuBadge: { color: "#E9967A", fontWeight: "600" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "500",
  },
  friendSelectorContainer: {
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    backgroundColor: "rgba(41, 37, 36, 0.8)",
    borderRadius: 10,
    maxHeight: 120,
  },
  friendSelectorList: {
    flexGrow: 0,
  },
  friendOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 8,
    marginBottom: 8,
    minWidth: 120,
    alignItems: "center",
  },
  friendOptionSelected: {
    backgroundColor: "rgba(250, 200, 152, 0.4)",
    borderColor: "rgba(250, 200, 152, 0.6)",
    transform: [{ scale: 1.02 }],
  },
  friendOptionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(28, 25, 23, 0.85)",
    justifyContent: "center",
    paddingVertical: 20,
  },
  modalScrollView: {
    maxHeight: "90%",
  },
  friendSelectorLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
});
