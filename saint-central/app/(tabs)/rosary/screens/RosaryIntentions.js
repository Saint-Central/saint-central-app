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
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  FlatList,
  Pressable,
} from "react-native";
import { AntDesign, FontAwesome5, Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../../supabaseClient";
import { BlurView } from "expo-blur";

// Get device dimensions
const { width, height } = Dimensions.get("window");

// New theme colors - More vibrant with better contrast
const theme = {
  primary: "#7C5DFA", // Vibrant purple
  secondary: "#5E48E8", // Deep purple
  background: "#F8F8FB", // Light background
  surface: "#FFFFFF", // White
  surfaceVariant: "#F3F3F9", // Very light purple
  error: "#EF4444", // Red
  success: "#3ECF8E", // Green
  warning: "#F7B955", // Yellow
  textPrimary: "#1A1F36", // Dark blue-black
  textSecondary: "#7A7C8C", // Medium gray
  textTertiary: "#ABAFC7", // Light gray
  divider: "#EBE9F1", // Very light gray
  cardShadow: "#00000014", // Light shadow
  icon: "#5A607F", // Dark blue-gray
  highlight: "#F4F1FF", // Very light purple
};

// Type icons with improved visual identity
const TYPE_ICONS = {
  "prayer": { name: "pray", style: "fa5", color: ["#7C5DFA", "#5E48E8"] }, // Purple
  "resolution": { name: "checkbox-outline", style: "ion", color: ["#6E8EFA", "#4865DD"] }, // Blue
  "goal": { name: "target", style: "feather", color: ["#F087B3", "#E44A89"] }, // Pink
  "spiritual": { name: "church", style: "fa5", color: ["#43B883", "#2E9D74"] }, // Green
  "family": { name: "people", style: "ion", color: ["#F7B955", "#F59C22"] }, // Orange
  "health": { name: "heart", style: "fa5", color: ["#FF6B6B", "#EE5253"] }, // Red
  "work": { name: "briefcase", style: "fa5", color: ["#4192E3", "#2E73B8"] }, // Blue
  "friends": { name: "users", style: "fa5", color: ["#38CEC3", "#27A59A"] }, // Teal
  "world": { name: "globe", style: "fa5", color: ["#4CB8FF", "#0A84FF"] }, // Sky
  "personal": { name: "person", style: "ion", color: ["#AC8AFE", "#8A5CFF"] }, // Light Purple
  "other": { name: "options", style: "ion", color: ["#9CA3AF", "#6B7280"] }, // Gray
};

// Helper function to render icon based on type
const renderTypeIcon = (type, size = 20, color = "#FFFFFF") => {
  const iconInfo = TYPE_ICONS[type] || TYPE_ICONS["other"];
  
  switch (iconInfo.style) {
    case "fa5":
      return <FontAwesome5 name={iconInfo.name} size={size} color={color} />;
    case "ion":
      return <Ionicons name={iconInfo.name} size={size} color={color} />;
    case "feather":
      return <Feather name={iconInfo.name} size={size} color={color} />;
    default:
      return <FontAwesome5 name={iconInfo.name} size={size} color={color} />;
  }
};

// Visibility options
const VISIBILITY_OPTIONS = [
  {
    id: "just-me",
    label: "Just Me",
    icon: "lock-closed",
    style: "ion",
    description: "Only visible to you",
    color: "#6B7280"
  },
  {
    id: "friends",
    label: "Friends",
    icon: "people",
    style: "ion",
    description: "Share with your friends",
    color: "#7C5DFA"
  },
  {
    id: "groups",
    label: "Friends & Groups",
    icon: "globe",
    style: "fa5",
    description: "Share with friends and all your groups",
    color: "#AC8AFE"
  },
  {
    id: "certain-groups",
    label: "Certain Groups",
    icon: "people-circle",
    style: "ion",
    description: "Select specific groups to share with",
    color: "#43B883"
  }
];

// Helper functions
const parseSelectedGroups = (selected_groups) => {
  if (Array.isArray(selected_groups)) {
    return selected_groups;
  } else if (typeof selected_groups === "string") {
    try {
      return JSON.parse(selected_groups);
    } catch (e) {
      return selected_groups
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    }
  }
  return [];
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const day = 24 * 60 * 60 * 1000;
  
  if (diff < day) {
    return "Today";
  } else if (diff < 2 * day) {
    return "Yesterday";
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)} days ago`;
  } else {
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

// COMPLETELY REDESIGNED: Intention Card Component
const IntentionCard = React.memo(({ item, onPress, onToggleFavorite, onToggleCompleted, index }) => {
  const iconInfo = TYPE_ICONS[item.type] || TYPE_ICONS["other"];
  const animation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });
  
  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  return (
    <Animated.View 
      style={[
        styles.intentionCard,
        { opacity, transform: [{ translateY }] }
      ]}
    >
      <Pressable
        style={styles.intentionCardInner}
        onPress={() => onPress(item)}
        android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
      >
        <View style={styles.cardContent}>
          {/* Left side with icon */}
          <LinearGradient
            colors={iconInfo.color}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardIconContainer}
          >
            {renderTypeIcon(item.type, 16)}
          </LinearGradient>
          
          {/* Middle - title and description */}
          <View style={styles.cardTextContainer}>
            <Text 
              style={[
                styles.cardTitle,
                item.completed && styles.completedText
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            
            {item.description ? (
              <Text 
                style={styles.cardDescription}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            ) : null}
            
            <View style={styles.cardMetaRow}>
              <View style={styles.visibilityContainer}>
                {item.visibility === "Just Me" ? (
                  <Ionicons name="lock-closed" size={10} color={theme.textTertiary} />
                ) : item.visibility === "Friends" ? (
                  <Ionicons name="people" size={10} color={theme.textTertiary} />
                ) : item.visibility === "Friends & Groups" ? (
                  <FontAwesome5 name="globe" size={9} color={theme.textTertiary} />
                ) : (
                  <Ionicons name="people-circle" size={10} color={theme.textTertiary} />
                )}
                <Text style={styles.metaText}>{item.visibility}</Text>
              </View>
              
              <Text style={styles.metaText}>{formatDate(item.date)}</Text>
            </View>
          </View>
          
          {/* Right side actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, item.favorite && styles.actionButtonActive]}
              onPress={() => onToggleFavorite(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AntDesign 
                name={item.favorite ? "heart" : "hearto"} 
                size={16} 
                color={item.favorite ? theme.error : theme.textTertiary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, item.completed && styles.actionButtonActive]}
              onPress={() => onToggleCompleted(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={item.completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={16} 
                color={item.completed ? theme.success : theme.textTertiary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// Type Option Item for the redesigned filter drawer
const TypeFilterItem = ({ type, isSelected, onSelect }) => {
  const iconInfo = TYPE_ICONS[type] || TYPE_ICONS["other"];
  
  return (
    <TouchableOpacity
      style={[styles.typeFilterItem, isSelected && styles.typeFilterItemSelected]}
      onPress={() => onSelect(type)}
      activeOpacity={0.7}
    >
      <View style={styles.typeFilterIconWrapper}>
        <LinearGradient
          colors={iconInfo.color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.typeFilterIcon}
        >
          {renderTypeIcon(type, 14, "#FFFFFF")}
        </LinearGradient>
      </View>
      
      <Text style={[
        styles.typeFilterText,
        isSelected && styles.typeFilterTextSelected
      ]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Text>
      
      {isSelected && (
        <Ionicons name="checkmark" size={16} color={theme.primary} style={styles.typeFilterCheckmark} />
      )}
    </TouchableOpacity>
  );
};

// Sort Option for filter drawer
const SortOption = ({ label, sortKey, currentSort, onSelect }) => (
  <TouchableOpacity
    style={[styles.sortOption, currentSort === sortKey && styles.sortOptionSelected]}
    onPress={() => onSelect(sortKey)}
  >
    <Text style={[styles.sortOptionText, currentSort === sortKey && styles.sortOptionTextSelected]}>
      {label}
    </Text>
    
    {currentSort === sortKey && (
      <Ionicons name="checkmark" size={16} color={theme.primary} />
    )}
  </TouchableOpacity>
);

// Visibility Option Component for the add/edit modal
const VisibilityOption = ({ option, selected, onSelect }) => {
  const IconComponent = option.style === "ion" ? Ionicons : FontAwesome5;
  
  return (
    <TouchableOpacity
      style={[
        styles.visibilityOption,
        selected && styles.visibilityOptionSelected
      ]}
      onPress={() => onSelect(option)}
      activeOpacity={0.7}
    >
      <View style={styles.visibilityOptionContent}>
        <View 
          style={[
            styles.visibilityIconContainer,
            { backgroundColor: option.color + '15' }
          ]}
        >
          <IconComponent name={option.icon} size={18} color={option.color} />
        </View>
        
        <View style={styles.visibilityTextContainer}>
          <Text style={styles.visibilityLabel}>{option.label}</Text>
          <Text style={styles.visibilityDescription}>{option.description}</Text>
        </View>
      </View>
      
      {selected && (
        <View style={styles.visibilitySelectedIndicator}>
          <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Type Option Component for the add/edit modal
const TypeOption = ({ type, selected, onSelect }) => {
  const iconInfo = TYPE_ICONS[type] || TYPE_ICONS["other"];
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  
  return (
    <TouchableOpacity
      style={[
        styles.typeOption,
        selected && styles.typeOptionSelected
      ]}
      onPress={() => onSelect(type)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={iconInfo.color}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.typeOptionIconContainer}
      >
        {renderTypeIcon(type, 16, "#FFFFFF")}
      </LinearGradient>
      
      <Text style={styles.typeOptionLabel}>{typeLabel}</Text>
      
      {selected && (
        <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
      )}
    </TouchableOpacity>
  );
};

// Group Option Component for the add/edit modal
const GroupOption = ({ group, selected, onSelect }) => (
  <TouchableOpacity
    style={[
      styles.groupOption,
      selected && styles.groupOptionSelected
    ]}
    onPress={() => onSelect(group.id)}
    activeOpacity={0.7}
  >
    <Text style={[
      styles.groupOptionLabel,
      selected && styles.groupOptionLabelSelected
    ]}>
      {group.name}
    </Text>
    
    {selected && (
      <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
    )}
  </TouchableOpacity>
);

// Empty State Component
const EmptyState = ({ filterType, activeTab, onAddIntention }) => {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons 
          name={
            activeTab === "completed" ? "checkmark-done-circle" : 
            activeTab === "active" ? "time-outline" : "prayer"
          } 
          size={56} 
          color={theme.primary} 
        />
      </View>
      
      <Text style={styles.emptyStateTitle}>
        {filterType 
          ? `No ${activeTab === "completed" ? "completed" : ""} ${filterType} intentions found`
          : activeTab === "all" 
            ? "No intentions yet"
            : activeTab === "active"
              ? "No active intentions"
              : "No completed intentions"}
      </Text>
      
      <Text style={styles.emptyStateDescription}>
        {filterType 
          ? `Try changing filters or add a new ${filterType} intention`
          : activeTab === "all" 
            ? "Your prayer journey starts with your first intention"
            : activeTab === "active"
              ? "All your intentions are completed - great job!"
              : "As you complete intentions, they'll appear here"}
      </Text>
      
      {(activeTab === "all" || activeTab === "active") && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={onAddIntention}
        >
          <LinearGradient
            colors={[theme.primary, theme.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emptyStateButtonGradient}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.emptyStateButtonText}>
              Add New Intention
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Toast Notification Component
const ToastNotification = ({ message, type, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  
  useEffect(() => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  }, []);
  
  return (
    <Animated.View 
      style={[
        styles.toastContainer,
        type === "error" ? styles.toastError : styles.toastSuccess,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.toastContent}>
        <Ionicons 
          name={type === "error" ? "alert-circle" : "checkmark-circle"} 
          size={20} 
          color="white" 
        />
        <Text style={styles.toastMessage}>{message}</Text>
      </View>
    </Animated.View>
  );
};

// Main Component
export default function RosaryIntentions() {
  const router = useRouter();
  
  // State variables
  const [intentions, setIntentions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all", "active", "completed"
  const [filterType, setFilterType] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest"); // "newest", "oldest", "alphabetical"
  const [notification, setNotification] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Animation values
  const filterDrawerAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const addButtonAnimation = useRef(new Animated.Value(0)).current;
  
  // Form states
  const [newIntention, setNewIntention] = useState({
    title: "",
    description: "",
    type: "prayer",
    completed: false,
    favorite: false,
    visibility: "Just Me",
    selectedGroups: []
  });
  
  const [editingIntention, setEditingIntention] = useState(null);
  
  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Filter drawer animation
  useEffect(() => {
    Animated.timing(filterDrawerAnim, {
      toValue: showFilterDrawer ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showFilterDrawer]);
  
  // Add button animations
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(addButtonAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(addButtonAnimation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  // Cleanup notification after timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Authentication function
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
  
  // Fetch user groups function
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
  
  // Load intentions function
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
          visibility: item.visibility || "Just Me",
          selected_groups: item.selected_groups,
          selectedGroups: parseSelectedGroups(item.selected_groups),
        }));
        
        setIntentions(formattedData);
      } else {
        setIntentions([]);
      }
    } catch (error) {
      console.error("Failed to load intentions:", error);
      setNotification({
        message: "Failed to load intentions",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create new intention function
  const handleCreateIntention = async () => {
    if (!newIntention.title.trim()) {
      setNotification({
        message: "Please enter a title for your intention",
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
        
        // Reset form and close modal
        setNewIntention({
          title: "",
          description: "",
          type: "prayer",
          completed: false,
          favorite: false,
          visibility: "Just Me",
          selectedGroups: []
        });
        setShowAddModal(false);
        
        // Success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setNotification({
          message: "Prayer intention added successfully",
          type: "success"
        });
      }
    } catch (error) {
      console.error("Failed to add intention:", error);
      setNotification({
        message: "Failed to add intention",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Edit intention function
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
    
    setEditingIntention({
      ...intention,
      selectedGroups: parsedGroups
    });
    setShowEditModal(true);
  };
  
  // Update intention function
  const updateIntention = async () => {
    if (!editingIntention.title.trim()) {
      setNotification({
        message: "Please enter a title for your intention",
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
      setShowEditModal(false);
      setEditingIntention(null);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotification({
        message: "Prayer intention updated successfully",
        type: "success"
      });
    } catch (error) {
      console.error("Failed to update intention:", error);
      setNotification({
        message: "Failed to update intention",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete intention function
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
                message: "Prayer intention deleted successfully",
                type: "success"
              });
            } catch (error) {
              console.error("Failed to delete intention:", error);
              setNotification({
                message: "Failed to delete intention",
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
  
  // Toggle completion function
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
        message: "Failed to update intention",
        type: "error"
      });
    }
  };
  
  // Toggle favorite function
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
        message: "Failed to update intention",
        type: "error"
      });
    }
  };
  
  // Group selection toggles
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
  
  // Filter and sort intentions
  const getFilteredIntentions = () => {
    let filtered = [...intentions];
    
    // Apply search filter if searching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query))
      );
    }
    
    // Apply tab filter
    if (activeTab === "active") {
      filtered = filtered.filter(item => !item.completed);
    } else if (activeTab === "completed") {
      filtered = filtered.filter(item => item.completed);
    }
    
    // Apply type filter
    if (filterType) {
      filtered = filtered.filter(item => item.type === filterType);
    }
    
    // Apply sorting
    if (sortOrder === "newest") {
      filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortOrder === "oldest") {
      filtered = filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortOrder === "alphabetical") {
      filtered = filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return filtered;
  };
  
  // Get unique types
  const getTypes = () => {
    const types = new Set(intentions.map(item => item.type));
    return Array.from(types);
  };
  
  // Get stats for dashboard
  const getStats = () => {
    const total = intentions.length;
    const active = intentions.filter(i => !i.completed).length;
    const completed = intentions.filter(i => i.completed).length;
    const favorites = intentions.filter(i => i.favorite).length;
    
    return { total, active, completed, favorites };
  };
  
  // Add button scale animation
  const addButtonScale = addButtonAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.08, 1],
  });

  // Toggle search bar
  const toggleSearchBar = () => {
    if (isSearching) {
      // Clear search and hide
      setSearchQuery("");
      setIsSearching(false);
      Animated.timing(searchBarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // Show search bar
      setIsSearching(true);
      Animated.timing(searchBarAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };
  
  // REDESIGNED: Header Component
  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.headerBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={22} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Prayer Intentions</Text>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={toggleSearchBar}
              >
                <Ionicons name="search" size={22} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowFilterDrawer(true)}
              >
                <Ionicons 
                  name="options" 
                  size={22} 
                  color={filterType || activeTab !== "all" || sortOrder !== "newest" ? theme.warning : "white"} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <Animated.View 
            style={[
              styles.searchBarContainer, 
              {
                maxHeight: searchBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 50]
                }),
                opacity: searchBarAnim
              }
            ]}
          >
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={18} color={theme.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search intentions..."
                placeholderTextColor={theme.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getStats().total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getStats().active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getStats().completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getStats().favorites}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
      
      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.activeTab]}
          onPress={() => {
            setActiveTab("all");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => {
            setActiveTab("active");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.activeTab]}
          onPress={() => {
            setActiveTab("completed");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text style={[styles.tabText, activeTab === "completed" && styles.activeTabText]}>Completed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // COMPLETELY REDESIGNED: Main content with list instead of grouping
  const renderMainContent = () => {
    const filteredIntentions = getFilteredIntentions();
    
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading intentions...</Text>
        </View>
      );
    }
    
    if (filteredIntentions.length === 0) {
      return (
        <EmptyState 
          filterType={filterType} 
          activeTab={activeTab} 
          onAddIntention={() => setShowAddModal(true)} 
        />
      );
    }
    
    return (
      <FlatList
        data={filteredIntentions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <IntentionCard 
            item={item}
            index={index}
            onPress={startEditIntention}
            onToggleFavorite={toggleFavorite}
            onToggleCompleted={toggleCompleted}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    );
  };
  
  // REDESIGNED: Filter drawer instead of modal
  const renderFilterDrawer = () => {
    const translateX = filterDrawerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [width, 0],
    });
    
    return (
      <Animated.View 
        style={[
          styles.filterDrawerContainer,
          { transform: [{ translateX }] }
        ]}
      >
        <TouchableOpacity
          style={styles.filterDrawerOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterDrawer(false)}
        />
        
        <View style={styles.filterDrawer}>
          <View style={styles.filterDrawerHeader}>
            <Text style={styles.filterDrawerTitle}>Filters & Sorting</Text>
            <TouchableOpacity
              style={styles.filterDrawerCloseButton}
              onPress={() => setShowFilterDrawer(false)}
            >
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterDrawerContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Filter by Type</Text>
              
              <TypeFilterItem
                type="all"
                isSelected={!filterType}
                onSelect={() => setFilterType(null)}
              />
              
              {getTypes().map(type => (
                <TypeFilterItem
                  key={type}
                  type={type}
                  isSelected={filterType === type}
                  onSelect={(selectedType) => {
                    setFilterType(filterType === selectedType ? null : selectedType);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />
              ))}
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              
              <SortOption
                label="Newest First"
                sortKey="newest"
                currentSort={sortOrder}
                onSelect={(option) => {
                  setSortOrder(option);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
              
              <SortOption
                label="Oldest First"
                sortKey="oldest"
                currentSort={sortOrder}
                onSelect={(option) => {
                  setSortOrder(option);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
              
              <SortOption
                label="Alphabetical (A-Z)"
                sortKey="alphabetical"
                currentSort={sortOrder}
                onSelect={(option) => {
                  setSortOrder(option);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFilterDrawer(false)}
          >
            <LinearGradient
              colors={[theme.primary, theme.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyFiltersButtonGradient}
            >
              <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };
  
  // Copied Add Button from reference - moved higher up in the UI
  const renderAddButton = () => (
    <Animated.View 
      style={[
        styles.addButtonContainer,
        { transform: [{ scale: addButtonScale }] }
      ]}
    >
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setNewIntention({
            title: "",
            description: "",
            type: "prayer",
            completed: false,
            favorite: false,
            visibility: "Just Me",
            selectedGroups: []
          });
          setShowAddModal(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          style={styles.addButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Add modal with the same functionality but improved design
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <KeyboardAvoidingView 
        style={styles.modalContainer} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Prayer Intention</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
            >
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            {/* Type Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeOptionsGrid}>
                {Object.keys(TYPE_ICONS).map(type => (
                  <TypeOption 
                    key={type} 
                    type={type} 
                    selected={newIntention.type === type}
                    onSelect={(selectedType) => {
                      setNewIntention({...newIntention, type: selectedType});
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />
                ))}
              </View>
            </View>
            
            {/* Title Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title <Text style={styles.requiredIndicator}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="What is your prayer intention?"
                placeholderTextColor={theme.textTertiary}
                value={newIntention.title}
                onChangeText={(text) => setNewIntention({...newIntention, title: text})}
                maxLength={100}
              />
            </View>
            
            {/* Description Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description <Text style={styles.optionalIndicator}>(optional)</Text></Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Add details about your intention..."
                placeholderTextColor={theme.textTertiary}
                value={newIntention.description}
                onChangeText={(text) => setNewIntention({...newIntention, description: text})}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            {/* Visibility Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Visibility</Text>
              <View style={styles.visibilityOptionsContainer}>
                {VISIBILITY_OPTIONS.map(option => (
                  <VisibilityOption
                    key={option.id}
                    option={option}
                    selected={newIntention.visibility === option.label}
                    onSelect={(selectedOption) => {
                      setNewIntention({
                        ...newIntention, 
                        visibility: selectedOption.label,
                        selectedGroups: selectedOption.label === "Certain Groups" ? newIntention.selectedGroups : []
                      });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />
                ))}
              </View>
              
              {/* Group Selection (if visibility is "Certain Groups") */}
              {newIntention.visibility === "Certain Groups" && (
                <View style={styles.groupSelectionContainer}>
                  <Text style={styles.groupSelectionTitle}>Select Groups</Text>
                  {userGroups.length > 0 ? (
                    <View style={styles.groupOptions}>
                      {userGroups.map(group => (
                        <GroupOption
                          key={group.id}
                          group={group}
                          selected={newIntention.selectedGroups.includes(group.id)}
                          onSelect={toggleGroupSelection}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noGroupsText}>
                      You don't have any groups yet
                    </Text>
                  )}
                </View>
              )}
            </View>
            
            {/* Additional Options */}
            <View style={styles.additionalOptions}>
              <Text style={styles.additionalOptionsTitle}>Additional Options</Text>
              
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  setNewIntention({...newIntention, favorite: !newIntention.favorite});
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.optionLabel}>Mark as favorite</Text>
                <View style={[
                  styles.optionToggle,
                  newIntention.favorite && styles.optionToggleActive
                ]}>
                  <AntDesign 
                    name={newIntention.favorite ? "heart" : "hearto"} 
                    size={18} 
                    color={newIntention.favorite ? theme.error : theme.textSecondary} 
                  />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  setNewIntention({...newIntention, completed: !newIntention.completed});
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.optionLabel}>Mark as completed</Text>
                <View style={[
                  styles.optionToggle,
                  newIntention.completed && styles.optionToggleActive
                ]}>
                  <Ionicons 
                    name={newIntention.completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                    size={18} 
                    color={newIntention.completed ? theme.success : theme.textSecondary} 
                  />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateIntention}
            >
              <LinearGradient
                colors={[theme.primary, theme.secondary]}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.submitButtonText}>Create Intention</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  
  // Edit modal with same functionality but improved design
  const renderEditModal = () => {
    if (!editingIntention) return null;
    
    return (
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Prayer Intention</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowEditModal(false)}
              >
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* Type Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.typeOptionsGrid}>
                  {Object.keys(TYPE_ICONS).map(type => (
                    <TypeOption 
                      key={type} 
                      type={type} 
                      selected={editingIntention.type === type}
                      onSelect={(selectedType) => {
                        setEditingIntention({...editingIntention, type: selectedType});
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    />
                  ))}
                </View>
              </View>
              
              {/* Title Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title <Text style={styles.requiredIndicator}>*</Text></Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="What is your prayer intention?"
                  placeholderTextColor={theme.textTertiary}
                  value={editingIntention.title}
                  onChangeText={(text) => setEditingIntention({...editingIntention, title: text})}
                  maxLength={100}
                />
              </View>
              
              {/* Description Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description <Text style={styles.optionalIndicator}>(optional)</Text></Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Add details about your intention..."
                  placeholderTextColor={theme.textTertiary}
                  value={editingIntention.description}
                  onChangeText={(text) => setEditingIntention({...editingIntention, description: text})}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              {/* Visibility Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Visibility</Text>
                <View style={styles.visibilityOptionsContainer}>
                  {VISIBILITY_OPTIONS.map(option => (
                    <VisibilityOption
                      key={option.id}
                      option={option}
                      selected={editingIntention.visibility === option.label}
                      onSelect={(selectedOption) => {
                        setEditingIntention({
                          ...editingIntention, 
                          visibility: selectedOption.label,
                          selectedGroups: selectedOption.label === "Certain Groups" ? editingIntention.selectedGroups : []
                        });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    />
                  ))}
                </View>
                
                {/* Group Selection (if visibility is "Certain Groups") */}
                {editingIntention.visibility === "Certain Groups" && (
                  <View style={styles.groupSelectionContainer}>
                    <Text style={styles.groupSelectionTitle}>Select Groups</Text>
                    {userGroups.length > 0 ? (
                      <View style={styles.groupOptions}>
                        {userGroups.map(group => (
                          <GroupOption
                            key={group.id}
                            group={group}
                            selected={editingIntention.selectedGroups && editingIntention.selectedGroups.includes(group.id)}
                            onSelect={toggleEditGroupSelection}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noGroupsText}>
                        You don't have any groups yet
                      </Text>
                    )}
                  </View>
                )}
              </View>
              
              {/* Additional Options */}
              <View style={styles.additionalOptions}>
                <Text style={styles.additionalOptionsTitle}>Additional Options</Text>
                
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setEditingIntention({...editingIntention, favorite: !editingIntention.favorite});
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.optionLabel}>Mark as favorite</Text>
                  <View style={[
                    styles.optionToggle,
                    editingIntention.favorite && styles.optionToggleActive
                  ]}>
                    <AntDesign 
                      name={editingIntention.favorite ? "heart" : "hearto"} 
                      size={18} 
                      color={editingIntention.favorite ? theme.error : theme.textSecondary} 
                    />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setEditingIntention({...editingIntention, completed: !editingIntention.completed});
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.optionLabel}>Mark as completed</Text>
                  <View style={[
                    styles.optionToggle,
                    editingIntention.completed && styles.optionToggleActive
                  ]}>
                    <Ionicons 
                      name={editingIntention.completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                      size={18} 
                      color={editingIntention.completed ? theme.success : theme.textSecondary} 
                    />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.deleteButtonContainer}
                  onPress={() => deleteIntention(editingIntention.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete Intention</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={updateIntention}
              >
                <LinearGradient
                  colors={[theme.primary, theme.secondary]}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      
      {/* Main UI Components */}
      {renderHeader()}
      {renderMainContent()}
      {renderAddButton()}
      {renderFilterDrawer()}
      
      {/* Modals */}
      {renderAddModal()}
      {renderEditModal()}
      
      {/* Toast */}
      {notification && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  
  // REDESIGNED: Header
  header: {
    width: "100%",
  },
  headerBackground: {
    paddingBottom: 15,
  },
  headerContent: {
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  
  // Stats row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 12,
    marginTop: 10,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  
  // Search bar
  searchBarContainer: {
    paddingHorizontal: 16,
    marginTop: 10,
    overflow: "hidden",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 24,
    paddingHorizontal: 15,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.textPrimary,
  },
  clearSearchButton: {
    padding: 5,
  },
  
  // REDESIGNED: Tabs
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 12,
    padding: 4,
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: theme.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  activeTabText: {
    color: "white",
  },
  
  // REDESIGNED: List content
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  
  // COMPLETELY REDESIGNED: Intention card
  intentionCard: {
    marginBottom: 10,
  },
  intentionCardInner: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  visibilityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 11,
    color: theme.textTertiary,
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: "row",
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    backgroundColor: theme.surfaceVariant,
  },
  actionButtonActive: {
    backgroundColor: `${theme.primary}15`,
  },
  
  // REDESIGNED: Filter drawer
  filterDrawerContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    zIndex: 1000,
  },
  filterDrawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  filterDrawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: width * 0.85,
    backgroundColor: theme.surface,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  filterDrawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  filterDrawerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  filterDrawerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
  },
  filterDrawerContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 10,
  },
  
  // Type filter item in drawer
  typeFilterItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.background,
  },
  typeFilterItemSelected: {
    backgroundColor: `${theme.primary}10`,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  typeFilterIconWrapper: {
    marginRight: 10,
  },
  typeFilterIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  typeFilterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: theme.textPrimary,
  },
  typeFilterTextSelected: {
    color: theme.primary,
    fontWeight: "700",
  },
  typeFilterCheckmark: {
    marginLeft: 6,
  },
  
  // Sort options
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.background,
  },
  sortOptionSelected: {
    backgroundColor: `${theme.primary}10`,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  sortOptionText: {
    fontSize: 14,
    color: theme.textPrimary,
  },
  sortOptionTextSelected: {
    color: theme.primary,
    fontWeight: "700",
  },
  
  // Apply filters button
  applyFiltersButton: {
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  applyFiltersButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  applyFiltersButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  
  // Add button styles - Copied from reference
  addButtonContainer: {
    position: "absolute",
    right: 20,
    bottom: 140, // Raised position as in reference
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonGradient: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Toast notification styles
  toastContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  toastError: {
    backgroundColor: theme.error,
  },
  toastSuccess: {
    backgroundColor: theme.success,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toastMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginLeft: 10,
    flex: 1,
  },
  
  // Loading container
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.textSecondary,
  },
  
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${theme.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyStateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  emptyStateButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollView: {
    padding: 18,
  },
  
  // Form styles
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 8,
  },
  requiredIndicator: {
    color: theme.error,
  },
  optionalIndicator: {
    fontSize: 12,
    fontWeight: "400",
    color: theme.textTertiary,
  },
  formInput: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  
  // Type options grid for modal
  typeOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    width: "45%",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginHorizontal: "2.5%",
    marginBottom: 10,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  typeOptionSelected: {
    backgroundColor: `${theme.primary}10`,
    borderColor: theme.primary,
  },
  typeOptionIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  typeOptionLabel: {
    flex: 1,
    fontSize: 13,
    color: theme.textPrimary,
  },
  
  // Visibility options
  visibilityOptionsContainer: {
    gap: 10,
  },
  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  visibilityOptionSelected: {
    backgroundColor: `${theme.primary}10`,
    borderColor: theme.primary,
  },
  visibilityOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  visibilityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 2,
  },
  visibilityDescription: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  visibilitySelectedIndicator: {
    marginLeft: 8,
  },
  
  // Group selection
  groupSelectionContainer: {
    marginTop: 12,
    padding: 14,
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  groupSelectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 8,
  },
  groupOptions: {
    gap: 8,
  },
  groupOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.surfaceVariant,
  },
  groupOptionSelected: {
    backgroundColor: `${theme.primary}15`,
  },
  groupOptionLabel: {
    fontSize: 14,
    color: theme.textPrimary,
  },
  groupOptionLabelSelected: {
    fontWeight: "600",
    color: theme.primary,
  },
  noGroupsText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontStyle: "italic",
  },
  
  // Additional options
  additionalOptions: {
    marginTop: 10,
    padding: 14,
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  additionalOptionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 14,
    color: theme.textPrimary,
  },
  optionToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.surfaceVariant,
  },
  optionToggleActive: {
    backgroundColor: `${theme.primary}15`,
  },
  deleteButtonContainer: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: `${theme.error}10`,
    alignItems: "center",
    marginTop: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.error,
  },
  
  // Modal footer
  modalFooter: {
    flexDirection: "row",
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: theme.surface,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  submitButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
    marginLeft: 10,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
});