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
  Modal,
  Share,
  Platform,
  useWindowDimensions,
  SafeAreaView,
  Pressable,
  StatusBar,
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

const PostPage = () => {
  // Get iOS status bar height
  const statusBarHeight =
    Platform.OS === "ios" ? StatusBar.currentHeight || 44 : 0;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [webViewHeight, setWebViewHeight] = useState<number>(300);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Add ref for ScrollView
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    async function fetchPost() {
      try {
        setIsLoading(true); // Ensure loading state is true when fetching starts

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
            `
          )
          .eq("post_id", numericId)
          .single();

        if (error) {
          console.error("Supabase error:", error.message);
          setError(error.message);
          setIsLoading(false);
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const currentUserId = sessionData?.session?.user?.id;

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
          isAuthor: currentUserId ? data.user_id === currentUserId : false,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [id]);

  // Add effect to scroll to top when post is loaded
  useEffect(() => {
    if (!isLoading && post && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isLoading, post]);

  const onShare = async () => {
    try {
      const excerpt = post ? post.excerpt.replace(/<[^>]*>?/gm, "") : "";
      await Share.share({
        message: post
          ? `${post.title}\n\n${excerpt.substring(
              0,
              100
            )}...\n\nRead more at [Your URL here]`
          : "",
      });
      setShareModalOpen(false);
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
              overflow: hidden;
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
    
    setTimeout(updateHeight, 300);
    
    const observer = new MutationObserver(updateHeight);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      characterData: true 
    });
    
    document.addEventListener('DOMContentLoaded', function() {
      const images = document.getElementsByTagName('img');
      for (let i = 0; i < images.length; i++) {
        images[i].onload = updateHeight;
        images[i].onerror = updateHeight;
      }
    });
    
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    document.addEventListener('touchstart', function(e) {
      e.stopPropagation();
    }, false);
    
    true;
  `;

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
          <Feather
            name="alert-circle"
            size={40}
            color="#18C5B6"
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error || "Post not found"}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("../culture-and-testimonies")}
          >
            <Feather name="chevron-left" size={16} color="#FFFFFF" />
            <Text style={styles.backButtonText}>
              Return to Culture and Testimonies Articles
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: "clamp",
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Floating Header */}
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

      <Animated.ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, { opacity: fadeAnim }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
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
          <Animated.View
            style={[
              styles.imageContainer,
              { transform: [{ scale: imageScale }] },
            ]}
          >
            <Image source={{ uri: post.image }} style={styles.postImage} />
            <View style={styles.imageDimOverlay} />
          </Animated.View>
        ) : (
          <View style={styles.noImageSpacer} />
        )}

        <View style={styles.postContainer}>
          {/* Title with drop shadow for better readability */}
          <Text style={styles.title}>{post.title}</Text>

          {/* Category badge */}
          {post.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          )}

          {/* Meta data */}
          <View style={styles.metaData}>
            <View style={styles.metaItem}>
              <Feather name="user" size={14} color="#18C5B6" />
              <Text style={styles.metaText}>{post.author}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={14} color="#18C5B6" />
              <Text style={styles.metaText}>{post.date}</Text>
            </View>
          </View>

          {/* Content card */}
          <View style={styles.contentCard}>
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
                renderLoading={() => (
                  <ActivityIndicator size="small" color="#18C5B6" />
                )}
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

          {/* Button row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShareModalOpen(true)}
              activeOpacity={0.8}
            >
              <Feather name="share-2" size={18} color="#231456" />
              <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>

            <View style={styles.fontSizeControls}>
              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={decreaseFontSize}
                activeOpacity={0.8}
              >
                <Feather name="minus" size={16} color="#231456" />
              </TouchableOpacity>

              <View style={styles.fontSizeDisplay}>
                <Text style={styles.fontSizeText}>{fontSize}</Text>
              </View>

              <TouchableOpacity
                style={styles.fontSizeButton}
                onPress={increaseFontSize}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color="#231456" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Extra padding for nav bar */}
        <View style={styles.navBarSpacer} />
      </Animated.ScrollView>

      {/* Share Modal */}
      <Modal
        transparent={true}
        visible={shareModalOpen}
        animationType="fade"
        onRequestClose={() => setShareModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShareModalOpen(false)}
        >
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Share this article</Text>
            <TouchableOpacity
              onPress={onShare}
              style={styles.modalButton}
              activeOpacity={0.8}
            >
              <Feather
                name="share-2"
                size={18}
                color="#231456"
                style={styles.modalButtonIcon}
              />
              <Text style={styles.modalButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShareModalOpen(false)}
              style={styles.cancelButton}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2D1B69",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
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
    backgroundColor: "rgba(45, 27, 105, 0.8)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(24,197,182,0.2)",
  },
  headerBackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#231456",
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
    color: "#D9D5EC",
    fontSize: 14,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(45, 27, 105, 0.8)",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  contentCard: {
    backgroundColor: "rgba(35, 20, 86, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderColor: "rgba(24,197,182,0.1)",
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
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#18C5B6",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    color: "#231456",
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 15,
  },
  fontSizeControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24,197,182,0.1)",
    borderRadius: 10,
    padding: 4,
    borderColor: "rgba(24,197,182,0.3)",
    borderWidth: 1,
  },
  fontSizeButton: {
    backgroundColor: "#18C5B6",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fontSizeDisplay: {
    paddingHorizontal: 12,
  },
  fontSizeText: {
    color: "#231456",
    fontWeight: "bold",
    fontSize: 14,
  },
  backButtonAbsolute: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#231456",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 10,
    borderColor: "rgba(24,197,182,0.3)",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#231456",
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    borderColor: "rgba(24,197,182,0.2)",
    borderWidth: 1,
    alignItems: "center",
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(24,197,182,0.3)",
    borderRadius: 3,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#D9D5EC",
  },
  modalButton: {
    backgroundColor: "#18C5B6",
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: "center",
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
  modalButtonIcon: {
    marginRight: 8,
  },
  modalButtonText: {
    color: "#231456",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "rgba(24,197,182,0.1)",
    alignItems: "center",
    width: "100%",
    borderColor: "rgba(24,197,182,0.3)",
    borderWidth: 1,
  },
  cancelButtonText: {
    color: "#18C5B6",
    fontWeight: "600",
    fontSize: 16,
  },
  navBarSpacer: {
    height: 80,
  },
});

export default PostPage;
