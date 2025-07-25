import React, { useState, useEffect, useRef } from "react";
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
  Dimensions,
  Animated,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useCRUD } from "../../utils/crudClient";
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
// import MaskedView from "@react-native-masked-view/masked-view";

const { width, height } = Dimensions.get("window");

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

// Animated components
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

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
  
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const floatingButtonScale = useRef(new Animated.Value(0)).current;
  const prayerAnimations = useRef<Map<number, Animated.Value>>(new Map()).current;
  const modalScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserChurch();
    // Animate floating button on mount
    Animated.spring(floatingButtonScale, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
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

  const getPrayerAnimation = (prayerId: number) => {
    if (!prayerAnimations.has(prayerId)) {
      prayerAnimations.set(prayerId, new Animated.Value(0));
    }
    return prayerAnimations.get(prayerId)!;
  };

  const animatePrayer = (prayerId: number) => {
    const anim = getPrayerAnimation(prayerId);
    Animated.sequence([
      Animated.spring(anim, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: 0,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
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

      // Haptic feedback
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Animate the prayer action
      animatePrayer(prayerId);
      
      // Custom success notification instead of alert
      // Alert.alert("🙏", "Thank you for praying!");
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

  // Animated header style
  const headerStyle = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, 100],
          outputRange: [0, -50],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Animated Background Gradient */}
      <Animated.View style={[StyleSheet.absoluteFill]}>
        <LinearGradient
          colors={["#F0F9FF", "#E0E7FF", "#DBEAFE"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      
      <SafeAreaView style={styles.safeArea}>
        {/* Animated Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <BlurView intensity={95} tint="light" style={styles.headerBlur}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <BlurView intensity={20} tint="light" style={styles.buttonBlur}>
                <Ionicons name="arrow-back" size={24} color="#1E40AF" />
              </BlurView>
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: "#E0E7FF" }]}>Prayer Board</Text>
            
            <View style={{ width: 40 }} />
          </BlurView>
        </Animated.View>

        {/* Prayer List */}
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#6366F1"
              colors={["#6366F1", "#8B5CF6"]}
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {prayers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Animated.View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={["#E0E7FF", "#C7D2FE"]}
                  style={styles.emptyIconGradient}
                >
                  <FontAwesome5 name="praying-hands" size={48} color="#6366F1" />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.emptyTitle}>No Prayer Requests Yet</Text>
              <Text style={styles.emptyText}>Share your heart with the community</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowAddModal(true)}
              >
                <LinearGradient
                  colors={["#6366F1", "#8B5CF6"]}
                  style={styles.emptyButtonGradient}
                >
                  <Text style={styles.emptyButtonText}>Share First Prayer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            prayers.map((prayer, index) => {
              const prayerAnim = getPrayerAnimation(prayer.id);
              const animatedScale = prayerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.05],
              });
              
              return (
                <Animated.View 
                  key={prayer.id} 
                  style={[
                    styles.prayerCard,
                    {
                      transform: [{ scale: animatedScale }],
                      opacity: scrollY.interpolate({
                        inputRange: [index * 150 - 100, index * 150, index * 150 + 100],
                        outputRange: [0.7, 1, 0.7],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                >
                  <BlurView intensity={80} tint="light" style={styles.cardBlur}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
                      style={styles.cardGradient}
                    >
                      <View style={styles.prayerHeader}>
                        <View style={styles.authorInfo}>
                          <LinearGradient
                            colors={prayer.is_anonymous ? ["#E0E7FF", "#C7D2FE"] : ["#DDD6FE", "#C4B5FD"]}
                            style={styles.avatarGradient}
                          >
                            <Ionicons 
                              name={prayer.is_anonymous ? "person-outline" : "person"} 
                              size={16} 
                              color="#6366F1" 
                            />
                          </LinearGradient>
                          <Text style={styles.authorName}>{prayer.user_name}</Text>
                          <View style={styles.timeDot} />
                          <Text style={styles.prayerTime}>{formatDate(prayer.created_at)}</Text>
                        </View>
                        {user?.id === prayer.user_id && (
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              handleDeletePrayer(prayer.id, prayer.user_id);
                            }}
                            style={styles.deleteButton}
                          >
                            <BlurView intensity={20} tint="light" style={styles.deleteButtonBlur}>
                              <Feather name="trash-2" size={16} color="#EF4444" />
                            </BlurView>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={styles.prayerContent}>{prayer.content}</Text>

                      <View style={styles.prayerFooter}>
                        <AnimatedTouchable
                          style={[
                            styles.prayButton,
                            {
                              transform: [
                                {
                                  scale: prayerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.2],
                                  }),
                                },
                              ],
                            },
                          ]}
                          onPress={() => {
                            if (!userInteractions.has(prayer.id)) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            handlePrayFor(prayer.id);
                          }}
                          disabled={userInteractions.has(prayer.id)}
                        >
                          <LinearGradient
                            colors={
                              userInteractions.has(prayer.id)
                                ? ["#FEE2E2", "#FECACA"]
                                : ["#F3F4F6", "#E5E7EB"]
                            }
                            style={styles.prayButtonGradient}
                          >
                            <Ionicons 
                              name={userInteractions.has(prayer.id) ? "heart" : "heart-outline"} 
                              size={20} 
                              color={userInteractions.has(prayer.id) ? "#EF4444" : "#6B7280"} 
                            />
                            <Text style={[
                              styles.prayButtonText,
                              userInteractions.has(prayer.id) && styles.prayButtonTextActive
                            ]}>
                              {userInteractions.has(prayer.id) ? "Prayed" : "Pray"}
                            </Text>
                          </LinearGradient>
                        </AnimatedTouchable>
                        
                        <View style={styles.prayerCountContainer}>
                          <LinearGradient
                            colors={["#F3F4F6", "#E5E7EB"]}
                            style={styles.prayerCountGradient}
                          >
                            <FontAwesome5 name="praying-hands" size={12} color="#6B7280" />
                            <Text style={styles.prayerCount}>
                              {prayer.prayer_count || 0}
                            </Text>
                          </LinearGradient>
                        </View>
                      </View>
                    </LinearGradient>
                  </BlurView>
                </Animated.View>
              );
            })
          )}
      </Animated.ScrollView>

      {/* Floating Action Button */}
      <AnimatedTouchable
        style={[
          styles.floatingButton,
          {
            transform: [
              {
                scale: floatingButtonScale,
              },
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, 100],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowAddModal(true);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6", "#EC4899"]}
          style={styles.floatingButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </AnimatedTouchable>

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
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <Animated.View style={[{
                transform: [{
                  scale: modalScale.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                }],
              }]}>
                <BlurView intensity={95} tint="dark" style={styles.modalContent}>
                <LinearGradient
                  colors={["rgba(30, 27, 75, 0.95)", "rgba(17, 24, 39, 0.98)"]}
                  style={styles.modalGradient}
                >
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: "#E0E7FF" }]}>New Prayer Request</Text>
                    <TouchableOpacity 
                      onPress={() => setShowAddModal(false)}
                      style={styles.modalCloseButton}
                    >
                      <BlurView intensity={20} tint="light" style={styles.modalCloseBlur}>
                        <Ionicons name="close" size={20} color="#E0E7FF" />
                      </BlurView>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.prayerInputContainer}>
                    <BlurView intensity={20} tint="light" style={styles.prayerInputBlur}>
                      <TextInput
                        style={styles.prayerInput}
                        placeholder="Share your heart with the community..."
                        placeholderTextColor="#6B7280"
                        multiline
                        numberOfLines={6}
                        value={prayerContent}
                        onChangeText={setPrayerContent}
                        textAlignVertical="top"
                      />
                    </BlurView>
                  </View>

                  <View style={styles.anonymousToggle}>
                    <View style={styles.anonymousToggleLeft}>
                      <LinearGradient
                        colors={["#6366F1", "#8B5CF6"]}
                        style={styles.anonymousIcon}
                      >
                        <Ionicons name="eye-off" size={16} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={styles.anonymousLabel}>Post Anonymously</Text>
                    </View>
                    <Switch
                      value={isAnonymous}
                      onValueChange={(value) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsAnonymous(value);
                      }}
                      trackColor={{ false: "rgba(156, 163, 175, 0.3)", true: "rgba(99, 102, 241, 0.5)" }}
                      thumbColor={isAnonymous ? "#6366F1" : "#E0E7FF"}
                      ios_backgroundColor="rgba(156, 163, 175, 0.3)"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmitPrayer}
                    disabled={submitting}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={submitting ? ["#9CA3AF", "#6B7280"] : ["#6366F1", "#8B5CF6", "#EC4899"]}
                      style={styles.submitButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="send" size={20} color="#FFFFFF" />
                          <Text style={styles.submitButtonText}>Share Prayer</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </BlurView>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0E1E",
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F0E1E",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "500",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 44,
  },
  headerBlur: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  buttonBlur: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "transparent",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 120,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E0E7FF",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#94A3B8",
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 30,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  prayerCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  cardBlur: {
    borderRadius: 20,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 20,
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
  avatarGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 10,
  },
  timeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6B7280",
    marginHorizontal: 8,
  },
  prayerTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  deleteButtonBlur: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  prayerContent: {
    fontSize: 16,
    color: "#1E293B",
    lineHeight: 24,
    marginBottom: 16,
    fontWeight: "500",
  },
  prayerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prayButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  prayButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  prayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },
  prayButtonTextActive: {
    color: "#EF4444",
  },
  prayerCountContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  prayerCountGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  prayerCount: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 6,
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingButtonGradient: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    maxHeight: height * 0.85,
  },
  modalGradient: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "transparent",
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  modalCloseBlur: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  prayerInputContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
  },
  prayerInputBlur: {
    padding: 4,
  },
  prayerInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: "#E0E7FF",
    minHeight: 160,
    textAlignVertical: "top",
    fontWeight: "500",
  },
  anonymousToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderRadius: 16,
    marginBottom: 24,
  },
  anonymousToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  anonymousIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  anonymousLabel: {
    fontSize: 16,
    color: "#E0E7FF",
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});

export default ChurchPrayerBoard;