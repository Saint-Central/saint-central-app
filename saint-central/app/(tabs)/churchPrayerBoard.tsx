import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Switch,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useCRUD } from "../../utils/crudClient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

// Prayer request interface
interface PrayerRequest {
  id: number;
  church_id: number;
  user_id: string;
  user_name?: string;
  content: string;
  is_anonymous: boolean;
  prayer_count: number;
  created_at: string;
  updated_at: string;
}

// Prayer interaction interface
interface PrayerInteraction {
  id: number;
  prayer_request_id: number;
  user_id: string;
  created_at: string;
}

const ChurchPrayerBoard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { select, selectOne, insert, update, delete: deleteRecord } = useCRUD();

  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prayerContent, setPrayerContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userChurchId, setUserChurchId] = useState<number | null>(null);
  const [userInteractions, setUserInteractions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchUserChurch();
  }, [user]);

  useEffect(() => {
    if (userChurchId) {
      fetchPrayers();
      fetchUserInteractions();
    }
  }, [userChurchId]);

  const fetchUserChurch = async () => {
    try {
      if (!user) return;

      const churchMember = await selectOne("church_members", {
        where: { user_id: user.id }
      });

      if (churchMember) {
        setUserChurchId(churchMember.church_id);
      } else {
        Alert.alert("No Church", "You need to be a member of a church to access the prayer board.");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching user church:", error);
    }
  };

  const fetchPrayers = async () => {
    try {
      setLoading(true);

      const prayerRequests = await select("prayer_requests", {
        where: { church_id: userChurchId }
      });

      if (prayerRequests) {
        // Fetch user names for non-anonymous prayers
        const prayersWithNames = await Promise.all(
          prayerRequests.map(async (prayer) => {
            if (!prayer.is_anonymous && prayer.user_id) {
              const userData = await selectOne("users", {
                select: "first_name, last_name",
                where: { id: prayer.user_id }
              });
              
              return {
                ...prayer,
                user_name: userData ? `${userData.first_name || ""} ${userData.last_name || ""}`.trim() : "Anonymous"
              };
            }
            return { ...prayer, user_name: "Anonymous" };
          })
        );

        // Sort by created_at descending (newest first)
        const sortedPrayers = prayersWithNames.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setPrayers(sortedPrayers);
      }
    } catch (error) {
      console.error("Error fetching prayers:", error);
      Alert.alert("Error", "Failed to load prayer requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInteractions = async () => {
    try {
      if (!user) return;

      const interactions = await select("prayer_interactions", {
        where: { user_id: user.id }
      });

      if (interactions) {
        const interactionSet = new Set(interactions.map(i => i.prayer_request_id));
        setUserInteractions(interactionSet);
      }
    } catch (error) {
      console.error("Error fetching user interactions:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrayers();
    await fetchUserInteractions();
    setRefreshing(false);
  };

  const handleSubmitPrayer = async () => {
    if (!prayerContent.trim()) {
      Alert.alert("Error", "Please enter your prayer request");
      return;
    }

    try {
      setSubmitting(true);

      await insert("prayer_requests", {
        church_id: userChurchId,
        user_id: user?.id,
        content: prayerContent.trim(),
        is_anonymous: isAnonymous,
        prayer_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      Alert.alert("Success", "Your prayer request has been posted");
      setShowAddModal(false);
      setPrayerContent("");
      setIsAnonymous(false);
      fetchPrayers();
    } catch (error) {
      console.error("Error submitting prayer:", error);
      Alert.alert("Error", "Failed to submit prayer request");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrayFor = async (prayerId: number) => {
    try {
      if (!user) {
        Alert.alert("Error", "Please sign in to pray for others");
        return;
      }

      // Check if user already prayed for this
      if (userInteractions.has(prayerId)) {
        Alert.alert("Already Prayed", "You have already prayed for this request today");
        return;
      }

      // Add interaction
      await insert("prayer_interactions", {
        prayer_request_id: prayerId,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      // Update prayer count
      const prayer = prayers.find(p => p.id === prayerId);
      if (prayer) {
        await update(
          "prayer_requests",
          { 
            prayer_count: (prayer.prayer_count || 0) + 1,
            updated_at: new Date().toISOString()
          },
          { id: prayerId }
        );
      }

      // Update local state
      setUserInteractions(prev => new Set(prev).add(prayerId));
      setPrayers(prev => prev.map(p => 
        p.id === prayerId 
          ? { ...p, prayer_count: (p.prayer_count || 0) + 1 }
          : p
      ));

      Alert.alert("🙏", "Thank you for praying!");
    } catch (error) {
      console.error("Error recording prayer:", error);
      Alert.alert("Error", "Failed to record your prayer");
    }
  };

  const handleDeletePrayer = async (prayerId: number, prayerUserId: string) => {
    // Only allow deletion by the prayer author
    if (user?.id !== prayerUserId) {
      Alert.alert("Error", "You can only delete your own prayer requests");
      return;
    }

    Alert.alert(
      "Delete Prayer",
      "Are you sure you want to delete this prayer request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete interactions first
              await deleteRecord("prayer_interactions", {
                prayer_request_id: prayerId
              });

              // Then delete the prayer
              await deleteRecord("prayer_requests", {
                id: prayerId
              });

              fetchPrayers();
              Alert.alert("Success", "Prayer request deleted");
            } catch (error) {
              console.error("Error deleting prayer:", error);
              Alert.alert("Error", "Failed to delete prayer request");
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading prayer board...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#2196F3", "#1976D2"]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prayer Board</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Prayer List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {prayers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Prayer Requests Yet</Text>
            <Text style={styles.emptyText}>Be the first to share a prayer request</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add Prayer Request</Text>
            </TouchableOpacity>
          </View>
        ) : (
          prayers.map((prayer) => (
            <View key={prayer.id} style={styles.prayerCard}>
              <View style={styles.prayerHeader}>
                <View style={styles.authorInfo}>
                  <Ionicons 
                    name={prayer.is_anonymous ? "person-outline" : "person"} 
                    size={20} 
                    color="#64748B" 
                  />
                  <Text style={styles.authorName}>{prayer.user_name}</Text>
                  <Text style={styles.prayerTime}>{formatDate(prayer.created_at)}</Text>
                </View>
                {user?.id === prayer.user_id && (
                  <TouchableOpacity
                    onPress={() => handleDeletePrayer(prayer.id, prayer.user_id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.prayerContent}>{prayer.content}</Text>

              <View style={styles.prayerFooter}>
                <TouchableOpacity
                  style={[
                    styles.prayButton,
                    userInteractions.has(prayer.id) && styles.prayButtonActive
                  ]}
                  onPress={() => handlePrayFor(prayer.id)}
                  disabled={userInteractions.has(prayer.id)}
                >
                  <Ionicons 
                    name={userInteractions.has(prayer.id) ? "heart" : "heart-outline"} 
                    size={20} 
                    color={userInteractions.has(prayer.id) ? "#EF4444" : "#64748B"} 
                  />
                  <Text style={[
                    styles.prayButtonText,
                    userInteractions.has(prayer.id) && styles.prayButtonTextActive
                  ]}>
                    {userInteractions.has(prayer.id) ? "Prayed" : "Pray"}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.prayerCount}>
                  {prayer.prayer_count || 0} {prayer.prayer_count === 1 ? "prayer" : "prayers"}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Prayer Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Prayer Request</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.prayerInput}
              placeholder="Share your prayer request..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={6}
              value={prayerContent}
              onChangeText={setPrayerContent}
              textAlignVertical="top"
            />

            <View style={styles.anonymousToggle}>
              <Text style={styles.anonymousLabel}>Post Anonymously</Text>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: "#E2E8F0", true: "#2196F3" }}
                thumbColor={isAnonymous ? "#FFFFFF" : "#F3F4F6"}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitPrayer}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Post Prayer Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
  },
  prayerTime: {
    fontSize: 12,
    color: "#94A3B8",
    marginLeft: 8,
  },
  deleteButton: {
    padding: 4,
  },
  prayerContent: {
    fontSize: 16,
    color: "#334155",
    lineHeight: 24,
    marginBottom: 12,
  },
  prayerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  prayButtonActive: {
    backgroundColor: "#FEE2E2",
  },
  prayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginLeft: 6,
  },
  prayButtonTextActive: {
    color: "#EF4444",
  },
  prayerCount: {
    fontSize: 14,
    color: "#64748B",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  prayerInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 120,
    marginBottom: 16,
  },
  anonymousToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 20,
  },
  anonymousLabel: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default ChurchPrayerBoard;