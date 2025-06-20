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
  TextInput,
  RefreshControl,
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

interface EnrolledMember {
  enrollment: CourseEnrollment;
  user: {
    id: string;
    email: string;
    phone?: string;
    full_name?: string;
  };
}

const CourseAdminDashboard: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading, session } = useAuth();
  const crud = useCRUD();

  const [course, setCourse] = useState<Course | null>(null);
  const [members, setMembers] = useState<EnrolledMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<EnrolledMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(theme.primary);
    }
  }, []);

  useEffect(() => {
    if (id && user && session && !authLoading) {
      checkPermissions();
      fetchCourseAndMembers();
    }
  }, [id, user, session, authLoading]);

  useEffect(() => {
    const filtered = members.filter((member) => {
      const search = searchQuery.toLowerCase();
      const name = member.user.full_name?.toLowerCase() || "";
      const email = member.user.email?.toLowerCase() || "";
      return name.includes(search) || email.includes(search);
    });
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  const checkPermissions = async () => {
    if (!user || !id) return;

    try {
      // Check if user is admin or owner of the church
      const courseData = await crud.selectOne<Course>("courses", {
        where: { id: Number(id) },
      });

      if (courseData) {
        const churchMember = await crud.selectOne("church_members", {
          where: {
            user_id: user.id,
            church_id: courseData.church_id,
          },
        });

        const role = churchMember?.role?.toLowerCase() || "";
        setHasPermission(role === "admin" || role === "owner" || courseData.user_id === user.id);
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  const fetchCourseAndMembers = async () => {
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

      // Fetch enrollments
      const enrollments = await crud.select<CourseEnrollment>("course_enrollment", {
        where: { course_id: Number(id) },
        orderBy: { enrollment_date: "desc" },
      });

      // Fetch user details for each enrollment
      const membersData: EnrolledMember[] = [];

      for (const enrollment of enrollments) {
        const userData = await crud.selectOne("users", {
          where: { id: enrollment.user_id },
        });

        if (userData) {
          membersData.push({
            enrollment,
            user: {
              id: userData.id,
              email: enrollment.hide_email ? "Hidden" : userData.email,
              phone: enrollment.hide_phone ? undefined : userData.phone,
              full_name: enrollment.hide_name ? "Anonymous" : userData.full_name,
            },
          });
        }
      }

      setMembers(membersData);
      setFilteredMembers(membersData);
    } catch (error) {
      console.error("Error fetching course and members:", error);
      Alert.alert("Error", "Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourseAndMembers();
    setRefreshing(false);
  };

  const handleRemoveMember = (member: EnrolledMember) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.user.full_name || "this member"} from the course?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await crud.delete("course_enrollment", { id: member.enrollment.id });
              Alert.alert("Success", "Member removed from course");
              await fetchCourseAndMembers();
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/coursehomepage")} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={theme.textWhite} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Access Denied</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Feather name="lock" size={64} color={theme.textLight} />
          <Text style={styles.errorTitle}>Permission Required</Text>
          <Text style={styles.errorText}>
            Only course administrators can access this page
          </Text>
        </View>
      </View>
    );
  }

  if (loading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>
          {authLoading ? "Authenticating..." : "Loading course data..."}
        </Text>
      </View>
    );
  }

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
            <Text style={styles.headerTitle}>Course Admin</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Feather name="refresh-cw" size={22} color={theme.textWhite} />
            </TouchableOpacity>
          </View>

          {course && (
            <View style={styles.courseInfo}>
              <Text style={styles.courseName} numberOfLines={2}>
                {course.description}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Feather name="users" size={20} color={theme.textWhite} />
                  <Text style={styles.statText}>{members.length} Members</Text>
                </View>
                <View style={styles.statItem}>
                  <Feather name="calendar" size={20} color={theme.textWhite} />
                  <Text style={styles.statText}>{formatDate(course.time)}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={theme.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members..."
              placeholderTextColor={theme.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color={theme.textLight} />
              </TouchableOpacity>
            )}
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
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={theme.textLight} />
            <Text style={styles.emptyText}>
              {searchQuery ? "No members match your search" : "No enrolled members yet"}
            </Text>
          </View>
        ) : (
          filteredMembers.map((member) => (
            <View key={member.enrollment.id} style={styles.memberCard}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.user.full_name === "Anonymous"
                      ? "?"
                      : (member.user.full_name || member.user.email || "?")[0].toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.user.full_name || "No name provided"}
                </Text>
                <Text style={styles.memberEmail} numberOfLines={1}>
                  {member.user.email}
                </Text>
                {member.user.phone && (
                  <Text style={styles.memberPhone} numberOfLines={1}>
                    {member.user.phone}
                  </Text>
                )}
                <Text style={styles.enrollmentDate}>
                  Enrolled {formatDate(member.enrollment.enrollment_date)}
                </Text>

                <View style={styles.privacyBadges}>
                  {member.enrollment.hide_email && (
                    <View style={styles.privacyBadge}>
                      <Feather name="mail" size={12} color={theme.textLight} />
                      <Text style={styles.privacyText}>Email hidden</Text>
                    </View>
                  )}
                  {member.enrollment.hide_phone && (
                    <View style={styles.privacyBadge}>
                      <Feather name="phone" size={12} color={theme.textLight} />
                      <Text style={styles.privacyText}>Phone hidden</Text>
                    </View>
                  )}
                  {member.enrollment.hide_name && (
                    <View style={styles.privacyBadge}>
                      <Feather name="user" size={12} color={theme.textLight} />
                      <Text style={styles.privacyText}>Name hidden</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMember(member)}
              >
                <Feather name="user-minus" size={20} color={theme.error} />
              </TouchableOpacity>
            </View>
          ))
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
    fontSize: 20,
    fontWeight: "700",
    color: theme.textWhite,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  courseInfo: {
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingM,
  },
  courseName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.textWhite,
    marginBottom: theme.spacingM,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacingL,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacingS,
  },
  statText: {
    fontSize: 14,
    color: theme.textWhite,
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: theme.spacingL,
    marginTop: theme.spacingM,
    paddingHorizontal: theme.spacingM,
    borderRadius: theme.radiusMedium,
  },
  searchIcon: {
    marginRight: theme.spacingS,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: theme.textWhite,
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
    padding: theme.spacingXL,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.textWhite,
    marginTop: theme.spacingL,
    marginBottom: theme.spacingM,
  },
  errorText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textLight,
    marginTop: theme.spacingM,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBg,
    padding: theme.spacingL,
    borderRadius: theme.radiusMedium,
    marginBottom: theme.spacingM,
    ...theme.shadowLight,
  },
  avatarContainer: {
    marginRight: theme.spacingM,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.textWhite,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: theme.textMedium,
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 14,
    color: theme.textMedium,
    marginBottom: 4,
  },
  enrollmentDate: {
    fontSize: 12,
    color: theme.textLight,
    marginBottom: theme.spacingS,
  },
  privacyBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacingS,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.borderLight,
    paddingHorizontal: theme.spacingS,
    paddingVertical: 4,
    borderRadius: theme.radiusSmall,
    gap: 4,
  },
  privacyText: {
    fontSize: 11,
    color: theme.textLight,
  },
  removeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CourseAdminDashboard;