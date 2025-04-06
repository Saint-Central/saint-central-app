// MinistryGroupsScreen.tsx - Enhanced with WhatsApp-style layout
import React, { useState, useEffect, useRef } from "react";
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
  ActivityIndicator,
  Animated,
  Dimensions,
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
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as ImagePicker from 'expo-image-picker';
import CreateMinistryGroupScreen from './createMinistryGroupScreen';

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
  created_by?: string;
  created_at?: string;
  church_id?: number;
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
  refresh?: boolean;
}

// Add type definition for navigation
type RootStackParamList = {
  Ministries: undefined;
  MinistriesScreen: undefined;
  ministryChat: { groupId: number; groupName: string };
  createMinistryGroupScreen: { selectedPresetId?: string };
  groupParticipants: { groupId: number; isNewGroup?: boolean };
  MinistryGroupsScreen: { refresh?: boolean };
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

// Get avatar color based on group name (similar to WhatsApp)
const getAvatarColor = (name: string): string => {
  const colors = [
    '#25D366', // WhatsApp Green
    '#34B7F1', // WhatsApp Blue
    '#075E54', // WhatsApp Dark Green
    '#128C7E', // WhatsApp Teal
    '#4CAF50', // Material Green
    '#2196F3', // Material Blue
    '#673AB7', // Material Deep Purple
    '#FF9800', // Material Orange
  ];
  
  // Simple hash function to pick a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate initials from group name
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export default function MinistryGroupsScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [joinedGroups, setJoinedGroups] = useState<MinistryGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<MinistryGroup[]>([]);
  const [filteredJoinedGroups, setFilteredJoinedGroups] = useState<MinistryGroup[]>([]);
  const [filteredAvailableGroups, setFilteredAvailableGroups] = useState<MinistryGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
  const [churchId, setChurchId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  
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
  
  // New modals state
  const [isActionSheetVisible, setIsActionSheetVisible] = useState<boolean>(false);
  const [selectedGroup, setSelectedGroup] = useState<MinistryGroup | null>(null);
  const [modalAnimation] = useState(new Animated.Value(0));
  
  // Ref for search input
  const searchInputRef = useRef<TextInput>(null);

  // Filter groups when search text changes
  useEffect(() => {
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      setFilteredJoinedGroups(
        joinedGroups.filter(group => 
          group.name.toLowerCase().includes(searchLower) || 
          (group.description && group.description.toLowerCase().includes(searchLower))
        )
      );
      setFilteredAvailableGroups(
        availableGroups.filter(group => 
          group.name.toLowerCase().includes(searchLower) || 
          (group.description && group.description.toLowerCase().includes(searchLower))
        )
      );
    } else {
      setFilteredJoinedGroups(joinedGroups);
      setFilteredAvailableGroups(availableGroups);
    }
  }, [searchText, joinedGroups, availableGroups]);

  // Fetch groups data
  useEffect(() => {
    fetchGroups();
  }, []);
  
  // Check for refresh param in route
  useEffect(() => {
    const params = route.params as RouteParams;
    if (params?.refresh) {
      fetchGroups();
      // Clear the refresh param
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params]);

  const fetchGroups = async (): Promise<void> => {
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
      
      setUserId(user.id);

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
      
      // Fetch unread message counts for each group
      const { data: unreadCounts, error: unreadError } = await supabase
        .from("ministry_group_unread_counts")
        .select("group_id, count")
        .eq("user_id", user.id);
        
      if (unreadError) {
        console.error("Error fetching unread counts:", unreadError);
        // Continue without unread counts
      }
      
      const notificationCounts = unreadCounts 
        ? unreadCounts.reduce((acc, item) => {
            acc[item.group_id] = item.count;
            return acc;
          }, {} as Record<number, number>)
        : {};
      
      // Process groups data
      const userGroups: MinistryGroup[] = [];
      const otherGroups: MinistryGroup[] = [];
      
      groupsData.forEach(group => {
        const processedGroup: MinistryGroup = {
          id: group.id,
          name: group.name,
          description: group.description || "",
          image: group.image || "",
          last_active: group.last_active || new Date().toISOString(),
          notification_count: notificationCounts[group.id] || 0,
          member_count: group.member_count || 0,
          is_member: memberGroupIds.includes(group.id),
          status_message: group.status_message || "",
          created_by: group.created_by || "",
          created_at: group.created_at || "",
          church_id: group.church_id,
        };
        
        if (processedGroup.is_member) {
          userGroups.push(processedGroup);
        } else {
          otherGroups.push(processedGroup);
        }
      });
      
      // Sort groups by last active time (newest first)
      userGroups.sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime());
      
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
          church_id: churchIdToUse,
        },
        {
          id: 2,
          name: "Ministry All Members",
          description: "General announcements",
          image: "",
          last_active: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          notification_count: 2,
          member_count: 120,
          is_member: true,
          status_message: "~ Sarah joined from the community",
          church_id: churchIdToUse,
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
          church_id: churchIdToUse,
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
          church_id: churchIdToUse,
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
          church_id: churchIdToUse,
        });
      }
      
      setJoinedGroups(userGroups);
      setFilteredJoinedGroups(userGroups);
      setAvailableGroups(otherGroups);
      setFilteredAvailableGroups(otherGroups);

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
      Alert.alert(
        "Error", 
        "Could not load ministry groups. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Navigate back to MinistriesScreen.tsx directly
  const navigateBack = () => {
    try {
      navigation.navigate('MinistriesScreen');
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Could not navigate back. Please try again.");
    }
  };
  
  // Navigate to a specific group chat
  const navigateToGroupChat = (group: MinistryGroup) => {
    try {
      navigation.navigate('ministryChat', { 
        groupId: group.id,
        groupName: group.name 
      });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Could not navigate to chat. Please try again.");
    }
  };
  
  // Navigate to group creation screen
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
              // Direct navigation to the imported component
              navigation.navigate('createMinistryGroupScreen', {
                selectedPresetId: selectedPreset
              });
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

  // Join a ministry group
  const joinGroup = async (group: MinistryGroup) => {
    if (!userId || !group.id) {
      Alert.alert("Error", "Cannot join group at this time.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Add user to group members
      const { error } = await supabase
        .from("ministry_group_members")
        .insert({
          user_id: userId,
          ministry_group_id: group.id,
          joined_at: new Date().toISOString(),
          role: 'member'
        });
        
      if (error) {
        console.error("Error joining group:", error);
        Alert.alert("Error", "Could not join group. Please try again.");
        return;
      }
      
      // Update member count
      await supabase
        .from("ministry_groups")
        .update({
          member_count: group.member_count + 1,
          last_active: new Date().toISOString(),
          status_message: `~ You joined the group`
        })
        .eq("id", group.id);
      
      // Refresh groups
      await fetchGroups();
      
      // Navigate to the group chat
      navigateToGroupChat({
        ...group,
        is_member: true,
        member_count: group.member_count + 1
      });
      
    } catch (error) {
      console.error("Error joining group:", error);
      Alert.alert("Error", "Could not join group. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Leave a ministry group
  const leaveGroup = async (group: MinistryGroup) => {
    if (!userId || !group.id) {
      Alert.alert("Error", "Cannot leave group at this time.");
      return;
    }
    
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${group.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Remove user from group members
              const { error } = await supabase
                .from("ministry_group_members")
                .delete()
                .eq("user_id", userId)
                .eq("ministry_group_id", group.id);
                
              if (error) {
                console.error("Error leaving group:", error);
                Alert.alert("Error", "Could not leave group. Please try again.");
                return;
              }
              
              // Update member count
              await supabase
                .from("ministry_groups")
                .update({
                  member_count: Math.max(0, group.member_count - 1),
                  last_active: new Date().toISOString()
                })
                .eq("id", group.id);
              
              // Refresh groups
              await fetchGroups();
              
              // Show success message
              Alert.alert("Success", `You have left "${group.name}"`);
              
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert("Error", "Could not leave group. Please try again.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Show the ministry preset modal
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
      setSelectedPreset(newId);

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
  
  // Show action sheet for a group
  const showActionSheet = (group: MinistryGroup) => {
    setSelectedGroup(group);
    setIsActionSheetVisible(true);
    
    // Animate the action sheet up
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };
  
  // Hide action sheet
  const hideActionSheet = () => {
    // Animate the action sheet down
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsActionSheetVisible(false);
      setSelectedGroup(null);
    });
  };

  // Get action sheet animation styles
  const actionSheetStyle = {
    transform: [
      {
        translateY: modalAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0],
        }),
      },
    ],
  };
  
  // Render the right swipe actions for a group
  const renderRightActions = (group: MinistryGroup) => {
    if (!group.is_member) return null;
    
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity 
          style={[styles.swipeAction, styles.swipeActionMore]}
          onPress={() => showActionSheet(group)}
        >
          <MaterialIcons name="more-horiz" size={24} color="#fff" />
          <Text style={styles.swipeActionText}>More</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.swipeAction, styles.swipeActionArchive]}
          onPress={() => leaveGroup(group)}
        >
          <MaterialIcons name="archive" size={24} color="#fff" />
          <Text style={styles.swipeActionText}>Leave</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render ministry preset item
  const renderMinistryPresetItem = (preset: MinistryPreset) => (
    <TouchableOpacity
      key={preset.id}
      style={[
        styles.ministryPresetItem,
        selectedPreset === preset.id && styles.ministryPresetItemSelected
      ]}
      onPress={() => {
        setSelectedPreset(preset.id);
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
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

  // Render group avatar
  const renderGroupAvatar = (group: MinistryGroup) => {
    if (group.image) {
      return (
        <Image 
          source={{ uri: group.image }} 
          style={styles.groupAvatarImage} 
        />
      );
    }
    
    // WhatsApp-style placeholder with initials
    const avatarColor = getAvatarColor(group.name);
    const initials = getInitials(group.name);
    
    return (
      <View 
        style={[
          styles.groupAvatarPlaceholder, 
          { backgroundColor: avatarColor }
        ]}
      >
        <Text style={styles.groupAvatarInitials}>{initials}</Text>
      </View>
    );
  };

  // Create sections for flat list
  const prepareSections = () => {
    const sections = [];

    // Add joined groups section if any exist
    if (filteredJoinedGroups.length > 0) {
      sections.push({
        type: 'header',
        title: 'Groups you\'re in',
        id: 'joined_header'
      });
      
      filteredJoinedGroups.forEach(group => {
        sections.push({
          type: 'joined_group',
          data: group,
          id: `joined_${group.id}`
        });
      });
    }

    // Add available groups section if any exist
    if (filteredAvailableGroups.length > 0) {
      sections.push({
        type: 'header',
        title: 'Groups you can join',
        id: 'available_header'
      });
      
      filteredAvailableGroups.forEach(group => {
        sections.push({
          type: 'available_group',
          data: group,
          id: `available_${group.id}`
        });
      });
    }

    return sections;
  };

  // Render list items
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
          <Swipeable
            renderRightActions={() => renderRightActions(item.data)}
            overshootRight={false}
          >
            <TouchableOpacity 
              style={styles.groupItem}
              onPress={() => navigateToGroupChat(item.data)}
              activeOpacity={0.7}
              onLongPress={() => showActionSheet(item.data)}
            >
              <View style={styles.groupAvatar}>
                {renderGroupAvatar(item.data)}
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
          </Swipeable>
        );
      
      case 'available_group':
        return (
          <TouchableOpacity 
            style={styles.groupItem}
            onPress={() => joinGroup(item.data)}
            activeOpacity={0.7}
          >
            <View style={styles.groupAvatar}>
              {renderGroupAvatar(item.data)}
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
  
  // Handle pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  // Focus search input
  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Clear search input
  const clearSearch = () => {
    setSearchText("");
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Ionicons name="arrow-back" size={24} color="#075E54" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ministry Groups</Text>
        </View>
        
        <TouchableOpacity style={styles.menuButton} onPress={focusSearch}>
          <Ionicons name="search" size={24} color="#075E54" />
        </TouchableOpacity>
      </View>
      
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search ministries..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
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
            <Ionicons name="add" size={20} color="#075E54" />
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* Loading indicator */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#075E54" />
        </View>
      )}
      
      {/* Empty state */}
      {!loading && prepareSections().length === 0 && (
        <View style={styles.emptyStateContainer}>
          <FontAwesome5 name="church" size={64} color="#C0C0C0" />
          <Text style={styles.emptyStateTitle}>No Ministry Groups</Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchText 
              ? `No results found for "${searchText}"`
              : "Join or create a ministry group to get started"
            }
          </Text>
          
          {!searchText && (
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToCreateGroup}
            >
              <Text style={styles.emptyStateButtonText}>Create New Group</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* WhatsApp-style Flat List - vertically scrollable */}
      {!loading && prepareSections().length > 0 && (
        <FlatList
          style={styles.mainList}
          data={prepareSections()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => <View style={styles.listFooter} />}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
      
      {/* Add Group Button (FAB) */}
      <TouchableOpacity 
        style={styles.addGroupButton}
        onPress={navigateToCreateGroup}
        activeOpacity={0.9}
      >
        <MaterialCommunityIcons name="message-plus" size={24} color="#fff" />
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
      
      {/* Action Sheet Modal (WhatsApp-style) */}
      {isActionSheetVisible && (
        <Modal
          visible={isActionSheetVisible}
          transparent={true}
          animationType="none"
          onRequestClose={hideActionSheet}
        >
          <TouchableOpacity 
            style={styles.actionSheetOverlay}
            activeOpacity={1}
            onPress={hideActionSheet}
          >
            <Animated.View 
              style={[styles.actionSheetContent, actionSheetStyle]}
            >
              {selectedGroup && (
                <>
                  <View style={styles.actionSheetHeader}>
                    <Text style={styles.actionSheetTitle}>{selectedGroup.name}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.actionSheetOption}
                    onPress={() => {
                      hideActionSheet();
                      navigateToGroupChat(selectedGroup);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={24} color="#075E54" />
                    <Text style={styles.actionSheetOptionText}>View Chat</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionSheetOption}
                    onPress={() => {
                      hideActionSheet();
                      // Navigate to group info page
                      navigation.navigate('groupParticipants', { 
                        groupId: selectedGroup.id
                      });
                    }}
                  >
                    <Ionicons name="people-outline" size={24} color="#075E54" />
                    <Text style={styles.actionSheetOptionText}>Group Info</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionSheetOption}
                    onPress={() => {
                      hideActionSheet();
                      // Mute/unmute notifications
                      Alert.alert("Info", "Notification settings will be added in a future update.");
                    }}
                  >
                    <Ionicons name="notifications-off-outline" size={24} color="#075E54" />
                    <Text style={styles.actionSheetOptionText}>Mute Notifications</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionSheetOption, styles.actionSheetOptionDanger]}
                    onPress={() => {
                      hideActionSheet();
                      leaveGroup(selectedGroup);
                    }}
                  >
                    <Ionicons name="exit-outline" size={24} color="#DC2626" />
                    <Text style={styles.actionSheetOptionTextDanger}>Leave Group</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Ministry presets styles
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
    backgroundColor: "#075E54", // WhatsApp green
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
  // Empty state
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyStateButton: {
    backgroundColor: '#075E54',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 24,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#075E54',
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
    backgroundColor: "#075E54",
    justifyContent: "center",
    alignItems: "center",
  },
  groupAvatarInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupContent: {
    flex: 1,
    borderBottomWidth: 0.5,
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
    backgroundColor: "#25D366", // WhatsApp light green
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  notificationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  // Swipe actions
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 150,
  },
  swipeAction: {
    height: '100%',
    width: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionArchive: {
    backgroundColor: '#FF5722', // Orange for leave
  },
  swipeActionMore: {
    backgroundColor: '#075E54', // WhatsApp green
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  // Make the add button more like WhatsApp - circular
  addGroupButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#25D366", // WhatsApp light green
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
    backgroundColor: "#075E54", // WhatsApp green
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Action sheet (WhatsApp style)
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  actionSheetContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 36, // Extra padding for bottom safety
  },
  actionSheetHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  actionSheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionSheetOptionText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 20,
  },
  actionSheetOptionDanger: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 8,
  },
  actionSheetOptionTextDanger: {
    fontSize: 16,
    color: "#DC2626",
    marginLeft: 20,
  },
});