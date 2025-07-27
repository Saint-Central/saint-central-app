import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
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

interface PrayerIntention {
  id: number;
  user_id: string;
  title: string;
  description: string;
  type: string;
  visibility: string;
  selected_groups?: string;
  selected_friends?: any;
  completed: boolean;
  favorite: boolean;
  created_at: string;
  user?: User;
}

interface Comment {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

interface Like {
  id: number;
  user_id: string;
  created_at: string;
}

export default function PrayerIntentionDetailScreen() {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [intention, setIntention] = useState<PrayerIntention | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [praying, setPraying] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prayingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadIntentionDetails();
  }, [id]);

  const loadIntentionDetails = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);

      // Load intention
      const intentionData = await crud.selectOne("intentions", {
        where: { id: parseInt(id as string) },
      });

      if (!intentionData) {
        Alert.alert("Error", "Prayer intention not found");
        router.back();
        return;
      }

      // Load user data
      const userData = await crud.selectOne("users", {
        where: { id: intentionData.user_id },
      });

      // Load likes
      const likesData = await crud.select("likes", {
        where: {
          likeable_id: parseInt(id as string),
          likeable_type: "intention",
        },
      });

      // Load comments with user data
      const commentsData = await crud.select("comments", {
        where: {
          commentable_id: parseInt(id as string),
          commentable_type: "intention",
        },
      });

      const commentsWithUsers = await Promise.all(
        commentsData.map(async (comment) => {
          const commentUser = await crud.selectOne("users", {
            where: { id: comment.user_id },
          });
          return { ...comment, user: commentUser };
        })
      );

      // Sort comments by created_at (newest first)
      const sortedComments = commentsWithUsers.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setIntention({ ...intentionData, user: userData });
      setLikes(likesData);
      setComments(sortedComments);
      setIsLiked(likesData.some(like => like.user_id === user.id));
    } catch (error) {
      console.error("Error loading intention details:", error);
      Alert.alert("Error", "Failed to load prayer intention");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !intention) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Animate the heart
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (isLiked) {
        // Unlike
        const userLike = likes.find(like => like.user_id === user.id);
        if (userLike) {
          await crud.delete("likes", {
            id: userLike.id,
          });
          setLikes(likes.filter(l => l.id !== userLike.id));
        }
      } else {
        // Like
        const newLike = await crud.insert("likes", {
          user_id: user.id,
          likeable_id: intention.id,
          likeable_type: "intention",
        });
        setLikes([...likes, newLike]);
      }

      setIsLiked(!isLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handlePray = () => {
    if (!praying) {
      setPraying(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animate praying hands
      Animated.loop(
        Animated.sequence([
          Animated.timing(prayingAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(prayingAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ).start(() => {
        setPraying(false);
        Alert.alert("🙏 Prayer Sent", "Your prayer has been sent to heaven!");
      });
    }
  };

  const handleComment = async () => {
    if (!user || !intention || !newComment.trim()) return;

    try {
      setCommenting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const commentData = await crud.insert("comments", {
        user_id: user.id,
        commentable_id: intention.id,
        commentable_type: "intention",
        content: newComment.trim(),
      });

      const newCommentWithUser = {
        ...commentData,
        user: {
          id: user.id,
          email: user.email || "",
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          profile_image: user.profile_image,
        },
      };

      setComments([newCommentWithUser, ...comments]);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setCommenting(false);
    }
  };

  const handleComplete = async () => {
    if (!intention || intention.user_id !== user?.id) return;

    Alert.alert(
      "Mark as Answered",
      "Has this prayer been answered?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Praise God!",
          onPress: async () => {
            try {
              await crud.update("intentions", 
                { completed: true },
                { id: intention.id }
              );
              setIntention({ ...intention, completed: true });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Error marking as completed:", error);
              Alert.alert("Error", "Failed to update prayer status");
            }
          },
        },
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "prayer":
        return { icon: "hands", color: "#6366F1" };
      case "praise":
        return { icon: "heart", color: "#EC4899" };
      case "thanksgiving":
        return { icon: "gift", color: "#F59E0B" };
      case "intercession":
        return { icon: "people", color: "#10B981" };
      default:
        return { icon: "hands", color: "#6366F1" };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!intention) {
    return null;
  }

  const { icon: typeIcon, color: typeColor } = getTypeIcon(intention.type);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prayer Details</Text>
          {intention.user_id === user?.id && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                Alert.alert(
                  "Options",
                  "What would you like to do?",
                  [
                    { text: "Edit", onPress: () => {} },
                    { text: "Delete", onPress: () => {}, style: "destructive" },
                    { text: "Cancel", style: "cancel" },
                  ]
                );
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#111827" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Prayer Header */}
          <View style={styles.prayerHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                {intention.user?.profile_image ? (
                  <Image 
                    source={{ uri: intention.user.profile_image }} 
                    style={styles.avatarImage} 
                  />
                ) : (
                  <LinearGradient
                    colors={["#6366F1", "#8B5CF6"]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {intention.user?.first_name?.[0]}
                      {intention.user?.last_name?.[0]}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {intention.user?.first_name} {intention.user?.last_name}
                </Text>
                <Text style={styles.timestamp}>
                  {formatDate(intention.created_at)}
                </Text>
              </View>
            </View>
            
            <View style={[styles.typeTag, { backgroundColor: typeColor + "20" }]}>
              <FontAwesome5 name={typeIcon} size={14} color={typeColor} />
              <Text style={[styles.typeText, { color: typeColor }]}>
                {intention.type.charAt(0).toUpperCase() + intention.type.slice(1)}
              </Text>
            </View>
          </View>

          {/* Prayer Content */}
          <View style={styles.prayerContent}>
            <Text style={styles.prayerTitle}>{intention.title}</Text>
            <Text style={styles.prayerDescription}>{intention.description}</Text>
            
            {intention.completed && (
              <View style={styles.answeredBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.answeredText}>Prayer Answered!</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={24}
                  color={isLiked ? "#EF4444" : "#6B7280"}
                />
              </Animated.View>
              <Text style={[styles.actionText, isLiked && styles.likedText]}>
                {likes.length} {likes.length === 1 ? "Like" : "Likes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePray}
              activeOpacity={0.7}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: prayingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "10deg"],
                    }),
                  }],
                }}
              >
                <Ionicons
                  name="hands"
                  size={24}
                  color={praying ? "#6366F1" : "#6B7280"}
                />
              </Animated.View>
              <Text style={[styles.actionText, praying && styles.prayingText]}>
                {praying ? "Praying..." : "Pray"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={24} color="#6B7280" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

            {intention.user_id === user?.id && !intention.completed && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleComplete}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
                <Text style={[styles.actionText, { color: "#10B981" }]}>
                  Answered
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>
              Comments ({comments.length})
            </Text>

            {/* Add Comment */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#9CA3AF"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newComment.trim() || commenting) && styles.sendButtonDisabled,
                ]}
                onPress={handleComment}
                disabled={!newComment.trim() || commenting}
              >
                {commenting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAvatar}>
                    {comment.user?.profile_image ? (
                      <Image 
                        source={{ uri: comment.user.profile_image }} 
                        style={styles.commentAvatarImage} 
                      />
                    ) : (
                      <LinearGradient
                        colors={["#6366F1", "#8B5CF6"]}
                        style={styles.avatarGradient}
                      >
                        <Text style={styles.commentAvatarText}>
                          {comment.user?.first_name?.[0]}
                          {comment.user?.last_name?.[0]}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.commentInfo}>
                    <Text style={styles.commentAuthor}>
                      {comment.user?.first_name} {comment.user?.last_name}
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatDate(comment.created_at)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.commentText}>{comment.content}</Text>
              </View>
            ))}

            {comments.length === 0 && (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>
                  Be the first to comment
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardView: {
    flex: 1,
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
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  prayerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "#FFFFFF",
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
  timestamp: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  prayerContent: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  prayerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  prayerDescription: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 24,
  },
  answeredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 16,
    gap: 6,
  },
  answeredText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  actionButtons: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  likedText: {
    color: "#EF4444",
  },
  prayingText: {
    color: "#6366F1",
  },
  commentsSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 40,
    fontSize: 16,
    color: "#111827",
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  commentCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  commentTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  commentText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginLeft: 46,
  },
  emptyComments: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyCommentsText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});