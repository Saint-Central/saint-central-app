import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { styles } from "../styles";
import theme from "../../../../theme";

interface MessageInputAreaProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onFocus: () => void;
  onBlur: () => void;
  messageListRef: React.RefObject<Animated.FlatList<any>>;
}

const MessageInputArea = ({
  value,
  onChangeText,
  onSend,
  onFocus,
  onBlur,
  messageListRef,
}: MessageInputAreaProps) => {
  const [localValue, setLocalValue] = useState(value);
  const [inputHeight, setInputHeight] = useState(40);
  const inputLocalRef = useRef<TextInput>(null);

  // Animation value for send button
  const sendButtonScale = useSharedValue(1);

  // Animated styles for send button
  const sendButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sendButtonScale.value }],
    };
  });

  // Synchronize with parent state only when necessary
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(40, height), 120);
    setInputHeight(newHeight);
  };

  const handleLocalChange = (text: string) => {
    setLocalValue(text);
    // Update parent state directly
    onChangeText(text);
  };

  const handleSend = () => {
    if (!localValue.trim()) return;

    // Animate button press - simplified animation
    sendButtonScale.value = withSpring(0.9);
    setTimeout(() => {
      sendButtonScale.value = withSpring(1);
    }, 100);

    // Haptic feedback
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onSend();
    setLocalValue("");

    // Better focus management
    inputLocalRef.current?.focus();

    // Ensure we scroll to the bottom after sending
    setTimeout(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollToEnd({ animated: true });
      }
    }, 150);
  };

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity
        style={styles.attachButton}
        activeOpacity={0.7}
        onPress={() => {
          inputLocalRef.current?.focus();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
      </TouchableOpacity>

      <TextInput
        ref={inputLocalRef}
        style={[styles.messageInput, { height: inputHeight }]}
        placeholder="Type a message..."
        placeholderTextColor={theme.neutral400}
        value={localValue}
        onChangeText={handleLocalChange}
        onContentSizeChange={handleContentSizeChange}
        multiline
        maxLength={1000}
        onFocus={onFocus}
        onBlur={onBlur}
        blurOnSubmit={false}
        contextMenuHidden={false}
        keyboardType="default"
        textAlignVertical="center"
        autoCapitalize="sentences"
        returnKeyType="default"
        enablesReturnKeyAutomatically={false}
        selectionColor={theme.primary}
      />

      <Animated.View style={sendButtonStyle}>
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            !localValue.trim() && styles.sendButtonDisabled,
            pressed && localValue.trim() && styles.sendButtonPressed,
          ]}
          onPress={handleSend}
          disabled={!localValue.trim()}
        >
          <Ionicons
            name="paper-plane"
            size={20}
            color={localValue.trim() ? theme.neutral50 : theme.neutral400}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default React.memo(
  MessageInputArea,
  (prevProps, nextProps) => prevProps.value === nextProps.value,
);
