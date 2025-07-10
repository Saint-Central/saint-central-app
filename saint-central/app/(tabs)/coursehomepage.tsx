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
  Platform,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Course } from "@/types/course";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import theme from "@/theme";

// Define navigation types
export type RootStackParamList = {
  createcoursepage: { courseId?: string }; // Optional courseId for editing
  coursesbackendpage: { courseId: number };
};

// Define types based on schema
// User church role interface
type UserChurch = {
  id: number;
  name: string;
  role: string;
};

// Enrollment type to track user enrollments
type Enrollment = {
  id: number;
  course_id: number;
  user_id: string;
};

// Use the consistent theme from theme.ts

const CourseHomePage: React.FC = () => {
  // Configure status bar on component mount
  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(theme.pageBg);
      StatusBar.setTranslucent(false);
    }
  }, []);

  const router = useRouter();
  const { user, loading: authLoading, session } = useAuth();
  const crud = useCRUD();
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroMaxHeight = 280;
  const churchSelectorHeight = 70;

  // State variables
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [hasPermissionToCreate, setHasPermissionToCreate] = useState(false);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<Enrollment[]>([]);

  // Fetch user's churches after user is loaded
  useEffect(() => {
    if (user && session && !authLoading) {
      fetchUserChurches();
    }
  }, [user, session, authLoading]);

  // Update filtered courses when courses or search query changes
  useEffect(() => {
    const filteredCourses = courses.filter((course) => {
      const searchTerm = searchQuery.toLowerCase();
      return (
        (course.description?.toLowerCase() || "").includes(searchTerm) ||
        (course.location?.toLowerCase() || "").includes(searchTerm) ||
        (course.host?.toLowerCase() || "").includes(searchTerm)
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
      const churchMembers = await crud.select("church_members", {
        where: { user_id: user.id },
      });

      if (churchMembers && churchMembers.length > 0) {
        // Fetch church details for each membership
        const churches: UserChurch[] = [];
        
        for (const member of churchMembers) {
          const church = await crud.selectOne("churches", {
            where: { id: member.church_id },
          });
          
          if (church) {
            churches.push({
              id: church.id,
              name: church.name,
              role: member.role,
            });
          }
        }

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

  // Fetch user's enrollments
  const fetchUserEnrollments = async () => {
    if (!user) return;

    try {
      // Get all enrollments for the current user
      const enrollments = await crud.select("course_enrollment", {
        where: { user_id: user.id },
      });

      if (enrollments) {
        setUserEnrollments(enrollments);
        console.log(`Fetched ${enrollments.length} enrollments for user ${user.id}`);
      }
    } catch (error) {
      console.error("Error fetching user enrollments:", error);
    }
  };

  // Check if user has permission to create/edit courses
  const checkPermissions = () => {
    if (!user || !selectedChurchId) {
      setHasPermissionToCreate(false);
      return;
    }

    // Find the user's role in the selected church
    const church = userChurches.find((c) => c.id === selectedChurchId);
    const role = church?.role?.toLowerCase() || "";

    // Only admin or owner roles can create/edit courses
    const hasAdminRole = role === "admin" || role === "owner";
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
      const coursesData = await crud.select("courses", {
        where: { church_id: selectedChurchId },
      }) as Course[];

      if (coursesData) {
        setCourses(coursesData);
        setFilteredCourses(coursesData);
        console.log(`Fetched ${coursesData.length} courses for church ${selectedChurchId}`);

        // After fetching courses, fetch user enrollments
        await fetchUserEnrollments();
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

  // Check if user is enrolled in a course
  const isUserEnrolled = (courseId: number): boolean => {
    return userEnrollments.some((enrollment) => enrollment.course_id === courseId);
  };

  // Handle enrolling in a course
  const handleEnroll = async (courseId: number) => {
    if (!user) {
      setErrorMessage("Please sign in to enroll in courses");
      return;
    }

    setEnrollingId(courseId);
    setErrorMessage(null);

    try {
      // Check if already enrolled
      const existingEnrollments = await crud.select("course_enrollment", {
        where: {
          user_id: user.id,
          course_id: courseId,
        },
        limit: 1,
      });

      if (existingEnrollments && existingEnrollments.length > 0) {
        setErrorMessage("You are already enrolled in this course");
        setEnrollingId(null);
        return;
      }

      // Add new enrollment
      await crud.insert("course_enrollment", {
        user_id: user.id,
        course_id: courseId,
        enrollment_date: new Date().toISOString(),
        hide_email: true,
        hide_phone: true,
        hide_name: false,
      });

      // Refresh enrollments to update UI
      await fetchUserEnrollments();
      Alert.alert("Success", "Successfully enrolled in the course!");
    } catch (error) {
      console.error("Error enrolling in course:", error);
      setErrorMessage("Failed to enroll in course. Please try again.");
    } finally {
      setEnrollingId(null);
    }
  };

  // Handle leaving a course
  const handleLeave = async (courseId: number) => {
    if (!user) {
      setErrorMessage("Please sign in to leave courses");
      return;
    }

    setLeavingId(courseId);
    setErrorMessage(null);

    try {
      // Find the enrollment to delete
      const enrollment = userEnrollments.find((e) => e.course_id === courseId);

      if (!enrollment) {
        setErrorMessage("You are not enrolled in this course");
        setLeavingId(null);
        return;
      }

      // Delete the enrollment
      await crud.delete("course_enrollment", { id: enrollment.id });

      // Refresh enrollments to update UI
      await fetchUserEnrollments();
      Alert.alert("Success", "Successfully left the course.");
    } catch (error) {
      console.error("Error leaving course:", error);
      setErrorMessage("Failed to leave course. Please try again.");
    } finally {
      setLeavingId(null);
    }
  };

  // Navigate to create course page
  const handleCreateCourseClick = () => {
    if (!user || !selectedChurchId) {
      Alert.alert("Sign In Required", "Please sign in and select a church to create courses.");
      return;
    }

    if (!hasPermissionToCreate) {
      Alert.alert(
        "Permission Denied",
        "Only church admins and owners can create courses. Contact your church administrator for access.",
      );
      return;
    }

    console.log("Navigating to create course page");
    router.push({
      pathname: "/createcoursepage",
      params: {},
    });
  };

  // Handle course click
  const handleCourseClick = (course: Course) => {
    // Navigate to the new course detail page
    router.push({
      pathname: "/course/[id]",
      params: { id: course.id },
    });
  };

  // Handle edit course
  const handleEditCourse = (course: Course) => {
    if (!hasPermissionToCreate) {
      Alert.alert("Permission Denied", "Only church admins and owners can edit courses.");
      return;
    }

    router.push({
      pathname: "/createcoursepage",
      params: { courseId: course.id },
    });
  };

  // Get course icon and color based on description
  const getCourseIconAndColor = (course: Course): { icon: string; color: string } => {
    // FIX: Added null/undefined check with optional chaining and empty string fallback
    const title = course.description?.toLowerCase() || "";

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
    } else if (
      title.includes("volunteer") ||
      title.includes("serve") ||
      title.includes("outreach")
    ) {
      return { icon: "heart", color: "#ED64A6" }; // Pink
    }
    return { icon: "calendar", color: "#718096" }; // Gray
  };

  // Helper function to handle null image URLs
  const getImageUrl = (url: string | null): string => {
    return url || "https://via.placeholder.com/400x200?text=Church+Course";
  };

  // Format date for display
  const formatDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // This function is no longer used since search is handled in the main JSX

  // Render modern course card
  const renderCourseCard = ({ item }: { item: Course }) => {
    const { icon, color } = getCourseIconAndColor(item);
    const courseTime = new Date(item.time);
    const isPastCourse = courseTime < new Date();
    const isCreator = user && item.user_id === user.id;
    const canEdit = hasPermissionToCreate || isCreator;
    const isEnrolled = isUserEnrolled(item.id);

    return (
      <TouchableOpacity
        key={item.id.toString()}
        style={[styles.modernCourseCard, isPastCourse && styles.pastCourseCard]}
        onPress={() => handleCourseClick(item)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.courseIcon, { backgroundColor: color }]}>
            <Feather name={icon as any} size={18} color={theme.textWhite} />
          </View>
          
          <View style={styles.cardHeaderContent}>
            <Text style={styles.modernCourseTitle} numberOfLines={2}>
              {item.description || "Untitled Course"}
            </Text>
            <Text style={styles.courseHost}>by {item.host}</Text>
          </View>

          {isEnrolled && (
            <View style={styles.enrolledBadge}>
              <Feather name="check" size={12} color={theme.success} />
            </View>
          )}
        </View>

        {item.image_url && (
          <View style={styles.modernImageContainer}>
            <Image source={{ uri: item.image_url }} style={styles.modernCourseImage} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.5)"]}
              style={styles.modernImageGradient}
            />
          </View>
        )}

        <View style={styles.modernCourseInfo}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Feather name="calendar" size={14} color={theme.textLight} />
              <Text style={styles.infoText}>{formatDate(item.time)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="clock" size={14} color={theme.textLight} />
              <Text style={styles.infoText}>{formatTime(item.time)}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Feather name="map-pin" size={14} color={theme.textLight} />
              <Text style={styles.infoText} numberOfLines={1}>{item.location || "TBD"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.modernCardActions}>
          {canEdit && (
            <View style={styles.adminActionsRow}>
              <TouchableOpacity
                style={styles.modernActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditCourse(item);
                }}
              >
                <Feather name="edit-2" size={16} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modernActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push({
                    pathname: "/course-admin/[id]",
                    params: { id: item.id },
                  });
                }}
              >
                <Feather name="users" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}

          {isEnrolled ? (
            <TouchableOpacity
              style={styles.modernLeaveButton}
              onPress={(e) => {
                e.stopPropagation();
                handleLeave(item.id);
              }}
              disabled={leavingId === item.id}
            >
              {leavingId === item.id ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <Text style={styles.leaveButtonText}>Leave</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.modernEnrollButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEnroll(item.id);
              }}
              disabled={enrollingId === item.id}
            >
              {enrollingId === item.id ? (
                <ActivityIndicator size="small" color={theme.textWhite} />
              ) : (
                <Text style={styles.modernEnrollText}>Enroll</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.pageBg} />
      
      {/* Modern Header */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.modernHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.textWhite} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Courses</Text>
            <Text style={styles.headerSubtitle}>{filteredCourses.length} available</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => router.push("/my-enrollments")}
            >
              <Feather name="bookmark" size={20} color={theme.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Feather name="search" size={20} color={theme.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchSection}>
          <View style={styles.modernSearchBar}>
            <Feather name="search" size={18} color={theme.textLight} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search courses..."
              placeholderTextColor={theme.textLight}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={18} color={theme.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Church Selector Pills */}
      {userChurches.length > 0 && (
        <View style={styles.churchSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.churchPills}
          >
            {userChurches.map((church) => (
              <TouchableOpacity
                key={church.id}
                style={[
                  styles.churchPill,
                  selectedChurchId === church.id && styles.churchPillActive,
                ]}
                onPress={() => setSelectedChurchId(church.id)}
              >
                <Text
                  style={[
                    styles.churchPillText,
                    selectedChurchId === church.id && styles.churchPillTextActive,
                  ]}
                >
                  {church.name}
                </Text>
                {(church.role === "admin" || church.role === "owner") && (
                  <View style={styles.adminBadge}>
                    <Feather name="star" size={10} color={theme.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userEnrollments.length}</Text>
          <Text style={styles.statLabel}>Enrolled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{filteredCourses.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        {hasPermissionToCreate && (
          <TouchableOpacity
            style={styles.createCard}
            onPress={handleCreateCourseClick}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color={theme.textWhite} />
            <Text style={styles.createLabel}>Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Course List */}
      <ScrollView
        style={styles.courseList}
        contentContainerStyle={styles.courseListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading || authLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>
              {authLoading ? "Authenticating..." : "Loading courses..."}
            </Text>
          </View>
        ) : !user || !session ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="lock" size={32} color={theme.textLight} />
            </View>
            <Text style={styles.emptyTitle}>Sign In Required</Text>
            <Text style={styles.emptySubtitle}>
              Please sign in to view and enroll in courses
            </Text>
          </View>
        ) : filteredCourses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="book-open" size={32} color={theme.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No Courses Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Try adjusting your search terms"
                : "No courses available at the moment"}
            </Text>
          </View>
        ) : (
          <>
            {filteredCourses.map((item) => renderCourseCard({ item }))}
            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

// Modern styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  safeArea: {
    backgroundColor: theme.pageBg,
  },
  
  // Modern header
  modernHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
    backgroundColor: theme.pageBg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: theme.cardBg,
  },
  headerContent: {
    flex: 1,
    marginLeft: theme.spacingM,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.textWhite,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textLight,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: theme.spacingS,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: theme.cardBg,
  },
  
  // Search section
  searchSection: {
    paddingHorizontal: theme.spacingL,
    paddingBottom: theme.spacingM,
  },
  modernSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    paddingHorizontal: theme.spacingM,
    height: 48,
    gap: theme.spacingM,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textWhite,
  },
  
  // Church pills
  churchSection: {
    paddingHorizontal: theme.spacingL,
    paddingBottom: theme.spacingM,
  },
  churchPills: {
    flexDirection: "row",
    gap: theme.spacingS,
    paddingVertical: theme.spacingS,
  },
  churchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingS,
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    gap: theme.spacingS,
  },
  churchPillActive: {
    backgroundColor: theme.primary,
  },
  churchPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.textMedium,
  },
  churchPillTextActive: {
    color: theme.textWhite,
    fontWeight: "600",
  },
  adminBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.cardBg,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Quick stats
  quickStats: {
    flexDirection: "row",
    paddingHorizontal: theme.spacingL,
    gap: theme.spacingM,
    marginBottom: theme.spacingM,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    padding: theme.spacingL,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.textWhite,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textLight,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  createCard: {
    backgroundColor: theme.primary,
    borderRadius: theme.radiusMedium,
    padding: theme.spacingL,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  createLabel: {
    fontSize: 12,
    color: theme.textWhite,
    marginTop: 4,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  
  // Course list
  courseList: {
    flex: 1,
  },
  courseListContent: {
    paddingHorizontal: theme.spacingL,
    gap: theme.spacingM,
  },
  
  // Loading and empty states
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: theme.textLight,
    marginTop: theme.spacingM,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: theme.spacingXL,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.cardBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacingL,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: theme.spacingS,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
    lineHeight: 24,
  },
  
  // Modern course cards
  modernCourseCard: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    ...theme.shadowMedium,
  },
  pastCourseCard: {
    opacity: 0.7,
  },
  
  // Card header
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacingL,
    paddingBottom: theme.spacingM,
  },
  courseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
  },
  cardHeaderContent: {
    flex: 1,
  },
  modernCourseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: 4,
    lineHeight: 24,
  },
  courseHost: {
    fontSize: 14,
    color: theme.textLight,
  },
  enrolledBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.cardBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.success,
  },
  
  // Modern image
  modernImageContainer: {
    height: 140,
    marginHorizontal: theme.spacingL,
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    marginBottom: theme.spacingM,
  },
  modernCourseImage: {
    width: "100%",
    height: "100%",
  },
  modernImageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  
  // Course info
  modernCourseInfo: {
    paddingHorizontal: theme.spacingL,
    paddingBottom: theme.spacingM,
    gap: theme.spacingS,
  },
  infoRow: {
    flexDirection: "row",
    gap: theme.spacingL,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacingS,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: theme.textMedium,
    flex: 1,
  },
  
  // Modern actions
  modernCardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingBottom: theme.spacingL,
  },
  adminActionsRow: {
    flexDirection: "row",
    gap: theme.spacingS,
  },
  modernActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.cardBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.primary,
  },
  modernEnrollButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
    borderRadius: 24,
    minWidth: 100,
    alignItems: "center",
  },
  modernEnrollText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
  },
  modernLeaveButton: {
    backgroundColor: "transparent",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.error,
    minWidth: 100,
    alignItems: "center",
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.error,
  },
});

export default CourseHomePage;
