import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Header from "../components/Header";
import PostList from "../components/PostList";
import useFeed from "../hooks/useFeed";

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

  // Toggle filter dropdown
  const toggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <Header
          title={getHeaderTitle()}
          showFilterDropdown={showFilterDropdown}
          toggleFilterDropdown={toggleFilterDropdown}
          currentFilter={filter}
          onFilterChange={setFilter}
        />

        {/* Post List */}
        <PostList
          posts={posts}
          currentUserId={currentUserId}
          onLike={handleLikePost}
          isLoading={isLoading}
        />

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab}>
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#F7F9FA", // Light background similar to Twitter
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1DA1F2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default FeedScreen;
