import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import { Church } from "@/types/church";
import ChurchPage from "@/components/church/ChurchPage";
import { useChurchContext } from "@/contexts/church";
import { LinearGradient } from "expo-linear-gradient";

// Route params interface
interface RouteParams {
  churchId?: number;
}

type Props = {
  userData: {
    username: string;
    profileImage: string;
  };
};

export default function ChurchPageLayout({ userData }: Props) {
  const route = useRoute();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    data: { member },
  } = useChurchContext();

  // Animation effect
  useEffect(() => {
    if (!loading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, error, fadeAnim, scaleAnim]);

  // Fetch church data
  useEffect(() => {
    async function fetchChurch() {
      if (!member) return;

      // Get church ID - either from route params or from membership
      const churchId = (route?.params as RouteParams)?.churchId ?? member.church_id;

      try {
        const { data: churchData, error: churchError } = await supabase
          .from("churches")
          .select("*")
          .eq("id", churchId);

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
          }

          throw new Error(`Church with ID ${churchId} not found. Please check your database.`);
        }

        // Use the first result if multiple are returned
        const church = churchData[0];
        setChurch(church);
      } catch (error) {
        console.error("Error in fetching church data:", error);
        setError(error as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchChurch();
  }, [error, member, route.params]);

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
        <Text style={styles.loadingText}>Loading your church...</Text>
      </View>
    );
  }

  if (error || !church) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <LinearGradient
              colors={["rgba(239, 68, 68, 0.1)", "rgba(220, 38, 38, 0.2)"]}
              style={styles.errorIconGradient}
            >
              <Ionicons name="alert-circle-outline" size={50} color="#FF006E" />
            </LinearGradient>
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load church information"}
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.navigate("/home")}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.errorButtonGradient}
            >
              <Text style={styles.errorButtonText}>Go to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <ChurchPage church={church} member={member} userData={userData} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  animatedContainer: {
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
    color: "#64748B",
    fontWeight: "500",
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
  errorIconContainer: {
    marginBottom: 16,
    shadowColor: "rgba(239, 68, 68, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  errorIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 30,
    maxWidth: "85%",
  },
  errorButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "rgba(58, 134, 255, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  errorButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
