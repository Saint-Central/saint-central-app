import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Header from "../components/Header";
import PostList from "../components/PostList";
import useFeed from "../hooks/useFeed";
import { LinearGradient } from "expo-linear-gradient";

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

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Toggle filter dropdown
  const toggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Header with animation */}
        <Header title={getHeaderTitle()} scrollY={scrollY} />

        {/* Post List */}
        <PostList
          posts={posts}
          currentUserId={currentUserId}
          onLike={handleLikePost}
          isLoading={isLoading}
          scrollY={scrollY}
        />

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fabContainer} activeOpacity={0.9}>
          <LinearGradient
            colors={["#1DA1F2", "#0077B5"]}
            style={styles.fab}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#1DA1F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default FeedScreen;
