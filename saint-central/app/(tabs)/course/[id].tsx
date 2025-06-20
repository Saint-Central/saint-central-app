import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { Course, CourseEnrollment } from "@/types/course";
import theme from "@/theme";

const CourseDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading, session } = useAuth();
  const crud = useCRUD();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [hideEmail, setHideEmail] = useState(true);
  const [hidePhone, setHidePhone] = useState(true);
  const [hideName, setHideName] = useState(false);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(theme.primary);
    }
  }, []);

  useEffect(() => {
    if (id && user && session && !authLoading) {
      fetchCourseDetails();
    }
  }, [id, user, session, authLoading]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);

      // Fetch course details
      const courseData = await crud.selectOne<Course>("courses", {
        where: { id: Number(id) },
      });

      if (!courseData) {
        Alert.alert("Error", "Course not found");
        router.back();
        return;
      }

      setCourse(courseData);

      // Check if user is enrolled
      const enrollmentData = await crud.select<CourseEnrollment>("course_enrollment", {
        where: {
          user_id: user?.id,
          course_id: Number(id),
        },
        limit: 1,
      });

      if (enrollmentData && enrollmentData.length > 0) {
        setEnrollment(enrollmentData[0]);
        setHideEmail(enrollmentData[0].hide_email);
        setHidePhone(enrollmentData[0].hide_phone);
        setHideName(enrollmentData[0].hide_name);
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
      Alert.alert("Error", "Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user || !course) return;

    setEnrolling(true);
    try {
      await crud.insert("course_enrollment", {
        user_id: user.id,
        course_id: course.id,
        enrollment_date: new Date().toISOString(),
        hide_email: hideEmail,
        hide_phone: hidePhone,
        hide_name: hideName,
      });

      Alert.alert("Success", "Successfully enrolled in the course!");
      await fetchCourseDetails();
    } catch (error) {
      console.error("Error enrolling in course:", error);
      Alert.alert("Error", "Failed to enroll in course");
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!enrollment) return;

    Alert.alert(
      "Confirm Unenrollment",
      "Are you sure you want to leave this course?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Course",
          style: "destructive",
          onPress: async () => {
            try {
              await crud.delete("course_enrollment", { id: enrollment.id });
              Alert.alert("Success", "Successfully left the course");
              setEnrollment(null);
            } catch (error) {
              console.error("Error leaving course:", error);
              Alert.alert("Error", "Failed to leave course");
            }
          },
        },
      ]
    );
  };

  const updatePrivacySettings = async () => {
    if (!enrollment) return;

    try {
      await crud.update(
        "course_enrollment",
        {
          hide_email: hideEmail,
          hide_phone: hidePhone,
          hide_name: hideName,
        },
        { id: enrollment.id }
      );
    } catch (error) {
      console.error("Error updating privacy settings:", error);
    }
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

  if (loading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>
          {authLoading ? "Authenticating..." : "Loading course details..."}
        </Text>
      </View>
    );
  }

  if (!user || !session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Authentication Required</Text>
        <Text style={styles.errorText}>Please sign in to view course details</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Course not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/coursehomepage")} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {course.image_url && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: course.image_url }} style={styles.courseImage} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.imageGradient}
            />
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.courseTitle}>{course.description}</Text>

          <View style={styles.detailRow}>
            <Feather name="calendar" size={20} color={theme.secondary} />
            <Text style={styles.detailText}>{formatDate(course.time)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="clock" size={20} color={theme.secondary} />
            <Text style={styles.detailText}>{formatTime(course.time)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="map-pin" size={20} color={theme.secondary} />
            <Text style={styles.detailText}>{course.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="user" size={20} color={theme.secondary} />
            <Text style={styles.detailText}>Hosted by {course.host}</Text>
          </View>
        </View>

        {!enrollment ? (
          <View style={styles.enrollmentSection}>
            <Text style={styles.sectionTitle}>Privacy Settings</Text>
            <Text style={styles.privacyDescription}>
              Choose what information other members can see about you
            </Text>

            <View style={styles.privacyOption}>
              <Text style={styles.privacyLabel}>Hide my email</Text>
              <Switch
                value={hideEmail}
                onValueChange={setHideEmail}
                trackColor={{ false: theme.borderLight, true: theme.primary }}
                thumbColor={hideEmail ? theme.textWhite : theme.textLight}
              />
            </View>

            <View style={styles.privacyOption}>
              <Text style={styles.privacyLabel}>Hide my phone number</Text>
              <Switch
                value={hidePhone}
                onValueChange={setHidePhone}
                trackColor={{ false: theme.borderLight, true: theme.primary }}
                thumbColor={hidePhone ? theme.textWhite : theme.textLight}
              />
            </View>

            <View style={styles.privacyOption}>
              <Text style={styles.privacyLabel}>Hide my name</Text>
              <Switch
                value={hideName}
                onValueChange={setHideName}
                trackColor={{ false: theme.borderLight, true: theme.primary }}
                thumbColor={hideName ? theme.textWhite : theme.textLight}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, enrolling && styles.disabledButton]}
              onPress={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? (
                <ActivityIndicator size="small" color={theme.textWhite} />
              ) : (
                <>
                  <Feather name="user-plus" size={20} color={theme.textWhite} />
                  <Text style={styles.buttonText}>Enroll in Course</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.enrollmentSection}>
            <View style={styles.enrolledBadge}>
              <Feather name="check-circle" size={20} color={theme.success} />
              <Text style={styles.enrolledText}>You are enrolled in this course</Text>
            </View>

            <Text style={styles.enrollmentDate}>
              Enrolled on {formatDate(enrollment.enrollment_date)}
            </Text>

            <Text style={styles.sectionTitle}>Your Privacy Settings</Text>

            <View style={styles.privacyOption}>
              <Text style={styles.privacyLabel}>Hide my email</Text>
              <Switch
                value={hideEmail}
                onValueChange={(value) => {
                  setHideEmail(value);
                  updatePrivacySettings();
                }}
                trackColor={{ false: theme.borderLight, true: theme.primary }}
                thumbColor={hideEmail ? theme.textWhite : theme.textLight}
              />
            </View>

            <View style={styles.privacyOption}>
              <Text style={styles.privacyLabel}>Hide my phone number</Text>
              <Switch
                value={hidePhone}
                onValueChange={(value) => {
                  setHidePhone(value);
                  updatePrivacySettings();
                }}
                trackColor={{ false: theme.borderLight, true: theme.primary }}
                thumbColor={hidePhone ? theme.textWhite : theme.textLight}
              />
            </View>

            <View style={styles.privacyOption}>
              <Text style={styles.privacyLabel}>Hide my name</Text>
              <Switch
                value={hideName}
                onValueChange={(value) => {
                  setHideName(value);
                  updatePrivacySettings();
                }}
                trackColor={{ false: theme.borderLight, true: theme.primary }}
                thumbColor={hideName ? theme.textWhite : theme.textLight}
              />
            </View>

            <TouchableOpacity style={styles.leaveButton} onPress={handleUnenroll}>
              <Feather name="user-minus" size={20} color={theme.error} />
              <Text style={styles.leaveButtonText}>Leave Course</Text>
            </TouchableOpacity>
          </View>
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
  safeArea: {
    backgroundColor: theme.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingM,
    backgroundColor: theme.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.textWhite,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
  },
  loadingText: {
    fontSize: 16,
    color: theme.textLight,
    marginTop: theme.spacingM,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
    padding: theme.spacingXL,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: theme.spacingM,
  },
  errorText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
  },
  imageContainer: {
    height: 250,
    position: "relative",
  },
  courseImage: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  infoSection: {
    padding: theme.spacingL,
    backgroundColor: theme.cardBg,
    margin: theme.spacingM,
    borderRadius: theme.radiusMedium,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: theme.spacingL,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingM,
  },
  detailText: {
    fontSize: 16,
    color: theme.textMedium,
    marginLeft: theme.spacingM,
  },
  enrollmentSection: {
    padding: theme.spacingL,
    backgroundColor: theme.cardBg,
    margin: theme.spacingM,
    marginBottom: theme.spacingXL,
    borderRadius: theme.radiusMedium,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.textWhite,
    marginBottom: theme.spacingS,
    marginTop: theme.spacingL,
  },
  privacyDescription: {
    fontSize: 14,
    color: theme.textLight,
    marginBottom: theme.spacingL,
  },
  privacyOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacingM,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  privacyLabel: {
    fontSize: 16,
    color: theme.textMedium,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primary,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
    borderRadius: theme.radiusMedium,
    marginTop: theme.spacingL,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    marginLeft: theme.spacingS,
  },
  enrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.successLight,
    padding: theme.spacingM,
    borderRadius: theme.radiusSmall,
    marginBottom: theme.spacingM,
  },
  enrolledText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.success,
    marginLeft: theme.spacingS,
  },
  enrollmentDate: {
    fontSize: 14,
    color: theme.textLight,
    marginBottom: theme.spacingL,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.error,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
    borderRadius: theme.radiusMedium,
    marginTop: theme.spacingL,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.error,
    marginLeft: theme.spacingS,
  },
});

export default CourseDetailPage;