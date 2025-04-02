// PrayerIntentions.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  StatusBar,
  Easing,
  Dimensions
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "../../supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

// Interfaces
export interface PrayerIntention {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: IntentionType;
  created_at: Date;
  visibility: IntentionVisibility;
  selected_groups?: string[];
  completed: boolean;
  favorite: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_at: Date;
  created_by: string;
}

export type IntentionType =
  | "prayer"
  | "goal"
  | "resolution"
  | "spiritual"
  | "family"
  | "health"
  | "work"
  | "friends"
  | "world"
  | "personal"
  | "other";

export type IntentionVisibility =
  | "Just Me"
  | "Friends"
  | "Friends & Groups"
  | "Certain Groups";

export type IntentionsTabView = "all" | "active" | "completed";
export type IntentionsSorting = "newest" | "oldest" | "alphabetical";
export type IntentionsFilter = IntentionType | "all";

// Props interface
interface IntentionsProps {
  themeStyles?: any;
  fontSizeStyles?: any;
  readingTheme?: "paper" | "sepia" | "night";
  showFeedback?: (message: string) => void;
}

// Intention type icons
const intentionTypeIcons: { [key in IntentionType]: string } = {
  prayer: "user",
  resolution: "check-square",
  goal: "target",
  spiritual: "heart",
  family: "users",
  health: "heart",
  work: "briefcase",
  friends: "users",
  world: "globe",
  personal: "user",
  other: "more-horizontal",
};

// SVG components for the prayer-inspired design
const PrayerButtonSVG = () => (
  <View style={addButtonStyles.svgContainer}>
    <View style={addButtonStyles.circle1} />
    <View style={addButtonStyles.circle2} />
    <View style={addButtonStyles.droplet} />
    <View style={addButtonStyles.dot1} />
    <View style={addButtonStyles.dot2} />
    <View style={addButtonStyles.dot3} />
  </View>
);

// Add Prayer Button Component
const AddPrayerButton: React.FC<{ onPress: () => void; theme?: 'light' | 'dark' | 'sepia' }> = ({ onPress, theme = 'light' }) => {
  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Define colors based on theme
  const colors = {
    light: {
      primary: '#6A478F',
      secondary: '#8860B2',
      highlight: '#A578D5',
      background: '#FFFFFF',
      text: '#FFFFFF',
    },
    dark: {
      primary: '#9C64A6',
      secondary: '#7A4A8C',
      highlight: '#BF89CE',
      background: '#2D2D2D',
      text: '#FFFFFF',
    },
    sepia: {
      primary: '#7A503E',
      secondary: '#A46E58',
      highlight: '#C5917C',
      background: '#F8F0E3',
      text: '#F8F0E3',
    }
  };
  
  const themeColors = colors[theme as 'light' | 'dark' | 'sepia'];

  // Start animations when component mounts
  useEffect(() => {
    // Entrance animation
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic)
    }).start();
    
    // Delayed text appearance
    Animated.timing(textOpacityAnim, {
      toValue: 1,
      duration: 300,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Infinite floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
      ])
    ).start();
  }, []);

  // Handle button press with appropriate feedback
  const handlePress = () => {
    // Provide haptic feedback based on device capabilities
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Visual feedback animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Call the provided callback
    if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View 
      style={[
        addButtonStyles.container,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: floatAnim },
            { scale: pulseAnim }
          ]
        }
      ]}
    >
      {/* Text label that appears above button */}
      <Animated.View 
        style={[
          addButtonStyles.labelContainer,
          { 
            backgroundColor: themeColors.primary,
            opacity: textOpacityAnim,
          }
        ]}
      >
        <Text style={addButtonStyles.labelText}>Add Prayer</Text>
      </Animated.View>

      {/* Main button */}
      <TouchableOpacity
        style={[addButtonStyles.button, { backgroundColor: themeColors.primary }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Background decorative elements */}
        <PrayerButtonSVG />
        
        {/* Center plus icon */}
        <View style={addButtonStyles.iconContainer}>
          <Feather name="plus" size={28} color={themeColors.text} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const PrayerIntentions: React.FC<IntentionsProps> = ({
  themeStyles = defaultThemes.light,
  fontSizeStyles = defaultFontSizes.medium,
  readingTheme = "paper",
  showFeedback = (message) => Toast.show({ type: "success", text1: message }),
}) => {
  // Navigation
  const navigation = useNavigation();
  
  // State management
  const [intentions, setIntentions] = useState<PrayerIntention[]>([]);
  const [intentionsLoading, setIntentionsLoading] = useState<boolean>(true);
  const [intentionsTabView, setIntentionsTabView] = useState<IntentionsTabView>("all");
  const [showNewIntentionModal, setShowNewIntentionModal] = useState<boolean>(false);
  const [showIntentionFilterModal, setShowIntentionFilterModal] = useState<boolean>(false);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // New intention form state - all in one form now
  const [newIntentionTitle, setNewIntentionTitle] = useState<string>("");
  const [newIntentionDescription, setNewIntentionDescription] = useState<string>("");
  const [newIntentionType, setNewIntentionType] = useState<IntentionType>("prayer");
  const [newIntentionVisibility, setNewIntentionVisibility] = useState<IntentionVisibility>("Just Me");
  const [newIntentionGroups, setNewIntentionGroups] = useState<string[]>([]);
  const [newIntentionComplete, setNewIntentionComplete] = useState<boolean>(false);
  const [newIntentionFavorite, setNewIntentionFavorite] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Group state management
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);

  // Intention filtering and sorting state
  const [intentionFilter, setIntentionFilter] = useState<IntentionsFilter>("all");
  const [intentionSorting, setIntentionSorting] = useState<IntentionsSorting>("newest");

  // Animation refs
  const intentionFavoriteScale = useRef(new Animated.Value(1)).current;
  const modalSlideUp = useRef(new Animated.Value(100)).current;
  
  // Reference to store the Supabase subscription
  const supabaseSubscription = useRef<any>(null);

  // Load intentions on component mount and setup real-time subscription
  useEffect(() => {
    loadIntentions();
    setupRealtimeSubscription();
    fetchUserGroups();

    // Cleanup subscription when component unmounts
    return () => {
      if (supabaseSubscription.current) {
        supabase.channel('intentions-changes').unsubscribe();
      }
    };
  }, []);

  // Fetch user's groups from Supabase
  const fetchUserGroups = async () => {
    try {
      setLoadingGroups(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log("User not logged in or error, skipping group fetch");
        setLoadingGroups(false);
        return;
      }

      // First get the user's group memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length === 0) {
        setUserGroups([]);
        setLoadingGroups(false);
        return;
      }

      // Get the group IDs from memberships
      const groupIds = memberships.map(membership => membership.group_id);

      // Fetch the groups based on the IDs
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);

      if (groupsError) throw groupsError;

      // Format the data
      const formattedGroups: Group[] = (groups || []).map(group => ({
        ...group,
        created_at: new Date(group.created_at)
      }));

      setUserGroups(formattedGroups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      setUserGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Toggle group selection helper function
  const toggleGroupSelection = (groupId: string) => {
    if (newIntentionGroups.includes(groupId)) {
      setNewIntentionGroups(newIntentionGroups.filter(id => id !== groupId));
    } else {
      setNewIntentionGroups([...newIntentionGroups, groupId]);
    }
  };

  // Setup real-time subscription to listen for changes to the intentions table
  const setupRealtimeSubscription = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log("User not logged in, skipping real-time subscription");
        return;
      }

      // Subscribe to all changes to the intentions table
      supabaseSubscription.current = supabase
        .channel('intentions-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'intentions',
          },
          (payload) => {
            console.log('Intentions change received:', payload);
            
            // Handle different types of changes
            if (payload.eventType === 'INSERT') {
              handleNewIntention(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              handleUpdatedIntention(payload.new);
            } else if (payload.eventType === 'DELETE') {
              handleDeletedIntention(payload.old);
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to intentions table');
          }
        });
      
      console.log('Set up real-time subscription:', supabaseSubscription.current);
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
  };

  // Handle a new intention being inserted
  const handleNewIntention = async (newIntention: any) => {
    // Convert the created_at string to a Date object
    const formattedIntention: PrayerIntention = {
      ...newIntention,
      created_at: new Date(newIntention.created_at),
    };

    // Check if this intention is already in our state
    const exists = intentions.some((i) => i.id === formattedIntention.id);
    if (!exists) {
      setIntentions((prev) => [formattedIntention, ...prev]);
      
      // Provide subtle feedback if the intention was created by someone else
      const { data: sessionData } = await supabase.auth.getSession();
      if (formattedIntention.user_id !== sessionData?.session?.user?.id) {
        showFeedback("New intention added");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Update AsyncStorage
      saveIntentionsToStorage([formattedIntention, ...intentions]);
    }
  };

  // Handle an intention being updated
  const handleUpdatedIntention = (updatedIntention: any) => {
    // Convert the created_at string to a Date object
    const formattedIntention: PrayerIntention = {
      ...updatedIntention,
      created_at: new Date(updatedIntention.created_at),
    };

    // Update the intention in our state
    setIntentions((prev) =>
      prev.map((i) => (i.id === formattedIntention.id ? formattedIntention : i))
    );

    // Update AsyncStorage
    const updatedIntentions = intentions.map((i) => 
      (i.id === formattedIntention.id ? formattedIntention : i)
    );
    saveIntentionsToStorage(updatedIntentions);
  };

  // Handle an intention being deleted
  const handleDeletedIntention = (deletedIntention: any) => {
    // Remove the intention from our state
    setIntentions((prev) => prev.filter((i) => i.id !== deletedIntention.id));

    // Update AsyncStorage
    const updatedIntentions = intentions.filter((i) => i.id !== deletedIntention.id);
    saveIntentionsToStorage(updatedIntentions);
  };

  // Get color for intention type
  const getIntentionColor = (type: IntentionType): string => {
    const colors = {
      paper: {
        prayer: "#6A478F",
        resolution: "#4A6FA5",
        goal: "#E91E63",
        spiritual: "#26A69A",
        family: "#FF9800",
        health: "#F44336",
        work: "#2196F3",
        friends: "#00BCD4",
        world: "#3F51B5",
        personal: "#9C27B0",
        other: "#607D8B",
      },
      sepia: {
        prayer: "#7A503E",
        resolution: "#8B5A2B",
        goal: "#A94442",
        spiritual: "#2E7D32",
        family: "#B36A00",
        health: "#A94442",
        work: "#0D47A1",
        friends: "#00796B",
        world: "#1A237E",
        personal: "#4A148C",
        other: "#37474F",
      },
      night: {
        prayer: "#9C64A6",
        resolution: "#7B9EB3",
        goal: "#EF5350",
        spiritual: "#4DB6AC",
        family: "#FFB74D",
        health: "#EF5350",
        work: "#64B5F6",
        friends: "#4DD0E1",
        world: "#7986CB",
        personal: "#BA68C8",
        other: "#90A4AE",
      },
    };

    return colors[readingTheme][type];
  };

  // Load prayer intentions from Supabase
  const loadIntentions = async () => {
    setIntentionsLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log("User not logged in or error, using offline mode");
        setOfflineMode(true);
        loadIntentionsFromStorage();
        return;
      }

      // Get intentions where user is the owner or shared with them
      const { data, error } = await supabase
        .from("intentions")
        .select("*")
        .or(`user_id.eq.${user.id},visibility.neq.Just Me`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process data from Supabase
      const formattedIntentions: PrayerIntention[] = data.map((item) => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        description: item.description || "",
        type: item.type as IntentionType,
        created_at: new Date(item.created_at),
        visibility: item.visibility as IntentionVisibility,
        selected_groups: item.selected_groups || [],
        completed: item.completed || false,
        favorite: item.favorite || false,
      }));

      setIntentions(formattedIntentions);

      // Also save to AsyncStorage as backup
      await AsyncStorage.setItem(
        "prayerIntentions",
        JSON.stringify(formattedIntentions)
      );
    } catch (error) {
      console.error("Error loading intentions from Supabase:", error);
      loadIntentionsFromStorage();
      setOfflineMode(true);
    } finally {
      setIntentionsLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh intentions list
  const handleRefresh = () => {
    setRefreshing(true);
    loadIntentions();
  };

  // Load intentions from AsyncStorage (offline fallback)
  const loadIntentionsFromStorage = async () => {
    try {
      const savedIntentions = await AsyncStorage.getItem("prayerIntentions");
      if (savedIntentions) {
        const parsedIntentions = JSON.parse(savedIntentions);
        // Convert string dates back to Date objects
        const formattedIntentions = parsedIntentions.map((intention: any) => ({
          ...intention,
          created_at: new Date(intention.created_at),
        }));
        setIntentions(formattedIntentions);
      }
    } catch (error) {
      console.error("Error loading intentions from storage:", error);
      setIntentions([]);
    }
  };

  // Save intentions to AsyncStorage
  const saveIntentionsToStorage = async (intentionsToSave: PrayerIntention[]) => {
    try {
      await AsyncStorage.setItem("prayerIntentions", JSON.stringify(intentionsToSave));
    } catch (error) {
      console.error("Error saving intentions to storage:", error);
    }
  };

  // Add new prayer intention
  const addIntention = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // Validate form
      if (!newIntentionTitle.trim()) {
        showFeedback("Please enter a title for your prayer intention");
        setIsSubmitting(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setOfflineMode(true);
        showFeedback("You're in offline mode. This will be saved locally.");
      }

      // Prepare data for Supabase
      const intentionData = {
        user_id: user?.id || "offline-user",
        title: newIntentionTitle,
        description: newIntentionDescription,
        type: newIntentionType,
        created_at: new Date().toISOString(),
        visibility: newIntentionVisibility,
        selected_groups: newIntentionVisibility === "Certain Groups" ? newIntentionGroups : [],
        completed: newIntentionComplete,
        favorite: newIntentionFavorite,
      };

      // Create new intention object for local state
      const newIntention: PrayerIntention = {
        ...intentionData,
        id: Math.random().toString(36).substr(2, 9), // Temporary ID
        created_at: new Date(),
      };

      // Add to state immediately for UI responsiveness
      const updatedIntentions = [newIntention, ...intentions];
      setIntentions(updatedIntentions);

      // If online, save to Supabase
      if (!offlineMode && user) {
        const { data, error } = await supabase
          .from("intentions")
          .insert([intentionData])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          // Update the local state with the returned ID
          setIntentions((prev) => {
            const updated = [...prev];
            const index = updated.findIndex((i) => i.id === newIntention.id);
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                id: data[0].id,
              };
            }
            return updated;
          });
        }
      }

      // Save to AsyncStorage as backup
      await saveIntentionsToStorage(updatedIntentions);

      // Provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset form and close modal
      resetIntentionForm();
      setShowNewIntentionModal(false);
      showFeedback("Prayer intention added successfully");
    } catch (error) {
      console.error("Error adding intention:", error);
      showFeedback("Failed to add prayer intention");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset intention form
  const resetIntentionForm = () => {
    setNewIntentionTitle("");
    setNewIntentionDescription("");
    setNewIntentionType("prayer");
    setNewIntentionVisibility("Just Me");
    setNewIntentionGroups([]);
    setNewIntentionComplete(false);
    setNewIntentionFavorite(false);
    setIsSubmitting(false);
  };

  // Toggle intention completed status
  const toggleIntentionCompleted = async (id: string) => {
    try {
      // Find the intention
      const intention = intentions.find((i) => i.id === id);
      if (!intention) return;

      // Update state first for responsive UI
      const updatedIntentions = intentions.map((i) => 
        i.id === id ? { ...i, completed: !i.completed } : i
      );
      setIntentions(updatedIntentions);

      // Show animation and haptic feedback
      animateIntentionFavorite();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (offlineMode) {
        // Save to AsyncStorage
        await saveIntentionsToStorage(updatedIntentions);
        showFeedback(`Intention marked as ${!intention.completed ? "completed" : "active"} (offline mode)`);
        return;
      }

      // If online, update in Supabase
      const { error } = await supabase
        .from("intentions")
        .update({ completed: !intention.completed })
        .eq("id", id);

      if (error) throw error;

      showFeedback(`Intention marked as ${!intention.completed ? "completed" : "active"}`);
    } catch (error) {
      console.error("Error toggling intention completed status:", error);
      showFeedback("Failed to update intention status");
    }
  };

  // Toggle intention favorite status
  const toggleIntentionFavorite = async (id: string) => {
    try {
      // Find the intention
      const intention = intentions.find((i) => i.id === id);
      if (!intention) return;

      // Update state first
      const updatedIntentions = intentions.map((i) => 
        i.id === id ? { ...i, favorite: !i.favorite } : i
      );
      setIntentions(updatedIntentions);

      // Show animation and haptic feedback
      animateIntentionFavorite();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (offlineMode) {
        // Save to AsyncStorage
        await saveIntentionsToStorage(updatedIntentions);
        showFeedback(`Intention ${!intention.favorite ? "favorited" : "unfavorited"} (offline mode)`);
        return;
      }

      // If online, update in Supabase
      const { error } = await supabase
        .from("intentions")
        .update({ favorite: !intention.favorite })
        .eq("id", id);

      if (error) throw error;

      showFeedback(`Intention ${!intention.favorite ? "favorited" : "unfavorited"}`);
    } catch (error) {
      console.error("Error toggling intention favorite status:", error);
      showFeedback("Failed to update intention favorite status");
    }
  };

  // Delete intention
  const deleteIntention = async (id: string) => {
    try {
      // Confirm deletion
      Alert.alert(
        "Delete Intention",
        "Are you sure you want to delete this intention?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Remove from state first
              const updatedIntentions = intentions.filter((i) => i.id !== id);
              setIntentions(updatedIntentions);

              // Haptic feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              if (offlineMode) {
                // Save to AsyncStorage
                await saveIntentionsToStorage(updatedIntentions);
                showFeedback("Intention deleted (offline mode)");
                return;
              }

              // If online, delete from Supabase
              const { error } = await supabase
                .from("intentions")
                .delete()
                .eq("id", id);

              if (error) throw error;

              showFeedback("Intention deleted successfully");
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error("Error deleting intention:", error);
      showFeedback("Failed to delete intention");
    }
  };

  // Get filtered and sorted intentions
  const getFilteredIntentions = useCallback(() => {
    // First filter by tab view (all, active, completed)
    let filtered = intentions.filter((i) => {
      if (intentionsTabView === "all") return true;
      if (intentionsTabView === "active") return !i.completed;
      if (intentionsTabView === "completed") return i.completed;
      return true;
    });

    // Then filter by type if not "all"
    if (intentionFilter !== "all") {
      filtered = filtered.filter((i) => i.type === intentionFilter);
    }

    // Then sort
    return filtered.sort((a, b) => {
      if (intentionSorting === "newest") {
        return b.created_at.getTime() - a.created_at.getTime();
      }
      if (intentionSorting === "oldest") {
        return a.created_at.getTime() - b.created_at.getTime();
      }
      // Alphabetical
      return a.title.localeCompare(b.title);
    });
  }, [intentions, intentionsTabView, intentionFilter, intentionSorting]);

  // Animation for intention favorite action
  const animateIntentionFavorite = () => {
    intentionFavoriteScale.setValue(1);
    Animated.sequence([
      Animated.timing(intentionFavoriteScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(intentionFavoriteScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animation for modal open
  const animateModalOpen = () => {
    Animated.timing(modalSlideUp, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Open the new intention modal
  const openNewIntentionModal = () => {
    setShowNewIntentionModal(true);
    modalSlideUp.setValue(100);
    animateModalOpen();
  };

  // Open the filter modal
  const openFilterModal = () => {
    setShowIntentionFilterModal(true);
    modalSlideUp.setValue(100);
    animateModalOpen();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Render New Intention Modal - All in one page now
  const renderNewIntentionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showNewIntentionModal}
      onRequestClose={() => {
        setShowNewIntentionModal(false);
        resetIntentionForm();
      }}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.intentionModalContainer,
              {
                backgroundColor: themeStyles.backgroundColor,
                transform: [{ translateY: modalSlideUp }]
              },
            ]}
          >
            <LinearGradient
              colors={['#6A478F', '#8860B2']}
              style={styles.intentionModalHeader}
            >
              <Text style={styles.intentionModalTitle}>
                New Prayer Intention
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowNewIntentionModal(false);
                  resetIntentionForm();
                }}
              >
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView 
              style={styles.intentionModalContent}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Type Selection */}
              <Text style={[styles.formSectionTitle, { color: themeStyles.textColor }]}>
                Type
              </Text>
              <View style={styles.typeGrid}>
                {(["prayer", "resolution", "goal", "spiritual", "family", "health", "work", "friends", "world", "personal", "other"] as IntentionType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newIntentionType === type && [
                        styles.activeTypeOption,
                        { 
                          backgroundColor: `${getIntentionColor(type)}20`,
                          borderColor: getIntentionColor(type),
                        },
                      ],
                      {
                        backgroundColor: themeStyles.cardColor,
                        borderColor: themeStyles.borderColor,
                      }
                    ]}
                    onPress={() => setNewIntentionType(type)}
                  >
                    <View
                      style={[
                        styles.typeIconContainer,
                        {
                          backgroundColor: `${getIntentionColor(type)}20`,
                        },
                      ]}
                    >
                      <Feather
                        name={intentionTypeIcons[type] as keyof typeof Feather.glyphMap}
                        size={20}
                        color={getIntentionColor(type)}
                      />
                    </View>
                    <Text
                      style={[
                        styles.typeText,
                        {
                          color: newIntentionType === type
                            ? getIntentionColor(type)
                            : themeStyles.textColor,
                        },
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title and Description */}
              <Text style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}>
                Title <Text style={{ color: "#E91E63" }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: themeStyles.textColor,
                    backgroundColor: themeStyles.cardColor,
                    borderColor: themeStyles.borderColor,
                  },
                ]}
                placeholder="What is your prayer intention?"
                placeholderTextColor={readingTheme === "night" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"}
                value={newIntentionTitle}
                onChangeText={setNewIntentionTitle}
              />

              <Text style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}>
                Description <Text style={{ color: themeStyles.textColor, opacity: 0.5 }}>(optional)</Text>
              </Text>
              <TextInput
                style={[
                  styles.formTextArea,
                  {
                    color: themeStyles.textColor,
                    backgroundColor: themeStyles.cardColor,
                    borderColor: themeStyles.borderColor,
                  },
                ]}
                placeholder="Add details about your intention..."
                placeholderTextColor={readingTheme === "night" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"}
                value={newIntentionDescription}
                onChangeText={setNewIntentionDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Visibility Options */}
              <Text style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}>
                Visibility
              </Text>
              <View style={styles.visibilityContainer}>
                {(["Just Me", "Friends", "Friends & Groups", "Certain Groups"] as IntentionVisibility[]).map((visibility) => (
                  <TouchableOpacity
                    key={visibility}
                    style={[
                      styles.visibilityOption,
                      newIntentionVisibility === visibility && [
                        styles.activeVisibilityOption,
                        {
                          borderColor: themeStyles.accentColor,
                          backgroundColor: `${themeStyles.accentColor}15`,
                        },
                      ],
                      {
                        backgroundColor: themeStyles.cardColor,
                        borderColor: themeStyles.borderColor,
                      }
                    ]}
                    onPress={() => setNewIntentionVisibility(visibility)}
                  >
                    <View
                      style={[
                        styles.visibilityIconContainer,
                        {
                          backgroundColor: newIntentionVisibility === visibility
                            ? `${themeStyles.accentColor}20`
                            : themeStyles.cardColor,
                        },
                      ]}
                    >
                      <Feather
                        name={
                          visibility === "Just Me" ? "lock" :
                          visibility === "Friends" ? "users" :
                          visibility === "Friends & Groups" ? "globe" :
                          "users"
                        }
                        size={20}
                        color={newIntentionVisibility === visibility ? themeStyles.accentColor : themeStyles.textColor}
                      />
                    </View>
                    <View style={styles.visibilityTextContainer}>
                      <Text
                        style={[
                          styles.visibilityTitle,
                          {
                            color: newIntentionVisibility === visibility
                              ? themeStyles.accentColor
                              : themeStyles.textColor,
                            fontWeight: newIntentionVisibility === visibility ? "600" : "400",
                          },
                        ]}
                      >
                        {visibility}
                      </Text>
                      <Text
                        style={[
                          styles.visibilityDescription,
                          {
                            color: themeStyles.textColor,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        {visibility === "Just Me" && "Only visible to you"}
                        {visibility === "Friends" && "Share with your friends"}
                        {visibility === "Friends & Groups" && "Share with friends and all your groups"}
                        {visibility === "Certain Groups" && "Select specific groups to share with"}
                      </Text>
                    </View>
                    {newIntentionVisibility === visibility && (
                      <View
                        style={[
                          styles.selectedVisibilityMark,
                          {
                            backgroundColor: themeStyles.accentColor,
                          },
                        ]}
                      >
                        <Feather name="check" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Group Selection (show when Certain Groups is selected) */}
              {newIntentionVisibility === "Certain Groups" && (
                <View style={styles.groupSelectionContainer}>
                  <Text style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}>
                    Select Groups
                  </Text>
                  {loadingGroups ? (
                    <ActivityIndicator size="small" color={themeStyles.accentColor} style={{ marginVertical: 10 }} />
                  ) : userGroups.length > 0 ? (
                    <View style={styles.groupGrid}>
                      {userGroups.map((group) => (
                        <TouchableOpacity
                          key={group.id}
                          style={[
                            styles.groupOption,
                            newIntentionGroups.includes(group.id) && [
                              styles.activeGroupOption,
                              { 
                                backgroundColor: `${themeStyles.accentColor}20`,
                                borderColor: themeStyles.accentColor,
                              },
                            ],
                            {
                              backgroundColor: themeStyles.cardColor,
                              borderColor: themeStyles.borderColor,
                            }
                          ]}
                          onPress={() => toggleGroupSelection(group.id)}
                        >
                          <View
                            style={[
                              styles.groupIconContainer,
                              {
                                backgroundColor: `${themeStyles.accentColor}20`,
                              },
                            ]}
                          >
                            <Feather
                              name="users"
                              size={20}
                              color={themeStyles.accentColor}
                            />
                          </View>
                          <Text
                            style={[
                              styles.groupText,
                              {
                                color: newIntentionGroups.includes(group.id)
                                  ? themeStyles.accentColor
                                  : themeStyles.textColor,
                              },
                            ]}
                          >
                            {group.name}
                          </Text>
                          {newIntentionGroups.includes(group.id) && (
                            <Feather 
                              name="check"
                              size={18} 
                              color={themeStyles.accentColor}
                              style={{ marginLeft: 'auto' }}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyGroupsText, { color: `${themeStyles.textColor}80` }]}>
                      You are not a member of any groups. Join or create groups in the Community tab.
                    </Text>
                  )}
                </View>
              )}

              {/* Additional Options */}
              <Text style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}>
                Additional Options
              </Text>
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  {
                    borderBottomColor: themeStyles.borderColor,
                    borderBottomWidth: 1,
                  },
                ]}
                onPress={() => setNewIntentionFavorite(!newIntentionFavorite)}
              >
                <Text style={[styles.optionText, { color: themeStyles.textColor }]}>
                  Mark as favorite
                </Text>
                <TouchableOpacity 
                  onPress={() => setNewIntentionFavorite(!newIntentionFavorite)}
                  style={styles.favoriteCheckbox}
                >
                  <Feather 
                    name="heart"
                    size={24} 
                    color={newIntentionFavorite ? themeStyles.favoriteColor : themeStyles.borderColor} 
                    solid={newIntentionFavorite}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setNewIntentionComplete(!newIntentionComplete)}
              >
                <Text style={[styles.optionText, { color: themeStyles.textColor }]}>
                  Mark as completed
                </Text>
                <TouchableOpacity 
                  onPress={() => setNewIntentionComplete(!newIntentionComplete)}
                  style={styles.completeCheckbox}
                >
                  <Feather 
                    name={newIntentionComplete ? "check-circle" : "circle"}
                    size={24} 
                    color={newIntentionComplete ? themeStyles.accentColor : themeStyles.borderColor} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Submit Button */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      borderColor: themeStyles.borderColor,
                    },
                  ]}
                  onPress={() => {
                    setShowNewIntentionModal(false);
                    resetIntentionForm();
                  }}
                >
                  <Text style={{ color: themeStyles.textColor }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    {
                      backgroundColor: themeStyles.accentColor,
                      opacity: (newIntentionTitle.trim() && !isSubmitting) ? 1 : 0.7,
                    },
                  ]}
                  onPress={addIntention}
                  disabled={!newIntentionTitle.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Create Intention</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Render Filter Modal
  const renderFilterModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showIntentionFilterModal}
      onRequestClose={() => setShowIntentionFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.intentionModalContainer,
            {
              backgroundColor: themeStyles.backgroundColor,
              transform: [{ translateY: modalSlideUp }]
            },
          ]}
        >
          <LinearGradient
            colors={['#8952D0', '#AD7CEA']}
            style={styles.intentionModalHeader}
          >
            <Text style={styles.intentionModalTitle}>
              Filters & Sorting
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowIntentionFilterModal(false)}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.intentionModalContent}>
            <Text style={[styles.filterSectionTitle, { color: themeStyles.textColor }]}>
              Filter by Type
            </Text>

            <TouchableOpacity
              style={[
                styles.filterOptionAll,
                intentionFilter === "all" && {
                  borderColor: themeStyles.accentColor,
                  backgroundColor: `${themeStyles.accentColor}10`,
                },
                {
                  backgroundColor: themeStyles.cardColor,
                },
              ]}
              onPress={() => setIntentionFilter("all")}
            >
              <Text style={[styles.filterOptionText, { color: themeStyles.textColor }]}>
                All
              </Text>
              {intentionFilter === "all" && (
                <Feather name="check" size={20} color={themeStyles.accentColor} />
              )}
            </TouchableOpacity>

            {(["prayer", "resolution", "goal", "spiritual", "family", "health", "work", "friends", "world", "personal", "other"] as IntentionType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterOption,
                  intentionFilter === type && {
                    borderColor: getIntentionColor(type),
                    backgroundColor: `${getIntentionColor(type)}10`,
                  },
                  {
                    backgroundColor: themeStyles.cardColor,
                  },
                ]}
                onPress={() => setIntentionFilter(type)}
              >
                <View style={styles.filterOptionContent}>
                  <View
                    style={[
                      styles.filterIconContainer,
                      {
                        backgroundColor: `${getIntentionColor(type)}20`,
                      },
                    ]}
                  >
                    <Feather
                      name={intentionTypeIcons[type] as keyof typeof Feather.glyphMap}
                      size={20}
                      color={getIntentionColor(type)}
                    />
                  </View>
                  <Text style={[styles.filterOptionText, { color: themeStyles.textColor }]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </View>
                {intentionFilter === type && (
                  <Feather name="check" size={20} color={getIntentionColor(type)} />
                )}
              </TouchableOpacity>
            ))}

            <Text style={[styles.filterSectionTitle, { color: themeStyles.textColor, marginTop: 24 }]}>
              Sort By
            </Text>

            {[
              { value: "newest", label: "Newest First" },
              { value: "oldest", label: "Oldest First" },
              { value: "alphabetical", label: "Alphabetical (A-Z)" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOptionSort,
                  intentionSorting === option.value && {
                    borderColor: themeStyles.accentColor,
                    backgroundColor: `${themeStyles.accentColor}10`,
                  },
                  {
                    backgroundColor: themeStyles.cardColor,
                  },
                ]}
                onPress={() => setIntentionSorting(option.value as IntentionsSorting)}
              >
                <Text style={[styles.filterOptionText, { color: themeStyles.textColor }]}>
                  {option.label}
                </Text>
                {intentionSorting === option.value && (
                  <Feather name="check" size={20} color={themeStyles.accentColor} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.applyFilterButton,
                {
                  backgroundColor: themeStyles.accentColor,
                },
              ]}
              onPress={() => setShowIntentionFilterModal(false)}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Apply Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  // Main render
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]}>
      <StatusBar barStyle={readingTheme === "night" ? "light-content" : "dark-content"} />
      
      <View style={styles.intentionsContainer}>
        {/* Header with intentions stats */}
        <LinearGradient
          colors={['#8952D0', '#AD7CEA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.intentionsStatsContainer}
        >
          <View style={{ flex: 1, flexDirection: "row" }}>
            <View style={styles.intentionStat}>
              <Text style={[styles.intentionStatNumber, { color: "#FFF" }]}>
                {intentions.length}
              </Text>
              <Text style={[styles.intentionStatLabel, { color: "#FFF" }]}>
                Total
              </Text>
            </View>

            <View style={styles.intentionStat}>
              <Text style={[styles.intentionStatNumber, { color: "#FFF" }]}>
                {intentions.filter(i => !i.completed).length}
              </Text>
              <Text style={[styles.intentionStatLabel, { color: "#FFF" }]}>
                Active
              </Text>
            </View>

            <View style={styles.intentionStat}>
              <Text style={[styles.intentionStatNumber, { color: "#FFF" }]}>
                {intentions.filter(i => i.completed).length}
              </Text>
              <Text style={[styles.intentionStatLabel, { color: "#FFF" }]}>
                Completed
              </Text>
            </View>

            <View style={styles.intentionStat}>
              <Text style={[styles.intentionStatNumber, { color: "#FFF" }]}>
                {intentions.filter(i => i.favorite).length}
              </Text>
              <Text style={[styles.intentionStatLabel, { color: "#FFF" }]}>
                Favorites
              </Text>
            </View>
          </View>
          
          {/* Filter button in header with improved styling */}
          <TouchableOpacity
            style={styles.intentionFilterButton}
            onPress={openFilterModal}
            activeOpacity={0.7}
          >
            <Feather name="filter" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Intentions Tabs */}
        <View 
          style={[
            styles.intentionsTabsContainer,
            { backgroundColor: readingTheme === "night" ? "#262626" : "#F5F5F5" }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.intentionTab,
              intentionsTabView === "all" && [
                styles.activeIntentionTab,
                { backgroundColor: themeStyles.cardColor }
              ],
            ]}
            onPress={() => setIntentionsTabView("all")}
          >
            <Text
              style={[
                styles.intentionTabText,
                { 
                  color: themeStyles.textColor,
                  opacity: intentionsTabView === "all" ? 1 : 0.6
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.intentionTab,
              intentionsTabView === "active" && [
                styles.activeIntentionTab,
                { backgroundColor: themeStyles.cardColor }
              ],
            ]}
            onPress={() => setIntentionsTabView("active")}
          >
            <Text
              style={[
                styles.intentionTabText,
                { 
                  color: themeStyles.textColor,
                  opacity: intentionsTabView === "active" ? 1 : 0.6
                },
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.intentionTab,
              intentionsTabView === "completed" && [
                styles.activeIntentionTab,
                { backgroundColor: themeStyles.cardColor }
              ],
            ]}
            onPress={() => setIntentionsTabView("completed")}
          >
            <Text
              style={[
                styles.intentionTabText,
                { 
                  color: themeStyles.textColor,
                  opacity: intentionsTabView === "completed" ? 1 : 0.6
                },
              ]}
            >
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {intentionsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6A478F" />
            <Text style={[styles.loadingText, { color: themeStyles.textColor }]}>
              Loading your prayer intentions...
            </Text>
          </View>
        ) : getFilteredIntentions().length === 0 ? (
          <View style={styles.emptyIntentionsContainer}>
            <Feather
              name="user"
              size={64}
              color={`${themeStyles.textColor}40`}
              style={styles.emptyIntentionsIcon}
            />
            <Text
              style={[
                styles.emptyIntentionsText,
                { color: themeStyles.textColor },
              ]}
            >
              No prayer intentions found
            </Text>
            <Text
              style={[
                styles.emptyIntentionsSubtext,
                { color: `${themeStyles.textColor}80` },
              ]}
            >
              {intentionsTabView === "all"
                ? "Create a new prayer intention by tapping the + button"
                : intentionsTabView === "active"
                ? "Your active prayer intentions will appear here"
                : "Your completed prayer intentions will appear here"}
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyIntentionsButton,
                {
                  backgroundColor: "#6A478F",
                },
              ]}
              onPress={openNewIntentionModal}
            >
              <Text style={styles.emptyIntentionsButtonText}>
                Create Prayer Intention
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={getFilteredIntentions()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.intentionItem,
                  {
                    backgroundColor: themeStyles.cardColor,
                    borderColor: themeStyles.borderColor,
                    shadowColor: themeStyles.shadowColor,
                    opacity: item.completed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.intentionItemHeader}>
                  <View
                    style={[
                      styles.intentionTypeTag,
                      {
                        backgroundColor: `${getIntentionColor(item.type)}20`,
                      },
                    ]}
                  >
                    <Feather
                      name={intentionTypeIcons[item.type] as keyof typeof Feather.glyphMap}
                      size={14}
                      color={getIntentionColor(item.type)}
                    />
                    <Text
                      style={[
                        styles.intentionTypeText,
                        {
                          color: getIntentionColor(item.type),
                        },
                      ]}
                    >
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                  </View>

                  <View style={styles.intentionHeaderActions}>
                    <Text
                      style={[
                        styles.intentionDate,
                        { color: `${themeStyles.textColor}80` },
                      ]}
                    >
                      {item.created_at.toLocaleDateString()}
                    </Text>

                    <Animated.View
                      style={{ transform: [{ scale: intentionFavoriteScale }] }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.intentionFavoriteButton,
                          item.favorite && {
                            backgroundColor: `${themeStyles.favoriteColor}20`,
                          },
                        ]}
                        onPress={() => toggleIntentionFavorite(item.id)}
                      >
                        <Feather
                          name="heart"
                          size={16}
                          color={
                            item.favorite
                              ? themeStyles.favoriteColor
                              : `${themeStyles.textColor}60`
                          }
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </View>

                <View style={styles.intentionItemContent}>
                  <TouchableOpacity
                    style={styles.intentionCompletedButton}
                    onPress={() => toggleIntentionCompleted(item.id)}
                  >
                    <Feather
                      name={item.completed ? "check-circle" : "circle"}
                      size={24}
                      color={
                        item.completed
                          ? themeStyles.accentColor
                          : `${themeStyles.textColor}40`
                      }
                    />
                  </TouchableOpacity>

                  <View style={styles.intentionTextContent}>
                    <Text
                      style={[
                        styles.intentionTitle,
                        {
                          color: themeStyles.textColor,
                          textDecorationLine: item.completed
                            ? "line-through"
                            : "none",
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                    {item.description ? (
                      <Text
                        style={[
                          styles.intentionDescription,
                          { color: `${themeStyles.textColor}80` },
                        ]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.intentionItemFooter}>
                  <View
                    style={[
                      styles.intentionVisibilityTag,
                      {
                        backgroundColor: `${themeStyles.accentColor}10`,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        item.visibility === "Just Me"
                          ? "lock"
                          : item.visibility === "Friends"
                          ? "users"
                          : item.visibility === "Friends & Groups"
                          ? "globe"
                          : "users"
                      }
                      size={12}
                      color={themeStyles.accentColor}
                    />
                    <Text
                      style={[
                        styles.intentionVisibilityText,
                        {
                          color: themeStyles.accentColor,
                        },
                      ]}
                    >
                      {item.visibility}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.intentionDeleteButton}
                    onPress={() => deleteIntention(item.id)}
                  >
                    <Feather
                      name="trash-2"
                      size={14}
                      color={`${themeStyles.textColor}60`}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.intentionsList}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        {/* New Add Prayer Button */}
        <AddPrayerButton 
          onPress={openNewIntentionModal} 
          theme={readingTheme === "night" ? "dark" : readingTheme === "paper" ? "light" : readingTheme}
        />

        {/* Render Modals */}
        {renderNewIntentionModal()}
        {renderFilterModal()}
      </View>
    </SafeAreaView>
  );
};

// Default themes with brighter colors
const defaultThemes = {
  light: {
    backgroundColor: "#FFFFFF",
    cardColor: "#FFFFFF",
    textColor: "#000000",
    borderColor: "#EEEEEE",
    headerColor: "#F5F5F5",
    shadowColor: "#000000",
    accentColor: "#8952D0", // Brighter purple
    favoriteColor: "#FF5A93"  // Brighter pink
  },
  dark: {
    backgroundColor: "#121212",
    cardColor: "#1E1E1E",
    textColor: "#FFFFFF",
    borderColor: "#333333",
    headerColor: "#1A1A1A",
    shadowColor: "#000000",
    accentColor: "#B27AE8", // Brighter purple
    favoriteColor: "#FF7EB4" // Brighter pink
  },
  sepia: {
    backgroundColor: "#F8F0E3",
    cardColor: "#FFF8E9",
    textColor: "#442C2E",
    borderColor: "#E0D6C2",
    headerColor: "#F0E6D2",
    shadowColor: "#442C2E",
    accentColor: "#A66E52", // Brighter brown
    favoriteColor: "#D05959" // Brighter red
  }
};

// Default font sizes
const defaultFontSizes = {
  small: {
    title: 16,
    body: 14,
    caption: 12
  },
  medium: {
    title: 18,
    body: 16,
    caption: 14
  },
  large: {
    title: 20,
    body: 18,
    caption: 16
  }
};

// Add Button Styles
const addButtonStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    alignItems: 'center',
    zIndex: 10,
  },
  labelContainer: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    overflow: 'hidden',
  },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  // Decorative elements inspired by prayer symbols
  circle1: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: 14,
    left: 14,
  },
  circle2: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    top: 6,
    left: 6,
  },
  droplet: {
    position: 'absolute',
    width: 18,
    height: 25,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ rotate: '45deg' }],
    bottom: 10,
    right: 12,
  },
  dot1: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    top: 15,
    right: 20,
  },
  dot2: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    top: 8,
    right: 28,
  },
  dot3: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    bottom: 18,
    left: 15,
  },
});

// Main component styles
const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
  },
  intentionsContainer: {
    flex: 1,
  },
  
  // Stats container at the top
  intentionsStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  intentionStat: {
    alignItems: "center",
    flex: 1,
  },
  intentionStatNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  intentionStatLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  
  // Tab navigation
  intentionsTabsContainer: {
    flexDirection: "row",
    padding: 8,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  intentionTab: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeIntentionTab: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  intentionTabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  
  // Loading and empty states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  emptyIntentionsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 50,
  },
  emptyIntentionsIcon: {
    marginBottom: 24,
  },
  emptyIntentionsText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyIntentionsSubtext: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyIntentionsButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  emptyIntentionsButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  
  // Intentions list
  intentionsList: {
    padding: 16,
    paddingBottom: 100, // Extra space for floating buttons
  },
  intentionItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  intentionItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  intentionTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  intentionTypeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  intentionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  intentionDate: {
    fontSize: 12,
    marginRight: 10,
  },
  intentionFavoriteButton: {
    padding: 6,
    borderRadius: 20,
  },
  intentionItemContent: {
    flexDirection: "row",
    marginBottom: 16,
  },
  intentionCompletedButton: {
    padding: 6,
    marginRight: 10,
  },
  intentionTextContent: {
    flex: 1,
  },
  intentionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    lineHeight: 22,
  },
  intentionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  intentionItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intentionVisibilityTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  intentionVisibilityText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  intentionDeleteButton: {
    padding: 6,
  },
  
  // Filter Button (now in header)
  intentionFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  intentionModalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: Platform.OS === "ios" ? '80%' : '90%',
  },
  intentionModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  intentionModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  closeButton: {
    padding: 8,
  },
  intentionModalContent: {
    padding: 20,
  },
  
  // Form styles
  formSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  typeOption: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  activeTypeOption: {
    borderWidth: 2,
  },
  typeIconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  formInput: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  formTextArea: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  
  // Visibility options
  visibilityContainer: {
    marginBottom: 10,
  },
  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    position: "relative",
  },
  activeVisibilityOption: {
    borderWidth: 2,
  },
  visibilityIconContainer: {
    padding: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  visibilityDescription: {
    fontSize: 13,
  },
  selectedVisibilityMark: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Additional options
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 16,
  },
  favoriteCheckbox: {
    padding: 6,
  },
  completeCheckbox: {
    padding: 6,
  },
  
  // Action buttons
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  createButton: {
    flex: 2,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  
  // Filter modal
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  filterOptionAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterOptionSort: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterIconContainer: {
    padding: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  applyFilterButton: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  
  // Group selection styles
  groupSelectionContainer: {
    marginTop: 10,
  },
  groupGrid: {
    marginTop: 8,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  activeGroupOption: {
    borderWidth: 2,
  },
  groupIconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  groupText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyGroupsText: {
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
  }
});

export default PrayerIntentions;