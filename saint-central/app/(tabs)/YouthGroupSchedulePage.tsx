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
import theme from '../../theme'; // Import the theme file

const { width, height } = Dimensions.get('window');

// Define navigation types
export type RootStackParamList = {
  'CreateYouthGroupPage': { youthGroupId?: string }; // Optional id for editing
  'youthgroupdetailpage': { youthGroupId: string };
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

// Background colors
const PARCHMENT_BG = '#F5F7FA'; // Light blue-tinted white
const CARD_BG = '#FFFFFF';      // White for cards
const SELECTED_TAB_BG = '#FFFFFF'; // White background for selected tab
const UNSELECTED_TAB_BG = 'rgba(120, 144, 156, 0.15)'; // Light version of neutral500

const YouthGroupSchedulePage: React.FC = () => {
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
  const [youthGroups, setYouthGroups] = useState<YouthGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [filteredYouthGroups, setFilteredYouthGroups] = useState<YouthGroup[]>([]);
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

  // Update filtered Youth Groups when Youth Groups or search query changes
  useEffect(() => {
    const filtered = youthGroups.filter((group: YouthGroup) => {
      const searchTerm = searchQuery.toLowerCase();
      const today = new Date();
      const groupDate = new Date(group.date);
      const isPast = groupDate < today;
      
      const matchesSearch = (
        (group.description?.toLowerCase() || '').includes(searchTerm) ||
        (group.location?.toLowerCase() || '').includes(searchTerm) ||
        (group.created_by?.toLowerCase() || '').includes(searchTerm)
      );
      
      // Filter by active tab
      return matchesSearch && (
        (activeTabs === 'upcoming' && !isPast) ||
        (activeTabs === 'past' && isPast)
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

  // Check if user has permission to create/edit Youth Groups
  const checkPermissions = (): void => {
    if (!user || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }
    
    // Find the user's role in the selected church
    const church = userChurches.find(c => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || '';
    
    // Only admin or owner roles can create/edit Youth Groups
    const hasAdminRole = (role === 'admin' || role === 'owner');
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
      
      // Fetch Youth Groups for the selected church
      const { data, error } = await supabase
        .from("youth_group_times")
        .select("*")
        .eq("church_id", selectedChurchId)
        .order("date", { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Transform Youth Group data to include additional fields
        const enhancedData: YouthGroup[] = await Promise.all(data.map(async (group) => {
          return {
            ...group,
            description: group.description || "Youth Group", // Use description as the main identifier
            location: group.location || "Church Youth Room",
            is_recurring: group.is_recurring || false
          };
        }));
        
        setYouthGroups(enhancedData);
        // Initial filtering based on active tab
        const today = new Date();
        const filtered = enhancedData.filter((group) => {
          const groupDate = new Date(group.date);
          const isPast = groupDate < today;
          return activeTabs === 'upcoming' ? !isPast : isPast;
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
      Alert.alert(
        "Sign In Required", 
        "Please sign in and select a church to create Youth Groups."
      );
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can create Youth Groups. Contact your church administrator for access."
      );
      return;
    }
    
    console.log("Navigating to create Youth Group page");
    router.push({
      pathname: "/CreateYouthGroupPage",
      params: { church_id: selectedChurchId }
    } as any);
  };

  // Handle Youth Group click
  const handleYouthGroupClick = (group: YouthGroup): void => {
    router.push({
      pathname: "/youthgroupdetailpage",
      params: { youthGroupId: group.id }
    } as any);
  };

  // Handle edit Youth Group
  const handleEditYouthGroup = (group: YouthGroup): void => {
    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can edit Youth Groups."
      );
      return;
    }
    
    router.push({
      pathname: "/(tabs)/CreateYouthGroupPage",
      params: { youthGroupId: group.id }
    });
  };

  // Get Youth Group icon and color based on description
  const getYouthGroupIconAndColor = (group: YouthGroup): IconAndColor => {
    // Default to users icon if no description
    const description = (group.description?.toLowerCase() || '');
    
    if (description.includes("worship") || description.includes("praise")) {
      return { icon: "music", color: theme.accent1 }; // Muted teal-blue for worship
    } else if (description.includes("games") || description.includes("fun") || description.includes("social")) {
      return { icon: "smile", color: theme.accent2 }; // Grey-blue for games/social
    } else if (description.includes("bible") || description.includes("study") || description.includes("lesson")) {
      return { icon: "book", color: theme.tertiary }; // Soft slate blue for Bible study
    } else if (description.includes("mission") || description.includes("outreach") || description.includes("service")) {
      return { icon: "heart", color: theme.accent4 }; // Soft powder blue for service/missions
    } else if (description.includes("prayer") || description.includes("devotion")) {
      return { icon: "sun", color: theme.error }; // Muted rose for Prayer/Devotions
    } else if (description.includes("teen") || description.includes("middle school")) {
      return { icon: "users", color: theme.secondary }; // Lighter blue-grey for Teens
    } else if (description.includes("camp") || description.includes("retreat") || description.includes("trip")) {
      return { icon: "map", color: theme.success }; // Sage with blue undertone for trips
    }
    return { icon: "users", color: theme.primary }; // Medium blue-grey for default
  };

  // Helper function to handle null image URLs and ensure proper bucket URL
  const getImageUrl = (url: string | null): string => {
    if (!url) {
      return 'https://via.placeholder.com/400x200?text=Youth+Group';
    }
    
    // If the URL is already a full URL from the youthgroup-images bucket, return it
    if (url.includes('youthgroup-images')) {
      return url;
    }
    
    // If it's a path without the full URL, construct the URL
    if (!url.startsWith('http')) {
      // This assumes Supabase storage URLs follow this pattern
      const { data } = supabase.storage
        .from('youthgroup-images')
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
    // Youth Group times might be stored differently, adjust as needed
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
        placeholder="Search Youth Groups..."
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
            <View style={[styles.groupIconContainer, { backgroundColor: theme.info }]}>
              <Feather name={icon as any} size={20} color="#FFFFFF" />
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
            {item.description || "Join us for Youth Group as we grow in faith and friendship together."}
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
        {/* Hero Section with Youth Icon and Verse */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <FontAwesome5 
              name="users" 
              size={40}
              color={theme.info}
            />
          </View>
          
          <Text style={styles.heroTitle}>Youth Group</Text>
          <Text style={styles.heroVerse}>"Don't let anyone look down on you because you are young, but set an example for the believers."</Text>
          <Text style={styles.verseReference}>1 Timothy 4:12</Text>
          
          {hasPermissionToCreate && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateYouthGroupClick}
            >
              <LinearGradient
                colors={['#6A89A3', '#4A6A83']}
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
                {searchQuery ? "Try a different search term" : 
                  activeTabs === 'upcoming' ?
                  (hasPermissionToCreate ? "Add your first Youth Group meeting by tapping the button above" :
                  "There are no upcoming Youth Group meetings for this church") :
                  "No past Youth Group meetings are available"}
              </Text>
            </View>
          ) : (
            filteredYouthGroups.map(item => renderYouthGroupCard({ item }))
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

// Clean, minimalist styles with blue-grey theme
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
  iconContainer: {
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
    minWidth: 250,
    borderRadius: 50,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: theme.info,
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
  
  // Youth Group Container
  youthGroupsContainer: {
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
  
  // Youth Group Card
  youthGroupCard: {
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
  groupIconContainer: {
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
  groupTitle: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.neutral900,
    marginBottom: 2,
  },
  groupTime: {
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

export default YouthGroupSchedulePage;