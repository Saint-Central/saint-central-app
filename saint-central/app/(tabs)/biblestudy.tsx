import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
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
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AntDesign,
  MaterialCommunityIcons,
  Feather,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import theme from "../../theme"; // Import the new theme file

const { width, height } = Dimensions.get("window");

// Define navigation types
export type RootStackParamList = {
  createbiblestudypage: { bibleStudyId?: string }; // Optional id for editing
  biblestudydetailpage: { bibleStudyId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define types based on schema
export interface BibleStudy {
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

const BibleStudySchedulePage: React.FC = () => {
  // Configure status bar on component mount
  useEffect(() => {
    StatusBar.setBarStyle("light-content"); // Changed to light content for dark theme
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(theme.pageBg);
      StatusBar.setTranslucent(false);
    }
  }, []);

  const router = useRouter();
  const navigation = useNavigation<NavigationProp>();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Use custom auth and CRUD hooks
  const { user: currentUser } = useAuth();
  const { select, selectOne } = useCRUD();

  // State variables
  const [bibleStudies, setBibleStudies] = useState<BibleStudy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [filteredBibleStudies, setFilteredBibleStudies] = useState<BibleStudy[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<"upcoming" | "past">("upcoming");

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (currentUser) {
      fetchUserChurches();
    }
  }, [currentUser]);

  // Update filtered Bible studies when Bible studies or search query changes
  useEffect(() => {
    const filtered = bibleStudies.filter((study: BibleStudy) => {
      const searchTerm = searchQuery.toLowerCase();
      const today = new Date();
      const studyDate = new Date(study.date);
      const isPast = studyDate < today;

      const matchesSearch =
        (study.description?.toLowerCase() || "").includes(searchTerm) ||
        (study.location?.toLowerCase() || "").includes(searchTerm) ||
        (study.created_by?.toLowerCase() || "").includes(searchTerm);

      // Filter by active tab
      return (
        matchesSearch &&
        ((activeTabs === "upcoming" && !isPast) || (activeTabs === "past" && isPast))
      );
    });
    setFilteredBibleStudies(filtered);
  }, [searchQuery, bibleStudies, activeTabs]);

  // Load Bible studies when church selection changes
  useEffect(() => {
    if (selectedChurchId) {
      fetchBibleStudies();
      checkPermissions();
    }
  }, [selectedChurchId]);

  // Fetch user's churches with role information
  const fetchUserChurches = async (): Promise<void> => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Get churches where the user is a member
      const churchMembers = await select("church_members", {
        select: "church_id, role",
        where: { user_id: currentUser.id }
      });

      if (churchMembers && churchMembers.length > 0) {
        // Get church details for each membership individually
        const churchData: any[] = [];
        
        for (const member of churchMembers) {
          try {
            const church = await selectOne("churches", {
              select: "id, name",
              where: { id: member.church_id }
            });
            
            if (church) {
              churchData.push({
                ...church,
                role: member.role
              });
            }
          } catch (error) {
            console.error(`Error fetching church ${member.church_id}:`, error);
          }
        }

        // Transform the data into UserChurch format
        const userChurchesData: UserChurch[] = churchData.map((church) => ({
          id: church.id.toString(),
          name: church.name || "Unknown Church",
          role: church.role,
        }));

        setUserChurches(userChurchesData);
        console.log("User churches:", userChurchesData);

        // Select the first church by default if none is selected
        if (!selectedChurchId && userChurchesData.length > 0) {
          setSelectedChurchId(userChurchesData[0].id);
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

  // Check if user has permission to create/edit Bible studies
  const checkPermissions = (): void => {
    if (!currentUser || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }

    // Find the user's role in the selected church
    const church = userChurches.find((c) => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || "";

    // Only admin or owner roles can create/edit Bible studies
    const hasAdminRole = role === "admin" || role === "owner";
    console.log("User role check:", role, "Has admin permissions:", hasAdminRole);
    setHasPermissionToCreate(hasAdminRole);
  };

  // Effect to check permissions when selected church changes
  useEffect(() => {
    checkPermissions();
  }, [selectedChurchId, userChurches]);

  // Fetch Bible studies for the selected church
  const fetchBibleStudies = async (): Promise<void> => {
    if (!currentUser || !selectedChurchId) {
      setBibleStudies([]);
      setFilteredBibleStudies([]);
      return;
    }

    try {
      setLoading(true);

      const churchIdNumber = parseInt(selectedChurchId);
      if (isNaN(churchIdNumber)) {
        console.error("Invalid church ID:", selectedChurchId);
        setBibleStudies([]);
        setFilteredBibleStudies([]);
        return;
      }

      // Fetch Bible studies for the selected church
      const data = await select("bible_study_times", {
        where: { church_id: churchIdNumber }
        // Removed order clause for now - will sort in JavaScript instead
      });

      if (data) {
        // Transform Bible study data to include additional fields
        let enhancedData: BibleStudy[] = data.map((study) => ({
          ...study,
          id: study.id.toString(), // Ensure ID is string
          church_id: study.church_id.toString(),
          description: study.description || "Bible Study", // Use description as the main identifier
          location: study.location || "Church Main Hall",
          is_recurring: study.is_recurring || false,
        }));

        // Sort by date in JavaScript (descending - newest first)
        enhancedData = enhancedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setBibleStudies(enhancedData);
        // Initial filtering based on active tab
        const today = new Date();
        const filtered = enhancedData.filter((study) => {
          const studyDate = new Date(study.date);
          const isPast = studyDate < today;
          return activeTabs === "upcoming" ? !isPast : isPast;
        });
        setFilteredBibleStudies(filtered);
        console.log(`Fetched ${enhancedData.length} Bible studies for church ${selectedChurchId}`);
      }
    } catch (error) {
      console.error("Error fetching Bible studies:", error);
      Alert.alert("Error", "Failed to load church Bible studies");
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchBibleStudies();
    setRefreshing(false);
  };

  // Navigate to create Bible study page
  const handleCreateBibleStudyClick = (): void => {
    if (!currentUser || !selectedChurchId) {
      Alert.alert(
        "Sign In Required",
        "Please sign in and select a church to create Bible studies.",
      );
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied",
        "Only church admins and owners can create Bible studies. Contact your church administrator for access.",
      );
      return;
    }

    console.log("Navigating to create Bible study page");
    router.push({
      pathname: "/createbiblestudypage",
      params: { church_id: selectedChurchId },
    } as any);
  };

  // Handle Bible study click
  const handleBibleStudyClick = (study: BibleStudy): void => {
    router.push({
      pathname: "/biblestudydetailpage",
      params: { bibleStudyId: study.id },
    } as any);
  };

  // Handle edit Bible study
  const handleEditBibleStudy = (study: BibleStudy): void => {
    if (!hasPermissionToCreate) {
      Alert.alert("Permission Denied", "Only church admins and owners can edit Bible studies.");
      return;
    }

    router.push({
      pathname: "/createbiblestudypage",
      params: { bibleStudyId: study.id },
    } as any);
  };

  // Get Bible study icon and color based on description
  const getBibleStudyIconAndColor = (study: BibleStudy): IconAndColor => {
    // Default to Bible icon if no description
    const description = study.description?.toLowerCase() || "";

    if (
      description.includes("genesis") ||
      description.includes("exodus") ||
      description.includes("leviticus")
    ) {
      return { icon: "book-open", color: theme.accent1 }; // Muted gold for Old Testament
    } else if (
      description.includes("matthew") ||
      description.includes("mark") ||
      description.includes("luke") ||
      description.includes("john")
    ) {
      return { icon: "book", color: theme.accent2 }; // Muted rust for Gospels
    } else if (
      description.includes("acts") ||
      description.includes("romans") ||
      description.includes("corinthians")
    ) {
      return { icon: "file-text", color: theme.tertiary }; // Soft coral for New Testament
    } else if (description.includes("revelation") || description.includes("prophecy")) {
      return { icon: "sun", color: theme.secondary }; // Warm amber for Revelation/Prophecy
    } else if (description.includes("prayer") || description.includes("worship")) {
      return { icon: "heart", color: theme.error }; // Dusty rose for Prayer/Worship
    } else if (
      description.includes("youth") ||
      description.includes("teen") ||
      description.includes("young")
    ) {
      return { icon: "users", color: theme.secondary }; // Soft terracotta for Youth
    } else if (
      description.includes("women") ||
      description.includes("men") ||
      description.includes("group")
    ) {
      return { icon: "users", color: theme.success }; // Sage green for Group Studies
    }
    return { icon: "book", color: theme.primary }; // Warm brown for default
  };

  // Helper function to handle null image URLs - updated for generic image service
  const getImageUrl = (url: string | null): string => {
    if (!url) {
      return "https://via.placeholder.com/400x200?text=Bible+Study";
    }

    // If the URL is already a full URL, return it
    if (url.startsWith("http")) {
      return url;
    }

    // For now, return placeholder since we don't have access to Supabase storage
    // In a real implementation, you'd want to set up your own image storage service
    return "https://via.placeholder.com/400x200?text=Bible+Study";
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
    // Bible study times might be stored differently, adjust as needed
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
        placeholder="Search Bible studies..."
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
    fetchBibleStudies().finally(() => {
      setLoading(false);
    });
  };

  // Render Bible study card
  const renderBibleStudyCard = ({ item }: { item: BibleStudy }): React.ReactNode => {
    const { icon, color } = getBibleStudyIconAndColor(item);
    const { day, month } = getDateComponents(item.date);
    const studyDate = new Date(item.date);
    const isPastStudy = studyDate < new Date();
    const isCreator = currentUser && item.created_by === currentUser.id;
    const canEdit = hasPermissionToCreate || isCreator;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.bibleStudyCard}
        onPress={() => handleBibleStudyClick(item)}
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
            <View style={[styles.studyIconContainer, { backgroundColor: color }]}>
              <Feather name={icon as any} size={20} color={theme.textWhite} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.studyTitle} numberOfLines={1}>
                {item.title || item.description}
              </Text>
              <Text style={styles.studyTime}>{formatTime(item.time)}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={theme.textMedium} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location || "Church Main Hall"}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description ||
              "Join us for Bible study as we explore the word of God together in community."}
          </Text>

          {/* Footer - Created by and edit button */}
          <View style={styles.cardFooter}>
            <Text style={styles.createdByText}>Created by {item.created_by || "Unknown"}</Text>

            {canEdit && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditBibleStudy(item)}
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
        {/* Hero Section with Bible Icon and Verse */}
        <View style={styles.heroSection}>
          <View style={styles.bookIconContainer}>
            <FontAwesome5 name="bible" size={40} color={theme.primary} />
          </View>

          <Text style={styles.heroTitle}>Bible Study</Text>
          <Text style={styles.heroVerse}>
            "Your word is a lamp to my feet and a light to my path."
          </Text>
          <Text style={styles.verseReference}>Psalm 119:105</Text>

          {hasPermissionToCreate && (
            <TouchableOpacity style={styles.createButton} onPress={handleCreateBibleStudyClick}>
              <Text style={styles.createButtonText}>START NEW STUDY</Text>
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

        {/* Bible Studies List */}
        <View style={styles.bibleStudiesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>Loading Bible studies...</Text>
            </View>
          ) : filteredBibleStudies.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <FontAwesome5 name="bible" size={50} color={theme.neutral500} />
              <Text style={styles.emptyStateTitle}>No Bible studies found</Text>
              <Text style={styles.emptyStateMessage}>
                {searchQuery
                  ? "Try a different search term"
                  : activeTabs === "upcoming"
                    ? hasPermissionToCreate
                      ? "Add your first Bible study by tapping the button above"
                      : "There are no upcoming Bible studies for this church"
                    : "No past Bible studies are available"}
              </Text>
            </View>
          ) : (
            filteredBibleStudies.map((item) => renderBibleStudyCard({ item }))
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

// Updated styles to use theme properly
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  bookIconContainer: {
    width: 60,
    height: 60,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  heroVerse: {
    fontSize: 18,
    fontStyle: "italic",
    color: theme.textMedium,
    textAlign: "center",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    paddingHorizontal: 20,
  },
  verseReference: {
    fontSize: 14,
    color: theme.textLight,
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 250,
    ...theme.shadowMedium,
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
    backgroundColor: theme.neutral700,
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 26,
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
    marginBottom: 20,
  },
  churchCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    ...theme.shadowLight,
  },
  churchName: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  roleBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    letterSpacing: 1,
  },
  churchSelector: {
    marginTop: 10,
  },
  churchSelectorContent: {
    paddingVertical: 10,
  },
  churchOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.neutral600,
    backgroundColor: theme.neutral800,
  },
  churchOptionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  churchOptionText: {
    color: theme.textLight,
    fontWeight: theme.fontMedium,
  },
  churchOptionTextActive: {
    color: theme.textWhite,
    fontWeight: theme.fontBold,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBg,
    borderRadius: 50,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 50,
    ...theme.shadowLight,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: theme.textWhite,
  },
  clearSearchButton: {
    padding: 8,
  },
  searchToggleButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowMedium,
  },

  // Bible Study Container
  bibleStudiesContainer: {
    marginBottom: 40,
  },

  // Loading State
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.textMedium,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },

  // Empty State
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    padding: 40,
    marginVertical: 20,
    ...theme.shadowLight,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: theme.textMedium,
    textAlign: "center",
    maxWidth: 250,
    lineHeight: 22,
  },

  // Bible Study Card
  bibleStudyCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    flexDirection: "row",
    ...theme.shadowLight,
  },
  dateContainer: {
    width: 60,
    backgroundColor: theme.neutral700,
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
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  studyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  studyTitle: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: 2,
  },
  studyTime: {
    fontSize: 14,
    color: theme.textLight,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.textMedium,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.textLight,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.neutral700,
  },
  createdByText: {
    fontSize: 12,
    color: theme.textLight,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.neutral700,
    borderRadius: 50,
  },
  editButtonText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: theme.fontSemiBold,
  },
  refreshButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowMedium,
  },
});

export default BibleStudySchedulePage;