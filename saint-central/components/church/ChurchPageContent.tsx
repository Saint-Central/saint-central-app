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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Church, ChurchMember } from "@/types/church";
import { ChurchActionButton } from "./ChurchActionButton";
import ChurchProfileCard from "./ChurchProfileCard";
import theme from "@/theme";
import { supabase } from "@/supabaseClient";
import { LinearGradient } from "expo-linear-gradient";
import { useChurchContext } from "@/contexts/church";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  MinistriesScreen: undefined;
  coursehomepage: undefined;
  church_events: undefined;
  church_members: { church_id: string; church_name?: string };
  volunteerhomepage: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  church: Church;
  userData: { username: string; profileImage: string };
  member?: ChurchMember | null;
};

export default function ChurchPageContent({ church, member, userData }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const [leavingChurch, setLeavingChurch] = useState<boolean>(false);
  const { reset: resetChurchData } = useChurchContext();

  // Animation references
  const imageAnim = useRef(new Animated.Value(0)).current;
  const actionAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered animations for elements
    Animated.stagger(150, [
      Animated.spring(imageAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(actionAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [imageAnim, actionAnim, cardAnim, buttonAnim]);

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

  const confirmLeaveChurch = () => {
    Alert.alert(
      "Leave Church",
      "Are you sure you want to leave this church? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Leave",
          onPress: handleLeaveChurch,
          style: "destructive",
        },
      ],
      { cancelable: true },
    );
  };

  // Button press animation
  const [buttonScale] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      {/* Hero Image Section */}
      {church.image && (
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: imageAnim,
              transform: [
                { scale: imageAnim },
                {
                  translateY: imageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Image source={{ uri: church.image }} style={styles.churchImage} resizeMode="cover" />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.5)"]} style={styles.imageOverlay}>
            <View style={styles.imageTextContainer}>
              <Text style={styles.churchType}>{church.category || "Christian Church"}</Text>
              <Text style={styles.churchLocation}>
                <Ionicons name="location" size={14} color="#FFFFFF" />{" "}
                {church.address.split(",")[0]}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Profile Card with Church Info */}
      <Animated.View
        style={[
          {
            opacity: cardAnim,
            transform: [
              { scale: cardAnim },
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ChurchProfileCard church={church} member={member} />
      </Animated.View>

      {/* Quick Action Buttons Section */}
      <Animated.View
        style={[
          styles.actionSectionContainer,
          {
            opacity: actionAnim,
            transform: [
              { scale: actionAnim },
              {
                translateY: actionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.sectionLine} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScrollContainer}
        >
          <QuickActionCard
            icon={<FontAwesome5 name="church" size={26} color="#FFFFFF" />}
            title="Ministries"
            description="Faith in action"
            gradientColors={["#3A86FF", "#4361EE"]}
            onPress={() => navigation.navigate("MinistriesScreen")}
          />
          <QuickActionCard
            icon={<Ionicons name="book-outline" size={26} color="#FFFFFF" />}
            title="Courses"
            description="Grow in knowledge"
            gradientColors={["#FF006E", "#FB5607"]}
            onPress={() => navigation.navigate("coursehomepage")}
          />
          <QuickActionCard
            icon={<MaterialCommunityIcons name="calendar-clock" size={26} color="#FFFFFF" />}
            title="Schedule"
            description="Plan your worship"
            gradientColors={["#8338EC", "#6A0DAD"]}
          />
          <QuickActionCard
            icon={<Ionicons name="people" size={26} color="#FFFFFF" />}
            title="Community"
            description="Connect with others"
            gradientColors={["#06D6A0", "#1A936F"]}
            onPress={() => navigation.navigate("volunteerhomepage")}
          />
        </ScrollView>
      </Animated.View>

      {/* Feature Actions Section */}
      <Animated.View
        style={[
          styles.actionSectionContainer,
          {
            opacity: actionAnim,
            transform: [
              { scale: actionAnim },
              {
                translateY: actionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Church Services</Text>
          <View style={styles.sectionLine} />
        </View>

        <ScrollView
          contentContainerStyle={styles.quickActionsScrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <ChurchActionButton
            icon={
              <LinearGradient
                colors={["#3A86FF", "#4361EE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <FontAwesome5 name="bible" size={24} color="#FFFFFF" />
              </LinearGradient>
            }
            onPress={() => {}}
          >
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonText}>Sunday Services</Text>
              <Text style={styles.buttonDescription}>Weekly worship schedule</Text>
            </View>
          </ChurchActionButton>
          <ChurchActionButton
            icon={
              <LinearGradient
                colors={["#06D6A0", "#1A936F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <FontAwesome5 name="hands-helping" size={22} color="#FFFFFF" />
              </LinearGradient>
            }
            onPress={() => navigation.navigate("volunteerhomepage")}
          >
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonText}>Volunteer</Text>
              <Text style={styles.buttonDescription}>Serve the community</Text>
            </View>
          </ChurchActionButton>
        </ScrollView>
      </Animated.View>

      {/* Leave Church Button */}
      <Animated.View
        style={[
          {
            opacity: buttonAnim,
            transform: [
              { scale: buttonAnim },
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={confirmLeaveChurch}
          disabled={leavingChurch}
        >
          <Animated.View
            style={[styles.leaveChurchButton, { transform: [{ scale: buttonScale }] }]}
          >
            <LinearGradient
              colors={["#EF476F", "#DE3B4E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.leaveChurchGradient}
            >
              {leavingChurch ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="exit-outline"
                    size={18}
                    color="#FFFFFF"
                    style={styles.leaveChurchIcon}
                  />
                  <Text style={styles.leaveChurchText}>Leave Church</Text>
                </>
              )}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradientColors: [string, string];
  onPress?: () => void;
}

const QuickActionCard = ({
  icon,
  title,
  description,
  gradientColors,
  onPress,
}: QuickActionCardProps) => {
  return (
    <TouchableOpacity
      style={styles.quickActionCard}
      activeOpacity={0.9}
      onPress={onPress || (() => {})}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickActionGradient}
      >
        <View style={styles.quickActionIcon}>{icon}</View>
        <View style={styles.quickActionTextContainer}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionDescription}>{description}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  leaveChurchButton: {
    marginTop: 20,
    marginBottom: 70,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#DE3B4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  leaveChurchGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  leaveChurchIcon: {
    marginRight: 10,
  },
  leaveChurchText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  imageContainer: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    height: 220,
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  imageTextContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  churchType: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  churchLocation: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    justifyContent: "flex-end",
  },
  churchImage: {
    width: "100%",
    height: "100%",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginRight: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(203, 213, 225, 0.7)",
  },
  actionSectionContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  quickActionsScrollContainer: {
    paddingBottom: 8,
    paddingRight: 16,
  },
  quickActionCard: {
    width: 160,
    height: 150,
    borderRadius: 20,
    marginRight: 12,
    overflow: "hidden",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionGradient: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  quickActionIcon: {
    marginBottom: 14,
  },
  quickActionTextContainer: {
    marginTop: "auto",
  },
  quickActionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  quickActionDescription: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "500",
  },
  iconGradient: {
    width: 52,
    height: 52,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});