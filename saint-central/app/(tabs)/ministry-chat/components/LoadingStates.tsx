import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";
import theme from "../../../../theme";

interface LoadingScreenProps {
  loadingIndicatorStyle: any;
}

export const LoadingScreen = ({ loadingIndicatorStyle }: LoadingScreenProps): JSX.Element => (
  <View style={styles.loadingContainer}>
    <Animated.View style={loadingIndicatorStyle}>
      <ActivityIndicator size="large" color={theme.primary} />
    </Animated.View>
    <Animated.Text entering={FadeIn.duration(400)} style={styles.loadingText}>
      Loading ministry chat...
    </Animated.Text>
  </View>
);

interface ErrorScreenProps {
  error: Error | null;
  fadeStyle: any;
  navigateBack: () => void;
}

export const ErrorScreen = ({ error, fadeStyle, navigateBack }: ErrorScreenProps): JSX.Element => (
  <Animated.View style={[styles.errorContainer, fadeStyle]} entering={FadeIn.duration(500)}>
    <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
    <Text style={styles.errorTitle}>Something went wrong</Text>
    <Text style={styles.errorText}>{error?.message || "Could not load ministry information"}</Text>
    <TouchableOpacity style={styles.errorButton} onPress={navigateBack}>
      <Text style={styles.errorButtonText}>Go Back</Text>
    </TouchableOpacity>
  </Animated.View>
);

export const EmptyMessagesScreen = (): JSX.Element => (
  <Animated.View style={styles.emptyMessagesContainer} entering={FadeIn.duration(600)}>
    <LinearGradient colors={theme.gradientPrimary} style={styles.emptyMessagesIcon}>
      <FontAwesome5 name="comment-dots" size={40} color={theme.neutral50} />
    </LinearGradient>
    <Text style={styles.emptyMessagesTitle}>No Messages Yet</Text>
    <Text style={styles.emptyMessagesSubtitle}>Be the first to start a conversation!</Text>
  </Animated.View>
);

interface MessageLoadingProps {
  loadingIndicatorStyle: any;
}

export const MessageLoading = ({ loadingIndicatorStyle }: MessageLoadingProps): JSX.Element => (
  <Animated.View
    style={[styles.messageLoadingContainer, loadingIndicatorStyle]}
    entering={FadeIn.duration(400)}
  >
    <ActivityIndicator size="large" color={theme.primary} />
    <Text style={styles.messageLoadingText}>Loading messages...</Text>
  </Animated.View>
);

export const LoadMoreHeader = (): JSX.Element => (
  <View style={styles.loadMoreHeader}>
    <ActivityIndicator size="small" color={theme.primary} />
    <Text style={styles.loadMoreText}>Loading older messages...</Text>
  </View>
);
