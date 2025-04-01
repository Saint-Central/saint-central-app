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
  Keyboard,
  Image,
  Pressable,
} from "react-native";
import { AntDesign, FontAwesome5, Feather, FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../../supabaseClient";
import { BlurView } from "expo-blur";
// Using only packages that are already in the project

// Get device dimensions
const { width, height } = Dimensions.get("window");

// Theme colors - New palette
const theme = {
  primary: "#3B82F6", // Bright blue
  secondary: "#1E40AF", // Dark blue
  tertiary: "#93C5FD", // Light blue
  background: "#F3F4F6", // Light gray
  surface: "#FFFFFF", // White
  surfaceVariant: "#F8FAFC", // Off-white
  error: "#EF4444", // Red
  success: "#10B981", // Green
  warning: "#F59E0B", // Yellow/Amber
  textPrimary: "#1F2937", // Very dark gray
  textSecondary: "#4B5563", // Dark gray
  textTertiary: "#9CA3AF", // Medium gray
  divider: "#E5E7EB", // Light gray for borders/dividers
  cardShadow: "#0000001A", // Shadow for cards
  icon: "#6B7280", // Icon color
  highlight: "#DBEAFE", // Light blue highlight
};

// Enhanced type icons and colors
const TYPE_ICONS = {
  "prayer": { name: "pray", style: "fa5", color: ["#3B82F6", "#1E40AF"] },
  "resolution": { name: "notebook", style: "ion", color: ["#8B5CF6", "#6D28D9"] },
  "goal": { name: "target", style: "feather", color: ["#EC4899", "#DB2777"] },
  "spiritual": { name: "church", style: "fa5", color: ["#10B981", "#059669"] },
  "family": { name: "people", style: "ion", color: ["#F59E0B", "#D97706"] },
  "health": { name: "heart", style: "fa5", color: ["#EF4444", "#DC2626"] },
  "work": { name: "briefcase", style: "fa5", color: ["#6366F1", "#4F46E5"] },
  "friends": { name: "users", style: "fa5", color: ["#14B8A6", "#0D9488"] },
  "world": { name: "globe", style: "fa5", color: ["#3B82F6", "#1E40AF"] },
  "personal": { name: "person", style: "ion", color: ["#8B5CF6", "#6D28D9"] },
  "other": { name: "options", style: "ion", color: ["#6B7280", "#4B5563"] },
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

// Enhanced visibility options
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
    color: "#3B82F6"
  },
  {
    id: "groups",
    label: "Friends & Groups",
    icon: "globe",
    style: "fa5",
    description: "Share with friends and all your groups",
    color: "#8B5CF6"
  },
  {
    id: "certain-groups",
    label: "Certain Groups",
    icon: "people-circle",
    style: "ion",
    description: "Select specific groups to share with",
    color: "#10B981"
  }
];

// Parse selected groups helper function
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

// Format date for display
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

// Intention Card Component - Completely redesigned
const IntentionCard = React.memo(({ item, onPress, onToggleFavorite, onToggleCompleted, index }) => {
  const iconInfo = TYPE_ICONS[item.type] || TYPE_ICONS["other"];
  const animation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
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
        style={[
          styles.intentionCardInner,
          item.completed && styles.completedCard
        ]}
        onPress={() => onPress(item)}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <View 
              style={[
                styles.typeIconContainer, 
                { backgroundColor: iconInfo.color[0] }
              ]}
            >
              {renderTypeIcon(item.type, 16)}
            </View>
            <Text style={styles.typeText}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
          </View>
          
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onToggleFavorite(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AntDesign 
                name={item.favorite ? "heart" : "hearto"} 
                size={18} 
                color={item.favorite ? theme.error : theme.textSecondary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onToggleCompleted(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={item.completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={18} 
                color={item.completed ? theme.success : theme.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <Text 
            style={[
              styles.cardTitle,
              item.completed && styles.completedText
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          
          {item.description ? (
            <Text 
              style={[
                styles.cardDescription,
                item.completed && styles.completedText
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.visibilityContainer}>
            {item.visibility === "Just Me" ? (
              <Ionicons name="lock-closed" size={14} color={theme.textTertiary} />
            ) : item.visibility === "Friends" ? (
              <Ionicons name="people" size={14} color={theme.textTertiary} />
            ) : item.visibility === "Friends & Groups" ? (
              <FontAwesome5 name="globe" size={12} color={theme.textTertiary} />
            ) : (
              <Ionicons name="people-circle" size={14} color={theme.textTertiary} />
            )}
            <Text style={styles.visibilityText}>{item.visibility}</Text>
          </View>
          
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// Intention Group Component - New design for the type sections
const IntentionGroup = ({ type, intentions, onToggleFavorite, onToggleCompleted, onPressIntention, expanded, onToggleExpand }) => {
  const iconInfo = TYPE_ICONS[type] || TYPE_ICONS["other"];
  const activeCount = intentions.filter(i => !i.completed).length;
  const completedCount = intentions.filter(i => i.completed).length;
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [expanded]);
  
  const rotateIcon = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  
  return (
    <View style={styles.groupContainer}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.groupHeaderLeft}>
          <View 
            style={[
              styles.groupIconContainer, 
              { backgroundColor: iconInfo.color[0] }
            ]}
          >
            {renderTypeIcon(type, 20)}
          </View>
          <View style={styles.groupTitleContainer}>
            <Text style={styles.groupTitle}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
            <Text style={styles.groupCount}>{intentions.length} intention{intentions.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        
        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
          <Ionicons name="chevron-down" size={24} color={theme.textSecondary} />
        </Animated.View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.groupContent}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Active</Text>
              <Text style={styles.statValue}>{activeCount}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>{completedCount}</Text>
            </View>
          </View>
          
          {intentions.map((intention, index) => (
            <IntentionCard 
              key={intention.id}
              item={intention}
              index={index}
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

// Filter Chip Component - Reusable for filter options
const FilterChip = ({ label, icon, active, onPress, IconComponent = Ionicons }) => (
  <TouchableOpacity
    style={[
      styles.filterChip,
      active && styles.filterChipActive
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <IconComponent 
      name={icon} 
      size={16} 
      color={active ? theme.primary : theme.textSecondary} 
      style={styles.filterChipIcon}
    />
    <Text 
      style={[
        styles.filterChipText,
        active && styles.filterChipTextActive
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// AnimatedIconButton Component - For the add button animation
const AnimatedIconButton = ({ icon, onPress, style, size = 24, color = "white", backgroundColor = theme.primary }) => {
  const scale = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={style}
    >
      <Animated.View
        style={[
          styles.animatedButtonContainer,
          { transform: [{ scale }], backgroundColor },
        ]}
      >
        <Ionicons name={icon} size={size} color={color} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// VisibilityOption Component - For the modal selection
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
      <View 
        style={[
          styles.visibilityIconContainer,
          { backgroundColor: option.color + '20' }
        ]}
      >
        <IconComponent name={option.icon} size={20} color={option.color} />
      </View>
      
      <View style={styles.visibilityTextContainer}>
        <Text style={styles.visibilityLabel}>{option.label}</Text>
        <Text style={styles.visibilityDescription}>{option.description}</Text>
      </View>
      
      {selected && (
        <View style={styles.visibilitySelectedIndicator}>
          <Ionicons name="checkmark" size={18} color={theme.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// TypeOption Component - For type selection in modals
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
      <View 
        style={[
          styles.typeOptionIconContainer,
          { backgroundColor: iconInfo.color[0] + '20' }
        ]}
      >
        {renderTypeIcon(type, 20, iconInfo.color[0])}
      </View>
      
      <Text style={styles.typeOptionLabel}>{typeLabel}</Text>
      
      {selected && (
        <View style={styles.typeOptionSelectedIndicator}>
          <Ionicons name="checkmark" size={18} color={theme.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// GroupOption Component - For group selection in modals
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
      <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
    )}
  </TouchableOpacity>
);

// Empty State Component - New design
const EmptyState = ({ filterType, activeTab, onAddIntention }) => {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyAnimationContainer}>
        <Ionicons 
          name={
            activeTab === "completed" ? "checkmark-circle-outline" : 
            activeTab === "active" ? "hourglass-outline" : "list-outline"
          } 
          size={60} 
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
            ? "Add your first prayer intention to get started"
            : activeTab === "active"
              ? "All your intentions are completed"
              : "Complete some intentions to see them here"}
      </Text>
      
      {(activeTab === "all" || activeTab === "active") && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={onAddIntention}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emptyStateButtonGradient}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.emptyStateButtonText}>
              Add New Intention
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Toast Notification Component - Enhanced design
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
          size={24} 
          color="white" 
        />
        <Text style={styles.toastMessage}>{message}</Text>
      </View>
    </Animated.View>
  );
};

export default function RosaryIntentions() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const addButtonAnimation = useRef(new Animated.Value(0)).current;
  
  // State variables - maintained from original component
  const [intentions, setIntentions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all", "active", "completed"
  const [filterType, setFilterType] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest"); // "newest", "oldest", "alphabetical"
  const [notification, setNotification] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
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
  
  // Header animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [220, 100],
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
  
  // Add button animations
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(addButtonAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(addButtonAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  const addButtonScale = addButtonAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });
  
  // Check authentication on mount
  useEffect(() => {
    checkAuth();
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
  
  // Authentication function - same as original
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
  
  // Fetch user groups function - same as original
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
  
  // Load intentions function - same as original
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
        message: "Failed to load intentions",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create new intention function - same as original
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
  
  // Edit intention function - same as original
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
  
  // Update intention function - same as original
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
      
      // If the type has changed, make sure the new type is expanded
      if (!expandedTypes.includes(editingIntention.type)) {
        setExpandedTypes([...expandedTypes, editingIntention.type]);
      }
      
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
  
  // Delete intention function - same as original
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
  
  // Toggle completion function - same as original
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
  
  // Toggle favorite function - same as original
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
  
  // Group selection toggles - same as original
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
  
  // Toggle type expansion
  const toggleTypeExpansion = (type) => {
    if (expandedTypes.includes(type)) {
      setExpandedTypes(expandedTypes.filter(t => t !== type));
    } else {
      setExpandedTypes([...expandedTypes, type]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Filter and group intentions
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
  
  // Group intentions by type
  const getGroupedIntentions = () => {
    const filtered = getFilteredIntentions();
    
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
  
  // Get stats for dashboard
  const getStats = () => {
    const total = intentions.length;
    const active = intentions.filter(i => !i.completed).length;
    const completed = intentions.filter(i => i.completed).length;
    const favorites = intentions.filter(i => i.favorite).length;
    
    return { total, active, completed, favorites };
  };
  
  // Render functions for UI components
  const renderHeader = () => (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Fixed header top */}
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        
        <Animated.Text style={[styles.headerTitle, { opacity: headerTitleOpacity }]}>
          Prayer Intentions
        </Animated.Text>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name="options-outline" 
            size={22} 
            color={filterType || activeTab !== "all" || sortOrder !== "newest" ? theme.warning : "white"} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Header collapsible content */}
      <Animated.View 
        style={[
          styles.headerContent, 
          { opacity: headerContentOpacity }
        ]}
      >
        <Text style={styles.headerMainTitle}>Prayer Intentions</Text>
        <Text style={styles.headerSubtitle}>Lift your prayers and intentions to God</Text>
        
        {/* Stats cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <Ionicons name="list" size={18} color={theme.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>{getStats().total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, styles.activeIconWrapper]}>
              <Ionicons name="hourglass-outline" size={18} color="#F59E0B" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>{getStats().active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, styles.completedIconWrapper]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>{getStats().completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, styles.favoriteIconWrapper]}>
              <Ionicons name="heart-outline" size={18} color="#EF4444" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>{getStats().favorites}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        </View>
      </Animated.View>
      
      {/* Search container */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search intentions..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setIsSearching(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
  
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "all" && styles.activeTab
        ]}
        onPress={() => setActiveTab("all")}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="grid-outline" 
          size={18} 
          color={activeTab === "all" ? theme.primary : theme.textSecondary} 
        />
        <Text style={[
          styles.tabText,
          activeTab === "all" && styles.activeTabText
        ]}>All</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "active" && styles.activeTab
        ]}
        onPress={() => setActiveTab("active")}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="hourglass-outline" 
          size={18} 
          color={activeTab === "active" ? theme.primary : theme.textSecondary} 
        />
        <Text style={[
          styles.tabText,
          activeTab === "active" && styles.activeTabText
        ]}>Active</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "completed" && styles.activeTab
        ]}
        onPress={() => setActiveTab("completed")}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="checkmark-circle-outline" 
          size={18} 
          color={activeTab === "completed" ? theme.primary : theme.textSecondary} 
        />
        <Text style={[
          styles.tabText,
          activeTab === "completed" && styles.activeTabText
        ]}>Completed</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderTypeFilters = () => {
    const types = getTypes();
    if (types.length === 0) return null;
    
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeFiltersContainer}
      >
        <FilterChip
          label="All Types"
          icon="apps"
          active={!filterType}
          onPress={() => setFilterType(null)}
        />
        
        {types.map(type => (
          <FilterChip
            key={type}
            label={type.charAt(0).toUpperCase() + type.slice(1)}
            icon={TYPE_ICONS[type]?.name || "options"}
            IconComponent={TYPE_ICONS[type]?.style === "ion" ? Ionicons : 
                          TYPE_ICONS[type]?.style === "feather" ? Feather : FontAwesome5}
            active={filterType === type}
            onPress={() => setFilterType(filterType === type ? null : type)}
          />
        ))}
      </ScrollView>
    );
  };
  
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
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.primary, theme.secondary]}
          style={styles.addButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={30} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
  
  const renderMainContent = () => {
    const filteredIntentions = getFilteredIntentions();
    const groupedIntentions = getGroupedIntentions();
    const groupedTypes = Object.keys(groupedIntentions);
    
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
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {searchQuery.trim() ? (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>
              Search Results: {filteredIntentions.length} {filteredIntentions.length === 1 ? 'intention' : 'intentions'}
            </Text>
            
            {filteredIntentions.map((intention, index) => (
              <IntentionCard 
                key={intention.id}
                item={intention}
                index={index}
                onPress={startEditIntention}
                onToggleFavorite={toggleFavorite}
                onToggleCompleted={toggleCompleted}
              />
            ))}
          </View>
        ) : (
          groupedTypes.map(type => (
            <IntentionGroup
              key={type}
              type={type}
              intentions={groupedIntentions[type]}
              onToggleFavorite={toggleFavorite}
              onToggleCompleted={toggleCompleted}
              onPressIntention={startEditIntention}
              expanded={expandedTypes.includes(type)}
              onToggleExpand={() => toggleTypeExpansion(type)}
            />
          ))
        )}
        
        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    );
  };
  
  // Modal rendering functions
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
        <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Prayer Intention</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            {/* Type Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeOptionsContainer}
              >
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
              </ScrollView>
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
                  <Ionicons 
                    name={newIntention.favorite ? "heart" : "heart-outline"} 
                    size={20} 
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
                    size={20} 
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
          <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
          
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Prayer Intention</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowEditModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* Type Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.typeOptionsContainer}
                >
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
                </ScrollView>
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
                    <Ionicons 
                      name={editingIntention.favorite ? "heart" : "heart-outline"} 
                      size={20} 
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
                      size={20} 
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
  
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.filterModalContainer}>
        <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter & Sort</Text>
            <TouchableOpacity
              style={styles.filterModalCloseButton}
              onPress={() => setShowFilterModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterModalScrollView}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterStatusOption,
                    activeTab === "all" && styles.filterStatusOptionActive
                  ]}
                  onPress={() => setActiveTab("all")}
                >
                  <Ionicons 
                    name="grid-outline" 
                    size={20} 
                    color={activeTab === "all" ? "white" : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.filterStatusOptionText,
                    activeTab === "all" && styles.filterStatusOptionTextActive
                  ]}>All</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterStatusOption,
                    activeTab === "active" && [styles.filterStatusOptionActive, { backgroundColor: "#F59E0B" }]
                  ]}
                  onPress={() => setActiveTab("active")}
                >
                  <Ionicons 
                    name="hourglass-outline" 
                    size={20} 
                    color={activeTab === "active" ? "white" : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.filterStatusOptionText,
                    activeTab === "active" && styles.filterStatusOptionTextActive
                  ]}>Active</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterStatusOption,
                    activeTab === "completed" && [styles.filterStatusOptionActive, { backgroundColor: "#10B981" }]
                  ]}
                  onPress={() => setActiveTab("completed")}
                >
                  <Ionicons 
                    name="checkmark-circle-outline" 
                    size={20} 
                    color={activeTab === "completed" ? "white" : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.filterStatusOptionText,
                    activeTab === "completed" && styles.filterStatusOptionTextActive
                  ]}>Completed</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Type</Text>
              <View style={styles.filterTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterTypeOption,
                    !filterType && styles.filterTypeOptionActive
                  ]}
                  onPress={() => setFilterType(null)}
                >
                  <Ionicons 
                    name="apps" 
                    size={20} 
                    color={!filterType ? "white" : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.filterTypeOptionText,
                    !filterType && styles.filterTypeOptionTextActive
                  ]}>All Types</Text>
                </TouchableOpacity>
                
                {Object.keys(TYPE_ICONS).map(type => {
                  const iconInfo = TYPE_ICONS[type];
                  const IconComponent = iconInfo.style === "ion" ? Ionicons : 
                                       iconInfo.style === "feather" ? Feather : FontAwesome5;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterTypeOption,
                        filterType === type && styles.filterTypeOptionActive,
                        filterType === type && { backgroundColor: iconInfo.color[0] }
                      ]}
                      onPress={() => setFilterType(filterType === type ? null : type)}
                    >
                      <IconComponent 
                        name={iconInfo.name} 
                        size={20} 
                        color={filterType === type ? "white" : theme.textSecondary} 
                      />
                      <Text style={[
                        styles.filterTypeOptionText,
                        filterType === type && styles.filterTypeOptionTextActive
                      ]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    sortOrder === "newest" && styles.sortOptionActive
                  ]}
                  onPress={() => setSortOrder("newest")}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortOrder === "newest" && styles.sortOptionTextActive
                  ]}>Newest First</Text>
                  {sortOrder === "newest" && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    sortOrder === "oldest" && styles.sortOptionActive
                  ]}
                  onPress={() => setSortOrder("oldest")}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortOrder === "oldest" && styles.sortOptionTextActive
                  ]}>Oldest First</Text>
                  {sortOrder === "oldest" && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    sortOrder === "alphabetical" && styles.sortOptionActive
                  ]}
                  onPress={() => setSortOrder("alphabetical")}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortOrder === "alphabetical" && styles.sortOptionTextActive
                  ]}>Alphabetical (A-Z)</Text>
                  {sortOrder === "alphabetical" && (
                    <Ionicons name="checkmark" size={18} color={theme.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFilterModal(false)}
          >
            <LinearGradient
              colors={[theme.primary, theme.secondary]}
              style={styles.applyFiltersButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      
      {renderHeader()}
      {renderTabs()}
      {renderTypeFilters()}
      {renderMainContent()}
      {renderAddButton()}
      
      {notification && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}
      
      {renderAddModal()}
      {renderEditModal()}
      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  
  // Header styles
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
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
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  headerMainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 5,
    marginBottom: 20,
  },
  
  // Stats styles
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    padding: 12,
    width: (width - 60) / 4,
    alignItems: "center",
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  activeIconWrapper: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  completedIconWrapper: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  favoriteIconWrapper: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  statTextContainer: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  
  // Search styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.textPrimary,
  },
  clearSearchButton: {
    padding: 5,
  },
  
  // Tabs styles
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: `${theme.primary}10`,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textSecondary,
    marginLeft: 6,
  },
  activeTabText: {
    color: theme.primary,
  },
  
  // Type filters styles
  typeFiltersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.surface,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${theme.textTertiary}10`,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: `${theme.primary}20`,
  },
  filterChipIcon: {
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  filterChipTextActive: {
    fontWeight: "600",
    color: theme.primary,
  },
  
  // Main content styles
  scrollView: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  
  // Search results styles
  searchResultsContainer: {
    marginBottom: 20,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textSecondary,
    marginBottom: 15,
  },
  
  // Intention card styles
  intentionCard: {
    marginBottom: 12,
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
  },
  completedCard: {
    opacity: 0.7,
  },
  cardHeader: {
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
  },
  cardActions: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 15,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  visibilityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  visibilityText: {
    fontSize: 12,
    color: theme.textTertiary,
    marginLeft: 5,
  },
  dateText: {
    fontSize: 12,
    color: theme.textTertiary,
  },
  
  // Intention group styles
  groupContainer: {
    marginBottom: 16,
    backgroundColor: theme.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  groupTitleContainer: {
    justifyContent: "center",
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  groupCount: {
    fontSize: 14,
    color: theme.textTertiary,
  },
  groupContent: {
    padding: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    height: 30,
    width: 1,
    backgroundColor: theme.divider,
  },
  
  // Add button styles
  addButtonContainer: {
    position: "absolute",
    right: 20,
    bottom: 30,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
  },
  addButtonGradient: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: theme.textSecondary,
    marginTop: 12,
  },
  
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyAnimationContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${theme.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  emptyStateDescription: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  emptyStateButton: {
    borderRadius: 25,
    overflow: "hidden",
    width: "100%",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyStateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },
  
  // Toast notification styles
  toastContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
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
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  toastMessage: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 10,
    flex: 1,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
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
    padding: 20,
  },
  
  // Form styles
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 10,
  },
  requiredIndicator: {
    color: theme.error,
  },
  optionalIndicator: {
    fontSize: 14,
    fontWeight: "400",
    color: theme.textTertiary,
  },
  formInput: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  
  // Type options styles
  typeOptionsContainer: {
    paddingVertical: 10,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 15,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  typeOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: `${theme.primary}10`,
  },
  typeOptionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  typeOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
    marginRight: 10,
  },
  typeOptionSelectedIndicator: {
    marginLeft: 'auto',
  },
  
  // Visibility options styles
  visibilityOptionsContainer: {
    gap: 12,
  },
  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  visibilityOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: `${theme.primary}10`,
  },
  visibilityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 4,
  },
  visibilityDescription: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  visibilitySelectedIndicator: {
    marginLeft: 10,
  },
  
  // Group selection styles
  groupSelectionContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  groupSelectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 12,
  },
  groupOptions: {
    gap: 10,
  },
  groupOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: `${theme.textTertiary}10`,
  },
  groupOptionSelected: {
    backgroundColor: `${theme.primary}10`,
  },
  groupOptionLabel: {
    fontSize: 15,
    color: theme.textPrimary,
  },
  groupOptionLabelSelected: {
    fontWeight: "600",
    color: theme.primary,
  },
  noGroupsText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontStyle: "italic",
  },
  
  // Additional options styles
  additionalOptions: {
    marginTop: 10,
    padding: 15,
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  additionalOptionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 15,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  optionLabel: {
    fontSize: 15,
    color: theme.textPrimary,
  },
  optionToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  optionToggleActive: {
    backgroundColor: `${theme.primary}10`,
    borderColor: theme.primary,
  },
  deleteButtonContainer: {
    padding: 15,
    borderRadius: 12,
    backgroundColor: `${theme.error}10`,
    alignItems: "center",
    marginTop: 15,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.error,
  },
  
  // Modal footer styles
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
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
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  
  // Filter modal styles
  filterModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalContent: {
    width: width * 0.9,
    backgroundColor: theme.surface,
    borderRadius: 20,
    maxHeight: height * 0.8,
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.textPrimary,
  },
  filterModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalScrollView: {
    padding: 20,
    maxHeight: height * 0.5,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 15,
  },
  filterOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterStatusOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.background,
    marginHorizontal: 5,
  },
  filterStatusOptionActive: {
    backgroundColor: theme.primary,
  },
  filterStatusOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textSecondary,
    marginLeft: 8,
  },
  filterStatusOptionTextActive: {
    color: "white",
  },
  filterTypeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.background,
    marginBottom: 10,
  },
  filterTypeOptionActive: {
    backgroundColor: theme.primary,
  },
  filterTypeOptionText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginLeft: 6,
  },
  filterTypeOptionTextActive: {
    color: "white",
  },
  sortOptions: {
    gap: 10,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  sortOptionActive: {
    borderColor: theme.primary,
    backgroundColor: `${theme.primary}10`,
  },
  sortOptionText: {
    fontSize: 15,
    color: theme.textPrimary,
  },
  sortOptionTextActive: {
    fontWeight: "600",
    color: theme.primary,
  },
  applyFiltersButton: {
    margin: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  applyFiltersButtonGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  applyFiltersButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  
  // Animation components
  animatedButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  
  // Bottom padding
  bottomPadding: {
    height: 100,
  }
});