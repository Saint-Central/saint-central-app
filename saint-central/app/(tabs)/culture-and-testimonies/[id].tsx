import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Keyboard,
  AppState,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../supabaseClient";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

interface Post {
  id: number;
  title: string;
  excerpt: string;
  image?: string;
  author: string;
  date: string;
  videoLink?: string;
  category?: string;
  isAuthor?: boolean;
}

interface Comment {
  id: number;
  content: string;
  author: string;
  date: string;
  isOwnComment: boolean;
}

const PostPage = () => {
  // Get iOS status bar height
  const statusBarHeight = Platform.OS === "ios" ? StatusBar.currentHeight || 44 : 0;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [webViewHeight, setWebViewHeight] = useState<number>(300);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [forceUpdate, setForceUpdate] = useState(0);
  const appState = useRef(AppState.currentState);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [pointerEventsEnabled, setPointerEventsEnabled] = useState(false);

  // Likes and comments state
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  // Add ref for ScrollView and Comments section
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
  const commentsRef = useRef<View>(null);

  // Add listener for scroll position to control pointer events
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setPointerEventsEnabled(value > 100);
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY]);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Get the current user session and fetch post data
    async function initialize() {
      try {
        setIsLoading(true);

        // Get user session first
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        setCurrentUserId(userId || null);

        // Get user profile if logged in
        if (userId) {
          const { data: userData } = await supabase
            .from("users")
            .select("first_name, last_name")
            .eq("id", userId)
            .single();

          const fullName = userData
            ? `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
            : "Anonymous";

          setCurrentUserName(fullName || "Anonymous");
        }

        // Now fetch the post
        const numericId = parseInt(id as string, 10);
        if (isNaN(numericId)) {
          setError("Invalid post id");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("culture_posts")
          .select(
            `
            post_id,
            title,
            excerpt,
            image_url,
            created_at,
            video_link,
            category,
            author_name,
            user_id
          `,
          )
          .eq("post_id", numericId)
          .single();

        if (error) {
          console.error("Supabase error:", error.message);
          setError(error.message);
          setIsLoading(false);
          return;
        }

        setPost({
          id: data.post_id,
          title: data.title,
          excerpt: data.excerpt,
          image: data.image_url,
          author: data.author_name || "Unknown",
          date: new Date(data.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          videoLink: data.video_link,
          category: data.category,
          isAuthor: userId ? data.user_id === userId : false,
        });

        // Fetch likes and comments after we have the user ID and post data
        fetchLikes(data.post_id, userId || null);
        fetchComments(data.post_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post");
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [id]);

  // Fetch likes for the post
  const fetchLikes = async (postId: number, userId: string | null) => {
    try {
      // Get total likes
      const { count, error } = await supabase
        .from("likes")
        .select("*", { count: "exact" })
        .eq("likeable_id", postId)
        .eq("likeable_type", "culture_post");

      if (error) throw error;

      setLikeCount(count || 0);

      // Check if current user liked the post
      if (userId) {
        const { data, error: likedError } = await supabase
          .from("likes")
          .select("*")
          .eq("likeable_id", postId)
          .eq("likeable_type", "culture_post")
          .eq("user_id", userId)
          .maybeSingle();

        if (likedError) throw likedError;

        setIsLiked(!!data);
      }
    } catch (err) {
      console.error("Error fetching likes:", err);
    }
  };

  // Fetch comments for the post
  const fetchComments = async (postId: number) => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          id,
          content,
          created_at,
          user_id
        `,
        )
        .eq("commentable_id", postId)
        .eq("commentable_type", "culture_post")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Format the comments
      const formattedComments = data.map(async (comment) => {
        // Get user name for each comment
        let authorName = "Anonymous";
        if (comment.user_id) {
          const { data: userData } = await supabase
            .from("users")
            .select("first_name, last_name")
            .eq("id", comment.user_id)
            .single();

          if (userData) {
            authorName = `${userData.first_name || ""} ${userData.last_name || ""}`.trim();
            if (!authorName) authorName = "Anonymous";
          }
        }

        return {
          id: comment.id,
          content: comment.content,
          author: authorName,
          date: new Date(comment.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          isOwnComment: currentUserId === comment.user_id,
        };
      });

      const resolvedComments = await Promise.all(formattedComments);
      setComments(resolvedComments);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  // Toggle like for the post
  const toggleLike = async () => {
    if (!currentUserId) {
      Alert.alert("Sign in required", "Please sign in to like posts.");
      return;
    }

    try {
      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("likeable_id", post?.id)
          .eq("likeable_type", "culture_post")
          .eq("user_id", currentUserId);

        if (error) throw error;

        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        // Add like
        const { error } = await supabase.from("likes").insert({
          user_id: currentUserId,
          likeable_id: post?.id,
          likeable_type: "culture_post",
          created_at: new Date().toISOString(),
        });

        if (error) throw error;

        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      Alert.alert("Error", "Failed to update like status.");
    }
  };

  // Submit a new comment
  const submitComment = async () => {
    if (!currentUserId) {
      Alert.alert("Sign in required", "Please sign in to comment.");
      return;
    }

    if (!newComment.trim()) {
      Alert.alert("Empty comment", "Please enter a comment.");
      return;
    }

    try {
      setIsSubmittingComment(true);
      Keyboard.dismiss();

      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: currentUserId,
          commentable_id: post?.id,
          commentable_type: "culture_post",
          content: newComment.trim(),
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      // Add the new comment to the list
      const newCommentObj: Comment = {
        id: data[0].id,
        content: newComment.trim(),
        author: currentUserName || "Anonymous",
        date: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        isOwnComment: true,
      };

      setComments([newCommentObj, ...comments]);
      setNewComment("");
      setIsCommenting(false);

      // Force layout update after comment submission
      setTimeout(() => {
        setForceUpdate((prev) => prev + 1);
      }, 100);
    } catch (err) {
      console.error("Error submitting comment:", err);
      Alert.alert("Error", "Failed to submit your comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete a comment
  const deleteComment = async (commentId: number) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);

      if (error) throw error;

      // Remove the comment from the list
      setComments(comments.filter((comment) => comment.id !== commentId));
    } catch (err) {
      console.error("Error deleting comment:", err);
      Alert.alert("Error", "Failed to delete your comment.");
    }
  };

  // Scroll to comments section
  const scrollToComments = () => {
    if (scrollViewRef.current) {
      // Make sure comments are shown first
      if (!showComments) {
        setShowComments(true);
      }

      // Use a timeout to ensure the comments section is rendered before scrolling
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  };

  // Add effect to scroll to top when post is loaded
  useEffect(() => {
    if (!isLoading && post && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isLoading, post]);

  // Handle app state changes and keyboard appearance
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // When app returns to active state from background
      if (appState.current === "background" && nextAppState === "active") {
        // Force layout update with slight delay
        setTimeout(() => {
          setForceUpdate((prev) => prev + 1);
        }, 300);
      }

      appState.current = nextAppState;
    });

    // Add keyboard listeners to adjust layout
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setForceUpdate((prev) => prev + 1);
    });

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setForceUpdate((prev) => prev + 1);
    });

    return () => {
      subscription.remove();
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Direct share function without modal
  const onShare = async () => {
    try {
      if (!post) return;

      // Create a deep link URL for the app
      const appDeepLink = `saintcentral://culture/posts/${post.id}?title=${encodeURIComponent(post.title.toLowerCase().replace(/\s+/g, "-"))}`;
      const webFallbackUrl = `https://www.saint-central.com/culture/posts/${post.id}?title=${encodeURIComponent(post.title.toLowerCase().replace(/\s+/g, "-"))}`;

      const excerpt = post.excerpt.replace(/<[^>]*>?/gm, "");

      await Share.share({
        message: `${post.title}`,
        url: webFallbackUrl, // iOS only
        title: post.title, // Android only
      });
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 2, 30));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 2, 12));

  // Create HTML with appropriate styling
  const createHtml = (excerpt: string) => {
    // Determine if excerpt contains HTML or is plain text
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(excerpt);

    // If no HTML tags found, wrap it in paragraph tags
    const content = hasHtmlTags ? excerpt : `<p>${excerpt}</p>`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            body {
              font-family: ${Platform.OS === "ios" ? "Georgia" : "serif"};
              font-size: ${fontSize}px;
              line-height: ${fontSize * 1.5}px;
              color: #D9D5EC;
              padding: 0;
              margin: 0;
              background-color: transparent;
              overflow: hidden; /* Prevent scrolling */
            }
            p {
              margin-bottom: 20px;
              color: #D9D5EC;
              text-align: justify;
            }
            a {
              color: #18C5B6;
              text-decoration: none;
              border-bottom: 1px solid rgba(24,197,182,0.3);
              transition: border-bottom 0.2s;
            }
            a:hover {
              border-bottom: 1px solid rgba(24,197,182,0.8);
            }
            h1, h2, h3, h4, h5, h6 {
              color: #FFFFFF;
              font-weight: 700;
            }
            h1 {
              font-size: ${fontSize * 1.5}px;
              margin-top: 24px;
              margin-bottom: 14px;
            }
            h2 {
              font-size: ${fontSize * 1.3}px;
              margin-top: 22px;
              margin-bottom: 12px;
            }
            h3 {
              font-size: ${fontSize * 1.1}px;
              margin-top: 18px;
              margin-bottom: 10px;
            }
            img {
              max-width: 100%;
              height: auto;
              margin: 16px 0;
              border-radius: 10px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            ul, ol {
              margin-left: 20px;
              margin-bottom: 20px;
              color: #D9D5EC;
            }
            li {
              margin-bottom: 10px;
            }
            blockquote {
              border-left: 3px solid #18C5B6;
              padding: 12px 0 12px 20px;
              margin: 20px 0;
              font-style: italic;
              color: #D9D5EC;
              background-color: rgba(24,197,182,0.05);
              border-radius: 0 8px 8px 0;
            }
            code {
              background-color: rgba(24,197,182,0.1);
              padding: 3px 5px;
              border-radius: 4px;
              font-family: monospace;
              font-size: ${fontSize * 0.9}px;
            }
            pre {
              background-color: rgba(0, 0, 0, 0.3);
              padding: 12px;
              border-radius: 8px;
              overflow-x: auto;
              border: 1px solid rgba(24,197,182,0.1);
            }
            pre code {
              background-color: transparent;
              padding: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid rgba(24,197,182,0.2);
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: rgba(24,197,182,0.1);
            }
          </style>
        </head>
        <body ontouchstart="">
          ${content}
        </body>
      </html>
    `;
  };

  // Handle WebView height adjustment for dynamic content
  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.height) {
        setWebViewHeight(data.height);
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

  // Script to measure content height and send it back
  const injectedJavaScript = `
    function updateHeight() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        height: document.body.scrollHeight
      }));
    }
    
    // Initial height calculation
    setTimeout(updateHeight, 300);
    
    // Update when DOM changes
    const observer = new MutationObserver(updateHeight);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      characterData: true 
    });
    
    // Handle images
    document.addEventListener('DOMContentLoaded', function() {
      const images = document.getElementsByTagName('img');
      for (let i = 0; i < images.length; i++) {
        images[i].onload = updateHeight;
        images[i].onerror = updateHeight;
      }
    });
    
    // Disable all scrolling within WebView
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Make sure touch events pass through to parent scroll view
    document.addEventListener('touchstart', function(e) {
      e.stopPropagation();
    }, false);
    
    true;
  `;

  // Calculate header opacity for animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Calculate image scale effect
  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: "clamp",
  });

  // Setup scroll event handler
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: false,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#18C5B6" />
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <Feather name="alert-circle" size={40} color="#18C5B6" style={styles.errorIcon} />
          <Text style={styles.errorText}>{error || "Post not found"}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("../culture-and-testimonies")}
          >
            <Feather name="chevron-left" size={16} color="#231456" />
            <Text style={styles.backButtonText}>Return to Culture and Testimonies</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Floating Header - Updated with animation */}
        <Animated.View
          style={[
            styles.floatingHeader,
            {
              opacity: headerOpacity,
              transform: [
                {
                  translateY: headerOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.push("../culture-and-testimonies")}
          >
            <Feather name="chevron-left" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {post.title}
          </Text>
          <View style={styles.headerRight} />
        </Animated.View>

        {/* Progress Bar */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: scrollY.interpolate({
                inputRange: [0, 300],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
            },
          ]}
        />

        {/* Sticky Action Bar - Now with fixed animation */}
        <Animated.View
          style={[
            styles.stickyActionBar,
            {
              opacity: headerOpacity,
              transform: [
                {
                  translateY: headerOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={pointerEventsEnabled ? "auto" : "none"}
          key={`sticky-bar-${forceUpdate}`}
        >
          <View style={styles.actionBarContent}>
            <View style={styles.mainActionButtons}>
              {/* Like button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isLiked ? styles.likeButtonActive : styles.likeButtonInactive,
                ]}
                onPress={toggleLike}
                activeOpacity={0.8}
              >
                <Feather name="heart" size={14} color={isLiked ? "#FFFFFF" : "#231456"} />
                {likeCount > 0 && (
                  <Text
                    style={[
                      styles.counterText,
                      isLiked ? styles.likeButtonActiveText : styles.likeButtonInactiveText,
                    ]}
                  >
                    {likeCount}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Comment button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  showComments ? styles.commentButtonActive : styles.commentButtonInactive,
                ]}
                onPress={scrollToComments}
                activeOpacity={0.8}
              >
                <Feather
                  name="message-square"
                  size={14}
                  color={showComments ? "#FFFFFF" : "#231456"}
                />
                {comments.length > 0 && (
                  <Text
                    style={[
                      styles.counterText,
                      showComments
                        ? styles.commentButtonActiveText
                        : styles.commentButtonInactiveText,
                    ]}
                  >
                    {comments.length}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Share button */}
              <TouchableOpacity style={styles.actionButton} onPress={onShare} activeOpacity={0.8}>
                <Feather name="share-2" size={14} color="#231456" />
              </TouchableOpacity>
            </View>

            <View style={styles.fontSizeControls}>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={decreaseFontSize}
                activeOpacity={0.8}
              >
                <Feather name="minus" size={12} color="#231456" />
              </TouchableOpacity>

              <View style={styles.fontSizeDisplay}>
                <Text style={styles.fontSizeText}>{fontSize}</Text>
              </View>

              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={increaseFontSize}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={12} color="#231456" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <Animated.ScrollView
          ref={scrollViewRef}
          style={[styles.scrollView, { opacity: fadeAnim }]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollViewContent,
            { paddingBottom: Platform.OS === "ios" ? 160 : 140 }, // Extra padding for controls
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button (visible initially) */}
          <TouchableOpacity
            style={styles.backButtonAbsolute}
            onPress={() => router.push("../culture-and-testimonies")}
          >
            <Feather name="chevron-left" size={16} color="#FFFFFF" />
            <Text style={styles.backButtonTextSmall}>Back</Text>
          </TouchableOpacity>

          {/* Hero Image with scale effect */}
          {post.image ? (
            <Animated.View style={[styles.imageContainer, { transform: [{ scale: imageScale }] }]}>
              <Image source={{ uri: post.image }} style={styles.postImage} />
              <View style={styles.imageDimOverlay} />
            </Animated.View>
          ) : (
            <View style={styles.noImageSpacer} />
          )}

          <View style={styles.postContainer}>
            {/* Title with drop shadow for better readability */}
            <Text style={styles.title}>{post.title}</Text>

            {/* Category badge - moved above metadata */}
            {post.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{post.category}</Text>
              </View>
            )}

            {/* Meta data with more spacing and improved icons */}
            <View style={styles.metaData}>
              <View style={styles.metaItem}>
                <Feather name="user" size={14} color="#18C5B6" />
                <Text style={styles.metaText}>{post.author}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="calendar" size={14} color="#18C5B6" />
                <Text style={styles.metaText}>{post.date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="heart" size={14} color="#18C5B6" />
                <Text style={styles.metaText}>{likeCount} likes</Text>
              </View>
            </View>

            {/* Content card with subtle shadow */}
            <View style={styles.contentCard}>
              {/* WebView for HTML content - with transparent background */}
              <View style={[styles.contentContainer, { height: webViewHeight }]}>
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: createHtml(post.excerpt) }}
                  style={styles.webView}
                  scrollEnabled={false}
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  injectedJavaScript={injectedJavaScript}
                  onMessage={onWebViewMessage}
                  onError={(syntheticEvent) => {
                    console.error("WebView error: ", syntheticEvent.nativeEvent);
                  }}
                  renderLoading={() => <ActivityIndicator size="small" color="#18C5B6" />}
                  startInLoadingState={true}
                  backgroundColor="transparent"
                  dataDetectorTypes="none"
                  containerStyle={{ opacity: 1 }}
                  onTouchStart={(e) => {
                    // Allow touch events to propagate to parent ScrollView
                  }}
                  useSharedProcessPool={false}
                />
              </View>
            </View>

            {/* Comments section */}
            {showComments && (
              <View style={styles.commentsSection} ref={commentsRef}>
                <View style={styles.commentsSectionHeader}>
                  <Text style={styles.commentsSectionTitle}>
                    Comments {comments.length > 0 && `(${comments.length})`}
                  </Text>
                  <TouchableOpacity
                    style={styles.addCommentButton}
                    onPress={() => {
                      if (currentUserId) {
                        setIsCommenting(true);
                        setTimeout(() => {
                          commentInputRef.current?.focus();
                        }, 100);
                      } else {
                        Alert.alert("Sign in required", "Please sign in to comment.");
                      }
                    }}
                  >
                    <Feather name="plus" size={16} color="#18C5B6" />
                    <Text style={styles.addCommentText}>Add Comment</Text>
                  </TouchableOpacity>
                </View>

                {/* Comment input */}
                {isCommenting && (
                  <View style={styles.commentInputContainer}>
                    <TextInput
                      ref={commentInputRef}
                      style={styles.commentInput}
                      placeholder="Write a comment..."
                      placeholderTextColor="rgba(217, 213, 236, 0.5)"
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                      maxLength={500}
                    />
                    <View style={styles.commentInputButtons}>
                      <TouchableOpacity
                        style={styles.cancelCommentButton}
                        onPress={() => {
                          setIsCommenting(false);
                          setNewComment("");
                        }}
                        disabled={isSubmittingComment}
                      >
                        <Text style={styles.cancelCommentText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.submitCommentButton,
                          (!newComment.trim() || isSubmittingComment) && {
                            opacity: 0.5,
                          },
                        ]}
                        onPress={submitComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                      >
                        {isSubmittingComment ? (
                          <ActivityIndicator size="small" color="#231456" />
                        ) : (
                          <Text style={styles.submitCommentText}>Submit</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Comments list */}
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAuthorDetails}>
                          <View style={styles.commentAvatarContainer}>
                            <Text style={styles.commentAvatarText}>
                              {comment.author.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.commentAuthor}>{comment.author}</Text>
                            <Text style={styles.commentDate}>{comment.date}</Text>
                          </View>
                        </View>
                        {comment.isOwnComment && (
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert(
                                "Delete Comment",
                                "Are you sure you want to delete this comment?",
                                [
                                  { text: "Cancel", style: "cancel" },
                                  {
                                    text: "Delete",
                                    style: "destructive",
                                    onPress: () => deleteComment(comment.id),
                                  },
                                ],
                              );
                            }}
                            style={styles.deleteCommentButton}
                          >
                            <Feather name="trash-2" size={16} color="#18C5B6" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <Feather name="message-circle" size={24} color="rgba(24, 197, 182, 0.3)" />
                    <Text style={styles.noCommentsText}>
                      No comments yet. Be the first to comment!
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  simplifiedControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  container: {
    flex: 1,
    backgroundColor: "#2D1B69",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Extra space for sticky bar
  },
  progressBar: {
    height: 3,
    backgroundColor: "#18C5B6",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? StatusBar.currentHeight || 44 : 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(45, 27, 105, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(24, 197, 182, 0.2)",
  },
  headerBackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(24, 197, 182, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 10,
  },
  headerRight: {
    width: 32,
  },
  imageContainer: {
    width: "100%",
    height: 240,
    overflow: "hidden",
  },
  postImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 1,
  },
  noImageSpacer: {
    height: 40,
  },
  postContainer: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 14,
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaData: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 5,
  },
  metaText: {
    marginLeft: 6,
    color: "rgba(217, 213, 236, 0.85)",
    fontSize: 14,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(24, 197, 182, 0.15)",
    borderColor: "rgba(24, 197, 182, 0.4)",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  categoryText: {
    color: "#18C5B6",
    fontSize: 13,
    fontWeight: "600",
  },
  contentCard: {
    backgroundColor: "rgba(35, 20, 86, 0.6)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderColor: "rgba(24, 197, 182, 0.1)",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  contentContainer: {
    width: "100%",
  },
  webView: {
    backgroundColor: "transparent",
  },

  // Sticky Action Bar Styles - UPDATED
  stickyActionBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? (StatusBar.currentHeight || 44) + 60 : 60, // Position below header
    left: 0,
    right: 0,
    backgroundColor: "rgba(45, 27, 105, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 6, // Reduced padding
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 5,
    zIndex: 9, // Below the header (which has zIndex 10)
    borderBottomWidth: 1,
    borderBottomColor: "rgba(24, 197, 182, 0.2)",
  },

  // Action Bar Content - UPDATED
  actionBarContent: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  mainActionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Action button styles - UPDATED
  actionButton: {
    width: 32, // Reduced from 44
    height: 32, // Reduced from 44
    borderRadius: 16, // Reduced from 22
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8, // Changed from marginRight
    backgroundColor: "#18C5B6",
  },

  // Count displays next to icon - UPDATED
  counterText: {
    fontSize: 11, // Reduced from 14
    fontWeight: "700",
    marginLeft: 3, // Reduced from 5
  },

  // Like button specific styles
  likeButtonActive: {
    backgroundColor: "#FF6B6B", // Red color for active like
    borderWidth: 1,
    borderColor: "#FF4757",
  },
  likeButtonInactive: {
    backgroundColor: "#18C5B6",
    borderWidth: 1,
    borderColor: "rgba(24, 197, 182, 0.7)",
  },
  likeButtonActiveText: {
    color: "#FFFFFF",
  },
  likeButtonInactiveText: {
    color: "#231456",
  },

  // Comment button specific styles
  commentButtonActive: {
    backgroundColor: "#4A90E2", // Blue color for active comment section
    borderWidth: 1,
    borderColor: "#357AE8",
  },
  commentButtonInactive: {
    backgroundColor: "#18C5B6",
    borderWidth: 1,
    borderColor: "rgba(24, 197, 182, 0.7)",
  },
  commentButtonActiveText: {
    color: "#FFFFFF",
  },
  commentButtonInactiveText: {
    color: "#231456",
  },

  // Font size controls - UPDATED
  fontSizeControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 197, 182, 0.1)",
    borderRadius: 16,
    padding: 2, // Reduced from 4
    marginLeft: 8,
    borderColor: "rgba(24, 197, 182, 0.3)",
    borderWidth: 1,
  },
  fontSizeButton: {
    backgroundColor: "rgba(24, 197, 182, 0.9)",
    width: 24, // Reduced from 32
    height: 24, // Reduced from 32
    borderRadius: 12, // Reduced from 16
    alignItems: "center",
    justifyContent: "center",
  },
  fontSizeDisplay: {
    paddingHorizontal: 6, // Reduced from 12
  },
  fontSizeText: {
    color: "#18C5B6",
    fontWeight: "bold",
    fontSize: 12, // Reduced from 14
  },

  backButtonAbsolute: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(35, 20, 86, 0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 10,
    borderColor: "rgba(24, 197, 182, 0.3)",
    borderWidth: 1,
  },
  backButtonTextSmall: {
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 4,
    fontWeight: "500",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18C5B6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  backButtonText: {
    color: "#231456",
    marginLeft: 6,
    fontWeight: "600",
    fontSize: 15,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorText: {
    color: "#18C5B6",
    fontSize: 18,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  loadingText: {
    color: "#D9D5EC",
    marginTop: 12,
    fontSize: 16,
  },

  // Comments section styles
  commentsSection: {
    marginTop: 16,
    backgroundColor: "rgba(35, 20, 86, 0.8)",
    borderRadius: 12,
    padding: 16,
    borderColor: "rgba(24, 197, 182, 0.15)",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  commentsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(24, 197, 182, 0.1)",
  },
  commentsSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  addCommentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 197, 182, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderColor: "rgba(24, 197, 182, 0.3)",
    borderWidth: 1,
  },
  addCommentText: {
    color: "#18C5B6",
    marginLeft: 4,
    fontWeight: "600",
    fontSize: 14,
  },
  commentInputContainer: {
    marginBottom: 16,
    borderColor: "rgba(24, 197, 182, 0.3)",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  commentInput: {
    backgroundColor: "rgba(35, 20, 86, 0.8)",
    padding: 12,
    color: "#D9D5EC",
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 15,
  },
  commentInputButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "rgba(35, 20, 86, 0.6)",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(24, 197, 182, 0.1)",
  },
  cancelCommentButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  cancelCommentText: {
    color: "#18C5B6",
    fontWeight: "600",
  },
  submitCommentButton: {
    backgroundColor: "#18C5B6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  submitCommentText: {
    color: "#231456",
    fontWeight: "700",
  },
  commentItem: {
    backgroundColor: "rgba(35, 20, 86, 0.6)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderColor: "rgba(24, 197, 182, 0.15)",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(24, 197, 182, 0.07)",
  },
  commentAuthorDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(24, 197, 182, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(24, 197, 182, 0.3)",
  },
  commentAvatarText: {
    color: "#18C5B6",
    fontWeight: "bold",
    fontSize: 16,
  },
  commentAuthor: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  commentDate: {
    color: "rgba(217, 213, 236, 0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  commentContent: {
    color: "rgba(217, 213, 236, 0.9)",
    lineHeight: 22,
    fontSize: 15,
  },
  deleteCommentButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 0, 0.2)",
  },
  noCommentsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(35, 20, 86, 0.4)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(24, 197, 182, 0.1)",
    marginTop: 10,
  },
  noCommentsText: {
    color: "rgba(217, 213, 236, 0.7)",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 10,
    fontSize: 15,
  },
});

export default PostPage;
