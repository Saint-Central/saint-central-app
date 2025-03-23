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
          <View style={styles.sidebarHeader}>
            <TouchableOpacity
              onPress={toggleSidebar}
              style={styles.closeButton}
            >
              <Feather name="x" size={24} color="#1DA1F2" />
            </TouchableOpacity>
            <Text style={styles.sidebarTitle}>Menu</Text>
          </View>

          <View style={styles.sidebarContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/Lent2025")}
            >
              <Feather name="calendar" size={24} color="#1DA1F2" />
              <Text style={styles.menuItemText}>Lent 2025</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/Rosary")}
            >
              <Feather name="circle" size={24} color="#1DA1F2" />
              <Text style={styles.menuItemText}>Rosary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/events")}
            >
              <Feather name="calendar" size={24} color="#1DA1F2" />
              <Text style={styles.menuItemText}>Events</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/bible")}
            >
              <Feather name="book" size={24} color="#1DA1F2" />
              <Text style={styles.menuItemText}>Bible</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigateToScreen("/donate")}
            >
              <Feather name="heart" size={24} color="#1DA1F2" />
              <Text style={styles.menuItemText}>Donation</Text>
            </TouchableOpacity>
          </View>
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
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E8ED",
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E8ED",
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 18,
    color: "#333",
  },
});

export default FeedScreen;
