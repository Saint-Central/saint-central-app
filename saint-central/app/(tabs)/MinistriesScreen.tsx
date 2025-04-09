// SimplifiedMinistriesScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
  SectionList, // Using SectionList for grouped data
  SectionListData,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import LottieView from "lottie-react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

// Get screen dimensions
const { width, height } = Dimensions.get("window");

// Interface definitions based on Supabase schema
interface Ministry {
  id: number;
  church_id: number;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

// Interface for section data
interface MinistrySection {
  title: string;
  data: Ministry[];
  // Add any other fields needed for section data
}

// Type definition for navigation
type RootStackParamList = {
  home: { refresh?: boolean };
  ministryDetail: { ministryId: number };
  createMinistry: { selectedPresetId?: string };
  CreateMinistryScreen: { selectedPresetId?: string };
  CreateMinistryGroupScreen: { selectedPresetId?: string };
};

// Define admin roles
const ADMIN_ROLES = ["admin", "owner"];

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Theme colors
const THEME = {
  primary: "#4F46E5", // Indigo
  primaryLight: "#818CF8",
  primaryDark: "#3730A3",
  secondary: "#10B981", // Emerald
  secondaryLight: "#34D399",
  accent: "#F59E0B", // Amber
  background: "#FFFFFF",
  surface: "#F8FAFC",
  text: "#1E293B",
  textSecondary: "#64748B",
  textLight: "#94A3B8",
  border: "#E2E8F0",
  error: "#EF4444",
  success: "#10B981",
  divider: "#CBD5E1",
  ripple: "rgba(79, 70, 229, 0.1)",
};

// Format time to display
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // If within the last week, return day name
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  // Otherwise return date
  return date.toLocaleDateString([], { month: "numeric", day: "numeric" });
};

// Get avatar color based on ministry name
const getAvatarColor = (name: string): string => {
  const colors = [
    THEME.primary,
    "#7C3AED", // Violet
    "#EC4899", // Pink
    THEME.secondary,
    "#3B82F6", // Blue
    "#8B5CF6", // Purple
    "#F97316", // Orange
    "#14B8A6", // Teal
  ];

  // Simple hash function to pick a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate initials from ministry name
const getInitials = (name: string): string => {
  if (!name) return "?";

  const words = name.split(" ");
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export default function SimplifiedMinistriesScreen(): JSX.Element {
  const router = useRouter();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "home">>();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [sectionedMinistries, setSectionedMinistries] = useState<
    MinistrySection[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userChurchId, setUserChurchId] = useState<number | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;

  // Create animation values for each UI element
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const searchBarFadeAnim = useRef(new Animated.Value(0)).current;
  const listFadeAnim = useRef(new Animated.Value(0)).current;

  // Ref for search input
  const searchInputRef = useRef<TextInput>(null);
  const sectionListRef = useRef<SectionList>(null);

  // Check for refresh param
  useEffect(() => {
    if (route.params?.refresh) {
      fetchData();
    }
  }, [route.params]);

  // Generate sectioned ministries when original ministries changes or when search text changes
  useEffect(() => {
    if (ministries.length === 0) {
      setSectionedMinistries([]);
      return;
    }

    // Apply search filter if searchText is not empty
    let filtered = ministries;
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = ministries.filter(
        (ministry) =>
          ministry.name.toLowerCase().includes(searchLower) ||
          (ministry.description &&
            ministry.description.toLowerCase().includes(searchLower))
      );
    }

    // Separate ministries into sections
    const myMinistries = filtered.filter((ministry) => ministry.is_member);
    const otherMinistries = filtered.filter((ministry) => !ministry.is_member);

    // Create the sectioned data structure
    const sections: MinistrySection[] = [];

    if (myMinistries.length > 0) {
      sections.push({
        title: "My Ministries",
        data: myMinistries,
      });
    }

    if (otherMinistries.length > 0) {
      sections.push({
        title: "Other Ministries",
        data: otherMinistries,
      });
    }

    setSectionedMinistries(sections);
  }, [ministries, searchText]);

  // Animate UI elements in sequence
  const animateUIElements = () => {
    // Reset animations
    headerFadeAnim.setValue(0);
    searchBarFadeAnim.setValue(0);
    listFadeAnim.setValue(0);

    // Sequence the animations
    Animated.sequence([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(searchBarFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(listFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Fetch ministries data
  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    fetchData();
    animateUIElements();
  }, []);

  // Handle FAB visibility based on scroll
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      // Hide FAB when scrolling down, show when scrolling up
      if (value > 120) {
        Animated.spring(fabAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(fabAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => {
      scrollY.removeListener(listenerId);
    };
  }, []);

  // Header animations based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 10],
    extrapolate: "clamp",
  });

  // FAB animation
  const fabTranslateY = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);
      console.log("Fetching ministries data...");

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        console.error("No user logged in");
        throw new Error("No user logged in");
      }

      console.log("Current user ID:", user.id);

      // Check if user is a church member and get their church_id
      const { data: churchMember, error: churchMemberError } = await supabase
        .from("church_members")
        .select("church_id, role")
        .eq("user_id", user.id)
        .single();

      if (churchMemberError) {
        console.error("Error fetching church member data:", churchMemberError);
        setIsAdmin(false);
      } else {
        console.log("Church member data:", churchMember);
        setUserChurchId(churchMember?.church_id);
        setIsAdmin(
          churchMember?.role &&
            ADMIN_ROLES.includes(churchMember.role.toLowerCase())
        );
      }

      // Fetch ministries that belong to the user's church
      const { data: ministriesData, error: ministriesError } = await supabase
        .from("ministries")
        .select("*")
        .eq("church_id", churchMember?.church_id || 0)
        .order("created_at", { ascending: false });

      if (ministriesError) {
        console.error("Error fetching ministries data:", ministriesError);
        throw ministriesError;
      }

      console.log("Fetched ministries:", ministriesData?.length);

      // Fetch member counts for each ministry
      const { data: memberCounts, error: countError } = await supabase
        .from("ministry_members")
        .select("ministry_id")
        .in(
          "ministry_id",
          ministriesData.map((m) => m.id)
        );

      if (countError) {
        console.error("Error fetching member counts:", countError);
      }

      // Count members for each ministry
      const memberCountMap =
        memberCounts?.reduce<Record<number, number>>((acc, curr) => {
          acc[curr.ministry_id] = (acc[curr.ministry_id] || 0) + 1;
          return acc;
        }, {}) || {};

      // Fetch user's memberships with full details
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("ministry_id, role, church_id")
        .eq("user_id", user.id)
        .eq("church_id", churchMember?.church_id)
        .eq("role", "member"); // Only get active memberships

      if (membershipError) {
        console.error("Error fetching ministry memberships:", membershipError);
      } else {
        console.log("User memberships:", membershipData);
      }

      const memberMinistryIds =
        membershipData?.map((item) => item.ministry_id) || [];
      console.log("Member ministry IDs:", memberMinistryIds);

      // Process the ministries data with member counts and membership status
      const processedMinistries = ministriesData.map((ministry) => ({
        ...ministry,
        member_count: memberCountMap[ministry.id] || 0,
        is_member: memberMinistryIds.includes(ministry.id),
      }));

      console.log(
        "Processed ministries with membership:",
        processedMinistries.map((m) => ({
          id: m.id,
          name: m.name,
          is_member: m.is_member,
        }))
      );

      // Store ministries
      setMinistries(processedMinistries || []);
    } catch (error) {
      console.error("Error in data fetch:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Navigate to ministry detail screen
  const navigateToMinistryDetail = async (ministryId: number) => {
    try {
      // Haptic feedback
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Error", "Please log in to continue");
        return;
      }

      console.log(
        `[DEBUG] Checking membership - User ID: ${user.id}, Ministry ID: ${ministryId}`
      );

      // Direct table query to check for member role
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("role")
        .eq("ministry_id", ministryId)
        .eq("user_id", user.id)
        .eq("role", "member")
        .maybeSingle();

      console.log("[DEBUG] Membership query result:", membershipData);

      // If there's a record with role = 'member', go directly to detail screen
      if (membershipData) {
        console.log(
          "[DEBUG] Found active membership, going to ministry detail"
        );
        router.push({
          pathname: "/(tabs)/ministryDetail",
          params: { id: ministryId },
        });
      } else {
        console.log("[DEBUG] No active membership found, going to join screen");
        router.push({
          pathname: "/(tabs)/JoinMinistryScreen",
          params: { id: ministryId },
        });
      }
    } catch (error) {
      console.error("[ERROR] Navigation error:", error);
      Alert.alert("Error", "Could not verify membership status");
    }
  };

  // Navigate to home
  const navigateToHome = () => {
    navigation.navigate({ name: "home", params: { refresh: false } });
  };

  // Navigate to create ministry screen
  const navigateToCreateMinistry = () => {
    // Haptic feedback
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Check if user is admin first
    if (!isAdmin) {
      // Show alert for non-admin users
      Alert.alert(
        "Admin Access Required",
        "Only church admin and owner can create a new ministry.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    try {
      // Update primary navigation target to CreateMinistryGroupScreen
      navigation.navigate("CreateMinistryGroupScreen", {});
    } catch (error) {
      // If that route doesn't exist, try the older routes as fallbacks
      console.log("Falling back to alternate route names");
      try {
        navigation.navigate("CreateMinistryScreen", {});
      } catch (secondError) {
        navigation.navigate("createMinistry", { selectedPresetId: undefined });
      }
    }
  };

  // Join a ministry
  const handleJoinMinistry = async (ministryId: number): Promise<void> => {
    try {
      // Haptic feedback
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        Alert.alert("Error", "You must be logged in to join a ministry");
        return;
      }

      if (!userChurchId) {
        Alert.alert(
          "Error",
          "You must be a member of a church to join a ministry"
        );
        return;
      }

      const { error } = await supabase.from("ministry_members").insert({
        ministry_id: ministryId,
        user_id: user.id,
        church_id: userChurchId,
        joined_at: new Date().toISOString(),
        role: "member",
      });

      if (error) {
        console.error("Error joining ministry:", error);
        throw error;
      }

      // Refresh the ministries list
      fetchData();
      Alert.alert("Success", "You have joined the ministry!");
    } catch (error) {
      console.error("Error joining ministry:", error);
      Alert.alert("Error", "Could not join the ministry. Please try again.");
    }
  };

  // Leave a ministry
  const handleLeaveMinistry = async (ministryId: number): Promise<void> => {
    try {
      // Haptic feedback
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        throw userError;
      }

      if (!user) {
        Alert.alert("Error", "You must be logged in to leave a ministry");
        return;
      }

      const { error } = await supabase
        .from("ministry_members")
        .delete()
        .eq("ministry_id", ministryId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error leaving ministry:", error);
        throw error;
      }

      // Refresh the ministries list
      fetchData();
      Alert.alert("Success", "You have left the ministry.");
    } catch (error) {
      console.error("Error leaving ministry:", error);
      Alert.alert("Error", "Could not leave the ministry. Please try again.");
    }
  };

  // Delete a ministry
  const handleDeleteMinistry = async (ministryId: number) => {
    Alert.alert(
      "Delete Ministry",
      "Are you sure you want to delete this ministry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Haptic feedback
              if (Platform.OS === "ios") {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                );
              }

              setLoading(true);

              // First, delete all ministry members
              const { error: membersError } = await supabase
                .from("ministry_members")
                .delete()
                .eq("ministry_id", ministryId);

              if (membersError) {
                console.error("Error deleting ministry members:", membersError);
                throw membersError;
              }

              // Then, delete any ministry messages
              const { error: messagesError } = await supabase
                .from("ministry_messages")
                .delete()
                .eq("ministry_id", ministryId);

              if (messagesError) {
                console.error(
                  "Error deleting ministry messages:",
                  messagesError
                );
                throw messagesError;
              }

              // Finally, delete the ministry itself
              const { error } = await supabase
                .from("ministries")
                .delete()
                .eq("id", ministryId);

              if (error) {
                console.error("Error deleting ministry:", error);
                throw error;
              }

              // Refresh ministries list
              fetchData();
              Alert.alert("Success", "Ministry deleted successfully!");
            } catch (error) {
              console.error("Error deleting ministry:", error);
              Alert.alert(
                "Error",
                "Failed to delete ministry. Please try again."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handle pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Focus search input
  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      setIsSearchFocused(true);
    }
  };

  // Clear search input
  const clearSearch = () => {
    setSearchText("");
    if (searchInputRef.current) {
      searchInputRef.current.blur();
      setIsSearchFocused(false);
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    if (sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        animated: true,
      });
    }
  };

  // Render ministry avatar
  const renderMinistryAvatar = (ministry: Ministry) => {
    if (ministry.image_url) {
      return (
        <View style={styles.ministryAvatarImageContainer}>
          <Image
            source={{ uri: ministry.image_url }}
            style={styles.ministryAvatarImage}
          />
        </View>
      );
    }

    // Placeholder with initials
    const avatarColor = getAvatarColor(ministry.name);
    const initials = getInitials(ministry.name);

    return (
      <LinearGradient
        colors={[avatarColor, `${avatarColor}99`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ministryAvatarPlaceholder}
      >
        <Text style={styles.ministryAvatarInitials}>{initials}</Text>
      </LinearGradient>
    );
  };

  // Render ministry item
  const renderMinistryItem = ({
    item,
    index,
    section,
  }: {
    item: Ministry;
    index: number;
    section: SectionListData<Ministry>;
  }) => {
    // Calculate animation delay based on index for staggered effect
    const itemAnimationDelay =
      50 *
      (index + (section.title === "My Ministries" ? 0 : section.data.length));

    // Create animation for this specific item
    const itemFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      // Start animation after a delay based on index
      const timer = setTimeout(() => {
        Animated.timing(itemFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, itemAnimationDelay);

      return () => clearTimeout(timer);
    }, []);

    return (
      <Animated.View
        style={{
          opacity: itemFadeAnim,
          transform: [
            {
              translateY: itemFadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={styles.ministryItem}
          onPress={() => navigateToMinistryDetail(item.id)}
          activeOpacity={0.8}
          onLongPress={() => {
            // Haptic feedback
            if (Platform.OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            if (item.is_member) {
              Alert.alert(
                "Leave Ministry",
                `Are you sure you want to leave ${item.name}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Leave",
                    style: "destructive",
                    onPress: () => handleLeaveMinistry(item.id),
                  },
                ]
              );
            } else {
              handleJoinMinistry(item.id);
            }
          }}
        >
          <View style={styles.ministryAvatar}>
            {renderMinistryAvatar(item)}
          </View>

          <View style={styles.ministryContent}>
            <View style={styles.ministryHeaderRow}>
              <Text style={styles.ministryName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.ministryTimestamp}>
                {formatTime(item.created_at)}
              </Text>
            </View>

            <View style={styles.ministryDescriptionRow}>
              <Text style={styles.ministryDescription} numberOfLines={1}>
                {item.description || "No description"}
              </Text>

              <View style={styles.ministryMeta}>
                {(item.member_count ?? 0) > 0 && (
                  <View style={styles.memberCountBadge}>
                    <Text style={styles.memberCountText}>
                      {item.member_count}
                    </Text>
                  </View>
                )}

                {item.is_member && (
                  <View style={styles.memberStatusBadge}>
                    <MaterialIcons
                      name="check-circle"
                      size={14}
                      color="#FFFFFF"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.memberStatusText}>Member</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render section header
  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<Ministry>;
  }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      {section.title === "My Ministries" && (
        <View style={styles.sectionHeaderBadge}>
          <Text style={styles.sectionHeaderBadgeText}>
            {section.data.length}
          </Text>
        </View>
      )}
    </View>
  );

  // Loading screen with Lottie animation
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Animated.View
            style={[
              styles.loadingCircle,
              {
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LottieView
              source={require("../../assets/lottie/loading.json")}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
          </Animated.View>
          <Animated.Text
            style={[
              styles.loadingText,
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
            Loading ministries...
          </Animated.Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#FFFFFF", "#F8FAFC"]}
          style={styles.errorGradient}
        >
          <View style={styles.errorContainer}>
            <Animated.View
              style={[
                styles.errorIconContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={["#FF6B6B", "#FF006E"]}
                style={styles.errorIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="alert-outline" size={40} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            <Animated.Text
              style={[
                styles.errorTitle,
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
              Something went wrong
            </Animated.Text>
            <Animated.Text
              style={[
                styles.errorText,
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
              {error?.message || "Could not load ministries information"}
            </Animated.Text>
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.errorButton}
                onPress={navigateToHome}
              >
                <LinearGradient
                  colors={[THEME.primary, THEME.primaryDark]}
                  style={styles.errorButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.errorButtonText}>Back to Home</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Floating header effect */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15],
            }),
          },
        ]}
      >
        <BlurView intensity={85} tint="light" style={styles.blurView} />
      </Animated.View>

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerFadeAnim,
            transform: [
              {
                translateY: headerFadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={navigateToHome}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonContainer}>
              <Ionicons name="arrow-back" size={22} color={THEME.primary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ministries</Text>
        </View>

        {/* Create Ministry Button */}
        <TouchableOpacity
          style={styles.createMinistryButton}
          onPress={navigateToCreateMinistry}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[THEME.primary, THEME.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            <MaterialIcons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createButtonText}>New</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Search Box */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchBarFadeAnim,
            transform: [
              {
                translateY: searchBarFadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.searchInputContainer,
            isSearchFocused && styles.searchInputContainerFocused,
          ]}
          activeOpacity={1}
          onPress={focusSearch}
        >
          <Ionicons
            name="search"
            size={20}
            color={isSearchFocused ? THEME.primary : THEME.textLight}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search ministries..."
            placeholderTextColor={THEME.textLight}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <View style={styles.clearButtonCircle}>
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Empty state */}
      {!loading && sectionedMinistries.length === 0 && (
        <Animated.View
          style={[
            styles.emptyStateContainer,
            {
              opacity: listFadeAnim,
              transform: [
                {
                  translateY: listFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.emptyStateIconContainer}>
            <LinearGradient
              colors={["#E2E8F0", "#CBD5E1"]}
              style={styles.emptyStateIconBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <FontAwesome5 name="church" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyStateTitle}>No Ministries Found</Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchText
              ? `No results found for "${searchText}"`
              : "Add a ministry to get started"}
          </Text>

          {!searchText && (
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={navigateToCreateMinistry}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[THEME.primary, THEME.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyStateButtonGradient}
              >
                <MaterialIcons
                  name="add"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.emptyStateButtonText}>
                  Add New Ministry
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Ministries List - Using SectionList */}
      <Animated.View
        style={[
          styles.mainContent,
          {
            opacity: listFadeAnim,
            transform: [
              {
                translateY: listFadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {!loading && sectionedMinistries.length > 0 && (
          <SectionList
            ref={sectionListRef}
            style={styles.mainList}
            sections={sectionedMinistries}
            renderItem={renderMinistryItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            ListFooterComponent={() => <View style={styles.listFooter} />}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            stickySectionHeadersEnabled={true}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>

      {/* Add Ministry Button (FAB) */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ translateY: fabTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.addMinistryButton}
          onPress={navigateToCreateMinistry}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[THEME.primary, THEME.primaryDark]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Scroll to top button (appears when scrolling) */}
      <Animated.View
        style={[
          styles.scrollTopButtonContainer,
          {
            opacity: headerOpacity,
            transform: [
              {
                translateY: headerOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.scrollTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <BlurView intensity={90} tint="light" style={styles.scrollTopBlur}>
            <Feather name="chevron-up" size={20} color={THEME.primary} />
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 96 : 70,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 225, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: Platform.OS === "ios" ? 40 : 16,
    backgroundColor: THEME.background,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 14,
  },
  backButtonContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${THEME.primary}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: THEME.text,
    letterSpacing: -0.5,
  },

  // Search styles
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    backgroundColor: THEME.background,
    zIndex: 5,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInputContainerFocused: {
    borderColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOpacity: 0.15,
    backgroundColor: `${THEME.primary}05`,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: THEME.text,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Section header styles
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.text,
    letterSpacing: -0.3,
  },
  sectionHeaderBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionHeaderBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },

  // Empty state
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyStateIconContainer: {
    marginBottom: 24,
  },
  emptyStateIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyStateButton: {
    width: "80%",
    maxWidth: 300,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Main list styles
  mainList: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },

  // Ministry item styles
  ministryItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: THEME.background,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  ministryAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ministryAvatarImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: THEME.background,
  },
  ministryAvatarImage: {
    width: 52,
    height: 52,
  },
  ministryAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  ministryAvatarInitials: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ministryContent: {
    flex: 1,
    justifyContent: "center",
  },
  ministryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ministryName: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.text,
    flex: 1,
    letterSpacing: -0.3,
  },
  ministryTimestamp: {
    fontSize: 12,
    color: THEME.textLight,
    marginLeft: 8,
  },
  ministryDescriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ministryDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    flex: 1,
    letterSpacing: -0.2,
  },
  ministryMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberCountBadge: {
    backgroundColor: THEME.secondary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    paddingHorizontal: 8,
  },
  memberCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  memberStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  memberStatusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },

  // Create button in header
  createMinistryButton: {
    overflow: "hidden",
    borderRadius: 22,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },

  // FAB styles
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 10,
  },
  addMinistryButton: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  listFooter: {
    height: 80, // Space for FAB
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingCircle: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  lottieAnimation: {
    width: 120,
    height: 120,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "600",
    color: THEME.text,
    letterSpacing: -0.3,
  },

  // Error state
  errorGradient: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorIconContainer: {
    marginBottom: 24,
    shadowColor: "#FF006E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  errorIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  errorText: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    maxWidth: "80%",
    lineHeight: 22,
  },
  errorButton: {
    width: "80%",
    maxWidth: 300,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  errorButtonGradient: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Scroll to top button
  scrollTopButtonContainer: {
    position: "absolute",
    bottom: 90,
    right: 24,
    zIndex: 9,
  },
  scrollTopButton: {
    width: 40,
    height: 40,
    overflow: "hidden",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollTopBlur: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
