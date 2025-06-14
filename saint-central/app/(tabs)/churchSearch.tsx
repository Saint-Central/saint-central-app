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
import { useRouter } from "expo-router";
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
  const router = useRouter();
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
    console.log("running ----");
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
    router.push({
      pathname: "/churchDetails",
      params: { churchId: church.id }
    });
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
      router.replace("/home");
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
        colors={["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.08)"]}
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
              colors={[theme.primary, theme.accent1]}
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
            <Feather name="search" size={20} color={theme.primary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, address, or category"
              placeholderTextColor={theme.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={theme.textLight} />
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
    backgroundColor: theme.pageBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
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
    color: theme.textLight,
    marginTop: 12,
    fontWeight: "500",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacingTopBar,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchBarContainer: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textWhite,
    height: 52,
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textLight,
  },
  churchesList: {
    paddingBottom: 100,
  },
  churchCard: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: "hidden",
  },
  churchCardGradient: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  churchCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  churchImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  churchImage: {
    width: 70,
    height: 70,
  },
  churchImagePlaceholder: {
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  churchInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  churchName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  churchAddress: {
    fontSize: 14,
    color: theme.textLight,
    marginBottom: 4,
  },
  churchCategory: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  joinButton: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  joinButtonGradient: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  errorText: {
    fontSize: 14,
    color: theme.error,
    marginLeft: 12,
    fontWeight: "500",
    flex: 1,
  },
  retryButton: {
    backgroundColor: theme.error,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptyStateDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textLight,
    textAlign: "center",
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
