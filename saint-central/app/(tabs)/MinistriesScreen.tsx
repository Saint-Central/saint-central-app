//this is the main home page for misnitries
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  StatusBar,
  FlatList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
  Feather,
  MaterialIcons,
  AntDesign,
} from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { StackNavigationProp } from '@react-navigation/stack';

// Import the Sidebar component
import Sidebar from "./sidebarComponent";

// Ministry interface based on database schema
interface Ministry {
  id: number;
  church_id: number;
  name: string;
  description: string;
  leader: string;
  meeting_time: string;
  location: string;
  image: string;
  created_at: string;
  member_count: number;
}

// Route params interface
interface RouteParams {
  churchId?: number;
}

// Add type definition for navigation
type RootStackParamList = {
  church: undefined;
  ministryDetail: { ministryId: number };
  MinistryGroupsScreen: undefined;
  // ... other screen types ...
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Ministries screen component
export default function MinistriesScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>("");

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Fetch ministries data
  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    async function fetchData(): Promise<void> {
      try {
        setLoading(true);
        console.log("Fetching ministries data...");

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          throw userError;
        }

        if (!user) {
          console.error("No user logged in");
          throw new Error("No user logged in");
        }

        console.log("Current user ID:", user.id);

        // Fetch user profile
        const { data: userData, error: profileError } = await supabase
          .from("users")
          .select("first_name, profile_image")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
        } else if (userData) {
          if (userData.first_name) {
            setUserName(userData.first_name);
          } else {
            setUserName("Friend");
          }

          if (userData.profile_image) {
            setProfileImage(userData.profile_image);
          }
        }

        // Get church ID from route params or from user's membership
        const params = route.params as RouteParams;
        let churchIdToUse = params?.churchId;

        if (!churchIdToUse) {
          // Fetch from membership
          const { data: memberData, error: memberError } = await supabase
            .from("church_members")
            .select("church_id")
            .eq("user_id", user.id)
            .single();

          if (memberError) {
            console.error("Error fetching membership:", memberError);
            throw memberError;
          }

          churchIdToUse = memberData.church_id;
        }

        setChurchId(churchIdToUse ?? null);
        console.log("Church ID for ministries:", churchIdToUse);

        // Fetch church name
        const { data: churchData, error: churchError } = await supabase
          .from("churches")
          .select("name")
          .eq("id", churchIdToUse)
          .single();

        if (churchError) {
          console.error("Error fetching church name:", churchError);
        } else if (churchData) {
          setChurchName(churchData.name);
        }

        // Fetch ministries for this church
        const { data: ministriesData, error: ministriesError } = await supabase
          .from("ministries")
          .select("*")
          .eq("church_id", churchIdToUse);

        if (ministriesError) {
          console.error("Error fetching ministries data:", ministriesError);
          throw ministriesError;
        }

        console.log("Ministries data:", ministriesData);
        setMinistries(ministriesData || []);
      } catch (error) {
        console.error("Error in data fetch:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Header animations based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 15],
    extrapolate: "clamp",
  });

  // Navigate to ministry detail screen
  const navigateToMinistryDetail = (ministryId: number) => {
    navigation.navigate('ministryDetail', { ministryId });
  };
  
  // Navigate to ministry groups screen
  const navigateToMinistryGroups = () => {
    navigation.navigate('MinistryGroupsScreen');
  };

  // Go back to church screen
  const navigateToChurch = () => {
    navigation.navigate('church');
  };

  // Card decorations (subtle visual elements)
  const CardDecoration = () => (
    <View style={styles.cardDecoration}>
      <View style={[styles.decorationDot, styles.decorationDot1]} />
      <View style={[styles.decorationDot, styles.decorationDot2]} />
      <View style={[styles.decorationDot, styles.decorationDot3]} />
    </View>
  );

  // Render each ministry card
  const renderMinistryItem = ({ item }: { item: Ministry }) => (
    <TouchableOpacity 
      style={styles.ministryCard} 
      activeOpacity={0.9}
      onPress={() => navigateToMinistryDetail(item.id)}
    >
      <View style={styles.ministryCardImageContainer}>
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.ministryCardImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={styles.ministryCardImagePlaceholder}>
            <FontAwesome5 name="church" size={24} color="#CBD5E1" />
          </View>
        )}
      </View>
      <View style={styles.ministryCardContent}>
        <Text style={styles.ministryCardTitle}>{item.name}</Text>
        <Text style={styles.ministryCardDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.ministryCardFooter}>
          <View style={styles.ministryCardStat}>
            <Ionicons name="people" size={14} color="#3A86FF" />
            <Text style={styles.ministryCardStatText}>{item.member_count || 0} members</Text>
          </View>
          <View style={styles.ministryCardStat}>
            <Ionicons name="time-outline" size={14} color="#3A86FF" />
            <Text style={styles.ministryCardStatText}>{item.meeting_time}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.lottieWrapper}>
          <LottieView
            source={require("../../assets/lottie/loading.json")}
            autoPlay
            loop
            style={styles.lottieAnimation}
            renderMode="HARDWARE"
            speed={0.8}
            resizeMode="cover"
          />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF006E" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load ministries information"}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.navigate("church" as never)}
          >
            <Text style={styles.errorButtonText}>Back to Church</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        userName={userName}
        profileImage={profileImage}
      />

      {/* Floating header effect with Ministries title - with menu button */}
      <Animated.View
        style={[
          styles.headerBackground,
          {
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerOpacity,
          },
        ]}
      >
        <BlurView intensity={85} tint="light" style={styles.blurView} />
        <Animated.View
          style={[
            styles.floatingTitleContainer,
            {
              opacity: headerOpacity,
              transform: [
                {
                  translateY: headerOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Back button to the left */}
          <TouchableOpacity style={styles.backButton} onPress={navigateToChurch}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.titleWrapper}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.titleAccent}
            />
            <Text style={styles.floatingTitle}>Ministries</Text>
          </View>

          {/* Menu button to the right */}
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color="#1E293B" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <Animated.View 
        style={[styles.mainContent, { opacity: fadeAnim }]}
        onTouchStart={() => closeSidebar()}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Header with church name and profile */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButtonHeader}
                onPress={navigateToChurch}
              >
                <Ionicons name="arrow-back" size={24} color="#3A86FF" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.churchNameContainer}
                onPress={navigateToChurch}
              >
                <FontAwesome5 name="church" size={16} color="#3A86FF" />
                <Text style={styles.churchName}>{churchName}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("me" as never)}
              style={styles.profileContainer}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profilePic}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profilePic}>
                  <LinearGradient
                    colors={["#3A86FF", "#4361EE"]}
                    style={styles.profileGradient}
                  >
                    <Text style={styles.profileInitial}>
                      {userName ? userName[0].toUpperCase() : "?"}
                    </Text>
                  </LinearGradient>
                </View>
              )}
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Page Title and Description */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Ministries</Text>
            <Text style={styles.pageDescription}>
              Connect with your church's ministries and get involved
            </Text>
          </View>

          {/* Search box */}
          <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <Text style={styles.searchPlaceholder}>Search ministries...</Text>
          </TouchableOpacity>

          {/* Ministry Categories */}
          <View style={styles.categoriesContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.categoriesScrollContent}
            >
              <TouchableOpacity style={[styles.categoryButton, styles.categoryButtonActive]}>
                <Text style={styles.categoryButtonTextActive}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryButton}>
                <Text style={styles.categoryButtonText}>Worship</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryButton}>
                <Text style={styles.categoryButtonText}>Education</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryButton}>
                <Text style={styles.categoryButtonText}>Outreach</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryButton}>
                <Text style={styles.categoryButtonText}>Youth</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoryButton}>
                <Text style={styles.categoryButtonText}>Missions</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Featured Ministry (if any) */}
          {ministries.length > 0 && (
            <View style={styles.featuredSection}>
              <View style={styles.sectionHeader}>
                <FontAwesome5 name="star" size={16} color="#3A86FF" />
                <Text style={styles.sectionTitle}>Featured Ministry</Text>
              </View>

              <TouchableOpacity 
                style={styles.featuredMinistryCard}
                activeOpacity={0.9}
                onPress={() => navigateToMinistryDetail(ministries[0].id)}
              >
                <LinearGradient
                  colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featuredCardGradient}
                >
                  <CardDecoration />
                  {ministries[0].image && (
                    <Image 
                      source={{ uri: ministries[0].image }} 
                      style={styles.featuredMinistryImage} 
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.featuredMinistryTitle}>{ministries[0].name}</Text>
                  <Text style={styles.featuredMinistryDescription}>
                    {ministries[0].description}
                  </Text>
                  <View style={styles.featuredMinistryStats}>
                    <View style={styles.ministryStat}>
                      <Ionicons name="people" size={16} color="#3A86FF" />
                      <Text style={styles.ministryStatText}>{ministries[0].member_count || 0} members</Text>
                    </View>
                    <View style={styles.ministryStat}>
                      <Ionicons name="person" size={16} color="#3A86FF" />
                      <Text style={styles.ministryStatText}>Led by {ministries[0].leader}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.featuredMinistryButton}
                    onPress={() => navigateToMinistryDetail(ministries[0].id)}
                  >
                    <LinearGradient
                      colors={["#3A86FF", "#4361EE"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>View Details</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* All Ministries Section */}
          <View style={styles.allMinistriesSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="list" size={16} color="#3A86FF" />
              <Text style={styles.sectionTitle}>All Ministries</Text>
            </View>

            {ministries.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyStateTitle}>No ministries found</Text>
                <Text style={styles.emptyStateText}>
                  Your church doesn't have any ministries listed yet.
                </Text>
              </View>
            ) : (
              <View style={styles.ministriesList}>
                {ministries.map((ministry) => renderMinistryItem({ item: ministry }))}
              </View>
            )}
          </View>

          {/* Create Ministry Button (for admin/leader roles) */}
          <TouchableOpacity 
            style={styles.createButton}
            onPress={navigateToMinistryGroups}
          >
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create New Ministry</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mainContent: {
    flex: 1,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 100 : 80,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 225, 0.5)",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingTitleContainer: {
    position: "absolute",
    width: "100%",
    paddingHorizontal: 20,
    top: Platform.OS === "ios" ? 55 : 30,
    height: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    flex: 1,
    justifyContent: "center",
  },
  titleAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  floatingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 30 : StatusBar.currentHeight || 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  churchNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  churchName: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    color: "#334155",
  },
  profileContainer: {
    position: "relative",
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  profileGradient: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF006E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 22,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: "#94A3B8",
    marginLeft: 10,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesScrollContent: {
    paddingRight: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryButtonActive: {
    backgroundColor: "#3A86FF",
    borderColor: "#3A86FF",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  categoryButtonTextActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  featuredSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 8,
  },
  featuredMinistryCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 10,
  },
  featuredCardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.5)",
  },
  cardDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 60,
    height: 60,
  },
  decorationDot: {
    position: "absolute",
    borderRadius: 50,
  },
  decorationDot1: {
    width: 12,
    height: 12,
    backgroundColor: "rgba(58, 134, 255, 0.2)",
    top: 15,
    right: 15,
  },
  decorationDot2: {
    width: 8,
    height: 8,
    backgroundColor: "rgba(58, 134, 255, 0.15)",
    top: 30,
    right: 22,
  },
  decorationDot3: {
    width: 6,
    height: 6,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    top: 24,
    right: 35,
  },
  featuredMinistryImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  featuredMinistryTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  featuredMinistryDescription: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 16,
  },
  featuredMinistryStats: {
    flexDirection: "row",
    marginBottom: 20,
  },
  ministryStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  ministryStatText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 6,
  },
  featuredMinistryButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  allMinistriesSection: {
    marginBottom: 24,
  },
  ministriesList: {
    marginTop: 8,
  },
  ministryCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  ministryCardImageContainer: {
    width: 100,
    height: 100,
  },
  ministryCardImage: {
    width: "100%",
    height: "100%",
  },
  ministryCardImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  ministryCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  ministryCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  ministryCardDescription: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
  },
  ministryCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ministryCardStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  ministryCardStatText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
  },
  createButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 20,
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  lottieWrapper: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  lottieAnimation: {
    width: 120,
    height: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#3A86FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 60,
  },
});