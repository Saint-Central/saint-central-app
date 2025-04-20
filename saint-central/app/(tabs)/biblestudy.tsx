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
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AntDesign,
  MaterialCommunityIcons,
  Feather,
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
  created_by: string; // Text type, not UUID
  description: string;    
  location?: string;    
  is_recurring?: boolean;
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
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(theme.pageBg);
      StatusBar.setTranslucent(false);
    }
  }, []);
  
  const router = useRouter();
  const navigation = useNavigation<NavigationProp>();
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 60;
  const heroMaxHeight = 280;
  const churchSelectorHeight = 70;

  // Animated values for collapsible sections
  const heroHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [heroMaxHeight, 0],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const churchSelectorOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

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
      return (
        (study.description?.toLowerCase() || '').includes(searchTerm) ||
        (study.location?.toLowerCase() || '').includes(searchTerm) ||
        (study.created_by?.toLowerCase() || '').includes(searchTerm)
      );
    });
    setFilteredBibleStudies(filtered);
  }, [searchQuery, bibleStudies]);

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
        setFilteredBibleStudies(enhancedData);
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
    // Ensure we're routing to the CreateBibleStudyPage component
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
      // Update this URL structure based on your Supabase configuration
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

  // Render Bible study card
  const renderBibleStudyCard = ({ item }: { item: BibleStudy }): React.ReactNode => {
    const { icon, color } = getBibleStudyIconAndColor(item);
    const studyDate = new Date(item.date);
    const isPastStudy = studyDate < new Date();
    const isCreator = user && item.created_by === user.id;
    const canEdit = hasPermissionToCreate || isCreator;
    
    return (
      <View
        key={item.id}
        style={[
          styles.bibleStudyCard, 
          { borderLeftColor: color },
          isPastStudy && styles.pastBibleStudyCard
        ]}
      >
        {/* Image at the top of the card */}
        {item.image && (
          <View style={styles.bibleStudyImageContainer}>
            <Image
              source={{ uri: getImageUrl(item.image) }}
              style={styles.bibleStudyImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(45, 36, 31, 0.7)']}
              style={styles.imageGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
        )}
        
        <View style={styles.bibleStudyContent}>
          {/* Header is clickable for navigation */}
          <TouchableOpacity 
            style={styles.bibleStudyHeader}
            onPress={() => handleBibleStudyClick(item)}
          >
            <View style={[styles.bibleStudyIconContainer, { backgroundColor: color }]}>
              <Feather name={icon as any} size={20} color={theme.textWhite} />
            </View>
            <View style={styles.bibleStudyTitleContainer}>
              <Text style={styles.bibleStudyTitle} numberOfLines={1}>
                {item.description || 'Bible Study'}
              </Text>
              <View style={styles.bibleStudyTimeLocationContainer}>
                <View style={styles.dateTimeRow}>
                  <Feather name="calendar" size={14} color={theme.textMedium} style={styles.smallIcon} />
                  <Text style={styles.bibleStudyDateTime}>
                    {formatDate(item.date)} • {formatTime(item.time)}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color={theme.textMedium} style={styles.smallIcon} />
                  <Text style={styles.bibleStudyLocation} numberOfLines={1} ellipsizeMode="tail">
                    {item.location || "Church Main Hall"}
                  </Text>
                  <Text style={styles.creatorName}>
                    • Created by {item.created_by || "Unknown"}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>About this study:</Text>
            <Text style={styles.bibleStudyDescription} numberOfLines={4}>
              {item.location || "Join us for a time of Bible study and fellowship. All are welcome to participate as we grow together in faith and knowledge."}
            </Text>
          </View>
          
          {/* Action Row - Edit button only */}
          {canEdit && (
            <View style={styles.bibleStudyActionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editActionButton]}
                onPress={() => handleEditBibleStudy(item)}
              >
                <Feather name="edit-2" size={16} color={theme.primary} />
                <Text style={[styles.actionButtonText, styles.editActionText]}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bible Study</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Feather name={showSearch ? "x" : "search"} size={22} color={theme.textDark} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={onRefresh}
            >
              <Feather name="refresh-cw" size={22} color={theme.textDark} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search Bar (conditionally shown) */}
        {showSearch && renderSearchBar()}
      </SafeAreaView>
      
      {/* Main Scrollable Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        decelerationRate="normal"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Collapsible Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            { 
              transform: [{ scaleY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              })}],
              opacity: scrollY.interpolate({
                inputRange: [0, 80],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              }),
              height: heroMaxHeight,
              overflow: 'hidden'
            },
          ]}
        >
          <LinearGradient
            colors={theme.gradientWarm} // Warm gradient
            style={styles.heroBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <Feather name="book-open" size={36} color={theme.textWhite} />
            </View>
            <Text style={styles.heroTitle}>Bible Study Schedule</Text>
            <Text style={styles.heroSubtitle}>
              Join us to study God's word and grow in faith together
            </Text>
            {hasPermissionToCreate && (
              <TouchableOpacity
                style={styles.addBibleStudyButton}
                onPress={handleCreateBibleStudyClick}
                activeOpacity={0.8}
              >
                <Text style={styles.addBibleStudyButtonText}>CREATE BIBLE STUDY</Text>
                <AntDesign name="plus" size={18} color={theme.textWhite} />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Collapsible Church Selector */}
        {userChurches.length > 0 && (
          <Animated.View style={[
            styles.churchSelectorContainer,
            { 
              opacity: scrollY.interpolate({
                inputRange: [0, 60],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              }),
              transform: [{ scaleY: scrollY.interpolate({
                inputRange: [0, 80],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              })}],
              height: churchSelectorHeight,
              overflow: 'hidden'
            }
          ]}>
            <Text style={styles.selectorLabel}>My Churches:</Text>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.churchSelector}
            >
              {userChurches.map(church => (
                <TouchableOpacity
                  key={church.id}
                  style={[
                    styles.churchOption,
                    selectedChurchId === church.id && styles.churchOptionActive
                  ]}
                  onPress={() => setSelectedChurchId(church.id)}
                >
                  <Text style={[
                    styles.churchOptionText,
                    selectedChurchId === church.id && styles.churchOptionTextActive
                  ]}>
                    {church.name}
                    {church.role === 'admin' || church.role === 'owner' ? 
                      ` (${church.role})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContainer}>
          {/* Bible Studies List */}
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading Bible studies...</Text>
              </View>
            ) : filteredBibleStudies.length === 0 ? (
              <View style={styles.noBibleStudiesContainer}>
                <Feather name="book-open" size={50} color={theme.textLight} />
                <Text style={styles.noBibleStudiesText}>No Bible studies found</Text>
                <Text style={styles.noBibleStudiesSubtext}>
                  {searchQuery ? "Try a different search term" : 
                   hasPermissionToCreate ? "Add your first Bible study by tapping the button above" :
                   "There are no upcoming Bible studies for this church"}
                </Text>
              </View>
            ) : (
              <>
                {filteredBibleStudies.map(item => renderBibleStudyCard({ item }))}
              </>
            )}
          </View>
          
          {/* Add some bottom padding for better scrolling experience */}
          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>
    </View>
  );
};

// Styles definition
const styles = StyleSheet.create({
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: theme.radiusMedium,
    paddingHorizontal: theme.spacingS,
    paddingVertical: 2,
    marginLeft: theme.spacingS,
  },
  recurringIcon: {
    marginRight: 2,
  },
  recurringText: {
    color: theme.textWhite,
    fontSize: 10,
    fontWeight: theme.fontSemiBold,
  },
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  safeArea: {
    backgroundColor: theme.pageBg,
    zIndex: 1,
  },
  header: {
    paddingVertical: theme.spacingL,
    paddingHorizontal: theme.spacingXL,
    backgroundColor: theme.pageBg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 0,
    paddingBottom: 80,
  },
  heroSection: {
    marginHorizontal: theme.spacingXL,
    marginVertical: theme.spacingL,
    borderRadius: theme.radiusLarge,
    overflow: 'hidden',
    ...theme.shadowMedium,
  },
  mainContainer: {
    backgroundColor: theme.pageBg,
  },
  // Header
  headerTitle: {
    fontSize: 26,
    fontWeight: theme.fontBold,
    color: theme.textDark,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.pageBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacingS,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacingXL,
    marginTop: theme.spacingS,
    marginBottom: theme.spacingM,
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    paddingHorizontal: theme.spacingM,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  searchIcon: {
    marginRight: theme.spacingS,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: theme.textDark,
  },
  clearSearchButton: {
    padding: theme.spacingS,
  },
  // Hero Section
  heroBackground: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    textAlign: "center",
    marginBottom: theme.spacingS,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: theme.spacingXL,
    maxWidth: 300,
    lineHeight: 22,
  },
  // Add Bible Study Button
  addBibleStudyButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
    borderRadius: theme.radiusFull,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  addBibleStudyButtonText: {
    fontSize: 16,
    color: theme.textWhite,
    fontWeight: theme.fontBold,
    marginRight: 10,
  },
  // Church selector styles
  churchSelectorContainer: {
    marginVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
  },
  selectorLabel: {
    fontSize: 15,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
    marginBottom: theme.spacingS,
  },
  churchSelector: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  churchOption: {
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingS,
    backgroundColor: theme.pageBg,
    borderRadius: theme.radiusFull,
    marginRight: theme.spacingM,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  churchOptionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  churchOptionText: {
    color: theme.textMedium,
    fontWeight: theme.fontMedium,
  },
  churchOptionTextActive: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
  },
  // List View
  listContainer: {
    paddingHorizontal: theme.spacingXL,
    paddingTop: theme.spacingM,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.textMedium,
  },
  noBibleStudiesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    padding: 30,
    marginVertical: 20,
    ...theme.shadowLight,
  },
  noBibleStudiesText: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  noBibleStudiesSubtext: {
    fontSize: 14,
    color: theme.textMedium,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  // Bible Study Cards
  bibleStudyCard: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    marginBottom: 20,
    ...theme.shadowMedium,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  bibleStudyContent: {
    padding: theme.spacingL,
  },
  pastBibleStudyCard: {
    opacity: 0.8,
  },
  bibleStudyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bibleStudyIconContainer: {
    width: 42,
    height: 42,
    borderRadius: theme.radiusMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacingM,
  },
  bibleStudyTitleContainer: {
    flex: 1,
  },
  bibleStudyTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: 4,
  },
  bibleStudyTimeLocationContainer: {
    flexDirection: 'column',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  smallIcon: {
    marginRight: 4,
  },
  bibleStudyDateTime: {
    fontSize: 14,
    color: theme.textMedium,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bibleStudyLocation: {
    fontSize: 14,
    color: theme.textMedium,
  },
  creatorName: {
    fontSize: 12,
    color: theme.textLight,
    marginLeft: 4,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  // Updated description styles
  descriptionContainer: {
    backgroundColor: theme.neutral100, // Warm light background
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    marginTop: theme.spacingL,
    marginBottom: theme.spacingM,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
    color: theme.primary,
    marginBottom: 6,
  },
  bibleStudyDescription: {
    fontSize: 16,
    color: theme.textDark,
    lineHeight: 24,
  },
  // Image styles
  bibleStudyImageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  bibleStudyImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  // Bible Study Action Row
  bibleStudyActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: theme.spacingL,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
    borderRadius: theme.radiusFull,
    marginLeft: theme.spacingS,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
    marginLeft: 6,
  },
  editActionButton: {
    backgroundColor: theme.neutral100,
  },
  editActionText: {
    color: theme.primary,
  }
});

export default BibleStudySchedulePage;