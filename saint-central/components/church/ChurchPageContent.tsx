import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
    <View style={styles.modernContainer}>
      {/* Action Cards Grid */}
      <View style={styles.actionCardsGrid}>
        <ActionCard
          icon="calendar-outline"
          iconColor={theme.primary}
          title="Events"
          subtitle="Upcoming activities"
          gradientColors={[theme.primary, theme.accent1]}
          onPress={() =>
            router.push({
              pathname: "/church_events",
              params: { churchId: church.id },
            })
          }
          metric={isLoading ? "..." : eventsCount.toString()}
          metricLabel="Events"
        />

        <ActionCard
          icon="people-outline"
          iconColor={theme.accent2}
          title="Members"
          subtitle="Church directory"
          gradientColors={[theme.accent2, theme.tertiary]}
          onPress={() =>
            navigation.navigate("church_members", {
              church_id: church.id.toString(),
              church_name: church.name,
            })
          }
          metric={isLoading ? "..." : memberCount.toString()}
          metricLabel="Members"
        />

        <ActionCard
          icon="school-outline"
          iconColor={theme.accent3}
          title="Classes"
          subtitle="Learn and grow"
          gradientColors={[theme.accent3, theme.secondary]}
          onPress={() => navigation.navigate("MinistriesScreen")}
          metric="12"
          metricLabel="Active"
        />

        <ActionCard
          icon="hand-left-outline"
          iconColor={theme.success}
          title="Volunteer"
          subtitle="Serve others"
          gradientColors={[theme.success, theme.accent1]}
          onPress={() => navigation.navigate("volunteerhomepage")}
          metric="24"
          metricLabel="Opportunities"
        />
      </View>

      {/* Church Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <MaterialCommunityIcons name="information" size={24} color={theme.primary} />
          <Text style={styles.infoCardTitle}>About Our Church</Text>
        </View>
        <Text style={styles.infoCardText}>{church.description}</Text>

        <View style={styles.infoDetails}>
          <InfoDetailItem
            icon="calendar-check"
            label="Founded"
            value={church.founded || "N/A"}
            iconColor={theme.primary}
          />
          <InfoDetailItem
            icon="clock-outline"
            label="Service Times"
            value="Sunday & Wednesday"
            iconColor={theme.accent2}
          />
          <InfoDetailItem
            icon="phone"
            label="Contact"
            value={church.phone || "Not available"}
            iconColor={theme.accent3}
          />
        </View>
      </View>

      {/* Quick Actions Row */}
      <View style={styles.quickActionsRow}>
        <QuickActionButton
          icon="share-social-outline"
          label="Share"
          onPress={() => {}}
          gradientColors={[theme.info, theme.accent1]}
        />
        <QuickActionButton
          icon="heart-outline"
          label="Favorite"
          onPress={() => {}}
          gradientColors={[theme.error, "#FF5252"]}
        />
        <QuickActionButton
          icon="call-outline"
          label="Call"
          onPress={() => {}}
          gradientColors={[theme.success, theme.accent2]}
        />
      </View>

      {/* Leave Church Section */}
      <RNAnimated.View
        style={[
          styles.leaveSection,
          {
            opacity: cardAnim3,
            transform: [{ scale: cardAnim3 }],
          },
        ]}
      >
        <View style={styles.leaveSectionContent}>
          <View style={styles.leaveSectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color={theme.warning} />
            <Text style={styles.leaveSectionTitle}>Membership Options</Text>
          </View>
          <Text style={styles.leaveSectionText}>
            Manage your membership settings or leave this church if needed.
          </Text>
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={confirmLeaveChurch}
            disabled={leavingChurch}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["rgba(239, 68, 68, 0.8)", "rgba(220, 38, 38, 0.9)"]}
              style={styles.leaveButtonGradient}
            >
              {leavingChurch ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="exit-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.leaveButtonText}>Leave Church</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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

// Modern Action Card Component
const ActionCard = ({
  icon,
  iconColor,
  title,
  subtitle,
  gradientColors,
  onPress,
  metric,
  metricLabel,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  gradientColors: string[];
  onPress: () => void;
  metric: string;
  metricLabel: string;
}) => {
  const pressAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(pressAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.actionCardWrapper}
    >
      <RNAnimated.View style={[styles.actionCard, { transform: [{ scale: pressAnim }] }]}>
        <LinearGradient
          colors={[`${gradientColors[0]}15`, `${gradientColors[1]}10`]}
          style={styles.actionCardGradient}
        >
          <View style={styles.actionCardHeader}>
            <View style={[styles.actionCardIcon, { backgroundColor: `${iconColor}20` }]}>
              <Ionicons name={icon as any} size={20} color={iconColor} />
            </View>
            <View style={styles.actionCardMetric}>
              <Text style={styles.metricNumber}>{metric}</Text>
              <Text style={styles.metricLabel}>{metricLabel}</Text>
            </View>
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>{title}</Text>
            <Text style={styles.actionCardSubtitle}>{subtitle}</Text>
          </View>
        </LinearGradient>
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

// Info Detail Item Component
const InfoDetailItem = ({
  icon,
  label,
  value,
  iconColor,
}: {
  icon: string;
  label: string;
  value: string;
  iconColor: string;
}) => {
  return (
    <View style={styles.infoDetailItem}>
      <View style={[styles.infoDetailIcon, { backgroundColor: `${iconColor}15` }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={styles.infoDetailContent}>
        <Text style={styles.infoDetailLabel}>{label}</Text>
        <Text style={styles.infoDetailValue}>{value}</Text>
      </View>
    </View>
  );
};

// Quick Action Button Component
const QuickActionButton = ({
  icon,
  label,
  onPress,
  gradientColors,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  gradientColors: [string, string, ...string[]];
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.quickActionButton} activeOpacity={0.8}>
      <LinearGradient
        colors={gradientColors}
        style={styles.quickActionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon as any} size={18} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Modern Container
  modernContainer: {
    flex: 1,
    paddingHorizontal: theme.spacingL,
    gap: 20,
  },

  // Action Cards Grid
  actionCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  actionCardWrapper: {
    width: "48%",
  },
  actionCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  actionCardGradient: {
    padding: 16,
    minHeight: 120,
  },
  actionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  actionCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  actionCardMetric: {
    alignItems: "flex-end",
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textWhite,
    lineHeight: 20,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: theme.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: theme.textLight,
    lineHeight: 16,
  },

  // Info Card
  infoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.textWhite,
    marginLeft: 12,
  },
  infoCardText: {
    fontSize: 15,
    color: theme.textLight,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoDetails: {
    gap: 12,
  },
  infoDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoDetailContent: {
    flex: 1,
  },
  infoDetailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoDetailValue: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.textWhite,
  },

  // Quick Actions Row
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  quickActionButton: {
    alignItems: "center",
    gap: 8,
  },
  quickActionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.textLight,
  },

  // Leave Section
  leaveSection: {
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    overflow: "hidden",
  },
  leaveSectionContent: {
    padding: 20,
  },
  leaveSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  leaveSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    marginLeft: 8,
  },
  leaveSectionText: {
    fontSize: 14,
    color: theme.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },
  leaveButton: {
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  leaveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Modal Styles (keeping existing)
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
