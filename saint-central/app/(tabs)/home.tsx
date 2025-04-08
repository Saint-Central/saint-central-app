import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Animated,
  StatusBar,
  TouchableOpacity,
  Platform,
} from "react-native";
import { supabase } from "../../supabaseClient";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import theme from "@/theme";
import DecoratedHeader from "@/components/ui/DecoratedHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useRouter } from "expo-router";
import ChurchPageLayout from "@/components/church/ChurchPageLayout";

// Add CardDecoration component
const CardDecoration = () => (
  <View style={{ position: "absolute", top: 10, right: 10, opacity: 0.1 }}>
    <FontAwesome5 name="cross" size={80} color="#FFFFFF" />
  </View>
);

export default function ChurchMembershipScreen(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const buttonAnimValues = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);

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
  }, [buttonAnimValues, fadeAnim]);

  // Fetch user data and check church membership
  useEffect(() => {
    async function checkChurchMembership(): Promise<void> {
      setLoading(true);
      try {
        // First get the session to ensure we have the most current session data
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        // Extract user from session
        const user = sessionData?.session?.user;
        if (!user || !user.id) {
          console.log("No valid user in session");
          setIsMember(false);
          return;
        }

        const userId = user.id;
        console.log("Checking membership for user_id:", userId);
        const { data: memberData, error: memberError } = await supabase
          .from("church_members")
          .select("id, church_id, role")
          .eq("user_id", userId);
        if (memberError) {
          throw memberError;
        }

        const membershipStatus = memberData && memberData.length > 0;
        setIsMember(membershipStatus);
        if (membershipStatus) {
          console.log("Setting shouldNavigate to true");
          setShouldNavigate(true);
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

  // Button press animation
  const pressButton = (index: number, pressed: boolean) => {
    Animated.spring(buttonAnimValues[index], {
      toValue: pressed ? 0.97 : 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

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

  if (shouldNavigate && !loading) {
    return <ChurchPageLayout />;
  }

  // Not a church member UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <DecoratedHeader
        label="Find Your Community"
        styles={{ marginTop: theme.spacingTopBar, marginBottom: 30, marginLeft: 20 }}
      />
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
            <Ionicons name="alert-circle-outline" size={20} color={theme.textErrorColor} />
            <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <LinearGradient
                colors={[theme.cardInfoGradientStart, theme.cardInfoGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoCardGradient}
              >
                <CardDecoration />
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPressIn={() => pressButton(2, true)}
                  onPressOut={() => pressButton(2, false)}
                  onPress={() => router.navigate("/registerChurch")}
                  style={styles.registerButtonContainer}
                >
                  <Animated.View
                    style={[
                      {
                        transform: [{ scale: buttonAnimValues[2] }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={["#4CAF50", "#2E7D32"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.registerButton}
                    >
                      <FontAwesome5 name="plus-circle" size={12} color="#FFFFFF" />
                      <Text style={styles.registerButtonText}>Register Church</Text>
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
                <View style={styles.infoIconContainer}>
                  <LinearGradient colors={["#3A86FF", "#4361EE"]} style={styles.infoIcon}>
                    <FontAwesome5 name="church" size={26} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.infoTitle}>Join a Church Community</Text>
                <Text style={styles.infoDescription}>
                  Connect with a local church to grow in faith, access resources, and join
                  fellowship activities.
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
                <Button
                  onPressIn={() => pressButton(0, true)}
                  onPressOut={() => pressButton(0, false)}
                  onPress={() => router.navigate("/churchSearch")}
                >
                  <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.primaryButtonText}>Search for a Church</Text>
                </Button>
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
                  onPress={() => alert("In progress")}
                >
                  <LinearGradient
                    colors={["#FF9800", "#F57C00"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    <MaterialCommunityIcons
                      name="account-group"
                      size={20}
                      color="#FFFFFF"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.primaryButtonText}>Search for a Community</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
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
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
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
    borderColor: theme.cardInfoBorderColor,
  },
  registerButtonContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  registerButtonText: {
    fontSize: 11,
    fontWeight: theme.fontMedium,
    color: "#FFFFFF",
    marginLeft: 4,
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
    fontWeight: theme.fontBold,
    color: theme.textForeground,
    textAlign: "center",
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.textForegroundMuted,
    textAlign: "center",
  },
  buttonsContainer: {
    marginBottom: 40,
  },
  buttonWrapper: {
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.buttonText,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardErrorBackground,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: theme.textErrorColor,
    marginLeft: 12,
    fontWeight: theme.fontMedium,
    flex: 1,
  },
});
