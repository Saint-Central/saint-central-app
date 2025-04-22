import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  SlideInRight,
  SlideInLeft,
  FadeIn,
  Layout,
  Easing,
  ZoomIn,
  interpolateColor,
  useSharedValue,
} from "react-native-reanimated";
import { MotiView } from "moti";
import { styles } from "../styles";
import { Message, User } from "../types";
import { formatMessageTime } from "../utils/formatting";
import theme from "../../../../theme";

// Message item component
interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  renderUserAvatar: (user?: User) => JSX.Element;
  index: number;
  totalInGroup?: number;
}

const MessageItem = ({
  message,
  isCurrentUser,
  renderUserAvatar,
  index,
  totalInGroup = 1,
}: MessageItemProps): JSX.Element => {
  const isSending = message._status === "sending";
  const isError = message._status === "error";
  const highlightAnim = useSharedValue(0);

  // Calculate animation delay based on position in group
  const animationDelay = useMemo(() => {
    return Math.min(index * 50, 300);
  }, [index]);

  // Determine appropriate entrance animation
  const enterAnimation = useMemo(() => {
    return isCurrentUser
      ? SlideInRight.delay(animationDelay).springify().duration(400)
      : SlideInLeft.delay(animationDelay).springify().duration(400);
  }, [isCurrentUser, animationDelay]);

  // Animated bubble styles with highlight effect
  const bubbleStyle = useAnimatedStyle(() => {
    const backgroundColor = isCurrentUser
      ? interpolateColor(
          highlightAnim.value,
          [0, 0.5, 1],
          [theme.primary, theme.secondary, theme.primary],
        )
      : theme.neutral50;

    return {
      opacity: withTiming(1, { duration: 300 }),
      backgroundColor,
      transform: [
        {
          translateY: withTiming(0, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
        },
        {
          scale: withTiming(1, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
        },
      ],
    };
  });

  // Status icon animation
  const statusIconStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 500 }),
      transform: [{ scale: withTiming(1, { duration: 500 }) }],
    };
  });

  return (
    <Animated.View
      entering={enterAnimation}
      layout={Layout.springify()}
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
    >
      {!isCurrentUser && (
        <MotiView
          style={styles.messageAvatar}
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 300, delay: animationDelay }}
        >
          {renderUserAvatar(message.user)}
        </MotiView>
      )}

      <Animated.View
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isSending && styles.sendingMessage,
          isError && styles.errorMessage,
          bubbleStyle,
        ]}
      >
        {!isCurrentUser && (
          <Animated.Text
            entering={FadeIn.delay(animationDelay).duration(200)}
            style={styles.messageUsername}
          >
            {message.user ? `${message.user.first_name} ${message.user.last_name}` : "Unknown User"}
          </Animated.Text>
        )}

        <Text
          style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText,
          ]}
        >
          {message.message_text}
        </Text>

        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isCurrentUser && styles.currentUserMessageTime]}>
            {formatMessageTime(message.sent_at)}
          </Text>

          {isCurrentUser && (
            <Animated.View style={[styles.messageStatus, statusIconStyle]}>
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={isCurrentUser ? theme.neutral100 : theme.neutral400}
                  style={styles.statusIcon}
                />
              ) : isError ? (
                <MotiView
                  from={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring" }}
                >
                  <TouchableOpacity onPress={() => Alert.alert("Message failed to send")}>
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={theme.error}
                      style={styles.statusIcon}
                    />
                  </TouchableOpacity>
                </MotiView>
              ) : (
                <MotiView
                  from={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring" }}
                >
                  <Ionicons
                    name="checkmark-done"
                    size={14}
                    color={isCurrentUser ? theme.neutral100 : theme.primary}
                    style={styles.statusIcon}
                  />
                </MotiView>
              )}
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default React.memo(MessageItem);
