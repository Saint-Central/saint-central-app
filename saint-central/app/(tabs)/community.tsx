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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import { Link, router } from "expo-router";

// Interface definitions remain unchanged
interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
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

export default function CommunityScreen() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab] = useState<TabType>("all");
  const [intentionsFilter, setIntentionsFilter] = useState<"mine" | "friends">(
    "mine"
  );
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
  }>({
    title: "",
    description: "",
    type: "prayer",
  });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    intentionId: string | null;
  }>({
    isOpen: false,
    intentionId: null,
  });
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentsModal, setShowCommentsModal] = useState<boolean>(false);
  const [selectedIntention, setSelectedIntention] = useState<Intention | null>(
    null
  );
  const [newComment, setNewComment] = useState<string>("");

  // All useEffect hooks and functions remain unchanged
  useEffect(() => {
    fetchIntentions();
  }, [intentionsFilter, activeTab]);

  useEffect(() => {
    // Clear any previous notifications when switching to the friends view.
    setNotification(null);
    if (showFriendsSearch) {
      if (friendTab === "requests") {
        fetchFriendRequests();
      } else if (friendTab === "list") {
        fetchFriends();
      }
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
    if (selectedIntention) {
      fetchComments(selectedIntention.id);
    }
  }, [selectedIntention]);

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
      }

      if (type) query = query.eq("type", type);

      const { data, error } = await query;
      if (error) throw error;

      const intentionsWithCounts = await Promise.all(
        (data || []).map(async (intention: Intention) => {
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

          return {
            ...intention,
            likes_count: likesCount,
            comments_count: commentsCount,
            is_liked: !!userLike,
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
      setIsLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select(`*, user:users(*)`)
        .eq("commentable_id", intentionId)
        .eq("commentable_type", "intentions")
        .order("created_at", { ascending: true });
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
      setIsLoading(false);
    }
  };

  const likeScaleAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const likeOpacityAnimations = useRef<Map<string, Animated.Value>>(new Map());

  const getLikeScaleAnimation = (intentionId: string): Animated.Value => {
    if (!likeScaleAnimations.current.has(intentionId))
      likeScaleAnimations.current.set(intentionId, new Animated.Value(1));
    return likeScaleAnimations.current.get(intentionId) as Animated.Value;
  };

  const getLikeOpacityAnimation = (intentionId: string): Animated.Value => {
    if (!likeOpacityAnimations.current.has(intentionId))
      likeOpacityAnimations.current.set(intentionId, new Animated.Value(0));
    return likeOpacityAnimations.current.get(intentionId) as Animated.Value;
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

  const handleAddComment = async (): Promise<void> => {
    if (!selectedIntention || !newComment.trim()) {
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
          commentable_id: selectedIntention.id,
          commentable_type: "intentions",
          content: newComment,
        })
        .select(`*, user:users(*)`);
      if (error) throw error;

      if (data && data.length > 0) setComments([...comments, data[0]]);
      setIntentions(
        intentions.map((intention) =>
          intention.id === selectedIntention.id
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

  const handleOpenComments = (intention: Intention): void => {
    setSelectedIntention(intention);
    setShowCommentsModal(true);
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
        },
      ]);
      if (error) throw error;

      setShowIntentionModal(false);
      setNewIntention({ title: "", description: "", type: "prayer" });
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

  const renderIntentionCard = ({ item }: { item: Intention }): JSX.Element => (
    <View style={styles.intentionCard}>
      <View style={styles.intentionHeader}>
        <View style={styles.intentionTypeIcon}>
          {item.type === "prayer" ? (
            <FontAwesome name="hand-peace-o" size={20} color="#FFD700" />
          ) : item.type === "resolution" ? (
            <Feather name="book-open" size={20} color="#FFD700" />
          ) : (
            <Feather name="target" size={20} color="#FFD700" />
          )}
        </View>
        <View style={styles.intentionHeaderText}>
          <Text style={styles.intentionTitle}>{item.title}</Text>
          <Text style={styles.intentionSubtitle}>
            {item.user.first_name} {item.user.last_name} •{" "}
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={styles.intentionDescription}>{item.description}</Text>
      <View style={styles.intentionActions}>
        <TouchableOpacity
          style={[
            styles.intentionAction,
            item.is_liked && styles.intentionActionActive,
          ]}
          onPress={() => handleLikeIntention(item.id, !!item.is_liked)}
        >
          <View style={styles.likeButtonContainer}>
            <Animated.View
              style={[
                styles.likeRipple,
                {
                  opacity: getLikeOpacityAnimation(item.id),
                  transform: [
                    {
                      scale: Animated.multiply(
                        getLikeScaleAnimation(item.id),
                        2
                      ),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={{ transform: [{ scale: getLikeScaleAnimation(item.id) }] }}
            >
              <FontAwesome
                name={item.is_liked ? "heart" : "heart-o"}
                size={18}
                color={item.is_liked ? "#FF6B6B" : "#FFD700"}
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
          onPress={() => handleOpenComments(item)}
        >
          <Feather name="message-circle" size={18} color="#FFD700" />
          <Text style={styles.actionText}>
            Comment {item.comments_count ? `(${item.comments_count})` : ""}
          </Text>
        </TouchableOpacity>
        {intentionsFilter === "mine" && (
          <>
            <TouchableOpacity
              style={styles.intentionAction}
              onPress={() => handleEditIntention(item)}
            >
              <Feather name="edit" size={18} color="#FFD700" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.intentionAction}
              onPress={() => handleDeleteClick(item.id)}
            >
              <Feather name="trash-2" size={18} color="#FFD700" />
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderCommentItem = ({ item }: { item: Comment }): JSX.Element => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Feather name="user" size={18} color="#FFD700" />
        </View>
        <View style={styles.commentUser}>
          <Text style={styles.commentUserName}>
            {item.user.first_name} {item.user.last_name}
          </Text>
          <Text style={styles.commentTime}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
    </View>
  );

  const renderUserCard = ({ item }: { item: UserData }): JSX.Element => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Feather name="user" size={28} color="#FFD700" />
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
          <Feather name="message-circle" size={18} color="#FFD700" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.userAction}
          onPress={() => handleAddFriend(item.id)}
        >
          <Feather name="heart" size={18} color="#FFD700" />
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
          <Feather name="user" size={28} color="#FFD700" />
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
          <Feather name="user" size={28} color="#FFD700" />
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
          <Feather name="user" size={28} color="#FFD700" />
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
        <Feather name="trash-2" size={18} color="#FF6B6B" />
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Notification Banner */}
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowIntentionModal(true)}
          >
            <Feather name="plus-circle" size={22} color="#FFD700" />
            <Text style={styles.headerButtonText}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setShowFriendsSearch(!showFriendsSearch);
              setSearchQuery("");
              setUsers([]);
              setFriendTab("search");
            }}
          >
            <View style={styles.badgeContainer}>
              {showFriendsSearch ? (
                <Feather name="list" size={22} color="#FFD700" />
              ) : (
                <Feather name="users" size={22} color="#FFD700" />
              )}
              {!showFriendsSearch && friendRequestCount > 0 && (
                <View style={styles.badge} />
              )}
            </View>
            <Text style={styles.headerButtonText}>
              {showFriendsSearch ? "Intentions" : "Friends"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Intentions Filter + Lent Button */}
      {!showFriendsSearch && (
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              intentionsFilter === "mine" && styles.activeFilterTab,
            ]}
            onPress={() => setIntentionsFilter("mine")}
          >
            <Text
              style={[
                styles.filterTabText,
                intentionsFilter === "mine" && styles.activeFilterTabText,
              ]}
            >
              My Intentions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              intentionsFilter === "friends" && styles.activeFilterTab,
            ]}
            onPress={() => setIntentionsFilter("friends")}
          >
            <Text
              style={[
                styles.filterTabText,
                intentionsFilter === "friends" && styles.activeFilterTabText,
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>
          <Link href="/Lent2025" asChild>
            <TouchableOpacity style={styles.lentButton}>
              <Feather name="book-open" size={18} color="#FFFFFF" />
              <Text style={styles.lentButtonText}>Lent 2025</Text>
            </TouchableOpacity>
          </Link>
        </View>
      )}

      {/* Intentions List */}
      {!showFriendsSearch && (
        <FlatList
          data={intentions}
          renderItem={renderIntentionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.intentionList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {intentionsFilter === "mine"
                  ? "No intentions yet."
                  : "No friend intentions."}
              </Text>
            </View>
          }
        />
      )}

      {/* Friends Section */}
      {showFriendsSearch && (
        <View style={styles.friendsSection}>
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
                  color="#FFD700"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends..."
                  placeholderTextColor="rgba(255, 215, 0, 0.5)"
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
                <Text style={styles.noResultsText}>No friends yet.</Text>
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

      {/* Create Intention Modal */}
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
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={newIntention.title}
                  onChangeText={(text) =>
                    setNewIntention({ ...newIntention, title: text })
                  }
                  placeholder="Enter title..."
                  placeholderTextColor="rgba(255, 215, 0, 0.5)"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={styles.formTextarea}
                  value={newIntention.description}
                  onChangeText={(text) =>
                    setNewIntention({ ...newIntention, description: text })
                  }
                  placeholder="Enter description..."
                  placeholderTextColor="rgba(255, 215, 0, 0.5)"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
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

      {/* Edit Intention Modal */}
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
                  <Text style={styles.formLabel}>Title</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingIntention.title}
                    onChangeText={(text) =>
                      setEditingIntention({ ...editingIntention, title: text })
                    }
                    placeholder="Enter title..."
                    placeholderTextColor="rgba(255, 215, 0, 0.5)"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.formTextarea}
                    value={editingIntention.description}
                    onChangeText={(text) =>
                      setEditingIntention({
                        ...editingIntention,
                        description: text,
                      })
                    }
                    placeholder="Enter description..."
                    placeholderTextColor="rgba(255, 215, 0, 0.5)"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
                <View style={styles.modalActions}>
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

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal && selectedIntention !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCommentsModal(false);
          setSelectedIntention(null);
          setComments([]);
        }}
      >
        {selectedIntention && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.commentsModalContent]}>
                <View style={styles.commentsHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedIntention.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCommentsModal(false);
                      setSelectedIntention(null);
                      setComments([]);
                    }}
                  >
                    <Feather name="x" size={26} color="#FFD700" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={comments}
                  renderItem={renderCommentItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.commentsList}
                  ListEmptyComponent={
                    <View style={styles.emptyComments}>
                      <Text style={styles.emptyCommentsText}>
                        No comments yet.
                      </Text>
                    </View>
                  }
                  style={styles.commentsListContainer}
                />
                <View style={styles.addCommentContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor="rgba(255, 215, 0, 0.5)"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline={true}
                  />
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleAddComment}
                  >
                    <Feather name="send" size={22} color="#FFD700" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
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
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1917",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  notification: {
    position: "absolute",
    top: 50,
    left: 15,
    right: 15,
    padding: 12,
    borderRadius: 8,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  errorNotification: { backgroundColor: "#DC2626" },
  successNotification: { backgroundColor: "#10B981" },
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
    borderBottomColor: "rgba(255, 215, 0, 0.1)",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF9C4",
    marginBottom: 10,
  },
  headerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  badgeContainer: { position: "relative" },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
  },
  headerButtonText: {
    color: "#FFF9C4",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(41, 37, 36, 0.3)",
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterTab: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  filterTabText: {
    color: "rgba(255, 249, 196, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  activeFilterTabText: { color: "#FFD700", fontWeight: "600" },
  lentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(147, 51, 234, 0.9)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginLeft: "auto",
  },
  lentButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  intentionList: { padding: 15, paddingBottom: 100 },
  intentionCard: {
    backgroundColor: "rgba(41, 37, 36, 0.7)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.1)",
  },
  intentionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  intentionTypeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  intentionHeaderText: { flex: 1 },
  intentionTitle: { color: "#FFF9C4", fontSize: 18, fontWeight: "600" },
  intentionSubtitle: {
    color: "rgba(255, 215, 0, 0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  intentionDescription: {
    color: "rgba(255, 249, 196, 0.9)",
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
    backgroundColor: "rgba(255, 107, 107, 0.3)",
  },
  actionText: {
    color: "rgba(255, 249, 196, 0.8)",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  actionTextActive: { color: "#FF6B6B" },
  commentsModalContent: { maxHeight: "85%", width: "90%", paddingBottom: 20 },
  commentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  commentsListContainer: { maxHeight: 350 },
  commentsList: { paddingVertical: 10 },
  commentItem: {
    backgroundColor: "rgba(41, 37, 36, 0.8)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  commentUser: { flex: 1 },
  commentUserName: { color: "#FFF9C4", fontSize: 14, fontWeight: "600" },
  commentTime: { color: "rgba(255, 215, 0, 0.6)", fontSize: 11 },
  commentContent: { color: "#FFF9C4", fontSize: 14, lineHeight: 20 },
  emptyComments: { padding: 20, alignItems: "center" },
  emptyCommentsText: { color: "rgba(255, 249, 196, 0.6)", fontSize: 14 },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 215, 0, 0.1)",
    paddingTop: 15,
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(41, 37, 36, 0.8)",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#FFF9C4",
    marginRight: 10,
    maxHeight: 80,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: { alignItems: "center", justifyContent: "center", padding: 20 },
  emptyStateText: {
    color: "rgba(255, 249, 196, 0.6)",
    fontSize: 16,
    textAlign: "center",
  },
  friendsSection: { flex: 1, paddingHorizontal: 15 },
  friendsTabs: {
    flexDirection: "row",
    paddingVertical: 10,
    backgroundColor: "rgba(41, 37, 36, 0.3)",
    borderRadius: 12,
    marginTop: 10,
  },
  friendTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeFriendTab: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  friendTabText: {
    color: "rgba(255, 249, 196, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  activeFriendTabText: { color: "#FFD700", fontWeight: "600" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(41, 37, 36, 0.7)",
    borderRadius: 12,
    marginVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    height: 44,
    color: "#FFF9C4",
    fontSize: 16,
  },
  userList: { paddingBottom: 100 },
  userCard: {
    backgroundColor: "rgba(41, 37, 36, 0.7)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  userHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfo: { flex: 1 },
  userName: { color: "#FFF9C4", fontSize: 18, fontWeight: "600" },
  userSubtitle: { color: "rgba(255, 215, 0, 0.7)", fontSize: 12, marginTop: 2 },
  userActions: { flexDirection: "row", justifyContent: "space-between" },
  userAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  requestSubtitle: {
    color: "#FFF9C4",
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 10,
  },
  noResultsText: {
    color: "rgba(255, 249, 196, 0.7)",
    fontSize: 14,
    paddingVertical: 10,
    textAlign: "center",
  },
  requestList: { paddingBottom: 100 },
  friendCard: {
    backgroundColor: "rgba(41, 37, 36, 0.7)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  friendActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  statusText: { color: "rgba(255, 249, 196, 0.8)", fontSize: 12 },
  requestCancelButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  requestCancelButtonText: {
    color: "#FFCCCC",
    fontSize: 12,
    fontWeight: "600",
  },
  friendRequestActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  acceptButton: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  acceptButtonText: { color: "#CCFFCC", fontSize: 14, fontWeight: "600" },
  declineButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  declineButtonText: { color: "#FFCCCC", fontSize: 14, fontWeight: "600" },
  friendsList: { paddingBottom: 100 },
  removeButton: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  removeButtonText: {
    color: "#FF6B6B",
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
    backgroundColor: "#292524",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    color: "#FFF9C4",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },
  modalText: {
    color: "rgba(255, 249, 196, 0.9)",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  formGroup: { marginBottom: 15 },
  formLabel: {
    color: "#FFF9C4",
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
    borderColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
    backgroundColor: "rgba(41, 37, 36, 0.5)",
  },
  selectedTypeOption: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "rgba(255, 215, 0, 0.5)",
  },
  typeOptionText: { color: "#FFF9C4", fontSize: 14, fontWeight: "500" },
  formInput: {
    backgroundColor: "#1C1917",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
    color: "#FFF9C4",
    padding: 12,
    fontSize: 16,
  },
  formTextarea: {
    backgroundColor: "#1C1917",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
    color: "#FFF9C4",
    padding: 12,
    height: 120,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  cancelButtonText: { color: "#FFF9C4", fontSize: 14, fontWeight: "600" },
  createButton: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  createButtonText: { color: "#FFF9C4", fontSize: 14, fontWeight: "600" },
  deleteButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.4)",
  },
  deleteButtonText: { color: "#FFCCCC", fontSize: 14, fontWeight: "600" },
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
});
