import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  FlatList,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { Post, Comment } from "../types";
import Avatar from "./ui/Avatar";
import { formatDateTime } from "../utils/formatters";

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onLike: (id: string, isLiked: boolean) => void;
  onComment: (postId: string) => void;
  onEdit?: (post: Post) => void;
  likeScaleAnim: Animated.Value;
  likeOpacityAnim: Animated.Value;
  isCommentsExpanded: boolean;
  comments: Comment[];
  newComment: string;
  setNewComment: (text: string) => void;
  handleAddComment: (postId: string) => void;
  commentsLoading: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onComment,
  onEdit,
  likeScaleAnim,
  likeOpacityAnim,
  isCommentsExpanded,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  commentsLoading,
}) => {
  const renderCommentItem = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Avatar size="sm" />
        </View>
        <View style={styles.commentUser}>
          <Text style={styles.commentUserName}>
            {item.user.first_name} {item.user.last_name}
          </Text>
          <Text style={styles.commentTime}>
            {formatDateTime(item.created_at)}
          </Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.postCard}>
      {/* Header with user info */}
      <View style={styles.postHeader}>
        <Avatar size="md" />
        <View style={styles.postHeaderText}>
          <Text style={styles.postAuthor}>
            {post.user.first_name} {post.user.last_name}
            {post.user_id === currentUserId && (
              <Text style={styles.authorTag}> • You</Text>
            )}
          </Text>
          <View style={styles.postMeta}>
            <View style={styles.postTypeTag}>
              {post.type === "prayer" ? (
                <FontAwesome name="hand-peace-o" size={12} color="#FAC898" />
              ) : post.type === "resolution" ? (
                <Feather name="book-open" size={12} color="#FAC898" />
              ) : (
                <Feather name="target" size={12} color="#FAC898" />
              )}
              <Text style={styles.postTypeText}>
                {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
              </Text>
            </View>
            <Text style={styles.postTime}>
              {formatDateTime(post.created_at)}
            </Text>
          </View>

          {post.group_info && (
            <View style={styles.groupTag}>
              <Feather name="users" size={12} color="#FAC898" />
              <Text style={styles.groupTagText}>
                Shared group(s): {post.group_info.name}
              </Text>
            </View>
          )}
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
                color={post.is_liked ? "#E9967A" : "#FAC898"}
              />
            </Animated.View>
          </View>
          <Text
            style={[
              styles.actionText,
              post.is_liked && styles.actionTextActive,
            ]}
          >
            {post.is_liked ? "Liked" : "Support"}{" "}
            {post.likes_count ? `(${post.likes_count})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.postAction}
          onPress={() => onComment(post.id)}
        >
          <Feather name="message-circle" size={18} color="#FAC898" />
          <Text style={styles.actionText}>
            {isCommentsExpanded ? "Hide Comments" : "Comment"}{" "}
            {post.comments_count ? `(${post.comments_count})` : ""}
          </Text>
        </TouchableOpacity>

        {post.user_id === currentUserId && onEdit && (
          <TouchableOpacity
            style={styles.postAction}
            onPress={() => onEdit(post)}
          >
            <Feather name="edit" size={18} color="#FAC898" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comments section */}
      {isCommentsExpanded && (
        <View style={styles.commentsSection}>
          <View style={styles.commentsDivider} />

          {/* Add comment input */}
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(250, 200, 152, 0.5)"
              value={newComment}
              onChangeText={setNewComment}
              multiline={true}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleAddComment(post.id)}
            >
              <Feather name="send" size={22} color="#FAC898" />
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          {commentsLoading ? (
            <View style={styles.commentsLoading} />
          ) : (
            <>
              {comments.length > 0 ? (
                <FlatList
                  data={comments}
                  renderItem={renderCommentItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.commentsList}
                />
              ) : (
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet.</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  postHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  postAuthor: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  authorTag: {
    color: "rgba(250, 200, 152, 0.9)",
    fontWeight: "normal",
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  postTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 200, 152, 0.1)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  postTypeText: {
    color: "#FAC898",
    fontSize: 12,
    marginLeft: 4,
  },
  postTime: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  groupTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.3)",
  },
  groupTagText: {
    color: "#FAC898",
    fontSize: 12,
    marginLeft: 5,
    fontWeight: "600",
  },
  postContent: {
    paddingVertical: 10,
  },
  postTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 5,
  },
  postDescription: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  postActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  postAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
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
    backgroundColor: "rgba(233, 150, 122, 0.3)",
  },
  actionText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  actionTextActive: {
    color: "#E9967A",
  },
  commentsSection: {
    marginTop: 10,
  },
  commentsDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 10,
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#FFFFFF",
    marginRight: 10,
    maxHeight: 80,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  commentsList: {
    paddingVertical: 5,
  },
  commentItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    marginRight: 10,
  },
  commentUser: {
    flex: 1,
  },
  commentUserName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  commentTime: {
    color: "rgba(250, 200, 152, 0.7)",
    fontSize: 11,
  },
  commentContent: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  commentsLoading: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyComments: {
    padding: 10,
    alignItems: "center",
  },
  emptyCommentsText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
});

export default PostCard;
