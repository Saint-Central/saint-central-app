import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCRUD } from "../../utils/crudClient";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

interface Ministry {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  member_count?: number;
  private?: boolean;
  church_id?: number;
}

export default function JoinMinistryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ministryId = typeof params.ministryId === "string" ? parseInt(params.ministryId) : 0;
  
  // Initialize CRUD client and auth
  const { selectOne, insert, select } = useCRUD();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [joiningMinistry, setJoiningMinistry] = useState(false);
  const [userChurchId, setUserChurchId] = useState<number | null>(null);

  useEffect(() => {
    checkMembershipAndLoadData();
  }, [ministryId]);

  const checkMembershipAndLoadData = async () => {
    try {
      setLoading(true);

      if (!user) {
        console.log("[DEBUG] Join Screen - No user found");
        Alert.alert("Error", "Please log in to continue");
        router.back();
        return;
      }

      console.log(`[DEBUG] Join Screen - Starting membership check for ministry ${ministryId}`);
      console.log(`[DEBUG] Join Screen - User ID: ${user.id}`);

      // Check if user is already a member
      const membershipData = await selectOne("ministry_members", {
        select: "role",
        where: {
          ministry_id: ministryId,
          user_id: user.id,
          role: "member"
        }
      });

      console.log("[DEBUG] Join Screen - Raw membership query result:", membershipData);

      // If user is already a member, redirect to ministry detail
      if (membershipData) {
        console.log("[DEBUG] Join Screen - Found active membership, redirecting to detail screen");
        router.replace({
          pathname: "/(tabs)/ministry-chat",
          params: { id: ministryId },
        });
        return;
      }

      console.log("[DEBUG] Join Screen - No active membership found, continuing to join screen");

      // Get church ID
      const churchMember = await selectOne("church_members", {
        select: "church_id",
        where: { user_id: user.id }
      });

      if (churchMember) {
        setUserChurchId(churchMember.church_id);
      }

      // Load ministry details
      const ministryData = await selectOne("ministries", {
        where: { id: ministryId }
      });

      if (!ministryData) {
        console.error("[JOIN] Error loading ministry: Ministry not found");
        Alert.alert("Error", "Could not load ministry details");
        router.back();
        return;
      }

      setMinistry(ministryData);
    } catch (error) {
      console.error("[JOIN] Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMinistry = async () => {
    try {
      setJoiningMinistry(true);

      if (!user) {
        Alert.alert("Error", "Please log in to continue");
        return;
      }

      if (!userChurchId) {
        Alert.alert("Error", "You must be a member of a church to join");
        return;
      }

      // Check if user is church admin/owner
      const churchMember = await selectOne("church_members", {
        where: {
          user_id: user.id,
          church_id: userChurchId,
        },
      });

      const churchRole = churchMember?.role?.toLowerCase() || "";
      const isChurchAdmin = churchRole === "admin" || churchRole === "owner";

      if (ministry?.private && !isChurchAdmin) {
        // For private ministries, non-admins create a pending request
        await insert("ministry_members", {
          ministry_id: ministryId,
          user_id: user.id,
          church_id: userChurchId,
          joined_at: new Date().toISOString(),
          role: "pending", // Pending approval
        });

        Alert.alert(
          "Request Sent",
          "Your request to join this private ministry has been sent to the admins for approval.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        // For public ministries or church admins joining private ones, join immediately
        // Church admins get admin role, others get member role
        await insert("ministry_members", {
          ministry_id: ministryId,
          user_id: user.id,
          church_id: userChurchId,
          joined_at: new Date().toISOString(),
          role: isChurchAdmin ? "admin" : "member",
        });

        // Auto-create/join prayer group for this ministry
        try {
          // Check if a group already exists for this ministry
          const existingGroups = await select("groups", {
            where: { 
              name: `${ministry?.name} Prayer Group`,
              church_id: ministry?.church_id || userChurchId,
              is_ministry_group: true
            }
          });

          let groupId;
          if (existingGroups && existingGroups.length > 0) {
            // Group exists, use it
            groupId = existingGroups[0].id;
          } else {
            // Create a new group for this ministry
            const newGroup = await insert("groups", {
              name: `${ministry?.name} Prayer Group`,
              description: `Prayer group for ${ministry?.name} ministry members`,
              created_by: user.id,
              church_id: ministry?.church_id || userChurchId,
              is_ministry_group: true,
              ministry_id: ministryId,
              created_at: new Date().toISOString()
            });
            groupId = newGroup.id;
          }

          // Add user to the group
          const existingMembership = await select("group_members", {
            where: {
              group_id: groupId,
              user_id: user.id
            }
          });

          if (!existingMembership || existingMembership.length === 0) {
            await insert("group_members", {
              group_id: groupId,
              user_id: user.id,
              role: isChurchAdmin ? "admin" : "member",
              joined_at: new Date().toISOString()
            });
          }
        } catch (groupError) {
          console.error("Error creating/joining ministry prayer group:", groupError);
          // Don't block ministry join if group creation fails
        }

        // Navigate to ministry details
        router.replace({
          pathname: "/(tabs)/ministry-chat",
          params: { id: ministryId },
        });
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setJoiningMinistry(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading ministry details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Ministry</Text>
      </View>

      {/* Ministry Details */}
      <View style={styles.content}>
        {ministry?.image_url ? (
          <Image source={{ uri: ministry.image_url }} style={styles.ministryImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="people-circle-outline" size={80} color="#94A3B8" />
          </View>
        )}

        <View style={styles.ministryNameContainer}>
          <Text style={styles.ministryName}>{ministry?.name}</Text>
          {ministry?.private && (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
              <Text style={styles.privateBadgeText}>Private</Text>
            </View>
          )}
        </View>
        <Text style={styles.ministryDescription}>{ministry?.description}</Text>
        
        {ministry?.private && (
          <View style={styles.privateNotice}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
            <Text style={styles.privateNoticeText}>
              This is a private ministry. Your request to join will need to be approved by an admin.
            </Text>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{ministry?.member_count || 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.joinButton, joiningMinistry && styles.joiningButton]}
          onPress={handleJoinMinistry}
          disabled={joiningMinistry}
        >
          {joiningMinistry ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name={ministry?.private ? "time" : "people"} size={20} color="#FFFFFF" style={styles.joinIcon} />
              <Text style={styles.joinButtonText}>
                {ministry?.private ? "Request to Join" : "Join Ministry"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
  },
  content: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  ministryImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 24,
  },
  placeholderImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  ministryNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ministryName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  ministryDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 32,
  },
  statItem: {
    alignItems: "center",
    marginHorizontal: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2196F3",
  },
  statLabel: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  joinButton: {
    flexDirection: "row",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: "center",
  },
  joiningButton: {
    opacity: 0.7,
  },
  joinIcon: {
    marginRight: 8,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  privateBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  privateNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  privateNoticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
});
