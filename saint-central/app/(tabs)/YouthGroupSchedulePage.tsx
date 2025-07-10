import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import theme from "../../theme"; // Import the theme file

const { width, height } = Dimensions.get("window");

// Define navigation types
export type RootStackParamList = {
  CreateYouthGroupPage: { youthGroupId?: string }; // Optional id for editing
  youthgroupdetailpage: { youthGroupId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define types based on schema
export interface YouthGroup {
  id: string;
  date: string;
  time: string;
  image: string | null;
  church_id: string;
  created_by: string;
  description: string;
  location?: string;
  is_recurring?: boolean;
  title?: string; // Added title field
}

// User church role interface
interface UserChurch {
  id: string;
  name: string;
  role: string;
}

// Interface for IconColor
interface IconAndColor {
  icon: string;
  color: string;
}

const YouthGroupSchedulePage: React.FC = () => {
  // Configure status bar on component mount
  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(theme.pageBg);
      StatusBar.setTranslucent(false);
    }
  }, []);

  const router = useRouter();
  const navigation = useNavigation<NavigationProp>();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Use custom auth and CRUD
  const { user, session } = useAuth();
  const { select, selectOne } = useCRUD();

  // State variables
  const [youthGroups, setYouthGroups] = useState<YouthGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [filteredYouthGroups, setFilteredYouthGroups] = useState<YouthGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<"upcoming" | "past">("upcoming");

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (user) {
      fetchUserChurches();
    }
  }, [user]);

  // Update filtered Youth Groups when Youth Groups or search query changes
  useEffect(() => {
    const filtered = youthGroups.filter((group: YouthGroup) => {
      const searchTerm = searchQuery.toLowerCase();
      const today = new Date();
      const groupDate = new Date(group.date);
      const isPast = groupDate < today;

      const matchesSearch =
        (group.description?.toLowerCase() || "").includes(searchTerm) ||
        (group.location?.toLowerCase() || "").includes(searchTerm) ||
        (group.created_by?.toLowerCase() || "").includes(searchTerm);

      // Filter by active tab
      return (
        matchesSearch &&
        ((activeTabs === "upcoming" && !isPast) || (activeTabs === "past" && isPast))
      );
    });
    setFilteredYouthGroups(filtered);
  }, [searchQuery, youthGroups, activeTabs]);

  // Load Youth Groups when church selection changes
  useEffect(() => {
    if (selectedChurchId) {
      fetchYouthGroups();
      checkPermissions();
    }
  }, [selectedChurchId]);

  // Fetch user's churches with role information
  const fetchUserChurches = async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);

      // Get churches where the user is a member using CRUD client
      const churchMemberships = await select("church_members", {
        where: { user_id: user.id },
        select: "church_id, role"
      });

      if (churchMemberships && churchMemberships.length > 0) {
        // Get church details for each membership
        const churchPromises = churchMemberships.map(async (membership) => {
          const church = await selectOne("churches", {
            where: { id: membership.church_id },
            select: "id, name"
          });
          
          return church ? {
            id: church.id,
            name: church.name,
            role: membership.role,
          } : null;
        });

        const churches = (await Promise.all(churchPromises)).filter(Boolean) as UserChurch[];

        setUserChurches(churches);
        console.log("User churches:", churches);

        // Select the first church by default if none is selected
        if (!selectedChurchId && churches.length > 0) {
          setSelectedChurchId(churches[0].id);
        }

        // Check permissions after setting churches
        checkPermissions();
      }
    } catch (error) {
      console.error("Error fetching user churches:", error);
      Alert.alert("Error", "Failed to load church information");
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission to create/edit Youth Groups
  const checkPermissions = (): void => {
    if (!user || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }

    // Find the user's role in the selected church
    const church = userChurches.find((c) => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || "";

    // Only admin or owner roles can create/edit Youth Groups
    const hasAdminRole = role === "admin" || role === "owner";
    console.log("User role check:", role, "Has admin permissions:", hasAdminRole);
    setHasPermissionToCreate(hasAdminRole);
  };

  // Effect to check permissions when selected church changes
  useEffect(() => {
    checkPermissions();
  }, [selectedChurchId, userChurches]);

  // Fetch Youth Groups for the selected church
  const fetchYouthGroups = async (): Promise<void> => {
    if (!user || !selectedChurchId) {
      setYouthGroups([]);
      setFilteredYouthGroups([]);
      return;
    }

    try {
      setLoading(true);

      // Fetch Youth Groups for the selected church using CRUD client
      const data = await select("youth_group_times", {
        where: { church_id: selectedChurchId }
      });

      if (data) {
        // Transform Youth Group data to include additional fields
        const enhancedData: YouthGroup[] = data.map((group) => ({
          ...group,
          description: group.description || "Youth Group", // Use description as the main identifier
          location: group.location || "Church Youth Room",
          is_recurring: group.is_recurring || false,
        }));

        // Sort by date (newest first) since we can't use database ordering
        enhancedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setYouthGroups(enhancedData);
        // Initial filtering based on active tab
        const today = new Date();
        const filtered = enhancedData.filter((group) => {
          const groupDate = new Date(group.date);
          const isPast = groupDate < today;
          return activeTabs === "upcoming" ? !isPast : isPast;
        });
        setFilteredYouthGroups(filtered);
        console.log(`Fetched ${enhancedData.length} Youth Groups for church ${selectedChurchId}`);
      }
    } catch (error) {
      console.error("Error fetching Youth Groups:", error);
      Alert.alert("Error", "Failed to load church Youth Groups");
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchYouthGroups();
    setRefreshing(false);
  };

  // Navigate to create Youth Group page
  const handleCreateYouthGroupClick = (): void => {
    if (!user || !selectedChurchId) {
      Alert.alert("Sign In Required", "Please sign in and select a church to create Youth Groups.");
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied",
        "Only church admins and owners can create Youth Groups. Contact your church administrator for access.",
      );
      return;
    }

    console.log("Navigating to create Youth Group page");
    router.push({
      pathname: "/CreateYouthGroupPage",
      params: { church_id: selectedChurchId },
    } as any);
  };

  // Handle Youth Group click
  const handleYouthGroupClick = (group: YouthGroup): void => {
    router.push({
      pathname: "/youthgroupdetailpage",
      params: { youthGroupId: group.id },
    } as any);
  };

  // Handle edit Youth Group
  const handleEditYouthGroup = (group: YouthGroup): void => {
    if (!hasPermissionToCreate) {
      Alert.alert("Permission Denied", "Only church admins and owners can edit Youth Groups.");
      return;
    }

    router.push({
      pathname: "/(tabs)/CreateYouthGroupPage",
      params: { youthGroupId: group.id },
    });
  };

  // Get Youth Group icon and color based on description
  const getYouthGroupIconAndColor = (group: YouthGroup): IconAndColor => {
    // Default to users icon if no description
    const description = group.description?.toLowerCase() || "";

    if (description.includes("worship") || description.includes("praise")) {
      return { icon: "music", color: theme.accent1 }; // Warm gold for worship
    } else if (
      description.includes("games") ||
      description.includes("fun") ||
      description.includes("social")
    ) {
      return { icon: "smile", color: theme.accent3 }; // Soft coral for games/social
    } else if (
      description.includes("bible") ||
      description.includes("study") ||
      description.includes("lesson")
    ) {
      return { icon: "book", color: theme.tertiary }; // Soft blue for Bible study
    } else if (
      description.includes("mission") ||
      description.includes("outreach") ||
      description.includes("service")
    ) {
      return { icon: "heart", color: theme.secondary }; // Warm red for service/missions
    } else if (description.includes("prayer") || description.includes("devotion")) {
      return { icon: "sun", color: theme.warning }; // Warm yellow for Prayer/Devotions
    } else if (description.includes("teen") || description.includes("middle school")) {
      return { icon: "users", color: theme.info }; // Soft blue for Teens
    } else if (
      description.includes("camp") ||
      description.includes("retreat") ||
      description.includes("trip")
    ) {
      return { icon: "map", color: theme.success }; // Soft green for trips
    }
    return { icon: "users", color: theme.primary }; // Warm amber for default
  };

  // Helper function to handle null image URLs and ensure proper bucket URL
  const getImageUrl = (url: string | null): string => {
    if (!url) {
      return "https://via.placeholder.com/400x200?text=Youth+Group";
    }

    // If the URL is already a full URL, return it
    if (url.startsWith("http")) {
      return url;
    }

    // For custom storage, you might need to construct the URL differently
    // This is a placeholder - adjust based on your storage solution
    return `https://storage.your-domain.com/youthgroup-images/${url}`;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    } as Intl.DateTimeFormatOptions);
  };

  // Format time
  const formatTime = (timeString: string): string => {
    // Youth Group times might be stored differently, adjust as needed
    return timeString;
  };

  // Get date components for calendar-style display
  const getDateComponents = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    return { day, month };
  };

  // Render search bar
  const renderSearchBar = (): React.ReactNode => (
    <View style={styles.searchContainer}>
      <Feather name="search" size={18} color={theme.textMedium} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search Youth Groups..."
        placeholderTextColor={theme.textLight}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery("")}>
          <Feather name="x" size={18} color={theme.textMedium} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Add handleManualRefresh method
  const handleManualRefresh = (): void => {
    setLoading(true);
    fetchYouthGroups().finally(() => {
      setLoading(false);
    });
  };

  // Render Youth Group card
  const renderYouthGroupCard = ({ item }: { item: YouthGroup }): React.ReactNode => {
    const { icon, color } = getYouthGroupIconAndColor(item);
    const { day, month } = getDateComponents(item.date);
    const groupDate = new Date(item.date);
    const isPastGroup = groupDate < new Date();
    const isCreator = user && item.created_by === user.id;
    const canEdit = hasPermissionToCreate || isCreator;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.youthGroupCard}
        onPress={() => handleYouthGroupClick(item)}
        activeOpacity={0.9}
      >
        {/* Date display */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateMonth}>{month}</Text>
          <Text style={styles.dateDay}>{day}</Text>
        </View>

        <View style={styles.cardContent}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View style={[styles.groupIconContainer, { backgroundColor: color + "40" }]}>
              <Feather name={icon as any} size={20} color={color} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.groupTitle} numberOfLines={1}>
                {item.title || item.description}
              </Text>
              <Text style={styles.groupTime}>{formatTime(item.time)}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={theme.textMedium} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location || "Church Youth Room"}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description ||
              "Join us for Youth Group as we grow in faith and friendship together."}
          </Text>

          {/* Footer - Created by and edit button */}
          <View style={styles.cardFooter}>
            <Text style={styles.createdByText}>Created by {item.created_by || "Unknown"}</Text>

            {canEdit && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditYouthGroup(item)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.pageBg} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Hero Section with Youth Icon and Verse */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="users" size={40} color={theme.info} />
          </View>

          <Text style={styles.heroTitle}>Youth Group</Text>
          <Text style={styles.heroVerse}>
            "Don't let anyone look down on you because you are young, but set an example for the
            believers."
          </Text>
          <Text style={styles.verseReference}>1 Timothy 4:12</Text>

          {hasPermissionToCreate && (
            <TouchableOpacity style={styles.createButton} onPress={handleCreateYouthGroupClick}>
              <LinearGradient
                colors={theme.gradientPrimary}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.createButtonText}>CREATE NEW EVENT</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          <TouchableOpacity
            style={[styles.filterTab, activeTabs === "upcoming" ? styles.filterTabActive : null]}
            onPress={() => setActiveTabs("upcoming")}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTabs === "upcoming" ? styles.filterTabTextActive : null,
              ]}
            >
              UPCOMING
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTabs === "past" ? styles.filterTabActive : null]}
            onPress={() => setActiveTabs("past")}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTabs === "past" ? styles.filterTabTextActive : null,
              ]}
            >
              PAST
            </Text>
          </TouchableOpacity>
        </View>

        {/* Church Selection */}
        {userChurches.length > 0 && (
          <View style={styles.churchContainer}>
            <View style={styles.churchCard}>
              <Text style={styles.churchName}>
                {userChurches.find((c) => c.id === selectedChurchId)?.name || "Select a Church"}
              </Text>

              {/* Role badge */}
              {userChurches.find((c) => c.id === selectedChurchId)?.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {userChurches.find((c) => c.id === selectedChurchId)?.role.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Church selector if multiple churches */}
            {userChurches.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.churchSelector}
                contentContainerStyle={styles.churchSelectorContent}
              >
                {userChurches.map((church) => (
                  <TouchableOpacity
                    key={church.id}
                    style={[
                      styles.churchOption,
                      selectedChurchId === church.id ? styles.churchOptionActive : null,
                    ]}
                    onPress={() => setSelectedChurchId(church.id)}
                  >
                    <Text
                      style={[
                        styles.churchOptionText,
                        selectedChurchId === church.id ? styles.churchOptionTextActive : null,
                      ]}
                    >
                      {church.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Search Bar - Only if needed */}
        {showSearch && renderSearchBar()}

        {/* Youth Groups List */}
        <View style={styles.youthGroupsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>Loading Youth Groups...</Text>
            </View>
          ) : filteredYouthGroups.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <FontAwesome5 name="users" size={50} color={theme.neutral300} />
              <Text style={styles.emptyStateTitle}>No Youth Group Schedule </Text>
              <Text style={styles.emptyStateMessage}>
                {searchQuery
                  ? "Try a different search term"
                  : activeTabs === "upcoming"
                    ? hasPermissionToCreate
                      ? "Add your first Youth Group meeting by tapping the button above"
                      : "There are no upcoming Youth Group meetings for this church"
                    : "No past Youth Group meetings are available"}
              </Text>
            </View>
          ) : (
            filteredYouthGroups.map((item) => renderYouthGroupCard({ item }))
          )}
        </View>
      </ScrollView>

      {/* Add refresh button before search toggle button */}
      <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
        <Feather name="refresh-cw" size={22} color={theme.textWhite} />
      </TouchableOpacity>

      {/* Search toggle button */}
      <TouchableOpacity
        style={styles.searchToggleButton}
        onPress={() => setShowSearch(!showSearch)}
      >
        <Feather name={showSearch ? "x" : "search"} size={22} color={theme.textWhite} />
      </TouchableOpacity>
    </View>
  );
};

// Christian Dark Theme styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: theme.spacingL,
    paddingTop: Platform.OS === "ios" ? theme.statusBarSpacing + theme.spacingL : theme.spacingXL,
    paddingBottom: theme.spacingXL,
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    marginBottom: theme.spacingXL,
  },
  iconContainer: {
    width: 60,
    height: 60,
    marginBottom: theme.spacingM,
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingM,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  heroVerse: {
    fontSize: 18,
    fontStyle: "italic",
    color: theme.textMedium,
    textAlign: "center",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    paddingHorizontal: theme.spacingL,
  },
  verseReference: {
    fontSize: 14,
    color: theme.textLight,
    marginBottom: theme.spacing2XL,
  },
  createButton: {
    minWidth: 250,
    borderRadius: theme.radiusFull,
    overflow: "hidden",
  },
  gradientButton: {
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    letterSpacing: 1,
  },

  // Filter Tabs
  filterTabsContainer: {
    flexDirection: "row",
    backgroundColor: theme.cardBg,
    borderRadius: theme.spacing2XL,
    padding: 4,
    marginBottom: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacingS,
    alignItems: "center",
    borderRadius: theme.spacingXL,
  },
  filterTabActive: {
    backgroundColor: theme.primary,
  },
  filterTabText: {
    fontWeight: theme.fontBold,
    color: theme.textLight,
    letterSpacing: 1,
    fontSize: 14,
  },
  filterTabTextActive: {
    color: theme.textWhite,
  },

  // Church Selection
  churchContainer: {
    marginBottom: theme.spacingL,
  },
  churchCard: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacingS,
    borderWidth: 1,
    borderColor: theme.divider,
    ...theme.shadowLight,
  },
  churchName: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  roleBadge: {
    backgroundColor: theme.info,
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingS,
    borderRadius: theme.radiusFull,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    letterSpacing: 1,
  },
  churchSelector: {
    marginTop: theme.spacingS,
  },
  churchSelectorContent: {
    paddingVertical: theme.spacingS,
  },
  churchOption: {
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingS,
    marginRight: theme.spacingS,
    borderRadius: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
    backgroundColor: theme.cardBg,
  },
  churchOptionActive: {
    backgroundColor: theme.accent1,
    borderColor: theme.accent1,
  },
  churchOptionText: {
    color: theme.textLight,
    fontWeight: theme.fontMedium,
  },
  churchOptionTextActive: {
    color: theme.textDark,
    fontWeight: theme.fontBold,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusFull,
    paddingHorizontal: theme.spacingM,
    marginBottom: theme.spacingL,
    height: 50,
    borderWidth: 1,
    borderColor: theme.divider,
    ...theme.shadowLight,
  },
  searchIcon: {
    marginRight: theme.spacingS,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: theme.textWhite,
  },
  clearSearchButton: {
    padding: theme.spacingS,
  },
  searchToggleButton: {
    position: "absolute",
    bottom: theme.spacingL,
    right: theme.spacingL,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowMedium,
  },

  // Youth Group Container
  youthGroupsContainer: {
    marginBottom: theme.spacingXL,
  },

  // Loading State
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: theme.spacingM,
    fontSize: 16,
    color: theme.textMedium,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },

  // Empty State
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    padding: theme.spacingXL,
    marginVertical: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
    ...theme.shadowLight,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: theme.spacingM,
    marginBottom: theme.spacingS,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: theme.textMedium,
    textAlign: "center",
    maxWidth: 250,
    lineHeight: 22,
  },

  // Youth Group Card
  youthGroupCard: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    marginBottom: theme.spacingM,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.divider,
    ...theme.shadowLight,
  },
  dateContainer: {
    width: 60,
    backgroundColor: theme.neutral800,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  dateMonth: {
    fontSize: 12,
    color: theme.textLight,
    fontWeight: theme.fontBold,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  dateDay: {
    fontSize: 20,
    color: theme.textWhite,
    fontWeight: theme.fontBold,
  },
  cardContent: {
    flex: 1,
    padding: theme.spacingM,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingS,
  },
  groupIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingS,
  },
  titleContainer: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: 2,
  },
  groupTime: {
    fontSize: 14,
    color: theme.textMedium,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingS,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.textMedium,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.textLight,
    marginBottom: theme.spacingS,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacingS,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  createdByText: {
    fontSize: 12,
    color: theme.textLight,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacingS,
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusFull,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  editButtonText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: theme.fontSemiBold,
  },
  refreshButton: {
    position: "absolute",
    bottom: theme.spacingL,
    left: theme.spacingL,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowMedium,
  },
});

export default YouthGroupSchedulePage;