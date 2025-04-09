import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import { useRoute } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import { Church } from "@/types/church";
import ChurchPage from "@/components/church/ChurchPage";
import { useChurchContext } from "@/contexts/church";

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

  const [church, setChurch] = useState<Church | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    data: { member },
  } = useChurchContext();

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
          <TouchableOpacity style={styles.errorButton} onPress={() => router.navigate("/home")}>
            <Text style={styles.errorButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <ChurchPage church={church} member={member} userData={userData} />;
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
});
