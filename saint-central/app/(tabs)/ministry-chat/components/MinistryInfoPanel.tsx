import React from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { SharedValue, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { styles } from "../styles";
import { Ministry } from "../types";
import theme from "../../../../theme";

interface MinistryInfoPanelProps {
  ministry: Ministry | null;
  isMember: boolean;
  infoSlideAnim: SharedValue<number>;
  SCREEN_WIDTH: number;
  infoSlideStyle: any;
  toggleMinistryInfo: () => void;
  renderMinistryAvatar: () => JSX.Element;
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
}: MinistryInfoPanelProps) => {
  if (!ministry) return null;

  const confirmLeaveMinistry = () => {
    Alert.alert(
      "Leave Ministry",
      "Are you sure you want to leave this ministry? You will no longer receive messages or notifications.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: handleLeaveMinistry,
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <Animated.View style={[styles.ministryInfoPanel, infoSlideStyle]}>
      <View style={styles.ministryInfoContainer}>
        {/* Header */}
        <View style={styles.ministryInfoHeader}>
          <TouchableOpacity style={styles.closeInfoButton} onPress={toggleMinistryInfo}>
            <Ionicons name="close" size={24} color={theme.neutral700} />
          </TouchableOpacity>
          <Text style={styles.ministryInfoTitle}>Ministry Info</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.ministryInfoContent}>
            {/* Ministry avatar */}
            <MotiView
              style={styles.ministryInfoAvatar}
              from={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 100 }}
            >
              {renderMinistryAvatar()}
            </MotiView>

            {/* Ministry name and member count */}
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", delay: 200, duration: 300 }}
            >
              <Text style={styles.ministryInfoName}>{ministry.name}</Text>
              <Text style={styles.ministryInfoMembers}>
                {ministry.member_count || 0} {ministry.member_count === 1 ? "member" : "members"}
              </Text>
            </MotiView>

            {/* Ministry description */}
            <MotiView
              style={styles.ministryInfoDescriptionContainer}
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", delay: 300 }}
            >
              <Text style={styles.ministryInfoDescriptionTitle}>Description</Text>
              <Text style={styles.ministryInfoDescription}>
                {ministry.description || "No description available."}
              </Text>
            </MotiView>

            {/* Leave ministry button */}
            {isMember && (
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", delay: 400, duration: 300 }}
              >
                <TouchableOpacity style={styles.leaveMinistryButton} onPress={confirmLeaveMinistry}>
                  <Text style={styles.leaveMinistryButtonText}>Leave Ministry</Text>
                </TouchableOpacity>
              </MotiView>
            )}
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
};

export default React.memo(MinistryInfoPanel);
