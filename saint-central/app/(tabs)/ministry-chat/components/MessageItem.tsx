import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  SlideInRight,
  Layout,
  Easing,
} from "react-native-reanimated";
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
}

const MessageItem = ({
  message,
  isCurrentUser,
  renderUserAvatar,
  index,
}: MessageItemProps): JSX.Element => {
  const isSending = message._status === "sending";
  const isError = message._status === "error";

  // Animated bubble styles
  const bubbleStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 300 }),
      transform: [
        {
          translateY: withTiming(0, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
        },
      ],
    };
  });

  return (
    <Animated.View
      entering={SlideInRight.duration(300)
        .delay(index * 50)
        .springify()}
      layout={Layout.springify()}
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
    >
      {!isCurrentUser && <View style={styles.messageAvatar}>{renderUserAvatar(message.user)}</View>}

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
          <Text style={styles.messageUsername}>
            {message.user ? `${message.user.first_name} ${message.user.last_name}` : "Unknown User"}
          </Text>
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
            <View style={styles.messageStatus}>
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={isCurrentUser ? theme.neutral100 : theme.neutral400}
                  style={styles.statusIcon}
                />
              ) : isError ? (
                <TouchableOpacity onPress={() => Alert.alert("Message failed to send")}>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={theme.error}
                    style={styles.statusIcon}
                  />
                </TouchableOpacity>
              ) : (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={isCurrentUser ? theme.neutral100 : theme.primary}
                  style={styles.statusIcon}
                />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default React.memo(MessageItem);
