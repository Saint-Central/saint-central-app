import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function CreateGroupScreen() {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [isMinistryGroup, setIsMinistryGroup] = useState(false);
  const [groupPrivacy, setGroupPrivacy] = useState("public"); // public, private, invite-only

  const handleCreateGroup = async () => {
    if (!user) return;

    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a group description");
      return;
    }

    try {
      setLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Create the group
      const groupData = await crud.insert("groups", {
        name: groupName.trim(),
        description: description.trim(),
        created_by: user.id,
        is_ministry_group: isMinistryGroup,
        // You might want to add privacy settings and church_id if applicable
      });

      Alert.alert(
        "Success",
        "Your prayer group has been created!",
        [
          {
            text: "View Group",
            onPress: () => router.replace(`/prayer-social/group/${groupData.id}` as any),
          },
        ]
      );
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with SafeArea */}
          <SafeAreaView style={styles.headerSafeArea}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create Prayer Group</Text>
              <View style={styles.placeholder} />
            </View>
          </SafeAreaView>

          <View style={styles.content}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.heroGradient}
              >
                <Ionicons name="people-circle" size={64} color="#FFFFFF" />
                <Text style={styles.heroText}>
                  Create a space for your prayer community
                </Text>
              </LinearGradient>
            </View>

            {/* Group Name */}
            <View style={styles.section}>
              <Text style={styles.label}>Group Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your group name"
                placeholderTextColor="#9CA3AF"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={50}
              />
              <Text style={styles.charCount}>
                {groupName.length}/50 characters
              </Text>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What is your group about? What kind of prayers will you share?"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={styles.charCount}>
                {description.length}/200 characters
              </Text>
            </View>

            {/* Group Type */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <View style={styles.switchHeader}>
                    <FontAwesome5 name="church" size={20} color="#6366F1" />
                    <Text style={styles.switchLabel}>Ministry Group</Text>
                  </View>
                  <Text style={styles.switchDescription}>
                    This is an official church ministry group
                  </Text>
                </View>
                <Switch
                  value={isMinistryGroup}
                  onValueChange={setIsMinistryGroup}
                  trackColor={{ false: "#CBD5E1", true: "#6366F1" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Privacy Settings */}
            <View style={styles.section}>
              <Text style={styles.label}>Group Privacy</Text>
              
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  groupPrivacy === "public" && styles.selectedPrivacyOption,
                ]}
                onPress={() => setGroupPrivacy("public")}
              >
                <View style={styles.privacyIcon}>
                  <Ionicons name="globe-outline" size={24} color="#6366F1" />
                </View>
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>Public</Text>
                  <Text style={styles.privacyDescription}>
                    Anyone can find and join this group
                  </Text>
                </View>
                {groupPrivacy === "public" && (
                  <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  groupPrivacy === "private" && styles.selectedPrivacyOption,
                ]}
                onPress={() => setGroupPrivacy("private")}
              >
                <View style={styles.privacyIcon}>
                  <Ionicons name="lock-closed-outline" size={24} color="#6366F1" />
                </View>
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>Private</Text>
                  <Text style={styles.privacyDescription}>
                    Only members can see group content
                  </Text>
                </View>
                {groupPrivacy === "private" && (
                  <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  groupPrivacy === "invite-only" && styles.selectedPrivacyOption,
                ]}
                onPress={() => setGroupPrivacy("invite-only")}
              >
                <View style={styles.privacyIcon}>
                  <Ionicons name="mail-outline" size={24} color="#6366F1" />
                </View>
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>Invite Only</Text>
                  <Text style={styles.privacyDescription}>
                    People can only join by invitation
                  </Text>
                </View>
                {groupPrivacy === "invite-only" && (
                  <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
                )}
              </TouchableOpacity>
            </View>

            {/* Guidelines */}
            <View style={styles.guidelinesSection}>
              <Text style={styles.guidelinesTitle}>Group Guidelines</Text>
              <View style={styles.guideline}>
                <Ionicons name="heart" size={16} color="#6366F1" />
                <Text style={styles.guidelineText}>
                  Be respectful and supportive of all prayer requests
                </Text>
              </View>
              <View style={styles.guideline}>
                <Ionicons name="shield-checkmark" size={16} color="#6366F1" />
                <Text style={styles.guidelineText}>
                  Keep all shared prayers confidential
                </Text>
              </View>
              <View style={styles.guideline}>
                <Ionicons name="people" size={16} color="#6366F1" />
                <Text style={styles.guidelineText}>
                  Foster a welcoming community of faith
                </Text>
              </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateGroup}
              disabled={loading}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.createGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.createText}>Create Prayer Group</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardView: {
    flex: 1,
  },
  headerSafeArea: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroGradient: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
  },
  heroText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 12,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "right",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  switchDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  selectedPrivacyOption: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  privacyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  privacyInfo: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  privacyDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  guidelinesSection: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 12,
  },
  guideline: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  guidelineText: {
    flex: 1,
    fontSize: 14,
    color: "#4F46E5",
    lineHeight: 20,
  },
  createButton: {
    marginTop: 8,
  },
  createGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  createText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});