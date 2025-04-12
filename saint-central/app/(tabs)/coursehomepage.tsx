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
  'createcoursepage': { courseId?: string };  // Optional courseId for editing
  'coursesbackendpage': { courseId: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define types based on schema
export type Course = {
  id: string;
  course_id?: number;
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

// Modern color theme with spiritual tones (same as events page)
const THEME = {
  primary: "#2D3748",        // Dark slate for text
  secondary: "#4A5568",      // Medium slate for secondary text
  light: "#A0AEC0",          // Light slate for tertiary text
  background: "#F7FAFC",     // Light background
  card: "#FFFFFF",           // White cards
  accent1: "#EBF4FF",        // Light blue accent
  accent2: "#E6FFFA",        // Light teal accent
  accent3: "#FEFCBF",        // Light yellow accent
  accent4: "#FEE2E2",        // Light red accent
  border: "#E2E8F0",         // Light borders
  buttonPrimary: "#6B46C1",  // Purple for primary buttons
  buttonSecondary: "#4C51BF", // Indigo for secondary actions
  buttonText: "#FFFFFF",     // White text on buttons
  error: "#E53E3E",          // Error red
  success: "#38A169",        // Success green
  warning: "#DD6B20",        // Warning orange
  shadow: "rgba(0, 0, 0, 0.1)" // Shadow color
};

const CourseHomePage: React.FC = () => {
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
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

  // Update filtered courses when courses or search query changes
  useEffect(() => {
    const filteredCourses = courses.filter((course) => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        (course.description?.toLowerCase() || '').includes(searchTerm) ||
        (course.location?.toLowerCase() || '').includes(searchTerm) ||
        (course.host?.toLowerCase() || '').includes(searchTerm)
      );
    });
    setFilteredCourses(filteredCourses);
  }, [searchQuery, courses]);

  // Load courses when church selection changes
  useEffect(() => {
    if (selectedChurchId) {
      fetchCourses();
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

  // Check if user has permission to create/edit courses
  const checkPermissions = () => {
    if (!user || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }
    
    // Find the user's role in the selected church
    const church = userChurches.find(c => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || '';
    
    // Only admin or owner roles can create/edit courses
    const hasAdminRole = (role === 'admin' || role === 'owner');
    console.log("User role check:", role, "Has admin permissions:", hasAdminRole);
    setHasPermissionToCreate(hasAdminRole);
  };

  // Effect to check permissions when selected church changes
  useEffect(() => {
    checkPermissions();
  }, [selectedChurchId, userChurches]);

  // Fetch courses for the selected church
  const fetchCourses = async () => {
    if (!user || !selectedChurchId) {
      setCourses([]);
      setFilteredCourses([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch courses for the selected church
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("church_id", selectedChurchId)
        .order("time", { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setCourses(data);
        setFilteredCourses(data);
        console.log(`Fetched ${data.length} courses for church ${selectedChurchId}`);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      Alert.alert("Error", "Failed to load church courses");
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  // Handle enrolling in a course
  const handleEnroll = async (courseId: string) => {
    if (!user) {
      setErrorMessage('Please sign in to enroll in courses');
      return;
    }

    setEnrollingId(courseId);
    setErrorMessage(null);

    try {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from('course_enrollment')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (existingEnrollment) {
        setErrorMessage('You are already enrolled in this course');
        setEnrollingId(null);
        return;
      }

      // Add new enrollment
      const { error } = await supabase.from('course_enrollment').insert([
        {
          user_id: user.id,
          course_id: courseId,
          enrollment_date: new Date().toISOString(),
          hide_email: false,
          hide_phone: false,
          hide_name: false,
        },
      ]);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Successfully enrolled in the course!');
    } catch (error) {
      console.error('Error enrolling in course:', error);
      setErrorMessage('Failed to enroll in course. Please try again.');
    } finally {
      setEnrollingId(null);
    }
  };

  // Navigate to create course page
  const handleCreateCourseClick = () => {
    if (!user || !selectedChurchId) {
      Alert.alert(
        "Sign In Required", 
        "Please sign in and select a church to create courses."
      );
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can create courses. Contact your church administrator for access."
      );
      return;
    }
    
    console.log("Navigating to create course page");
    router.push({
      pathname: "/createcoursepage",
      params: {}
    });
  };

  // Handle course click
  const handleCourseClick = (course: Course) => {
    if (!course.course_id) {
      // If no course_id, navigate to backend page
      router.push({
        pathname: "/coursesbackendpage",
        params: { courseId: course.id }
      });
      return;
    }

    // If course_id exists, handle normal course navigation
    router.push({
      pathname: "/coursehomepage",
      params: { courseId: course.course_id }
    });
  };

  // Handle edit course
  const handleEditCourse = (course: Course) => {
    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied", 
        "Only church admins and owners can edit courses."
      );
      return;
    }
    
    router.push({
      pathname: "/createcoursepage",
      params: { courseId: course.id }
    });
  };

  // Get course icon and color based on description
  const getCourseIconAndColor = (course: Course): { icon: string, color: string } => {
    // FIX: Added null/undefined check with optional chaining and empty string fallback
    const title = (course.description?.toLowerCase() || '');
    
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
    return url || 'https://via.placeholder.com/400x200?text=Church+Course';
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
        placeholder="Search courses..."
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

  // Render course card
  const renderCourseCard = ({ item }: { item: Course }) => {
    const { icon, color } = getCourseIconAndColor(item);
    const courseTime = new Date(item.time);
    const isPastCourse = courseTime < new Date();
    const isCreator = user && item.created_at === user.id;
    const canEdit = hasPermissionToCreate || isCreator;
    
    return (
      <View
        key={item.id.toString()}
        style={[
          styles.courseCard, 
          { borderLeftColor: color },
          isPastCourse && styles.pastCourseCard
        ]}
      >
        {/* Image now appears at the top of the card without navigation */}
        {item.image_url && (
          <View style={styles.courseImageContainer}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.courseImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
          </View>
        )}
        
        <View style={styles.courseContent}>
          {/* Only the header is clickable for navigation */}
          <TouchableOpacity 
            style={styles.courseHeader}
            onPress={() => handleCourseClick(item)}
          >
            <View style={[styles.courseIconContainer, { backgroundColor: color }]}>
              <Feather name={icon as any} size={20} color="#fff" />
            </View>
            <View style={styles.courseTitleContainer}>
              <Text style={styles.courseTitle} numberOfLines={1}>
                {item.description || 'Untitled Course'}
              </Text>
              <View style={styles.courseTimeLocationContainer}>
                <View style={styles.dateTimeRow}>
                  <Feather name="clock" size={14} color={THEME.secondary} style={styles.smallIcon} />
                  <Text style={styles.courseDateTime}>
                    {formatDate(item.time)} • {formatTime(item.time)}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color={THEME.secondary} style={styles.smallIcon} />
                  <Text style={styles.courseLocation} numberOfLines={1} ellipsizeMode="tail">
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
            <Text style={styles.descriptionLabel}>About this course:</Text>
            <Text style={styles.courseDescription} numberOfLines={4}>
              {item.description}
            </Text>
          </View>
          
          <View style={styles.courseActionRow}>
            {canEdit && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editActionButton]}
                  onPress={() => handleEditCourse(item)}
                >
                  <Feather name="edit-2" size={16} color={THEME.buttonPrimary} />
                  <Text style={[styles.actionButtonText, styles.editActionText]}>Edit</Text>
                </TouchableOpacity>
              </>
            )}
            
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
                  <Text style={[styles.actionButtonText, styles.enrollActionText]}>Enroll</Text>
                </>
              )}
            </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Church Courses</Text>
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
            colors={['#6B46C1', '#4C51BF']}
            style={styles.heroBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="book-open-page-variant" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Faith Community Courses</Text>
            <Text style={styles.heroSubtitle}>
              Join our transformative Bible studies, workshops, and learning experiences
            </Text>
            <TouchableOpacity
              style={styles.addCourseButton}
              onPress={handleCreateCourseClick}
              activeOpacity={0.8}
            >
              <Text style={styles.addCourseButtonText}>CREATE COURSE</Text>
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
          {/* Courses List */}
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.buttonPrimary} />
                <Text style={styles.loadingText}>Loading church courses...</Text>
              </View>
            ) : filteredCourses.length === 0 ? (
              <View style={styles.noCoursesContainer}>
                <Feather name="book-open" size={50} color={THEME.light} />
                <Text style={styles.noCoursesText}>No church courses found</Text>
                <Text style={styles.noCoursesSubtext}>
                  {searchQuery ? "Try a different search term" : 
                   hasPermissionToCreate ? "Add your first church course by tapping the button above" :
                   "There are no upcoming courses for this church"}
                </Text>
              </View>
            ) : (
              <>
                {filteredCourses.map(item => renderCourseCard({ item }))}
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
  // Add Course Button
  addCourseButton: {
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
  addCourseButtonText: {
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
    backgroundColor: THEME.buttonPrimary,
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
  noCoursesContainer: {
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
  noCoursesText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noCoursesSubtext: {
    fontSize: 14,
    color: THEME.secondary,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  // Course Cards
  courseCard: {
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
  courseContent: {
    padding: 16,
  },
  pastCourseCard: {
    opacity: 0.8,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  courseTitleContainer: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.primary,
    marginBottom: 4,
  },
  courseTimeLocationContainer: {
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
  courseDateTime: {
    fontSize: 14,
    color: THEME.secondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseLocation: {
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
    backgroundColor: THEME.accent1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.buttonPrimary,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.buttonPrimary,
    marginBottom: 6,
  },
  courseDescription: {
    fontSize: 16,
    color: THEME.primary,
    lineHeight: 24,
  },
  // Updated image styles
  courseImageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  courseImage: {
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
  // Course Action Row
  courseActionRow: {
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
    backgroundColor: THEME.accent1,
  },
  editActionText: {
    color: THEME.buttonPrimary,
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
});

export default CourseHomePage;