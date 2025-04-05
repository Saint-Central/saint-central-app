//this page is for ministry groups with a WhatsApp-style chat layout
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  AntDesign,
  FontAwesome5,
  Entypo,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from "expo-linear-gradient";

// Ministry group interface
interface MinistryGroup {
  id: number;
  name: string;
  description: string;
  image: string;
  last_active: string;
  notification_count: number;
  member_count: number;
  is_member: boolean;
  status_message?: string;
}

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
}

// Add type definition for navigation - make sure this matches your actual navigation structure
type RootStackParamList = {
  // Include both possible screen names
  Ministries: undefined;
  MinistriesScreen: undefined;
  ministryChat: { groupId: number };
  createMinistryGroup: { selectedPresetId?: string }; // Updated to pass selectedPresetId
  // ... other screen types ...
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Format time to display like WhatsApp
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  
  // If within the last week, return day name
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  // Otherwise return date
  return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
};

export default function MinistryGroupsScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [joinedGroups, setJoinedGroups] = useState<MinistryGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<MinistryGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
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
  const [selectedPreset, setSelectedPreset] = useState<string>('1');
  const [isMinistryModalVisible, setIsMinistryModalVisible] = useState<boolean>(false);
  const [newMinistryName, setNewMinistryName] = useState<string>("");
  const [editingPreset, setEditingPreset] = useState<MinistryPreset | null>(null);

  // Fetch groups data
  useEffect(() => {
    async function fetchGroups(): Promise<void> {
      try {
        setLoading(true);
        
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

        // Get church ID from route params or from user's membership
        const params = route.params as RouteParams;
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
            throw memberError;
          }

          churchIdToUse = memberData.church_id;
        }

        setChurchId(churchIdToUse ?? null);
        
        // Fetch groups the user is a member of
        const { data: membershipData, error: membershipError } = await supabase
          .from("ministry_group_members")
          .select("ministry_group_id")
          .eq("user_id", user.id);
          
        if (membershipError) {
          console.error("Error fetching group memberships:", membershipError);
          throw membershipError;
        }
        
        const memberGroupIds = membershipData.map(item => item.ministry_group_id);
        
        // Fetch all ministry groups for this church
        const { data: groupsData, error: groupsError } = await supabase
          .from("ministry_groups")
          .select("*")
          .eq("church_id", churchIdToUse);
          
        if (groupsError) {
          console.error("Error fetching ministry groups:", groupsError);
          throw groupsError;
        }
        
        // Fetch notification counts
        // This would be a real implementation with your notification system
        const notificationCounts = {
          1: 5, // Group ID 1 has 5 notifications
          2: 2, // Group ID 2 has 2 notifications
          // Add more as needed
        };
        
        // Process groups data
        const userGroups: MinistryGroup[] = [];
        const otherGroups: MinistryGroup[] = [];
        
        groupsData.forEach(group => {
          const processedGroup: MinistryGroup = {
            id: group.id,
            name: group.name,
            description: group.description,
            image: group.image || "",
            last_active: group.last_active || new Date().toISOString(),
            notification_count: notificationCounts[group.id as keyof typeof notificationCounts] || 0,
            member_count: group.member_count || 0,
            is_member: memberGroupIds.includes(group.id),
            status_message: group.status_message || "",
          };
          
          if (processedGroup.is_member) {
            userGroups.push(processedGroup);
          } else {
            otherGroups.push(processedGroup);
          }
        });
        
        // Demo data if no groups exist
        if (userGroups.length === 0) {
          userGroups.push({
            id: 1,
            name: "Ministry Worship Team",
            description: "Worship team coordination",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 5,
            member_count: 15,
            is_member: true,
            status_message: "~ Pastor James added a new song",
          },
          {
            id: 2,
            name: "Ministry All Members",
            description: "General announcements",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 2,
            member_count: 120,
            is_member: true,
            status_message: "~ Sarah joined from the community",
          });
        }
        
        if (otherGroups.length === 0) {
          otherGroups.push({
            id: 3,
            name: "Ministry Youth Committee",
            description: "Youth activities planning",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 0,
            member_count: 42,
            is_member: false,
          },
          {
            id: 4,
            name: "Ministry Outreach Team",
            description: "Community service coordination",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 0,
            member_count: 35,
            is_member: false,
          },
          {
            id: 5,
            name: "Ministry Bible Study Group",
            description: "Weekly Bible study discussions",
            image: "",
            last_active: new Date().toISOString(),
            notification_count: 0,
            member_count: 29,
            is_member: false,
          });
        }
        
        setJoinedGroups(userGroups);
        setAvailableGroups(otherGroups);

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
      } catch (error) {
        console.error("Error fetching ministry groups:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchGroups();
  }, []);
  
  // Navigate back to MinistriesScreen.tsx directly
  const navigateBack = () => {
    // Directly navigate to MinistriesScreen
    try {
      navigation.navigate('MinistriesScreen');
      console.log("Navigated back to MinistriesScreen");
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Could not navigate back. Please try again.");
    }
  };
  
  // Navigate to a specific group chat
  const navigateToGroupChat = (groupId: number) => {
    try {
      navigation.navigate('ministryChat', { groupId });
      console.log("Navigated to ministryChat with ID:", groupId);
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Could not navigate to chat. Please try again.");
    }
  };
  
  // Navigate to create new group screen with the selected preset
  const navigateToCreateGroup = () => {
    try {
      console.log("Navigating to createMinistryGroup with preset:", selectedPreset);
      
      // Create Alert to confirm action
      Alert.alert(
        "Create New Ministry Group", 
        `Create a new group with the "${ministryPresets.find(p => p.id === selectedPreset)?.name}" preset?`,
        [
          { 
            text: "Create", 
            onPress: () => {
              // Try multiple navigation approaches in sequence
              try {
                // Method 1: Standard navigation
                navigation.navigate('createMinistryGroup', {
                  selectedPresetId: selectedPreset
                });
                console.log("Standard navigation executed");
                
                // Method 2: Fallback approach with CommonActions
                setTimeout(() => {
                  try {
                    navigation.dispatch(
                      CommonActions.navigate({
                        name: 'createMinistryGroup',
                        params: { selectedPresetId: selectedPreset }
                      })
                    );
                    console.log("Fallback navigation executed");
                  } catch (dispatchError) {
                    console.error("Fallback navigation failed:", dispatchError);
                  }
                }, 500);
              } catch (navError) {
                console.error("Initial navigation failed:", navError);
                Alert.alert("Navigation Error", "Could not open create group screen. Please try again.");
              }
            }
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Could not navigate to create group screen. Please try again.");
    }
  };

  // Show the modal to add or edit a ministry preset
  const showMinistryModal = (preset?: MinistryPreset) => {
    if (preset) {
      setEditingPreset(preset);
      setNewMinistryName(preset.name);
    } else {
      setEditingPreset(null);
      setNewMinistryName("");
    }
    setIsMinistryModalVisible(true);
  };

  // Add a new ministry preset
  const addMinistryPreset = async () => {
    if (newMinistryName.trim() === "") {
      Alert.alert("Invalid Name", "Please enter a name for the ministry preset");
      return;
    }

    try {
      // In a real app, you would save this to Supabase
      const newId = (ministryPresets.length + 1).toString();
      const newPreset: MinistryPreset = {
        id: newId,
        name: newMinistryName,
        icon: "bookmark-outline", // Default icon
        isDefault: false,
      };

      setMinistryPresets([...ministryPresets, newPreset]);
      setNewMinistryName("");
      setIsMinistryModalVisible(false);

      // Save to Supabase in a real app
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("ministry_presets").insert({
          user_id: user.id,
          name: newPreset.name,
          icon: newPreset.icon
        });
      }
    } catch (error) {
      console.error("Error adding ministry preset:", error);
      Alert.alert("Error", "Failed to add ministry preset");
    }
  };

  // Update an existing ministry preset
  const updateMinistryPreset = async () => {
    if (!editingPreset || newMinistryName.trim() === "") {
      Alert.alert("Invalid Name", "Please enter a name for the ministry preset");
      return;
    }

    try {
      const updatedPresets = ministryPresets.map(p => 
        p.id === editingPreset.id ? { ...p, name: newMinistryName } : p
      );
      
      setMinistryPresets(updatedPresets);
      setNewMinistryName("");
      setEditingPreset(null);
      setIsMinistryModalVisible(false);

      // Update in Supabase in a real app
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !editingPreset.isDefault) {
        await supabase.from("ministry_presets")
          .update({ name: newMinistryName })
          .eq("id", editingPreset.id)
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Error updating ministry preset:", error);
      Alert.alert("Error", "Failed to update ministry preset");
    }
  };

  // Delete a ministry preset
  const deleteMinistryPreset = async (preset: MinistryPreset) => {
    if (preset.isDefault) {
      Alert.alert(
        "Cannot Delete",
        "Default ministry presets cannot be deleted",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Ministry",
      `Are you sure you want to delete "${preset.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const filteredPresets = ministryPresets.filter(
                p => p.id !== preset.id
              );
              setMinistryPresets(filteredPresets);
              
              // If the deleted preset was selected, select the first available preset
              if (selectedPreset === preset.id && filteredPresets.length > 0) {
                setSelectedPreset(filteredPresets[0].id);
              }

              // Delete from Supabase in a real app
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from("ministry_presets")
                  .delete()
                  .eq("id", preset.id)
                  .eq("user_id", user.id);
              }
            } catch (error) {
              console.error("Error deleting ministry preset:", error);
              Alert.alert("Error", "Failed to delete ministry preset");
            }
          },
        },
      ]
    );
  };
  
  // Render ministry preset item - simplified to match WhatsApp look
  const renderMinistryPresetItem = (preset: MinistryPreset) => (
    <TouchableOpacity
      key={preset.id}
      style={[
        styles.ministryPresetItem,
        selectedPreset === preset.id && styles.ministryPresetItemSelected
      ]}
      onPress={() => {
        setSelectedPreset(preset.id);
        // Long press still edits
      }}
      onLongPress={() => showMinistryModal(preset)}
    >
      <Text 
        style={[
          styles.ministryPresetText,
          selectedPreset === preset.id && styles.ministryPresetTextSelected
        ]}
        numberOfLines={1}
      >
        {preset.name}
      </Text>
      
      {!preset.isDefault && (
        <TouchableOpacity
          style={styles.ministryPresetAction}
          onPress={() => deleteMinistryPreset(preset)}
        >
          <MaterialIcons 
            name="close" 
            size={16} 
            color={selectedPreset === preset.id ? "#FFFFFF" : "#94A3B8"} 
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Prepare items for the main FlatList
  const prepareSections = () => {
    const sections = [];

    // Add joined groups section if any exist
    if (joinedGroups.length > 0) {
      sections.push({
        type: 'header',
        title: 'Groups you\'re in',
        id: 'joined_header'
      });
      
      joinedGroups.forEach(group => {
        sections.push({
          type: 'joined_group',
          data: group,
          id: `joined_${group.id}`
        });
      });
    }

    // Add available groups section if any exist
    if (availableGroups.length > 0) {
      sections.push({
        type: 'header',
        title: 'Groups you can join',
        id: 'available_header'
      });
      
      availableGroups.forEach(group => {
        sections.push({
          type: 'available_group',
          data: group,
          id: `available_${group.id}`
        });
      });
    }

    return sections;
  };

  // Render items based on their type
  const renderItem = ({ item }: any) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            {item.title === 'Groups you can join' && (
              <TouchableOpacity 
                style={styles.sectionHeaderButton}
                onPress={navigateToCreateGroup}
              >
                <Text style={styles.sectionHeaderButtonText}>Create New</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      
      case 'joined_group':
        return (
          <TouchableOpacity 
            style={styles.groupItem}
            onPress={() => navigateToGroupChat(item.data.id)}
            activeOpacity={0.7}
          >
            <View style={styles.groupAvatar}>
              {item.data.image ? (
                <Image 
                  source={{ uri: item.data.image }} 
                  style={styles.groupAvatarImage} 
                />
              ) : (
                <View style={styles.groupAvatarPlaceholder}>
                  <FontAwesome5 name="church" size={22} color="#fff" />
                </View>
              )}
            </View>
            
            <View style={styles.groupContent}>
              <View style={styles.groupHeaderRow}>
                <Text style={styles.groupName} numberOfLines={1}>
                  {item.data.name}
                </Text>
                <Text style={styles.groupTimestamp}>
                  {formatTime(item.data.last_active)}
                </Text>
              </View>
              
              <View style={styles.groupDescriptionRow}>
                <Text style={styles.groupDescription} numberOfLines={1}>
                  {item.data.status_message || item.data.description}
                </Text>
                
                {item.data.notification_count > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationText}>
                      {item.data.notification_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      
      case 'available_group':
        return (
          <TouchableOpacity 
            style={styles.groupItem}
            onPress={() => navigateToGroupChat(item.data.id)}
            activeOpacity={0.7}
          >
            <View style={styles.groupAvatar}>
              {item.data.image ? (
                <Image 
                  source={{ uri: item.data.image }} 
                  style={styles.groupAvatarImage} 
                />
              ) : (
                <View style={styles.groupAvatarPlaceholder}>
                  <FontAwesome5 name="church" size={22} color="#fff" />
                </View>
              )}
            </View>
            
            <View style={styles.groupContent}>
              <View style={styles.groupHeaderRow}>
                <Text style={styles.groupName} numberOfLines={1}>
                  {item.data.name}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </View>
              
              <View style={styles.groupDescriptionRow}>
                <Text style={styles.groupMemberCount} numberOfLines={1}>
                  {item.data.member_count} members
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Ionicons name="arrow-back" size={24} color="#3A86FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ministry Groups</Text>
        </View>
        
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#3A86FF" />
        </TouchableOpacity>
      </View>
      
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ministries..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Ministry Presets - Horizontal scrolling tabs */}
      <View style={styles.ministryPresetsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ministryPresetsScrollContent}
        >
          {ministryPresets.map(preset => renderMinistryPresetItem(preset))}
          
          {/* Add ministry button */}
          <TouchableOpacity 
            style={styles.addMinistryPresetButton}
            onPress={() => showMinistryModal()}
          >
            <Ionicons name="add" size={20} color="#3A86FF" />
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* WhatsApp-style Flat List - vertically scrollable */}
      <FlatList
        style={styles.mainList}
        data={prepareSections()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() => <View style={styles.listFooter} />}
      />
      
      {/* Add Group Button */}
      <TouchableOpacity 
        style={styles.addGroupButton}
        onPress={navigateToCreateGroup}
        activeOpacity={0.9}
      >
        <AntDesign name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal for adding/editing ministry preset */}
      <Modal
        visible={isMinistryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMinistryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPreset ? "Edit Ministry" : "Add Ministry"}
              </Text>
              <TouchableOpacity
                onPress={() => setIsMinistryModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Ministry Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter ministry name"
                placeholderTextColor="#94A3B8"
                value={newMinistryName}
                onChangeText={setNewMinistryName}
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsMinistryModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={editingPreset ? updateMinistryPreset : addMinistryPreset}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingPreset ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Light theme as requested
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  menuButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#1E293B",
    fontSize: 16,
  },
  // Ministry presets styles - simplified
  ministryPresetsContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  ministryPresetsScrollContent: {
    paddingHorizontal: 8,
  },
  ministryPresetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    minWidth: 80,
  },
  ministryPresetItemSelected: {
    backgroundColor: "#3A86FF",
  },
  ministryPresetText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
  },
  ministryPresetTextSelected: {
    color: "#FFFFFF",
  },
  ministryPresetAction: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  addMinistryPresetButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  // Main list styles
  mainList: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  sectionHeaderButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#3A86FF',
  },
  sectionHeaderButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  groupItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3A86FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  groupAvatarImage: {
    width: 48,
    height: 48,
  },
  groupAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3A86FF",
    justifyContent: "center",
    alignItems: "center",
  },
  groupContent: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 12,
    justifyContent: "center",
  },
  groupHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  groupTimestamp: {
    fontSize: 12,
    color: "#64748B",
  },
  groupDescriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupDescription: {
    fontSize: 14,
    color: "#64748B",
    flex: 1,
  },
  groupMemberCount: {
    fontSize: 14,
    color: "#64748B",
  },
  notificationBadge: {
    backgroundColor: "#3A86FF",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  notificationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  // Make the add button more like WhatsApp - circular
  addGroupButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#3A86FF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  listFooter: {
    height: 80, // Space for FAB
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  modalSaveButton: {
    backgroundColor: "#3A86FF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});