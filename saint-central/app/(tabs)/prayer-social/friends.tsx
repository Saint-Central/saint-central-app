import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image?: string;
  denomination?: string;
}

interface FriendRequest {
  id: number;
  user_id_1: string;
  user_id_2: string;
  status: string;
  created_at: string;
  user?: User;
}

export default function FriendsScreen() {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // Only load data for non-search tabs
    if (activeTab !== "search") {
      loadData();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "search":
          // Don't auto-search on tab switch
          break;
        case "friends":
          await loadFriends();
          break;
        case "requests":
          await loadRequests();
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!user) return;
    
    // Require search query
    if (!searchQuery.trim()) {
      Alert.alert("Search Required", "Please enter a name to search for friends.");
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      
      const allUsers = await crud.select("users");
      
      // Filter by search query (name only, not email)
      const searchResults = allUsers.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`;
        return u.id !== user.id && 
               fullName.toLowerCase().includes(searchQuery.toLowerCase());
      });
      
      // Sort users alphabetically by first name
      const sortedUsers = searchResults.sort((a, b) => 
        (a.first_name || '').localeCompare(b.first_name || '')
      );

      // Filter out existing friends and pending requests
      const friendships = await crud.select("friends");
      const userFriendIds = friendships
        .filter(f => 
          (f.user_id_1 === user.id || f.user_id_2 === user.id) &&
          (f.status === "accepted" || f.status === "pending")
        )
        .map(f => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1);

      const filteredUsers = sortedUsers.filter(u => !userFriendIds.includes(u.id));

      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Error", "Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    if (!user) return;

    try {
      const friendships = await crud.select("friends", {
        where: { status: "accepted" },
      });

      const userFriendships = friendships.filter(f => 
        f.user_id_1 === user.id || f.user_id_2 === user.id
      );

      const friendsWithData = await Promise.all(
        userFriendships.map(async (friendship) => {
          const friendId = friendship.user_id_1 === user.id 
            ? friendship.user_id_2 
            : friendship.user_id_1;
          
          const friendData = await crud.selectOne("users", {
            where: { id: friendId },
          });

          return {
            ...friendship,
            user: friendData,
          };
        })
      );

      setFriends(friendsWithData.filter(f => f.user));
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const loadRequests = async () => {
    if (!user) return;

    try {
      const allRequests = await crud.select("friends", {
        where: { status: "pending" },
      });

      // Sent requests
      const sent = allRequests.filter(r => r.user_id_1 === user.id);
      const sentWithData = await Promise.all(
        sent.map(async (request) => {
          const userData = await crud.selectOne("users", {
            where: { id: request.user_id_2 },
          });
          return { ...request, user: userData };
        })
      );
      setSentRequests(sentWithData.filter(r => r.user));

      // Received requests
      const received = allRequests.filter(r => r.user_id_2 === user.id);
      const receivedWithData = await Promise.all(
        received.map(async (request) => {
          const userData = await crud.selectOne("users", {
            where: { id: request.user_id_1 },
          });
          return { ...request, user: userData };
        })
      );
      setReceivedRequests(receivedWithData.filter(r => r.user));
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    if (!user) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await crud.insert("friends", {
        user_id_1: user.id,
        user_id_2: targetUserId,
        status: "pending",
      });

      Alert.alert("Success", "Friend request sent!");
      await searchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const acceptFriendRequest = async (requestId: number) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await crud.update("friends", 
        { status: "accepted" },
        { id: requestId }
      );

      Alert.alert("Success", "Friend request accepted!");
      await loadRequests();
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const declineFriendRequest = async (requestId: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await crud.delete("friends", { id: requestId });

      Alert.alert("Success", "Friend request declined");
      await loadRequests();
    } catch (error) {
      console.error("Error declining friend request:", error);
      Alert.alert("Error", "Failed to decline friend request");
    }
  };

  const removeFriend = async (friendshipId: number, friendName: string) => {
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await crud.delete("friends", { id: friendshipId });
              Alert.alert("Success", "Friend removed");
              await loadFriends();
            } catch (error) {
              console.error("Error removing friend:", error);
              Alert.alert("Error", "Failed to remove friend");
            }
          },
        },
      ]
    );
  };

  const renderUserCard = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {item.first_name?.[0]}{item.last_name?.[0]}
              </Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>
            {item.first_name} {item.last_name}
          </Text>
          {item.denomination && (
            <Text style={styles.userDenomination}>{item.denomination}</Text>
          )}
          {item.denomination && (
            <Text style={styles.userDenomination}>{item.denomination}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => sendFriendRequest(item.id)}
      >
        <Ionicons name="person-add" size={20} color="#6366F1" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFriendCard = ({ item }: { item: FriendRequest }) => (
    <TouchableOpacity style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          {item.user?.profile_image ? (
            <Image source={{ uri: item.user.profile_image }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {item.user?.first_name?.[0]}{item.user?.last_name?.[0]}
              </Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>
            {item.user?.first_name} {item.user?.last_name}
          </Text>
          {item.user?.denomination && (
            <Text style={styles.userDenomination}>{item.user.denomination}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFriend(item.id, `${item.user?.first_name} ${item.user?.last_name}`)}
      >
        <Ionicons name="person-remove" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRequestCard = ({ item, type }: { item: FriendRequest; type: "sent" | "received" }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          {item.user?.profile_image ? (
            <Image source={{ uri: item.user.profile_image }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {item.user?.first_name?.[0]}{item.user?.last_name?.[0]}
              </Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>
            {item.user?.first_name} {item.user?.last_name}
          </Text>
          {item.user?.denomination && (
            <Text style={styles.userDenomination}>{item.user.denomination}</Text>
          )}
          <Text style={styles.requestStatus}>
            {type === "sent" ? "Request sent" : "Wants to be your friend"}
          </Text>
        </View>
      </View>
      {type === "received" && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => acceptFriendRequest(item.id)}
          >
            <Ionicons name="checkmark" size={20} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => declineFriendRequest(item.id)}
          >
            <Ionicons name="close" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with SafeArea */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "search" && styles.activeTab]}
          onPress={() => setActiveTab("search")}
        >
          <Text style={[styles.tabText, activeTab === "search" && styles.activeTabText]}>
            Find Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "friends" && styles.activeTab]}
          onPress={() => setActiveTab("friends")}
        >
          <Text style={[styles.tabText, activeTab === "friends" && styles.activeTabText]}>
            My Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.activeTab]}
          onPress={() => setActiveTab("requests")}
        >
          <Text style={[styles.tabText, activeTab === "requests" && styles.activeTabText]}>
            Requests ({receivedRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {activeTab === "search" && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchUsers}
              returnKeyType="search"
            />
            {searchQuery.trim() && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearchQuery("");
                  setUsers([]);
                  setHasSearched(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchUsers}
          >
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.searchButtonGradient}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <>
          {activeTab === "search" && (
            <FlatList
              data={users}
              renderItem={renderUserCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadData} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="search" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>
                    {!hasSearched ? "Search for Friends" : "No Users Found"}
                  </Text>
                  <Text style={styles.emptyText}>
                    {!hasSearched 
                      ? "Enter a name above to find friends" 
                      : "Try searching with a different name"}
                  </Text>
                </View>
              }
            />
          )}

          {activeTab === "friends" && (
            <FlatList
              data={friends}
              renderItem={renderFriendCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadData} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>No Friends Yet</Text>
                  <Text style={styles.emptyText}>
                    Start by searching and adding friends
                  </Text>
                </View>
              }
            />
          )}

          {activeTab === "requests" && (
            <>
              {receivedRequests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Received Requests</Text>
                  <FlatList
                    data={receivedRequests}
                    renderItem={({ item }) => renderRequestCard({ item, type: "received" })}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listSection}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              )}
              
              {sentRequests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Sent Requests</Text>
                  <FlatList
                    data={sentRequests}
                    renderItem={({ item }) => renderRequestCard({ item, type: "sent" })}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listSection}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              )}

              {receivedRequests.length === 0 && sentRequests.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="mail" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>No Friend Requests</Text>
                  <Text style={styles.emptyText}>
                    When you send or receive friend requests, they'll appear here
                  </Text>
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerSafeArea: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366F1",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#6366F1",
    fontWeight: "600",
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "relative",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
  },
  clearButton: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  searchButton: {
    height: 40,
  },
  searchButtonGradient: {
    height: "100%",
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 20,
  },
  listSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  userDenomination: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    fontStyle: "italic",
  },
  requestStatus: {
    fontSize: 12,
    color: "#6366F1",
    marginTop: 2,
    fontStyle: "italic",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});