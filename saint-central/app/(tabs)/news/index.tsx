import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  Animated,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Linking,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../supabaseClient";
import { WebView } from "react-native-webview";

interface Post {
  post_id: number;
  title: string;
  image_url: string;
  excerpt: string;
  video_link: string | null;
  date: string;
  author_name: string;
}

interface SupabasePost {
  post_id: number;
  title: string;
  excerpt: string;
  image_url: string;
  video_link: string | null;
  created_at: string;
  author_name: string;
}

// A reusable component to render HTML content via a WebView with dynamic height.
interface HtmlExcerptProps {
  html: string;
  fontSize: number;
}

const HtmlExcerpt: React.FC<HtmlExcerptProps> = ({ html, fontSize }) => {
  const [height, setHeight] = useState(100);

  const createHtml = (content: string) => {
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
    const bodyContent = hasHtmlTags ? content : `<p>${content}</p>`;
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
              color: #E0E0E0;
              padding: 0;
              margin: 0;
              background-color: transparent;
              overflow: hidden;
            }
            p {
              margin-bottom: 20px;
              text-align: justify;
            }
            a {
              color: #FFD700;
              text-decoration: none;
              border-bottom: 1px solid rgba(255, 215, 0, 0.3);
            }
          </style>
        </head>
        <body>
          ${bodyContent}
        </body>
      </html>
    `;
  };

  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.height) {
        setHeight(data.height);
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

  const injectedJavaScript = `
    function updateHeight() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        height: document.body.scrollHeight
      }));
    }
    setTimeout(updateHeight, 300);
    const observer = new MutationObserver(updateHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    true;
  `;

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html: createHtml(html) }}
      style={{ height, backgroundColor: "transparent" }}
      injectedJavaScript={injectedJavaScript}
      onMessage={onWebViewMessage}
      scrollEnabled={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
};

const NewsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollY = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get("window").width;

  // Fetch posts from Supabase
  useEffect(() => {
    const getPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("news_posts")
          .select(
            "post_id, title, excerpt, image_url, video_link, created_at, author_name"
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching posts:", error.message);
          return;
        }

        const postsTransformed = ((data as SupabasePost[]) || []).map(
          (row) => ({
            post_id: row.post_id,
            title: row.title,
            excerpt: row.excerpt,
            image_url: row.image_url,
            video_link: row.video_link,
            date: new Date(row.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
            author_name: row.author_name,
          })
        );

        setPosts(postsTransformed);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getPosts();
  }, []);

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Use a fixed dark theme
  const theme = {
    background: "#3E2723",
    cardBackground: "#5D4037",
    text: "#FFCCBC",
    accent: "#D84315",
    headerBackground: "rgba(62,39,35,0.8)",
    progressBar: "#D84315",
    inputBackground: "#6D4C41",
  };

  const progressWidth = scrollY.interpolate({
    inputRange: [0, 1000],
    outputRange: [0, screenWidth],
    extrapolate: "clamp",
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Progress Bar */}
      <Animated.View
        style={[
          styles.progressBar,
          { backgroundColor: theme.progressBar, width: progressWidth },
        ]}
      />

      {/* Header with safe area inset */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: theme.headerBackground,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.homeButton,
            { backgroundColor: theme.inputBackground },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
          <Text style={[styles.homeButtonText, { color: theme.text }]}>
            Home
          </Text>
        </TouchableOpacity>
        {/* Removed theme toggle; only the search input remains */}
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: theme.inputBackground, color: theme.text },
          ]}
          placeholder="Search news..."
          placeholderTextColor="#FFCCBC"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>News</Text>
          <Text style={[styles.pageSubtitle, { color: theme.text }]}>
            Explore news around the Catholic community
          </Text>
        </View>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          <View style={styles.postsList}>
            {filteredPosts.map((post) => (
              <View
                key={post.post_id}
                style={[styles.card, { backgroundColor: theme.cardBackground }]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.authorName, { color: theme.text }]}>
                    {post.author_name}
                  </Text>
                  <Text style={[styles.postDate, { color: theme.text }]}>
                    · {post.date}
                  </Text>
                </View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {post.title}
                </Text>
                {post.image_url ? (
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={{ uri: post.image_url }}
                      style={styles.cardImage}
                    />
                  </View>
                ) : null}
                <View style={styles.excerptContainer}>
                  <HtmlExcerpt html={post.excerpt} fontSize={16} />
                </View>
                {post.video_link ? (
                  <TouchableOpacity
                    style={[
                      styles.videoButton,
                      { backgroundColor: theme.inputBackground },
                    ]}
                    onPress={() => Linking.openURL(post.video_link as string)}
                  >
                    <Text style={styles.videoButtonText}>Watch Video →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        )}
        {/* Extra bottom padding for the Expo footer nav */}
        <View style={styles.navBarSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 4,
    zIndex: 50,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 40,
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  homeButtonText: {
    fontSize: 16,
    marginLeft: 4,
  },
  searchInput: {
    height: 40,
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
    marginTop: 80, // Space for the header + safe area
  },
  contentContainer: {
    paddingBottom: 20,
  },
  pageHeader: {
    alignItems: "center",
    marginVertical: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "bold",
  },
  pageSubtitle: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  postsList: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
  },
  postDate: {
    fontSize: 14,
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardImageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  excerptContainer: {
    marginVertical: 8,
  },
  videoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  videoButtonText: {
    color: "#1C1917",
    fontSize: 14,
    fontWeight: "700",
  },
  navBarSpacer: {
    height: 80,
  },
});

export default NewsScreen;
