import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Animated,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

// Type definitions
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image?: string;
  phone_number?: string;
  denomination?: string;
}

interface PrayerIntention {
  id: number;
  user_id: string;
  title: string;
  description: string;
  type: string;
  visibility: string;
  selected_groups?: string;
  selected_friends?: any;
  selected_church?: number;
  completed: boolean;
  favorite: boolean;
  created_at: string;
  user?: User;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

interface Friend {
  id: number;
  user_id_1: string;
  user_id_2: string;
  status: string;
  created_at: string;
  friend?: User;
}

interface Group {
  id: number;
  name: string;
  description: string;
  created_by: string;
  church_id?: number;
  is_ministry_group: boolean;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

interface Comment {
  id: number;
  user_id: string;
  commentable_id: number;
  commentable_type: string;
  content: string;
  created_at: string;
  user?: User;
}

// Tab component
const TabButton = ({ title, isActive, onPress, icon }: any) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.activeTabButton]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons
      name={icon}
      size={20}
      color={isActive ? "#6366F1" : "#6B7280"}
    />
    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
      {title}
    </Text>
  </TouchableOpacity>
);

export default function PrayerSocialScreen() {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();

  // State management
  const [activeTab, setActiveTab] = useState("feed");
  const [intentions, setIntentions] = useState<PrayerIntention[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [notificationCount, setNotificationCount] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadInitialData();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadIntentions(),
        loadFriends(),
        loadGroups(),
        loadNotificationCount(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationCount = async () => {
    if (!user) return;

    try {
      // Count unread friend requests
      const friendRequests = await crud.select("friends", {
        where: { user_id_2: user.id, status: "pending" },
      });

      // Count recent prayer intentions from friends (last 24 hours)
      const friendships = await crud.select("friends", {
        where: { status: "accepted" },
      });

      const userFriendIds = friendships
        .filter(f => f.user_id_1 === user.id || f.user_id_2 === user.id)
        .map(f => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1);

      const recentIntentions = await crud.select("intentions", {
        where: { visibility: "friends" },
      });

      const recentFriendIntentions = recentIntentions.filter(intention => {
        if (!userFriendIds.includes(intention.user_id) || intention.user_id === user.id) {
          return false;
        }
        const isRecent = new Date().getTime() - new Date(intention.created_at).getTime() < 24 * 60 * 60 * 1000;
        return isRecent;
      });

      setNotificationCount(friendRequests.length + recentFriendIntentions.length);
    } catch (error) {
      console.error("Error loading notification count:", error);
    }
  };

  const loadIntentions = async () => {
    try {
      // Load intentions based on visibility permissions
      const intentionsData = await crud.select("intentions");

      // Filter based on visibility and user permissions
      const visibleIntentions = await filterVisibleIntentions(intentionsData);
      
      // Load user data for each intention
      const intentionsWithUsers = await Promise.all(
        visibleIntentions.map(async (intention) => {
          const userData = await crud.selectOne("users", {
            where: { id: intention.user_id },
          });
          
          // Get likes count
          const likes = await crud.select("likes", {
            where: {
              likeable_id: intention.id,
              likeable_type: "intention",
            },
          });
          
          // Check if current user liked
          const userLike = likes.find(like => like.user_id === user?.id);
          
          // Get comments count
          const comments = await crud.select("comments", {
            where: {
              commentable_id: intention.id,
              commentable_type: "intention",
            },
          });

          return {
            ...intention,
            user: userData,
            likes_count: likes.length,
            comments_count: comments.length,
            is_liked: !!userLike,
          };
        })
      );

      // Sort by created_at in descending order (newest first)
      const sortedIntentions = intentionsWithUsers.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setIntentions(sortedIntentions);
    } catch (error) {
      console.error("Error loading intentions:", error);
    }
  };

  const filterVisibleIntentions = async (intentions: any[]) => {
    if (!user) return [];

    const visibleIntentions = [];
    const userFriends = await getUserFriends();
    const userGroups = await getUserGroups();

    for (const intention of intentions) {
      // Always show user's own intentions
      if (intention.user_id === user.id) {
        visibleIntentions.push(intention);
        continue;
      }

      // Check visibility settings
      switch (intention.visibility) {
        case "private":
          // Only visible to the owner
          break;
        case "friends":
          // Check if user is friends with intention owner
          if (userFriends.some(f => 
            (f.user_id_1 === intention.user_id || f.user_id_2 === intention.user_id) &&
            f.status === "accepted"
          )) {
            visibleIntentions.push(intention);
          }
          break;
        case "groups":
          // Check if user shares groups with intention owner
          if (intention.selected_groups) {
            const selectedGroupIds = JSON.parse(intention.selected_groups);
            if (userGroups.some(g => selectedGroupIds.includes(g.id))) {
              visibleIntentions.push(intention);
            }
          }
          break;
        case "custom":
          // Check if user is in selected friends
          if (intention.selected_friends) {
            const selectedFriends = intention.selected_friends;
            if (selectedFriends.includes(user.id)) {
              visibleIntentions.push(intention);
            }
          }
          break;
      }
    }

    return visibleIntentions;
  };

  const getUserFriends = async () => {
    if (!user) return [];
    
    const friendships = await crud.select("friends", {
      where: { status: "accepted" },
    });
    
    return friendships.filter(f => 
      f.user_id_1 === user.id || f.user_id_2 === user.id
    );
  };

  const getUserGroups = async () => {
    if (!user) return [];
    
    // This would need a group_members table in a real implementation
    // For now, returning all groups where user is creator
    return await crud.select("groups", {
      where: { created_by: user.id },
    });
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
            friend: friendData,
          };
        })
      );

      setFriends(friendsWithData);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const loadGroups = async () => {
    try {
      const groupsData = await crud.select("groups");

      // Sort by created_at in descending order (newest first)
      const sortedGroups = groupsData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setGroups(sortedGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleLikeIntention = async (intentionId: number) => {
    if (!user) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const intention = intentions.find(i => i.id === intentionId);
      if (!intention) return;

      if (intention.is_liked) {
        // Unlike
        await crud.delete("likes", {
          user_id: user.id,
          likeable_id: intentionId,
          likeable_type: "intention",
        });
      } else {
        // Like
        await crud.insert("likes", {
          user_id: user.id,
          likeable_id: intentionId,
          likeable_type: "intention",
        });
      }

      // Update local state
      setIntentions(intentions.map(i => 
        i.id === intentionId 
          ? {
              ...i,
              is_liked: !i.is_liked,
              likes_count: i.is_liked ? (i.likes_count || 1) - 1 : (i.likes_count || 0) + 1,
            }
          : i
      ));
    } catch (error) {
      console.error("Error liking intention:", error);
    }
  };

  const renderIntentionCard = ({ item }: { item: PrayerIntention }) => (
    <TouchableOpacity
      style={styles.intentionCard}
      onPress={() => router.push(`/prayer-social/intention/${item.id}` as any)}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
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
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
      </View>

      <Text style={styles.intentionTitle}>{item.title}</Text>
      <Text style={styles.intentionDescription} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLikeIntention(item.id)}
        >
          <Ionicons
            name={item.is_liked ? "heart" : "heart-outline"}
            size={20}
            color={item.is_liked ? "#EF4444" : "#6B7280"}
          />
          <Text style={styles.actionText}>{item.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/prayer-social/intention/${item.id}` as any)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
          <Text style={styles.actionText}>{item.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="hands" size={20} color="#6B7280" />
          <Text style={styles.actionText}>Pray</Text>
        </TouchableOpacity>

        {item.completed && (
          <View style={styles.answeredBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.answeredText}>Answered</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFeedTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["all", "friends", "groups", "favorites", "answered"].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                filterType === filter && styles.activeFilterChip,
              ]}
              onPress={() => setFilterType(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  filterType === filter && styles.activeFilterText,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={intentions.filter(i => {
          switch (filterType) {
            case "friends":
              return i.visibility === "friends";
            case "groups":
              return i.visibility === "groups";
            case "favorites":
              return i.favorite;
            case "answered":
              return i.completed;
            default:
              return true;
          }
        })}
        renderItem={renderIntentionCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Prayer Intentions</Text>
            <Text style={styles.emptyText}>
              Start sharing your prayers with the community
            </Text>
          </View>
        }
      />
    </View>
  );

  const renderFriendsTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/prayer-social/friends" as any)}
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.addButtonGradient}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Find Friends</Text>
        </LinearGradient>
      </TouchableOpacity>

      <FlatList
        data={friends}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.friendCard}>
            <View style={styles.avatar}>
              {item.friend?.profile_image ? (
                <Image source={{ uri: item.friend.profile_image }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={["#6366F1", "#8B5CF6"]}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {item.friend?.first_name?.[0]}{item.friend?.last_name?.[0]}
                  </Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>
                {item.friend?.first_name} {item.friend?.last_name}
              </Text>
              <Text style={styles.friendEmail}>{item.friend?.email}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Friends Yet</Text>
            <Text style={styles.emptyText}>
              Connect with others in your faith community
            </Text>
          </View>
        }
      />
    </View>
  );

  const renderGroupsTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/prayer-social/create-group" as any)}
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.addButtonGradient}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Create Group</Text>
        </LinearGradient>
      </TouchableOpacity>

      <FlatList
        data={groups}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupCard}
            onPress={() => router.push(`/prayer-social/group/${item.id}` as any)}
          >
            <View style={styles.groupHeader}>
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={24} color="#6366F1" />
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupDescription}>{item.description}</Text>
              </View>
            </View>
            {item.is_ministry_group && (
              <View style={styles.ministryBadge}>
                <FontAwesome5 name="church" size={12} color="#6366F1" />
                <Text style={styles.ministryText}>Ministry Group</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-circle-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptyText}>
              Join or create a prayer group
            </Text>
          </View>
        }
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F9FAFB", "#F3F4F6"]}
        style={styles.backgroundGradient}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prayer Community</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push("/prayer-social/notifications" as any)}
        >
          <Ionicons name="notifications-outline" size={24} color="#111827" />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>{notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton
          title="Feed"
          icon="home"
          isActive={activeTab === "feed"}
          onPress={() => setActiveTab("feed")}
        />
        <TabButton
          title="Friends"
          icon="people"
          isActive={activeTab === "friends"}
          onPress={() => setActiveTab("friends")}
        />
        <TabButton
          title="Groups"
          icon="people-circle"
          isActive={activeTab === "groups"}
          onPress={() => setActiveTab("groups")}
        />
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {activeTab === "feed" && renderFeedTab()}
        {activeTab === "friends" && renderFriendsTab()}
        {activeTab === "groups" && renderGroupsTab()}
      </Animated.View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/prayer-social/create-intention" as any)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  backgroundGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  notificationButton: {
    padding: 8,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  activeTabButton: {
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
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  filterBar: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: "#6366F1",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  activeFilterText: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  intentionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  userDetails: {
    justifyContent: "center",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  timestamp: {
    fontSize: 12,
    color: "#6B7280",
  },
  typeTag: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4338CA",
  },
  intentionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  intentionDescription: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: "#6B7280",
  },
  answeredBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: 4,
  },
  answeredText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
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
  },
  addButton: {
    margin: 20,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  friendEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  groupDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  ministryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: "flex-start",
    gap: 4,
  },
  ministryText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4338CA",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});