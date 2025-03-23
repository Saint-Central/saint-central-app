import React from "react";
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

  return (
    <View style={styles.postCard}>
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
        >
          <Feather name="message-circle" size={18} color="#6E767D" />
          <Text style={styles.actionText}>
            {post.comments_count ? post.comments_count : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.postAction, post.is_liked && styles.postActionActive]}
          onPress={() => onLike(post.id, !!post.is_liked)}
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
            onPress={() => onEdit(post)}
          >
            <Feather name="edit" size={18} color="#6E767D" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
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
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 4,
  },
  username: {
    color: "#6E767D",
    fontSize: 14,
    marginRight: 4,
  },
  dateSeparator: {
    color: "#6E767D",
    marginHorizontal: 4,
  },
  authorTag: {
    color: "#1DA1F2",
    fontWeight: "normal",
  },
  postTime: {
    color: "#6E767D",
    fontSize: 14,
  },
  groupTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 161, 242, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  groupTagText: {
    color: "#1DA1F2",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  postTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 161, 242, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginLeft: 6,
  },
  postTypeText: {
    color: "#1DA1F2",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  postContent: {
    paddingVertical: 4,
  },
  postTitle: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  postDescription: {
    color: "#0F1419",
    fontSize: 15,
    lineHeight: 22,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
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
    color: "#6E767D",
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
  },
  actionTextActive: {
    color: "#E0245E",
  },
});

export default PostCard;
