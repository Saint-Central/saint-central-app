import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Post, Comment } from "../types";
import PostCard from "./PostCard";

interface PostListProps {
  posts: Post[];
  currentUserId: string | null;
  onLike: (id: string, isLiked: boolean) => void;
  onEdit?: (post: Post) => void;
  isLoading: boolean;
}

const PostList: React.FC<PostListProps> = ({
  posts,
  currentUserId,
  onLike,
  onEdit,
  isLoading,
}) => {
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);

  // Animation references for like button
  const likeScaleAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const likeOpacityAnimations = useRef<Map<string, Animated.Value>>(new Map());

  const getLikeScaleAnimation = (postId: string): Animated.Value => {
    if (!likeScaleAnimations.current.has(postId)) {
      likeScaleAnimations.current.set(postId, new Animated.Value(1));
    }
    return likeScaleAnimations.current.get(postId) as Animated.Value;
  };

  const getLikeOpacityAnimation = (postId: string): Animated.Value => {
    if (!likeOpacityAnimations.current.has(postId)) {
      likeOpacityAnimations.current.set(postId, new Animated.Value(0));
    }
    return likeOpacityAnimations.current.get(postId) as Animated.Value;
  };

  const handleToggleComments = (postId: string): void => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      fetchComments(postId);
    }
  };

  const fetchComments = async (postId: string): Promise<void> => {
    // In a real app, this would fetch comments from an API
    // For now we'll just simulate loading
    setCommentsLoading(true);
    setTimeout(() => {
      // Mock comments data
      const mockComments: Comment[] = [
        {
          id: "1",
          user_id: "user123",
          commentable_id: postId,
          commentable_type: "posts",
          content: "Great post! Thanks for sharing.",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: {
            id: "user123",
            first_name: "Jane",
            last_name: "Smith",
            created_at: new Date().toISOString(),
          },
        },
      ];
      setComments(mockComments);
      setCommentsLoading(false);
    }, 500);
  };

  const handleAddComment = (postId: string): void => {
    if (!newComment.trim()) return;

    // In a real app, this would send the comment to an API
    const newCommentObject: Comment = {
      id: `temp-${Date.now()}`,
      user_id: currentUserId || "",
      commentable_id: postId,
      commentable_type: "posts",
      content: newComment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: currentUserId || "",
        first_name: "You",
        last_name: "",
        created_at: new Date().toISOString(),
      },
    };

    setComments([newCommentObject, ...comments]);
    setNewComment("");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FAC898" />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No posts to show.</Text>
        <TouchableOpacity style={styles.emptyStateButton}>
          <Text style={styles.emptyStateButtonText}>Create New Post</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          currentUserId={currentUserId}
          onLike={onLike}
          onComment={handleToggleComments}
          onEdit={onEdit}
          likeScaleAnim={getLikeScaleAnimation(item.id)}
          likeOpacityAnim={getLikeOpacityAnimation(item.id)}
          isCommentsExpanded={expandedPostId === item.id}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          handleAddComment={handleAddComment}
          commentsLoading={commentsLoading}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginTop: 20,
    marginHorizontal: 15,
  },
  emptyStateText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  emptyStateButton: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.4)",
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default PostList;
