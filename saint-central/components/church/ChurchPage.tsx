import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Church, ChurchMember } from "@/types/church";
import ChurchPageContent from "@/components/church/ChurchPageContent";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import ChurchSidebar from "@/components/church/ChurchSidebar";

type Props = {
  church: Church;
  userData: { username: string; profileImage: string };
  member?: ChurchMember | null;
};

export default function ChurchPage({ church, member, userData }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const headerElevation = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 15],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ChurchSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={userData.username}
        profileImage={userData.profileImage}
      />

      {/* Floating header */}
      <Animated.View
        style={[
          styles.headerBackground,
          {
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerOpacity,
          },
        ]}
      >
        <BlurView intensity={98} tint="extraLight" style={styles.blurView} />
        <Animated.View
          style={[
            styles.floatingTitleContainer,
            {
              opacity: headerOpacity,
              transform: [
                {
                  translateY: headerOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Menu button in floating header */}
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color="#1E293B" />
          </TouchableOpacity>
          {/* Title in floating header */}
          <View style={styles.titleWrapper}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.titleAccent}
            />
            <Text style={styles.floatingTitle}>{church.name}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        <ChurchPageHeader church={church} userData={userData} onPressMenu={toggleSidebar} />
        <ChurchPageContent church={church} member={member} userData={userData} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 20 : StatusBar.currentHeight || 20,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 100 : 80,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 225, 0.5)",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingTitleContainer: {
    position: "absolute",
    width: "100%",
    paddingHorizontal: 20,
    top: Platform.OS === "ios" ? 55 : 30,
    height: 30,
    alignItems: "center",
    flexDirection: "row",
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    flex: 1,
  },
  titleAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  floatingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
