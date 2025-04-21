import React, { useState, useEffect, useRef } from 'react';
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
  ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AntDesign,
  MaterialCommunityIcons,
  Feather,
  Ionicons,
  FontAwesome5
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import theme from '../../theme'; // Import the new theme file

const { width, height } = Dimensions.get('window');

// Define navigation types
export type RootStackParamList = {
  'createbiblestudypage': { bibleStudyId?: string }; // Optional id for editing
  'biblestudydetailpage': { bibleStudyId: string };
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

// Background colors
const PARCHMENT_BG = '#F9F5F1'; // Light parchment/cream color
const CARD_BG = '#FFFFFF';      // White for cards
const SELECTED_TAB_BG = '#FFFFFF'; // White background for selected tab
const UNSELECTED_TAB_BG = 'rgba(169, 150, 134, 0.15)'; // Light version of neutral400

const BibleStudySchedulePage: React.FC = () => {
  // Configure status bar on component mount
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(PARCHMENT_BG);
      StatusBar.setTranslucent(false);
    }
  }, []);
  
  const router = useRouter();
  const navigation = useNavigation<NavigationProp>();
  const scrollY = useRef(new Animated.Value(0)).current;

  // State variables
  const [bibleStudies, setBibleStudies] = useState<BibleStudy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [filteredBibleStudies, setFilteredBibleStudies] = useState<BibleStudy[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<'upcoming' | 'past'>('upcoming');

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async (): Promise<void> => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (data && data.user) {
          setUser(data.user);
          console.log("User authenticated:", data.user.id);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (user) {
      fetchUserChurches();
    }
  }, [user]);

  // Update filtered Bible studies when Bible studies or search query changes
  useEffect(() => {
    const filtered = bibleStudies.filter((study: BibleStudy) => {
      const searchTerm = searchQuery.toLowerCase();
      const today = new Date();
      const studyDate = new Date(study.date);
      const isPast = studyDate < today;
      
      const matchesSearch = (
        (study.description?.toLowerCase() || '').includes(searchTerm) ||
        (study.location?.toLowerCase() || '').includes(searchTerm) ||
        (study.created_by?.toLowerCase() || '').includes(searchTerm)
      );
      
      // Filter by active tab
      return matchesSearch && (
        (activeTabs === 'upcoming' && !isPast) ||
        (activeTabs === 'past' && isPast)
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
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get churches where the user is a member
      const { data, error } = await supabase
        .from('church_members')
        .select('church_id, role, churches(id, name)')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Transform the data into UserChurch format
        const churches: UserChurch[] = data.map(item => ({
          id: item.church_id,
          name: (item.churches as unknown as { id: string; name: string }).name,
          role: item.role
        }));
        
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
      console.error('Error fetching user churches:', error);
      Alert.alert('Error', 'Failed to load church information');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission to create/edit Bible studies
  const checkPermissions = (): void => {
    if (!user || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }
    
    // Find the user's role in the selected church
    const church = userChurches.find(c => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || '';
    
    // Only admin or owner roles can create/edit Bible studies
    const hasAdminRole = (role === 'admin' || role === 'owner');
    console.log("User role check:", role, "Has admin permissions:", hasAdminRole);
    setHasPermissionToCreate(hasAdminRole);
  };

  // Effect to check permissions when selected church changes
  useEffect(() => {
    checkPermissions();
  }, [selectedChurchId, userChurches]);

  // Fetch Bible studies for the selected church
  const fetchBibleStudies = async (): Promise<void> => {
    if (!user || !selectedChurchId) {
      setBibleStudies([]);
      setFilteredBibleStudies([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch Bible studies for the selected church
      const { data, error } = await supabase
        .from("bible_study_times")
        .select("*")
        .eq("church_id", selectedChurchId)
        .order("date", { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Transform Bible study data to include additional fields
        const enhancedData: BibleStudy[] = await Promise.all(data.map(async (study) => {
          return {
            ...study,
            description: study.description || "Bible Study", // Use description as the main identifier
            location: study.location || "Church Main Hall",
            is_recurring: study.is_recurring || false
          };
        }));
        
        setBibleStudies(enhancedData);
        // Initial filtering based on active tab
        const today = new Date();
        const filtered = enhancedData.filter((study) => {
          const studyDate = new Date(study.date);
          const isPast = studyDate < today;
          return activeTabs === 'upcoming' ? !isPast : isPast;
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
    if (!user || !selectedChurchId) {
      Alert.alert(
        "Sign In Required", 
        "Please sign in and select a church to create Bible studies."
      );
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can create Bible studies. Contact your church administrator for access."
      );
      return;
    }
    
    console.log("Navigating to create Bible study page");
    router.push({
      pathname: "/createbiblestudypage",
      params: { church_id: selectedChurchId }
    } as any);
  };

  // Handle Bible study click
  const handleBibleStudyClick = (study: BibleStudy): void => {
    router.push({
      pathname: "/biblestudydetailpage",
      params: { bibleStudyId: study.id }
    } as any);
  };

  // Handle edit Bible study
  const handleEditBibleStudy = (study: BibleStudy): void => {
    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can edit Bible studies."
      );
      return;
    }
    
    router.push({
      pathname: "/createbiblestudypage",
      params: { bibleStudyId: study.id }
    } as any);
  };

  // Get Bible study icon and color based on description
  const getBibleStudyIconAndColor = (study: BibleStudy): IconAndColor => {
    // Default to Bible icon if no description
    const description = (study.description?.toLowerCase() || '');
    
    if (description.includes("genesis") || description.includes("exodus") || description.includes("leviticus")) {
      return { icon: "book-open", color: theme.accent1 }; // Muted gold for Old Testament
    } else if (description.includes("matthew") || description.includes("mark") || description.includes("luke") || description.includes("john")) {
      return { icon: "book", color: theme.accent2 }; // Muted rust for Gospels
    } else if (description.includes("acts") || description.includes("romans") || description.includes("corinthians")) {
      return { icon: "file-text", color: theme.tertiary }; // Soft coral for New Testament
    } else if (description.includes("revelation") || description.includes("prophecy")) {
      return { icon: "sun", color: theme.accent4 }; // Warm amber for Revelation/Prophecy
    } else if (description.includes("prayer") || description.includes("worship")) {
      return { icon: "heart", color: theme.error }; // Dusty rose for Prayer/Worship
    } else if (description.includes("youth") || description.includes("teen") || description.includes("young")) {
      return { icon: "users", color: theme.secondary }; // Soft terracotta for Youth
    } else if (description.includes("women") || description.includes("men") || description.includes("group")) {
      return { icon: "users", color: theme.success }; // Sage green for Group Studies
    }
    return { icon: "book", color: theme.primary }; // Warm brown for default
  };

  // Helper function to handle null image URLs and ensure proper bucket URL
  const getImageUrl = (url: string | null): string => {
    if (!url) {
      return 'https://via.placeholder.com/400x200?text=Bible+Study';
    }
    
    // If the URL is already a full URL from the bible-images bucket, return it
    if (url.includes('bible-images')) {
      return url;
    }
    
    // If it's a path without the full URL, construct the URL
    if (!url.startsWith('http')) {
      // This assumes Supabase storage URLs follow this pattern
      const { data } = supabase.storage
        .from('bible-images')
        .getPublicUrl(url);
      return data.publicUrl;
    }
    
    return url;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
    const month = date.toLocaleString('default', { month: 'short' });
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
        <TouchableOpacity
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery("")}
        >
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
    const isCreator = user && item.created_by === user.id;
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
              <Feather name={icon as any} size={20} color="#FFFFFF" />
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
            {item.description || "Join us for Bible study as we explore the word of God together in community."}
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
      <StatusBar barStyle="dark-content" backgroundColor={PARCHMENT_BG} />
      
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
            <FontAwesome5 
              name="bible" 
              size={40}
              color={theme.primary}
            />
          </View>
          
          <Text style={styles.heroTitle}>Bible Study</Text>
          <Text style={styles.heroVerse}>"Your word is a lamp to my feet and a light to my path."</Text>
          <Text style={styles.verseReference}>Psalm 119:105</Text>
          
          {hasPermissionToCreate && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateBibleStudyClick}
            >
              <Text style={styles.createButtonText}>START NEW STUDY</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          <TouchableOpacity 
            style={[
              styles.filterTab, 
              activeTabs === 'upcoming' ? styles.filterTabActive : null
            ]}
            onPress={() => setActiveTabs('upcoming')}
          >
            <Text style={[
              styles.filterTabText,
              activeTabs === 'upcoming' ? styles.filterTabTextActive : null
            ]}>
              UPCOMING
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterTab, 
              activeTabs === 'past' ? styles.filterTabActive : null
            ]}
            onPress={() => setActiveTabs('past')}
          >
            <Text style={[
              styles.filterTabText,
              activeTabs === 'past' ? styles.filterTabTextActive : null
            ]}>
              PAST
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Church Selection */}
        {userChurches.length > 0 && (
          <View style={styles.churchContainer}>
            <View style={styles.churchCard}>
              <Text style={styles.churchName}>{userChurches.find(c => c.id === selectedChurchId)?.name || 'Select a Church'}</Text>
              
              {/* Role badge */}
              {userChurches.find(c => c.id === selectedChurchId)?.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {userChurches.find(c => c.id === selectedChurchId)?.role.toUpperCase()}
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
                {userChurches.map(church => (
                  <TouchableOpacity
                    key={church.id}
                    style={[
                      styles.churchOption,
                      selectedChurchId === church.id ? styles.churchOptionActive : null
                    ]}
                    onPress={() => setSelectedChurchId(church.id)}
                  >
                    <Text style={[
                      styles.churchOptionText,
                      selectedChurchId === church.id ? styles.churchOptionTextActive : null
                    ]}>
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
              <FontAwesome5 name="bible" size={50} color={theme.neutral300} />
              <Text style={styles.emptyStateTitle}>No Bible studies found</Text>
              <Text style={styles.emptyStateMessage}>
                {searchQuery ? "Try a different search term" : 
                  activeTabs === 'upcoming' ?
                  (hasPermissionToCreate ? "Add your first Bible study by tapping the button above" :
                  "There are no upcoming Bible studies for this church") :
                  "No past Bible studies are available"}
              </Text>
            </View>
          ) : (
            filteredBibleStudies.map(item => renderBibleStudyCard({ item }))
          )}
        </View>
      </ScrollView>
      
      {/* Add refresh button before search toggle button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={handleManualRefresh}
      >
        <Feather name="refresh-cw" size={22} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Search toggle button */}
      <TouchableOpacity
        style={styles.searchToggleButton}
        onPress={() => setShowSearch(!showSearch)}
      >
        <Feather name={showSearch ? "x" : "search"} size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

// Clean, minimalist styles with parchment theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PARCHMENT_BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  bookIconContainer: {
    width: 60,
    height: 60,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: theme.fontBold,
    color: theme.neutral900,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  heroVerse: {
    fontSize: 18,
    fontStyle: 'italic',
    color: theme.neutral700,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    paddingHorizontal: 20,
  },
  verseReference: {
    fontSize: 14,
    color: theme.neutral600,
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 250,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  
  // Filter Tabs
  filterTabsContainer: {
    flexDirection: 'row',
    backgroundColor: UNSELECTED_TAB_BG,
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 26,
  },
  filterTabActive: {
    backgroundColor: SELECTED_TAB_BG,
  },
  filterTabText: {
    fontWeight: theme.fontBold,
    color: theme.neutral500,
    letterSpacing: 1,
    fontSize: 14,
  },
  filterTabTextActive: {
    color: theme.neutral900,
  },
  
  // Church Selection
  churchContainer: {
    marginBottom: 20,
  },
  churchCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    ...theme.shadowLight,
  },
  churchName: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.neutral900,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
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
    borderColor: theme.divider,
  },
  churchOptionActive: {
    backgroundColor: theme.accent1,
    borderColor: theme.accent1,
  },
  churchOptionText: {
    color: theme.neutral600,
    fontWeight: theme.fontMedium,
  },
  churchOptionTextActive: {
    color: theme.neutral800,
    fontWeight: theme.fontBold,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
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
    color: theme.textDark,
  },
  clearSearchButton: {
    padding: 8,
  },
  searchToggleButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadowMedium,
  },
  
  // Bible Study Container
  bibleStudiesContainer: {
    marginBottom: 40,
  },
  
  // Loading State
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.textMedium,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  
  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 40,
    marginVertical: 20,
    ...theme.shadowLight,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: theme.textMedium,
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 22,
  },
  
  // Bible Study Card
  bibleStudyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    ...theme.shadowLight,
  },
  dateContainer: {
    width: 60,
    backgroundColor: theme.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  dateMonth: {
    fontSize: 12,
    color: theme.neutral600,
    fontWeight: theme.fontBold,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateDay: {
    fontSize: 20,
    color: theme.neutral800,
    fontWeight: theme.fontBold,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  studyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  studyTitle: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.neutral900,
    marginBottom: 2,
  },
  studyTime: {
    fontSize: 14,
    color: theme.neutral600,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.neutral700,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.neutral600,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.neutral100,
  },
  createdByText: {
    fontSize: 12,
    color: theme.neutral500,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.neutral100,
    borderRadius: 50,
  },
  editButtonText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: theme.fontSemiBold,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadowMedium,
  },
});

export default BibleStudySchedulePage;