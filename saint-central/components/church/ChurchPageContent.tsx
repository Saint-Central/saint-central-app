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
  Animated,
  Platform,
  useWindowDimensions,
  Modal,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Church, ChurchMember } from "@/types/church";
import { ChurchActionButton } from "./ChurchActionButton";
import theme from "@/theme";
import { supabase } from "@/supabaseClient";
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
  church: Church;
  userData: { username: string; profileImage: string };
  member?: ChurchMember | null;
};

export default function ChurchPageContent({ church, member, userData }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const router = useRouter();
  const [leavingChurch, setLeavingChurch] = useState<boolean>(false);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { reset: resetChurchData } = useChurchContext();

  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim1 = useRef(new Animated.Value(0)).current;
  const cardAnim2 = useRef(new Animated.Value(0)).current;
  const cardAnim3 = useRef(new Animated.Value(0)).current;

  // Add a modal animation ref
  const modalAnimation = useRef(new Animated.Value(0)).current;

  // Fetch member count
  useEffect(() => {
    const fetchMemberCount = async () => {
      try {
        setIsLoading(true);
        const { count, error } = await supabase
          .from("church_members")
          .select("id", { count: "exact", head: true })
          .eq("church_id", church.id);

        if (error) {
          console.error("Error fetching member count:", error);
        } else {
          setMemberCount(count || 0);
        }
      } catch (error) {
        console.error("Error in fetching member count:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberCount();
  }, [church.id]);

  // Run animations when component mounts
  useEffect(() => {
    const animations = [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim1, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim2, {
        toValue: 1,
        tension: 300,
        friction: 20,
        delay: 50,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim3, {
        toValue: 1,
        tension: 300,
        friction: 20,
        delay: 100,
        useNativeDriver: true,
      }),
    ];

    // Start all animations
    Animated.parallel(animations).start();
  }, [fadeAnim, cardAnim1, cardAnim2, cardAnim3]);

  const handleLeaveChurch = async (): Promise<void> => {
    if (!member) return;

    try {
      setLeavingChurch(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No user logged in");

      // Delete the membership record
      const { error: deleteError } = await supabase
        .from("church_members")
        .delete()
        .eq("id", member.id);
      if (deleteError) throw deleteError;

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
    Animated.spring(modalAnimation, {
      toValue: 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  };

  // Add closeModal function to handle animations
  const closeModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLeaveModal(false);
    });
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Featured Image */}
      {church.image && (
        <Animated.View
          style={[
            styles.imageContainer,
            isTablet && styles.tabletImageContainer,
            {
              transform: [
                { scale: cardAnim1 },
                {
                  translateY: cardAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Image source={{ uri: church.image }} style={styles.churchImage} resizeMode="cover" />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.imageOverlay}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{church.category || "Christian Church"}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* About Section */}
      <Animated.View
        style={[
          styles.sectionContainer,
          isTablet && styles.tabletSectionContainer,
          {
            transform: [
              { scale: cardAnim1 },
              {
                translateY: cardAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, isTablet && styles.tabletSectionTitle]}>About</Text>
          <View style={styles.sectionDivider} />
        </View>

        <View style={styles.aboutCard}>
          <Text style={[styles.aboutText, isTablet && styles.tabletAboutText]}>
            {church.description}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={isTablet ? 18 : 16} color={theme.primary} />
              <Text style={[styles.detailLabel, isTablet && styles.tabletDetailLabel]}>
                Founded
              </Text>
              <Text style={[styles.detailValue, isTablet && styles.tabletDetailValue]}>
                {church.founded || "N/A"}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={isTablet ? 18 : 16} color={theme.tertiary} />
              <Text style={[styles.detailLabel, isTablet && styles.tabletDetailLabel]}>
                Services
              </Text>
              <Text style={[styles.detailValue, isTablet && styles.tabletDetailValue]}>
                Sun, Wed
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={isTablet ? 18 : 16} color={theme.secondary} />
              <Text style={[styles.detailLabel, isTablet && styles.tabletDetailLabel]}>
                Members
              </Text>
              <Text style={[styles.detailValue, isTablet && styles.tabletDetailValue]}>
                {isLoading ? "..." : memberCount}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Quick Services */}
      <Animated.View
        style={[
          styles.sectionContainer,
          isTablet && styles.tabletSectionContainer,
          {
            transform: [
              { scale: cardAnim2 },
              {
                translateY: cardAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, isTablet && styles.tabletSectionTitle]}>
            Quick Services
          </Text>
          <View style={styles.sectionDivider} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.servicesScrollContainer,
            isTablet && styles.tabletServicesScrollContainer,
          ]}
        >
          <ServiceCard
            title="Service Times"
            time="9:00 AM"
            icon={<FontAwesome5 name="pray" size={isTablet ? 24 : 20} color="#FFFFFF" />}
            color1={theme.gradientPrimary[0]}
            color2={theme.gradientPrimary[1]}
            isTablet={isTablet}
            onPress={() =>
              router.push({
                pathname: "/ServiceTimes",
                params: { churchId: church.id },
              })
            }
          />

          <ServiceCard
            title="Bible Study"
            time="Wed, 7 PM"
            icon={<FontAwesome5 name="bible" size={isTablet ? 24 : 20} color="#FFFFFF" />}
            color1={theme.gradientSecondary[0]}
            color2={theme.gradientSecondary[1]}
            isTablet={isTablet}
            onPress={() => navigation.navigate("biblestudy")}
          />

          <ServiceCard
            title="Youth Group"
            time="Fri, 6 PM"
            icon={<Ionicons name="people" size={isTablet ? 24 : 20} color="#FFFFFF" />}
            color1={theme.gradientInfo[0]}
            color2={theme.gradientInfo[1]}
            isTablet={isTablet}
            onPress={() => navigation.navigate("YouthGroupSchedulePage")}
          />

          <ServiceCard
            title="Prayer"
            time="Daily, 6 AM"
            icon={<FontAwesome5 name="hands" size={isTablet ? 24 : 20} color="#FFFFFF" />}
            color1={theme.gradientSuccess[0]}
            color2={theme.gradientSuccess[1]}
            isTablet={isTablet}
            onPress={() => {}}
          />
        </ScrollView>
      </Animated.View>

      {/* Actions Section */}
      <Animated.View
        style={[
          styles.sectionContainer,
          isTablet && styles.tabletSectionContainer,
          {
            transform: [
              { scale: cardAnim3 },
              {
                translateY: cardAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, isTablet && styles.tabletSectionTitle]}>Actions</Text>
          <View style={styles.sectionDivider} />
        </View>

        <ChurchActionButton
          icon={
            <LinearGradient
              colors={[theme.gradientPrimary[0], theme.gradientPrimary[1]]}
              style={[styles.actionIcon, isTablet && styles.tabletActionIcon]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="calendar" size={isTablet ? 22 : 18} color="#FFFFFF" />
            </LinearGradient>
          }
          onPress={() =>
            router.push({
              pathname: "/church_events",
              params: { churchId: church.id },
            })
          }
        >
          <Text style={[styles.actionButtonTitle, isTablet && styles.tabletActionButtonTitle]}>
            Events Calendar
          </Text>
          <Text
            style={[
              styles.actionButtonDescription,
              isTablet && styles.tabletActionButtonDescription,
            ]}
          >
            View upcoming church events
          </Text>
        </ChurchActionButton>

        <ChurchActionButton
          icon={
            <LinearGradient
              colors={[theme.gradientCool[0], theme.gradientCool[1]]}
              style={[styles.actionIcon, isTablet && styles.tabletActionIcon]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <FontAwesome5 name="donate" size={isTablet ? 22 : 18} color="#FFFFFF" />
            </LinearGradient>
          }
          onPress={() => navigation.navigate("coursehomepage")}
        >
          <Text style={[styles.actionButtonTitle, isTablet && styles.tabletActionButtonTitle]}>
            Donate
          </Text>
          <Text
            style={[
              styles.actionButtonDescription,
              isTablet && styles.tabletActionButtonDescription,
            ]}
          >
            Support our ministries
          </Text>
        </ChurchActionButton>

        <ChurchActionButton
          icon={
            <LinearGradient
              colors={[theme.gradientSecondary[0], theme.gradientSecondary[1]]}
              style={[styles.actionIcon, isTablet && styles.tabletActionIcon]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <FontAwesome5 name="church" size={isTablet ? 22 : 18} color="#FFFFFF" />
            </LinearGradient>
          }
          onPress={() => navigation.navigate("MinistriesScreen")}
        >
          <Text style={[styles.actionButtonTitle, isTablet && styles.tabletActionButtonTitle]}>
            Ministries
          </Text>
          <Text
            style={[
              styles.actionButtonDescription,
              isTablet && styles.tabletActionButtonDescription,
            ]}
          >
            Browse our church ministries
          </Text>
        </ChurchActionButton>
      </Animated.View>

      {/* Leave Church Button */}
      <Animated.View
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
      </Animated.View>

      {/* Leave Church Confirmation Modal */}
      <Modal
        visible={showLeaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
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
          </Animated.View>
        </View>
      </Modal>
    </Animated.View>
  );
}

interface ServiceCardProps {
  title: string;
  time: string;
  icon: React.ReactNode;
  color1: string;
  color2: string;
  isTablet?: boolean;
  onPress: () => void;
}

const ServiceCard = ({
  title,
  time,
  icon,
  color1,
  color2,
  isTablet,
  onPress,
}: ServiceCardProps) => {
  return (
    <TouchableOpacity
      style={[styles.serviceCard, isTablet && styles.tabletServiceCard]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[color1, color2]}
        style={styles.serviceCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.serviceIconContainer, isTablet && styles.tabletServiceIconContainer]}>
          {icon}
        </View>
        <Text style={[styles.serviceTitle, isTablet && styles.tabletServiceTitle]}>{title}</Text>
        <Text style={[styles.serviceTime, isTablet && styles.tabletServiceTime]}>{time}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    height: 180,
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    marginBottom: theme.spacingXL,
    ...theme.shadowLight,
  },
  tabletImageContainer: {
    height: 240,
    marginBottom: theme.spacing2XL,
  },
  churchImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    justifyContent: "flex-end",
    padding: theme.spacingL,
  },
  categoryBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: theme.spacingM,
    paddingVertical: theme.spacingXS,
    borderRadius: theme.radiusFull,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: theme.fontSemiBold,
  },
  sectionContainer: {
    marginBottom: theme.spacingXL,
  },
  tabletSectionContainer: {
    marginBottom: theme.spacing2XL,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingM,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
    marginRight: theme.spacingM,
  },
  tabletSectionTitle: {
    fontSize: 22,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.neutral200,
  },
  aboutCard: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    padding: theme.spacingL,
    ...theme.shadowLight,
    borderWidth: 1,
    borderColor: theme.neutral100,
  },
  aboutText: {
    fontSize: 15,
    color: theme.textMedium,
    lineHeight: 22,
    marginBottom: theme.spacingL,
  },
  tabletAboutText: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: theme.spacingXL,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: theme.textMedium,
    marginTop: 4,
    marginBottom: 2,
  },
  tabletDetailLabel: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
  },
  tabletDetailValue: {
    fontSize: 16,
  },
  servicesScrollContainer: {
    paddingVertical: theme.spacingXS,
    paddingRight: theme.spacingL,
  },
  tabletServicesScrollContainer: {
    paddingVertical: theme.spacingS,
  },
  serviceCard: {
    width: 120,
    height: 140,
    borderRadius: theme.radiusMedium,
    marginRight: theme.spacingM,
    ...theme.shadowLight,
  },
  tabletServiceCard: {
    width: 160,
    height: 180,
    marginRight: theme.spacingL,
  },
  serviceCardGradient: {
    flex: 1,
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    justifyContent: "space-between",
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusMedium,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacingM,
  },
  tabletServiceIconContainer: {
    width: 48,
    height: 48,
    marginBottom: theme.spacingL,
  },
  serviceTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: theme.fontSemiBold,
  },
  tabletServiceTitle: {
    fontSize: 18,
  },
  serviceTime: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    marginTop: 4,
  },
  tabletServiceTime: {
    fontSize: 15,
    marginTop: 6,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  tabletActionIcon: {
    width: 44,
    height: 44,
  },
  actionButtonTitle: {
    fontSize: 15,
    fontWeight: theme.fontSemiBold,
    color: theme.textDark,
  },
  tabletActionButtonTitle: {
    fontSize: 18,
  },
  actionButtonDescription: {
    fontSize: 13,
    color: theme.textMedium,
    marginTop: 2,
  },
  tabletActionButtonDescription: {
    fontSize: 15,
    marginTop: 4,
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