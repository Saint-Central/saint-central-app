import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  interpolate,
  withSpring,
  runOnJS,
  FadeIn,
  BounceIn,
  SlideInRight,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { styles } from "../styles";
import { Ministry } from "../types";
import theme from "../../../../theme";

interface MinistryInfoPanelProps {
  ministry: Ministry | null;
  isMember: boolean;
  infoSlideAnim: Animated.SharedValue<number>;
  SCREEN_WIDTH: number;
  infoSlideStyle: any;
  toggleMinistryInfo: () => void;
  renderMinistryAvatar: () => React.ReactNode;
  handleLeaveMinistry: () => void;
  visible: boolean;
}

const MinistryInfoPanel = ({
  ministry,
  isMember,
  infoSlideAnim,
  SCREEN_WIDTH,
  infoSlideStyle,
  toggleMinistryInfo,
  renderMinistryAvatar,
  handleLeaveMinistry,
  visible,
}: MinistryInfoPanelProps): JSX.Element => {
  // Gesture handler for swiping panel
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX > 0) {
        const newValue = Math.max(0, 1 - e.translationX / SCREEN_WIDTH);
        infoSlideAnim.value = newValue;
      }
    })
    .onEnd((e) => {
      if (e.translationX > SCREEN_WIDTH * 0.4) {
        infoSlideAnim.value = withSpring(0);
        runOnJS(toggleMinistryInfo)();
      } else {
        infoSlideAnim.value = withSpring(1);
      }
    });

  return (
    <Animated.View
      style={[styles.ministryInfoPanel, infoSlideStyle, { display: visible ? "flex" : "none" }]}
    >
      <GestureDetector gesture={panGesture}>
        <View style={styles.ministryInfoContainer}>
          <View style={styles.ministryInfoHeader}>
            <TouchableOpacity
              style={styles.closeInfoButton}
              onPress={toggleMinistryInfo}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.ministryInfoTitle}>Ministry Details</Text>
          </View>

          <View style={styles.ministryInfoContent}>
            <Animated.View
              style={styles.ministryInfoAvatar}
              entering={BounceIn.delay(100).duration(600)}
            >
              {renderMinistryAvatar()}
            </Animated.View>

            <Animated.Text
              style={styles.ministryInfoName}
              entering={FadeIn.delay(300).duration(500)}
            >
              {ministry?.name}
            </Animated.Text>

            <Animated.Text
              style={styles.ministryInfoMembers}
              entering={FadeIn.delay(400).duration(500)}
            >
              {ministry?.member_count || 0} {ministry?.member_count === 1 ? "member" : "members"}
            </Animated.Text>

            <Animated.View
              style={styles.ministryInfoDescriptionContainer}
              entering={SlideInRight.delay(500).duration(500).springify()}
            >
              <Text style={styles.ministryInfoDescriptionTitle}>About</Text>
              <Text style={styles.ministryInfoDescription}>
                {ministry?.description || "No description available."}
              </Text>
            </Animated.View>

            {isMember && (
              <Animated.View entering={FadeIn.delay(600).duration(500)}>
                <TouchableOpacity
                  style={styles.leaveMinistryButton}
                  onPress={handleLeaveMinistry}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaveMinistryButtonText}>Leave Ministry</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

export default MinistryInfoPanel;
