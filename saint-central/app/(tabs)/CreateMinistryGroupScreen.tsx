import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  AntDesign,
} from "@expo/vector-icons";
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from "expo-linear-gradient";

// Ministry preset interface
interface MinistryPreset {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
}

// Route params interface
interface RouteParams {
  churchId?: number;
  selectedPresetId?: string;
}

// Add type definition for navigation - MUST match with MinistryGroupsScreen
type RootStackParamList = {
  // Include both possible screen names
  Ministries: undefined;
  MinistriesScreen: undefined;
  ministryGroups: undefined;
  ministryChat: { groupId: number };
  createMinistryGroup: { selectedPresetId?: string };
  // ... other screen types ...
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function CreateMinistryGroupScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;
  
  // Debug params immediately
  useEffect(() => {
    console.log("CreateMinistryGroupScreen mounted with params:", params);
    console.log("Selected preset ID:", params?.selectedPresetId);
  }, []);
  
  // Form state
  const [groupName, setGroupName] = useState<string>("");
  const [groupDescription, setGroupDescription] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(
    params?.selectedPresetId || undefined
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [churchId, setChurchId] = useState<number | null>(null);

  // Ministry presets state
  const [ministryPresets, setMinistryPresets] = useState<MinistryPreset[]>([
    { id: '1', name: 'Liturgical', icon: 'book-outline', isDefault: true },
    { id: '2', name: 'Music', icon: 'musical-notes-outline', isDefault: true },
    { id: '3', name: 'Youth', icon: 'people-outline', isDefault: true },
    { id: '4', name: 'Outreach', icon: 'hand-left-outline', isDefault: true },
    { id: '5', name: 'Education', icon: 'school-outline', isDefault: true },
    { id: '6', name: 'Service', icon: 'heart-outline', isDefault: true },
    { id: '7', name: 'Prayer', icon: 'flower-outline', isDefault: true },
  ]);

  // Fetch initial data and params
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          return;
        }

        if (!user) {
          console.error("No user logged in");
          return;
        }

        // Get church ID from route params or from user's membership
        let churchIdToUse = params?.churchId;

        if (!churchIdToUse) {
          // Fetch from membership
          const { data: memberData, error: memberError } = await supabase
            .from("church_members")
            .select("church_id")
            .eq("user_id", user.id)
            .single();

          if (memberError) {
            console.error("Error fetching membership:", memberError);
            return;
          }

          churchIdToUse = memberData.church_id;
        }

        setChurchId(churchIdToUse ?? null);

        // Load saved ministry presets from storage
        try {
          const { data: presetsData, error: presetsError } = await supabase
            .from("ministry_presets")
            .select("*")
            .eq("user_id", user.id);

          if (!presetsError && presetsData && presetsData.length > 0) {
            // Combine default presets with user presets
            const userPresets = presetsData.map(p => ({
              id: p.id.toString(),
              name: p.name,
              icon: p.icon,
              isDefault: false
            }));
            
            // Keep default presets and add user's custom ones
            setMinistryPresets(prev => [
              ...prev.filter(p => p.isDefault),
              ...userPresets
            ]);
          }
        } catch (presetsError) {
          console.error("Error loading ministry presets:", presetsError);
        }

        // If a preset was selected from the previous screen, pre-select it
        if (params?.selectedPresetId) {
          setSelectedPresetId(params.selectedPresetId);
          
          // Also, use the preset name as the default group name
          const selectedPreset = ministryPresets.find(p => p.id === params.selectedPresetId);
          if (selectedPreset) {
            setGroupName(`${selectedPreset.name} Group`);
          }
        }
      } catch (error) {
        console.error("Error in initial data fetch:", error);
      }
    }

    fetchInitialData();
  }, [params?.selectedPresetId]);

  // Update group name when preset changes
  useEffect(() => {
    if (selectedPresetId) {
      const preset = ministryPresets.find(p => p.id === selectedPresetId);
      if (preset) {
        setGroupName(`${preset.name} Group`);
      }
    }
  }, [selectedPresetId, ministryPresets]);

  // Navigate back to ministry groups screen
  const navigateBack = () => {
    console.log("Navigating back to MinistryGroupsScreen");
    
    try {
      // Try multiple navigation methods
      
      // Method 1: Standard navigation
      navigation.navigate('MinistriesScreen');
      
      // Method 2: Fallback - use goBack
      setTimeout(() => {
        try {
          navigation.goBack();
          console.log("Navigation back using goBack succeeded");
        } catch (backError) {
          console.error("goBack navigation failed:", backError);
          
          // Method 3: Last resort - reset navigation
          try {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MinistriesScreen' }],
              })
            );
            console.log("Navigation using CommonActions.reset succeeded");
          } catch (resetError) {
            console.error("Reset navigation failed:", resetError);
            Alert.alert("Navigation Error", "Could not navigate back. Please try again.");
          }
        }
      }, 200);
    } catch (error) {
      console.error("Standard navigation failed:", error);
      Alert.alert("Navigation Error", "Could not navigate back. Please try again.");
    }
  };

  // Create a new ministry group
  const createMinistryGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Required Field", "Please enter a name for your group");
      return;
    }

    if (!selectedPresetId) {
      Alert.alert("Required Field", "Please select a ministry type");
      return;
    }

    if (!churchId) {
      Alert.alert("Error", "Could not determine your church. Please try again later.");
      return;
    }

    setLoading(true);

    try {
      // Create the group in Supabase
      const { data: groupData, error: groupError } = await supabase
        .from("ministry_groups")
        .insert({
          church_id: churchId,
          name: groupName,
          description: groupDescription || "No description",
          is_public: isPublic,
          ministry_type_id: selectedPresetId,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          last_active: new Date().toISOString(),
          member_count: 1 // Starting with the creator
        })
        .select();

      if (groupError) {
        throw groupError;
      }

      if (!groupData || groupData.length === 0) {
        throw new Error("Failed to create group");
      }

      const newGroupId = groupData[0].id;

      // Add the creator as a member and admin
      const { error: memberError } = await supabase
        .from("ministry_group_members")
        .insert({
          ministry_group_id: newGroupId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          role: "admin",
          joined_at: new Date().toISOString()
        });

      if (memberError) {
        throw memberError;
      }

      // Success! Navigate to the new group chat
      Alert.alert(
        "Group Created",
        `${groupName} has been created successfully!`,
        [
          { 
            text: "OK", 
            onPress: () => {
              try {
                navigation.navigate('ministryChat', { groupId: newGroupId });
              } catch (navError) {
                console.error("Navigation error:", navError);
                // Fallback to reset navigation
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      { name: 'MinistriesScreen' },
                      { name: 'ministryChat', params: { groupId: newGroupId } }
                    ],
                  })
                );
              }
            } 
          }
        ]
      );
    } catch (error) {
      console.error("Error creating ministry group:", error);
      Alert.alert("Error", "Failed to create ministry group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Render each ministry preset option
  const renderPresetOption = (preset: MinistryPreset) => (
    <TouchableOpacity
      key={preset.id}
      style={[
        styles.presetOption,
        selectedPresetId === preset.id && styles.presetOptionSelected
      ]}
      onPress={() => setSelectedPresetId(preset.id)}
    >
      <Ionicons
        name={preset.icon as any}
        size={24}
        color={selectedPresetId === preset.id ? "#FFFFFF" : "#3A86FF"}
        style={styles.presetIcon}
      />
      <Text
        style={[
          styles.presetName,
          selectedPresetId === preset.id && styles.presetNameSelected
        ]}
      >
        {preset.name}
      </Text>
      {selectedPresetId === preset.id && (
        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Ionicons name="arrow-back" size={24} color="#3A86FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Group</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formContainer}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Group Icon */}
          <View style={styles.groupIconContainer}>
            <View style={styles.groupIconPlaceholder}>
              <FontAwesome5 name="users" size={40} color="#FFFFFF" />
              <TouchableOpacity style={styles.editIconButton}>
                <AntDesign name="camerao" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Group Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter group name"
              placeholderTextColor="#94A3B8"
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              placeholder="What's this group about?"
              placeholderTextColor="#94A3B8"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Ministry Type Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Ministry Type</Text>
            <Text style={styles.formSubLabel}>
              Select what type of ministry this group will serve
            </Text>
            
            <View style={styles.presetsGrid}>
              {ministryPresets.map(preset => renderPresetOption(preset))}
            </View>
          </View>

          {/* Group Privacy */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Group Privacy</Text>
            <View style={styles.privacyOptions}>
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  isPublic && styles.privacyOptionSelected
                ]}
                onPress={() => setIsPublic(true)}
              >
                <Ionicons
                  name="globe-outline"
                  size={24}
                  color={isPublic ? "#FFFFFF" : "#3A86FF"}
                  style={styles.privacyIcon}
                />
                <View style={styles.privacyTextContainer}>
                  <Text
                    style={[
                      styles.privacyTitle,
                      isPublic && styles.privacyTitleSelected
                    ]}
                  >
                    Public
                  </Text>
                  <Text
                    style={[
                      styles.privacyDescription,
                      isPublic && styles.privacyDescriptionSelected
                    ]}
                  >
                    Anyone in your church can find and join
                  </Text>
                </View>
                {isPublic && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.checkIcon} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  !isPublic && styles.privacyOptionSelected
                ]}
                onPress={() => setIsPublic(false)}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color={!isPublic ? "#FFFFFF" : "#3A86FF"}
                  style={styles.privacyIcon}
                />
                <View style={styles.privacyTextContainer}>
                  <Text
                    style={[
                      styles.privacyTitle,
                      !isPublic && styles.privacyTitleSelected
                    ]}
                  >
                    Private
                  </Text>
                  <Text
                    style={[
                      styles.privacyDescription,
                      !isPublic && styles.privacyDescriptionSelected
                    ]}
                  >
                    Only people you invite can join
                  </Text>
                </View>
                {!isPublic && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Create Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={createMinistryGroup}
          disabled={loading}
        >
          <LinearGradient
            colors={["#3A86FF", "#4361EE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <Text style={styles.buttonText}>Creating...</Text>
            ) : (
              <Text style={styles.buttonText}>Create Group</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  formContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  groupIconContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  groupIconPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#3A86FF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  editIconButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#475569",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  formSubLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginHorizontal: -8,
  },
  presetOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 10,
    margin: 8,
    width: "46%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetOptionSelected: {
    backgroundColor: "#3A86FF",
    borderColor: "#3A86FF",
  },
  presetIcon: {
    marginRight: 8,
  },
  presetName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  presetNameSelected: {
    color: "#FFFFFF",
  },
  checkIcon: {
    marginLeft: 4,
  },
  privacyOptions: {
    marginTop: 16,
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  privacyOptionSelected: {
    backgroundColor: "#3A86FF",
    borderColor: "#3A86FF",
  },
  privacyIcon: {
    marginRight: 12,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  privacyTitleSelected: {
    color: "#FFFFFF",
  },
  privacyDescription: {
    fontSize: 14,
    color: "#64748B",
  },
  privacyDescriptionSelected: {
    color: "#E2E8F0",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  createButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});