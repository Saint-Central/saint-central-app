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
  Image,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseClient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const isIpad = width >= 768;

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

// Item renderer for the denomination list
const DenominationItem = ({
  item,
  onSelect,
  isSelected,
}: {
  item: (typeof denominations)[0];
  onSelect: () => void;
  isSelected: boolean;
}) => (
  <Animated.View entering={FadeIn.delay(100 * parseInt(item.id.slice(-1)) || 0).duration(400)}>
    <TouchableOpacity
      style={[styles.denominationItem, isSelected && styles.selectedDenomination]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.denominationIconContainer}>
        <Feather name={item.icon as any} size={24} color={isSelected ? "#FFFFFF" : "#6366F1"} />
      </View>
      <View style={styles.denominationTextContainer}>
        <Text style={styles.denominationName}>{item.name}</Text>
        <Text style={styles.denominationDescription}>{item.description}</Text>
      </View>
      {isSelected && <Feather name="check" size={20} color="#FFFFFF" style={styles.checkIcon} />}
    </TouchableOpacity>
  </Animated.View>
);

const SelectDenominationScreen: React.FC = () => {
  const router = useRouter();
  const [selectedDenomination, setSelectedDenomination] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  // Animation values
  const titlePosition = useSharedValue(-50);
  const contentOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.8);

  // Get the current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      } else {
        // If no user is found, redirect to auth screen
        router.replace("/auth");
      }
    };

    fetchUser();

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
  }, []);

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

      // Update the user's denomination in the database
      const { error } = await supabase
        .from("users")
        .update({ denomination: selectedDenomination })
        .eq("id", userId);

      if (error) throw error;

      // Navigate to home page
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setError(err.message || "Failed to save your denomination. Please try again.");

      // Clear error after 5 seconds
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Gradient Background */}
      <LinearGradient
        colors={["#F9FAFB", "#EEF2FF"]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Elements */}
      <Animated.View style={styles.decorativeCircle1} entering={FadeIn.duration(800).delay(200)} />
      <Animated.View style={styles.decorativeCircle2} entering={FadeIn.duration(800).delay(350)} />

      {/* Error Toast */}
      {error !== "" && (
        <Animated.View
          style={styles.toastContainer}
          entering={FadeIn.duration(300)}
          exiting={FadeOut}
        >
          <Text style={styles.toastText}>{error}</Text>
        </Animated.View>
      )}

      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.content, isIpad && { maxWidth: 600, alignSelf: "center" }]}>
          {/* Title Section */}
          <Animated.View style={[styles.titleContainer, titleStyle]}>
            <Animated.View style={styles.crossIconContainer}>
              <View style={styles.crossVertical} />
              <View style={styles.crossHorizontal} />
            </Animated.View>
            <Text style={styles.title}>Select Your Denomination</Text>
            <Text style={styles.subtitle}>
              Choose the religious denomination that best represents your faith journey
            </Text>
          </Animated.View>

          {/* Denominations List */}
          <Animated.View style={[styles.denominationsContainer, contentStyle]}>
            <FlatList
              data={denominations}
              renderItem={({ item }) => (
                <DenominationItem
                  item={item}
                  onSelect={() => handleDenominationSelect(item.id)}
                  isSelected={selectedDenomination === item.id}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 40 : 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  crossIconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  crossVertical: {
    position: "absolute",
    width: 8,
    height: 48,
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  crossHorizontal: {
    position: "absolute",
    width: 48,
    height: 8,
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 300,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.1)",
  },
  selectedDenomination: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  denominationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  denominationTextContainer: {
    flex: 1,
  },
  denominationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  denominationDescription: {
    fontSize: 14,
    color: "#6B7280",
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
    height: 56,
    borderRadius: 16,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(239,68,68,0.9)",
    padding: 12,
    borderRadius: 12,
    zIndex: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  // Decorative elements
  decorativeCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    bottom: 100,
    left: -50,
  },
});

export default SelectDenominationScreen;
