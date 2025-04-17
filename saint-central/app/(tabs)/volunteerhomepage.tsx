import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import {
  AntDesign,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
  Ionicons,
  MaterialIcons
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';

const { width, height } = Dimensions.get('window');

// Define navigation types
export type RootStackParamList = {
  'createvolunteerpage': { volunteerId?: string };  // Optional volunteerId for editing
  'volunteersbackendpage': { volunteerId: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define types based on schema
export type Volunteer = {
  id: string;
  volunteer_id?: number;
  time: string;
  location: string;
  host: string;
  description: string;
  image_url?: string;
  church_id: string;
  created_at: string;
};

// User church role interface
type UserChurch = {
  id: string;
  name: string;
  role: string;
};

// Enrollment type to track user enrollments
type Enrollment = {
  id: string;
  volunteer_id: string;
  user_id: string;
};

// Modern color theme with spiritual tones - UPDATED WITH RED THEME
const THEME = {
  primary: "#2D3748",        // Dark slate for text
  secondary: "#4A5568",      // Medium slate for secondary text
  light: "#A0AEC0",          // Light slate for tertiary text
  background: "#F7FAFC",     // Light background
  card: "#FFFFFF",           // White cards
  accent1: "#FEF2F2",        // Light red accent (updated)
  accent2: "#E6FFFA",        // Light teal accent
  accent3: "#FEFCBF",        // Light yellow accent
  accent4: "#FEE2E2",        // Light red accent
  border: "#E2E8F0",         // Light borders
  buttonPrimary: "#E53E3E",  // Red for primary buttons (was purple)
  buttonSecondary: "#C53030", // Darker red for secondary actions (was indigo)
  buttonText: "#FFFFFF",     // White text on buttons
  error: "#E53E3E",          // Error red
  success: "#38A169",        // Success green
  warning: "#DD6B20",        // Warning orange
  shadow: "rgba(0, 0, 0, 0.1)" // Shadow color
};

const VolunteerHomePage: React.FC = () => {
  // Configure status bar on component mount
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(THEME.background);
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

  const churchSelectorHeight2 = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [churchSelectorHeight, 0],
    extrapolate: 'clamp',
  });

  // State variables
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<Enrollment[]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
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

  // Update filtered volunteers when volunteers or search query changes
  useEffect(() => {
    const filteredVolunteers = volunteers.filter((volunteer) => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        (volunteer.description?.toLowerCase() || '').includes(searchTerm) ||
        (volunteer.location?.toLowerCase() || '').includes(searchTerm) ||
        (volunteer.host?.toLowerCase() || '').includes(searchTerm)
      );
    });
    setFilteredVolunteers(filteredVolunteers);
  }, [searchQuery, volunteers]);

  // Load volunteers when church selection changes
  useEffect(() => {
    if (selectedChurchId) {
      fetchVolunteers();
      checkPermissions();
    }
  }, [selectedChurchId]);

  // Fetch user's churches with role information
  const fetchUserChurches = async () => {
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

  // Fetch user's enrollments
  const fetchUserEnrollments = async () => {
    if (!user) return;
    
    try {
      // Get all enrollments for the current user
      const { data, error } = await supabase
        .from('volunteer_enrollment')
        .select('id, volunteer_id, user_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (data) {
        setUserEnrollments(data);
        console.log(`Fetched ${data.length} enrollments for user ${user.id}`);
      }
    } catch (error) {
      console.error("Error fetching user enrollments:", error);
    }
  };

  // Check if user has permission to create/edit volunteer opportunities
  const checkPermissions = () => {
    if (!user || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }
    
    // Find the user's role in the selected church
    const church = userChurches.find(c => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || '';
    
    // Only admin or owner roles can create/edit volunteer opportunities
    const hasAdminRole = (role === 'admin' || role === 'owner');
    console.log("User role check:", role, "Has admin permissions:", hasAdminRole);
    setHasPermissionToCreate(hasAdminRole);
  };

  // Effect to check permissions when selected church changes
  useEffect(() => {
    checkPermissions();
  }, [selectedChurchId, userChurches]);

  // Fetch volunteers for the selected church
  const fetchVolunteers = async () => {
    if (!user || !selectedChurchId) {
      setVolunteers([]);
      setFilteredVolunteers([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch volunteers for the selected church
      const { data, error } = await supabase
        .from("volunteer")
        .select("*")
        .eq("church_id", selectedChurchId)
        .order("time", { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setVolunteers(data);
        setFilteredVolunteers(data);
        console.log(`Fetched ${data.length} volunteer opportunities for church ${selectedChurchId}`);
        
        // After fetching volunteers, fetch user enrollments
        await fetchUserEnrollments();
      }
    } catch (error) {
      console.error("Error fetching volunteers:", error);
      Alert.alert("Error", "Failed to load church volunteer opportunities");
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVolunteers();
    setRefreshing(false);
  };

  // Check if user is enrolled in a volunteer opportunity
  const isUserEnrolled = (volunteerId: string): boolean => {
    return userEnrollments.some(enrollment => enrollment.volunteer_id === volunteerId);
  };

  // Handle enrolling in a volunteer opportunity
  const handleEnroll = async (volunteerId: string) => {
    if (!user) {
      setErrorMessage('Please sign in to volunteer');
      return;
    }

    setEnrollingId(volunteerId);
    setErrorMessage(null);

    try {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('volunteer_enrollment')
        .select('*')
        .eq('user_id', user.id)
        .eq('volunteer_id', volunteerId)
        .single();

      if (existingEnrollment) {
        setErrorMessage('You are already signed up for this opportunity');
        setEnrollingId(null);
        return;
      }

      // Add new enrollment
      const { error } = await supabase.from('volunteer_enrollment').insert([
        {
          user_id: user.id,
          volunteer_id: volunteerId,
          enrollment_date: new Date().toISOString(),
          hide_email: true,
          hide_phone: true,
          hide_name: false,
        },
      ]);

      if (error) {
        throw error;
      }

      // Refresh enrollments to update UI
      await fetchUserEnrollments();
      Alert.alert('Success', 'Successfully signed up for the volunteer opportunity!');
    } catch (error) {
      console.error('Error signing up for volunteer opportunity:', error);
      setErrorMessage('Failed to sign up. Please try again.');
    } finally {
      setEnrollingId(null);
    }
  };

  // Handle leaving a volunteer opportunity
  const handleLeave = async (volunteerId: string) => {
    if (!user) {
      setErrorMessage('Please sign in to leave volunteer opportunities');
      return;
    }

    setLeavingId(volunteerId);
    setErrorMessage(null);

    try {
      // Find the enrollment to delete
      const enrollment = userEnrollments.find(e => e.volunteer_id === volunteerId);
      
      if (!enrollment) {
        setErrorMessage('You are not signed up for this opportunity');
        setLeavingId(null);
        return;
      }

      // Delete the enrollment
      const { error } = await supabase
        .from('volunteer_enrollment')
        .delete()
        .eq('id', enrollment.id);

      if (error) {
        throw error;
      }

      // Refresh enrollments to update UI
      await fetchUserEnrollments();
      Alert.alert('Success', 'Successfully left the volunteer opportunity.');
    } catch (error) {
      console.error('Error leaving volunteer opportunity:', error);
      setErrorMessage('Failed to leave opportunity. Please try again.');
    } finally {
      setLeavingId(null);
    }
  };

  // Navigate to create volunteer page
  const handleCreateVolunteerClick = () => {
    if (!user || !selectedChurchId) {
      Alert.alert(
        "Sign In Required", 
        "Please sign in and select a church to create volunteer opportunities."
      );
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can create volunteer opportunities. Contact your church administrator for access."
      );
      return;
    }
    
    console.log("Navigating to create volunteer page");
    router.push({
      pathname: "/createvolunteerpage",
      params: {}
    });
  };

  // Handle volunteer click
  const handleVolunteerClick = (volunteer: Volunteer) => {
    if (!volunteer.volunteer_id) {
      // If no volunteer_id, navigate to backend page
      router.push({
        pathname: "/volunteersbackendpage",
        params: { volunteerId: volunteer.id }
      });
      return;
    }

    // If volunteer_id exists, handle normal volunteer navigation
    router.push({
      pathname: "/volunteerhomepage",
      params: { volunteerId: volunteer.volunteer_id }
    });
  };

  // Handle edit volunteer
  const handleEditVolunteer = (volunteer: Volunteer) => {
    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can edit volunteer opportunities."
      );
      return;
    }
    
    router.push({
      pathname: "/createvolunteerpage",
      params: { volunteerId: volunteer.id }
    });
  };

  // Get volunteer icon and color based on description
  const getVolunteerIconAndColor = (volunteer: Volunteer): { icon: string, color: string } => {
    // FIX: Added null/undefined check with optional chaining and empty string fallback
    const title = (volunteer.description?.toLowerCase() || '');
    
    if (title.includes("bible") || title.includes("study")) {
      return { icon: "book", color: "#4299E1" }; // Blue
    } else if (title.includes("sunday") || title.includes("service") || title.includes("worship")) {
      return { icon: "home", color: "#38B2AC" }; // Teal
    } else if (title.includes("youth") || title.includes("meetup") || title.includes("young")) {
      return { icon: "message-circle", color: "#ECC94B" }; // Yellow
    } else if (title.includes("prayer") || title.includes("breakfast")) {
      return { icon: "coffee", color: "#F56565" }; // Red
    } else if (title.includes("meeting") || title.includes("committee")) {
      return { icon: "users", color: "#9F7AEA" }; // Purple
    } else if (title.includes("music") || title.includes("choir") || title.includes("practice")) {
      return { icon: "music", color: "#ED8936" }; // Orange
    } else if (title.includes("volunteer") || title.includes("serve") || title.includes("outreach")) {
      return { icon: "heart", color: "#ED64A6" }; // Pink
    }
    return { icon: "calendar", color: "#718096" }; // Gray
  };

  // Helper function to handle null image URLs
  const getImageUrl = (url: string | null): string => {
    return url || 'https://via.placeholder.com/400x200?text=Church+Volunteer';
  };

  // Format date for display
  const formatDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Format time
  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render search bar
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Feather name="search" size={18} color={THEME.secondary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search volunteer opportunities..."
        placeholderTextColor={THEME.light}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery("")}
        >
          <Feather name="x" size={18} color={THEME.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Render volunteer card
  const renderVolunteerCard = ({ item }: { item: Volunteer }) => {
    const { icon, color } = getVolunteerIconAndColor(item);
    const volunteerTime = new Date(item.time);
    const isPastVolunteer = volunteerTime < new Date();
    const isCreator = user && item.created_at === user.id;
    const canEdit = hasPermissionToCreate || isCreator;
    const isEnrolled = isUserEnrolled(item.id);
    
    return (
      <View
        key={item.id.toString()}
        style={[
          styles.volunteerCard, 
          { borderLeftColor: color },
          isPastVolunteer && styles.pastVolunteerCard
        ]}
      >
        {/* Image now appears at the top of the card without navigation */}
        {item.image_url && (
          <View style={styles.volunteerImageContainer}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.volunteerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
          </View>
        )}
        
        <View style={styles.volunteerContent}>
          {/* Only the header is clickable for navigation */}
          <TouchableOpacity 
            style={styles.volunteerHeader}
            onPress={() => handleVolunteerClick(item)}
          >
            <View style={[styles.volunteerIconContainer, { backgroundColor: color }]}>
              <Feather name={icon as any} size={20} color="#fff" />
            </View>
            <View style={styles.volunteerTitleContainer}>
              <Text style={styles.volunteerTitle} numberOfLines={1}>
                {item.description || 'Untitled Opportunity'}
              </Text>
              <View style={styles.volunteerTimeLocationContainer}>
                <View style={styles.dateTimeRow}>
                  <Feather name="clock" size={14} color={THEME.secondary} style={styles.smallIcon} />
                  <Text style={styles.volunteerDateTime}>
                    {formatDate(item.time)} • {formatTime(item.time)}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color={THEME.secondary} style={styles.smallIcon} />
                  <Text style={styles.volunteerLocation} numberOfLines={1} ellipsizeMode="tail">
                    {item.location || "Location TBD"}
                  </Text>
                  <Text style={styles.hostName}>
                    • {item.host}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Description is no longer clickable for navigation */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>About this opportunity:</Text>
            <Text style={styles.volunteerDescription} numberOfLines={4}>
              {item.description}
            </Text>
          </View>
          
          <View style={styles.volunteerActionRow}>
            {canEdit && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editActionButton]}
                  onPress={() => handleEditVolunteer(item)}
                >
                  <Feather name="edit-2" size={16} color={THEME.buttonPrimary} />
                  <Text style={[styles.actionButtonText, styles.editActionText]}>Edit</Text>
                </TouchableOpacity>
              </>
            )}
            
            {isEnrolled ? (
              // Show Leave button if enrolled
              <TouchableOpacity
                onPress={() => handleLeave(item.id)}
                disabled={leavingId === item.id}
                style={[
                  styles.actionButton,
                  styles.leaveActionButton,
                  leavingId === item.id && styles.leaveActionButtonDisabled,
                ]}
              >
                {leavingId === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="user-minus" size={16} color={THEME.buttonText} />
                    <Text style={[styles.actionButtonText, styles.leaveActionText]}>Leave</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              // Show Signup button if not enrolled
              <TouchableOpacity
                onPress={() => handleEnroll(item.id)}
                disabled={enrollingId === item.id}
                style={[
                  styles.actionButton,
                  styles.enrollActionButton,
                  enrollingId === item.id && styles.enrollActionButtonDisabled,
                ]}
              >
                {enrollingId === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="user-plus" size={16} color={THEME.buttonText} />
                    <Text style={[styles.actionButtonText, styles.enrollActionText]}>Sign Up</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Removed ExpoStatusBar - using native StatusBar configuration instead */}
      
      {/* Fixed Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Church Volunteering</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Feather name={showSearch ? "x" : "search"} size={22} color={THEME.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={onRefresh}
            >
              <Feather name="refresh-cw" size={22} color={THEME.primary} />
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
            colors={['#E53E3E', '#C53030']} // Red gradient instead of purple
            style={styles.heroBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="hand-heart" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Faith Community Volunteering</Text>
            <Text style={styles.heroSubtitle}>
              Join our service opportunities and make a difference in our community
            </Text>
            <TouchableOpacity
              style={styles.addVolunteerButton}
              onPress={handleCreateVolunteerClick}
              activeOpacity={0.8}
            >
              <Text style={styles.addVolunteerButtonText}>CREATE OPPORTUNITY</Text>
              <AntDesign name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
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
          {/* Volunteers List */}
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.buttonPrimary} />
                <Text style={styles.loadingText}>Loading volunteer opportunities...</Text>
              </View>
            ) : filteredVolunteers.length === 0 ? (
              <View style={styles.noVolunteersContainer}>
                <Feather name="heart" size={50} color={THEME.light} />
                <Text style={styles.noVolunteersText}>No volunteer opportunities found</Text>
                <Text style={styles.noVolunteersSubtext}>
                  {searchQuery ? "Try a different search term" : 
                   hasPermissionToCreate ? "Add your first volunteer opportunity by tapping the button above" :
                   "There are no upcoming volunteer opportunities for this church"}
                </Text>
              </View>
            ) : (
              <>
                {filteredVolunteers.map(item => renderVolunteerCard({ item }))}
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    backgroundColor: THEME.background,
    zIndex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: THEME.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 0,
    paddingBottom: 80,
  },
  heroSection: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  mainContainer: {
    backgroundColor: THEME.background,
  },
  // Header
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: THEME.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: THEME.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: THEME.primary,
  },
  clearSearchButton: {
    padding: 8,
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
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 300,
    lineHeight: 22,
  },
  // Add Volunteer Button
  addVolunteerButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  addVolunteerButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
    marginRight: 10,
  },
  // Church selector styles
  churchSelectorContainer: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  selectorLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.primary,
    marginBottom: 8,
  },
  churchSelector: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  churchOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.background,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  churchOptionActive: {
    backgroundColor: THEME.buttonPrimary, // Red instead of purple
    borderColor: THEME.buttonPrimary,
  },
  churchOptionText: {
    color: THEME.secondary,
    fontWeight: "500",
  },
  churchOptionTextActive: {
    color: THEME.buttonText,
    fontWeight: "600",
  },
  // List View
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.secondary,
  },
  noVolunteersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 30,
    marginVertical: 20,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noVolunteersText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noVolunteersSubtext: {
    fontSize: 14,
    color: THEME.secondary,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  // Volunteer Cards
  volunteerCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    overflow: 'hidden', // This ensures the image stays within the rounded corners
  },
  volunteerContent: {
    padding: 16,
  },
  pastVolunteerCard: {
    opacity: 0.8,
  },
  volunteerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volunteerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  volunteerTitleContainer: {
    flex: 1,
  },
  volunteerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.primary,
    marginBottom: 4,
  },
  volunteerTimeLocationContainer: {
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
  volunteerDateTime: {
    fontSize: 14,
    color: THEME.secondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volunteerLocation: {
    fontSize: 14,
    color: THEME.secondary,
  },
  hostName: {
    fontSize: 12,
    color: THEME.light,
    marginLeft: 4,
  },
  // Updated description styles
  descriptionContainer: {
    backgroundColor: THEME.accent1, // Updated to light red background
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.buttonPrimary, // Red instead of purple
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.buttonPrimary, // Red instead of purple
    marginBottom: 6,
  },
  volunteerDescription: {
    fontSize: 16,
    color: THEME.primary,
    lineHeight: 24,
  },
  // Updated image styles
  volunteerImageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  volunteerImage: {
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
  // Volunteer Action Row
  volunteerActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  editActionButton: {
    backgroundColor: THEME.accent1, // Updated to light red
  },
  editActionText: {
    color: THEME.buttonPrimary, // Red instead of purple
  },
  enrollActionButton: {
    backgroundColor: THEME.success,
  },
  enrollActionButtonDisabled: {
    opacity: 0.7,
  },
  enrollActionText: {
    color: THEME.buttonText,
  },
  leaveActionButton: {
    backgroundColor: THEME.error,
  },
  leaveActionButtonDisabled: {
    opacity: 0.7,
  },
  leaveActionText: {
    color: THEME.buttonText,
  },
});

export default VolunteerHomePage;