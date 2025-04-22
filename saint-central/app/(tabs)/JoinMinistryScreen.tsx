import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

interface Ministry {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  member_count?: number;
}

export default function JoinMinistryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ministryId = typeof params.id === "string" ? parseInt(params.id) : 0;

  const [loading, setLoading] = useState(true);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [joiningMinistry, setJoiningMinistry] = useState(false);
  const [userChurchId, setUserChurchId] = useState<number | null>(null);

  useEffect(() => {
    checkMembershipAndLoadData();
  }, [ministryId]);

  const checkMembershipAndLoadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log("[DEBUG] Join Screen - No user found or error:", userError);
        Alert.alert("Error", "Please log in to continue");
        router.back();
        return;
      }

      console.log(`[DEBUG] Join Screen - Starting membership check for ministry ${ministryId}`);
      console.log(`[DEBUG] Join Screen - User ID: ${user.id}`);

      // Check if user is already a member
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("role")
        .eq("ministry_id", ministryId)
        .eq("user_id", user.id)
        .eq("role", "member")
        .maybeSingle();

      console.log("[DEBUG] Join Screen - Raw membership query result:", membershipData);
      console.log("[DEBUG] Join Screen - Membership error:", membershipError);

      // If user is already a member, redirect to ministry detail
      if (membershipData) {
        console.log("[DEBUG] Join Screen - Found active membership, redirecting to detail screen");
        router.replace({
          pathname: "/(tabs)/ministry-chat",
          params: { id: ministryId },
        });
        return;
      }

      console.log("[DEBUG] Join Screen - No active membership found, continuing to join screen");

      // Get church ID
      const { data: churchMember, error: churchError } = await supabase
        .from("church_members")
        .select("church_id")
        .eq("user_id", user.id)
        .single();

      if (churchMember) {
        setUserChurchId(churchMember.church_id);
      }

      // Load ministry details
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministries")
        .select("*")
        .eq("id", ministryId)
        .single();

      if (ministryError) {
        console.error("[JOIN] Error loading ministry:", ministryError);
        Alert.alert("Error", "Could not load ministry details");
        router.back();
        return;
      }

      setMinistry(ministryData);
    } catch (error) {
      console.error("[JOIN] Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMinistry = async () => {
    try {
      setJoiningMinistry(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Error", "Please log in to continue");
        return;
      }

      if (!userChurchId) {
        Alert.alert("Error", "You must be a member of a church to join");
        return;
      }

      // Insert membership record
      const { error: joinError } = await supabase.from("ministry_members").insert({
        ministry_id: ministryId,
        user_id: user.id,
        church_id: userChurchId,
        joined_at: new Date().toISOString(),
        role: "member",
      });

      if (joinError) {
        console.error("Error joining ministry:", joinError);
        Alert.alert("Error", "Could not join ministry. Please try again.");
        return;
      }

      // Navigate to ministry details
      router.replace({
        pathname: "/(tabs)/ministry-chat",
        params: { id: ministryId },
      });
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setJoiningMinistry(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading ministry details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Ministry</Text>
      </View>

      {/* Ministry Details */}
      <View style={styles.content}>
        {ministry?.image_url ? (
          <Image source={{ uri: ministry.image_url }} style={styles.ministryImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="people-circle-outline" size={80} color="#94A3B8" />
          </View>
        )}

        <Text style={styles.ministryName}>{ministry?.name}</Text>
        <Text style={styles.ministryDescription}>{ministry?.description}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{ministry?.member_count || 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.joinButton, joiningMinistry && styles.joiningButton]}
          onPress={handleJoinMinistry}
          disabled={joiningMinistry}
        >
          {joiningMinistry ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="people" size={20} color="#FFFFFF" style={styles.joinIcon} />
              <Text style={styles.joinButtonText}>Join Ministry</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
  },
  content: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  ministryImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 24,
  },
  placeholderImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  ministryName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  ministryDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 32,
  },
  statItem: {
    alignItems: "center",
    marginHorizontal: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2196F3",
  },
  statLabel: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  joinButton: {
    flexDirection: "row",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: "center",
  },
  joiningButton: {
    opacity: 0.7,
  },
  joinIcon: {
    marginRight: 8,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
});
