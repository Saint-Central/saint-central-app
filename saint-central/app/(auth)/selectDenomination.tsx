import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  FlatList,
  Platform,
  Dimensions,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";

const { width } = Dimensions.get("window");
const isIpad = width >= 768;

// API Configuration
const CRUD_API_BASE = "https://crud-worker.colinmcherney.workers.dev";

// Define the denominations array with name, description, and icon
const denominations = [
  {
    id: "catholic",
    name: "Catholic",
    description: "Roman Catholic Church",
    icon: "sun",
  },
  {
    id: "protestant",
    name: "Protestant",
    description: "Various Protestant denominations",
    icon: "book-open",
  },
  {
    id: "orthodox",
    name: "Orthodox",
    description: "Eastern Orthodox Church",
    icon: "compass",
  },
  {
    id: "evangelical",
    name: "Evangelical",
    description: "Evangelical Christian churches",
    icon: "mic",
  },
  {
    id: "baptist",
    name: "Baptist",
    description: "Baptist churches and associations",
    icon: "droplet",
  },
  {
    id: "methodist",
    name: "Methodist",
    description: "Methodist denomination",
    icon: "heart",
  },
  {
    id: "lutheran",
    name: "Lutheran",
    description: "Lutheran denomination",
    icon: "bookmark",
  },
  {
    id: "presbyterian",
    name: "Presbyterian",
    description: "Presbyterian denomination",
    icon: "shield",
  },
  {
    id: "anglican",
    name: "Anglican/Episcopal",
    description: "Anglican Communion churches",
    icon: "flag",
  },
  {
    id: "pentecostal",
    name: "Pentecostal",
    description: "Pentecostal churches",
    icon: "wind",
  },
  {
    id: "nondenominational",
    name: "Non-denominational",
    description: "Non-denominational Christian",
    icon: "users",
  },
  {
    id: "other",
    name: "Other",
    description: "Other faith traditions",
    icon: "more-horizontal",
  },
];

// --- Christian Cross Component ---
const ChristianCross = () => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    rotation.value = withSequence(
      withTiming(5, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(-5, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(0, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
    );
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    };
  });

  return (
    <Animated.View style={[styles.crossIconContainer, animatedStyle]}>
      <View style={styles.crossVertical} />
      <View style={styles.crossHorizontal} />
    </Animated.View>
  );
};

// Create API helper that uses auth context
const createApiCall = (getAccessToken: () => Promise<string | null>) => {
  return async (url: string, options: RequestInit = {}) => {
    let token = await getAccessToken();

    // Fallback to AsyncStorage for backward compatibility
    if (!token) {
      token =
        (await AsyncStorage.getItem("access_token")) ||
        (await AsyncStorage.getItem("@auth_access_token"));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({ error: "Network error" }));

    if (!response.ok) {
      if (data.code && data.error) {
        throw new Error(data.error);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error(`Network error (${response.status})`);
      }
    }

    return data;
  };
};

// Item renderer for the denomination list
const DenominationItem = ({
  item,
  onSelect,
  isSelected,
  index,
}: {
  item: (typeof denominations)[0];
  onSelect: () => void;
  isSelected: boolean;
  index: number;
}) => (
  <Animated.View entering={FadeIn.delay(index * 50).duration(400)}>
    <TouchableOpacity
      style={[styles.denominationItem, isSelected && styles.selectedDenomination]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={[styles.denominationIconContainer, isSelected && styles.selectedIconContainer]}>
        <Feather
          name={item.icon as any}
          size={24}
          color={isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)"}
        />
      </View>
      <View style={styles.denominationTextContainer}>
        <Text style={[styles.denominationName, isSelected && styles.selectedDenominationName]}>
          {item.name}
        </Text>
        <Text
          style={[
            styles.denominationDescription,
            isSelected && styles.selectedDenominationDescription,
          ]}
        >
          {item.description}
        </Text>
      </View>
      {isSelected && <Feather name="check" size={20} color="#FFFFFF" style={styles.checkIcon} />}
    </TouchableOpacity>
  </Animated.View>
);

const SelectDenominationScreen: React.FC = () => {
  const router = useRouter();
  const { session, user, loading: authLoading, getAccessToken } = useAuth();
  const [selectedDenomination, setSelectedDenomination] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  // Create API call function with access token
  const apiCall = createApiCall(getAccessToken);

  // Animation values
  const titlePosition = useSharedValue(-50);
  const contentOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.8);

  // Check authentication state and get user ID
  useEffect(() => {
    const checkAuth = async () => {
      // If AuthContext has user, use it
      if (user?.id) {
        setUserId(user.id);
        return;
      }

      // Fallback to AsyncStorage for backward compatibility
      try {
        const userString = await AsyncStorage.getItem("user");
        if (userString) {
          const storedUser = JSON.parse(userString);
          setUserId(storedUser.id);
        } else if (!authLoading) {
          // If no user is found and not loading, redirect to auth screen
          router.replace("/auth");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        if (!authLoading) {
          router.replace("/auth");
        }
      }
    };

    checkAuth();

    // Start animations
    titlePosition.value = withTiming(0, {
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    contentOpacity.value = withDelay(
      300,
      withTiming(1, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonScale.value = withDelay(
      600,
      withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );
  }, [user, authLoading]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Animated styles
  const titleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: titlePosition.value }],
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    };
  });

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
      opacity: selectedDenomination ? 1 : 0.6,
    };
  });

  // Handle denomination selection
  const handleDenominationSelect = (denominationId: string) => {
    setSelectedDenomination(denominationId);
  };

  // Save denomination and navigate to home
  const handleContinue = async () => {
    if (!selectedDenomination || !userId) return;

    try {
      setLoading(true);

      // Update the user's denomination using the new API
      await apiCall(CRUD_API_BASE, {
        method: "POST",
        body: JSON.stringify({
          operation: "UPDATE",
          table: "users",
          data: { denomination: selectedDenomination },
          where: { id: userId },
        }),
      });

      // Navigate to home page
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setError(err.message || "Failed to save your denomination. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={require("../../assets/images/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        {/* Error Toast */}
        {error !== "" && (
          <Animated.View
            style={styles.toastContainer}
            entering={SlideInDown.springify().damping(12)}
            exiting={FadeOut}
          >
            <Feather name="alert-circle" size={18} color="#fff" />
            <Text style={styles.toastText}>{error}</Text>
          </Animated.View>
        )}

        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.content, isIpad && { maxWidth: 600, alignSelf: "center" }]}>
            {/* Title Section */}
            <Animated.View style={[styles.titleContainer, titleStyle]}>
              <View style={styles.crossContainer}>
                <ChristianCross />
              </View>
              <Text style={styles.title}>Select Your Denomination</Text>
              <Text style={styles.subtitle}>
                Choose the religious denomination that best represents your faith journey
              </Text>
            </Animated.View>

            {/* Denominations List */}
            <Animated.View style={[styles.denominationsContainer, contentStyle]}>
              <FlatList
                data={denominations}
                renderItem={({ item, index }) => (
                  <DenominationItem
                    item={item}
                    onSelect={() => handleDenominationSelect(item.id)}
                    isSelected={selectedDenomination === item.id}
                    index={index}
                  />
                )}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.flatListContent}
              />
            </Animated.View>

            {/* Continue Button */}
            <Animated.View style={[styles.buttonContainer, buttonStyle]}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                disabled={!selectedDenomination || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>CONTINUE</Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  crossContainer: {
    marginBottom: 16,
  },
  crossIconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  crossVertical: {
    position: "absolute",
    width: 6,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  crossHorizontal: {
    position: "absolute",
    width: 48,
    height: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "300",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  denominationsContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  denominationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "rgba(255, 255, 255, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(20px)",
  },
  selectedDenomination: {
    backgroundColor: "rgba(34, 197, 94, 0.8)",
    borderColor: "rgba(34, 197, 94, 0.9)",
    shadowColor: "rgba(34, 197, 94, 0.4)",
  },
  denominationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  selectedIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  denominationTextContainer: {
    flex: 1,
  },
  denominationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.95)",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectedDenominationName: {
    color: "#FFFFFF",
  },
  denominationDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectedDenominationDescription: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  checkIcon: {
    marginLeft: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
  },
  continueButton: {
    width: "100%",
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(255, 255, 255, 0.3)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(34, 197, 94, 0.8)",
    backdropFilter: "blur(20px)",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
    letterSpacing: 0.5,
  },
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    padding: 16,
    borderRadius: 12,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
});

export default SelectDenominationScreen;
