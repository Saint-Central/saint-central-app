import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  Animated,
  Platform,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Post, Comment } from "../types";
import Avatar from "../components/ui/Avatar";
import { formatDateTime } from "../utils/formatters";
import { supabase } from "../../../../supabaseClient";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CommentsScreen = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList<Comment>>(null);
  const inputRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  // Add a simple opacity animation for transitions
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    React.useCallback(() => {
      // Reset animation values and start animation whenever screen comes into focus
      opacity.setValue(0);
      translateY.setValue(50);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      return () => {
        // Optional cleanup if needed
      };
    }, []),
  );

  // Reduced navBarOffset to place the comment box right above the Expo nav bar
  const navBarOffset = 50;
  // When keyboard is hidden, the bottom value will be safe area inset + navBarOffset.
  const commentBoxBottom = useRef(new Animated.Value(insets.bottom + navBarOffset)).current;

  // Parse the post data from params.
  let post: Post;
  try {
    post = JSON.parse(params.postData as string);
  } catch (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("../")} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#1DA1F2" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading comments</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      const duration = e.duration || 300;
      // Animate the comment box to sit exactly above the keyboard.
      Animated.timing(commentBoxBottom, {
        toValue: e.endCoordinates.height,
        duration,
        useNativeDriver: false,
      }).start();

      // Scroll FlatList to the bottom.
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, (e) => {
      setKeyboardVisible(false);
      const duration = e?.duration || 300;
      // Animate back to safe area inset + navBarOffset when keyboard hides.
      Animated.timing(commentBoxBottom, {
        toValue: insets.bottom + navBarOffset,
        duration,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [commentBoxBottom, insets.bottom]);

  useEffect(() => {
    setComments([]);
    fetchComments();
  }, [post.id]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", userData.user.id)
            .single();

          if (data) {
            setCurrentUser(data);
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const postId = String(post.id);
      const { data, error } = await supabase
        .from("comments")
        .select("*, user:users(*)")
        .eq("commentable_id", postId)
        .eq("commentable_type", "intentions")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      setIsSending(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        console.error("User not authenticated");
        return;
      }
      const postId = String(post.id);
      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: userData.user.id,
          commentable_id: postId,
          commentable_type: "intentions",
          content: newComment,
        })
        .select("*, user:users(*)")
        .single();
      if (error) throw error;
      if (data) {
        setComments((prevComments) => [data, ...prevComments]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchComments();
    setRefreshing(false);
  };

  const renderPostHeader = () => {
    const formattedDate = formatDateTime(post.created_at);
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <Avatar size="md" imageUrl={(post.user as any).profile_image} />
          <View style={styles.postHeaderText}>
            <View style={styles.nameContainer}>
              <Text style={styles.postAuthor}>
                {post.user.first_name} {post.user.last_name}
              </Text>
              <Text style={styles.username}>@{post.user.first_name.toLowerCase()}</Text>
            </View>
            <Text style={styles.postTime}>{formattedDate}</Text>
          </View>
        </View>
        <View style={styles.postContent}>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postDescription}>{post.description}</Text>
        </View>
        <View style={styles.postStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{comments.length || 0}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{post.likes_count || 0}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>
        <View style={styles.divider} />
      </View>
    );
  };

  const renderCommentItem = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Avatar size="md" imageUrl={(item.user as any).profile_image} />
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>
            {item.user.first_name} {item.user.last_name}
          </Text>
          <Text style={styles.commentUsername}>@{item.user.first_name.toLowerCase()}</Text>
          <Text style={styles.commentTime}>{formatDateTime(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  // Add this function to handle back navigation with animation
  const handleBackNavigation = () => {
    // Animate out before navigating back
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate back after animation completes
      router.back();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacity,
          transform: [{ translateY: translateY }],
        },
      ]}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackNavigation} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#1DA1F2" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          {isLoading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#1DA1F2" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              renderItem={renderCommentItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderPostHeader}
              style={styles.commentsList}
              contentContainerStyle={[styles.commentsListContent, { paddingBottom: 120 }]}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={["#1DA1F2"]}
                  tintColor="#1DA1F2"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Feather name="message-circle" size={32} color="#657786" />
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubText}>Be the first to comment!</Text>
                </View>
              }
            />
          )}
        </View>

        <Animated.View style={[styles.inputContainer, { bottom: commentBoxBottom }]}>
          {keyboardVisible && (
            <TouchableOpacity style={styles.closeKeyboardButton} onPress={dismissKeyboard}>
              <Feather name="x" size={20} color="#657786" />
            </TouchableOpacity>
          )}
          <Avatar size="sm" imageUrl={(currentUser as any)?.profile_image} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#657786"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          {isSending ? (
            <View style={styles.sendButton}>
              <ActivityIndicator size="small" color="#1DA1F2" />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, newComment.trim() ? styles.sendButtonActive : {}]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Feather name="send" size={18} color={newComment.trim() ? "#1DA1F2" : "#657786"} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#000000" },
  headerRight: { width: 40 },
  content: { flex: 1, position: "relative" },
  commentsList: { flex: 1 },
  commentsListContent: { paddingBottom: 120 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
    backgroundColor: "#FFFFFF",
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 3,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F8FA",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
    color: "#000000",
    fontSize: 16,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: { backgroundColor: "rgba(29, 161, 242, 0.1)" },
  closeKeyboardButton: {
    position: "absolute",
    top: -40,
    right: 10,
    backgroundColor: "#F5F8FA",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    zIndex: 101,
  },
  postContainer: { padding: 16 },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  postHeaderText: { flex: 1, marginLeft: 12 },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  postAuthor: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 4,
  },
  username: { color: "#657786", fontSize: 14, marginLeft: 4 },
  postTime: { color: "#657786", fontSize: 14, marginTop: 2 },
  postContent: { marginBottom: 12 },
  postTitle: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  postDescription: { color: "#14171A", fontSize: 16, lineHeight: 22 },
  postStats: { flexDirection: "row", marginTop: 12, marginBottom: 16 },
  statItem: { marginRight: 24 },
  statValue: { fontSize: 16, fontWeight: "700", color: "#000000" },
  statLabel: { fontSize: 14, color: "#657786" },
  divider: { height: 1, backgroundColor: "rgba(0, 0, 0, 0.08)", marginTop: 8 },
  commentItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
  },
  commentAvatar: { marginRight: 12 },
  commentContent: { flex: 1 },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  commentAuthor: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 4,
  },
  commentUsername: { color: "#657786", fontSize: 14, marginRight: 8 },
  commentTime: { color: "#657786", fontSize: 14 },
  commentText: { color: "#14171A", fontSize: 15, lineHeight: 20 },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#657786",
    marginTop: 16,
  },
  emptySubText: { fontSize: 16, color: "#AAB8C2", marginTop: 8 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#657786",
    marginBottom: 20,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: "#1DA1F2",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  errorButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
});

export default CommentsScreen;
