import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  Alert,
  Animated as RNAnimated,
  useWindowDimensions,
  Modal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { ChurchActionButton } from "./ChurchActionButton";
import theme from "@/theme";
import { useCRUD } from "@/utils/crudClient";
import { LinearGradient } from "expo-linear-gradient";
import { useChurchContext } from "@/contexts/church";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRouter } from "expo-router";

type RootStackParamList = {
  MinistriesScreen: undefined;
  coursehomepage: undefined;
  church_events: undefined;
  church_members: { church_id: string; church_name?: string };
  volunteerhomepage: undefined;
  biblestudy: undefined;
  youthgroup: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  userData: { username: string; profileImage: string };
};

export default function ChurchPageContent({ userData }: Props) {
  const {
    data: { church, member },
  } = useChurchContext();

  const navigation = useNavigation<NavigationProp>();
  const router = useRouter();
  const [leavingChurch, setLeavingChurch] = useState<boolean>(false);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { reset: resetChurchData } = useChurchContext();
  const { selectOne, select, delete: deleteMember } = useCRUD();

  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const cardAnim1 = useRef(new RNAnimated.Value(0)).current;
  const cardAnim2 = useRef(new RNAnimated.Value(0)).current;
  const cardAnim3 = useRef(new RNAnimated.Value(0)).current;

  // Add a modal animation ref
  const modalAnimation = useRef(new RNAnimated.Value(0)).current;

  // Fetch member count and events count using CRUD API
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setIsLoading(true);
        const [members, events] = await Promise.all([
          select("church_members", {
            select: "id",
            where: { church_id: church.id },
          }),
          select("church_events", {
            select: "id",
            where: { church_id: church.id },
          }),
        ]);
        setMemberCount(members?.length || 0);
        setEventsCount(events?.length || 0);
      } catch (error) {
        console.error("Error in fetching counts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [church.id]);

  // Run animations when component mounts
  useEffect(() => {
    const animations = [
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      RNAnimated.spring(cardAnim1, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      RNAnimated.spring(cardAnim2, {
        toValue: 1,
        tension: 300,
        friction: 20,
        delay: 50,
        useNativeDriver: true,
      }),
      RNAnimated.spring(cardAnim3, {
        toValue: 1,
        tension: 300,
        friction: 20,
        delay: 100,
        useNativeDriver: true,
      }),
    ];

    // Start all animations
    RNAnimated.parallel(animations).start();
  }, [fadeAnim, cardAnim1, cardAnim2, cardAnim3]);

  const handleLeaveChurch = async (): Promise<void> => {
    if (!member) return;

    try {
      setLeavingChurch(true);

      // Delete the membership record using CRUD API
      await deleteMember("church_members", { id: member.id });

      resetChurchData();
    } catch (error) {
      console.error("Error leaving church:", error);
      Alert.alert("Error", "Failed to leave the church. Please try again later.");
    } finally {
      setLeavingChurch(false);
    }
  };

  // Update confirmLeaveChurch to include animation
  const confirmLeaveChurch = () => {
    setShowLeaveModal(true);
    RNAnimated.spring(modalAnimation, {
      toValue: 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  };

  // Add closeModal function to handle animations
  const closeModal = () => {
    RNAnimated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLeaveModal(false);
    });
  };

  return (
    <View style={styles.nativeContainer}>
      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <StatItem
          icon="people"
          value={isLoading ? "..." : memberCount.toString()}
          label="Members"
        />
        <StatItem
          icon="calendar"
          value={isLoading ? "..." : eventsCount.toString()}
          label="Events"
        />
        <StatItem icon="trending-up" value="+12%" label="Growth" />
      </View>

      {/* Native iOS List */}
      <View style={styles.nativeList}>
        <NavigationItem
          icon="calendar"
          title="Events"
          subtitle="Upcoming activities"
          onPress={() =>
            router.push({
              pathname: "/church_events",
              params: { churchId: church.id },
            })
          }
        />
        <View style={styles.listSeparator} />
        <NavigationItem
          icon="users"
          title="Members"
          subtitle="Church directory"
          onPress={() =>
            navigation.navigate("church_members", {
              church_id: church.id.toString(),
              church_name: church.name,
            })
          }
        />
        <View style={styles.listSeparator} />
        <NavigationItem
          icon="church"
          title="Ministries"
          subtitle="Get involved"
          onPress={() => navigation.navigate("MinistriesScreen")}
        />
        <View style={styles.listSeparator} />
        <NavigationItem
          icon="hands-helping"
          title="Volunteer"
          subtitle="Serve others"
          onPress={() => navigation.navigate("volunteerhomepage")}
        />
      </View>

      {/* About Section */}
      <View style={styles.aboutSection}>
        <Text style={styles.aboutSectionTitle}>About</Text>
        <Text style={styles.aboutText}>{church.description}</Text>

        <View style={styles.aboutDetails}>
          <View style={styles.aboutDetailRow}>
            <Text style={styles.aboutDetailLabel}>Founded</Text>
            <Text style={styles.aboutDetailValue}>{church.founded || "N/A"}</Text>
          </View>
          <View style={styles.aboutDetailRow}>
            <Text style={styles.aboutDetailLabel}>Schedule</Text>
            <Text style={styles.aboutDetailValue}>Sunday & Wednesday</Text>
          </View>
        </View>
      </View>

      {/* Leave Church Button */}
      <RNAnimated.View
        style={[
          styles.leaveButtonContainer,
          isTablet && styles.tabletLeaveButtonContainer,
          {
            opacity: cardAnim3,
            transform: [{ scale: cardAnim3 }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.leaveButton, isTablet && styles.tabletLeaveButton]}
          onPress={confirmLeaveChurch}
          disabled={leavingChurch}
          activeOpacity={0.7}
        >
          {leavingChurch ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="exit-outline"
                size={isTablet ? 20 : 18}
                color="#FFFFFF"
                style={styles.leaveButtonIcon}
              />
              <Text style={[styles.leaveButtonText, isTablet && styles.tabletLeaveButtonText]}>
                Leave Church
              </Text>
            </>
          )}
        </TouchableOpacity>
      </RNAnimated.View>

      {/* Leave Church Confirmation Modal */}
      <Modal
        visible={showLeaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <RNAnimated.View
            style={[
              styles.modalContainer,
              {
                opacity: modalAnimation,
                transform: [
                  {
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={[theme.error, "#FF5252"]}
                style={styles.modalIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <FontAwesome5 name="church" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.modalTitle}>Leave Church</Text>
            </View>

            <Text style={styles.modalMessage}>
              Are you sure you want to leave {church.name}? This action cannot be undone and you
              will need to rejoin if you change your mind.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => {
                  closeModal();
                  setTimeout(handleLeaveChurch, 300);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="exit-outline"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.modalConfirmButtonText}>Yes, Leave</Text>
              </TouchableOpacity>
            </View>
          </RNAnimated.View>
        </View>
      </Modal>
    </View>
  );
}

// Clean Stat Item Component
const StatItem = ({ icon, value, label }: { icon: string; value: string; label: string }) => {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={20} color="rgba(34, 197, 94, 0.9)" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

// Clean Navigation Item Component
const NavigationItem = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.navItem}>
      <View style={styles.navContent}>
        <FontAwesome5 name={icon} size={18} color="rgba(34, 197, 94, 0.9)" />
        <View style={styles.navTextContainer}>
          <Text style={styles.navTitle}>{title}</Text>
          <Text style={styles.navSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Native Container
  nativeContainer: {
    flex: 1,
    paddingHorizontal: theme.spacingL,
  },

  // Quick Stats
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: theme.spacingL,
    marginBottom: theme.spacingL,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
  },

  // Native iOS List
  nativeList: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    marginBottom: theme.spacingXL,
    overflow: "hidden",
  },
  listSeparator: {
    height: 0.5,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginLeft: 50,
  },
  navItem: {
    backgroundColor: "transparent",
  },
  navContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingM,
    gap: theme.spacingM,
    minHeight: 50,
  },
  navTextContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "400",
    color: "#FFFFFF",
    marginBottom: 1,
  },
  navSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
  },

  // About Section
  aboutSection: {
    marginBottom: theme.spacingXL,
  },
  aboutSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: theme.spacingM,
    letterSpacing: -0.5,
  },
  aboutText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 22,
    marginBottom: theme.spacingL,
  },
  aboutDetails: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: theme.spacingM,
  },
  aboutDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacingS,
  },
  aboutDetailLabel: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "400",
  },
  aboutDetailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  leaveButtonContainer: {
    marginVertical: theme.spacingXL,
    alignItems: "center",
  },
  tabletLeaveButtonContainer: {
    marginVertical: theme.spacing2XL,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.error,
    ...theme.shadowLight,
  },
  tabletLeaveButton: {
    paddingVertical: theme.spacingL,
    paddingHorizontal: theme.spacing2XL,
  },
  leaveButtonIcon: {
    marginRight: theme.spacingS,
  },
  leaveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
  },
  tabletLeaveButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: theme.spacingL,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    padding: theme.spacingXL,
    borderRadius: theme.radiusLarge,
    width: "100%",
    maxWidth: 400,
    ...theme.shadowHeavy,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingL,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginLeft: theme.spacingM,
  },
  modalMessage: {
    fontSize: 16,
    color: theme.textMedium,
    marginBottom: theme.spacingXL,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    padding: theme.spacingM,
    backgroundColor: theme.neutral100,
    borderRadius: theme.radiusMedium,
    marginRight: theme.spacingM,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadowLight,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
    textAlign: "center",
  },
  modalConfirmButton: {
    flex: 1,
    padding: theme.spacingM,
    backgroundColor: theme.error,
    borderRadius: theme.radiusMedium,
    marginLeft: theme.spacingM,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...theme.shadowLight,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: "#FFFFFF",
    textAlign: "center",
  },
  modalIconContainer: {
    width: 42,
    height: 42,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadowLight,
  },
});
