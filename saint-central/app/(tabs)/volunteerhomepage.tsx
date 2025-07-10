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
import { useAuth } from '@/contexts/AuthContext';
import { useCRUD } from '@/utils/crudClient';
import theme from '@/theme';

const { width, height } = Dimensions.get('window');

// Define User type locally
type User = {
  id: string;
  email?: string;
  role: string;
  [key: string]: any;
};

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
  user_id: string;
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

const VolunteerHomePage: React.FC = () => {
  // Configure status bar on component mount
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
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

  // Auth and CRUD
  const { user, loading: authLoading } = useAuth();
  const crud = useCRUD();

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
      
      // Get churches where the user is a member with role information
      const churchMembers = await crud.select('church_members', {
        where: { user_id: user.id },
        select: '*'
      });

      if (churchMembers && churchMembers.length > 0) {
        // Get church details for each membership
        const churchPromises = churchMembers.map(async (member: any) => {
          const church = await crud.selectOne('churches', {
            where: { id: member.church_id },
            select: 'id, name'
          });
          return church ? {
            id: church.id,
            name: church.name,
            role: member.role
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
      const enrollments = await crud.select('volunteer_enrollment', {
        where: { user_id: user.id },
        select: 'id, volunteer_id, user_id'
      });
      
      if (enrollments) {
        setUserEnrollments(enrollments);
        console.log(`Fetched ${enrollments.length} enrollments for user ${user.id}`);
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
      const volunteerData = await crud.select('volunteer', {
        where: { church_id: selectedChurchId }
        // Temporarily removed order clause to debug the issue
      });
      
      if (volunteerData) {
        // Sort client-side by time in descending order (newest first)
        const sortedData = volunteerData.sort((a: Volunteer, b: Volunteer) => 
          new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        
        setVolunteers(sortedData);
        setFilteredVolunteers(sortedData);
        console.log(`Fetched ${sortedData.length} volunteer opportunities for church ${selectedChurchId}`);
        
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
      const existingEnrollment = await crud.selectOne('volunteer_enrollment', {
        where: { user_id: user.id, volunteer_id: volunteerId }
      });

      if (existingEnrollment) {
        setErrorMessage('You are already signed up for this opportunity');
        setEnrollingId(null);
        return;
      }

      // Add new enrollment
      await crud.insert('volunteer_enrollment', {
        user_id: user.id,
        volunteer_id: volunteerId,
        enrollment_date: new Date().toISOString(),
        hide_email: true,
        hide_phone: true,
        hide_name: false,
      });

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
      await crud.delete('volunteer_enrollment', { id: enrollment.id });

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
    const title = (volunteer.description?.toLowerCase() || '');
    
    if (title.includes("bible") || title.includes("study")) {
      return { icon: "book", color: theme.accent1 };
    } else if (title.includes("sunday") || title.includes("service") || title.includes("worship")) {
      return { icon: "home", color: theme.secondary };
    } else if (title.includes("youth") || title.includes("meetup") || title.includes("young")) {
      return { icon: "message-circle", color: theme.warning };
    } else if (title.includes("prayer") || title.includes("breakfast")) {
      return { icon: "coffee", color: theme.accent3 };
    } else if (title.includes("meeting") || title.includes("committee")) {
      return { icon: "users", color: theme.primary };
    } else if (title.includes("music") || title.includes("choir") || title.includes("practice")) {
      return { icon: "music", color: theme.accent1 };
    } else if (title.includes("volunteer") || title.includes("serve") || title.includes("outreach")) {
      return { icon: "heart", color: theme.error };
    }
    return { icon: "calendar", color: theme.neutral600 };
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
      <Feather name="search" size={18} color={theme.textMedium} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search volunteer opportunities..."
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

  // Render volunteer card
  const renderVolunteerCard = ({ item }: { item: Volunteer }) => {
    const { icon, color } = getVolunteerIconAndColor(item);
    const volunteerTime = new Date(item.time);
    const isPastVolunteer = volunteerTime < new Date();
    const isCreator = user && item.user_id === user.id;
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
                  <Feather name="clock" size={14} color={theme.textMedium} style={styles.smallIcon} />
                  <Text style={styles.volunteerDateTime}>
                    {formatDate(item.time)} • {formatTime(item.time)}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color={theme.textMedium} style={styles.smallIcon} />
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
                  <Feather name="edit-2" size={16} color={theme.primary} />
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
                    <Feather name="user-minus" size={16} color={theme.textWhite} />
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
                    <Feather name="user-plus" size={16} color={theme.textWhite} />
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
      {/* Fixed Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Church Volunteering</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Feather name={showSearch ? "x" : "search"} size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={onRefresh}
            >
              <Feather name="refresh-cw" size={22} color={theme.primary} />
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
            colors={theme.gradientPrimary}
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
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading volunteer opportunities...</Text>
              </View>
            ) : filteredVolunteers.length === 0 ? (
              <View style={styles.noVolunteersContainer}>
                <Feather name="heart" size={50} color={theme.textLight} />
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
    backgroundColor: theme.pageBg,
  },
  safeArea: {
    backgroundColor: theme.pageBg,
    zIndex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
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
    color: theme.textWhite,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.cardBg,
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
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: theme.textWhite,
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
    fontWeight: theme.fontBold,
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
    fontWeight: theme.fontBold,
    marginRight: 10,
  },
  // Church selector styles
  churchSelectorContainer: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  selectorLabel: {
    fontSize: 15,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: 8,
  },
  churchSelector: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  churchOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    marginRight: 10,
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
    color: theme.textMedium,
  },
  noVolunteersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    padding: 30,
    marginVertical: 20,
    ...theme.shadowLight,
  },
  noVolunteersText: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: 16,
    marginBottom: 8,
  },
  noVolunteersSubtext: {
    fontSize: 14,
    color: theme.textMedium,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  // Volunteer Cards
  volunteerCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    marginBottom: 20,
    ...theme.shadowMedium,
    borderLeftWidth: 4,
    overflow: 'hidden',
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
    fontWeight: theme.fontBold,
    color: theme.textWhite,
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
    color: theme.textMedium,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volunteerLocation: {
    fontSize: 14,
    color: theme.textMedium,
  },
  hostName: {
    fontSize: 12,
    color: theme.textLight,
    marginLeft: 4,
  },
  // Updated description styles
  descriptionContainer: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
    color: theme.primary,
    marginBottom: 6,
  },
  volunteerDescription: {
    fontSize: 16,
    color: theme.textWhite,
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
    fontWeight: theme.fontSemiBold,
    marginLeft: 6,
  },
  editActionButton: {
    backgroundColor: theme.cardBg,
  },
  editActionText: {
    color: theme.primary,
  },
  enrollActionButton: {
    backgroundColor: theme.success,
  },
  enrollActionButtonDisabled: {
    opacity: 0.7,
  },
  enrollActionText: {
    color: theme.textWhite,
  },
  leaveActionButton: {
    backgroundColor: theme.error,
  },
  leaveActionButtonDisabled: {
    opacity: 0.7,
  },
  leaveActionText: {
    color: theme.textWhite,
  },
});

export default VolunteerHomePage;