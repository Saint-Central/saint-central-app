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
import { useCRUD } from "../../utils/crudClient";
import { useAuth } from "../../contexts/AuthContext";
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
import theme from "@/theme";

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
  church_name?: string;
  private?: boolean;
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
    theme.primary,
    "#7C3AED", // Violet
    "#EC4899", // Pink
    theme.secondary,
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
  
  // Initialize CRUD client and auth
  const { select, selectOne, insert, delete: deleteRecord } = useCRUD();
  const { user } = useAuth();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [sectionedMinistries, setSectionedMinistries] = useState<MinistrySection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userChurchId, setUserChurchId] = useState<number | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

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
          (ministry.description && ministry.description.toLowerCase().includes(searchLower)),
      );
    }

    // Separate ministries into sections
    const myMinistries = filtered.filter((ministry) => ministry.is_member);
    const otherMinistries = filtered.filter((ministry) => !ministry.is_member);

    // Create the sectioned data structure
    const sections: MinistrySection[] = [];

    if (myMinistries.length > 0) {
      sections.push({
        title: "My Ministries (All Churches)",
        data: myMinistries,
      });
    }

    if (otherMinistries.length > 0) {
      sections.push({
        title: "Available Ministries",
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

  // Reload data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Ministries screen focused - reloading data');
      fetchData();
    });

    return unsubscribe;
  }, [navigation]);


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


  async function fetchData(): Promise<void> {
    try {
      setLoading(true);
      console.log("Fetching ministries data...");

      if (!user) {
        console.error("No user logged in");
        throw new Error("No user logged in");
      }

      console.log("Current user ID:", user.id);

      // Check if user is a church member and get their church_id
      const churchMember = await selectOne("church_members", {
        select: "church_id, role",
        where: { user_id: user.id }
      });

      let userIsAdmin = false;
      if (!churchMember) {
        console.error("Error fetching church member data - user not a church member");
        setIsAdmin(false);
        setUserChurchId(null);
      } else {
        console.log("Church member data:", churchMember);
        setUserChurchId(churchMember.church_id);
        userIsAdmin = churchMember.role && ADMIN_ROLES.includes(churchMember.role.toLowerCase());
        setIsAdmin(userIsAdmin);
      }

      // First, get ALL ministries the user has joined across ALL churches
      const userMemberships = await select("ministry_members", {
        select: "ministry_id, role, church_id",
        where: {
          user_id: user.id,
          role: "member"
        }
      });

      console.log("User memberships across all churches:", userMemberships);

      const userMinistryIds = userMemberships?.map((item) => item.ministry_id) || [];
      console.log("User's ministry IDs:", userMinistryIds);

      // Fetch ALL ministries the user is a member of
      let userMinistries = [];
      if (userMinistryIds.length > 0) {
        // Fetch each ministry individually since we can't use 'in' operator
        const ministryPromises = userMinistryIds.map(id => 
          selectOne("ministries", { where: { id } })
        );
        const ministriesResults = await Promise.all(ministryPromises);
        userMinistries = ministriesResults.filter(m => m !== null);
      }

      // Also fetch ministries from the user's current church (if they have one)
      let churchMinistries = [];
      if (churchMember?.church_id) {
        churchMinistries = await select("ministries", {
          where: { church_id: churchMember.church_id }
        });
      }

      // Combine and deduplicate ministries (user's ministries + church ministries)
      const ministryMap = new Map();
      
      // Add user's ministries first (these take priority)
      userMinistries.forEach(ministry => {
        ministryMap.set(ministry.id, { ...ministry, is_member: true });
      });
      
      // Add church ministries (only if not already in the map)
      churchMinistries.forEach(ministry => {
        if (!ministryMap.has(ministry.id)) {
          ministryMap.set(ministry.id, { 
            ...ministry, 
            is_member: userMinistryIds.includes(ministry.id) 
          });
        }
      });

      // Convert map back to array
      let ministriesData = Array.from(ministryMap.values());
      
      // Sort client-side by created_at descending
      if (ministriesData && ministriesData.length > 0) {
        ministriesData = ministriesData.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      console.log("Combined ministries:", ministriesData?.length);

      // Fetch member counts for all ministries
      let memberCounts = [];
      if (ministriesData && ministriesData.length > 0) {
        memberCounts = await select("ministry_members", {
          select: "ministry_id"
        });
        // Filter to only the ministries we care about
        const ministryIds = ministriesData.map((m) => m.id);
        memberCounts = memberCounts.filter((count: any) => ministryIds.includes(count.ministry_id));
      }

      // Count members for each ministry
      const memberCountMap =
        memberCounts?.reduce<Record<number, number>>((acc, curr) => {
          acc[curr.ministry_id] = (acc[curr.ministry_id] || 0) + 1;
          return acc;
        }, {}) || {};

      // Fetch church names for all ministries
      const uniqueChurchIds = [...new Set(ministriesData.map(m => m.church_id))];
      const churchMap = new Map();
      
      // Fetch each church's name
      if (uniqueChurchIds.length > 0) {
        const churchPromises = uniqueChurchIds.map(churchId => 
          selectOne("churches", { 
            select: "id, name",
            where: { id: churchId } 
          })
        );
        const churchResults = await Promise.all(churchPromises);
        
        // Build a map of church_id to church_name
        churchResults.forEach(church => {
          if (church) {
            churchMap.set(church.id, church.name);
          }
        });
      }

      // Process the ministries data with member counts and church names
      let processedMinistries = ministriesData.map((ministry) => ({
        ...ministry,
        member_count: memberCountMap[ministry.id] || 0,
        church_name: churchMap.get(ministry.church_id) || 'Unknown Church',
        // is_member is already set above
      }));

      // Filter out private ministries based on user role and membership
      processedMinistries = processedMinistries.filter(ministry => {
        // If ministry is not private, show it
        if (!ministry.private) return true;
        
        // If ministry is private and user is a member, show it
        if (ministry.is_member) return true;
        
        // If ministry is private and user is admin/owner of the church, show it
        if (userIsAdmin && ministry.church_id === churchMember?.church_id) return true;
        
        // Otherwise, hide private ministries
        return false;
      });

      console.log(
        "Processed ministries with membership:",
        processedMinistries.map((m) => ({
          id: m.id,
          name: m.name,
          is_member: m.is_member,
        })),
      );

      // Store ministries
      setMinistries(processedMinistries || []);
    } catch (error) {
      console.error("Error in data fetch:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  // Navigate to ministry detail screen
  const navigateToMinistryDetail = async (ministryId: number) => {
    try {
      if (!user) {
        Alert.alert("Error", "Please log in to continue");
        return;
      }

      console.log(`[DEBUG] Checking membership - User ID: ${user.id}, Ministry ID: ${ministryId}`);

      // Check for member role
      const membershipData = await selectOne("ministry_members", {
        select: "role",
        where: {
          ministry_id: ministryId,
          user_id: user.id,
          role: "member"
        }
      });

      console.log("[DEBUG] Membership query result:", membershipData);

      // If there's a record with role = 'member', go directly to detail screen
      if (membershipData) {
        console.log("[DEBUG] Found active membership, going to ministry detail");
        router.push({
          pathname: "/(tabs)/ministry-chat" as any,
          params: { id: ministryId.toString() },
        });
      } else {
        console.log("[DEBUG] No active membership found, going to join screen");
        router.push({
          pathname: "/(tabs)/JoinMinistryScreen",
          params: { ministryId: ministryId.toString() },
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

      if (!user) {
        Alert.alert("Error", "You must be logged in to join a ministry");
        return;
      }

      if (!userChurchId) {
        Alert.alert("Error", "You must be a member of a church to join a ministry");
        return;
      }

      // Check if user is church admin/owner
      const churchRole = userRole?.toLowerCase() || "";
      const isChurchAdmin = churchRole === "admin" || churchRole === "owner";
      
      await insert("ministry_members", {
        ministry_id: ministryId,
        user_id: user.id,
        church_id: userChurchId,
        joined_at: new Date().toISOString(),
        role: isChurchAdmin ? "admin" : "member",
      });

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

      if (!user) {
        Alert.alert("Error", "You must be logged in to leave a ministry");
        return;
      }

      await deleteRecord("ministry_members", {
        ministry_id: ministryId,
        user_id: user.id
      });

      // Also remove from the ministry prayer group
      try {
        // Get the ministry details to find the group name
        const ministry = await selectOne("ministries", {
          where: { id: ministryId }
        });
        
        if (ministry) {
          // Find the prayer group for this ministry
          const prayerGroups = await select("groups", {
            where: { 
              name: `${ministry.name} Prayer Group`,
              is_ministry_group: true,
              church_id: ministry.church_id
            }
          });
          
          if (prayerGroups && prayerGroups.length > 0) {
            // Remove user from the prayer group
            const groupId = prayerGroups[0].id;
            const membership = await selectOne("group_members", {
              where: {
                group_id: groupId,
                user_id: user.id
              }
            });
            
            if (membership) {
              await deleteRecord("group_members", { id: membership.id });
            }
          }
        }
      } catch (groupError) {
        console.error("Error removing from prayer group:", groupError);
        // Don't block ministry leave if group removal fails
      }

      // Check if ministry is linked to any courses and remove from those too
      const linkedCourses = await select("courses", {
        where: { ministry_id: ministryId }
      });

      if (linkedCourses && linkedCourses.length > 0) {
        // Remove from all linked course enrollments
        for (const course of linkedCourses) {
          const enrollment = await selectOne("course_enrollments", {
            where: { course_id: course.id, user_id: user.id }
          });
          
          if (enrollment) {
            await deleteRecord("course_enrollments", { id: enrollment.id });
          }
        }
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
    Alert.alert("Delete Ministry", "Are you sure you want to delete this ministry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Haptic feedback
            if (Platform.OS === "ios") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            setLoading(true);

            // First, delete all ministry members
            await deleteRecord("ministry_members", {
              ministry_id: ministryId
            });

            // Delete the associated prayer group
            try {
              // Get the ministry details to find the group name
              const ministry = await selectOne("ministries", {
                where: { id: ministryId }
              });
              
              if (ministry) {
                // Find the prayer group for this ministry
                const prayerGroups = await select("groups", {
                  where: { 
                    name: `${ministry.name} Prayer Group`,
                    is_ministry_group: true,
                    ministry_id: ministryId
                  }
                });
                
                if (prayerGroups && prayerGroups.length > 0) {
                  const groupId = prayerGroups[0].id;
                  
                  // Delete all group members first
                  await deleteRecord("group_members", {
                    group_id: groupId
                  });
                  
                  // Then delete the group
                  await deleteRecord("groups", {
                    id: groupId
                  });
                }
              }
            } catch (groupError) {
              console.error("Error deleting prayer group:", groupError);
              // Don't block ministry deletion if group deletion fails
            }

            // Then, delete any ministry messages
            await deleteRecord("ministry_messages", {
              ministry_id: ministryId
            });

            // Finally, delete the ministry itself
            await deleteRecord("ministries", {
              id: ministryId
            });

            // Refresh ministries list
            fetchData();
            Alert.alert("Success", "Ministry deleted successfully!");
          } catch (error) {
            console.error("Error deleting ministry:", error);
            Alert.alert("Error", "Failed to delete ministry. Please try again.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
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
          <Image source={{ uri: ministry.image_url }} style={styles.ministryAvatarImage} />
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
      50 * (index + (section.title === "My Ministries (All Churches)" ? 0 : section.data.length));

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
              Alert.alert("Leave Ministry", `Are you sure you want to leave ${item.name}?`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Leave",
                  style: "destructive",
                  onPress: () => handleLeaveMinistry(item.id),
                },
              ]);
            } else {
              handleJoinMinistry(item.id);
            }
          }}
        >
          <View style={styles.ministryAvatar}>{renderMinistryAvatar(item)}</View>

          <View style={styles.ministryContent}>
            <View style={styles.ministryHeaderRow}>
              <View style={styles.ministryNameContainer}>
                <Text style={styles.ministryName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.private && (
                  <Ionicons name="lock-closed" size={14} color={theme.primary} style={styles.privateLockIcon} />
                )}
              </View>
              <Text style={styles.ministryTimestamp}>{formatTime(item.created_at)}</Text>
            </View>

            <View style={styles.ministryDescriptionRow}>
              <Text style={styles.ministryDescription} numberOfLines={1}>
                {item.description || "No description"}
              </Text>
            </View>

            <View style={styles.ministryChurchRow}>
              <View style={styles.ministryChurchInfo}>
                <Ionicons name="home-outline" size={14} color={theme.textLight} />
                <Text style={styles.ministryChurchName} numberOfLines={1}>
                  {item.church_name || "Unknown Church"}
                </Text>
              </View>

              {(item.member_count ?? 0) > 0 && (
                <View style={styles.memberCountBadge}>
                  <MaterialCommunityIcons name="account-group" size={12} color={theme.primary} />
                  <Text style={styles.memberCountText}>{item.member_count}</Text>
                </View>
              )}
            </View>

            {item.is_member && (
              <View style={styles.memberStatusRow}>
                <View style={styles.memberStatusBadge}>
                  <MaterialIcons
                    name="check-circle"
                    size={14}
                    color={theme.primary}
                  />
                  <Text style={styles.memberStatusText}>Joined</Text>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {/* Modern divider */}
        <View style={styles.ministryDivider} />
      </Animated.View>
    );
  };

  // Render section header
  const renderSectionHeader = ({ section }: { section: SectionListData<Ministry> }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      {section.title === "My Ministries" && (
        <View style={styles.sectionHeaderBadge}>
          <Text style={styles.sectionHeaderBadgeText}>{section.data.length}</Text>
        </View>
      )}
    </View>
  );

  // Loading screen with Lottie animation
  if (loading) {
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
                colors={theme.gradientDanger}
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
              <TouchableOpacity style={styles.errorButton} onPress={navigateToHome}>
                <LinearGradient
                  colors={theme.gradientPrimary}
                  style={styles.errorButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.errorButtonText}>Back to Home</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

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
        <BlurView intensity={90} tint="dark" style={styles.blurView} />
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
          <TouchableOpacity style={styles.backButton} onPress={navigateToHome} activeOpacity={0.7}>
            <View style={styles.backButtonContainer}>
              <Ionicons name="arrow-back" size={22} color={theme.primary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ministries</Text>
        </View>

        {/* Create Ministry Button - Only for admin/owner */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.createMinistryButton}
            onPress={navigateToCreateMinistry}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createButtonGradient}
            >
              <MaterialIcons name="add" size={18} color="#000" />
              <Text style={styles.createButtonText}>New</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
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
            color={isSearchFocused ? theme.primary : theme.textLight}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search ministries..."
            placeholderTextColor={theme.textLight}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton} activeOpacity={0.7}>
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
            <View style={styles.emptyStateIconBackground}>
              <FontAwesome5 name="church" size={48} color={theme.primary} />
            </View>
          </View>
          <Text style={styles.emptyStateTitle}>No Ministries Found</Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchText ? `No results found for "${searchText}"` : "Add a ministry to get started"}
          </Text>

          {!searchText && (
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={navigateToCreateMinistry}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyStateButtonGradient}
              >
                <MaterialIcons name="add" size={18} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStateButtonText}>Add New Ministry</Text>
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
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: false,
            })}
            scrollEventThrottle={16}
            ListFooterComponent={() => <View style={styles.listFooter} />}
            stickySectionHeadersEnabled={true}
            contentContainerStyle={styles.listContent}
          />
        )}
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
        <TouchableOpacity style={styles.scrollTopButton} onPress={scrollToTop} activeOpacity={0.8}>
          <BlurView intensity={90} tint="dark" style={styles.scrollTopBlur}>
            <Feather name="chevron-up" size={20} color={theme.primary} />
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ministryDivider: {
    height: 1,
    backgroundColor: theme.divider,
    marginLeft: 84,
    opacity: 0.3,
  },
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 96 : 70,
    zIndex: 100,
    borderBottomWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 24,
    backgroundColor: theme.pageBg,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: theme.textWhite,
    letterSpacing: -1,
  },

  // Search styles
  searchContainer: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 20,
    backgroundColor: theme.pageBg,
    zIndex: 5,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 48,
    borderWidth: 0,
  },
  searchInputContainerFocused: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: theme.textWhite,
    fontSize: 17,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },
  clearButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Section header styles
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.pageBg,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textLight,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  sectionHeaderBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionHeaderBadgeText: {
    color: theme.primary,
    fontWeight: "700",
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
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.textWhite,
    marginBottom: 16,
    letterSpacing: -0.8,
  },
  emptyStateSubtitle: {
    fontSize: 17,
    fontWeight: "500",
    color: theme.textLight,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    opacity: 0.8,
  },
  emptyStateButton: {
    overflow: "hidden",
    borderRadius: 16,
  },
  emptyStateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  emptyStateButtonText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Main list styles
  mainList: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 120,
    paddingTop: 8,
  },

  // Ministry item styles - WhatsApp/iMessage like
  ministryItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.pageBg,
  },
  ministryAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  ministryAvatarImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: "hidden",
  },
  ministryAvatarImage: {
    width: 56,
    height: 56,
  },
  ministryAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  ministryAvatarInitials: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  ministryContent: {
    flex: 1,
    justifyContent: "center",
  },
  ministryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  ministryNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  ministryName: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textWhite,
    letterSpacing: -0.3,
  },
  privateLockIcon: {
    marginLeft: 8,
  },
  ministryTimestamp: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.textLight,
    opacity: 0.6,
  },
  ministryDescriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ministryDescription: {
    fontSize: 16,
    fontWeight: "400",
    color: theme.textLight,
    flex: 1,
    lineHeight: 22,
    opacity: 0.8,
  },
  ministryChurchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  ministryChurchInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberStatusRow: {
    marginTop: 8,
  },
  ministryChurchName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.textLight,
    marginLeft: 6,
    flex: 1,
    opacity: 0.7,
  },
  memberCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  memberCountText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  memberStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    gap: 6,
  },
  memberStatusText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  // Create button in header
  createMinistryButton: {
    overflow: "hidden",
    borderRadius: 12,
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  createButtonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 6,
    letterSpacing: -0.2,
  },

  listFooter: {
    height: 100, // Extra space at bottom
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
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
    marginTop: 12,
    fontSize: 19,
    fontWeight: "600",
    color: theme.textWhite,
    letterSpacing: -0.4,
    opacity: 0.8,
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
    backgroundColor: theme.pageBg,
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  errorIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.textWhite,
    marginBottom: 16,
    letterSpacing: -0.8,
  },
  errorText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
    marginBottom: 32,
    maxWidth: "80%",
    lineHeight: 22,
  },
  errorButton: {
    overflow: "hidden",
    borderRadius: 24,
  },
  errorButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  errorButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },

  // Scroll to top button
  scrollTopButtonContainer: {
    position: "absolute",
    bottom: 32,
    right: 24,
    zIndex: 9,
  },
  scrollTopButton: {
    width: 48,
    height: 48,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 0,
  },
  scrollTopBlur: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
});
