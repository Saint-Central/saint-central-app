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
  onLike: (id: string, isLiked: boolean) => void;
  onComment: (postId: string) => void;
  onEdit?: (post: Post) => void;
  likeScaleAnim: Animated.Value;
  likeOpacityAnim: Animated.Value;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onEdit,
  likeScaleAnim,
  likeOpacityAnim,
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

  const postTypeIcon = () => {
    switch (post.type) {
      case "prayer":
        return <FontAwesome name="hand-peace-o" size={14} color="#1DA1F2" />;
      case "resolution":
        return <Feather name="book-open" size={14} color="#1DA1F2" />;
      case "goal":
        return <Feather name="target" size={14} color="#1DA1F2" />;
    }
  };

  const formattedDate = formatDateTime(post.created_at).split("•")[0].trim();

  const handleCommentPress = () => {
    // Navigate to comments screen using Expo Router with params as path segments
    router.push({
      pathname: "../screens/CommentsScreen",
      params: {
        postData: JSON.stringify(post),
      },
    });
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
      activeOpacity={1}
      style={styles.postCard}
      onPress={handleDoubleTap}
    >
      {/* Header with user info */}
      <View style={styles.postHeader}>
        <Avatar size="md" />
        <View style={styles.postHeaderText}>
          <View style={styles.nameContainer}>
            <Text style={styles.postAuthor}>
              {post.user.first_name} {post.user.last_name}
              {post.user_id === currentUserId && (
                <Text style={styles.authorTag}> • You</Text>
              )}
            </Text>
            <Text style={styles.username}>
              @{post.user.first_name.toLowerCase()}
            </Text>
            <Text style={styles.dateSeparator}>·</Text>
            <Text style={styles.postTime}>{formattedDate}</Text>
          </View>

          {post.group_info && (
            <View style={styles.groupTag}>
              <Feather name="users" size={12} color="#1DA1F2" />
              <Text style={styles.groupTagText}>{post.group_info.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.postTypeTag}>
          {postTypeIcon()}
          <Text style={styles.postTypeText}>
            {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
          </Text>
        </View>
      </View>

      {/* Post content */}
      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postDescription}>{post.description}</Text>
      </View>

      {/* Actions (like, comment, edit) */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.postAction}
          onPress={handleCommentPress}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={18} color="#6E767D" />
          <Text style={styles.actionText}>
            {post.comments_count ? post.comments_count : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.postAction, post.is_liked && styles.postActionActive]}
          onPress={handleLikePress}
          activeOpacity={0.7}
        >
          <View style={styles.likeButtonContainer}>
            <Animated.View
              style={[
                styles.likeRipple,
                {
                  opacity: likeOpacityAnim,
                  transform: [{ scale: Animated.multiply(likeScaleAnim, 2) }],
                },
              ]}
            />
            <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
              <FontAwesome
                name={post.is_liked ? "heart" : "heart-o"}
                size={18}
                color={post.is_liked ? "#E0245E" : "#6E767D"}
              />
            </Animated.View>
          </View>
          <Text
            style={[
              styles.actionText,
              post.is_liked && styles.actionTextActive,
            ]}
          >
            {post.likes_count ? post.likes_count : ""}
          </Text>
        </TouchableOpacity>

        {post.user_id === currentUserId && onEdit && (
          <TouchableOpacity
            style={styles.postAction}
            onPress={() => onEdit && onEdit(post)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={18} color="#6E767D" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  postCard: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.04)",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  postHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  postAuthor: {
    color: "#1A202C",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 4,
    letterSpacing: -0.3,
  },
  username: {
    color: "#718096",
    fontSize: 14,
    marginRight: 4,
  },
  dateSeparator: {
    color: "#A0AEC0",
    marginHorizontal: 4,
  },
  authorTag: {
    color: "#1DA1F2",
    fontWeight: "600",
  },
  postTime: {
    color: "#718096",
    fontSize: 14,
  },
  groupTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 161, 242, 0.08)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  groupTagText: {
    color: "#1DA1F2",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  postTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 161, 242, 0.08)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  postTypeText: {
    color: "#1DA1F2",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  postContent: {
    paddingVertical: 8,
  },
  postTitle: {
    color: "#1A202C",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  postDescription: {
    color: "#2D3748",
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.04)",
  },
  postAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  postActionActive: {
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
    backgroundColor: "rgba(224, 36, 94, 0.2)",
  },
  actionText: {
    color: "#718096",
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
  },
  actionTextActive: {
    color: "#E0245E",
  },
});

export default PostCard;
