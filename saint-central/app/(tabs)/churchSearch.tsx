import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  StatusBar,
  TextInput,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { useNavigation, NavigationProp, ParamListBase } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import { Ionicons, FontAwesome5, Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import DecoratedHeader from "@/components/ui/DecoratedHeader";
import theme from "@/theme";

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

export default function ChurchSearchScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [loading, setLoading] = useState<boolean>(true); // Start with loading true
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [churches, setChurches] = useState<Church[]>([]);
  const [filteredChurches, setFilteredChurches] = useState<Church[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  // Handle animations
  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Animate search bar entrance
    Animated.spring(searchBarAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, searchBarAnim]);

  // Fetch churches data on component mount
  useEffect(() => {
    fetchChurches();
  }, []);

  // Filter churches based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChurches(churches);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = churches.filter((church) => {
        return (
          church.name.toLowerCase().includes(lowercaseQuery) ||
          (church.address && church.address.toLowerCase().includes(lowercaseQuery)) ||
          (church.category && church.category.toLowerCase().includes(lowercaseQuery)) ||
          (church.description && church.description.toLowerCase().includes(lowercaseQuery))
        );
      });
      setFilteredChurches(filtered);
    }
  }, [searchQuery, churches]);

  // Fetch churches from Supabase
  const fetchChurches = async () => {
    try {
      setLoading(true);

      // Log to debug

      const { data, error: fetchError } = await supabase.from("churches").select("*").order("name");

      if (fetchError) {
        console.error("Supabase error:", fetchError);
        throw fetchError;
      }

      console.log("Churches data:", data ? `Found ${data.length} churches` : "No data");

      if (data && data.length > 0) {
        setChurches(data);
        setFilteredChurches(data);
      } else {
        console.log("No churches found or empty data array");
        // Still set empty array to clear loading state
        setChurches([]);
        setFilteredChurches([]);
      }
    } catch (error) {
      console.error("Error fetching churches:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Handle church selection
  const handleSelectChurch = (church: Church) => {
    navigation.navigate("churchDetails", { churchId: church.id });
  };

  // Directly join a church
  const handleJoinChurch = async (churchId: string) => {
    try {
      setLoading(true);

      // Get current user
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert("Authentication Error", "You must be logged in to join a church");
        return;
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from("church_members")
        .select("*")
        .eq("user_id", userId)
        .eq("church_id", churchId)
        .single();

      if (existingMembership) {
        Alert.alert("Already a Member", "You are already a member of this church");
        return;
      }

      // Add user directly to church_members
      const { error: joinError } = await supabase.from("church_members").insert([
        {
          user_id: userId,
          church_id: churchId,
          role: "member",
          joined_at: new Date().toISOString(),
        },
      ]);

      if (joinError) throw joinError;

      // Navigate to church page
      navigation.reset({
        index: 0,
        routes: [{ name: "home" }],
      });
    } catch (error) {
      console.error("Error joining church:", error);
      Alert.alert("Error", "Failed to join church. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Loading State
  if (loading && churches.length === 0) {
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
          <Text style={styles.loadingText}>Loading churches...</Text>
        </View>
      </View>
    );
  }

  // Render church card
  const renderChurchCard = ({ item }: { item: Church }) => (
    <TouchableOpacity
      style={styles.churchCard}
      activeOpacity={0.9}
      onPress={() => handleSelectChurch(item)}
    >
      <LinearGradient
        colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.15)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.churchCardGradient}
      >
        <View style={styles.churchCardContent}>
          <View style={styles.churchImageContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.churchImage} resizeMode="cover" />
            ) : (
              <View style={styles.churchImagePlaceholder}>
                <FontAwesome5 name="church" size={24} color="#CBD5E1" />
              </View>
            )}
          </View>

          <View style={styles.churchInfoContainer}>
            <Text style={styles.churchName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>

            <Text style={styles.churchAddress} numberOfLines={1} ellipsizeMode="tail">
              {item.address || "No address available"}
            </Text>

            {item.category && (
              <Text style={styles.churchCategory} numberOfLines={1} ellipsizeMode="tail">
                {item.category}
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.joinButton} onPress={() => handleJoinChurch(item.id)}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinButtonGradient}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Main UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with back button and title */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <DecoratedHeader label="Church Search" topBarMargin={false} />
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
        {/* Search bar */}
        <Animated.View
          style={[
            styles.searchBarContainer,
            {
              transform: [
                { scale: searchBarAnim },
                {
                  translateY: searchBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
              opacity: searchBarAnim,
            },
          ]}
        >
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, address, or category"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#FF006E" />
            <Text style={styles.errorText}>Error loading churches: {error.message}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchChurches}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredChurches.length} {filteredChurches.length === 1 ? "church" : "churches"} found
          </Text>
        </View>

        {/* Churches list */}
        {filteredChurches.length > 0 ? (
          <FlatList
            data={filteredChurches}
            renderItem={renderChurchCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.churchesList}
            extraData={filteredChurches}
            initialNumToRender={10}
            testID="churchesList"
            ListFooterComponent={<View style={{ height: 80 }} />} // Extra space at the bottom
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            {!loading && (
              <>
                <FontAwesome5 name="church" size={48} color="#CBD5E1" style={styles.emptyIcon} />
                <Text style={styles.emptyStateTitle}>No churches found</Text>
                <Text style={styles.emptyStateDescription}>
                  Try adjusting your search or explore churches in nearby areas.
                </Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={fetchChurches}>
                  <Text style={styles.emptyStateButtonText}>Refresh</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 12,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacingTopBar,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchBarContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    height: 50,
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  churchesList: {
    paddingBottom: 100, // Increased padding to ensure last item shows above nav bar
  },
  churchCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  churchCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.5)",
  },
  churchCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  churchImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginRight: 12,
  },
  churchImage: {
    width: 60,
    height: 60,
  },
  churchImagePlaceholder: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  churchInfoContainer: {
    flex: 1,
    marginRight: 8,
  },
  churchName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  churchAddress: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 2,
  },
  churchCategory: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  joinButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  joinButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: theme.fontBold,
    color: "#FFFFFF",
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
  retryButton: {
    backgroundColor: "#FF006E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: "#3A86FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
