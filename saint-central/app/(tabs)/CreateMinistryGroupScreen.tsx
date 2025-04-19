// CreateMinistryScreen.tsx - Simplified ministry creation
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
} from "@expo/vector-icons";
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
// Interface for route params
interface RouteParams {
  selectedPresetId?: string;
}

// Interface for ministry data - matching the Supabase table
interface MinistryData {
  name: string;
  description: string;
  image_url: string | null;
  church_id: number | null;
  created_at: string;
}

// Interface for navigation
type RootStackParamList = {
  MinistriesScreen: { refresh?: boolean };
  ministryDetail: { ministryId: number };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Preset ministry types
const MINISTRY_PRESETS = [
  { id: '1', name: 'Liturgical', description: 'Focus on worship service planning and execution' },
  { id: '2', name: 'Music', description: 'Choir, instruments, and worship teams' },
  { id: '3', name: 'Youth', description: 'Programs and activities for young people' },
  { id: '4', name: 'Outreach', description: 'Community service and evangelism' },
  { id: '5', name: 'Education', description: 'Bible studies and spiritual formation' },
  { id: '6', name: 'Service', description: 'Volunteer opportunities within the church' },
  { id: '7', name: 'Prayer', description: 'Prayer groups and intercession teams' },
];

const CreateMinistryScreen = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { selectedPresetId } = route.params as RouteParams || {};
  
  // State for ministry data
  const [ministryData, setMinistryData] = useState<MinistryData>({
    name: "",
    description: "",
    image_url: null,
    church_id: null,
    created_at: new Date().toISOString(),
  });
  
  // State for UI
  const [loading, setLoading] = useState<boolean>(false);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPresetName, setSelectedPresetName] = useState<string>("");
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  
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
          Alert.alert(
            "Church Membership Required", 
            "You need to be a member of a church to create a ministry."
          );
          navigation.navigate('MinistriesScreen', { refresh: false });
          return;
        }
        
        setChurchId(memberData.church_id);
        setMinistryData(prev => ({ ...prev, church_id: memberData.church_id }));
        
        // Get preset details if applicable
        if (selectedPresetId) {
          const preset = MINISTRY_PRESETS.find(p => p.id === selectedPresetId);
          if (preset) {
            setSelectedPresetName(preset.name);
            // Pre-fill name with preset name
            setMinistryData(prev => ({ 
              ...prev, 
              name: `${preset.name} Ministry`,
              description: preset.description || '' 
            }));
          }
        }
        
      } catch (error) {
        console.error("Error setting up screen:", error);
        Alert.alert("Error", "Could not set up ministry creation. Please try again.");
        navigation.navigate('MinistriesScreen', { refresh: false });
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
        base64: false,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUploading(true);
        const asset = result.assets[0];
        
        // Set local URI for now, and indicate it's a local file
        // In a production app, you'd implement a proper image upload mechanism
        // using either fetch to upload the file or Supabase's native fetch-based APIs
        
        // Store the local URI temporarily
        const localUri = asset.uri;
        
        // For a real implementation, you would:
        // 1. Convert the image to a format suitable for upload (Blob, FormData, etc.)
        // 2. Upload using fetch or the Supabase client's fetch-based methods
        // 3. Get the URL after successful upload
        
        // For this simplified version, we'll just use the local URI
        setMinistryData(prev => ({ ...prev, image_url: localUri }));
        
        // Add a note in console for developers
        console.log("Using local image URI. In production, implement proper image upload to Supabase storage.");
        
        setImageUploading(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Could not select or upload image. Please try again.");
      setImageUploading(false);
    }
  };
  
  // Create the ministry
  const createMinistry = async () => {
    // Validate
    if (!ministryData.name.trim()) {
      Alert.alert("Required", "Please enter a ministry name.");
      return;
    }
    
    if (!churchId) {
      Alert.alert("Error", "Church information is missing. Please try again.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Create the ministry in Supabase
      const { data: newMinistry, error: ministryError } = await supabase
        .from("ministries")
        .insert({
          name: ministryData.name,
          description: ministryData.description || `${ministryData.name} ministry`,
          image_url: ministryData.image_url,
          church_id: churchId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (ministryError) {
        console.error("Error creating ministry:", ministryError);
        throw ministryError;
      }
      
      // Create a group for the ministry
      const { data: newGroup, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: `${ministryData.name} Group`,
          description: `Official group for ${ministryData.name} ministry`,
          created_at: new Date().toISOString(),
          created_by: userId,
          church_id: churchId,
          ministry_id: newMinistry.id,
          is_system_generated: true
        })
        .select()
        .single();

      if (groupError) {
        console.error("Error creating group for ministry:", groupError);
        // Continue anyway - we'll at least have the ministry
      }

      // Add creator as member of both ministry and group
      const { error: memberError } = await supabase
        .from("ministry_members")
        .insert({
          ministry_id: newMinistry.id,
          user_id: userId,
          church_id: churchId,
          joined_at: new Date().toISOString(),
          member_status: 'leader'
        });

      if (newGroup) {
        const { error: groupMemberError } = await supabase
          .from("group_members")
          .insert({
            group_id: newGroup.id,
            user_id: userId,
            role: 'admin',
            joined_at: new Date().toISOString()
          });

        if (groupMemberError) {
          console.error("Error adding creator as group member:", groupMemberError);
        }
      }
        
      if (memberError) {
        console.error("Error adding creator as member:", memberError);
        // Continue anyway - we'll at least have the ministry
        
        Alert.alert(
          "Ministry Created", 
          "Ministry was created successfully, but there was an issue adding you as a leader. You may need to join the ministry separately."
        );
      } else {
        // Success message
        Alert.alert("Success", "Ministry and associated group created successfully!");
      }
      
      // Navigate to the ministries screen
      navigation.navigate('MinistriesScreen', { refresh: true });
      
    } catch (error) {
      console.error("Error creating ministry:", error);
      Alert.alert("Error", "Could not create ministry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Generate a placeholder based on ministry name
  const renderMinistryAvatar = () => {
    if (ministryData.image_url) {
      return (
        <Image 
          source={{ uri: ministryData.image_url }} 
          style={styles.ministryImage}
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
    
    const initials = getInitials(ministryData.name || 'New Ministry');
    
    return (
      <View style={styles.ministryImagePlaceholder}>
        <Text style={styles.ministryImagePlaceholderText}>{initials}</Text>
      </View>
    );
  };
  
  // Navigate back to ministries screen
  const navigateBack = () => {
    navigation.navigate('MinistriesScreen', { refresh: false });
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
        <Text style={styles.headerTitle}>New Ministry</Text>
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
          {/* Ministry Image */}
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
                  {renderMinistryAvatar()}
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={22} color="#FFFFFF" />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Ministry Name */}
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ministry Name (required)"
                placeholderTextColor="#94A3B8"
                value={ministryData.name}
                onChangeText={text => setMinistryData(prev => ({ ...prev, name: text }))}
                autoFocus
              />
            </View>
            
            {/* Ministry Description */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ministry Description (optional)"
                placeholderTextColor="#94A3B8"
                value={ministryData.description}
                onChangeText={text => setMinistryData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
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

            {/* Church Info */}
            {churchId && (
              <View style={styles.infoContainer}>
                <MaterialIcons name="info-outline" size={16} color="#64748B" />
                <Text style={styles.infoText}>
                  This ministry will be created for your church
                </Text>
              </View>
            )}
          </View>
          
          {/* Create button */}
          <TouchableOpacity 
            style={[
              styles.createButton,
              (!ministryData.name.trim() || loading) && styles.createButtonDisabled
            ]}
            onPress={createMinistry}
            disabled={!ministryData.name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome5 name="church" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Ministry</Text>
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
  ministryImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  ministryImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ADD8E6", // Changed from #075E54 (dark green) to light blue
    justifyContent: "center",
    alignItems: "center",
  },
  ministryImagePlaceholderText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#ADD8E6", // Changed from #25D366 (green) to light blue
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
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
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
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

export default CreateMinistryScreen;