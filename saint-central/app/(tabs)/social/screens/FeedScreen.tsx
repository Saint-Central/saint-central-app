import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  TouchableOpacity,
  Text,
  Dimensions,
  BackHandler,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Header from "../components/Header";
import PostList from "../components/PostList";
import useFeed from "../hooks/useFeed";
import { router } from "expo-router";
import { Post } from "../types";

const SIDEBAR_WIDTH = Dimensions.get("window").width * 0.8;

const FeedScreen: React.FC = () => {
  const {
    posts,
    isLoading,
    filter,
    setFilter,
    currentUserId,
    handleLikePost,
    getHeaderTitle,
  } = useFeed();

  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Animation value for sidebar position
  const sidebarPosition = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Handle Android back button
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (sidebarVisible) {
          toggleSidebar();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [sidebarVisible]);

  const toggleSidebar = () => {
    if (sidebarVisible) {
      // Hide sidebar
      Animated.parallel([
        Animated.timing(sidebarPosition, {
          toValue: -SIDEBAR_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSidebarVisible(false);
      });
    } else {
      // Show sidebar
      setSidebarVisible(true);
      Animated.parallel([
        Animated.timing(sidebarPosition, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const navigateToScreen = (screen: string) => {
    toggleSidebar();
    router.push(screen as any);
  };

  const navigateToComments = (postData: Post) => {
    router.push({
      pathname: "/social/screens/CommentsScreen",
      params: { postData: JSON.stringify(postData) },
    });
  };

  const renderSidebar = () => {
    if (!sidebarVisible) return null;

    return (
      <>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
              display: sidebarVisible ? "flex" : "none",
            },
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={toggleSidebar}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: sidebarPosition }],
              paddingTop: insets.top,
            },
          ]}
        >
          {/* User Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Feather name="user" size={30} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.profileName}>Your Name</Text>
            <Text style={styles.profileUsername}>@username</Text>
          </View>

          <View style={styles.divider} />

          {/* Menu Items */}
          <ScrollView
            style={styles.sidebarContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Main Menu</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/Lent2025")}
            >
              <View style={styles.menuIconContainer}>
                <Feather name="calendar" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Lent 2025</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/Rosary")}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: "#9B82F7" },
                ]}
              >
                <Feather name="circle" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Rosary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/events")}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: "#F5A623" },
                ]}
              >
                <Feather name="calendar" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Events</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Resources</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/bible")}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: "#50C878" },
                ]}
              >
                <Feather name="book" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Bible</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/donate")}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: "#FF6B6B" },
                ]}
              >
                <Feather name="heart" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Donation</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Close Button - Floating at bottom */}
          <TouchableOpacity
            onPress={toggleSidebar}
            style={styles.closeButtonContainer}
          >
            <View style={styles.closeButtonCircle}>
              <Feather name="x" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Header
        title={getHeaderTitle()}
        scrollY={scrollY}
        showMenuIcon={true}
        onMenuPress={toggleSidebar}
      />

      <PostList
        posts={posts}
        currentUserId={currentUserId}
        onLike={handleLikePost}
        isLoading={isLoading}
        scrollY={scrollY}
        onCommentPress={navigateToComments}
      />

      {renderSidebar()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 100,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#FFFFFF",
    zIndex: 101,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  profileSection: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1DA1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: "#718096",
  },
  divider: {
    height: 1,
    backgroundColor: "#E1E8ED",
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sidebarContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#718096",
    marginLeft: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1DA1F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  closeButtonContainer: {
    position: "absolute",
    bottom: 40,
    right: -20,
    zIndex: 102,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1DA1F2",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default FeedScreen;
