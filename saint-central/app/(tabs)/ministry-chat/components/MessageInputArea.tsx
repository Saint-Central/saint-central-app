import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  SlideInUp,
  ZoomIn,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
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

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

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
  const [isSendActive, setIsSendActive] = useState(false);
  const inputLocalRef = useRef<TextInput>(null);

  // Animation values
  const sendButtonScale = useSharedValue(1);
  const attachButtonRotation = useSharedValue(0);
  const inputFocusAnim = useSharedValue(0);

  // Animated styles
  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const attachButtonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${attachButtonRotation.value * 45}deg` }],
  }));

  const inputContainerStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      inputFocusAnim.value > 0 ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.8)",
      { duration: 300 },
    ),
    transform: [
      {
        translateY: withTiming(inputFocusAnim.value * -5, { duration: 200 }),
      },
    ],
    shadowOpacity: withTiming(inputFocusAnim.value > 0 ? 0.15 : 0.08, { duration: 300 }),
    shadowRadius: withTiming(inputFocusAnim.value > 0 ? 8 : 4, { duration: 300 }),
  }));

  // Synchronize with parent state
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  // Update send button active state
  useEffect(() => {
    setIsSendActive(!!localValue.trim());
  }, [localValue]);

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(40, height), 120);
    setInputHeight(newHeight);
  };

  const handleLocalChange = (text: string) => {
    setLocalValue(text);
    onChangeText(text);
  };

  const handleSend = () => {
    if (!localValue.trim()) return;

    // Animate button press with spring effect
    sendButtonScale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );

    // Haptic feedback based on platform
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onSend();
    setLocalValue("");

    // Focus input after sending
    inputLocalRef.current?.focus();

    // Scroll to bottom with a slight delay for better UX
    setTimeout(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleFocus = () => {
    onFocus();

    // Animate input focus
    inputFocusAnim.value = withTiming(1, { duration: 300 });

    // Rotate attachment button
    attachButtonRotation.value = withTiming(1, { duration: 300 });
  };

  const handleBlur = () => {
    onBlur();

    // Animate input blur
    inputFocusAnim.value = withTiming(0, { duration: 250 });

    // Rotate attachment button back
    attachButtonRotation.value = withTiming(0, { duration: 250 });
  };

  const handleAttachmentPress = () => {
    inputLocalRef.current?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate attachment button
    attachButtonRotation.value = withSequence(
      withTiming(0.5, { duration: 150 }),
      withTiming(0, { duration: 150 }),
    );
  };

  return (
    <Animated.View
      style={[styles.inputContainer, inputContainerStyle]}
      entering={SlideInUp.springify()}
    >
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 300 }}
      >
        <Animated.View style={attachButtonStyle}>
          <TouchableOpacity
            style={styles.attachButton}
            activeOpacity={0.7}
            onPress={handleAttachmentPress}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
        </Animated.View>
      </MotiView>

      <Animated.View entering={FadeIn.delay(100)} style={{ flex: 1 }}>
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
          onFocus={handleFocus}
          onBlur={handleBlur}
          blurOnSubmit={false}
          contextMenuHidden={false}
          keyboardType="default"
          textAlignVertical="center"
          autoCapitalize="sentences"
          returnKeyType="default"
          enablesReturnKeyAutomatically={true}
          selectionColor={theme.primary}
        />
      </Animated.View>

      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", delay: 200 }}
      >
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
      </MotiView>
    </Animated.View>
  );
};

export default React.memo(
  MessageInputArea,
  (prevProps, nextProps) => prevProps.value === nextProps.value,
);
