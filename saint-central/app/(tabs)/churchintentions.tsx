import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Interface definitions
interface Intention {
  id: number;
  user_id: string;
  title: string;
  description: string;
  type: string;
  created_at: string;
  visibility: string;
  selected_groups?: string[];
  completed?: boolean;
  favorite?: boolean;
  selected_friends?: string[];
}

export default function IntentionsScreen() {
  const router = useRouter();
  
  // State variables
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch intentions on component mount
  useEffect(() => {
    fetchIntentions();
  }, []);
  
  // Fetch user's intentions
  const fetchIntentions = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error getting current user:", userError);
        throw userError;
      }
      
      if (!user) {
        console.error("No user logged in");
        Alert.alert("Error", "You must be logged in to view intentions");
        router.replace("/(auth)/auth");
        return;
      }
      
      // Fetch user's intentions
      const { data, error } = await supabase
        .from("intentions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching intentions:", error);
        throw error;
      }
      
      setIntentions(data || []);
    } catch (error) {
      console.error("Error in fetchIntentions:", error);
      setError(error instanceof Error ? error : new Error("Failed to load intentions"));
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate back
  const navigateBack = () => {
    router.back();
  };
  
  // Navigate to add intention screen
  const navigateToAddIntention = () => {
    // This will be implemented later
    Alert.alert("Coming Soon", "This feature will be available soon");
  };
  
  // Render intention item
  const renderIntentionItem = ({ item }: { item: Intention }) => (
    <TouchableOpacity
      style={styles.intentionItem}
      activeOpacity={0.8}
      onPress={() => Alert.alert("Coming Soon", "Intention details will be available soon")}
    >
      <View style={styles.intentionHeader}>
        <Text style={styles.intentionTitle}>{item.title}</Text>
        {item.favorite && (
          <Ionicons name="star" size={18} color="#F59E0B" style={styles.favoriteIcon} />
        )}
      </View>
      
      <Text style={styles.intentionDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.intentionFooter}>
        <View style={styles.intentionType}>
          <Text style={styles.intentionTypeText}>{item.type}</Text>
        </View>
        
        <Text style={styles.intentionDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={styles.loadingText}>Loading intentions...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load intentions"}
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={navigateBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
          <Ionicons name="arrow-back" size={24} color="#5B6EF5" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Prayer Intentions</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={navigateToAddIntention}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#5B6EF5" />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {intentions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient colors={["#5B6EF5", "#8B9DFF"]} style={styles.emptyIcon}>
              <FontAwesome5 name="pray" size={40} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Intentions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first prayer intention to get started
            </Text>
            <TouchableOpacity
              style={styles.addIntentionButton}
              onPress={navigateToAddIntention}
              activeOpacity={0.8}
            >
              <Text style={styles.addIntentionButtonText}>Add Intention</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={intentions}
            renderItem={renderIntentionItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.intentionsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 16,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  addIntentionButton: {
    backgroundColor: "#5B6EF5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addIntentionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  intentionsList: {
    paddingBottom: 20,
  },
  intentionItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  intentionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  intentionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  favoriteIcon: {
    marginLeft: 8,
  },
  intentionDescription: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
    lineHeight: 20,
  },
  intentionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intentionType: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  intentionTypeText: {
    fontSize: 12,
    color: "#5B6EF5",
    fontWeight: "500",
  },
  intentionDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFC",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#5B6EF5",
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