import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCRUD } from "../../utils/crudClient";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import theme from "@/theme";

interface Ministry {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  member_count?: number;
  private?: boolean;
  church_id?: number;
  church_name?: string;
}

export default function JoinMinistryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ministryId = typeof params.ministryId === "string" ? parseInt(params.ministryId) : 0;
  const insets = useSafeAreaInsets();
  
  // Initialize CRUD client and auth
  const { selectOne, insert, select } = useCRUD();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [joiningMinistry, setJoiningMinistry] = useState(false);
  const [userChurchId, setUserChurchId] = useState<number | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

      // Get actual member count for this ministry (all active members)
      const memberCounts = await select("ministry_members", {
        select: "role",
        where: { ministry_id: ministryId }
      });

      console.log("[JOIN] Raw member data:", memberCounts);

      // Filter out any non-member roles like 'pending'
      const activeMemberCount = memberCounts?.filter(member => 
        member.role === "member" || member.role === "admin"
      ).length || 0;
      
      console.log("[JOIN] Active member count:", activeMemberCount);
      
      ministryData.member_count = activeMemberCount;

      // Get church information
      if (ministryData.church_id) {
        const churchData = await selectOne("churches", {
          select: "name",
          where: { id: ministryData.church_id }
        });
        
        if (churchData) {
          ministryData.church_name = churchData.name;
        }
      }

      setMinistry(ministryData);
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
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
              is_ministry_group: true
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
              role: isChurchAdmin ? "admin" : "member"
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
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Animated.View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color={theme.primary} />
          </Animated.View>
          <Text style={styles.loadingText}>Loading ministry details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.pageBg} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ministry Details</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Ministry Card */}
        <Animated.View 
          style={[
            styles.ministryCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Image Section */}
          <View style={styles.imageSection}>
            {ministry?.image_url ? (
              <Image source={{ uri: ministry.image_url }} style={styles.ministryImage} />
            ) : (
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.placeholderImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="church" size={32} color="#000" />
              </LinearGradient>
            )}
            
            {ministry?.private && (
              <View style={styles.privateBadge}>
                <Ionicons name="lock-closed" size={10} color={theme.pageBg} />
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.ministryName} numberOfLines={2}>{ministry?.name}</Text>
            
            {ministry?.church_name && (
              <View style={styles.churchRow}>
                <MaterialCommunityIcons name="church" size={14} color={theme.textLight} />
                <Text style={styles.churchName}>{ministry.church_name}</Text>
              </View>
            )}
            
            <View style={styles.memberRow}>
              <MaterialCommunityIcons name="account-group" size={14} color={theme.primary} />
              <Text style={styles.memberCount}>
                {ministry?.member_count || 0} {(ministry?.member_count || 0) === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Description Card */}
        <Animated.View 
          style={[
            styles.descriptionCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="text" size={18} color={theme.primary} />
            <Text style={styles.cardTitle}>About This Ministry</Text>
          </View>
          <Text style={styles.descriptionText}>
            {ministry?.description || "No description available."}
          </Text>
        </Animated.View>

        {/* Private Notice */}
        {ministry?.private && (
          <Animated.View 
            style={[
              styles.noticeCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="shield-lock" size={18} color={theme.warning} />
              <Text style={[styles.cardTitle, { color: theme.warning }]}>Private Ministry</Text>
            </View>
            <Text style={styles.noticeText}>
              This ministry requires approval to join. Your request will be reviewed by ministry administrators.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <Animated.View
          style={[
            styles.joinButtonContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: fadeAnim }],
            }
          ]}
        >
          <TouchableOpacity
            style={[styles.joinButton, joiningMinistry && styles.disabledButton]}
            onPress={handleJoinMinistry}
            disabled={joiningMinistry}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={joiningMinistry ? [theme.neutral600, theme.neutral700] : theme.gradientPrimary}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {joiningMinistry ? (
                <>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonTextDisabled}>Processing...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name={ministry?.private ? "clock-outline" : "account-plus"} 
                    size={18} 
                    color="#000" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={styles.buttonText}>
                    {ministry?.private ? "Request to Join" : "Join Ministry"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245, 158, 11, 0.1)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.textWhite,
    textAlign: "center",
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  
  // Scroll Container
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  
  // Ministry Card
  ministryCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  
  // Image Section
  imageSection: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  ministryImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  privateBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: theme.warning,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Info Section
  infoSection: {
    alignItems: "center",
    gap: 8,
  },
  ministryName: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.textWhite,
    textAlign: "center",
    letterSpacing: -0.7,
    lineHeight: 26,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  churchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  churchName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.textLight,
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberCount: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primary,
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  
  // Description Card
  descriptionCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.1)",
  },
  
  // Notice Card
  noticeCard: {
    backgroundColor: "rgba(251, 191, 36, 0.05)",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  
  // Card Headers
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textWhite,
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  
  // Text Styles
  descriptionText: {
    fontSize: 15,
    fontWeight: "400",
    color: theme.textLight,
    lineHeight: 22,
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  noticeText: {
    fontSize: 14,
    fontWeight: "400",
    color: theme.textLight,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  
  // Bottom Container
  bottomContainer: {
    backgroundColor: theme.pageBg,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(245, 158, 11, 0.1)",
  },
  
  // Join Button
  joinButtonContainer: {
    width: "100%",
  },
  joinButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  disabledButton: {
    opacity: 0.8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  buttonTextDisabled: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCircle: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    letterSpacing: -0.2,
    opacity: 0.9,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});
