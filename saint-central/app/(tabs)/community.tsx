import React, { useState, useEffect } from "react";
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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import { Link, router } from "expo-router";

// Interface definitions
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

export default function CommunityScreen() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab] = useState<TabType>("all");

  // Control whether to view my intentions or friends' intentions
  const [intentionsFilter, setIntentionsFilter] = useState<"mine" | "friends">(
    "mine"
  );

  // "Create" modal state
  const [showIntentionModal, setShowIntentionModal] = useState<boolean>(false);

  // "Edit" modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingIntention, setEditingIntention] = useState<Intention | null>(
    null
  );

  // Friends section state (used for friend search/requests)
  const [showFriendsSearch, setShowFriendsSearch] = useState<boolean>(false);
  // friendTab controls sub-tabs in Friends section: "search" | "requests" | "list"
  const [friendTab, setFriendTab] = useState<"search" | "requests" | "list">(
    "search"
  );

  // Friend requests
  const [sentRequests, setSentRequests] = useState<FriendRequestSent[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<
    FriendRequestIncoming[]
  >([]);
  // Accepted friends
  const [friends, setFriends] = useState<Friend[]>([]);

  // For creating new intentions
  const [newIntention, setNewIntention] = useState<{
    title: string;
    description: string;
    type: IntentionType;
  }>({
    title: "",
    description: "",
    type: "prayer",
  });

  // Notification for error/success messages
  const [notification, setNotification] = useState<Notification | null>(null);

  // "Delete confirmation" modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    intentionId: string | null;
  }>({
    isOpen: false,
    intentionId: null,
  });

  // New state: number of pending incoming friend requests for notification badge
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);

  // Fetch intentions when intentionsFilter or activeTab changes
  useEffect(() => {
    fetchIntentions();
  }, [intentionsFilter, activeTab]);

  // Fetch friend requests when Friends section is open and friendTab changes
  useEffect(() => {
    if (showFriendsSearch) {
      if (friendTab === "requests") {
        fetchFriendRequests();
      } else if (friendTab === "list") {
        fetchFriends();
      }
    }
  }, [showFriendsSearch, friendTab]);

  // Also, fetch incoming friend request count on mount and after friend-request actions
  useEffect(() => {
    fetchIncomingRequestsCount();
  }, []);

  // Auto-hide notifications after a few seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
        // Get friend IDs from accepted friend relationships
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

        if (friendIds.length > 0) {
          query = query.in("user_id", friendIds);
        } else {
          query = query.eq("user_id", "");
        }
      }

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;
      if (error) throw error;
      setIntentions(data || []);
    } catch (error: any) {
      console.error("Error fetching intentions:", error);
      setIntentions([]);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: "Error fetching intentions: " + errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(false);
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

      // Sent requests
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

      // Incoming requests
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
      // Update notification badge count
      setFriendRequestCount(formattedIncoming.length);
    } catch (error: any) {
      console.error("Error fetching friend requests:", error);
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      setNotification({
        message: "Error fetching friend requests: " + errorMessage,
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
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      setNotification({
        message: "Error fetching friends: " + errorMessage,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: `Error creating intention: ${errorMessage}`,
        type: "error",
      });
    }
  };

  const handleEditIntention = (intention: Intention): void => {
    setEditingIntention(intention);
    setShowEditModal(true);
  };

  const handleUpdateIntention = async (): Promise<void> => {
    if (!editingIntention) return;

    if (
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: `Error updating intention: ${errorMessage}`,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: `Error deleting intention: ${errorMessage}`,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: "Error fetching users: " + errorMessage,
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

      const { error } = await supabase.from("friends").insert({
        user_id_1: user.id,
        user_id_2: friendId,
        status: "pending",
      });

      if (error) throw error;

      setNotification({ message: "Friend request sent!", type: "success" });
      fetchIncomingRequestsCount();
    } catch (error: any) {
      console.error("Error adding friend:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: `Error adding friend: ${errorMessage}`,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: `Error accepting request: ${errorMessage}`,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: `Error declining request: ${errorMessage}`,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: `Error canceling request: ${errorMessage}`,
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setNotification({
        message: `Error removing friend: ${errorMessage}`,
        type: "error",
      });
    }
  };

  const renderIntentionCard = ({ item }: { item: Intention }): JSX.Element => {
    return (
      <View style={styles.intentionCard}>
        <View style={styles.intentionHeader}>
          <View style={styles.intentionTypeIcon}>
            {item.type === "prayer" ? (
              <FontAwesome name="hand-peace-o" size={18} color="#FFD700" />
            ) : item.type === "resolution" ? (
              <Feather name="book-open" size={18} color="#FFD700" />
            ) : (
              <Feather name="target" size={18} color="#FFD700" />
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
          <TouchableOpacity style={styles.intentionAction}>
            <Feather name="heart" size={16} color="#FFD700" />
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.intentionAction}>
            <Feather name="message-circle" size={16} color="#FFD700" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
          {intentionsFilter === "mine" && (
            <>
              <TouchableOpacity
                style={styles.intentionAction}
                onPress={() => handleEditIntention(item)}
              >
                <Feather name="edit" size={16} color="#FFD700" />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.intentionAction}
                onPress={() => handleDeleteClick(item.id)}
              >
                <Feather name="trash-2" size={16} color="#FFD700" />
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderUserCard = ({ item }: { item: UserData }): JSX.Element => {
    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userAvatar}>
            <Feather name="user" size={24} color="#FFD700" />
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
            <Feather name="message-circle" size={16} color="#FFD700" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userAction}
            onPress={() => handleAddFriend(item.id)}
          >
            <Feather name="heart" size={16} color="#FFD700" />
            <Text style={styles.actionText}>Add Friend</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSentRequestCard = ({
    item,
  }: {
    item: FriendRequestSent;
  }): JSX.Element => {
    return (
      <View style={styles.friendCard}>
        <View style={styles.userHeader}>
          <View style={styles.userAvatar}>
            <Feather name="user" size={24} color="#FFD700" />
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
            style={styles.cancelButton}
            onPress={() => handleCancelRequest(item.id)}
          >
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderIncomingRequestCard = ({
    item,
  }: {
    item: FriendRequestIncoming;
  }): JSX.Element => {
    return (
      <View style={styles.friendCard}>
        <View style={styles.userHeader}>
          <View style={styles.userAvatar}>
            <Feather name="user" size={24} color="#FFD700" />
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
  };

  const renderFriendCard = ({ item }: { item: Friend }): JSX.Element => {
    return (
      <View style={styles.friendCard}>
        <View style={styles.userHeader}>
          <View style={styles.userAvatar}>
            <Feather name="user" size={24} color="#FFD700" />
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
          <Feather name="trash-2" size={16} color="#FF6B6B" />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
            <Feather name="plus-circle" size={20} color="#FFD700" />
            <Text style={styles.headerButtonText}>Intention</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setShowFriendsSearch((prev) => !prev);
              setSearchQuery("");
              setUsers([]);
              setFriendTab("search");
            }}
          >
            <View style={styles.badgeContainer}>
              {showFriendsSearch ? (
                <Feather name="list" size={20} color="#FFD700" />
              ) : (
                <Feather name="user" size={20} color="#FFD700" />
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
              Friends' Intentions
            </Text>
          </TouchableOpacity>

          <Link href="/Lent2025" asChild>
            <TouchableOpacity style={styles.lentButton}>
              <Feather name="book-open" size={16} color="#FFFFFF" />
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
                  ? "You haven't created any intentions yet."
                  : "No friend intentions to display."}
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
                My Friends
              </Text>
            </TouchableOpacity>
          </View>

          {friendTab === "search" && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Search for Friends</Text>
              </View>

              <View style={styles.searchContainer}>
                <Feather
                  name="search"
                  size={20}
                  color="#FFD700"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name..."
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
                      Search for friends by name
                    </Text>
                  </View>
                }
              />
            </>
          )}

          {friendTab === "requests" && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Friend Requests</Text>
              </View>

              <Text style={styles.requestSubtitle}>Sent Requests</Text>
              {sentRequests.length === 0 ? (
                <Text style={styles.noResultsText}>
                  No pending sent requests.
                </Text>
              ) : (
                <FlatList
                  data={sentRequests}
                  renderItem={renderSentRequestCard}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.requestList}
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                />
              )}

              <Text style={styles.requestSubtitle}>Incoming Requests</Text>
              {incomingRequests.length === 0 ? (
                <Text style={styles.noResultsText}>
                  No pending incoming requests.
                </Text>
              ) : (
                <FlatList
                  data={incomingRequests}
                  renderItem={renderIncomingRequestCard}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.requestList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          )}

          {friendTab === "list" && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Friends</Text>
              </View>

              {friends.length === 0 ? (
                <Text style={styles.noResultsText}>
                  You have no friends yet.
                </Text>
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
        animationType="fade"
        onRequestClose={() => setShowIntentionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Intention</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newIntention.type === "prayer" && styles.selectedTypeOption,
                  ]}
                  onPress={() =>
                    setNewIntention({ ...newIntention, type: "prayer" })
                  }
                >
                  <Text style={styles.typeOptionText}>Prayer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newIntention.type === "resolution" &&
                      styles.selectedTypeOption,
                  ]}
                  onPress={() =>
                    setNewIntention({ ...newIntention, type: "resolution" })
                  }
                >
                  <Text style={styles.typeOptionText}>Resolution</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newIntention.type === "goal" && styles.selectedTypeOption,
                  ]}
                  onPress={() =>
                    setNewIntention({ ...newIntention, type: "goal" })
                  }
                >
                  <Text style={styles.typeOptionText}>Goal</Text>
                </TouchableOpacity>
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
      </Modal>

      {/* Edit Intention Modal */}
      <Modal
        visible={showEditModal && editingIntention !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingIntention(null);
        }}
      >
        {editingIntention && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Intention</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      editingIntention.type === "prayer" &&
                        styles.selectedTypeOption,
                    ]}
                    onPress={() =>
                      setEditingIntention({
                        ...editingIntention,
                        type: "prayer",
                      })
                    }
                  >
                    <Text style={styles.typeOptionText}>Prayer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      editingIntention.type === "resolution" &&
                        styles.selectedTypeOption,
                    ]}
                    onPress={() =>
                      setEditingIntention({
                        ...editingIntention,
                        type: "resolution",
                      })
                    }
                  >
                    <Text style={styles.typeOptionText}>Resolution</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      editingIntention.type === "goal" &&
                        styles.selectedTypeOption,
                    ]}
                    onPress={() =>
                      setEditingIntention({ ...editingIntention, type: "goal" })
                    }
                  >
                    <Text style={styles.typeOptionText}>Goal</Text>
                  </TouchableOpacity>
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
                  <Text style={styles.createButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
                <Text style={styles.deleteButtonText}>Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Indicator */}
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
  },
  notification: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    padding: 10,
    borderRadius: 5,
    zIndex: 50,
    alignItems: "center",
  },
  errorNotification: {
    backgroundColor: "#DC2626",
  },
  successNotification: {
    backgroundColor: "#10B981",
  },
  notificationText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  header: {
    flexDirection: "column",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.1)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF9C4",
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  badgeContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  headerButtonText: {
    color: "#FFF9C4",
    marginLeft: 6,
  },
  filterTabs: {
    flexDirection: "row",
    padding: 8,
    paddingBottom: 0,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterTab: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderWidth: 1,
  },
  filterTabText: {
    color: "rgba(255, 249, 196, 0.7)",
    fontSize: 12,
  },
  activeFilterTabText: {
    color: "#FFD700",
    fontWeight: "500",
  },
  lentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(147, 51, 234, 0.8)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  lentButtonText: {
    color: "#FFFFFF",
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  intentionList: {
    padding: 16,
    paddingBottom: 80,
  },
  intentionCard: {
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  intentionHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  intentionTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  intentionHeaderText: {
    flex: 1,
  },
  intentionTitle: {
    color: "#FFF9C4",
    fontSize: 16,
    fontWeight: "500",
  },
  intentionSubtitle: {
    color: "rgba(255, 215, 0, 0.7)",
    fontSize: 12,
  },
  intentionDescription: {
    color: "rgba(255, 249, 196, 0.8)",
    marginBottom: 12,
  },
  intentionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  intentionAction: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    color: "rgba(255, 249, 196, 0.7)",
    marginLeft: 4,
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    height: 100,
  },
  emptyStateText: {
    color: "rgba(255, 249, 196, 0.5)",
    fontSize: 14,
  },
  friendsSection: {
    flex: 1,
  },
  friendsTabs: {
    flexDirection: "row",
    padding: 8,
    paddingBottom: 0,
  },
  friendTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFriendTab: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderWidth: 1,
  },
  friendTabText: {
    color: "rgba(255, 249, 196, 0.7)",
    fontSize: 12,
  },
  activeFriendTabText: {
    color: "#FFD700",
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionTitle: {
    color: "#FFF9C4",
    fontSize: 18,
    fontWeight: "500",
  },
  backLink: {
    color: "#FFF9C4",
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#FFF9C4",
  },
  userList: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    color: "#FFF9C4",
    fontSize: 16,
    fontWeight: "500",
  },
  userSubtitle: {
    color: "rgba(255, 215, 0, 0.7)",
    fontSize: 12,
  },
  userActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  userAction: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestSubtitle: {
    color: "#FFF9C4",
    fontWeight: "600",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    color: "rgba(255, 249, 196, 0.7)",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  requestList: {
    padding: 16,
    paddingTop: 0,
  },
  friendCard: {
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  friendActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    color: "rgba(255, 249, 196, 0.7)",
    fontSize: 12,
  },
  cancelButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  cancelButtonText: {
    color: "#FFCCCC",
    fontSize: 12,
  },
  friendRequestActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 8,
    marginTop: 8,
  },
  acceptButton: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  acceptButtonText: {
    color: "#CCFFCC",
    fontSize: 12,
  },
  declineButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  declineButtonText: {
    color: "#FFCCCC",
    fontSize: 12,
  },
  friendsList: {
    padding: 16,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  removeButtonText: {
    color: "#FF6B6B",
    marginLeft: 4,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#292524",
    borderRadius: 12,
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    color: "#FFF9C4",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  modalText: {
    color: "rgba(255, 249, 196, 0.8)",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    color: "#FFF9C4",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  typeOption: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  selectedTypeOption: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  typeOptionText: {
    color: "#FFF9C4",
    fontSize: 12,
  },
  formInput: {
    backgroundColor: "#1C1917",
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderRadius: 8,
    color: "#FFF9C4",
    padding: 8,
  },
  formTextarea: {
    backgroundColor: "#1C1917",
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderRadius: 8,
    color: "#FFF9C4",
    padding: 8,
    height: 100,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  createButton: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderColor: "rgba(255, 215, 0, 0.3)",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  createButtonText: {
    color: "#FFF9C4",
  },
  deleteButton: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    borderColor: "rgba(220, 38, 38, 0.4)",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: "#FFCCCC",
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});
