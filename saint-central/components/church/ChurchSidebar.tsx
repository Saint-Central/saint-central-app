import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
  Image,
  ImageBackground,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
  Feather,
  AntDesign,
} from "@expo/vector-icons";
import theme from "@/theme";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  profileImage: string | null;
}

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.85;

export default function ChurchSidebar({
  isOpen,
  onClose,
  userName,
  profileImage,
}: SidebarProps): JSX.Element {
  const navigation = useNavigation();
  const [visibilityFlag, setVisibilityFlag] = useState(false);
  const animationProgress = useSharedValue(0);

  // Create animated styles - IMPORTANT: these must be called every render
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: animationProgress.value,
      zIndex: 1000,
      pointerEvents: isOpen ? ("auto" as const) : ("none" as const),
    };
  });

  const sidebarStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animationProgress.value,
      [0, 1],
      [-SIDEBAR_WIDTH, 0],
      Extrapolate.CLAMP,
    );

    return {
      transform: [{ translateX }],
    };
  });

  // Animation controls
  useEffect(() => {
    if (isOpen) {
      setVisibilityFlag(true);
      animationProgress.value = withTiming(1, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      const hideComponent = () => {
        setVisibilityFlag(false);
      };

      animationProgress.value = withTiming(
        0,
        {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(hideComponent)();
          }
        },
      );
    }
  }, [isOpen, animationProgress]);

  // Navigate to different sections
  const navigateTo = (screen: string) => {
    onClose();
    // Add delay to make sure sidebar is closed before navigation
    setTimeout(() => {
      navigation.navigate(screen as never);
    }, 300);
  };

  // Render null with a wrapper component if not visible
  if (!visibilityFlag && !isOpen) {
    return <View style={{ display: "none" }} />;
  }

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Backdrop for clicking outside to close */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Sidebar Panel */}
      <Animated.View style={[styles.sidebar, sidebarStyle]}>
        <View style={styles.sidebarContent}>
          {/* Header with Background Image - includes the safe area */}
          <View style={styles.headerContainer}>
            {/* Safe Area Space with Matching Background */}
            <View style={styles.safeAreaSpacer} />

            {/* Image Background */}
            <ImageBackground
              source={require("../../assets/images/Jesus.png")}
              style={styles.headerBackground}
              resizeMode="cover"
            >
              <View style={styles.headerOverlay}>
                <View style={styles.userInfoContainer}>
                  {/* Profile Image or Initial */}
                  {profileImage ? (
                    <View style={styles.profileImageContainer}>
                      <Image
                        source={{ uri: profileImage }}
                        style={styles.profilePic}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <View style={styles.profileImageContainer}>
                      <View style={styles.profilePic}>
                        <Text style={styles.profileInitial}>
                          {userName ? userName[0].toUpperCase() : "?"}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* User Name */}
                  <Text style={styles.userName}>Welcome, {userName || "Friend"}</Text>
                </View>

                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <AntDesign name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
            {/* Lent 2025 Section */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("Lent2025")}>
              <View style={styles.menuIconContainer}>
                <LinearGradient
                  colors={[theme.secondary, theme.accent2]}
                  style={[styles.iconGradient, styles.muted]}
                >
                  <FontAwesome5 name="bible" size={22} color={theme.textWhite} />
                </LinearGradient>
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Daily Goals</Text>
                <Text style={styles.menuDescription}>Track your spiritual journey</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>

            {/* Rosary Section */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo("rosary/screens/RosaryHome")}
            >
              <View style={styles.menuIconContainer}>
                <LinearGradient
                  colors={[theme.tertiary, theme.accent2]}
                  style={[styles.iconGradient, styles.muted]}
                >
                  <FontAwesome5 name="praying-hands" size={22} color={theme.textWhite} />
                </LinearGradient>
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Rosary</Text>
                <Text style={styles.menuDescription}>Prayers and meditations</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>

            {/* Events Section */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("events")}>
              <View style={styles.menuIconContainer}>
                <LinearGradient
                  colors={[theme.info, theme.accent1]}
                  style={[styles.iconGradient, styles.muted]}
                >
                  <FontAwesome5 name="calendar-alt" size={22} color={theme.textWhite} />
                </LinearGradient>
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Events</Text>
                <Text style={styles.menuDescription}>Upcoming church activities</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>

            {/* Donations Section */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("donate")}>
              <View style={styles.menuIconContainer}>
                <LinearGradient
                  colors={[theme.success, theme.accent3]}
                  style={[styles.iconGradient, styles.muted]}
                >
                  <FontAwesome5 name="heart" size={22} color={theme.textWhite} />
                </LinearGradient>
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Donations</Text>
                <Text style={styles.menuDescription}>Support our ministries</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Additional Menu Items */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateTo("MinistriesScreen")}
            >
              <View style={styles.menuIconContainer}>
                <FontAwesome5 name="church" size={20} color={theme.textMedium} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Ministries</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("courses")}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="book-outline" size={20} color={theme.textMedium} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Courses</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("schedule")}>
              <View style={styles.menuIconContainer}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color={theme.textMedium} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Mass Schedule</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("community")}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="people" size={20} color={theme.textMedium} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Community</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("settings")}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="settings-outline" size={20} color={theme.textMedium} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Settings</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textLight} />
            </TouchableOpacity>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                /* Handle logout */
              }}
            >
              <Feather name="log-out" size={18} color={theme.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
    height: "100%",
    left: 0,
    top: 0,
  },
  backdrop: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: theme.overlay,
  },
  sidebar: {
    position: "absolute",
    width: SIDEBAR_WIDTH,
    height: "100%",
    left: 0,
    backgroundColor: "#FFFFFF",
    shadowColor: theme.neutral900,
    shadowOffset: {
      width: 5,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  sidebarContent: {
    flex: 1,
  },
  headerContainer: {
    width: "100%",
  },
  safeAreaSpacer: {
    height: Platform.OS === "ios" ? 47 : StatusBar.currentHeight || 0,
    backgroundColor: "rgba(45, 36, 31, 0.4)",
    width: "100%",
  },
  headerBackground: {
    width: "100%",
    height: 220,
  },
  headerOverlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(45, 36, 31, 0.4)",
    paddingTop: 70, // Increased padding to move content down more
    paddingBottom: 20,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  userInfoContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profilePic: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  profileInitial: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    textShadowColor: "rgba(45, 36, 31, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 70, // Move button down to match content
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    marginTop: -20,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4.5,
    elevation: 3,
  },
  muted: {
    opacity: 0.75,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textDark,
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: theme.textMedium,
  },
  divider: {
    height: 1,
    backgroundColor: theme.divider,
    marginVertical: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(188, 108, 100, 0.15)",
  },
  logoutText: {
    marginLeft: 8,
    color: theme.error,
    fontWeight: "600",
  },
});
