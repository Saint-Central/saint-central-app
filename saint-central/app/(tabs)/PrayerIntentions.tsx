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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePrayerIntentions, IntentionType, IntentionVisibility } from "@/contexts/PrayerIntentionsContext";

// Additional types specific to this component
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
const AddPrayerButton: React.FC<{ onPress: () => void; theme?: "light" | "dark" | "sepia" }> = ({
  onPress,
  theme = "light",
}) => {
  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current;

  // Define colors based on theme
  const colors = {
    light: {
      primary: "#6A478F",
      secondary: "#8860B2",
      highlight: "#A578D5",
      background: "#FFFFFF",
      text: "#FFFFFF",
    },
    dark: {
      primary: "#9C64A6",
      secondary: "#7A4A8C",
      highlight: "#BF89CE",
      background: "#2D2D2D",
      text: "#FFFFFF",
    },
    sepia: {
      primary: "#7A503E",
      secondary: "#A46E58",
      highlight: "#C5917C",
      background: "#F8F0E3",
      text: "#F8F0E3",
    },
  };

  const themeColors = colors[theme as "light" | "dark" | "sepia"];

  // Start animations when component mounts
  useEffect(() => {
    // Entrance animation
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
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
      ]),
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
      ]),
    ).start();
  }, []);

  // Handle button press with appropriate feedback
  const handlePress = () => {
    // Provide haptic feedback based on device capabilities
    if (Platform.OS === "ios") {
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
          transform: [{ translateY: floatAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      {/* Text label that appears above button */}
      <Animated.View
        style={[
          addButtonStyles.labelContainer,
          {
            backgroundColor: themeColors.primary,
            opacity: textOpacityAnim,
          },
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
  themeStyles: providedThemeStyles,
  fontSizeStyles = defaultFontSizes.medium,
  readingTheme: providedReadingTheme,
  showFeedback = (message) => Toast.show({ type: "success", text1: message }),
}) => {
  // State for theme management
  const [currentTheme, setCurrentTheme] = useState<"paper" | "sepia" | "night">(providedReadingTheme || "paper");
  
  // Use the appropriate theme based on currentTheme state
  const readingTheme = currentTheme;
  const themeStyles = providedThemeStyles || defaultThemes[readingTheme === "night" ? "dark" : readingTheme === "sepia" ? "sepia" : "light"];
  
  // Get safe area insets
  const insets = useSafeAreaInsets();
  
  // Navigation
  const navigation = useNavigation();

  // Use shared context instead of local state
  const {
    intentions,
    loading: intentionsLoading,
    refreshing,
    userGroups,
    userFriends,
    addIntention,
    toggleFavorite,
    toggleCompleted,
    deleteIntention: contextDeleteIntention,
    refreshIntentions,
    getFilteredIntentions,
  } = usePrayerIntentions();

  // Local UI state
  const [intentionsTabView, setIntentionsTabView] = useState<IntentionsTabView>("all");
  const [showNewIntentionModal, setShowNewIntentionModal] = useState<boolean>(false);
  const [showIntentionFilterModal, setShowIntentionFilterModal] = useState<boolean>(false);

  // New intention form state - all in one form now
  const [newIntentionTitle, setNewIntentionTitle] = useState<string>("");
  const [newIntentionDescription, setNewIntentionDescription] = useState<string>("");
  const [newIntentionType, setNewIntentionType] = useState<IntentionType>("prayer");
  const [newIntentionVisibility, setNewIntentionVisibility] =
    useState<IntentionVisibility>("Just Me");
  const [newIntentionGroups, setNewIntentionGroups] = useState<string[]>([]);
  const [newIntentionComplete, setNewIntentionComplete] = useState<boolean>(false);
  const [newIntentionFavorite, setNewIntentionFavorite] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [newIntentionFriends, setNewIntentionFriends] = useState<string[]>([]);

  // Intention filtering and sorting state
  const [intentionFilter, setIntentionFilter] = useState<IntentionsFilter>("all");
  const [intentionSorting, setIntentionSorting] = useState<IntentionsSorting>("newest");

  // Animation refs
  const intentionFavoriteScale = useRef(new Animated.Value(1)).current;
  const modalSlideUp = useRef(new Animated.Value(100)).current;



  // Component initialization - context handles data fetching
  useEffect(() => {
    // Load saved theme preference
    loadThemePreference();
    // The context handles all data fetching automatically
  }, []);
  
  // Load theme preference from AsyncStorage
  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("prayerIntentionsTheme");
      if (savedTheme && ["paper", "sepia", "night"].includes(savedTheme)) {
        setCurrentTheme(savedTheme as "paper" | "sepia" | "night");
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    }
  };
  
  // Save theme preference to AsyncStorage
  const saveThemePreference = async (theme: "paper" | "sepia" | "night") => {
    try {
      await AsyncStorage.setItem("prayerIntentionsTheme", theme);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };
  
  // Effect to save theme when it changes
  useEffect(() => {
    saveThemePreference(currentTheme);
  }, [currentTheme]);



  // Toggle group selection helper function
  const toggleGroupSelection = (groupId: string) => {
    if (newIntentionGroups.includes(groupId)) {
      setNewIntentionGroups(newIntentionGroups.filter((id) => id !== groupId));
    } else {
      setNewIntentionGroups([...newIntentionGroups, groupId]);
    }
  };

  // Toggle friend selection
  const toggleFriendSelection = (friendId: string) => {
    setNewIntentionFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
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

  // Refresh intentions list using context
  const handleRefresh = () => {
    refreshIntentions();
  };

  // Add new prayer intention using context
  const addNewIntention = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Validate form
      if (!newIntentionTitle.trim()) {
        showFeedback("Please enter a title for your prayer intention");
        setIsSubmitting(false);
        return;
      }

      // Prepare data for context
      const intentionData = {
        title: newIntentionTitle,
        description: newIntentionDescription,
        type: newIntentionType,
        visibility: newIntentionVisibility,
        selected_groups: newIntentionVisibility === "Certain Groups" ? newIntentionGroups : [],
        selected_friends: newIntentionVisibility === "Certain Friends" ? newIntentionFriends : [],
        completed: newIntentionComplete,
        favorite: newIntentionFavorite,
      };

      // Use context to add intention
      await addIntention(intentionData);

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
    setNewIntentionFriends([]);
    setNewIntentionComplete(false);
    setNewIntentionFavorite(false);
    setIsSubmitting(false);
  };

  // Toggle intention completed status using context
  const toggleIntentionCompleted = async (id: string) => {
    try {
      // Show animation and haptic feedback
      animateIntentionFavorite();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Use context to toggle completed status
      await toggleCompleted(id);

      const intention = intentions.find((i) => i.id === id);
      showFeedback(`Intention marked as ${intention?.completed ? "active" : "completed"}`);
    } catch (error) {
      console.error("Error toggling intention completed status:", error);
      showFeedback("Failed to update intention status");
    }
  };

  // Toggle intention favorite status using context
  const toggleIntentionFavorite = async (id: string) => {
    try {
      // Show animation and haptic feedback
      animateIntentionFavorite();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Use context to toggle favorite status
      await toggleFavorite(id);

      const intention = intentions.find((i) => i.id === id);
      showFeedback(`Intention ${intention?.favorite ? "unfavorited" : "favorited"}`);
    } catch (error) {
      console.error("Error toggling intention favorite status:", error);
      showFeedback("Failed to update intention favorite status");
    }
  };

  // Delete intention using context
  const deleteIntentionHandler = async (id: string) => {
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
              try {
                // Use context to delete intention
                await contextDeleteIntention(id);

                // Haptic feedback
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showFeedback("Intention deleted successfully");
              } catch (error) {
                console.error("Error deleting intention:", error);
                showFeedback("Failed to delete intention");
              }
            },
          },
        ],
        { cancelable: true },
      );
    } catch (error) {
      console.error("Error deleting intention:", error);
      showFeedback("Failed to delete intention");
    }
  };

  // Fetch user friends for intention sharing
  const fetchUserFriends = async () => {
    // The userFriends data is already available from the context
    // No need to fetch separately as usePrayerIntentions provides it
  };

  // Fetch user groups for intention sharing  
  const fetchUserGroups = async () => {
    // The userGroups data is already available from the context
    // No need to fetch separately as usePrayerIntentions provides it
  };

  // Get filtered and sorted intentions using context
  const getDisplayIntentions = useCallback(() => {
    // Use context filtering for type
    let filtered = getFilteredIntentions({
      type: intentionFilter === "all" ? undefined : intentionFilter,
      completed: intentionsTabView === "all" ? undefined : intentionsTabView === "completed",
    });

    // Apply local sorting
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
  }, [getFilteredIntentions, intentionsTabView, intentionFilter, intentionSorting]);

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
                transform: [{ translateY: modalSlideUp }],
              },
            ]}
          >
            <LinearGradient colors={readingTheme === "night" ? ["#3A2859", "#5A3D7A"] : readingTheme === "sepia" ? ["#7A503E", "#A46E58"] : ["#6A478F", "#8860B2"]} style={styles.intentionModalHeader}>
              <Text style={styles.intentionModalTitle}>New Prayer Intention</Text>
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
              <Text style={[styles.formSectionTitle, { color: themeStyles.textColor }]}>Type</Text>
              <View style={styles.typeGrid}>
                {(
                  [
                    "prayer",
                    "resolution",
                    "goal",
                    "spiritual",
                    "family",
                    "health",
                    "work",
                    "friends",
                    "world",
                    "personal",
                    "other",
                  ] as IntentionType[]
                ).map((type) => (
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
                      },
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
                          color:
                            newIntentionType === type
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
              <Text
                style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}
              >
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
                placeholderTextColor={
                  readingTheme === "night" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"
                }
                value={newIntentionTitle}
                onChangeText={setNewIntentionTitle}
              />

              <Text
                style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}
              >
                Description{" "}
                <Text style={{ color: themeStyles.textColor, opacity: 0.5 }}>(optional)</Text>
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
                placeholderTextColor={
                  readingTheme === "night" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"
                }
                value={newIntentionDescription}
                onChangeText={setNewIntentionDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Visibility Options */}
              <Text
                style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}
              >
                Visibility
              </Text>
              <View style={styles.visibilityContainer}>
                {(
                  [
                    "Just Me",
                    "Friends",
                    "Friends & Groups",
                    "Certain Friends",
                    "Certain Groups",
                  ] as IntentionVisibility[]
                ).map((visibility) => (
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
                      },
                    ]}
                    onPress={() => setNewIntentionVisibility(visibility)}
                  >
                    <View
                      style={[
                        styles.visibilityIconContainer,
                        {
                          backgroundColor:
                            newIntentionVisibility === visibility
                              ? `${themeStyles.accentColor}20`
                              : themeStyles.cardColor,
                        },
                      ]}
                    >
                      <Feather
                        name={
                          visibility === "Just Me"
                            ? "lock"
                            : visibility === "Friends"
                              ? "users"
                              : visibility === "Friends & Groups"
                                ? "globe"
                                : visibility === "Certain Friends"
                                  ? "users"
                                  : "users"
                        }
                        size={20}
                        color={
                          newIntentionVisibility === visibility
                            ? themeStyles.accentColor
                            : themeStyles.textColor
                        }
                      />
                    </View>
                    <View style={styles.visibilityTextContainer}>
                      <Text
                        style={[
                          styles.visibilityTitle,
                          {
                            color:
                              newIntentionVisibility === visibility
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
                        {visibility === "Friends & Groups" &&
                          "Share with friends and all your groups"}
                        {visibility === "Certain Friends" &&
                          "Select specific friends to share with"}
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
                  <Text
                    style={[
                      styles.formSectionTitle,
                      { color: themeStyles.textColor, marginTop: 16 },
                    ]}
                  >
                    Select Groups
                  </Text>
                  {false ? (
                    <ActivityIndicator
                      size="small"
                      color={themeStyles.accentColor}
                      style={{ marginVertical: 10 }}
                    />
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
                            },
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
                            <Feather name="users" size={20} color={themeStyles.accentColor} />
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
                              style={{ marginLeft: "auto" }}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyGroupsText, { color: `${themeStyles.textColor}80` }]}>
                      You are not a member of any groups. Join or create groups in the Community
                      tab.
                    </Text>
                  )}
                </View>
              )}

              {/* Friend Selection (show when Certain Friends is selected) */}
              {newIntentionVisibility === "Certain Friends" && (
                <View style={styles.friendSelectionContainer}>
                  <Text
                    style={[
                      styles.formSectionTitle,
                      { color: themeStyles.textColor, marginTop: 16 },
                    ]}
                  >
                    Select Friends
                  </Text>
                  {false ? (
                    <ActivityIndicator
                      size="small"
                      color={themeStyles.accentColor}
                      style={{ marginVertical: 10 }}
                    />
                  ) : userFriends.length > 0 ? (
                    <View style={styles.friendGrid}>
                      {userFriends.map((friend) => (
                        <TouchableOpacity
                          key={friend.id}
                          style={[
                            styles.friendOption,
                            newIntentionFriends.includes(friend.id) && [
                              styles.activeFriendOption,
                              {
                                backgroundColor: `${themeStyles.accentColor}20`,
                                borderColor: themeStyles.accentColor,
                              },
                            ],
                            {
                              backgroundColor: themeStyles.cardColor,
                              borderColor: themeStyles.borderColor,
                            },
                          ]}
                          onPress={() => toggleFriendSelection(friend.id)}
                        >
                          <View
                            style={[
                              styles.friendIconContainer,
                              {
                                backgroundColor: `${themeStyles.accentColor}20`,
                              },
                            ]}
                          >
                            <Feather name="user" size={20} color={themeStyles.accentColor} />
                          </View>
                          <Text
                            style={[
                              styles.friendText,
                              {
                                color: newIntentionFriends.includes(friend.id)
                                  ? themeStyles.accentColor
                                  : themeStyles.textColor,
                              },
                            ]}
                          >
                            {`${friend.first_name} ${friend.last_name}`}
                          </Text>
                          {newIntentionFriends.includes(friend.id) && (
                            <Feather
                              name="check"
                              size={18}
                              color={themeStyles.accentColor}
                              style={{ marginLeft: "auto" }}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text
                      style={[styles.emptyFriendsText, { color: `${themeStyles.textColor}80` }]}
                    >
                      You don't have any friends yet. Add friends in the Community tab.
                    </Text>
                  )}
                </View>
              )}

              {/* Additional Options */}
              <Text
                style={[styles.formSectionTitle, { color: themeStyles.textColor, marginTop: 16 }]}
              >
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
                    color={
                      newIntentionFavorite ? themeStyles.favoriteColor : themeStyles.borderColor
                    }
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
                      opacity: newIntentionTitle.trim() && !isSubmitting ? 1 : 0.7,
                    },
                  ]}
                  onPress={addNewIntention}
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
              transform: [{ translateY: modalSlideUp }],
            },
          ]}
        >
          <LinearGradient colors={readingTheme === "night" ? ["#3A2859", "#5A3D7A"] : readingTheme === "sepia" ? ["#7A503E", "#A46E58"] : ["#8952D0", "#AD7CEA"]} style={styles.intentionModalHeader}>
            <Text style={styles.intentionModalTitle}>Filters & Sorting</Text>
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
              <Text style={[styles.filterOptionText, { color: themeStyles.textColor }]}>All</Text>
              {intentionFilter === "all" && (
                <Feather name="check" size={20} color={themeStyles.accentColor} />
              )}
            </TouchableOpacity>

            {(
              [
                "prayer",
                "resolution",
                "goal",
                "spiritual",
                "family",
                "health",
                "work",
                "friends",
                "world",
                "personal",
                "other",
              ] as IntentionType[]
            ).map((type) => (
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

            <Text
              style={[styles.filterSectionTitle, { color: themeStyles.textColor, marginTop: 24 }]}
            >
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

  // Effect to fetch friends when modal opens with Certain Friends visibility
  useEffect(() => {
    if (showNewIntentionModal && newIntentionVisibility === "Certain Friends") {
      fetchUserFriends();
    }
  }, [showNewIntentionModal, newIntentionVisibility]);

  // Effect to fetch groups when modal opens with Certain Groups visibility
  useEffect(() => {
    if (showNewIntentionModal && newIntentionVisibility === "Certain Groups") {
      fetchUserGroups();
    }
  }, [showNewIntentionModal, newIntentionVisibility]);

  // Main render
  return (
    <View style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]}>
      <StatusBar barStyle={readingTheme === "night" ? "light-content" : "dark-content"} />

      <View style={styles.intentionsContainer}>
        {/* Header with intentions stats */}
        <LinearGradient
          colors={readingTheme === "night" ? ["#3A2859", "#5A3D7A"] : readingTheme === "sepia" ? ["#7A503E", "#A46E58"] : ["#8952D0", "#AD7CEA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.intentionsStatsContainer, { paddingTop: insets.top + 2 }]}
        >
          <View style={{ flex: 1, flexDirection: "row" }}>
            <View style={styles.intentionStat}>
              <Text style={[styles.intentionStatNumber, { color: "#FFF" }]}>
                {intentions.length}
              </Text>
              <Text style={[styles.intentionStatLabel, { color: "#FFF" }]}>Total</Text>
            </View>

            <View style={styles.intentionStat}>
              <Text style={[styles.intentionStatNumber, { color: "#FFF" }]}>
                {intentions.filter((i) => !i.completed).length}
              </Text>
              <Text style={[styles.intentionStatLabel, { color: "#FFF" }]}>Active</Text>
            </View>

            <View style={styles.intentionStat}>
              <Text style={[styles.intentionStatNumber, { color: "#FFF" }]}>
                {intentions.filter((i) => i.completed).length}
              </Text>
              <Text style={[styles.intentionStatLabel, { color: "#FFF" }]}>Completed</Text>
            </View>

            <View style={styles.intentionStat}>
              <Text style={[styles.intentionStatNumber, { color: "#FFF" }]}>
                {intentions.filter((i) => i.favorite).length}
              </Text>
              <Text style={[styles.intentionStatLabel, { color: "#FFF" }]}>Favorites</Text>
            </View>
          </View>

          {/* Theme and Filter buttons in header */}
          <View style={styles.headerButtonsContainer}>
            <TouchableOpacity
              style={[styles.intentionFilterButton, { marginRight: 10 }]}
              onPress={() => {
                const themes: Array<"paper" | "sepia" | "night"> = ["paper", "sepia", "night"];
                const currentIndex = themes.indexOf(currentTheme);
                const nextIndex = (currentIndex + 1) % themes.length;
                setCurrentTheme(themes[nextIndex]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Feather 
                name={currentTheme === "night" ? "moon" : currentTheme === "sepia" ? "book-open" : "sun"} 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.intentionFilterButton}
              onPress={openFilterModal}
              activeOpacity={0.7}
            >
              <Feather name="filter" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Intentions Tabs */}
        <View
          style={[
            styles.intentionsTabsContainer,
            { backgroundColor: themeStyles.tabBackgroundColor },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.intentionTab,
              intentionsTabView === "all" && [
                styles.activeIntentionTab,
                { backgroundColor: themeStyles.cardColor },
              ],
            ]}
            onPress={() => setIntentionsTabView("all")}
          >
            <Text
              style={[
                styles.intentionTabText,
                {
                  color: themeStyles.textColor,
                  opacity: intentionsTabView === "all" ? 1 : 0.6,
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
                { backgroundColor: themeStyles.cardColor },
              ],
            ]}
            onPress={() => setIntentionsTabView("active")}
          >
            <Text
              style={[
                styles.intentionTabText,
                {
                  color: themeStyles.textColor,
                  opacity: intentionsTabView === "active" ? 1 : 0.6,
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
                { backgroundColor: themeStyles.cardColor },
              ],
            ]}
            onPress={() => setIntentionsTabView("completed")}
          >
            <Text
              style={[
                styles.intentionTabText,
                {
                  color: themeStyles.textColor,
                  opacity: intentionsTabView === "completed" ? 1 : 0.6,
                },
              ]}
            >
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {intentionsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeStyles.accentColor} />
            <Text style={[styles.loadingText, { color: themeStyles.textColor }]}>
              Loading your prayer intentions...
            </Text>
          </View>
        ) : getDisplayIntentions().length === 0 ? (
          <View style={styles.emptyIntentionsContainer}>
            <Feather
              name="user"
              size={64}
              color={themeStyles.emptyStateIconColor}
              style={styles.emptyIntentionsIcon}
            />
            <Text style={[styles.emptyIntentionsText, { color: themeStyles.textColor }]}>
              No prayer intentions found
            </Text>
            <Text style={[styles.emptyIntentionsSubtext, { color: `${themeStyles.textColor}80` }]}>
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
                  backgroundColor: themeStyles.accentColor,
                },
              ]}
              onPress={openNewIntentionModal}
            >
              <Text style={styles.emptyIntentionsButtonText}>Create Prayer Intention</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={getDisplayIntentions()}
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
                    <Text style={[styles.intentionDate, { color: `${themeStyles.textColor}80` }]}>
                      {item.created_at.toLocaleDateString()}
                    </Text>

                    <Animated.View style={{ transform: [{ scale: intentionFavoriteScale }] }}>
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
                            item.favorite ? themeStyles.favoriteColor : `${themeStyles.textColor}60`
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
                        item.completed ? themeStyles.accentColor : `${themeStyles.textColor}40`
                      }
                    />
                  </TouchableOpacity>

                  <View style={styles.intentionTextContent}>
                    <Text
                      style={[
                        styles.intentionTitle,
                        {
                          color: themeStyles.textColor,
                          textDecorationLine: item.completed ? "line-through" : "none",
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
                              : item.visibility === "Certain Friends"
                                ? "users"
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
                    onPress={() => deleteIntentionHandler(item.id)}
                  >
                    <Feather name="trash-2" size={14} color={`${themeStyles.textColor}60`} />
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
          theme={
            readingTheme === "night" ? "dark" : readingTheme === "paper" ? "light" : readingTheme
          }
        />

        {/* Render Modals */}
        {renderNewIntentionModal()}
        {renderFilterModal()}
      </View>
    </View>
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
    favoriteColor: "#FF5A93", // Brighter pink
    tabBackgroundColor: "#F5F5F5",
    emptyStateIconColor: "rgba(0, 0, 0, 0.3)",
  },
  dark: {
    backgroundColor: "#121212",
    cardColor: "#1E1E1E",
    textColor: "#FFFFFF",
    borderColor: "#333333",
    headerColor: "#1A1A1A",
    shadowColor: "#000000",
    accentColor: "#B27AE8", // Brighter purple
    favoriteColor: "#FF7EB4", // Brighter pink
    tabBackgroundColor: "#1A1A1A",
    emptyStateIconColor: "rgba(255, 255, 255, 0.3)",
  },
  sepia: {
    backgroundColor: "#F8F0E3",
    cardColor: "#FFF8E9",
    textColor: "#442C2E",
    borderColor: "#E0D6C2",
    headerColor: "#F0E6D2",
    shadowColor: "#442C2E",
    accentColor: "#A66E52", // Brighter brown
    favoriteColor: "#D05959", // Brighter red
    tabBackgroundColor: "#F0E6D2",
    emptyStateIconColor: "rgba(68, 44, 46, 0.3)",
  },
};

// Default font sizes
const defaultFontSizes = {
  small: {
    title: 16,
    body: 14,
    caption: 12,
  },
  medium: {
    title: 18,
    body: 16,
    caption: 14,
  },
  large: {
    title: 20,
    body: 18,
    caption: 16,
  },
};

// Add Button Styles
const addButtonStyles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    bottom: 90,
    alignItems: "center",
    zIndex: 10,
  },
  labelContainer: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    overflow: "hidden",
  },
  iconContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  svgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  // Decorative elements inspired by prayer symbols
  circle1: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    top: 14,
    left: 14,
  },
  circle2: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    top: 6,
    left: 6,
  },
  droplet: {
    position: "absolute",
    width: 18,
    height: 25,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    transform: [{ rotate: "45deg" }],
    bottom: 10,
    right: 12,
  },
  dot1: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    top: 15,
    right: 20,
  },
  dot2: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    top: 8,
    right: 28,
  },
  dot3: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
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

  // Header buttons
  headerButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  intentionModalContainer: {
    width: "90%",
    maxWidth: 500,
    borderRadius: 20,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: Platform.OS === "ios" ? "80%" : "90%",
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
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "500",
  },
  emptyGroupsText: {
    textAlign: "center",
    marginVertical: 10,
    fontStyle: "italic",
  },
  friendSelectionContainer: {
    marginTop: 10,
  },
  friendGrid: {
    marginTop: 8,
  },
  friendOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  activeFriendOption: {
    borderWidth: 2,
  },
  friendIconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  friendText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyFriendsText: {
    textAlign: "center",
    marginVertical: 10,
    fontStyle: "italic",
  },
});

export default PrayerIntentions;
