import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";

// ChurchMembership screen component
export default function ChurchMembershipScreen(): JSX.Element {
  const navigation = useNavigation();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonAnimValues = [0, 1].map(
    () => useRef(new Animated.Value(0)).current
  );

  // Handle animations
  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Animate buttons entrance with staggered delay
    buttonAnimValues.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 400 + index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Fetch user data and check church membership
  useEffect(() => {
    async function checkChurchMembership(): Promise<void> {
      try {
        setLoading(true);

        // First get the session to ensure we have the most current session data
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        // Extract user from session
        const user = sessionData?.session?.user;

        if (user && user.id) {
          const userId = user.id;
          console.log("Current user ID:", userId);

          // First get user's name
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("first_name")
            .eq("id", userId)
            .single();

          if (userError) {
            throw userError;
          }

          if (userData && userData.first_name) {
            setUserName(userData.first_name);
          } else {
            setUserName("Friend");
          }

          // Check if user exists in church_members table - using explicit UUID comparison
          console.log("Checking membership for user_id:", userId);
          const { data: memberData, error: memberError } = await supabase
            .from("church_members")
            .select("id, church_id, role")
            .eq("user_id", userId);

          if (memberError) {
            throw memberError;
          }

          console.log("Membership query results:", memberData);

          // If we have any results, user is a church member
          const membershipStatus = memberData && memberData.length > 0;
          console.log("Is user a church member?", membershipStatus);

          setIsMember(membershipStatus);

          // Set navigation flag if user is a member
          if (membershipStatus) {
            console.log("Setting shouldNavigate to true");
            setShouldNavigate(true);
          }
        } else {
          console.log("No valid user in session");
          // Handle case where user is not logged in
          setUserName("Guest");
          setIsMember(false);
        }
      } catch (error) {
        console.error("Error checking church membership:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
        setIsMember(false);
      } finally {
        setLoading(false);
      }
    }

    checkChurchMembership();
  }, []);

  // Handle navigation separately when membership is confirmed
  useEffect(() => {
    if (shouldNavigate && !loading) {
      // Add debug logging
      console.log("Ready to navigate to church page");

      // Use immediate navigation - no delays
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: "church" as never }],
        });
      } catch (navError) {
        console.error("Navigation error:", navError);
        // Fallback to navigate method if reset fails
        navigation.navigate("church" as never);
      }
    }
  }, [shouldNavigate, loading, navigation]);

  // Button press animation
  const pressButton = (index: number, pressed: boolean) => {
    Animated.spring(buttonAnimValues[index], {
      toValue: pressed ? 0.95 : 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Card decorations (subtle visual elements)
  const CardDecoration = () => (
    <View style={styles.cardDecoration}>
      <View style={[styles.decorationDot, styles.decorationDot1]} />
      <View style={[styles.decorationDot, styles.decorationDot2]} />
      <View style={[styles.decorationDot, styles.decorationDot3]} />
    </View>
  );

  // Loading State
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

  // Church member navigation loading state
  if (shouldNavigate) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3A86FF" />
      </View>
    );
  }

  // Not a church member UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Top decoration circles that extend into the safe area */}
      <View style={styles.topDecoration}>
        <View style={[styles.circle1]} />
        <View style={[styles.circle2]} />
        <View style={[styles.circle3]} />
      </View>

      {/* Header with title */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["#3A86FF", "#4361EE"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.titleAccent}
        />
        <Text style={styles.headerTitle}>Find Your Community</Text>
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.mainContent,
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
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#FF006E" />
            <Text style={styles.errorText}>
              Something went wrong. Please try again.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Hello, {userName}</Text>
              <Text style={styles.statusMessage}>
                You are not a part of a church
              </Text>
            </View>

            <View style={styles.infoCard}>
              <LinearGradient
                colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.15)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoCardGradient}
              >
                <CardDecoration />
                <View style={styles.infoIconContainer}>
                  <LinearGradient
                    colors={["#3A86FF", "#4361EE"]}
                    style={styles.infoIcon}
                  >
                    <FontAwesome5 name="church" size={26} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.infoTitle}>Join a Church Community</Text>
                <Text style={styles.infoDescription}>
                  Connect with a local church to grow in faith, access
                  resources, and join fellowship activities.
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.buttonsContainer}>
              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    transform: [
                      { scale: buttonAnimValues[0] },
                      {
                        translateY: buttonAnimValues[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                    opacity: buttonAnimValues[0],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPressIn={() => pressButton(0, true)}
                  onPressOut={() => pressButton(0, false)}
                  onPress={() => navigation.navigate("churchSearch" as never)}
                >
                  <LinearGradient
                    colors={["#3A86FF", "#4361EE"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    <MaterialCommunityIcons
                      name="magnify"
                      size={20}
                      color="#FFFFFF"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.primaryButtonText}>
                      Search for a Church
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    transform: [
                      { scale: buttonAnimValues[1] },
                      {
                        translateY: buttonAnimValues[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                    opacity: buttonAnimValues[1],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPressIn={() => pressButton(1, true)}
                  onPressOut={() => pressButton(1, false)}
                  onPress={() => navigation.navigate("home" as never)}
                >
                  <View style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>
                      I don't want to join one right now
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");

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
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#3A86FF",
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
  topDecoration: {
    position: "absolute",
    top: 20,
    right: -48,
    width: 160,
    height: 160,
    zIndex: 0,
  },
  circle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(58, 134, 255, 0.03)",
    top: 10,
    right: 10,
  },
  circle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(58, 134, 255, 0.05)",
    top: 30,
    right: 30,
  },
  circle3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(58, 134, 255, 0.07)",
    top: 50,
    right: 50,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: Platform.OS === "ios" ? 60 : 50,
    marginBottom: 30,
  },
  titleAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeContainer: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#94A3B8",
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },
  infoCard: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: "hidden",
  },
  infoCardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.5)",
  },
  infoIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  infoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4.5,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
    textAlign: "center",
  },
  buttonsContainer: {
    marginBottom: 40,
  },
  buttonWrapper: {
    marginBottom: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3A86FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 0, 110, 0.1)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#FF006E",
    marginLeft: 12,
    fontWeight: "500",
    flex: 1,
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
});
