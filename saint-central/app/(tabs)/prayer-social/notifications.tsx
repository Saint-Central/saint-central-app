import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedId?: number;
  relatedType?: string;
  fromUser?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image?: string;
  };
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // In a real app, you'd have a notifications table
      // For now, we'll simulate notifications based on recent prayer intentions
      const mockNotifications: Notification[] = [];

      // Get friend requests
      const friendRequests = await crud.select("friends", {
        where: { user_id_2: user.id, status: "pending" },
      });

      for (const request of friendRequests) {
        const fromUser = await crud.selectOne("users", {
          where: { id: request.user_id_1 },
        });

        if (fromUser) {
          mockNotifications.push({
            id: `friend-${request.id}`,
            type: "friend_request",
            title: "Friend Request",
            message: `${fromUser.first_name} ${fromUser.last_name} wants to be your friend`,
            timestamp: request.created_at,
            read: false,
            relatedId: request.id,
            relatedType: "friend_request",
            fromUser: {
              id: fromUser.id,
              first_name: fromUser.first_name,
              last_name: fromUser.last_name,
              profile_image: fromUser.profile_image,
            },
          });
        }
      }

      // Get recent prayer intentions from friends
      const friendships = await crud.select("friends", {
        where: { status: "accepted" },
      });

      const userFriendIds = friendships
        .filter(f => f.user_id_1 === user.id || f.user_id_2 === user.id)
        .map(f => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1);

      const recentIntentions = await crud.select("intentions", {
        where: { visibility: "friends" },
      });

      for (const intention of recentIntentions) {
        if (userFriendIds.includes(intention.user_id) && intention.user_id !== user.id) {
          const intentionUser = await crud.selectOne("users", {
            where: { id: intention.user_id },
          });

          if (intentionUser) {
            // Check if this intention was created in the last 24 hours
            const isRecent = new Date().getTime() - new Date(intention.created_at).getTime() < 24 * 60 * 60 * 1000;
            
            if (isRecent) {
              mockNotifications.push({
                id: `intention-${intention.id}`,
                type: "new_prayer",
                title: "New Prayer Intention",
                message: `${intentionUser.first_name} ${intentionUser.last_name} shared a ${intention.type} prayer`,
                timestamp: intention.created_at,
                read: false,
                relatedId: intention.id,
                relatedType: "intention",
                fromUser: {
                  id: intentionUser.id,
                  first_name: intentionUser.first_name,
                  last_name: intentionUser.last_name,
                  profile_image: intentionUser.profile_image,
                },
              });
            }
          }
        }
      }

      // Get group invitations (simulated)
      const groups = await crud.select("groups");
      
      // Add some mock group invitations
      const recentGroups = groups.filter(group => {
        const isRecent = new Date().getTime() - new Date(group.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
        return isRecent && group.created_by !== user.id;
      });

      for (const group of recentGroups.slice(0, 2)) {
        const groupCreator = await crud.selectOne("users", {
          where: { id: group.created_by },
        });

        if (groupCreator) {
          mockNotifications.push({
            id: `group-invite-${group.id}`,
            type: "group_invitation",
            title: "Group Invitation",
            message: `You're invited to join "${group.name}"`,
            timestamp: group.created_at,
            read: false,
            relatedId: group.id,
            relatedType: "group",
            fromUser: {
              id: groupCreator.id,
              first_name: groupCreator.first_name,
              last_name: groupCreator.last_name,
              profile_image: groupCreator.profile_image,
            },
          });
        }
      }

      // Sort notifications by timestamp (newest first)
      const sortedNotifications = mockNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setNotifications(sortedNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark as read
    setNotifications(notifications.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    ));

    // Navigate based on notification type
    switch (notification.type) {
      case "new_prayer":
        if (notification.relatedId) {
          router.push(`/prayer-social/intention/${notification.relatedId}` as any);
        }
        break;
      case "friend_request":
        router.push("/prayer-social/friends" as any);
        break;
      case "group_invitation":
        if (notification.relatedId) {
          router.push(`/prayer-social/group/${notification.relatedId}` as any);
        }
        break;
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_prayer":
        return <Ionicons name="hands" size={20} color="#6366F1" />;
      case "friend_request":
        return <Ionicons name="person-add" size={20} color="#10B981" />;
      case "group_invitation":
        return <Ionicons name="people" size={20} color="#F59E0B" />;
      default:
        return <Ionicons name="notifications" size={20} color="#6B7280" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.9}
    >
      <View style={styles.notificationIcon}>
        {getNotificationIcon(item.type)}
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          {item.fromUser && (
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                {item.fromUser.profile_image ? (
                  <Image 
                    source={{ uri: item.fromUser.profile_image }} 
                    style={styles.avatarImage} 
                  />
                ) : (
                  <LinearGradient
                    colors={["#6366F1", "#8B5CF6"]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {item.fromUser.first_name?.[0]}
                      {item.fromUser.last_name?.[0]}
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>
          )}
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        
        <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
          {item.title}
        </Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
      </View>

      {!item.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markReadButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification Stats */}
      {unreadCount > 0 && (
        <View style={styles.statsBar}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="notifications" size={16} color="#FFFFFF" />
            <Text style={styles.statsText}>
              {unreadCount} new {unreadCount === 1 ? "notification" : "notifications"}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadNotifications();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              When you receive new prayer requests or friend invitations, they'll appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
  markReadButton: {
    padding: 8,
  },
  markReadText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
  statsBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statsGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  statsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  listContent: {
    padding: 20,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  timestamp: {
    fontSize: 12,
    color: "#6B7280",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  unreadText: {
    color: "#4F46E5",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6366F1",
    marginLeft: 12,
    alignSelf: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});