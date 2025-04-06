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
  Animated,
  StatusBar,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import { Ionicons, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

// Import the Sidebar component
import Sidebar from "./sidebarComponent";
import ChurchProfileCard from "@/components/church/ChurchProfileCard";
import theme from "@/theme";
import DecoratedHeader from "@/components/ui/DecoratedHeader";

// Church interface based on database schema
interface Church {
  id: number;
  category: string;
  name: string;
  description: string;
  founded: string;
  phone: string;
  email: string;
  mass_schedule: string;
  website: string;
  image: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
}

// Member interface
interface ChurchMember {
  id: number;
  church_id: number;
  user_id: string;
  role: string;
  joined_at: string;
}

// Route params interface
interface RouteParams {
  churchId?: number;
}

// Church screen component
export default function ChurchScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute();
  const [church, setChurch] = useState<Church | null>(null);
  const [member, setMember] = useState<ChurchMember | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [leavingChurch, setLeavingChurch] = useState<boolean>(false);

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

  // Function to handle leaving the church
  const handleLeaveChurch = async (): Promise<void> => {
    if (!member) return;

    try {
      setLeavingChurch(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No user logged in");

      // Delete the membership record
      const { error: deleteError } = await supabase
        .from("church_members")
        .delete()
        .eq("id", member.id);

      if (deleteError) throw deleteError;

      // Navigate back to home screen
      navigation.navigate("home" as never);
    } catch (error) {
      console.error("Error leaving church:", error);
      Alert.alert("Error", "Failed to leave the church. Please try again later.");
    } finally {
      setLeavingChurch(false);
    }
  };

  // Confirm leaving the church
  const confirmLeaveChurch = () => {
    Alert.alert(
      "Leave Church",
      "Are you sure you want to leave this church? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Leave",
          onPress: handleLeaveChurch,
          style: "destructive",
        },
      ],
      { cancelable: true },
    );
  };

  // Fetch church data
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
        console.log("Fetching church data...");

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

        // Fetch church membership information for this specific user
        console.log("Fetching membership for user:", user.id);
        const { data: memberData, error: memberError } = await supabase
          .from("church_members")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (memberError) {
          console.error("Error fetching membership:", memberError);
          throw memberError;
        }

        console.log("Membership data:", memberData);
        setMember(memberData);

        // Get church ID - either from route params or from membership
        const params = route.params as RouteParams;
        const churchId = params?.churchId || memberData.church_id;

        console.log("Church ID to fetch:", churchId);

        // Fetch church details with more detailed logging
        console.log(`Attempting to fetch church with ID ${churchId} from 'churches' table`);

        const { data: churchData, error: churchError } = await supabase
          .from("churches")
          .select("*")
          .eq("id", churchId);

        console.log("Church query result:", churchData);

        if (churchError) {
          console.error("Error fetching church data:", churchError);
          throw churchError;
        }

        if (!churchData || churchData.length === 0) {
          console.error(`No church found with ID ${churchId}`);

          // Check what churches exist in the database
          const { data: allChurches, error: allChurchesError } = await supabase
            .from("churches")
            .select("id, name");

          if (allChurchesError) {
            console.error("Error checking churches table:", allChurchesError);
          } else {
            console.log("Available churches in database:", allChurches);
          }

          throw new Error(`Church with ID ${churchId} not found. Please check your database.`);
        }

        // Use the first result if multiple are returned
        const church = churchData[0];
        console.log("Successfully fetched church data:", church.name);
        setChurch(church);
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

  if (error || !church) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF006E" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load church information"}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.navigate("home" as never)}
          >
            <Text style={styles.errorButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        userName={userName}
        profileImage={profileImage}
      />

      {/* Floating header effect with Church Name - with menu button */}
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
        <BlurView intensity={98} tint="extraLight" style={styles.blurView} />
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
          {/* Add menu button to the left */}
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.titleWrapper}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.titleAccent}
            />
            <Text style={styles.floatingTitle}>{church.name}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {/* Header with menu button */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.menuButtonHeader} onPress={toggleSidebar}>
              <Ionicons name="menu" size={24} color="#3A86FF" />
            </TouchableOpacity>
            <DecoratedHeader label={church.name} />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("me" as never)}
            style={styles.profileContainer}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePic} resizeMode="cover" />
            ) : (
              <View style={styles.profilePic}>
                <LinearGradient colors={["#3A86FF", "#4361EE"]} style={styles.profileGradient}>
                  <Text style={styles.profileInitial}>
                    {userName ? userName[0].toUpperCase() : "?"}
                  </Text>
                </LinearGradient>
              </View>
            )}
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </Animated.View>

        {/* Church Image */}
        {church.image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: church.image }} style={styles.churchImage} resizeMode="cover" />
          </View>
        )}

        {/* Quick Action Buttons - MOVED UP HERE */}
        <ScrollView contentContainerStyle={styles.quickActionsScrollContainer}>
          <TouchableOpacity
            style={styles.quickActionButton}
            activeOpacity={0.85}
            onPress={() => {
              /* Navigate to ministries */
            }}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconWrapper}>
                <LinearGradient
                  colors={["#3A86FF", "#4361EE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <FontAwesome5 name="church" size={26} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>Ministries</Text>
                <Text style={styles.buttonDescription}>Faith in action</Text>
              </View>
              <View style={styles.arrowContainer}>
                <MaterialIcons name="arrow-forward-ios" size={14} color="#CBD5E1" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            activeOpacity={0.85}
            onPress={() => {
              /* Navigate to courses */
            }}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconWrapper}>
                <LinearGradient
                  colors={["#FF006E", "#FB5607"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="book-outline" size={26} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>Courses</Text>
                <Text style={styles.buttonDescription}>Grow in knowledge</Text>
              </View>
              <View style={styles.arrowContainer}>
                <MaterialIcons name="arrow-forward-ios" size={14} color="#CBD5E1" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            activeOpacity={0.85}
            onPress={() => {
              /* Navigate to schedule */
            }}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconWrapper}>
                <LinearGradient
                  colors={["#8338EC", "#6A0DAD"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <MaterialCommunityIcons name="calendar-clock" size={26} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>Schedule</Text>
                <Text style={styles.buttonDescription}>Plan your worship</Text>
              </View>
              <View style={styles.arrowContainer}>
                <MaterialIcons name="arrow-forward-ios" size={14} color="#CBD5E1" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            activeOpacity={0.85}
            onPress={() => {
              /* Navigate to community */
            }}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconWrapper}>
                <LinearGradient
                  colors={["#06D6A0", "#1A936F"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="people" size={26} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>Community</Text>
                <Text style={styles.buttonDescription}>Connect with others</Text>
              </View>
              <View style={styles.arrowContainer}>
                <MaterialIcons name="arrow-forward-ios" size={14} color="#CBD5E1" />
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>

        <ChurchProfileCard church={church} member={member} />

        {/* Leave Church Button */}
        <TouchableOpacity
          style={styles.leaveChurchButton}
          onPress={confirmLeaveChurch}
          disabled={leavingChurch}
        >
          {leavingChurch ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="exit-outline"
                size={18}
                color="#FFFFFF"
                style={styles.leaveChurchIcon}
              />
              <Text style={styles.leaveChurchText}>Leave Church</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // New styles for the Leave Church button
  leaveChurchButton: {
    marginTop: 20,
    marginBottom: 70,
    borderRadius: 12,
    // overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: 14,
    backgroundColor: theme.destructiveBackground,
  },
  leaveChurchIcon: {
    marginRight: 10,
  },
  leaveChurchText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // New styles for the menu button
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  // All your existing styles from the original component
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  },
  mainButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  buttonIconWrapper: {
    marginRight: 16,
  },
  iconGradient: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4.5,
    elevation: 3,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    flex: 1,
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
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 20 : StatusBar.currentHeight || 20,
  },
  // Styles matching the HomeScreen component
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
    zIndex: 1,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 1,
  },
  location: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    color: "#334155",
  },
  profileContainer: {
    position: "relative",
    zIndex: 1,
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
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    height: 200,
  },
  churchImage: {
    width: "100%",
    height: "100%",
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
    height: 50,
  },
  quickActionsScrollContainer: {
    width: "100%",
    marginBottom: 20,
    gap: 10,
  },
  quickActionButton: {
    borderRadius: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 8,
  },
});
