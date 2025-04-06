// CombinedMinistriesScreen.tsx
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
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
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
import { BlurView } from "expo-blur";
import Swipeable from 'react-native-gesture-handler/Swipeable';
import LottieView from "lottie-react-native";

// Import the Sidebar component
import Sidebar from "./sidebarComponent";

// Ministry interface based on database schema
interface Ministry {
  id: number;
  church_id: number;
  name: string;
  description: string;
  leader?: string;
  meeting_time?: string;
  location?: string;
  image?: string;
  image_url?: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
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
  church: undefined;
  MinistriesScreen: { refresh?: boolean };
  ministryDetail: { ministryId: number };
  ministryChat: { groupId: number; groupName: string };
  createMinistryGroupScreen: { selectedPresetId?: string };
  groupParticipants: { groupId: number; isNewGroup?: boolean };
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

// Add constant for admin roles
const ADMIN_ROLES = ['admin', 'leader', 'pastor'];

export default function CombinedMinistriesScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [joinedMinistries, setJoinedMinistries] = useState<Ministry[]>([]);
  const [availableMinistries, setAvailableMinistries] = useState<Ministry[]>([]);
  const [filteredJoinedMinistries, setFilteredJoinedMinistries] = useState<Ministry[]>([]);
  const [filteredAvailableMinistries, setFilteredAvailableMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<number | null>(null);
  const [churchName, setChurchName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
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
  
  // Action sheet state
  const [isActionSheetVisible, setIsActionSheetVisible] = useState<boolean>(false);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [modalAnimation] = useState(new Animated.Value(0));
  
  // Ref for search input
  const searchInputRef = useRef<TextInput>(null);

  // Filter ministries when search text changes
  useEffect(() => {
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      setFilteredJoinedMinistries(
        joinedMinistries.filter(ministry => 
          ministry.name.toLowerCase().includes(searchLower) || 
          (ministry.description && ministry.description.toLowerCase().includes(searchLower))
        )
      );
      setFilteredAvailableMinistries(
        availableMinistries.filter(ministry => 
          ministry.name.toLowerCase().includes(searchLower) || 
          (ministry.description && ministry.description.toLowerCase().includes(searchLower))
        )
      );
    } else {
      setFilteredJoinedMinistries(joinedMinistries);
      setFilteredAvailableMinistries(availableMinistries);
    }
  }, [searchText, joinedMinistries, availableMinistries]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Check for refresh param in route
  useEffect(() => {
    const params = route.params as RouteParams;
    if (params?.refresh) {
      fetchData();
      // Clear the refresh param
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params]);

  // Fetch ministries data
  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    fetchData();
  }, []);

  // Header animations based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 15],
    extrapolate: "clamp",
  });

  async function fetchData(): Promise<void> {
    try {
      setLoading(true);
      console.log("Fetching ministries data...");

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

      console.log("Current user ID:", user.id);
      setUserId(user.id);

      // Fetch user profile
      const { data: userData, error: profileError } = await supabase
        .from("users")
        .select("first_name, profile_image")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
      } else if (userData) {
        if (userData.first_name) {
          setUserName(userData.first_name);
        } else {
          setUserName("Friend");
        }

        if (userData.profile_image) {
          setProfileImage(userData.profile_image);
        }
      }

      // Get church ID from route params or from user's membership
      const params = route.params as RouteParams;
      let churchIdToUse = params?.churchId;

      if (!churchIdToUse) {
        // Fetch from membership and check role
        const { data: memberData, error: memberError } = await supabase
          .from("church_members")
          .select("church_id, role")
          .eq("user_id", user.id)
          .single();

        if (memberError) {
          console.error("Error fetching membership:", memberError);
          throw memberError;
        }

        churchIdToUse = memberData.church_id;
        // Check if user's role is in the admin roles list
        setIsAdmin(memberData.role && ADMIN_ROLES.includes(memberData.role.toLowerCase()));
      }

      setChurchId(churchIdToUse ?? null);
      console.log("Church ID for ministries:", churchIdToUse);

      // Fetch church name
      const { data: churchData, error: churchError } = await supabase
        .from("churches")
        .select("name")
        .eq("id", churchIdToUse)
        .single();

      if (churchError) {
        console.error("Error fetching church name:", churchError);
      } else if (churchData) {
        setChurchName(churchData.name);
      }

      // Fetch ministries for this church
      const { data: ministriesData, error: ministriesError } = await supabase
        .from("ministries")
        .select("*")
        .eq("church_id", churchIdToUse);

      if (ministriesError) {
        console.error("Error fetching ministries data:", ministriesError);
        throw ministriesError;
      }

      // Then, fetch member counts using a separate query
      const { data: memberCounts, error: countError } = await supabase
        .from("ministry_members")
        .select('ministry_id')
        .in('ministry_id', ministriesData.map(m => m.id));

      if (countError) {
        console.error("Error fetching member counts:", countError);
      }

      // Count members for each ministry
      const memberCountMap = memberCounts?.reduce<Record<number, number>>((acc, curr) => {
        acc[curr.ministry_id] = (acc[curr.ministry_id] || 0) + 1;
        return acc;
      }, {}) || {};

      // Finally, fetch user's memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from("ministry_members")
        .select("ministry_id")
        .eq("user_id", user.id);
        
      if (membershipError) {
        console.error("Error fetching ministry memberships:", membershipError);
        throw membershipError;
      }
      
      const memberMinistryIds = membershipData?.map(item => item.ministry_id) || [];
      
      // Process the ministries data
      const processedMinistries = ministriesData.map(ministry => ({
        ...ministry,
        member_count: memberCountMap[ministry.id] || 0,
        is_member: memberMinistryIds.includes(ministry.id),
        image_url: ministry.image || null // Ensure we have consistent property name
      }));

      // Store all ministries
      setMinistries(processedMinistries || []);

      // Split into joined and available ministries
      setJoinedMinistries(processedMinistries.filter(ministry => ministry.is_member));
      setAvailableMinistries(processedMinistries.filter(ministry => !ministry.is_member));

    } catch (error) {
      console.error("Error in data fetch:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Navigate to ministry detail screen
  const navigateToMinistryDetail = (ministryId: number) => {
    navigation.navigate('ministryDetail', { ministryId });
  };
  
  // Navigate to ministry chat
  const navigateToMinistryChat = (ministry: Ministry) => {
    try {
      navigation.navigate('ministryChat', { 
        groupId: ministry.id,
        groupName: ministry.name 
      });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Could not navigate to chat. Please try again.");
    }
  };
  
  // Navigate to ministry creation screen
  const navigateToCreateMinistry = () => {
    try {
      console.log("Navigating to createMinistryGroup with preset:", selectedPreset);
      
      // Create Alert to confirm action
      Alert.alert(
        "Create New Ministry", 
        `Create a new ministry with the "${ministryPresets.find(p => p.id === selectedPreset)?.name}" preset?`,
        [
          { 
            text: "Create", 
            onPress: () => {
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
      Alert.alert("Navigation Error", "Could not navigate to create ministry screen. Please try again.");
    }
  };

  // Go back to church screen
  const navigateToChurch = () => {
    navigation.navigate('church');
  };

  // Join a ministry
  const handleJoinMinistry = async (ministryId: number): Promise<void> => {
    try {
      if (!userId) {
        Alert.alert("Error", "You must be logged in to join a ministry");
        return;
      }

      const { error } = await supabase
        .from("ministry_members")
        .insert({
          ministry_id: ministryId,
          user_id: userId,
          role: 'member',
          joined_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error joining ministry:", error);
        throw error;
      }

      // Refresh the ministries list
      fetchData();
      Alert.alert("Success", "You have joined the ministry!");

    } catch (error) {
      console.error("Error joining ministry:", error);
      Alert.alert("Error", "Could not join the ministry. Please try again.");
    }
  };

  // Leave a ministry
  const handleLeaveMinistry = async (ministryId: number): Promise<void> => {
    try {
      if (!userId) {
        Alert.alert("Error", "You must be logged in to leave a ministry");
        return;
      }

      const { error } = await supabase
        .from("ministry_members")
        .delete()
        .eq("ministry_id", ministryId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error leaving ministry:", error);
        throw error;
      }

      // Refresh the ministries list
      fetchData();
      Alert.alert("Success", "You have left the ministry.");

    } catch (error) {
      console.error("Error leaving ministry:", error);
      Alert.alert("Error", "Could not leave the ministry. Please try again.");
    }
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
  
  // Show action sheet for a ministry
  const showActionSheet = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
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
      setSelectedMinistry(null);
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
  
  // Render the right swipe actions for a ministry
  const renderRightActions = (ministry: Ministry) => {
    if (!ministry.is_member) return null;
    
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity 
          style={[styles.swipeAction, styles.swipeActionMore]}
          onPress={() => showActionSheet(ministry)}
        >
          <MaterialIcons name="more-horiz" size={24} color="#fff" />
          <Text style={styles.swipeActionText}>More</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.swipeAction, styles.swipeActionArchive]}
          onPress={() => handleLeaveMinistry(ministry.id)}
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

  // Render ministry avatar
  const renderMinistryAvatar = (ministry: Ministry) => {
    if (ministry.image_url) {
      return (
        <Image 
          source={{ uri: ministry.image_url }} 
          style={styles.ministryAvatarImage} 
        />
      );
    }
    
    // WhatsApp-style placeholder with initials
    const avatarColor = getAvatarColor(ministry.name);
    const initials = getInitials(ministry.name);
    
    return (
      <View 
        style={[
          styles.ministryAvatarPlaceholder, 
          { backgroundColor: avatarColor }
        ]}
      >
        <Text style={styles.ministryAvatarInitials}>{initials}</Text>
      </View>
    );
  };

  // Create sections for flat list
  const prepareSections = () => {
    const sections = [];

    // Add featured ministry if any exist
    if (filteredJoinedMinistries.length > 0) {
      sections.push({
        type: 'featured',
        data: filteredJoinedMinistries[0],
        id: 'featured_ministry'
      });
    }

    // Add joined ministries section if any exist
    if (filteredJoinedMinistries.length > 0) {
      sections.push({
        type: 'header',
        title: 'Ministries you\'re in',
        id: 'joined_header'
      });
      
      filteredJoinedMinistries.forEach(ministry => {
        sections.push({
          type: 'joined_ministry',
          data: ministry,
          id: `joined_${ministry.id}`
        });
      });
    }

    // Add available ministries section if any exist
    if (filteredAvailableMinistries.length > 0) {
      sections.push({
        type: 'header',
        title: 'Ministries you can join',
        id: 'available_header'
      });
      
      filteredAvailableMinistries.forEach(ministry => {
        sections.push({
          type: 'available_ministry',
          data: ministry,
          id: `available_${ministry.id}`
        });
      });
    }

    return sections;
  };

  // Render list items
  const renderItem = ({ item }: any) => {
    switch (item.type) {
      case 'featured':
        return (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="star" size={16} color="#075E54" />
              <Text style={styles.sectionTitle}>Featured Ministry</Text>
            </View>

            <TouchableOpacity 
              style={styles.featuredMinistryCard}
              activeOpacity={0.9}
              onPress={() => navigateToMinistryDetail(item.data.id)}
            >
              <LinearGradient
                colors={["rgba(7, 94, 84, 0.05)", "rgba(7, 94, 84, 0.1)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featuredCardGradient}
              >
                {item.data.image_url && (
                  <Image 
                    source={{ uri: item.data.image_url }} 
                    style={styles.featuredMinistryImage} 
                    resizeMode="cover"
                  />
                )}
                <Text style={styles.featuredMinistryTitle}>{item.data.name}</Text>
                <Text style={styles.featuredMinistryDescription}>
                  {item.data.description}
                </Text>
                <View style={styles.featuredMinistryStats}>
                  <View style={styles.ministryStat}>
                    <Ionicons name="people" size={16} color="#075E54" />
                    <Text style={styles.ministryStatText}>{item.data.member_count || 0} members</Text>
                  </View>
                  {item.data.leader && (
                    <View style={styles.ministryStat}>
                      <Ionicons name="person" size={16} color="#075E54" />
                      <Text style={styles.ministryStatText}>Led by {item.data.leader}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.featuredButtonRow}>
                  <TouchableOpacity 
                    style={styles.featuredMinistryButton}
                    onPress={() => navigateToMinistryDetail(item.data.id)}
                  >
                    <Text style={styles.featuredButtonText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.featuredMinistryButton}
                    onPress={() => navigateToMinistryChat(item.data)}
                  >
                    <Text style={styles.featuredButtonText}>Open Chat</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
        
      case 'header':
        return (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            {item.title === 'Ministries you can join' && isAdmin && (
              <TouchableOpacity 
                style={styles.sectionHeaderButton}
                onPress={navigateToCreateMinistry}
              >
                <Text style={styles.sectionHeaderButtonText}>Create New</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      
      case 'joined_ministry':
        return (
          <Swipeable
            renderRightActions={() => renderRightActions(item.data)}
            overshootRight={false}
          >
            <TouchableOpacity 
              style={styles.ministryItem}
              onPress={() => navigateToMinistryChat(item.data)}
              activeOpacity={0.7}
              onLongPress={() => showActionSheet(item.data)}
            >
              <View style={styles.ministryAvatar}>
                {renderMinistryAvatar(item.data)}
              </View>
              
              <View style={styles.ministryContent}>
                <View style={styles.ministryHeaderRow}>
                  <Text style={styles.ministryName} numberOfLines={1}>
                    {item.data.name}
                  </Text>
                  <Text style={styles.ministryTimestamp}>
                    {formatTime(item.data.created_at)}
                  </Text>
                </View>
                
                <View style={styles.ministryDescriptionRow}>
                  <Text style={styles.ministryDescription} numberOfLines={1}>
                    {item.data.description}
                  </Text>
                  
                  {item.data.member_count > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationText}>
                        {item.data.member_count}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Swipeable>
        );
      
      case 'available_ministry':
        return (
          <TouchableOpacity 
            style={styles.ministryItem}
            onPress={() => handleJoinMinistry(item.data.id)}
            activeOpacity={0.7}
          >
            <View style={styles.ministryAvatar}>
              {renderMinistryAvatar(item.data)}
            </View>
            
            <View style={styles.ministryContent}>
              <View style={styles.ministryHeaderRow}>
                <Text style={styles.ministryName} numberOfLines={1}>
                  {item.data.name}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </View>
              
              <View style={styles.ministryDescriptionRow}>
                <Text style={styles.ministryMemberCount} numberOfLines={1}>
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
    fetchData();
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.lottieWrapper}>
          <LottieView
            source={require("../../assets/lottie/loading.json")}
            autoPlay
            loop
            style={styles.lottieAnimation}
            renderMode="HARDWARE"
            speed={0.8}
            resizeMode="cover"
          />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF006E" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {error?.message || "Could not load ministries information"}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.navigate("church" as never)}
          >
            <Text style={styles.errorButtonText}>Back to Church</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        userName={userName}
        profileImage={profileImage}
      />

      {/* Floating header effect */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerOpacity,
          },
        ]}
      >
        <BlurView intensity={85} tint="light" style={styles.blurView} />
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={navigateToChurch}>
            <Ionicons name="arrow-back" size={24} color="#075E54" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ministries</Text>
        </View>
        
        <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
          <Ionicons name="menu" size={24} color="#075E54" />
        </TouchableOpacity>
      </View>

      {/* Church name display */}
      <View style={styles.churchNameContainer}>
        <TouchableOpacity 
          style={styles.churchNameButton}
          onPress={navigateToChurch}
        >
          <FontAwesome5 name="church" size={16} color="#075E54" />
          <Text style={styles.churchName}>{churchName}</Text>
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
      
      {/* Empty state */}
      {!loading && prepareSections().length === 0 && (
        <View style={styles.emptyStateContainer}>
          <FontAwesome5 name="church" size={64} color="#C0C0C0" />
          <Text style={styles.emptyStateTitle}>No Ministries Found</Text>
          <Text style={styles.emptyStateSubtitle}>
            {searchText 
              ? `No results found for "${searchText}"`
              : "Join or create a ministry to get started"
            }
          </Text>
          
          {!searchText && isAdmin && (
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToCreateMinistry}
            >
              <Text style={styles.emptyStateButtonText}>Create New Ministry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* WhatsApp-style Flat List */}
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        {!loading && prepareSections().length > 0 && (
          <FlatList
            style={styles.mainList}
            data={prepareSections()}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            ListFooterComponent={() => <View style={styles.listFooter} />}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}
      </Animated.View>
      
      {/* Add Ministry Button (FAB) */}
      {isAdmin && (
        <TouchableOpacity 
          style={styles.addMinistryButton}
          onPress={navigateToCreateMinistry}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="message-plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

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
              {selectedMinistry && (
                <>
                  <View style={styles.actionSheetHeader}>
                    <Text style={styles.actionSheetTitle}>{selectedMinistry.name}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.actionSheetOption}
                    onPress={() => {
                      hideActionSheet();
                      navigateToMinistryChat(selectedMinistry);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={24} color="#075E54" />
                    <Text style={styles.actionSheetOptionText}>View Chat</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionSheetOption}
                    onPress={() => {
                      hideActionSheet();
                      navigateToMinistryDetail(selectedMinistry.id);
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={24} color="#075E54" />
                    <Text style={styles.actionSheetOptionText}>Ministry Details</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionSheetOption}
                    onPress={() => {
                      hideActionSheet();
                      // Navigate to group info page
                      navigation.navigate('groupParticipants', { 
                        groupId: selectedMinistry.id
                      });
                    }}
                  >
                    <Ionicons name="people-outline" size={24} color="#075E54" />
                    <Text style={styles.actionSheetOptionText}>View Members</Text>
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
                      handleLeaveMinistry(selectedMinistry.id);
                    }}
                  >
                    <Ionicons name="exit-outline" size={24} color="#DC2626" />
                    <Text style={styles.actionSheetOptionTextDanger}>Leave Ministry</Text>
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
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 85 : 65,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 225, 0.5)",
    backgroundColor: "#FFFFFF",
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    paddingTop: Platform.OS === "ios" ? 30 : 12,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
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
  // Church name container
  churchNameContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 5,
  },
  churchNameButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(7, 94, 84, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  churchName: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    color: "#334155",
  },
  // Search and presets
  searchContainer: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    zIndex: 5,
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
    zIndex: 5,
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
  // Section headers
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginLeft: 8,
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
  // Featured ministry section
  featuredSection: {
    paddingVertical: 12,
  },
  featuredMinistryCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  featuredCardGradient: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.5)",
  },
  featuredMinistryImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
  },
  featuredMinistryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  featuredMinistryDescription: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 16,
  },
  featuredMinistryStats: {
    flexDirection: "row",
    marginBottom: 16,
  },
  ministryStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  ministryStatText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 6,
  },
  featuredButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  featuredMinistryButton: {
    backgroundColor: "#075E54",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Ministry item styles (WhatsApp style)
  ministryItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  ministryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  ministryAvatarImage: {
    width: 48,
    height: 48,
  },
  ministryAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#075E54",
    justifyContent: "center",
    alignItems: "center",
  },
  ministryAvatarInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ministryContent: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 12,
    justifyContent: "center",
  },
  ministryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ministryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  ministryTimestamp: {
    fontSize: 12,
    color: "#64748B",
  },
  ministryDescriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ministryDescription: {
    fontSize: 14,
    color: "#64748B",
    flex: 1,
  },
  ministryMemberCount: {
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
  addMinistryButton: {
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
    zIndex: 10,
  },
  listFooter: {
    height: 80, // Space for FAB
  },
  // Modal styles
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
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  lottieWrapper: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  lottieAnimation: {
    width: 120,
    height: 120,
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#075E54",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});