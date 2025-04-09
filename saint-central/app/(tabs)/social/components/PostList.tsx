import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Post } from "../types";
import PostCard from "./PostCard";

interface PostListProps {
  posts: Post[];
  currentUserId: string | null;
  onLike: (postId: string, isLiked: boolean) => Promise<void>;
  onEdit?: (post: Post) => void;
  isLoading: boolean;
  scrollY?: Animated.Value;
  onCommentPress: (postData: Post) => void;
}

const PostList: React.FC<PostListProps> = ({
  posts,
  currentUserId,
  onLike,
  onEdit,
  isLoading,
  scrollY = new Animated.Value(0),
  onCommentPress,
}) => {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

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
    // Handled by navigation in the PostCard component
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // In a real app, you would refetch the data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Set up the animated scroll event
  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: false,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3182CE" />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIcon}>
          <Feather name="inbox" size={36} color="#A0AEC0" />
        </View>
        <Text style={styles.emptyStateTitle}>No Posts Yet</Text>
        <Text style={styles.emptyStateMessage}>
          Be the first to share something with your community
        </Text>
        <TouchableOpacity style={styles.emptyStateButton}>
          <Text style={styles.emptyStateButtonText}>Create New Post</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.FlatList
      data={posts}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          currentUserId={currentUserId}
          onLike={onLike}
          onEdit={onEdit}
          likeScaleAnim={getLikeScaleAnimation(item.id)}
          likeOpacityAnim={getLikeOpacityAnimation(item.id)}
          onCommentPress={onCommentPress}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.listContainer, { paddingBottom: 80 + (insets.bottom || 0) }]}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3182CE"
          colors={["#3182CE"]}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F7FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: "#718096",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#3182CE",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default PostList;
