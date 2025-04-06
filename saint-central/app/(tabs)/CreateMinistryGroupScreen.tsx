// CreateMinistryGroupScreen.tsx - WhatsApp-style group creation
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Entypo,
} from "@expo/vector-icons";
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';

// Interface for route params
interface RouteParams {
  selectedPresetId?: string;
  participants?: any[];
}

// Interface for group data
interface GroupData {
  name: string;
  description: string;
  image: string | null;
  status_message: string;
  church_id: number | null;
  created_by: string | null;
  member_count: number;
}

// Interface for navigation
type RootStackParamList = {
  MinistryGroupsScreen: { refresh?: boolean };
  groupParticipants: { groupId?: number; isNewGroup: boolean; presetId?: string };
  ministryChat: { groupId: number; groupName: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface NavigationProps {
  route: { params: RouteParams };
  navigation: any;
}

const createMinistryGroupScreen = ({ route, navigation }: NavigationProps): JSX.Element => {
  // Get params from route
  const { selectedPresetId, participants: routeParticipants } = route.params || {};
  
  // State for group data
  const [groupData, setGroupData] = useState<GroupData>({
    name: "",
    description: "",
    image: null,
    status_message: "",
    church_id: null,
    created_by: null,
    member_count: 0,
  });
  
  // State for UI
  const [loading, setLoading] = useState<boolean>(false);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPresetName, setSelectedPresetName] = useState<string>("");
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const [participants, setParticipants] = useState<{ id: string, name: string, avatar?: string }[]>([]);
  
  // Initial setup
  useEffect(() => {
    const setupScreen = async () => {
      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          throw userError;
        }

        if (!user) {
          console.error("No user logged in");
          throw new Error("No user logged in");
        }
        
        setUserId(user.id);
        
        // Get user's church
        const { data: memberData, error: memberError } = await supabase
          .from("church_members")
          .select("church_id")
          .eq("user_id", user.id)
          .single();

        if (memberError) {
          console.error("Error fetching membership:", memberError);
          throw memberError;
        }
        
        setChurchId(memberData.church_id);
        setGroupData(prev => ({ ...prev, church_id: memberData.church_id, created_by: user.id }));
        
        // Get preset name if applicable
        if (selectedPresetId) {
          const { data: presetData, error: presetError } = await supabase
            .from("ministry_presets")
            .select("name")
            .eq("id", selectedPresetId)
            .single();
            
          if (!presetError && presetData) {
            setSelectedPresetName(presetData.name);
            // Pre-fill name with preset name
            setGroupData(prev => ({ ...prev, name: `${presetData.name} Group` }));
          } else {
            // Fallback to default presets
            const defaultPresets = [
              { id: '1', name: 'Liturgical' },
              { id: '2', name: 'Music' },
              { id: '3', name: 'Youth' },
              { id: '4', name: 'Outreach' },
              { id: '5', name: 'Education' },
              { id: '6', name: 'Service' },
              { id: '7', name: 'Prayer' },
            ];
            
            const preset = defaultPresets.find(p => p.id === selectedPresetId);
            if (preset) {
              setSelectedPresetName(preset.name);
              // Pre-fill name with preset name
              setGroupData(prev => ({ ...prev, name: `${preset.name} Group` }));
            }
          }
        }
        
        // Get participants if any
        if (routeParticipants) {
          setParticipants(routeParticipants);
          setGroupData(prev => ({ ...prev, member_count: routeParticipants?.length || 0 }));
        }
        
      } catch (error) {
        console.error("Error setting up screen:", error);
        Alert.alert("Error", "Could not set up group creation. Please try again.");
      }
    };
    
    setupScreen();
  }, []);
  
  // Pick an image from the gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUploading(true);
        const imageUri = result.assets[0].uri;
        
        // In a real app, you would upload to Supabase storage here
        // For now, we'll just set the image URI directly
        setGroupData(prev => ({ ...prev, image: imageUri }));
        setImageUploading(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Could not select image. Please try again.");
      setImageUploading(false);
    }
  };
  
  // Navigate to select participants
  const navigateToParticipants = () => {
    if (selectedPresetId && groupData.name) {
      try {
        navigation.navigate('groupParticipants', {
          isNewGroup: true,
          presetId: selectedPresetId,
        });
      } catch (error) {
        console.error("Navigation error:", error);
        Alert.alert("Error", "Could not navigate to participants selection.");
      }
    } else {
      Alert.alert("Required", "Please enter a group name first.");
    }
  };
  
  // Create the group
  const createGroup = async () => {
    // Validate
    if (!groupData.name.trim()) {
      Alert.alert("Required", "Please enter a group name.");
      return;
    }
    
    if (!churchId) {
      Alert.alert("Error", "Church information is missing. Please try again.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Create the group in Supabase
      const { data: newGroup, error: groupError } = await supabase
        .from("ministry_groups")
        .insert({
          name: groupData.name,
          description: groupData.description || `${groupData.name} group chat`,
          image: groupData.image, // In a real app, this would be a URL after uploading
          status_message: `Group created`,
          church_id: churchId,
          created_by: userId,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          member_count: 1 + (participants.length || 0), // Creator + participants
        })
        .select()
        .single();
        
      if (groupError) {
        console.error("Error creating group:", groupError);
        throw groupError;
      }
      
      // Add creator as member and admin
      const { error: memberError } = await supabase
        .from("ministry_group_members")
        .insert({
          ministry_group_id: newGroup.id,
          user_id: userId,
          joined_at: new Date().toISOString(),
          role: 'admin'
        });
        
      if (memberError) {
        console.error("Error adding creator as member:", memberError);
        throw memberError;
      }
      
      // Add participants if any
      if (participants.length > 0) {
        const memberInserts = participants.map(p => ({
          ministry_group_id: newGroup.id,
          user_id: p.id,
          joined_at: new Date().toISOString(),
          role: 'member'
        }));
        
        const { error: participantsError } = await supabase
          .from("ministry_group_members")
          .insert(memberInserts);
          
        if (participantsError) {
          console.error("Error adding participants:", participantsError);
          // Continue anyway - we'll at least have the group with the creator
        }
      }
      
      // Navigate to the new group chat
      navigation.navigate('ministryChat', { 
        groupId: newGroup.id,
        groupName: newGroup.name
      });
      
      // Refresh the groups list
      setTimeout(() => {
        navigation.navigate('MinistryGroupsScreen', { refresh: true });
      }, 100);
      
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Could not create group. Please try again.");
      setLoading(false);
    }
  };

  // Generate a placeholder based on group name
  const renderGroupAvatar = () => {
    if (groupData.image) {
      return (
        <Image 
          source={{ uri: groupData.image }} 
          style={styles.groupImage}
        />
      );
    }
    
    // Generate initials from name
    const getInitials = (name: string): string => {
      if (!name) return '?';
      
      const words = name.split(' ');
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
      
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    };
    
    const initials = getInitials(groupData.name || 'New Group');
    
    return (
      <View style={styles.groupImagePlaceholder}>
        <Text style={styles.groupImagePlaceholderText}>{initials}</Text>
      </View>
    );
  };
  
  // Make sure your navigation back to MinistryGroupsScreen is correct
  const navigateBack = () => {
    navigation.navigate('MinistryGroupsScreen', { refresh: true });
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={navigateBack}
        >
          <Ionicons name="arrow-back" size={24} color="#075E54" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group Image */}
          <View style={styles.imageSection}>
            <TouchableOpacity 
              style={styles.imageContainer}
              onPress={pickImage}
              disabled={imageUploading}
            >
              {imageUploading ? (
                <ActivityIndicator size="large" color="#075E54" />
              ) : (
                <>
                  {renderGroupAvatar()}
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={22} color="#FFFFFF" />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Group Name */}
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Group Name (required)"
                placeholderTextColor="#94A3B8"
                value={groupData.name}
                onChangeText={text => setGroupData(prev => ({ ...prev, name: text }))}
                autoFocus
              />
            </View>
            
            {/* Group Description */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Group Description (optional)"
                placeholderTextColor="#94A3B8"
                value={groupData.description}
                onChangeText={text => setGroupData(prev => ({ ...prev, description: text }))}
                multiline
              />
            </View>
            
            {/* Preset */}
            {selectedPresetName && (
              <View style={styles.presetContainer}>
                <Text style={styles.presetLabel}>Ministry Type:</Text>
                <View style={styles.presetBadge}>
                  <Text style={styles.presetText}>{selectedPresetName}</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Participants */}
          <TouchableOpacity 
            style={styles.participantsButton}
            onPress={navigateToParticipants}
          >
            <Ionicons name="people" size={24} color="#075E54" />
            <View style={styles.participantsTextContainer}>
              <Text style={styles.participantsButtonText}>
                Add Participants
              </Text>
              {participants.length > 0 && (
                <Text style={styles.participantsCount}>
                  {participants.length} selected
                </Text>
              )}
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
          </TouchableOpacity>
          
          {/* Selected participants preview */}
          {participants.length > 0 && (
            <View style={styles.selectedParticipantsContainer}>
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedParticipantsContent}
              >
                {participants.map((participant) => (
                  <View key={participant.id} style={styles.participantItem}>
                    {participant.avatar ? (
                      <Image 
                        source={{ uri: participant.avatar }} 
                        style={styles.participantAvatar} 
                      />
                    ) : (
                      <View style={styles.participantAvatarPlaceholder}>
                        <Text style={styles.participantInitials}>
                          {participant.name.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.participantName} numberOfLines={1}>
                      {participant.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Create button */}
          <TouchableOpacity 
            style={[
              styles.createButton,
              (!groupData.name.trim() || loading) && styles.createButtonDisabled
            ]}
            onPress={createGroup}
            disabled={!groupData.name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="group-add" size={24} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Group</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  imageSection: {
    alignItems: "center",
    marginVertical: 24,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  groupImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  groupImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#075E54",
    justifyContent: "center",
    alignItems: "center",
  },
  groupImagePlaceholderText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#25D366",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  inputSection: {
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  input: {
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
    minHeight: 48,
  },
  presetContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  presetLabel: {
    fontSize: 14,
    color: "#64748B",
    marginRight: 8,
  },
  presetBadge: {
    backgroundColor: "#075E54",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  presetText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  participantsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
  },
  participantsTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  participantsButtonText: {
    fontSize: 16,
    color: "#1E293B",
  },
  participantsCount: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  selectedParticipantsContainer: {
    marginBottom: 24,
  },
  selectedParticipantsContent: {
    paddingVertical: 8,
  },
  participantItem: {
    alignItems: "center",
    marginRight: 16,
    width: 70,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
  },
  participantAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#075E54",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  participantInitials: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  participantName: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#075E54",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  createButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});

export default createMinistryGroupScreen;