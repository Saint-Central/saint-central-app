import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import PostList from "../components/PostList";
import useFeed from "../hooks/useFeed";
import { router } from "expo-router";
import { Post } from "../types";

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

  const navigateToComments = (postData: Post) => {
    router.push({
      pathname: "/social/screens/CommentsScreen",
      params: { postData: JSON.stringify(postData) },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Header title={getHeaderTitle()} scrollY={scrollY} />

      <PostList
        posts={posts}
        currentUserId={currentUserId}
        onLike={handleLikePost}
        isLoading={isLoading}
        scrollY={scrollY}
        onCommentPress={navigateToComments}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});

export default FeedScreen;
