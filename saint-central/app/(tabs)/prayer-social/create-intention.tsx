import React, { useState, useEffect } from "react";
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
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface Friend {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
}

const INTENTION_TYPES = [
  { id: "prayer", label: "Prayer Request", icon: "hands", color: "#6366F1" },
  { id: "praise", label: "Praise", icon: "heart", color: "#EC4899" },
  { id: "thanksgiving", label: "Thanksgiving", icon: "gift", color: "#F59E0B" },
  { id: "intercession", label: "Intercession", icon: "people", color: "#10B981" },
];

const VISIBILITY_OPTIONS = [
  { id: "private", label: "Only Me", icon: "lock-closed", description: "Only you can see this" },
  { id: "friends", label: "Friends", icon: "people", description: "All your friends can see this" },
  { id: "groups", label: "Select Groups", icon: "people-circle", description: "Choose specific groups" },
  { id: "custom", label: "Select Friends", icon: "person-add", description: "Choose specific friends" },
];

export default function CreateIntentionScreen() {
  const { user } = useAuth();
  const crud = useCRUD();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("prayer");
  const [visibility, setVisibility] = useState("friends");
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Get dynamic intention types based on user denomination
  const getIntentionTypes = () => {
    const types = [...INTENTION_TYPES];
    // Find intercession type and update label based on denomination
    const intercessionIndex = types.findIndex(t => t.id === "intercession");
    if (intercessionIndex !== -1) {
      types[intercessionIndex] = {
        ...types[intercessionIndex],
        label: (userProfile?.denomination?.toLowerCase() === "catholic" || userProfile?.denomination?.toLowerCase() === "orthodox") ? "Intercession" : "Resolution"
      };
    }
    return types;
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (visibility === "groups") {
      loadGroups();
    } else if (visibility === "custom") {
      loadFriends();
    }
  }, [visibility]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    try {
      const profile = await crud.selectOne("users", {
        where: { id: user.id }
      });
      if (profile) {
        setUserProfile(profile);
        console.log("User profile denomination:", profile.denomination);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const loadFriends = async () => {
    if (!user) return;

    try {
      const friendships = await crud.select("friends", {
        where: { status: "accepted" },
      });

      const userFriendships = friendships.filter(f => 
        (f.user_id_1 === user.id || f.user_id_2 === user.id)
      );

      const friendsData = await Promise.all(
        userFriendships.map(async (friendship) => {
          const friendId = friendship.user_id_1 === user.id 
            ? friendship.user_id_2 
            : friendship.user_id_1;
          
          return await crud.selectOne("users", {
            where: { id: friendId },
          });
        })
      );

      setFriends(friendsData.filter(Boolean));
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const loadGroups = async () => {
    try {
      const groupsData = await crud.select("groups");
      
      // Sort by name alphabetically
      const sortedGroups = groupsData.sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setGroups(sortedGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for your prayer intention");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description for your prayer intention");
      return;
    }

    if (visibility === "groups" && selectedGroups.length === 0) {
      Alert.alert("Error", "Please select at least one group");
      return;
    }

    if (visibility === "custom" && selectedFriends.length === 0) {
      Alert.alert("Error", "Please select at least one friend");
      return;
    }

    try {
      setLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const intentionData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        type,
        visibility,
        selected_groups: visibility === "groups" ? JSON.stringify(selectedGroups) : null,
        selected_friends: visibility === "custom" ? selectedFriends : null,
        selected_church: null, // Could be implemented later
        completed: false,
        favorite: isFavorite,
      };

      await crud.insert("intentions", intentionData);

      Alert.alert(
        "Success",
        "Your prayer intention has been created",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error creating intention:", error);
      Alert.alert("Error", "Failed to create prayer intention. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupSelection = (groupId: number) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header with SafeArea */}
          <View style={styles.headerWrapper}>
            <SafeAreaView>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Prayer Intention</Text>
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => setIsFavorite(!isFavorite)}
                >
                  <Ionicons
                    name={isFavorite ? "star" : "star-outline"}
                    size={24}
                    color={isFavorite ? "#F59E0B" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.content}>
            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter a title for your prayer"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your prayer intention..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Type Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeGrid}>
                {getIntentionTypes().map((intentionType) => (
                  <TouchableOpacity
                    key={intentionType.id}
                    style={[
                      styles.typeCard,
                      type === intentionType.id && styles.selectedTypeCard,
                    ]}
                    onPress={() => setType(intentionType.id)}
                  >
                    <FontAwesome5
                      name={intentionType.icon}
                      size={24}
                      color={type === intentionType.id ? intentionType.color : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        type === intentionType.id && styles.selectedTypeText,
                      ]}
                    >
                      {intentionType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Visibility Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Who can see this?</Text>
              {VISIBILITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.visibilityOption,
                    visibility === option.id && styles.selectedVisibilityOption,
                  ]}
                  onPress={() => setVisibility(option.id)}
                >
                  <View style={styles.visibilityIcon}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={visibility === option.id ? "#6366F1" : "#6B7280"}
                    />
                  </View>
                  <View style={styles.visibilityInfo}>
                    <Text
                      style={[
                        styles.visibilityLabel,
                        visibility === option.id && styles.selectedVisibilityLabel,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.visibilityDescription}>
                      {option.description}
                    </Text>
                  </View>
                  {visibility === option.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Group Selection */}
            {visibility === "groups" && groups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Select Groups</Text>
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={styles.selectionItem}
                    onPress={() => toggleGroupSelection(group.id)}
                  >
                    <View style={styles.checkbox}>
                      {selectedGroups.includes(group.id) && (
                        <Ionicons name="checkmark" size={16} color="#6366F1" />
                      )}
                    </View>
                    <Text style={styles.selectionText}>{group.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Friend Selection */}
            {visibility === "custom" && friends.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Select Friends</Text>
                {friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.selectionItem}
                    onPress={() => toggleFriendSelection(friend.id)}
                  >
                    <View style={styles.checkbox}>
                      {selectedFriends.includes(friend.id) && (
                        <Ionicons name="checkmark" size={16} color="#6366F1" />
                      )}
                    </View>
                    <Text style={styles.selectionText}>
                      {friend.first_name} {friend.last_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.submitText}>Create Prayer Intention</Text>
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
  scrollContent: {
    paddingBottom: 100,
  },
  headerWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  favoriteButton: {
    padding: 4,
  },
  content: {
    padding: 20,
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
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  typeCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  selectedTypeCard: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  typeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
  },
  selectedTypeText: {
    color: "#4F46E5",
  },
  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  selectedVisibilityOption: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  visibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  visibilityInfo: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  selectedVisibilityLabel: {
    color: "#4F46E5",
  },
  visibilityDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectionText: {
    fontSize: 16,
    color: "#111827",
  },
  submitButton: {
    marginTop: 20,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});