import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";
import theme from "../../../../theme";
import { MotiView } from "moti";

interface LoadingScreenProps {
  loadingIndicatorStyle: any;
}

export const LoadingScreen = ({ loadingIndicatorStyle }: LoadingScreenProps): JSX.Element => (
  <View style={styles.loadingContainer}>
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", delay: 100 }}
    >
      <Animated.View style={[loadingIndicatorStyle, { padding: 20 }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </Animated.View>
    </MotiView>
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", delay: 300, duration: 400 }}
    >
      <Text style={styles.loadingText}>Loading ministry...</Text>
    </MotiView>
  </View>
);

interface ErrorScreenProps {
  error: string;
  fadeStyle?: any;
  navigateBack: () => void;
}

export const ErrorScreen = ({ error, fadeStyle, navigateBack }: ErrorScreenProps): JSX.Element => (
  <Animated.View style={[styles.errorContainer, fadeStyle]}>
    <MotiView
      from={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring" }}
    >
      <Ionicons name="alert-circle" size={60} color={theme.error} />
    </MotiView>
    <Text style={styles.errorTitle}>Uh oh!</Text>
    <Text style={styles.errorText}>{error || "Something went wrong loading the ministry."}</Text>
    <TouchableOpacity style={styles.errorButton} onPress={navigateBack}>
      <Text style={styles.errorButtonText}>Go Back</Text>
    </TouchableOpacity>
  </Animated.View>
);

export const EmptyMessagesScreen = (): JSX.Element => (
  <MotiView
    style={styles.emptyMessagesContainer}
    from={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", damping: 15 }}
  >
    <View style={styles.emptyMessagesIcon}>
      <Ionicons name="chatbubble-ellipses-outline" size={40} color={theme.primary} />
    </View>
    <Text style={styles.emptyMessagesTitle}>No messages yet</Text>
    <Text style={styles.emptyMessagesSubtitle}>
      Be the first to start a conversation in this ministry chat!
    </Text>
  </MotiView>
);

interface MessageLoadingProps {
  loadingIndicatorStyle: any;
}

export const MessageLoading = ({ loadingIndicatorStyle }: MessageLoadingProps): JSX.Element => (
  <MotiView
    style={styles.messageLoadingContainer}
    from={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ type: "timing", duration: 500 }}
  >
    <Animated.View style={[loadingIndicatorStyle, { padding: 20 }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </Animated.View>
    <Text style={styles.messageLoadingText}>Loading messages...</Text>
  </MotiView>
);

export const LoadMoreHeader = (): JSX.Element => (
  <MotiView
    style={styles.loadMoreHeader}
    from={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring" }}
  >
    <ActivityIndicator size="small" color={theme.primary} />
    <Text style={styles.loadMoreText}>Loading older messages...</Text>
  </MotiView>
);

export const AllMessagesLoaded = (): JSX.Element => (
  <MotiView
    style={styles.allMessagesLoadedContainer}
    from={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring" }}
  >
    <Ionicons name="checkmark-circle" size={16} color={theme.success} style={{ marginRight: 6 }} />
    <Text style={styles.allMessagesLoadedText}>All messages loaded</Text>
  </MotiView>
);
