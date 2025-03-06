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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import { Link, router } from "expo-router";

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
  visibility?: "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups";
  selectedGroups?: (number | string)[]; // For "Certain Groups" selection
}

type IntentionType = "resolution" | "prayer" | "goal";
type TabType = "all" | "resolutions" | "prayers" | "goals";

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
  created_at: string;
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
          <Feather name="user" size={18} color="#FAC898" />
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
      <View style={styles.intentionHeader}>
        <View style={styles.intentionAvatar}>
          <Feather name="user" size={18} color="#FAC898" />
        </View>
        <View style={styles.intentionHeaderText}>
          <Text style={styles.intentionAuthor}>
            {item.user.first_name} {item.user.last_name}
            {item.user_id === currentUserId && (
              <Text style={styles.authorTag}> • You</Text>
            )}
          </Text>
          <View style={styles.intentionMeta}>
            <View style={styles.intentionTypeTag}>
              {item.type === "prayer" ? (
                <FontAwesome name="hand-peace-o" size={12} color="#FAC898" />
              ) : item.type === "resolution" ? (
                <Feather name="book-open" size={12} color="#FAC898" />
              ) : (
                <Feather name="target" size={12} color="#FAC898" />
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
              <Feather name="users" size={12} color="#FAC898" />
              <Text style={styles.groupTagText}>
                Shared group(s): {item.group_info.name}
              </Text>
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
          style={[
            styles.intentionAction,
            item.is_liked && styles.intentionActionActive,
          ]}
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
                size={18}
                color={item.is_liked ? "#E9967A" : "#FAC898"}
              />
            </Animated.View>
          </View>
          <Text
            style={[
              styles.actionText,
              item.is_liked && styles.actionTextActive,
            ]}
          >
            {item.is_liked ? "Liked" : "Support"}{" "}
            {item.likes_count ? `(${item.likes_count})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.intentionAction}
          onPress={() => onComment(item.id)}
        >
          <Feather name="message-circle" size={18} color="#FAC898" />
          <Text style={styles.actionText}>
            {isCommentsExpanded ? "Hide Comments" : "Comment"}{" "}
            {item.comments_count ? `(${item.comments_count})` : ""}
          </Text>
        </TouchableOpacity>
        {item.user_id === currentUserId && (
          <TouchableOpacity
            style={styles.intentionAction}
            onPress={() => onEdit(item)}
          >
            <Feather name="edit" size={18} color="#FAC898" />
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
              placeholderTextColor="rgba(250, 200, 152, 0.5)"
              value={newComment}
              onChangeText={setNewComment}
              multiline={true}
              inputAccessoryViewID="accessoryViewID"
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleAddComment(item.id)}
            >
              <Feather name="send" size={22} color="#FAC898" />
            </TouchableOpacity>
          </View>
          {commentsLoading ? (
            <ActivityIndicator
              size="small"
              color="#FAC898"
              style={styles.commentsLoading}
            />
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab] = useState<TabType>("all");
  const [intentionsFilter, setIntentionsFilter] = useState<
    "all" | "mine" | "friends" | "groups"
  >("all");
  const [showIntentionModal, setShowIntentionModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingIntention, setEditingIntention] = useState<Intention | null>(
    null
  );
  const [showFriendsSearch, setShowFriendsSearch] = useState<boolean>(false);
  const [friendTab, setFriendTab] = useState<"search" | "requests" | "list">(
    "search"
  );
  const [sentRequests, setSentRequests] = useState<FriendRequestSent[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<
    FriendRequestIncoming[]
  >([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newIntention, setNewIntention] = useState<{
    title: string;
    description: string;
    type: IntentionType;
    visibility: "Friends" | "Certain Groups" | "Just Me" | "Friends & Groups";
    selectedGroups: (number | string)[];
  }>({
    title: "",
    description: "",
    type: "prayer",
    visibility: "Friends",
    selectedGroups: [],
  });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    intentionId: string | null;
  }>({ isOpen: false, intentionId: null });
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState<boolean>(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(
    null
  );
  const [showFabMenu, setShowFabMenu] = useState<boolean>(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  // Visibility dropdown states in modals
  const [showVisibilityDropdownNew, setShowVisibilityDropdownNew] =
    useState<boolean>(false);
  const [showVisibilityDropdownEdit, setShowVisibilityDropdownEdit] =
    useState<boolean>(false);
  // Use state to track focus of description so the accessory view appears
  const [createDescriptionFocused, setCreateDescriptionFocused] =
    useState(false);
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

  useEffect(() => {
    if (intentionsFilter === "all" && !groupsLoaded) return;
    fetchIntentions();
  }, [intentionsFilter, activeTab, groupsLoaded]);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) setCurrentUserId(data.user.id);
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    getCurrentUser();
  }, []);

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

  const isUserFriend = async (
    currentUserId: string,
    userId: string
  ): Promise<boolean> => {
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
      const { data, error } = await supabase
        .from("group_members")
        .select("group:groups(*)")
        .eq("user_id", currentUserId);
      if (error) throw error;
      const groups = data.map((item: any) => item.group);
      setUserGroups(groups || []);
      setGroupsLoaded(true);
    } catch (error: any) {
      console.error("Error fetching user groups:", error);
    }
  };

  const fetchIntentions = async (type?: IntentionType): Promise<void> => {
    try {
      setIsLoading(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("intentions")
        .select(`*, user:users (*)`)
        .order("created_at", { ascending: false });

      if (intentionsFilter === "mine") {
        query = query.eq("user_id", user.id);
      } else if (intentionsFilter === "friends") {
        const { data: sent, error: sentError } = await supabase
          .from("friends")
          .select("user_id_2")
          .eq("user_id_1", user.id)
          .eq("status", "accepted");
        if (sentError) throw sentError;
        const { data: incoming, error: incomingError } = await supabase
          .from("friends")
          .select("user_id_1")
          .eq("user_id_2", user.id)
          .eq("status", "accepted");
        if (incomingError) throw incomingError;
        let friendIds: string[] = [];
        if (sent)
          friendIds = friendIds.concat(
            sent.map((row: { user_id_2: string }) => row.user_id_2)
          );
        if (incoming)
          friendIds = friendIds.concat(
            incoming.map((row: { user_id_1: string }) => row.user_id_1)
          );
        if (friendIds.length === 0) {
          setIntentions([]);
          setIsLoading(false);
          return;
        }
        query = query.in("user_id", friendIds);
      } else if (intentionsFilter === "groups") {
        if (userGroups.length === 0) {
          setIntentions([]);
          setIsLoading(false);
          return;
        }
        const groupIds = userGroups.map((group) => group.id);
        const { data: groupMembers, error: membersError } = await supabase
          .from("group_members")
          .select("user_id")
          .in("group_id", groupIds);
        if (membersError) throw membersError;
        if (!groupMembers || groupMembers.length === 0) {
          setIntentions([]);
          setIsLoading(false);
          return;
        }
        const memberIds = [
          ...new Set(groupMembers.map((member) => member.user_id)),
        ];
        query = query.in("user_id", memberIds);
      } else if (intentionsFilter === "all") {
        const { data: sent, error: sentError } = await supabase
          .from("friends")
          .select("user_id_2")
          .eq("user_id_1", user.id)
          .eq("status", "accepted");
        if (sentError) throw sentError;
        const { data: incoming, error: incomingError } = await supabase
          .from("friends")
          .select("user_id_1")
          .eq("user_id_2", user.id)
          .eq("status", "accepted");
        if (incomingError) throw incomingError;
        const { data: groupMembers, error: membersError } = await supabase
          .from("group_members")
          .select("user_id, group_id")
          .in(
            "group_id",
            userGroups.map((group) => group.id)
          );
        if (membersError) throw membersError;
        let userIds: string[] = [user.id];
        if (sent) {
          userIds = userIds.concat(
            sent.map((row: { user_id_2: string }) => row.user_id_2)
          );
        }
        if (incoming) {
          userIds = userIds.concat(
            incoming.map((row: { user_id_1: string }) => row.user_id_1)
          );
        }
        if (groupMembers && groupMembers.length > 0) {
          const groupMemberIds = groupMembers.map((member) => member.user_id);
          userIds = [...new Set([...userIds, ...groupMemberIds])];
        }
        query = query.in("user_id", userIds);
      }

      if (type) query = query.eq("type", type);

      const { data, error } = await query;
      if (error) throw error;

      const intentionsWithCounts = await Promise.all(
        (data || []).map(async (intention: any) => {
          const { count: likesCount, error: likesError } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: false })
            .eq("likeable_id", intention.id)
            .eq("likeable_type", "intentions");
          if (likesError) throw likesError;
          const { count: commentsCount, error: commentsError } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: false })
            .eq("commentable_id", intention.id)
            .eq("commentable_type", "intentions");
          if (commentsError) throw commentsError;
          const { data: userLike, error: userLikeError } = await supabase
            .from("likes")
            .select("id")
            .eq("likeable_id", intention.id)
            .eq("likeable_type", "intentions")
            .eq("user_id", user.id)
            .maybeSingle();
          if (userLikeError) throw userLikeError;

          let groupInfo = null;
          if (userGroups.length > 0) {
            const showGroupInfo =
              (intentionsFilter === "groups" &&
                intention.user_id !== user.id) ||
              (intention.user_id !== user.id &&
                !(await isUserFriend(user.id, intention.user_id)));
            if (showGroupInfo) {
              const { data: userGroupData, error: userGroupError } =
                await supabase
                  .from("group_members")
                  .select("group_id")
                  .eq("user_id", intention.user_id);
              if (userGroupError) throw userGroupError;
              const { data: currentUserGroups, error: currentUserGroupError } =
                await supabase
                  .from("group_members")
                  .select("group_id")
                  .eq("user_id", user.id);
              if (currentUserGroupError) throw currentUserGroupError;
              if (userGroupData && currentUserGroups) {
                const userGroupIds = userGroupData.map((g) => g.group_id);
                const currentUserGroupIds = currentUserGroups.map(
                  (g) => g.group_id
                );
                const sharedGroupIds = userGroupIds.filter((id) =>
                  currentUserGroupIds.includes(id)
                );
                if (sharedGroupIds.length > 0) {
                  const { data: groupData, error: groupError } = await supabase
                    .from("groups")
                    .select("*")
                    .eq("id", sharedGroupIds[0])
                    .single();
                  if (!groupError && groupData) {
                    groupInfo = groupData;
                  }
                }
              }
            }
          }

          return {
            ...intention,
            likes_count: likesCount,
            comments_count: commentsCount,
            is_liked: !!userLike,
            group_info: groupInfo,
            // NEW: Ensure selectedGroups is a proper array
            selectedGroups: parseSelectedGroups(intention.selected_groups),
          };
        })
      );

      setIntentions(intentionsWithCounts || []);
    } catch (error: any) {
      console.error("Error fetching intentions:", error);
      setIntentions([]);
      setNotification({
        message:
          "Error fetching intentions: " +
          (error instanceof Error ? error.message : String(error)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (intentionId: string): Promise<void> => {
    try {
      setCommentsLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select(`*, user:users(*)`)
        .eq("commentable_id", intentionId)
        .eq("commentable_type", "intentions")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      setComments([]);
      setNotification({
        message:
          "Error fetching comments: " +
          (error instanceof Error ? error.message : String(error)),
        type: "error",
      });
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchFriendRequests = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");
      const { data: sent, error: sentError } = await supabase
        .from("friends")
        .select(
          "id, user_id_2, status, created_at, user_2:users!friends_user_id_2_fkey(*)"
        )
        .eq("user_id_1", user.id)
        .eq("status", "pending");
      if (sentError) throw sentError;
      interface SentRow {
        id: string;
        user_id_2: string;
        status: string;
        created_at: string;
        user_2: UserData | UserData[];
      }
      const formattedSent: FriendRequestSent[] = (
        (sent as SentRow[]) || []
      ).map((row) => ({
        ...row,
        user_2: Array.isArray(row.user_2) ? row.user_2[0] : row.user_2,
      }));
      const { data: incoming, error: incomingError } = await supabase
        .from("friends")
        .select(
          "id, user_id_1, status, created_at, user_1:users!friends_user_id_1_fkey(*)"
        )
        .eq("user_id_2", user.id)
        .eq("status", "pending");
      if (incomingError) throw incomingError;
      interface IncomingRow {
        id: string;
        user_id_1: string;
        status: string;
        created_at: string;
        user_1: UserData | UserData[];
      }
      const formattedIncoming: FriendRequestIncoming[] = (
        (incoming as IncomingRow[]) || []
      ).map((row) => ({
        ...row,
        user_1: Array.isArray(row.user_1) ? row.user_1[0] : row.user_1,
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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;
      const { data, error } = await supabase
        .from("friends")
        .select("id")
        .eq("user_id_2", user.id)
        .eq("status", "pending");
      if (error) throw error;
      setFriendRequestCount(data ? data.length : 0);
    } catch (error: any) {
      console.error("Error fetching incoming friend requests count:", error);
    }
  };

  const fetchFriends = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");
      interface SentFullRow {
        id: string;
        user_id_2: string;
        status: string;
        created_at: string;
        user_2: UserData | UserData[];
      }
      const { data: sent, error: sentError } = await supabase
        .from("friends")
        .select(
          "id, user_id_2, status, created_at, user_2:users!friends_user_id_2_fkey(*)"
        )
        .eq("user_id_1", user.id)
        .eq("status", "accepted");
      if (sentError) throw sentError;
      const formattedSent: Friend[] = ((sent as SentFullRow[]) || []).map(
        (row) => ({
          id: row.id,
          friend: Array.isArray(row.user_2) ? row.user_2[0] : row.user_2,
          created_at: row.created_at,
        })
      );
      interface IncomingFullRow {
        id: string;
        user_id_1: string;
        status: string;
        created_at: string;
        user_1: UserData | UserData[];
      }
      const { data: incoming, error: incomingError } = await supabase
        .from("friends")
        .select(
          "id, user_id_1, status, created_at, user_1:users!friends_user_id_1_fkey(*)"
        )
        .eq("user_id_2", user.id)
        .eq("status", "accepted");
      if (incomingError) throw incomingError;
      const formattedIncoming: Friend[] = (
        (incoming as IncomingFullRow[]) || []
      ).map((row) => ({
        id: row.id,
        friend: Array.isArray(row.user_1) ? row.user_1[0] : row.user_1,
        created_at: row.created_at,
      }));
      setFriends([...formattedSent, ...formattedIncoming]);
    } catch (error: any) {
      console.error("Error fetching friends:", error);
      setNotification({
        message:
          "Error fetching friends: " +
          (error instanceof Error ? error.message : JSON.stringify(error)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeIntention = async (
    intentionId: string,
    isLiked: boolean
  ): Promise<void> => {
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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");
      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("likeable_id", intentionId)
          .eq("likeable_type", "intentions")
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { data: intentionData, error: intentionError } = await supabase
          .from("intentions")
          .select("id")
          .eq("id", intentionId)
          .single();
        if (intentionError) throw intentionError;
        if (!intentionData) throw new Error("Intention not found");
        const { error } = await supabase.from("likes").insert({
          user_id: user.id,
          likeable_id: intentionId,
          likeable_type: "intentions",
        });
        if (error) throw error;
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
            : intention
        )
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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: user.id,
          commentable_id: intentionId,
          commentable_type: "intentions",
          content: newComment,
        })
        .select(`*, user:users(*)`);
      if (error) throw error;
      if (data && data.length > 0) setComments([...comments, data[0]]);
      setIntentions(
        intentions.map((intention) =>
          intention.id === intentionId
            ? {
                ...intention,
                comments_count: (intention.comments_count || 0) + 1,
              }
            : intention
        )
      );
      setNewComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      setNotification({
        message: `Error adding comment: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("intentions").insert([
        {
          user_id: user.id,
          title: newIntention.title,
          description: newIntention.description,
          type: newIntention.type,
          visibility: newIntention.visibility,
          selected_groups:
            newIntention.visibility === "Certain Groups"
              ? newIntention.selectedGroups
              : [],
        },
      ]);
      if (error) throw error;
      setShowIntentionModal(false);
      setNewIntention({
        title: "",
        description: "",
        type: "prayer",
        visibility: "Friends",
        selectedGroups: [],
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
      const { error } = await supabase
        .from("intentions")
        .delete()
        .eq("id", intentionId);
      if (error) throw error;
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
        .or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`
        )
        .order("first_name", { ascending: true })
        .limit(20);
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setUsers([]);
      setNotification({
        message:
          "Error fetching users: " +
          (error instanceof Error ? error.message : String(error)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async (friendId: string): Promise<void> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("friends")
        .insert({ user_id_1: user.id, user_id_2: friendId, status: "pending" });
      if (error) throw error;
      setNotification({ message: "Friend request sent!", type: "success" });
      fetchIncomingRequestsCount();
    } catch (error: any) {
      console.error("Error adding friend:", error);
      setNotification({
        message: `Error adding friend: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("id", requestId);
      if (error) throw error;
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

  const handleRemoveFriend = async (
    friendRelationshipId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("id", friendRelationshipId);
      if (error) throw error;
      setNotification({
        message: "Friend removed successfully!",
        type: "success",
      });
      fetchFriends();
    } catch (error: any) {
      console.error("Error removing friend:", error);
      setNotification({
        message: `Error removing friend: ${
          error instanceof Error ? error.message : String(error)
        }`,
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

  const handleSelectFilter = (
    filter: "all" | "mine" | "friends" | "groups"
  ): void => {
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
          <Feather name="user" size={28} color="#FAC898" />
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
          <Feather name="message-circle" size={18} color="#FAC898" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.userAction}
          onPress={() => handleAddFriend(item.id)}
        >
          <Feather name="heart" size={18} color="#FAC898" />
          <Text style={styles.actionText}>Add Friend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequestCard = ({
    item,
  }: {
    item: FriendRequestSent;
  }): JSX.Element => (
    <View style={styles.friendCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Feather name="user" size={28} color="#FAC898" />
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

  const renderIncomingRequestCard = ({
    item,
  }: {
    item: FriendRequestIncoming;
  }): JSX.Element => (
    <View style={styles.friendCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Feather name="user" size={28} color="#FAC898" />
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
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item.id)}
        >
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
          <Feather name="user" size={28} color="#FAC898" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.friend.first_name} {item.friend.last_name}
          </Text>
          <Text style={styles.userSubtitle}>
            Friends since {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFriend(item.id)}
      >
        <Feather name="trash-2" size={18} color="#E9967A" />
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageBackground
      source={backgroundImageRequire}
      style={styles.backgroundImage}
    >
      <View style={[styles.backgroundOverlay, { opacity: 0.7 }]} />
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {notification && (
          <View
            style={[
              styles.notification,
              notification.type === "error"
                ? styles.errorNotification
                : styles.successNotification,
            ]}
          >
            <Text style={styles.notificationText}>{notification.message}</Text>
          </View>
        )}
        <View style={styles.header} ref={headerRef} onLayout={onHeaderLayout}>
          <TouchableOpacity
            style={styles.headerTitleContainer}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            <View style={styles.headerFilterIndicator}>
              <Feather
                name={showFilterDropdown ? "chevron-up" : "chevron-down"}
                size={18}
                color="#FAC898"
              />
            </View>
          </TouchableOpacity>
        </View>
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
            style={[
              styles.filterOption,
              intentionsFilter === "all" && styles.activeFilterOption,
            ]}
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
            style={[
              styles.filterOption,
              intentionsFilter === "mine" && styles.activeFilterOption,
            ]}
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
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
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
                  <Text style={styles.emptyStateButtonText}>
                    Create New Intention
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
        {showFriendsSearch && (
          <View style={styles.friendsSection}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowFriendsSearch(false)}
            >
              <Feather name="arrow-left" size={24} color="#FAC898" />
              <Text style={styles.backButtonText}>Back to Feed</Text>
            </TouchableOpacity>
            <View style={styles.friendsTabs}>
              <TouchableOpacity
                style={[
                  styles.friendTab,
                  friendTab === "search" && styles.activeFriendTab,
                ]}
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
                style={[
                  styles.friendTab,
                  friendTab === "requests" && styles.activeFriendTab,
                ]}
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
                    <Text style={styles.tabBadgeText}>
                      {friendRequestCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.friendTab,
                  friendTab === "list" && styles.activeFriendTab,
                ]}
                onPress={() => setFriendTab("list")}
              >
                <Text
                  style={[
                    styles.friendTabText,
                    friendTab === "list" && styles.activeFriendTabText,
                  ]}
                >
                  Friends
                </Text>
              </TouchableOpacity>
            </View>
            {friendTab === "search" && (
              <>
                <View style={styles.searchContainer}>
                  <Feather
                    name="search"
                    size={22}
                    color="#FAC898"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search friends..."
                    placeholderTextColor="rgba(250, 200, 152, 0.5)"
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
                      <Text style={styles.emptyStateText}>
                        Search for friends
                      </Text>
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
                        <Text style={styles.requestSubtitle}>
                          Sent Requests
                        </Text>
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
                        <Text style={styles.requestSubtitle}>
                          Incoming Requests
                        </Text>
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
                      <Text style={styles.emptyStateButtonText}>
                        Find Friends
                      </Text>
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
              <Feather name="edit" size={22} color="#FAC898" />
              <Text style={styles.fabMenuItemText}>Add Intention</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => handleFabOption("friends")}
            >
              <Feather name="users" size={22} color="#FAC898" />
              <Text style={styles.fabMenuItemText}>
                Friends{" "}
                {friendRequestCount > 0 && (
                  <Text style={styles.fabMenuBadge}>
                    {" "}
                    • {friendRequestCount}
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => handleFabOption("lent")}
            >
              <Feather name="book-open" size={22} color="#FAC898" />
              <Text style={styles.fabMenuItemText}>Lent 2025</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => handleFabOption("groups")}
            >
              <Feather name="users" size={22} color="#FAC898" />
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
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New Intention</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type</Text>
                  <View style={styles.pickerContainer}>
                    {["prayer", "resolution", "goal"].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          newIntention.type === type &&
                            styles.selectedTypeOption,
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
                    onPress={() =>
                      setShowVisibilityDropdownNew(!showVisibilityDropdownNew)
                    }
                  >
                    <View style={styles.dropdownContent}>
                      {
                        visibilityOptions.find(
                          (option) => option.label === newIntention.visibility
                        )?.icon
                      }
                      <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                        {newIntention.visibility}
                      </Text>
                    </View>
                    <Feather
                      name={
                        showVisibilityDropdownNew
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={18}
                      color="#FAC898"
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
                                | "Friends & Groups",
                              selectedGroups:
                                option.label === "Certain Groups"
                                  ? newIntention.selectedGroups
                                  : [],
                            });
                            setShowVisibilityDropdownNew(false);
                          }}
                        >
                          <View style={styles.dropdownOptionContent}>
                            {option.icon}
                            <Text style={styles.dropdownOptionText}>
                              {option.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {newIntention.visibility === "Certain Groups" && (
                    <View style={styles.groupSelectorContainer}>
                      <Text style={styles.groupSelectorLabel}>
                        Select Groups:
                      </Text>
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
                            <Text style={styles.groupOptionText}>
                              {group.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Title</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newIntention.title}
                    onChangeText={(text) =>
                      setNewIntention({ ...newIntention, title: text })
                    }
                    placeholder="Enter title..."
                    placeholderTextColor="rgba(250, 200, 152, 0.5)"
                    inputAccessoryViewID="accessoryViewID"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
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
                    placeholderTextColor="rgba(250, 200, 152, 0.5)"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    inputAccessoryViewID="accessoryViewID"
                    onFocus={() => setCreateDescriptionFocused(true)}
                    onBlur={() => setCreateDescriptionFocused(false)}
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
                    style={styles.cancelButton}
                    onPress={() => setShowIntentionModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleCreateIntention}
                  >
                    <Text style={styles.createButtonText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
                      {["prayer", "resolution", "goal"].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeOption,
                            editingIntention.type === type &&
                              styles.selectedTypeOption,
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
                      onPress={() =>
                        setShowVisibilityDropdownEdit(
                          !showVisibilityDropdownEdit
                        )
                      }
                    >
                      <View style={styles.dropdownContent}>
                        {
                          visibilityOptions.find(
                            (option) =>
                              option.label === editingIntention.visibility
                          )?.icon
                        }
                        <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                          {editingIntention.visibility}
                        </Text>
                      </View>
                      <Feather
                        name={
                          showVisibilityDropdownEdit
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={18}
                        color="#FAC898"
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
                                  | "Friends & Groups",
                                selectedGroups:
                                  option.label === "Certain Groups"
                                    ? editingIntention.selectedGroups || []
                                    : [],
                              });
                              setShowVisibilityDropdownEdit(false);
                            }}
                          >
                            <View style={styles.dropdownOptionContent}>
                              {option.icon}
                              <Text style={styles.dropdownOptionText}>
                                {option.label}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {editingIntention.visibility === "Certain Groups" && (
                      <View style={styles.groupSelectorContainer}>
                        <Text style={styles.groupSelectorLabel}>
                          Select Groups:
                        </Text>
                        <View style={styles.groupSelectorList}>
                          {userGroups.map((group) => (
                            <TouchableOpacity
                              key={group.id}
                              style={[
                                styles.groupOption,
                                editingIntention.selectedGroups &&
                                editingIntention.selectedGroups.includes(
                                  group.id
                                )
                                  ? styles.groupOptionSelected
                                  : null,
                              ]}
                              onPress={() => toggleEditGroupSelection(group.id)}
                            >
                              <Text style={styles.groupOptionText}>
                                {group.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
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
                      placeholderTextColor="rgba(250, 200, 152, 0.5)"
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
                      placeholderTextColor="rgba(250, 200, 152, 0.5)"
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
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleUpdateIntention}
                    >
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
          onRequestClose={() =>
            setDeleteModal({ isOpen: false, intentionId: null })
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete Intention</Text>
              <Text style={styles.modalText}>
                Are you sure you want to delete this intention?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() =>
                    setDeleteModal({ isOpen: false, intentionId: null })
                  }
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
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FAC898" />
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 1)",
  },
  container: { flex: 1, paddingTop: Platform.OS === "android" ? 20 : 0 },
  notification: {
    position: "absolute",
    top: 50,
    left: 15,
    right: 15,
    padding: 12,
    borderRadius: 15,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
  },
  errorNotification: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    borderColor: "rgba(220, 38, 38, 0.4)",
  },
  successNotification: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  notificationText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(250, 200, 152, 0.1)",
    zIndex: 10,
  },
  headerTitleContainer: { flexDirection: "row", alignItems: "center" },
  headerTitle: {
    fontSize: 36,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginRight: 10,
  },
  headerFilterIndicator: { alignItems: "center", justifyContent: "center" },
  filterDropdown: {
    position: "absolute",
    left: 15,
    right: 15,
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    borderRadius: 10,
    padding: 5,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  filterOption: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8 },
  activeFilterOption: { backgroundColor: "rgba(250, 200, 152, 0.2)" },
  filterOptionText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },
  activeFilterOptionText: { color: "#FAC898", fontWeight: "600" },
  intentionList: { padding: 15, paddingBottom: 100 },
  intentionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  intentionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  intentionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  intentionHeaderText: { flex: 1 },
  intentionTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "500" },
  intentionSubtitle: {
    color: "rgba(250, 200, 152, 0.9)",
    fontSize: 12,
    marginTop: 2,
  },
  intentionDescription: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  intentionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 5,
  },
  intentionAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  intentionActionActive: { opacity: 1 },
  likeButtonContainer: {
    position: "relative",
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  likeRipple: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(233, 150, 122, 0.3)",
  },
  actionText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  actionTextActive: { color: "#E9967A" },
  groupTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.3)",
  },
  groupTagText: {
    color: "#FAC898",
    fontSize: 12,
    marginLeft: 5,
    fontWeight: "600",
  },
  commentsSection: { marginTop: 10 },
  commentsDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 10,
  },
  commentsList: { paddingVertical: 5 },
  commentsLoading: { marginVertical: 10 },
  commentItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  commentUser: { flex: 1 },
  commentUserName: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  commentTime: { color: "rgba(250, 200, 152, 0.7)", fontSize: 11 },
  commentContent: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  emptyComments: { padding: 10, alignItems: "center" },
  emptyCommentsText: { color: "rgba(255, 255, 255, 0.6)", fontSize: 14 },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#FFFFFF",
    marginRight: 10,
    maxHeight: 80,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginTop: 20,
  },
  emptyStateText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  emptyStateButton: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  emptyStateButtonText: { color: "#FFFFFF", fontWeight: "600" },
  intentionContent: { paddingVertical: 10 },
  intentionAuthor: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  authorTag: {
    color: "rgba(250, 200, 152, 0.9)",
    fontSize: 14,
    fontWeight: "normal",
  },
  intentionMeta: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  intentionTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 200, 152, 0.1)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  intentionTypeText: { color: "#FAC898", fontSize: 12, marginLeft: 4 },
  intentionTime: { color: "rgba(255, 255, 255, 0.6)", fontSize: 12 },
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalContent: {
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
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
    justifyContent: "space-between",
    gap: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    backgroundColor: "rgba(41, 37, 36, 0.5)",
  },
  selectedTypeOption: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderColor: "rgba(250, 200, 152, 0.5)",
  },
  typeOptionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  formInput: {
    backgroundColor: "rgba(41, 37, 36, 0.9)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    color: "#FFFFFF",
    padding: 12,
    fontSize: 16,
  },
  formTextarea: {
    backgroundColor: "rgba(41, 37, 36, 0.9)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    color: "#FFFFFF",
    padding: 12,
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
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cancelButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  createButton: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  createButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(233, 150, 122, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 1000,
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
});
