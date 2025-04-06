import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  TouchableOpacity,
  Animated,
  StatusBar,
  Image,
  Linking,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import { Ionicons, FontAwesome5, MaterialIcons, AntDesign } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Define route params type
type ChurchDetailsRouteParams = {
  churchId: string;
};

// Define type for the route
type ChurchDetailsRouteProp = RouteProp<
  { ChurchDetails: ChurchDetailsRouteParams },
  "ChurchDetails"
>;

// Types for church data
interface Church {
  id: string;
  name: string;
  address: string;
  category: string | null;
  description: string | null;
  founded: string | null;
  phone: string | null;
  email: string | null;
  mass_schedule: string | null;
  website: string | null;
  image: string | null;
  lat: number | null;
  lng: number | null;
}

// Collapsible Header Component - Enhanced for flawless native animation
const CollapsibleHeader = ({
  scrollY,
  church,
  insets,
  onBackPress,
}: {
  scrollY: Animated.Value;
  church: Church;
  insets: { top: number; bottom: number; left: number; right: number };
  onBackPress: () => void;
}) => {
  // Define header constants - Make sure values are integers to avoid subpixel rendering issues
  const MAX_HEADER_HEIGHT = Math.round(350 + insets.top);
  const MIN_HEADER_HEIGHT = Math.round(insets.top + 60);
  const SCROLL_DISTANCE = MAX_HEADER_HEIGHT - MIN_HEADER_HEIGHT;

  // Create smoother transitions with more interpolation points
  // This helps prevent any jerky movements during animation
  const translateY = scrollY.interpolate({
    inputRange: [
      0,
      SCROLL_DISTANCE * 0.25,
      SCROLL_DISTANCE * 0.5,
      SCROLL_DISTANCE * 0.75,
      SCROLL_DISTANCE,
    ],
    outputRange: [
      0,
      -SCROLL_DISTANCE * 0.25,
      -SCROLL_DISTANCE * 0.5,
      -SCROLL_DISTANCE * 0.75,
      -SCROLL_DISTANCE,
    ],
    extrapolate: "clamp",
  });

  // Finer control over image fade with more interpolation points
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE * 0.3, SCROLL_DISTANCE * 0.6, SCROLL_DISTANCE],
    outputRange: [1, 0.8, 0.5, 0.3],
    extrapolate: "clamp",
  });

  // Smoother image movement
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE * 0.5, SCROLL_DISTANCE],
    outputRange: [0, -25, -50],
    extrapolate: "clamp",
  });

  // Finer control over title fade-in
  const titleOpacity = scrollY.interpolate({
    inputRange: [
      SCROLL_DISTANCE * 0.7,
      SCROLL_DISTANCE * 0.8,
      SCROLL_DISTANCE * 0.9,
      SCROLL_DISTANCE,
    ],
    outputRange: [0, 0.3, 0.7, 1],
    extrapolate: "clamp",
  });

  // Smoother background color transition with multiple steps
  const headerBackground = scrollY.interpolate({
    inputRange: [
      0,
      SCROLL_DISTANCE * 0.25,
      SCROLL_DISTANCE * 0.5,
      SCROLL_DISTANCE * 0.75,
      SCROLL_DISTANCE,
    ],
    outputRange: [
      "rgba(0,0,0,0)",
      "rgba(255,255,255,0.25)",
      "rgba(255,255,255,0.5)",
      "rgba(255,255,255,0.75)",
      "rgba(255,255,255,1)",
    ],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.header,
        {
          height: MAX_HEADER_HEIGHT,
          transform: [{ translateY }],
          backgroundColor: headerBackground as any, // Type cast to avoid TypeScript errors
        },
      ]}
    >
      {/* Church image */}
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: imageOpacity,
            transform: [{ translateY: imageTranslateY }],
          },
        ]}
        pointerEvents="none"
      >
        {church.image ? (
          <Image source={{ uri: church.image }} style={styles.churchImage} resizeMode="cover" />
        ) : (
          <View style={styles.churchImagePlaceholder}>
            <FontAwesome5 name="church" size={60} color="#CBD5E1" />
          </View>
        )}

        {/* Gradient overlays */}
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.3)", "transparent"]}
          style={[styles.headerGradient, { height: 100 + insets.top }]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["transparent", "#FFFFFF"]}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
      </Animated.View>

      {/* Collapsed title */}
      <Animated.View
        style={[
          styles.headerTitleContainer,
          {
            opacity: titleOpacity,
            top: insets.top,
          },
        ]}
        pointerEvents="none"
      >
        <Animated.Text
          style={[
            styles.headerTitle,
            // Type cast to any to avoid TypeScript errors with animated colors
            {
              color: scrollY.interpolate({
                inputRange: [SCROLL_DISTANCE - 20, SCROLL_DISTANCE],
                outputRange: ["#FFFFFF", "#1E293B"],
                extrapolate: "clamp",
              }) as any,
            },
          ]}
          numberOfLines={1}
        >
          {church.name}
        </Animated.Text>
      </Animated.View>

      {/* Back button */}
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            top: insets.top + 10,
          },
        ]}
        onPress={onBackPress}
      >
        <Animated.View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: scrollY.interpolate({
              inputRange: [0, SCROLL_DISTANCE],
              outputRange: ["rgba(0,0,0,0.4)", "rgba(230,230,230,0.8)"],
              extrapolate: "clamp",
            }) as any,
          }}
        >
          <Animated.Text
            style={{
              color: scrollY.interpolate({
                inputRange: [0, SCROLL_DISTANCE],
                outputRange: ["#FFFFFF", "#1E293B"],
                extrapolate: "clamp",
              }) as any,
            }}
          >
            <Ionicons name="arrow-back" size={24} />
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ChurchDetailsScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<ChurchDetailsRouteProp>();
  const { churchId } = route.params;
  const insets = useSafeAreaInsets();

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [church, setChurch] = useState<Church | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isMember, setIsMember] = useState<boolean>(false);

  // Handle entry animations
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch church details and check membership status
  useEffect(() => {
    async function fetchChurchDetails() {
      try {
        setLoading(true);
        console.log("Fetching church details for ID:", churchId);

        // Get church details
        const { data: churchData, error: churchError } = await supabase
          .from("churches")
          .select("*")
          .eq("id", churchId)
          .single();

        if (churchError) {
          console.error("Error fetching church:", churchError);
          throw churchError;
        }

        if (churchData) {
          console.log("Church data loaded:", churchData.name);
          setChurch(churchData);
        } else {
          console.log("No church data found");
        }

        // Check if user is a member of this church
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const userId = sessionData?.session?.user?.id;

        if (userId) {
          const { data: memberData, error: memberError } = await supabase
            .from("church_members")
            .select("*")
            .eq("church_id", churchId)
            .eq("user_id", userId);

          if (memberError) throw memberError;

          setIsMember(memberData && memberData.length > 0);
        }
      } catch (error) {
        console.error("Error fetching church details:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }

    fetchChurchDetails();
  }, [churchId]);

  // Handle joining church
  const handleJoinChurch = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Add user to church_members
      const { error: joinError } = await supabase.from("church_members").insert([
        {
          user_id: userId,
          church_id: churchId,
          role: "member",
          joined_at: new Date().toISOString(),
        },
      ]);

      if (joinError) throw joinError;

      // Update membership status
      setIsMember(true);

      // Navigate to church page
      navigation.reset({
        index: 0,
        routes: [{ name: "church" as never }],
      });
    } catch (error) {
      console.error("Error joining church:", error);
      alert("Failed to join church. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Navigate back to church list
  const navigateToChurchList = () => {
    navigation.navigate("churchSearch" as never);
  };

  // Action handlers
  const openWebsite = (url: string) => {
    let websiteUrl = url;
    if (!url.startsWith("http")) {
      websiteUrl = `https://${url}`;
    }
    Linking.openURL(websiteUrl);
  };

  const sendEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  // Loading state
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
          <Text style={styles.loadingText}>Loading church details...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !church) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color="#FF006E" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            We couldn't load the church details. Please try again later.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={navigateToChurchList}>
            <Text style={styles.errorButtonText}>Go Back to Church List</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Define header constants
  const MAX_HEADER_HEIGHT = 350 + insets.top;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Main content */}
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: MAX_HEADER_HEIGHT + 20 }]}
        scrollEventThrottle={16} // Important for smooth animation
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }, // Changed to true for native driver
        )}
        showsVerticalScrollIndicator={false}
        bounces={false} // Disable bouncing for smoother animation
        overScrollMode="never" // Disable overscroll effect on Android
      >
        {/* Church Name and Category */}
        <Animated.View style={[styles.churchHeaderContainer, { opacity: fadeAnim }]}>
          <Text style={styles.churchName}>{church.name}</Text>
          {church.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryText}>{church.category}</Text>
            </View>
          )}
        </Animated.View>

        {/* Church Description */}
        {church.description && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{church.description}</Text>
          </View>
        )}

        {/* Church Address */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="location-on" size={20} color="#3A86FF" />
            </View>
            <Text style={styles.addressText}>{church.address}</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          {church.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={() => callPhone(church.phone!)}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="phone" size={20} color="#3A86FF" />
              </View>
              <Text style={styles.contactText}>{church.phone}</Text>
            </TouchableOpacity>
          )}

          {church.email && (
            <TouchableOpacity style={styles.infoRow} onPress={() => sendEmail(church.email!)}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="email" size={20} color="#3A86FF" />
              </View>
              <Text style={styles.contactText}>{church.email}</Text>
            </TouchableOpacity>
          )}

          {church.website && (
            <TouchableOpacity style={styles.infoRow} onPress={() => openWebsite(church.website!)}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="language" size={20} color="#3A86FF" />
              </View>
              <Text style={styles.contactText}>{church.website}</Text>
            </TouchableOpacity>
          )}

          {!church.phone && !church.email && !church.website && (
            <Text style={styles.noInfoText}>No contact information available</Text>
          )}
        </View>

        {/* Mass Schedule */}
        {church.mass_schedule && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Mass Schedule</Text>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <AntDesign name="calendar" size={20} color="#3A86FF" />
              </View>
              <Text style={styles.scheduleText}>{church.mass_schedule}</Text>
            </View>
          </View>
        )}

        {/* Founded Information */}
        {church.founded && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Founded</Text>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="history" size={18} color="#3A86FF" />
              </View>
              <Text style={styles.foundedText}>{church.founded}</Text>
            </View>
          </View>
        )}

        {/* Spacer for join button */}
        <View style={styles.buttonSpacer} />
      </Animated.ScrollView>

      {/* Collapsible Header as a separate component */}
      <CollapsibleHeader
        scrollY={scrollY}
        church={church}
        insets={insets}
        onBackPress={navigateToChurchList}
      />

      {/* Join button - Fixed at bottom but above nav bar */}
      <Animated.View
        style={[
          styles.joinButtonContainer,
          {
            opacity: fadeAnim,
            bottom: Platform.OS === "ios" ? 100 : 85,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleJoinChurch}
          style={styles.joinButtonWrapper}
          disabled={isMember}
        >
          <LinearGradient
            colors={isMember ? ["#CBD5E1", "#94A3B8"] : ["#3A86FF", "#4361EE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.joinButton}
          >
            <Text style={styles.joinButtonText}>
              {isMember ? "Already a Member" : "Join This Church"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 16,
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
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 60,
    height: 60,
    zIndex: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  churchImage: {
    width: "100%",
    height: "100%",
  },
  churchImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 2,
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  scrollContent: {
    paddingBottom: 150, // Extra padding for join button
  },
  churchHeaderContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  churchName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  categoryContainer: {
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3A86FF",
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#475569",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    flex: 1,
    paddingTop: 5,
  },
  contactText: {
    fontSize: 15,
    color: "#475569",
    flex: 1,
    paddingTop: 5,
  },
  scheduleText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    flex: 1,
    paddingTop: 5,
  },
  foundedText: {
    fontSize: 15,
    color: "#475569",
    flex: 1,
    paddingTop: 5,
  },
  noInfoText: {
    fontSize: 15,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  joinButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  joinButtonWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#3A86FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButton: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonSpacer: {
    height: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748B",
    marginBottom: 24,
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
});
