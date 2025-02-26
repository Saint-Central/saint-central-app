import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Animated,
  ActivityIndicator,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import { router } from "expo-router";

// Get screen dimensions
const { width } = Dimensions.get("window");

// TypeScript interfaces
interface Post {
  id: number;
  title: string;
  author: string;
  date: string;
  image: string;
  excerpt: string;
  readTime?: string;
  videoLink?: string;
  category?: string;
}

interface FaithPostRow {
  post_id: number;
  title: string;
  excerpt: string;
  image_url?: string;
  created_at: string;
  video_link?: string;
  author_name?: string;
  user_id?: string;
  category?: string;
}

// Utility function to convert HTML/JSON to plain text and truncate
const stripHtmlAndTruncate = (content: string, maxLength = 150): string => {
  try {
    // Check if content is JSON
    if (content.startsWith("[") || content.startsWith("{")) {
      const jsonContent = JSON.parse(content);
      // If it's the specific structure with "blocks"
      if (Array.isArray(jsonContent.blocks)) {
        // Extract text from blocks
        const textContent = jsonContent.blocks
          .map((block: { text: string }) => block.text || "")
          .join(" ");
        if (textContent.length > maxLength) {
          return textContent.substring(0, maxLength).trim() + "...";
        }
        return textContent;
      }
      // For other JSON structures, stringify it
      return JSON.stringify(jsonContent, null, 2);
    }

    // Strip HTML tags
    const strippedText = content.replace(/<[^>]*>?/gm, "");

    // Truncate if needed
    if (strippedText.length > maxLength) {
      return strippedText.substring(0, maxLength).trim() + "...";
    }
    return strippedText;
  } catch (error) {
    console.error("Error parsing content:", error);
    // If parsing fails, strip HTML and truncate
    const strippedText = content.replace(/<[^>]*>?/gm, "");
    if (strippedText.length > maxLength) {
      return strippedText.substring(0, maxLength).trim() + "...";
    }
    return strippedText;
  }
};

const FaithPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  // Fetch posts from Supabase
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("faith_posts")
          .select(
            `
            post_id,
            title,
            excerpt,
            image_url,
            created_at,
            video_link,
            author_name,
            user_id,
            category
          `
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching posts:", error.message);
          return;
        }

        // Transform the Supabase rows into Post objects
        const postsTransformed: Post[] = (data as FaithPostRow[]).map((row) => {
          return {
            id: row.post_id,
            title: row.title,
            author: row.author_name || "Unknown",
            date: new Date(row.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
            image:
              row.image_url ||
              "https://media.cntraveler.com/photos/5abbb19e44769047c2c7b8cb/16:9/w_1920,c_limit/GettyImages-475446104.jpg",
            excerpt: row.excerpt,
            readTime: `${Math.ceil(
              row.excerpt.split(" ").length / 200
            )} min read`,
            videoLink: row.video_link,
            category: row.category,
          };
        });

        setPosts(postsTransformed);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Filter posts based on category and search term
  const filteredPosts = posts.filter((post) => {
    const matchesFilter =
      activeFilter === "all" || post.category === activeFilter;
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Categories for filter buttons
  const categories = [
    "all",
    "Reflections",
    "Testimonies",
    "Teachings",
    "Prayers",
    "Other",
  ];

  // Progress bar interpolation
  const progressWidth = scrollY.interpolate({
    inputRange: [0, 1000],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  // Post item component
  const PostItem: React.FC<{ item: Post; index: number }> = ({
    item,
    index,
  }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { width } = Dimensions.get("window");

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.postCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            const slug = item.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            router.push(
              `/faith?id=${item.id}&title=${encodeURIComponent(slug)}`
            );
          }}
          style={styles.touchablePost}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.image }}
              style={styles.postImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              style={styles.imageGradient}
            />
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>

          <View style={styles.postContent}>
            <Text style={styles.postTitle}>{item.title}</Text>

            <Text style={styles.postExcerpt} numberOfLines={3}>
              {stripHtmlAndTruncate(item.excerpt)}
            </Text>

            <View style={styles.postFooter}>
              <View style={styles.authorContainer}>
                <View style={styles.authorDot} />
                <Text style={styles.authorName}>{item.author}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Feather name="calendar" size={16} color="#A8A29E" />
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render function for FlatList
  const renderPostItem = ({ item, index }: { item: Post; index: number }) => (
    <PostItem item={item} index={index} />
  );

  // Header component
  const renderHeader = () => (
    <>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Faith</Text>
        <Text style={styles.subtitle}>
          Explore spiritual journeys, reflections, and insights from our
          community
        </Text>
        <View style={styles.scrollIndicator}>
          <Feather name="chevron-down" size={24} color="#A8A29E" />
        </View>
      </View>

      {/* Category Filters */}
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === item && styles.activeFilterButton,
            ]}
            onPress={() => setActiveFilter(item)}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === item && styles.activeFilterButtonText,
              ]}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.filterButtonsContent}
      />
    </>
  );

  // Empty state component
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No posts found</Text>
    </View>
  );

  // Loading indicator
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#EAB308" />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1c1917" />

      {/* Progress Bar */}
      <Animated.View style={[styles.progressBar, { width: progressWidth }]} />

      {/* Header Navigation */}
      <View style={styles.headerNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/home")}
        >
          <Feather name="chevron-left" size={16} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Return Home</Text>
        </TouchableOpacity>

        <View
          style={[
            styles.searchContainer,
            isSearchFocused && styles.searchContainerFocused,
          ]}
        >
          <TextInput
            placeholder="Search posts..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholderTextColor="#A8A29E"
            style={styles.searchInput}
          />
          {searchTerm ? (
            <TouchableOpacity
              onPress={() => setSearchTerm("")}
              style={styles.clearButton}
            >
              <Feather name="x" size={16} color="#A8A29E" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main Content */}
      {isLoading ? (
        renderLoading()
      ) : (
        <Animated.FlatList
          data={filteredPosts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Background Particles */}
      <View style={styles.particlesContainer}>
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1917",
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: "#EAB308",
    zIndex: 10,
  },
  headerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(28, 25, 23, 0.8)",
    zIndex: 5,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#292524",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    color: "#FFFFFF",
    marginLeft: 4,
    fontSize: 14,
  },
  searchContainer: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchContainerFocused: {
    borderColor: "#EAB308",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    paddingVertical: 6,
  },
  clearButton: {
    padding: 4,
  },
  header: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 36,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  subtitle: {
    fontSize: 16,
    color: "#D6D3D1",
    textAlign: "center",
    marginBottom: 24,
  },
  scrollIndicator: {
    marginTop: 16,
  },
  filterButtonsContent: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(41, 37, 36, 0.8)",
    marginHorizontal: 4,
  },
  activeFilterButton: {
    backgroundColor: "#EAB308",
  },
  filterButtonText: {
    color: "#D6D3D1",
    fontSize: 14,
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  flatListContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "rgba(41, 37, 36, 0.8)",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  touchablePost: {
    flex: 1,
  },
  imageContainer: {
    height: 180,
    width: "100%",
  },
  postImage: {
    height: "100%",
    width: "100%",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  postContent: {
    padding: 16,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  excerptContainer: {
    marginBottom: 16,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EAB308",
    marginRight: 6,
  },
  authorName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    color: "#A8A29E",
    fontSize: 12,
    marginLeft: 4,
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(28, 25, 23, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#D6D3D1",
    fontSize: 16,
    textAlign: "center",
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#EAB308",
    opacity: 0.2,
  },
  postExcerpt: {
    fontSize: 14,
    color: "#D6D3D1",
    lineHeight: 20,
  },
});

export default FaithPage;
