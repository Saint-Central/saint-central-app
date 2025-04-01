import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Vibration,
  ImageBackground,
  InputAccessoryView,
  Keyboard,
} from "react-native";
import { AntDesign, FontAwesome5, Feather, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../../supabaseClient";
import { BlurView } from "expo-blur";

// Get device dimensions
const { width } = Dimensions.get("window");

// Theme colors
const theme = {
  primary: "#7158e2",
  secondary: "#5F45C2",
  tertiary: "#B39DFF",
  accent: "#F0ECFF",
  light: "#F8F5FF",
  darkPurple: "#4A3B94",
  gray: "#EAEAEA",
  darkGray: "#666666",
  lightGray: "#999999",
  textPrimary: "#333333",
  textSecondary: "#666666",
  textLight: "#999999",
  success: "#4CAF50",
  error: "#FF4757",
  warning: "#FFCC00",
  white: "#FFFFFF",
};

// Replace CATEGORY_ICONS with TYPE_ICONS
const TYPE_ICONS = {
  "prayer": "pray",
  "resolution": "book-open",
  "goal": "target",
  "spiritual": "pray",
  "family": "users",
  "health": "heart",
  "work": "briefcase",
  "friends": "user-friends",
  "world": "globe-americas",
  "personal": "user",
  "other": "ellipsis-h",
};

// Replace getCategoryColor with getTypeColor
const getTypeColor = (type) => {
  const colors = {
    "prayer": ["#7158e2", "#5F45C2"], // Purple
    "resolution": ["#A18CD1", "#FBC2EB"], // Light purple
    "goal": ["#4776E6", "#8E54E9"], // Blue/purple
    "spiritual": ["#7158e2", "#5F45C2"], // Purple
    "family": ["#FF9966", "#FF5E62"], // Orange/red
    "health": ["#56CCF2", "#2F80ED"], // Blue
    "work": ["#A18CD1", "#FBC2EB"], // Light purple
    "friends": ["#00B09B", "#96C93D"], // Green
    "world": ["#4776E6", "#8E54E9"], // Blue/purple
    "personal": ["#FF5858", "#F09819"], // Red/orange
    "other": ["#8E2DE2", "#4A00E0"], // Deep purple
  };
  
  return colors[type] || colors["other"];
};

// Define visibility options with icons and in desired order
const VISIBILITY_OPTIONS = [
  {
    label: "Friends",
    icon: "users",
    description: "Share with your friends"
  },
  {
    label: "Just Me",
    icon: "user",
    description: "Only visible to you"
  },
  {
    label: "Friends & Groups",
    icon: "globe",
    description: "Share with friends and all your groups"
  },
  {
    label: "Certain Groups",
    icon: "grid",
    description: "Select specific groups to share with"
  }
];

// Helper: Convert the returned selected_groups field to a proper array
const parseSelectedGroups = (selected_groups) => {
  if (Array.isArray(selected_groups)) {
    return selected_groups;
  } else if (typeof selected_groups === "string") {
    try {
      // Try JSON parsing first
      return JSON.parse(selected_groups);
    } catch (e) {
      // Fallback: remove any brackets and split by comma
      return selected_groups
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

// IntentionItem Component for rendering each intention card
const IntentionItem = React.memo(({ item, onPress, onToggleFavorite, onToggleCompleted }) => {
  const typeColors = getTypeColor(item.type);
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  return (
    <View style={styles.intentionCardContainer}>
      <TouchableOpacity
        style={[
          styles.intentionCard,
          item.completed && styles.completedIntentionCard
        ]}
        onPress={() => onPress(item)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={item.completed ? ['#E0E0E0', '#BBBBBB'] : typeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.intentionCardGradient}
        />
        
        <View style={styles.intentionCardContent}>
          <View style={styles.intentionCardHeader}>
            <View style={styles.typeContainer}>
              <View style={styles.typeIconContainer}>
                <FontAwesome5 
                  name={TYPE_ICONS[item.type] || "ellipsis-h"} 
                  size={14} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={styles.typeText}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
            
            <View style={styles.intentionActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onToggleFavorite(item.id)}
              >
                <AntDesign 
                  name={item.favorite ? "heart" : "hearto"} 
                  size={18} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onToggleCompleted(item.id)}
              >
                <AntDesign 
                  name={item.completed ? "checkcircle" : "checkcircleo"} 
                  size={18} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text 
            style={[
              styles.intentionTitle,
              item.completed && styles.completedText
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          
          {item.description ? (
            <Text 
              style={[
                styles.intentionDescription,
                item.completed && styles.completedText
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          
          <View style={styles.intentionCardFooter}>
            <View style={styles.visibilityBadge}>
              <Feather 
                name={
                  item.visibility === "Just Me" ? "user" : 
                  item.visibility === "Certain Groups" ? "grid" :
                  item.visibility === "Friends & Groups" ? "globe" : "users"
                } 
                size={12} 
                color="#FFFFFF" 
              />
              <Text style={styles.visibilityText}>{item.visibility}</Text>
            </View>
            
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// Replace CategorySection with TypeSection
const TypeSection = ({ type, intentions, onToggleFavorite, onToggleCompleted, onPressIntention, expanded, onToggleExpand }) => {
  const typeColors = getTypeColor(type);
  const activeCount = intentions.filter(i => !i.completed).length;
  const completedCount = intentions.filter(i => i.completed).length;
  
  return (
    <View style={styles.typeSectionContainer}>
      <TouchableOpacity 
        style={styles.typeSectionHeader}
        onPress={onToggleExpand}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={typeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.typeSectionGradient}
        />
        
        <View style={styles.typeSectionHeaderContent}>
          <View style={styles.typeHeaderLeft}>
            <View style={styles.typeHeaderIconContainer}>
              <FontAwesome5 
                name={TYPE_ICONS[type] || "ellipsis-h"} 
                size={18} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.typeSectionTitle}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </View>
          
          <View style={styles.typeHeaderRight}>
            <View style={styles.typeCountBadge}>
              <Text style={styles.typeCountText}>{intentions.length}</Text>
            </View>
            <AntDesign 
              name={expanded ? "up" : "down"} 
              size={18} 
              color="#FFFFFF" 
              style={styles.typeExpandIcon}
            />
          </View>
        </View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.typeSectionContent}>
          <View style={styles.typeStatsRow}>
            <View style={styles.typeStatItem}>
              <Text style={styles.typeStatLabel}>Active</Text>
              <Text style={styles.typeStatValue}>{activeCount}</Text>
            </View>
            <View style={styles.typeStatItem}>
              <Text style={styles.typeStatLabel}>Completed</Text>
              <Text style={styles.typeStatValue}>{completedCount}</Text>
            </View>
            <View style={styles.typeStatItem}>
              <Text style={styles.typeStatLabel}>Total</Text>
              <Text style={styles.typeStatValue}>{intentions.length}</Text>
            </View>
          </View>
          
          {intentions.map(intention => (
            <IntentionItem 
              key={intention.id}
              item={intention}
              onPress={onPressIntention}
              onToggleFavorite={onToggleFavorite}
              onToggleCompleted={onToggleCompleted}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function RosaryIntentions() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const backgroundImageRequire = require("../../../../assets/images/community-image.jpg");
  
  // State
  const [intentions, setIntentions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all", "active", "completed"
  const [filterType, setFilterType] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest"); // "newest", "oldest", "alphabetical"
  const [notification, setNotification] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPostIntentionModal, setShowPostIntentionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState([]);
  const [postDescriptionFocused, setPostDescriptionFocused] = useState(false);
  
  // Form states
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  
  // New intention state (using Community style)
  const [newIntention, setNewIntention] = useState({
    title: "",
    description: "",
    type: "prayer",
    completed: false,
    favorite: false,
    visibility: "Friends",
    selected_groups: null,
    selectedGroups: []
  });
  
  const [editingIntention, setEditingIntention] = useState(null);
  
  // Header animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 100],
    extrapolate: 'clamp',
  });
  
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });
  
  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });
  
  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Cleanup notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        await fetchUserGroups(user.id);
        await loadIntentions(user.id);
      } else {
        Alert.alert("Authentication Required", "Please log in to manage your prayer intentions");
        // router.push("/login");
      }
    } catch (error) {
      console.error("Authentication error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch user's groups
  const fetchUserGroups = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("group:groups(*)")
        .eq("user_id", userId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const groups = data.map(item => item.group);
        setUserGroups(groups);
      }
    } catch (error) {
      console.error("Error fetching user groups:", error);
    }
  };
  
  // Load intentions from Supabase
  const loadIntentions = async (userId) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('intentions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const formattedData = data.map(item => ({
          id: item.id.toString(),
          title: item.title,
          description: item.description,
          type: item.type || "prayer",
          date: item.created_at,
          completed: item.completed || false,
          favorite: item.favorite || false,
          visibility: item.visibility || "Friends",
          selected_groups: item.selected_groups,
          selectedGroups: parseSelectedGroups(item.selected_groups),
        }));
        
        setIntentions(formattedData);
        
        // Set the first type as expanded by default
        const types = [...new Set(formattedData.map(item => item.type))];
        if (types.length > 0) {
          setExpandedTypes([types[0]]);
        }
      } else {
        setIntentions([]);
      }
    } catch (error) {
      console.error("Failed to load intentions:", error);
      setNotification({
        message: "Failed to load intentions. Please try again.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Post new intention to Community (using the same structure as Community page)
  const handlePostIntention = async () => {
    if (!newIntention.title.trim() || !newIntention.description.trim()) {
      setNotification({
        message: "Please fill in both the title and description.",
        type: "error"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Prepare intention data for Supabase
      const intentionData = {
        user_id: user.id,
        title: newIntention.title,
        description: newIntention.description,
        type: newIntention.type,
        completed: newIntention.completed,
        favorite: newIntention.favorite,
        visibility: newIntention.visibility,
        selected_groups: 
          newIntention.visibility === "Certain Groups" 
            ? newIntention.selectedGroups 
            : [],
        created_at: new Date().toISOString()
      };
      
      // Insert into Supabase
      const { error } = await supabase
        .from('intentions')
        .insert(intentionData);
      
      if (error) throw error;
      
      // Reset form and close modal
      setNewIntention({
        title: "",
        description: "",
        type: "prayer",
        completed: false,
        favorite: false,
        visibility: "Friends",
        selected_groups: null,
        selectedGroups: []
      });
      
      setShowPostIntentionModal(false);
      
      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotification({
        message: "Intention shared to community successfully!",
        type: "success"
      });
      
      // Reload intentions
      await loadIntentions(user.id);
      
    } catch (error) {
      console.error("Failed to post intention:", error);
      setNotification({
        message: "Failed to post intention. Please try again.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle creating a new intention (using Community style)
  const handleCreateIntention = async () => {
    if (!newIntention.title.trim()) {
      setNotification({
        message: "Please enter a title for your intention.",
        type: "error"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Prepare intention data for Supabase
      const intentionData = {
        user_id: user.id,
        title: newIntention.title,
        description: newIntention.description,
        type: newIntention.type,
        completed: newIntention.completed,
        favorite: newIntention.favorite,
        visibility: newIntention.visibility,
        selected_groups: 
          newIntention.visibility === "Certain Groups" 
            ? newIntention.selectedGroups 
            : [],
        created_at: new Date().toISOString()
      };
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('intentions')
        .insert(intentionData)
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Format the new intention for our state
        const newItem = {
          id: data[0].id.toString(),
          title: data[0].title,
          description: data[0].description,
          type: data[0].type,
          date: data[0].created_at,
          completed: data[0].completed || newIntention.completed,
          favorite: data[0].favorite || newIntention.favorite,
          visibility: data[0].visibility,
          selected_groups: data[0].selected_groups,
          selectedGroups: parseSelectedGroups(data[0].selected_groups),
        };
        
        // Update state
        setIntentions([newItem, ...intentions]);
        
        // Make sure the new intention's type is expanded
        if (!expandedTypes.includes(newItem.type)) {
          setExpandedTypes([...expandedTypes, newItem.type]);
        }
        
        // Reset form and close modal
        setNewIntention({
          title: "",
          description: "",
          type: "prayer",
          completed: false,
          favorite: false,
          visibility: "Friends",
          selected_groups: null,
          selectedGroups: []
        });
        setShowAddModal(false);
        
        // Success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNotification({
          message: "Prayer intention added successfully!",
          type: "success"
        });
      }
    } catch (error) {
      console.error("Failed to add intention:", error);
      setNotification({
        message: "Failed to add intention. Please try again.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Edit intention
  const startEditIntention = (intention) => {
    let parsedGroups = [];
    if (intention.selected_groups) {
      if (typeof intention.selected_groups === 'string') {
        try {
          parsedGroups = JSON.parse(intention.selected_groups);
        } catch (e) {
          parsedGroups = intention.selected_groups.split(',').map(id => id.trim());
        }
      } else if (Array.isArray(intention.selected_groups)) {
        parsedGroups = intention.selected_groups;
      }
    }
    
    setEditingIntention(intention);
    setShowEditModal(true);
  };
  
  // Update intention
  const updateIntention = async () => {
    if (!editingIntention.title.trim()) {
      setNotification({
        message: "Please enter a title for your intention.",
        type: "error"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const updatedData = {
        title: editingIntention.title,
        description: editingIntention.description,
        type: editingIntention.type,
        completed: editingIntention.completed,
        favorite: editingIntention.favorite,
        visibility: editingIntention.visibility,
        selected_groups: editingIntention.visibility === "Certain Groups" ? editingIntention.selectedGroups : null,
      };
      
      const { error } = await supabase
        .from('intentions')
        .update(updatedData)
        .eq('id', editingIntention.id)
        .eq('user_id', currentUserId);
      
      if (error) throw error;
      
      // Update local state
      const updatedIntentions = intentions.map(item => 
        item.id === editingIntention.id ? { ...editingIntention, selected_groups: editingIntention.selectedGroups } : item
      );
      
      setIntentions(updatedIntentions);
      
      // If the type has changed, make sure the new type is expanded
      if (!expandedTypes.includes(editingIntention.type)) {
        setExpandedTypes([...expandedTypes, editingIntention.type]);
      }
      
      setShowEditModal(false);
      setEditingIntention(null);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotification({
        message: "Prayer intention updated successfully!",
        type: "success"
      });
    } catch (error) {
      console.error("Failed to update intention:", error);
      setNotification({
        message: "Failed to update intention. Please try again.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete intention
  const deleteIntention = (intentionId) => {
    Alert.alert(
      "Delete Intention",
      "Are you sure you want to delete this prayer intention?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              setIsLoading(true);
              
              const { error } = await supabase
                .from('intentions')
                .delete()
                .eq('id', intentionId)
                .eq('user_id', currentUserId);
              
              if (error) throw error;
              
              const updatedIntentions = intentions.filter(item => item.id !== intentionId);
              setIntentions(updatedIntentions);
              
              if (showEditModal && editingIntention && editingIntention.id === intentionId) {
                setShowEditModal(false);
                setEditingIntention(null);
              }
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setNotification({
                message: "Prayer intention deleted successfully!",
                type: "success"
              });
            } catch (error) {
              console.error("Failed to delete intention:", error);
              setNotification({
                message: "Failed to delete intention. Please try again.",
                type: "error"
              });
            } finally {
              setIsLoading(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };
  
  // Toggle completion status - now updates both local state and database
  const toggleCompleted = async (intentionId) => {
    try {
      const intention = intentions.find(item => item.id === intentionId);
      if (!intention) return;
      
      const newCompletedStatus = !intention.completed;
      
      // Update local state
      const updatedIntentions = intentions.map(item => {
        if (item.id === intentionId) {
          return { ...item, completed: newCompletedStatus };
        }
        return item;
      });
      
      setIntentions(updatedIntentions);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Update in database
      await supabase
        .from('intentions')
        .update({ completed: newCompletedStatus })
        .eq('id', intentionId)
        .eq('user_id', currentUserId);
      
    } catch (error) {
      console.error("Failed to toggle completion:", error);
      setNotification({
        message: "Failed to update intention. Please try again.",
        type: "error"
      });
    }
  };
  
  // Toggle favorite status - now updates both local state and database
  const toggleFavorite = async (intentionId) => {
    try {
      const intention = intentions.find(item => item.id === intentionId);
      if (!intention) return;
      
      const newFavoriteStatus = !intention.favorite;
      
      // Update local state
      const updatedIntentions = intentions.map(item => {
        if (item.id === intentionId) {
          return { ...item, favorite: newFavoriteStatus };
        }
        return item;
      });
      
      setIntentions(updatedIntentions);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Update in database
      await supabase
        .from('intentions')
        .update({ favorite: newFavoriteStatus })
        .eq('id', intentionId)
        .eq('user_id', currentUserId);
      
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      setNotification({
        message: "Failed to update intention. Please try again.",
        type: "error"
      });
    }
  };
  
  // Toggle group selection for new intention
  const toggleGroupSelection = (groupId) => {
    if (newIntention.selectedGroups.includes(groupId)) {
      setNewIntention({
        ...newIntention,
        selectedGroups: newIntention.selectedGroups.filter(id => id !== groupId)
      });
    } else {
      setNewIntention({
        ...newIntention,
        selectedGroups: [...newIntention.selectedGroups, groupId]
      });
    }
  };
  
  // Toggle group selection for editing
  const toggleEditGroupSelection = (groupId) => {
    if (!editingIntention) return;
    const currentSelected = editingIntention.selectedGroups || [];
    if (currentSelected.includes(groupId)) {
      setEditingIntention({
        ...editingIntention,
        selectedGroups: currentSelected.filter(id => id !== groupId)
      });
    } else {
      setEditingIntention({
        ...editingIntention,
        selectedGroups: [...currentSelected, groupId]
      });
    }
  };
  
  // Toggle type expansion
  const toggleTypeExpansion = (type) => {
    if (expandedTypes.includes(type)) {
      setExpandedTypes(expandedTypes.filter(t => t !== type));
    } else {
      setExpandedTypes([...expandedTypes, type]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Group and sort intentions by type
  const getGroupedIntentions = () => {
    let filtered = intentions;
    
    if (activeTab === "active") {
      filtered = filtered.filter(item => !item.completed);
    } else if (activeTab === "completed") {
      filtered = filtered.filter(item => item.completed);
    }
    
    if (filterType) {
      filtered = filtered.filter(item => item.type === filterType);
    }
    
    if (sortOrder === "newest") {
      filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortOrder === "oldest") {
      filtered = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortOrder === "alphabetical") {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
    
    const grouped = {};
    filtered.forEach(intention => {
      if (!grouped[intention.type]) {
        grouped[intention.type] = [];
      }
      grouped[intention.type].push(intention);
    });
    
    return grouped;
  };
  
  // Get unique types
  const getTypes = () => {
    const types = new Set(intentions.map(item => item.type));
    return Array.from(types);
  };
  
  // Get stats
  const getStats = () => {
    const total = intentions.length;
    const active = intentions.filter(i => !i.completed).length;
    const completed = intentions.filter(i => i.completed).length;
    const favorites = intentions.filter(i => i.favorite).length;
    
    return { total, active, completed, favorites };
  };
  
  // Render individual stat item
  const renderStatItem = ({ icon, label, value, color }) => (
    <View style={styles.statItem}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <FontAwesome5 name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
  
  // Render filter options modal
  const renderFilterOptions = () => (
    <Modal
      visible={showFilterOptions}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilterOptions(false)}
    >
      <TouchableOpacity 
        style={styles.filterModalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterOptions(false)}
      >
        <BlurView intensity={60} style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity 
          activeOpacity={1}
          style={styles.filterOptionsContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.filterOptionsHeader}>
            <Text style={styles.filterOptionsTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilterOptions(false)}>
              <AntDesign name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Type</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterTypesContainer}
            >
              <TouchableOpacity
                style={[
                  styles.filterTypeChip,
                  !filterType && styles.filterTypeChipSelected
                ]}
                onPress={() => {
                  setFilterType(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.filterTypeChipText,
                  !filterType && styles.filterTypeChipTextSelected
                ]}>All</Text>
              </TouchableOpacity>
              
              {getTypes().map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterTypeChip,
                    filterType === type && styles.filterTypeChipSelected
                  ]}
                  onPress={() => {
                    setFilterType(filterType === type ? null : type);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <FontAwesome5 
                    name={TYPE_ICONS[type] || "ellipsis-h"} 
                    size={14} 
                    color={filterType === type ? theme.white : theme.textSecondary} 
                    style={styles.filterTypeIcon}
                  />
                  <Text style={[
                    styles.filterTypeChipText,
                    filterType === type && styles.filterTypeChipTextSelected
                  ]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            <View style={styles.statusTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.statusTab,
                  activeTab === "all" && [styles.statusTabSelected, { backgroundColor: theme.primary }]
                ]}
                onPress={() => setActiveTab("all")}
              >
                <Text style={[
                  styles.statusTabText,
                  activeTab === "all" && styles.statusTabTextSelected
                ]}>All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusTab,
                  activeTab === "active" && [styles.statusTabSelected, { backgroundColor: theme.primary }]
                ]}
                onPress={() => setActiveTab("active")}
              >
                <Text style={[
                  styles.statusTabText,
                  activeTab === "active" && styles.statusTabTextSelected
                ]}>Active</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusTab,
                  activeTab === "completed" && [styles.statusTabSelected, { backgroundColor: theme.primary }]
                ]}
                onPress={() => setActiveTab("completed")}
              >
                <Text style={[
                  styles.statusTabText,
                  activeTab === "completed" && styles.statusTabTextSelected
                ]}>Completed</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.sortOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.sortOptionChip,
                  sortOrder === "newest" && [styles.sortOptionChipSelected, { borderColor: theme.primary }]
                ]}
                onPress={() => {
                  setSortOrder("newest");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOrder === "newest" && { color: theme.primary }
                ]}>Newest</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sortOptionChip,
                  sortOrder === "oldest" && [styles.sortOptionChipSelected, { borderColor: theme.primary }]
                ]}
                onPress={() => {
                  setSortOrder("oldest");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOrder === "oldest" && { color: theme.primary }
                ]}>Oldest</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sortOptionChip,
                  sortOrder === "alphabetical" && [styles.sortOptionChipSelected, { borderColor: theme.primary }]
                ]}
                onPress={() => {
                  setSortOrder("alphabetical");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOrder === "alphabetical" && { color: theme.primary }
                ]}>A-Z</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.applyFiltersButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowFilterOptions(false)}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // New Add Modal (Community Style)
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ImageBackground
          source={backgroundImageRequire}
          style={styles.postModalBackground}
        >
          <View style={styles.postModalOverlay}>
            <View style={styles.postModalContent}>
              <Text style={styles.postModalTitle}>New Prayer Intention</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.pickerContainer}>
                  {Object.keys(TYPE_ICONS).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        newIntention.type === type && styles.selectedTypeOption,
                      ]}
                      onPress={() =>
                        setNewIntention({
                          ...newIntention,
                          type: type,
                        })
                      }
                    >
                      <FontAwesome5 
                        name={TYPE_ICONS[type]} 
                        size={14} 
                        color={newIntention.type === type ? "#2D2D3A" : "#FFFFFF"} 
                        style={styles.typeOptionIcon}
                      />
                      <Text style={[
                        styles.typeOptionText,
                        newIntention.type === type && styles.selectedTypeOptionText
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Rest of the modal content remains the same */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Visibility</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                >
                  <View style={styles.dropdownContent}>
                    <Feather 
                      name={
                        newIntention.visibility === "Just Me" ? "user" : 
                        newIntention.visibility === "Certain Groups" ? "grid" :
                        newIntention.visibility === "Friends & Groups" ? "globe" : "users"
                      } 
                      size={16} 
                      color="#FFFFFF" 
                    />
                    <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                      {newIntention.visibility}
                    </Text>
                  </View>
                  <Feather
                    name={showVisibilityDropdown ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#FAC898"
                  />
                </TouchableOpacity>
                
                {showVisibilityDropdown && (
                  <View style={styles.dropdownOptions}>
                    {VISIBILITY_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setNewIntention({
                            ...newIntention,
                            visibility: option.label,
                            selectedGroups:
                              option.label === "Certain Groups"
                                ? newIntention.selectedGroups
                                : [],
                          });
                          setShowVisibilityDropdown(false);
                        }}
                      >
                        <View style={styles.dropdownOptionContent}>
                          <Feather name={option.icon} size={16} color="#FFFFFF" />
                          <Text style={styles.dropdownOptionText}>
                            {option.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {newIntention.visibility === "Certain Groups" && (
                  <View style={styles.groupSelectorContainer}>
                    <Text style={styles.groupSelectorLabel}>
                      Select Groups:
                    </Text>
                    <View style={styles.groupSelectorList}>
                      {userGroups.map((group) => (
                        <TouchableOpacity
                          key={group.id}
                          style={[
                            styles.groupOption,
                            newIntention.selectedGroups.includes(group.id)
                              ? styles.groupOptionSelected
                              : null,
                          ]}
                          onPress={() => toggleGroupSelection(group.id)}
                        >
                          <Text style={styles.groupOptionText}>
                            {group.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={newIntention.title}
                  onChangeText={(text) =>
                    setNewIntention({ ...newIntention, title: text })
                  }
                  placeholder="Enter title..."
                  placeholderTextColor="rgba(250, 200, 152, 0.5)"
                  inputAccessoryViewID="accessoryViewID"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={[
                      styles.formTextarea,
                      postDescriptionFocused && styles.formTextareaFocused,
                    ]}
                    value={newIntention.description}
                    onChangeText={(text) =>
                      setNewIntention({ ...newIntention, description: text })
                    }
                    placeholder="Enter description..."
                    placeholderTextColor="rgba(250, 200, 152, 0.5)"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    inputAccessoryViewID="accessoryViewID"
                    onFocus={() => setPostDescriptionFocused(true)}
                    onBlur={() => setPostDescriptionFocused(false)}
                  />
                  {postDescriptionFocused && (
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setPostDescriptionFocused(false);
                      }}
                    >
                      <Feather name="check" size={20} color="#FAC898" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {Platform.OS === 'ios' && (
                <InputAccessoryView nativeID="accessoryViewID">
                  <View style={styles.accessory}>
                    <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                      <Text style={styles.accessoryText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </InputAccessoryView>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.enhancedCommunityCancel}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.enhancedCommunityCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.enhancedCommunityShare}
                  onPress={handleCreateIntention}
                >
                  <Text style={styles.enhancedCommunityShareText}>Add Intention</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    </Modal>
  );
  
  // Enhanced Edit Modal
  const renderEditModal = () => {
    if (!editingIntention) return null;
    
    return (
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.enhancedModalCard}>
            <View style={styles.enhancedModalHeader}>
              <Text style={styles.enhancedModalTitle}>Edit Prayer Intention</Text>
              <TouchableOpacity 
                style={styles.enhancedModalCloseButton}
                onPress={() => setShowEditModal(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Type Selection - Now First */}
              <Text style={styles.enhancedInputLabel}>Type</Text>
              <TouchableOpacity
                style={styles.enhancedCategorySelector}
                onPress={() => setShowTypeModal(true)}
              >
                <View style={styles.categoryDisplay}>
                  <View style={[
                    styles.enhancedCategorySelectorIcon,
                    { backgroundColor: getTypeColor(editingIntention.type)[0] }
                  ]}>
                    <FontAwesome5 
                      name={TYPE_ICONS[editingIntention.type] || "ellipsis-h"} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <Text style={styles.enhancedCategoryDisplayText}>{editingIntention.type}</Text>
                </View>
                <AntDesign name="down" size={16} color="#666" />
              </TouchableOpacity>
              
              {/* Title Input */}
              <Text style={styles.enhancedInputLabel}>Title *</Text>
              <TextInput
                style={styles.enhancedTextInput}
                placeholder="What would you like to pray for?"
                value={editingIntention.title}
                onChangeText={(text) => setEditingIntention({...editingIntention, title: text})}
                maxLength={100}
              />
              
              {/* Description Input */}
              <Text style={styles.enhancedInputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.enhancedTextInput, styles.enhancedTextArea]}
                placeholder="Add more details about your intention..."
                value={editingIntention.description}
                onChangeText={(text) => setEditingIntention({...editingIntention, description: text})}
                multiline={true}
                numberOfLines={4}
                maxLength={500}
              />
              
              {/* Visibility Selection */}
              <Text style={styles.enhancedInputLabel}>Visibility</Text>
              <TouchableOpacity
                style={styles.enhancedCategorySelector}
                onPress={() => setShowVisibilityModal(true)}
              >
                <View style={styles.categoryDisplay}>
                  <View style={styles.enhancedVisibilitySelectorIcon}>
                    <Feather 
                      name={
                        editingIntention.visibility === "Just Me" ? "user" : 
                        editingIntention.visibility === "Certain Groups" ? "grid" :
                        editingIntention.visibility === "Friends & Groups" ? "globe" : "users"
                      } 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <Text style={styles.enhancedCategoryDisplayText}>{editingIntention.visibility}</Text>
                </View>
                <AntDesign name="down" size={16} color="#666" />
              </TouchableOpacity>
              
              {/* If Certain Groups is selected, show group selection */}
              {editingIntention.visibility === "Certain Groups" && (
                <View style={styles.enhancedGroupSelector}>
                  <Text style={styles.enhancedGroupSelectorTitle}>Select Groups</Text>
                  {userGroups.length > 0 ? (
                    <View style={styles.enhancedGroupList}>
                      {userGroups.map((group) => (
                        <TouchableOpacity
                          key={group.id}
                          style={[
                            styles.enhancedGroupChip,
                            editingIntention.selectedGroups && editingIntention.selectedGroups.includes(group.id) && styles.enhancedGroupChipSelected
                          ]}
                          onPress={() => toggleEditGroupSelection(group.id)}
                        >
                          <Text style={[
                            styles.enhancedGroupChipText,
                            editingIntention.selectedGroups && editingIntention.selectedGroups.includes(group.id) && styles.enhancedGroupChipTextSelected
                          ]}>{group.name}</Text>
                          {editingIntention.selectedGroups && editingIntention.selectedGroups.includes(group.id) && (
                            <AntDesign name="check" size={14} color={theme.white} style={styles.enhancedGroupChipIcon} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.enhancedNoGroupsText}>You don't have any groups yet.</Text>
                  )}
                </View>
              )}
              
              <View style={styles.enhancedOptionsContainer}>
                <Text style={styles.enhancedOptionsSectionTitle}>Additional Options</Text>
                <View style={styles.enhancedOptionsRow}>
                  <Text style={styles.enhancedOptionLabel}>Mark as favorite</Text>
                  <TouchableOpacity
                    style={[
                      styles.enhancedFavoriteToggle,
                      editingIntention.favorite && { backgroundColor: `${theme.primary}20` }
                    ]}
                    onPress={() => {
                      setEditingIntention({...editingIntention, favorite: !editingIntention.favorite});
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <AntDesign 
                      name={editingIntention.favorite ? "heart" : "hearto"} 
                      size={20}
                      color={theme.primary} 
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.enhancedOptionsRow}>
                  <Text style={styles.enhancedOptionLabel}>Mark as completed</Text>
                  <TouchableOpacity
                    style={[
                      styles.enhancedFavoriteToggle,
                      editingIntention.completed && { backgroundColor: `${theme.primary}20` }
                    ]}
                    onPress={() => {
                      setEditingIntention({...editingIntention, completed: !editingIntention.completed});
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <AntDesign 
                      name={editingIntention.completed ? "checkcircle" : "checkcircleo"} 
                      size={20} 
                      color={theme.primary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.enhancedDeleteButton}
                onPress={() => deleteIntention(editingIntention.id)}
              >
                <AntDesign name="delete" size={20} color={theme.error} />
                <Text style={styles.enhancedDeleteButtonText}>Delete Intention</Text>
              </TouchableOpacity>
            </ScrollView>
            
            <View style={styles.enhancedModalFooter}>
              <TouchableOpacity
                style={[styles.enhancedCancelButton, { borderColor: theme.lightGray }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.enhancedCancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.enhancedSaveButton, { backgroundColor: theme.primary }]}
                onPress={updateIntention}
              >
                <Text style={styles.enhancedSaveButtonText}>Save Changes</Text>
                <AntDesign name="check" size={20} color="#FFFFFF" style={styles.enhancedButtonIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };
  
  // Add button
  const renderButtons = () => (
    <View style={styles.buttonsContainer}>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => {
          setNewIntention({
            title: "",
            description: "",
            type: "prayer",
            completed: false,
            favorite: false,
            visibility: "Friends",
            selected_groups: null,
            selectedGroups: []
          });
          setShowAddModal(true);
        }}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.primary, theme.darkPurple]}
          style={styles.floatingButtonGradient}
        >
          <AntDesign name="plus" size={26} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
  
  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['rgba(113, 88, 226, 0.1)', 'rgba(113, 88, 226, 0.05)']}
        style={styles.emptyStateGradient}
      />
      
      <FontAwesome5 name="pray" size={60} color={`${theme.primary}70`} />
      <Text style={styles.emptyStateTitle}>No Intentions Found</Text>
      <Text style={styles.emptyStateDescription}>
        {filterType 
          ? `You don't have any ${activeTab === "completed" ? "completed" : ""} intentions in the ${filterType} category.`
          : activeTab === "all" 
            ? "Add your first prayer intention to get started."
            : activeTab === "active"
              ? "You don't have any active intentions."
              : "You don't have any completed intentions."}
      </Text>
      
      {(activeTab === "all" || activeTab === "active") && (
        <View style={styles.emptyStateButtons}>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setShowAddModal(true)}
          >
            <LinearGradient
              colors={[theme.primary, theme.darkPurple]}
              style={styles.emptyStateButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <AntDesign name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.emptyStateButtonText}>Add Intention</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
  
  // Notification toast
  const renderNotification = () => {
    if (!notification) return null;
    
    return (
      <View 
        style={[
          styles.notificationToast,
          notification.type === 'error' ? styles.errorToast : styles.successToast
        ]}
      >
        <View style={styles.notificationContent}>
          <AntDesign 
            name={notification.type === 'error' ? "exclamationcircle" : "checkcircle"} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      </View>
    );
  };
  
  // Group intentions by type
  const groupedIntentions = getGroupedIntentions();
  const groupedTypes = Object.keys(groupedIntentions);
  
  // Enhanced Type selection modal
  const renderTypeModal = () => {
    return (
      <Modal
        visible={showTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.enhancedModalCard}>
            <View style={styles.enhancedModalHeader}>
              <Text style={styles.enhancedModalTitle}>Select Type</Text>
              <TouchableOpacity 
                style={styles.enhancedModalCloseButton}
                onPress={() => setShowTypeModal(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.typeModalScrollView}>
              {Object.keys(TYPE_ICONS).map((type) => {
                const isSelected = editingIntention 
                  ? editingIntention.type === type 
                  : newIntention.type === type;
                
                const typeColors = getTypeColor(type);
                
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.enhancedTypeItem,
                      isSelected && styles.enhancedTypeItemSelected
                    ]}
                    onPress={() => {
                      if (editingIntention) {
                        setEditingIntention({...editingIntention, type: type});
                      } else {
                        setNewIntention({...newIntention, type: type});
                      }
                      
                      setShowTypeModal(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <LinearGradient
                      colors={typeColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.enhancedTypeGradient,
                        isSelected && { opacity: 1 }
                      ]}
                    />
                    
                    <View style={styles.enhancedTypeContent}>
                      <View style={[
                        styles.enhancedTypeIconContainer,
                        { backgroundColor: isSelected ? 'transparent' : typeColors[0] }
                      ]}>
                        <FontAwesome5 
                          name={TYPE_ICONS[type]} 
                          size={20} 
                          color="#FFFFFF" 
                        />
                      </View>
                      
                      <Text style={[
                        styles.enhancedTypeText,
                        isSelected && { color: "#FFFFFF", fontWeight: "700" }
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                      
                      {isSelected && (
                        <View style={styles.enhancedTypeCheck}>
                          <AntDesign name="check" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Enhanced Visibility selection modal
  const renderVisibilityModal = () => {
    return (
      <Modal
        visible={showVisibilityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.enhancedModalCard}>
            <View style={styles.enhancedModalHeader}>
              <Text style={styles.enhancedModalTitle}>Select Visibility</Text>
              <TouchableOpacity 
                style={styles.enhancedModalCloseButton}
                onPress={() => setShowVisibilityModal(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.enhancedVisibilityList}>
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = editingIntention 
                  ? editingIntention.visibility === option.label 
                  : newIntention.visibility === option.label;
                
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.enhancedVisibilityItem,
                      isSelected && styles.enhancedVisibilityItemSelected
                    ]}
                    onPress={() => {
                      if (editingIntention) {
                        setEditingIntention({
                          ...editingIntention,
                          visibility: option.label,
                          selectedGroups: option.label === "Certain Groups" ? editingIntention.selectedGroups : []
                        });
                      } else {
                        setNewIntention({
                          ...newIntention,
                          visibility: option.label,
                          selectedGroups: option.label === "Certain Groups" ? newIntention.selectedGroups : []
                        });
                      }
                      
                      setShowVisibilityModal(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={styles.enhancedVisibilityContent}>
                      <View style={styles.enhancedVisibilityIconContainer}>
                        <Feather name={option.icon} size={20} color="#FFFFFF" />
                      </View>
                      
                      <View style={styles.enhancedVisibilityTextContainer}>
                        <Text style={styles.enhancedVisibilityTitle}>
                          {option.label}
                        </Text>
                        <Text style={styles.enhancedVisibilityDescription}>
                          {option.description}
                        </Text>
                      </View>
                      
                      {isSelected && (
                        <View style={styles.enhancedVisibilityCheck}>
                          <AntDesign name="check" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with collapsible content */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={[theme.primary, theme.darkPurple]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Fixed header content */}
        <View style={styles.headerFixedContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <AntDesign name="arrowleft" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <Animated.Text style={[styles.headerTitle, { opacity: headerTitleOpacity }]}>
            Prayer Intentions
          </Animated.Text>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterOptions(true)}
            activeOpacity={0.7}
          >
            <Feather 
              name="sliders" 
              size={22} 
              color={filterType || activeTab !== "all" || sortOrder !== "newest" ? theme.warning : "#FFF"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Collapsible header content */}
        <Animated.View style={[styles.headerCollapsibleContent, { opacity: headerContentOpacity }]}>
          <Text style={styles.headerMainTitle}>Prayer Intentions</Text>
          
          {/* Stats row */}
          <View style={styles.statsContainer}>
            {renderStatItem({ 
              icon: "list-ul", 
              label: "Total", 
              value: getStats().total, 
              color: theme.white 
            })}
            
            {renderStatItem({ 
              icon: "hourglass-half", 
              label: "Active", 
              value: getStats().active, 
              color: theme.white 
            })}
            
            {renderStatItem({ 
              icon: "check-circle", 
              label: "Completed", 
              value: getStats().completed, 
              color: theme.white 
            })}
            
            {renderStatItem({ 
              icon: "heart", 
              label: "Favorites", 
              value: getStats().favorites, 
              color: theme.white 
            })}
          </View>
        </Animated.View>
      </Animated.View>
      
      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading intentions...</Text>
        </View>
      ) : intentions.length > 0 ? (
        groupedTypes.length > 0 ? (
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.typesContainer}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
            {groupedTypes.map(type => (
              <TypeSection
                key={type}
                type={type}
                intentions={groupedIntentions[type]}
                onToggleFavorite={toggleFavorite}
                onToggleCompleted={toggleCompleted}
                onPressIntention={startEditIntention}
                expanded={expandedTypes.includes(type)}
                onToggleExpand={() => toggleTypeExpansion(type)}
              />
            ))}
            <View style={styles.bottomPadding} />
          </Animated.ScrollView>
        ) : (
          renderEmptyState()
        )
      ) : (
        renderEmptyState()
      )}
      
      {/* Notification */}
      {renderNotification()}
      
      {/* Buttons */}
      {renderButtons()}
      
      {/* Modals */}
      {renderAddModal()}
      {renderEditModal()}
      {renderTypeModal()}
      {renderVisibilityModal()}
      {renderFilterOptions()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    width: "100%",
    overflow: "hidden",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerFixedContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCollapsibleContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerMainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  statItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  
  // Collapsible category sections
  scrollView: {
    flex: 1,
  },
  typesContainer: {
    padding: 16,
  },
  typeSectionContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  typeSectionHeader: {
    overflow: "hidden",
    borderRadius: 16,
  },
  typeSectionGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  typeSectionHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  typeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeHeaderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  typeSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  typeHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeCountBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  typeCountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  typeExpandIcon: {
    marginLeft: 4,
  },
  typeSectionContent: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  typeStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  typeStatItem: {
    alignItems: "center",
  },
  typeStatLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  typeStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333333",
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 180,
  },
  
  // Intention card styles
  intentionCardContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  intentionCard: {
    overflow: "hidden",
    minHeight: 120,
  },
  completedIntentionCard: {
    opacity: 0.7,
  },
  intentionCardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  intentionCardContent: {
    padding: 16,
  },
  intentionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  intentionActions: {
    flexDirection: "row",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  intentionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  intentionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 12,
  },
  completedText: {
    textDecorationLine: "line-through",
  },
  intentionCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  visibilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visibilityText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  
  // Filter modal
  filterModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterOptionsContainer: {
    width: width * 0.9,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  filterOptionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  filterOptionsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 12,
  },
  filterTypesContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  filterTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginRight: 10,
  },
  filterTypeChipSelected: {
    backgroundColor: "#7158e2",
  },
  filterTypeIcon: {
    marginRight: 6,
  },
  filterTypeChipText: {
    fontSize: 14,
    color: "#666666",
  },
  filterTypeChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  statusTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    padding: 4,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  statusTabSelected: {
    backgroundColor: "#7158e2",
  },
  statusTabText: {
    fontSize: 14,
    color: "#666666",
  },
  statusTabTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  sortOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sortOptionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 10,
    marginBottom: 10,
  },
  sortOptionChipSelected: {
    borderWidth: 1,
    backgroundColor: "rgba(113, 88, 226, 0.05)",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#666666",
  },
  applyFiltersButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  
  // Floating buttons
  buttonsContainer: {
    position: "absolute",
    right: 20,
    bottom: 100,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#7158e2",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 15,
  },
  floatingButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  emptyStateButtons: {
    width: "100%",
    gap: 15,
  },
  emptyStateButton: {
    overflow: "hidden",
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyStateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  
  // Notifications
  notificationToast: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  errorToast: {
    backgroundColor: "rgba(255, 71, 87, 0.9)",
  },
  successToast: {
    backgroundColor: "rgba(76, 175, 80, 0.9)",
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  notificationText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666666",
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  
  // Enhanced Modal Styles
  enhancedModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  enhancedModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  enhancedModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#242424",
  },
  enhancedModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 24,
  },
  enhancedInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 10,
  },
  enhancedTextInput: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333333",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  enhancedTextArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  enhancedCategorySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  enhancedCategorySelectorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancedVisibilitySelectorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7158e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancedCategoryDisplayText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  
  // Category selection styles
  enhancedTypeList: {
    padding: 16,
  },
  enhancedTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 10,
    height: 60,
    position: "relative",
    overflow: "hidden",
  },
  enhancedTypeItemSelected: {
    backgroundColor: "#7158e2", // Will be overridden by gradient
  },
  enhancedTypeGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.2,
  },
  enhancedTypeContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  enhancedTypeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  enhancedTypeText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
    flex: 1,
  },
  enhancedTypeCheck: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  
  // Visibility selection styles
  enhancedVisibilityList: {
    padding: 16,
  },
  enhancedVisibilityItem: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  enhancedVisibilityItemSelected: {
    backgroundColor: "#F0ECFF",
    borderColor: "#7158e2",
  },
  enhancedVisibilityContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  enhancedVisibilityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7158e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  enhancedVisibilityTextContainer: {
    flex: 1,
  },
  enhancedVisibilityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 4,
  },
  enhancedVisibilityDescription: {
    fontSize: 14,
    color: "#666666",
  },
  enhancedVisibilityCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#7158e2",
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Group selection styles
  enhancedGroupSelector: {
    marginTop: 5,
    marginBottom: 20,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
  },
  enhancedGroupSelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 12,
  },
  enhancedGroupList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  enhancedGroupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
  },
  enhancedGroupChipSelected: {
    backgroundColor: "#7158e2",
  },
  enhancedGroupChipText: {
    fontSize: 14,
    color: "#333333",
  },
  enhancedGroupChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  enhancedGroupChipIcon: {
    marginLeft: 6,
  },
  enhancedNoGroupsText: {
    fontSize: 14,
    color: "#666666",
    fontStyle: "italic",
  },
  
  // Additional options
  enhancedOptionsContainer: {
    marginTop: 5,
    marginBottom: 20,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
  },
  enhancedOptionsSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 14,
  },
  enhancedOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  enhancedOptionLabel: {
    fontSize: 15,
    color: "#333333",
  },
  enhancedFavoriteToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Delete button
  enhancedDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 10,
    backgroundColor: "#FFF2F2",
    borderRadius: 16,
  },
  enhancedDeleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF4757",
    marginLeft: 8,
  },
  
  // Modal footer
  enhancedModalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  enhancedCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
  },
  enhancedCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  enhancedSaveButton: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#7158e2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  enhancedSaveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  enhancedButtonIcon: {
    marginLeft: 8,
  },
  
  // Community-style modal styles
  postModalBackground: {
    flex: 1,
  },
  postModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    padding: 20,
  },
  postModalContent: {
    backgroundColor: "rgba(30, 30, 45, 0.9)",
    borderRadius: 20,
    padding: 20,
    backdropFilter: "blur(10px)",
  },
  postModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FAC898",
    marginBottom: 20,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FAC898",
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FAC898",
    marginBottom: 8,
  },
  selectedTypeOption: {
    backgroundColor: "#FAC898",
  },
  typeOptionIcon: {
    marginRight: 8,
  },
  typeOptionText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  selectedTypeOptionText: {
    color: "#2D2D3A",
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  dropdownOptions: {
    backgroundColor: "rgba(50, 50, 65, 0.95)",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  dropdownOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownOptionText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 10,
  },
  
  // Enhanced community selectors
  enhancedCommunitySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  enhancedCommunityCategoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#7158e2",
  },
  enhancedCommunityCategoryText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  
  // Group selector for community
  groupSelectorContainer: {
    marginTop: 10,
    padding: 16,
    backgroundColor: "rgba(250, 200, 152, 0.1)",
    borderRadius: 12,
  },
  groupSelectorLabel: {
    fontSize: 14,
    color: "#FAC898",
    marginBottom: 10,
  },
  groupSelectorList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  groupOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FAC898",
    marginBottom: 8,
  },
  groupOptionSelected: {
    backgroundColor: "#FAC898",
  },
  groupOptionText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  
  // Form inputs for community
  formInput: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 12,
    padding: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },
  formTextarea: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
    borderRadius: 12,
    padding: 16,
    color: "#FFFFFF",
    fontSize: 16,
    minHeight: 120,
  },
  formTextareaFocused: {
    borderWidth: 1,
    borderColor: "#FAC898",
  },
  
  // Keyboard accessory
  accessory: {
    height: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#2D2D3A",
    paddingHorizontal: 16,
  },
  accessoryText: {
    color: "#FAC898",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Enhanced community modal actions
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  enhancedCommunityCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  enhancedCommunityCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  enhancedCommunityShare: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    backgroundColor: "#FAC898",
  },
  enhancedCommunityShareText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D2D3A",
  },
  textInputContainer: { 
    position: 'relative', 
  },
  closeButton: { 
    position: 'absolute', 
    right: 10, 
    top: 10, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    borderRadius: 20, 
    width: 36, 
    height: 36, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(250, 200, 152, 0.4)', 
  },
  moreTypesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: "rgba(250, 200, 152, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(250, 200, 152, 0.3)",
  },
  moreTypesButtonText: {
    color: "#FAC898",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  typeModalScrollView: {
    padding: 16,
  },
  typeGroupSection: {
    marginBottom: 20,
  },
  typeGroupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 12,
    paddingLeft: 8,
  },
  enhancedTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 10,
    height: 60,
    position: "relative",
    overflow: "hidden",
  },
  enhancedTypeItemSelected: {
    backgroundColor: "#7158e2", // Will be overridden by gradient
  },
  enhancedTypeGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.2,
  },
  enhancedTypeContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  enhancedTypeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  enhancedTypeText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
    flex: 1,
  },
  enhancedTypeCheck: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  filterTypesContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  filterTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginRight: 10,
  },
  filterTypeChipSelected: {
    backgroundColor: "#7158e2",
  },
  filterTypeIcon: {
    marginRight: 6,
  },
  filterTypeChipText: {
    fontSize: 14,
    color: "#666666",
  },
  filterTypeChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});