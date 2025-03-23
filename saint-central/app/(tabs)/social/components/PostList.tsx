import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Post } from "../types";
import PostCard from "./PostCard";
import { supabase } from "../../../../supabaseClient";

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
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  // Dummy function to pass to PostCard for onComment
  const handleCommentAction = (postId: string) => {
    // This is now handled by navigation in the PostCard component
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // In a real app, you would refetch the data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="file-text" size={36} color="#657786" />
        <Text style={styles.emptyStateText}>No posts yet</Text>
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
          onComment={handleCommentAction}
          onEdit={onEdit}
          likeScaleAnim={getLikeScaleAnimation(item.id)}
          likeOpacityAnim={getLikeOpacityAnimation(item.id)}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#1DA1F2"
          colors={["#1DA1F2"]}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 10,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    color: "#657786",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: "#1DA1F2",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});

export default PostList;
