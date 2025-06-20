import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { Course, CourseEnrollment } from "@/types/course";
import theme from "@/theme";

interface EnrolledCourse extends Course {
  enrollment: CourseEnrollment;
}

const MyEnrollmentsPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading, session } = useAuth();
  const crud = useCRUD();

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(theme.pageBg);
      StatusBar.setTranslucent(false);
    }
  }, []);

  useEffect(() => {
    if (user && session && !authLoading) {
      fetchEnrollments();
    }
  }, [user, session, authLoading]);

  const fetchEnrollments = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user's enrollments
      const enrollments = await crud.select<CourseEnrollment>("course_enrollment", {
        where: { user_id: user.id },
        orderBy: { enrollment_date: "desc" },
      });

      if (enrollments && enrollments.length > 0) {
        // Fetch course details for each enrollment
        const coursesWithEnrollment: EnrolledCourse[] = [];

        for (const enrollment of enrollments) {
          const course = await crud.selectOne<Course>("courses", {
            where: { id: enrollment.course_id },
          });

          if (course) {
            coursesWithEnrollment.push({
              ...course,
              enrollment,
            });
          }
        }

        setEnrolledCourses(coursesWithEnrollment);
      } else {
        setEnrolledCourses([]);
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEnrollments();
    setRefreshing(false);
  };

  const handleCoursePress = (courseId: number) => {
    router.push({
      pathname: "/course/[id]",
      params: { id: courseId },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getCourseStatus = (courseTime: string) => {
    const now = new Date();
    const courseDate = new Date(courseTime);
    const diffHours = (courseDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (courseDate < now) {
      return { text: "Past", color: theme.textLight };
    } else if (diffHours <= 24) {
      return { text: "Today", color: theme.primary };
    } else if (diffHours <= 48) {
      return { text: "Tomorrow", color: theme.secondary };
    } else {
      return { text: "Upcoming", color: theme.success };
    }
  };

  const renderCourseCard = (enrolledCourse: EnrolledCourse) => {
    const status = getCourseStatus(enrolledCourse.time);
    const isPast = status.text === "Past";

    return (
      <TouchableOpacity
        key={enrolledCourse.id}
        style={[styles.courseCard, isPast && styles.pastCourseCard]}
        onPress={() => handleCoursePress(enrolledCourse.id)}
        activeOpacity={0.8}
      >
        {enrolledCourse.image_url && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: enrolledCourse.image_url }}
              style={styles.courseImage}
              resizeMode="cover"
            />
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.text}</Text>
            </View>
          </View>
        )}

        <View style={styles.courseContent}>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {enrolledCourse.description}
          </Text>

          <View style={styles.detailRow}>
            <Feather name="calendar" size={16} color={theme.textLight} />
            <Text style={styles.detailText}>{formatDate(enrolledCourse.time)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="clock" size={16} color={theme.textLight} />
            <Text style={styles.detailText}>{formatTime(enrolledCourse.time)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="map-pin" size={16} color={theme.textLight} />
            <Text style={styles.detailText} numberOfLines={1}>
              {enrolledCourse.location}
            </Text>
          </View>

          <View style={styles.enrollmentInfo}>
            <Feather name="user-check" size={14} color={theme.primary} />
            <Text style={styles.enrollmentText}>
              Enrolled {formatDate(enrolledCourse.enrollment.enrollment_date)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/coursehomepage")} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={theme.textWhite} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Enrollments</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Feather name="refresh-cw" size={22} color={theme.textWhite} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{enrolledCourses.length}</Text>
              <Text style={styles.statLabel}>Total Courses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {enrolledCourses.filter((c) => getCourseStatus(c.time).text !== "Past").length}
              </Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {loading || authLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>
              {authLoading ? "Authenticating..." : "Loading your courses..."}
            </Text>
          </View>
        ) : !user || !session ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Feather name="user-x" size={64} color={theme.textLight} />
            </View>
            <Text style={styles.emptyTitle}>Authentication Required</Text>
            <Text style={styles.emptyText}>
              Please sign in to view your course enrollments
            </Text>
          </View>
        ) : enrolledCourses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Feather name="book-open" size={64} color={theme.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No Enrollments Yet</Text>
            <Text style={styles.emptyText}>
              You haven't enrolled in any courses yet. Browse available courses to get started!
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push("/coursehomepage")}
            >
              <Text style={styles.browseButtonText}>Browse Courses</Text>
              <Feather name="arrow-right" size={20} color={theme.textWhite} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {enrolledCourses.map(renderCourseCard)}
            <View style={{ height: 50 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  headerGradient: {
    paddingBottom: theme.spacingL,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingM,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.textWhite,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.textWhite,
  },
  statLabel: {
    fontSize: 14,
    color: theme.textWhite,
    opacity: 0.8,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.textWhite,
    opacity: 0.3,
    marginHorizontal: theme.spacingL,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacingM,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    color: theme.textLight,
    marginTop: theme.spacingM,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: theme.spacingXL,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.cardBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacingL,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: theme.spacingM,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
    marginBottom: theme.spacingXL,
    lineHeight: 24,
  },
  browseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
    borderRadius: theme.radiusMedium,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    marginRight: theme.spacingS,
  },
  courseCard: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    marginBottom: theme.spacingM,
    overflow: "hidden",
    ...theme.shadowLight,
  },
  pastCourseCard: {
    opacity: 0.6,
  },
  imageContainer: {
    height: 180,
    position: "relative",
  },
  courseImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: theme.spacingM,
    right: theme.spacingM,
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingS,
    borderRadius: theme.radiusSmall,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textWhite,
  },
  courseContent: {
    padding: theme.spacingL,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: theme.spacingM,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingS,
  },
  detailText: {
    fontSize: 14,
    color: theme.textMedium,
    marginLeft: theme.spacingS,
    flex: 1,
  },
  enrollmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacingM,
    paddingTop: theme.spacingM,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  enrollmentText: {
    fontSize: 12,
    color: theme.primary,
    marginLeft: theme.spacingS,
  },
});

export default MyEnrollmentsPage;