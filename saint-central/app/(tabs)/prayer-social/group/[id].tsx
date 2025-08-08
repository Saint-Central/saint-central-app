import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
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
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image?: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
  created_by: string;
  church_id?: number;
  is_ministry_group: boolean;
  ministry_id?: number;
  created_at: string;
  creator?: User;
}

interface GroupMember {
  id: number;
  group_id: number;
  user_id: string;
  role: string;
  joined_at: string;
  user?: User;
}

interface PrayerIntention {
  id: number;
  user_id: string;
  title: string;
  description: string;
  type: string;
  visibility: string;
  selected_groups?: string;
  completed: boolean;
  created_at: string;
  user?: User;
  likes_count?: number;
  comments_count?: number;
}

export default function GroupDetailScreen() {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [prayers, setPrayers] = useState<PrayerIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("prayers");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadGroupDetails();
    animateIn();
  }, [id]);

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

  const loadGroupDetails = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);

      // Load group details
      const groupData = await crud.selectOne("groups", {
        where: { id: parseInt(id as string) },
      });

      if (!groupData) {
        Alert.alert("Error", "Group not found");
        router.back();
        return;
      }

      // Load creator data
      const creatorData = await crud.selectOne("users", {
        where: { id: groupData.created_by },
      });

      const groupWithCreator = { ...groupData, creator: creatorData };
      setGroup(groupWithCreator);
      setIsAdmin(groupData.created_by === user.id);

      // Load members (pass group data)
      await loadMembers(groupWithCreator);

      // Load group prayers
      await loadGroupPrayers();
    } catch (error) {
      console.error("Error loading group details:", error);
      Alert.alert("Error", "Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (groupData?: Group) => {
    if (!id || !user) return;
    
    // Use passed group data or state
    const currentGroup = groupData || group;

    try {
      // Get group members from group_members table
      const groupMembers = await crud.select("group_members", {
        where: { group_id: parseInt(id as string) },
      });

      // Get user data for each member
      const membersWithData = await Promise.all(
        groupMembers.map(async (member) => {
          const userData = await crud.selectOne("users", {
            where: { id: member.user_id },
          });

          return {
            ...member,
            user: userData,
          };
        })
      );

      setMembers(membersWithData.filter(m => m.user));
      
      // Check if current user is a member
      const userMembership = groupMembers.find(m => m.user_id === user.id);
      setIsMember(!!userMembership);
      
      // Check if user is admin
      if (userMembership) {
        setIsAdmin(userMembership.role === "admin");
      }
      
      // If this is a ministry group and user is not a member, check if they're in the ministry
      if (!userMembership && currentGroup?.is_ministry_group && currentGroup?.ministry_id) {
        const ministryMembership = await crud.selectOne("ministry_members", {
          where: { 
            ministry_id: currentGroup.ministry_id,
            user_id: user.id
          },
        });
        
        if (ministryMembership && (ministryMembership.role === "member" || ministryMembership.role === "admin")) {
          // User is in the ministry, so they should be in the group
          setIsMember(true);
          // If they're a ministry admin, they should be a group admin too
          if (ministryMembership.role === "admin") {
            setIsAdmin(true);
          }
        }
      }
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const loadGroupPrayers = async () => {
    if (!id) return;

    try {
      // Load all intentions that include this group
      const allIntentions = await crud.select("intentions", {
        where: { visibility: "groups" },
      });

      // Filter intentions that include this group
      const groupIntentions = allIntentions.filter(intention => {
        if (intention.selected_groups) {
          const selectedGroups = JSON.parse(intention.selected_groups);
          return selectedGroups.includes(parseInt(id as string));
        }
        return false;
      });

      // Load user data for each intention
      const intentionsWithUsers = await Promise.all(
        groupIntentions.map(async (intention) => {
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
          };
        })
      );

      // Sort by created_at (newest first)
      const sortedPrayers = intentionsWithUsers.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPrayers(sortedPrayers);
    } catch (error) {
      console.error("Error loading group prayers:", error);
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !group) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // In a real app, you'd insert into group_members table
      Alert.alert("Success", "You've joined the group!");
      setIsMember(true);
      await loadMembers();
    } catch (error) {
      console.error("Error joining group:", error);
      Alert.alert("Error", "Failed to join group");
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !group) return;

    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              // In a real app, you'd delete from group_members table
              Alert.alert("Success", "You've left the group");
              setIsMember(false);
              router.back();
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert("Error", "Failed to leave group");
            }
          },
        },
      ]
    );
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    try {
      // In a real app, you'd send an invitation
      Alert.alert("Success", `Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (error) {
      console.error("Error inviting member:", error);
      Alert.alert("Error", "Failed to send invitation");
    }
  };

  const handleDeleteGroup = async () => {
    if (!group || !isAdmin) return;

    Alert.alert(
      "Delete Group",
      "Are you sure you want to delete this group? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await crud.delete("groups", { id: group.id });
              Alert.alert("Success", "Group deleted successfully");
              router.replace("/prayer-social" as any);
            } catch (error) {
              console.error("Error deleting group:", error);
              Alert.alert("Error", "Failed to delete group");
            }
          },
        },
      ]
    );
  };

  const renderPrayerCard = ({ item }: { item: PrayerIntention }) => (
    <TouchableOpacity
      style={styles.prayerCard}
      onPress={() => router.push(`/prayer-social/intention/${item.id}` as any)}
      activeOpacity={0.9}
    >
      <View style={styles.prayerHeader}>
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

      <Text style={styles.prayerTitle}>{item.title}</Text>
      <Text style={styles.prayerDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.prayerFooter}>
        <View style={styles.stat}>
          <Ionicons name="heart-outline" size={16} color="#6B7280" />
          <Text style={styles.statText}>{item.likes_count || 0}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
          <Text style={styles.statText}>{item.comments_count || 0}</Text>
        </View>
        {item.completed && (
          <View style={styles.answeredBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.answeredText}>Answered</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMemberCard = ({ item }: { item: GroupMember }) => (
    <View style={styles.memberCard}>
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
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.user?.first_name} {item.user?.last_name}
        </Text>
        <Text style={styles.memberRole}>
          {item.role === "admin" ? "Group Admin" : "Member"}
        </Text>
      </View>
      {item.role === "admin" && (
        <View style={styles.adminBadge}>
          <FontAwesome5 name="crown" size={12} color="#F59E0B" />
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!group) {
    return null;
  }

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {group.name}
        </Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => {
              Alert.alert(
                "Group Options",
                "What would you like to do?",
                [
                  { text: "Edit Group", onPress: () => {} },
                  { text: "Delete Group", onPress: handleDeleteGroup, style: "destructive" },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#111827" />
          </TouchableOpacity>
        )}
      </View>

      {/* Group Hero Section */}
      <Animated.View
        style={[
          styles.heroSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.heroGradient}
        >
          <View style={styles.groupIcon}>
            <Ionicons name="people-circle" size={64} color="#FFFFFF" />
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDescription}>{group.description}</Text>
          
          {group.is_ministry_group && (
            <View style={styles.ministryBadge}>
              <FontAwesome5 name="church" size={14} color="#FFFFFF" />
              <Text style={styles.ministryText}>Ministry Group</Text>
            </View>
          )}

          <View style={styles.groupStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{members.length}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{prayers.length}</Text>
              <Text style={styles.statLabel}>Prayers</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        {!isMember ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleJoinGroup}
          >
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.buttonGradient}
            >
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Join Group</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : group?.is_ministry_group ? (
          <View style={styles.enrolledBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.enrolledText}>Enrolled via Ministry</Text>
          </View>
        ) : (
          <>
            {isAdmin && !group?.is_ministry_group && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowInviteModal(true)}
              >
                <Ionicons name="mail" size={20} color="#6366F1" />
                <Text style={styles.secondaryButtonText}>Invite Members</Text>
              </TouchableOpacity>
            )}
            {!isAdmin && (
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={handleLeaveGroup}
              >
                <Ionicons name="exit-outline" size={20} color="#EF4444" />
                <Text style={styles.leaveButtonText}>Leave Group</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "prayers" && styles.activeTab]}
          onPress={() => setActiveTab("prayers")}
        >
          <Text style={[styles.tabText, activeTab === "prayers" && styles.activeTabText]}>
            Prayers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "members" && styles.activeTab]}
          onPress={() => setActiveTab("members")}
        >
          <Text style={[styles.tabText, activeTab === "members" && styles.activeTabText]}>
            Members ({members.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "prayers" ? (
        <FlatList
          data={prayers}
          renderItem={renderPrayerCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadGroupPrayers();
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="hands" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Prayers Yet</Text>
              <Text style={styles.emptyText}>
                Be the first to share a prayer with this group
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={members}
          renderItem={renderMemberCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Members</Text>
              <Text style={styles.emptyText}>
                Invite people to join this group
              </Text>
            </View>
          }
        />
      )}

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInviteModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={() => {}}
            >
              <Text style={styles.modalTitle}>Invite Members</Text>
              <Text style={styles.modalDescription}>
                Enter the email address of the person you'd like to invite
              </Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setInviteEmail("");
                    setShowInviteModal(false);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitButton}
                  onPress={handleInviteMember}
                >
                  <LinearGradient
                    colors={["#6366F1", "#8B5CF6"]}
                    style={styles.modalSubmitGradient}
                  >
                    <Text style={styles.modalSubmitText}>Send Invite</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
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
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginHorizontal: 16,
    textAlign: "center",
  },
  menuButton: {
    padding: 8,
  },
  heroSection: {
    backgroundColor: "#FFFFFF",
  },
  heroGradient: {
    padding: 24,
    alignItems: "center",
  },
  groupIcon: {
    marginBottom: 16,
  },
  groupName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  groupDescription: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  ministryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 20,
  },
  ministryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  groupStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  actionSection: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  primaryButton: {
    overflow: "hidden",
    borderRadius: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  enrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1FAE5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  enrolledText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#6366F1",
    borderRadius: 8,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6366F1",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
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
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  prayerCard: {
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
  prayerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    flex: 1,
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
  prayerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  prayerDescription: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  prayerFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
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
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  memberRole: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  adminBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalSubmitButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  modalSubmitGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});