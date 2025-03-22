import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
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
        <StatusBar barStyle="light-content" />

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
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
});

export default FeedScreen;
