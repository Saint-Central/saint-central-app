import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { Post } from "../types";
import Avatar from "./ui/Avatar";
import { formatDateTime } from "../utils/formatters";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onLike: (postId: string, isLiked: boolean) => void;
  onEdit?: (post: Post) => void;
  likeScaleAnim: Animated.Value;
  likeOpacityAnim: Animated.Value;
  onCommentPress?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onEdit,
  likeScaleAnim,
  likeOpacityAnim,
  onCommentPress,
}) => {
  // Track previous like state to detect changes
  const prevLikedRef = useRef(post.is_liked);

  // Animation sequence for like action
  useEffect(() => {
    // Only animate if like state has changed
    if (prevLikedRef.current !== post.is_liked) {
      if (post.is_liked) {
        // Trigger success haptic when post is liked
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Heart pop animation
        Animated.sequence([
          // First reset any existing animations
          Animated.timing(likeScaleAnim, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          // Pop animation
          Animated.spring(likeScaleAnim, {
            toValue: 1.2,
            friction: 4,
            tension: 300,
            useNativeDriver: true,
          }),
          // Return to normal size
          Animated.spring(likeScaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Background ripple effect
        Animated.sequence([
          Animated.timing(likeOpacityAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(likeOpacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Subtle haptic when unliking
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Subtle scale down and up for unlike
        Animated.sequence([
          Animated.timing(likeScaleAnim, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(likeScaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Update previous liked state
      prevLikedRef.current = post.is_liked;
    }
  }, [post.is_liked, likeScaleAnim, likeOpacityAnim]);

  const getPostTypeIcon = () => {
    switch (post.type) {
      case "prayer":
        return <FontAwesome name="hand-peace-o" size={14} color="#4299E1" />;
      case "resolution":
        return <Feather name="book-open" size={14} color="#4299E1" />;
      case "goal":
        return <Feather name="target" size={14} color="#4299E1" />;
      default:
        return <Feather name="message-circle" size={14} color="#4299E1" />;
    }
  };

  const formattedDate = formatDateTime(post.created_at).split("•")[0].trim();
  const formattedTime = formatDateTime(post.created_at).split("•")[1].trim();

  const handleCommentPress = () => {
    if (onCommentPress) {
      onCommentPress(post);
    }
  };

  const handleLikePress = () => {
    onLike(post.id, !!post.is_liked);
  };

  // Double tap to like functionality
  const lastTap = useRef(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (!post.is_liked) {
        onLike(post.id, false);
        // Haptic will be triggered by the useEffect when post.is_liked changes
      }
    }

    lastTap.current = now;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleCommentPress}
      style={styles.container}
    >
      <View style={styles.postHeader}>
        <Avatar size="md" imageUrl={(post.user as any).profile_image} />

        <View style={styles.headerContent}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName}>
              {post.user.first_name} {post.user.last_name}
            </Text>
            {post.user_id === currentUserId && (
              <View style={styles.authorPill}>
                <Text style={styles.authorPillText}>You</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.username}>
              @{post.user.first_name.toLowerCase()}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.timestamp}>{formattedDate}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.timestamp}>{formattedTime}</Text>
          </View>
        </View>

        <View style={styles.postTypeContainer}>
          {getPostTypeIcon()}
          <Text style={styles.postTypeText}>
            {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postBody}>{post.description}</Text>
      </View>

      {post.group_info && (
        <View style={styles.groupContainer}>
          <Feather name="users" size={14} color="#4299E1" />
          <Text style={styles.groupName}>{post.group_info.name}</Text>
        </View>
      )}

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleCommentPress();
          }}
          activeOpacity={0.7}
        >
          <Feather name="message-square" size={18} color="#718096" />
          {(post.comments_count ?? 0) > 0 && (
            <Text style={styles.actionCount}>{post.comments_count}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, post.is_liked && styles.likedButton]}
          onPress={(e) => {
            e.stopPropagation();
            handleLikePress();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.likeButtonContainer}>
            <Animated.View
              style={[styles.likeRipple, { opacity: likeOpacityAnim }]}
            />
            <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
              <Feather
                name={post.is_liked ? "heart" : "heart"}
                size={18}
                color={post.is_liked ? "#E53E3E" : "#718096"}
                solid={post.is_liked}
              />
            </Animated.View>
          </View>

          {(post.likes_count ?? 0) > 0 && (
            <Text
              style={[styles.actionCount, post.is_liked && styles.likedCount]}
            >
              {post.likes_count}
            </Text>
          )}
        </TouchableOpacity>

        {post.user_id === currentUserId && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onEdit && onEdit(post);
            }}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={18} color="#718096" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    backgroundColor: "#FFFFFF",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2D3748",
    marginRight: 6,
  },
  authorPill: {
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  authorPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3182CE",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  username: {
    fontSize: 13,
    color: "#718096",
    marginRight: 4,
  },
  metaDot: {
    fontSize: 13,
    color: "#A0AEC0",
    marginHorizontal: 4,
  },
  timestamp: {
    fontSize: 13,
    color: "#718096",
  },
  postTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  postTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3182CE",
    marginLeft: 4,
  },
  postContent: {
    marginTop: 12,
    marginBottom: 14,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A202C",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  postBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4A5568",
  },
  groupContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF8FF",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 14,
  },
  groupName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3182CE",
    marginLeft: 6,
  },
  actionBar: {
    flexDirection: "row",
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EDF2F7",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
    padding: 6,
  },
  likedButton: {
    opacity: 1,
  },
  likeButtonContainer: {
    position: "relative",
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  likeRipple: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(229, 62, 62, 0.2)",
  },
  actionCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#718096",
    marginLeft: 6,
  },
  likedCount: {
    color: "#E53E3E",
  },
});

export default PostCard;
