import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  Image,
  Animated,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons, Ionicons, FontAwesome5, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import theme from "@/theme";
import { NotificationSettings } from "../../components/NotificationSettings";
import { useAuth } from "@/contexts/AuthContext";

// API Configuration
const AUTH_API_BASE = "https://auth-worker.colinmcherney.workers.dev";
const CRUD_API_BASE = "https://crud-worker.colinmcherney.workers.dev";
const STORAGE_API_BASE = "https://storage-worker.colinmcherney.workers.dev";

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  profile_image?: string;
  denomination?: string;
}

// Remove duplicate User interface since it's from AuthContext

// Define the denominations array with name, description, and icon
const denominations = [
  {
    id: "catholic",
    name: "Catholic",
    description: "Roman Catholic Church",
    icon: "sun",
  },
  {
    id: "protestant",
    name: "Protestant",
    description: "Various Protestant denominations",
    icon: "book-open",
  },
  {
    id: "orthodox",
    name: "Orthodox",
    description: "Eastern Orthodox Church",
    icon: "compass",
  },
  {
    id: "evangelical",
    name: "Evangelical",
    description: "Evangelical Christian churches",
    icon: "mic",
  },
  {
    id: "baptist",
    name: "Baptist",
    description: "Baptist churches and associations",
    icon: "droplet",
  },
  {
    id: "methodist",
    name: "Methodist",
    description: "Methodist denomination",
    icon: "heart",
  },
  {
    id: "lutheran",
    name: "Lutheran",
    description: "Lutheran denomination",
    icon: "bookmark",
  },
  {
    id: "presbyterian",
    name: "Presbyterian",
    description: "Presbyterian denomination",
    icon: "shield",
  },
  {
    id: "anglican",
    name: "Anglican/Episcopal",
    description: "Anglican Communion churches",
    icon: "flag",
  },
  {
    id: "pentecostal",
    name: "Pentecostal",
    description: "Pentecostal churches",
    icon: "wind",
  },
  {
    id: "nondenominational",
    name: "Non-denominational",
    description: "Non-denominational Christian",
    icon: "users",
  },
  {
    id: "other",
    name: "Other",
    description: "Other faith traditions",
    icon: "more-horizontal",
  },
];

// API Helper Functions
const apiCall = async (
  url: string,
  options: RequestInit = {},
  getAccessToken: () => Promise<string | null>,
) => {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Network error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Storage API upload function using base64 data
const uploadToStorageBase64 = async (
  base64Data: string,
  fileName: string,
  getAccessToken: () => Promise<string | null>,
) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    console.log("Base64 data size:", base64Data.length);

    // Upload via storage API with base64 data
    const uploadResponse = await fetch(`${STORAGE_API_BASE}/storage/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        operation: "UPLOAD",
        bucket: "profile-images",
        fileName: fileName,
        contentType: "image/jpeg",
        data: base64Data,
        encoding: "base64",
        options: {
          upsert: true,
          cacheControl: "max-age=31536000",
        },
      }),
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ error: "Network error" }));
      throw new Error(error.error || "Failed to upload via storage API");
    }

    const uploadData = await uploadResponse.json();
    console.log("Storage API response:", uploadData);

    if (!uploadData.success) {
      throw new Error("Upload failed: " + (uploadData.error || "Unknown error"));
    }

    // With the updated storage worker, we should get a direct public URL
    return uploadData.publicUrl || uploadData.signedUrl || uploadData.url;

  } catch (error) {
    console.error("Storage upload error:", error);
    throw error;
  }
};


// Remove these functions since we're using AuthContext

export default function MeScreen() {
  const { user, session, signOut, getAccessToken } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    profile_image: "",
    denomination: "",
  });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [denominationModalVisible, setDenominationModalVisible] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Remove this function since we're using AuthContext

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchUserProfile();
      } else if (!user && !loading) {
        router.push("/(auth)/auth");
      }
      return () => {};
    }, [user]),
  );

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError("");

      if (!user?.id) {
        router.push("/(auth)/auth");
        return;
      }

      const response = await apiCall(
        CRUD_API_BASE,
        {
          method: "POST",
          body: JSON.stringify({
            operation: "SELECT",
            table: "users",
            where: { id: user.id },
          }),
        },
        getAccessToken,
      );

      if (response.success && response.data.length > 0) {
        const data = response.data[0];
        setUserProfile(data);
        setEditForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          profile_image: data.profile_image || "",
          denomination: data.denomination || "",
        });

        // Set profile image URL directly from database
        setProfileImageUrl(data.profile_image);
      } else {
        setError("Profile not found");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Something went wrong");
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "You need to grant access to your photos to upload a profile image.",
        );
        return;
      }

      // Launch image picker with reasonable quality for profile images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Good quality for profile images
        base64: true, // Get base64 directly from picker
        exif: false, // Don't include EXIF data to reduce size
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageAsset = result.assets[0];
        const base64Data = imageAsset.base64;

        if (!base64Data) {
          Alert.alert("Error", "Failed to process image");
          return;
        }

        try {
          // Start loading
          setIsUploading(true);

          // Generate unique filename
          const timestamp = Date.now();
          const userId = user?.id || "anonymous";
          const fileName = `profile_${userId}_${timestamp}.jpg`;

          // Upload using base64 data directly with improved storage worker
          const uploadedImageUrl = await uploadToStorageBase64(base64Data, fileName, getAccessToken);

          // Update form with the URL (for saving to database)
          setEditForm((prev) => ({
            ...prev,
            profile_image: uploadedImageUrl,
          }));

          // Update profile image URL for immediate display
          setProfileImageUrl(uploadedImageUrl);

          // Enable editing mode if not already in it
          if (!isEditing) {
            setIsEditing(true);
          }

          // Stop loading and show success
          setIsUploading(false);
          setShowSuccessModal(true);

          // Haptic feedback for success
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (uploadError) {
          setIsUploading(false);
          console.error("Upload error:", uploadError);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Upload Failed", "Failed to upload image. Please try again.", [
            { text: "OK" },
          ]);
        }
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const handleSubmit = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!user?.id) return;

      const response = await apiCall(
        CRUD_API_BASE,
        {
          method: "POST",
          body: JSON.stringify({
            operation: "UPDATE",
            table: "users",
            where: { id: user.id },
            data: {
              first_name: editForm.first_name,
              last_name: editForm.last_name,
              profile_image: editForm.profile_image,
              denomination: editForm.denomination,
              updated_at: new Date().toISOString(),
            },
          }),
        },
        getAccessToken,
      );

      if (response.success && response.data.length > 0) {
        const data = response.data[0];
        setUserProfile(data);
        setEditForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          profile_image: data.profile_image || "",
          denomination: data.denomination || "",
        });

        // Update profile image URL directly from database
        setProfileImageUrl(data.profile_image);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setIsEditing(false);
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (err instanceof Error) {
        Alert.alert("Error", err.message || "Failed to update profile");
      } else {
        Alert.alert("Error", "Failed to update profile");
      }
    }
  };

  const handleShowDeleteConfirmModal = () => {
    setDeleteModalVisible(false);
    setDeleteConfirmText("");
    setDeleteConfirmModalVisible(true);
  };

  const handleDeleteAccount = async () => {
    try {
      if (deleteConfirmText.toLowerCase() !== "delete my account") {
        Alert.alert("Confirmation Failed", "Please type 'delete my account' exactly to confirm.");
        return;
      }

      setDeleteConfirmModalVisible(false);
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!user?.id) return;

      const userId = user.id;

      // Delete data from all tables that might contain user data
      // Using a common pattern where user_id links to the user
      const tables = [
        "comments",
        "culture_posts",
        "faith_posts",
        "intentions",
        "lent_tasks",
        "likes",
        "news_posts",
        "pending_posts",
        "womens_ministry_posts",
        "admin",
      ];

      // Process all deletions
      for (const table of tables) {
        try {
          await apiCall(
            CRUD_API_BASE,
            {
              method: "POST",
              body: JSON.stringify({
                operation: "DELETE",
                table: table,
                where: { user_id: userId },
              }),
            },
            getAccessToken,
          );
        } catch (error) {
          console.error(`Error deleting from ${table}:`, error);
          // Continue with other tables
        }
      }

      // Handle friends table which has user_id_1 and user_id_2
      try {
        await apiCall(
          CRUD_API_BASE,
          {
            method: "POST",
            body: JSON.stringify({
              operation: "DELETE",
              table: "friends",
              where: { user_id_1: userId },
            }),
          },
          getAccessToken,
        );
      } catch (error) {
        console.error("Error deleting friends (user_id_1):", error);
      }

      try {
        await apiCall(
          CRUD_API_BASE,
          {
            method: "POST",
            body: JSON.stringify({
              operation: "DELETE",
              table: "friends",
              where: { user_id_2: userId },
            }),
          },
          getAccessToken,
        );
      } catch (error) {
        console.error("Error deleting friends (user_id_2):", error);
      }

      // Delete the user record last
      try {
        await apiCall(
          CRUD_API_BASE,
          {
            method: "POST",
            body: JSON.stringify({
              operation: "DELETE",
              table: "users",
              where: { id: userId },
            }),
          },
          getAccessToken,
        );
      } catch (error) {
        console.error("Error deleting user:", error);
      }

      // Use AuthContext signOut method
      await signOut();

      // If we made it here, successfully deleted account data
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Redirect to auth page
      router.push("/(auth)/auth");
    } catch (err: unknown) {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (err instanceof Error) {
        Alert.alert("Error", err.message || "Failed to delete account");
      } else {
        Alert.alert("Error", "Failed to delete account");
      }
    }
  };

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signOut();
      router.push("/(auth)/auth");
    } catch (err: unknown) {
      if (err instanceof Error) {
        Alert.alert("Logout Error", err.message || "Failed to log out");
      } else {
        Alert.alert("Logout Error", "Failed to log out");
      }
    }
  };

  const getInitials = () => {
    if (!userProfile) return "";
    const first = userProfile.first_name?.[0] || "";
    const last = userProfile.last_name?.[0] || "";
    return (first + last).toUpperCase() || userProfile.email[0].toUpperCase();
  };

  // Card decorations (subtle visual elements)
  const CardDecoration = () => (
    <View style={styles.cardDecoration}>
      <View style={[styles.decorationDot, styles.decorationDot1]} />
      <View style={[styles.decorationDot, styles.decorationDot2]} />
      <View style={[styles.decorationDot, styles.decorationDot3]} />
    </View>
  );

  // Add a getSelectedDenominationName helper function before the render
  const getSelectedDenominationName = () => {
    if (!editForm.denomination) return "";
    const selected = denominations.find((d) => d.id === editForm.denomination);
    return selected ? selected.name : editForm.denomination;
  };

  const toggleNotificationSettings = () => {
    setShowNotificationSettings(!showNotificationSettings);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="light" />
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF006E" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="light" />
        <View style={styles.warningBox}>
          <Ionicons name="information" size={40} color="#4361EE" />
          <Text style={styles.warningTitle}>No Profile Found</Text>
          <Text style={styles.warningText}>We couldn't find your user profile.</Text>
          <TouchableOpacity style={styles.warningButton} onPress={() => router.back()}>
            <Text style={styles.warningButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Floating header */}
      <Animated.View
        style={[
          styles.headerBackground,
          {
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerOpacity,
          },
        ]}
      >
        <BlurView intensity={85} tint="light" style={styles.blurView} />
        <Animated.View
          style={[
            styles.floatingTitleContainer,
            {
              opacity: headerOpacity,
              transform: [
                {
                  translateY: headerOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.titleWrapper}>
            <LinearGradient
              colors={theme.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.titleAccent}
            />
            <Text style={styles.floatingTitle}>My Profile</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {/* Header with edit button */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerLeft}>{/* Removed back button as requested */}</View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsEditing(!isEditing);
            }}
          >
            <LinearGradient
              colors={theme.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.editGradient}
            >
              <MaterialCommunityIcons
                name={isEditing ? "close" : "pencil-outline"}
                size={22}
                color="#FFFFFF"
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Profile Header with Avatar */}
        <Animated.View
          style={[
            styles.profileHeader,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.avatarContainer}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={theme.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </LinearGradient>
            )}
          </View>
          <Text style={styles.profileName}>
            {userProfile.first_name
              ? `${userProfile.first_name} ${userProfile.last_name || ""}`
              : "My Profile"}
          </Text>
          <Text style={styles.profileEmail}>{userProfile.email}</Text>
        </Animated.View>

        {isEditing ? (
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[
                `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(
                  theme.primary.substring(3, 5),
                  16,
                )}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.05)`,
                `rgba(${parseInt(theme.secondary.substring(1, 3), 16)}, ${parseInt(
                  theme.secondary.substring(3, 5),
                  16,
                )}, ${parseInt(theme.secondary.substring(5, 7), 16)}, 0.1)`,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <CardDecoration />

              {/* Edit Form */}
              <View style={styles.formContainer}>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  <LinearGradient
                    colors={theme.gradientPrimary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.imagePickerGradient}
                  >
                    <FontAwesome5 name="camera" size={16} color="#FFFFFF" />
                    <Text style={styles.imagePickerText}>
                      {editForm.profile_image ? "Change Profile Photo" : "Add Profile Photo"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <FontAwesome5 name="user-edit" size={16} color={theme.primary} />
                    <Text style={styles.sectionTitle}>Edit Profile</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.first_name}
                      onChangeText={(text) => setEditForm({ ...editForm, first_name: text })}
                      placeholderTextColor="#94A3B8"
                      placeholder="Enter your first name"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.last_name}
                      onChangeText={(text) => setEditForm({ ...editForm, last_name: text })}
                      placeholderTextColor="#94A3B8"
                      placeholder="Enter your last name"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Denomination</Text>
                    <TouchableOpacity
                      style={styles.denominationSelector}
                      onPress={() => setDenominationModalVisible(true)}
                    >
                      <Text style={styles.denominationText}>
                        {getSelectedDenominationName() || "Select your denomination"}
                      </Text>
                      <Feather name="chevron-down" size={18} color={theme.textMedium} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.actionsContainer}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleSubmit}>
                    <LinearGradient
                      colors={theme.gradientPrimary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionGradient}
                    >
                      <MaterialCommunityIcons
                        name="content-save-outline"
                        size={18}
                        color="#FFFFFF"
                        style={styles.actionIcon}
                      />
                      <Text style={styles.actionText}>Save Changes</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setDeleteModalVisible(true);
                  }}
                >
                  <LinearGradient
                    colors={[theme.error, theme.error]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.deleteGradient}
                  >
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={18}
                      color="#FFFFFF"
                      style={styles.deleteIcon}
                    />
                    <Text style={styles.deleteText}>Delete Account</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[
                `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(
                  theme.primary.substring(3, 5),
                  16,
                )}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.05)`,
                `rgba(${parseInt(theme.secondary.substring(1, 3), 16)}, ${parseInt(
                  theme.secondary.substring(3, 5),
                  16,
                )}, ${parseInt(theme.secondary.substring(5, 7), 16)}, 0.1)`,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <CardDecoration />

              {/* Account Details Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="user-circle" size={16} color={theme.primary} />
                  <Text style={styles.sectionTitle}>Account Details</Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <FontAwesome5 name="id-card" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>ID</Text>
                    <Text style={styles.detailValue}>{userProfile.id}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <FontAwesome5 name="user" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>First Name</Text>
                    <Text style={styles.detailValue}>{userProfile.first_name || "Not set"}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <FontAwesome5 name="user" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Last Name</Text>
                    <Text style={styles.detailValue}>{userProfile.last_name || "Not set"}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <FontAwesome5 name="church" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Denomination</Text>
                    <Text style={styles.detailValue}>{userProfile.denomination || "Not set"}</Text>
                  </View>
                </View>
              </View>

              {/* Contact Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="envelope" size={16} color={theme.primary} />
                  <Text style={styles.sectionTitle}>Contact</Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <FontAwesome5 name="envelope" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{userProfile.email}</Text>
                  </View>
                </View>
              </View>

              {/* Timeline Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="clock" size={16} color={theme.primary} />
                  <Text style={styles.sectionTitle}>Timeline</Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <FontAwesome5 name="calendar-plus" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>
                      {userProfile.created_at
                        ? new Date(userProfile.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconContainer}>
                    <FontAwesome5 name="calendar-check" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Last Updated</Text>
                    <Text style={styles.detailValue}>
                      {userProfile.updated_at
                        ? new Date(userProfile.updated_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "N/A"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Settings Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <TouchableOpacity style={styles.settingItem} onPress={toggleNotificationSettings}>
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color={theme.primary}
                    style={styles.settingIcon}
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Notification Settings</Text>
                    <Text style={styles.settingDescription}>
                      Manage your notification preferences
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={theme.gradientInfo}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>Log Out</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>

      {/* First Delete Account Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete your account? This action cannot be undone and all
              your data will be permanently removed.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDeleteModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleShowDeleteConfirmModal}
              >
                <Text style={styles.modalConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Second Delete Account Confirmation Modal with text input */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteConfirmModalVisible}
        onRequestClose={() => setDeleteConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Final Confirmation</Text>
            <Text style={styles.modalMessage}>
              To confirm deletion, please type "delete my account" below.
            </Text>
            <TextInput
              style={styles.deleteConfirmInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type 'delete my account'"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDeleteConfirmModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleDeleteAccount}>
                <Text style={styles.modalConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Denomination Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={denominationModalVisible}
        onRequestClose={() => setDenominationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.denominationModalContent}>
            <View style={styles.denominationModalHeader}>
              <Text style={styles.denominationModalTitle}>Select Denomination</Text>
              <TouchableOpacity
                onPress={() => setDenominationModalVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={theme.textWhite} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.denominationList}>
              {denominations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.denominationItem,
                    editForm.denomination === item.id && styles.selectedDenominationItem,
                  ]}
                  onPress={() => {
                    setEditForm({ ...editForm, denomination: item.id });
                    setDenominationModalVisible(false);
                  }}
                >
                  <View style={styles.denominationIconContainer}>
                    <Feather
                      name={item.icon as any}
                      size={20}
                      color={editForm.denomination === item.id ? theme.textWhite : theme.primary}
                    />
                  </View>
                  <View style={styles.denominationTextContainer}>
                    <Text
                      style={[
                        styles.denominationItemName,
                        editForm.denomination === item.id && styles.selectedDenominationText,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.denominationItemDescription,
                        editForm.denomination === item.id && styles.selectedDenominationText,
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>
                  {editForm.denomination === item.id && (
                    <Feather
                      name="check"
                      size={20}
                      color={theme.textWhite}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <Modal
          visible={showNotificationSettings}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={toggleNotificationSettings}
        >
          <NotificationSettings onClose={toggleNotificationSettings} />
        </Modal>
      )}

      {/* Upload Loading Overlay */}
      {isUploading && (
        <Modal
          visible={isUploading}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.uploadOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.uploadBlur}>
              <View style={styles.uploadContent}>
                <LinearGradient
                  colors={theme.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.uploadGradient}
                >
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.uploadText}>Uploading Image...</Text>
                  <Text style={styles.uploadSubtext}>Please wait while we process your photo</Text>
                </LinearGradient>
              </View>
            </BlurView>
          </View>
        </Modal>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <LinearGradient
              colors={['#4CAF50', '#45A049']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successHeader}
            >
              <Ionicons name="checkmark-circle" size={60} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.successBody}>
              <Text style={styles.successTitle}>Upload Successful!</Text>
              <Text style={styles.successMessage}>
                Your profile image has been uploaded successfully. Don't forget to click 'Save Changes' to update your profile.
              </Text>
              <TouchableOpacity 
                style={styles.successButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSuccessModal(false);
                }}
              >
                <LinearGradient
                  colors={theme.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.successButtonGradient}
                >
                  <Text style={styles.successButtonText}>Got it!</Text>
                </LinearGradient>
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
    backgroundColor: theme.pageBg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacingXL,
    paddingTop:
      Platform.OS === "ios" ? theme.spacingXL : RNStatusBar.currentHeight || theme.spacingXL,
    paddingBottom: theme.spacing3XL,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 100 : 80,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingTitleContainer: {
    position: "absolute",
    width: "100%",
    paddingHorizontal: theme.spacingXL,
    top: Platform.OS === "ios" ? 55 : 30,
    height: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
  },
  titleAccent: {
    width: 4,
    height: 20,
    borderRadius: theme.radiusSmall / 2,
    marginRight: theme.spacingM,
  },
  floatingTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacingXL,
    marginTop: theme.spacingXL,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    backgroundColor: `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(
      theme.primary.substring(3, 5),
      16,
    )}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.1)`,
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    zIndex: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: theme.radiusFull,
    overflow: "hidden",
  },
  editGradient: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: theme.spacingXL,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.radiusFull,
    marginBottom: theme.spacingL,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: theme.radiusFull,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  profileName: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingXS,
  },
  profileEmail: {
    fontSize: 16,
    color: theme.textLight,
  },
  card: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    marginBottom: theme.spacingXL,
    shadowColor: theme.textLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    borderRadius: theme.radiusLarge,
    padding: theme.spacingXL,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  cardDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 60,
    height: 60,
  },
  decorationDot: {
    position: "absolute",
    borderRadius: theme.radiusFull,
  },
  decorationDot1: {
    width: 12,
    height: 12,
    backgroundColor: `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(
      theme.primary.substring(3, 5),
      16,
    )}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.2)`,
    top: 15,
    right: 15,
  },
  decorationDot2: {
    width: 8,
    height: 8,
    backgroundColor: `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(
      theme.primary.substring(3, 5),
      16,
    )}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.15)`,
    top: 30,
    right: 22,
  },
  decorationDot3: {
    width: 6,
    height: 6,
    backgroundColor: `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(
      theme.primary.substring(3, 5),
      16,
    )}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.1)`,
    top: 24,
    right: 35,
  },
  formContainer: {
    gap: theme.spacingL,
  },
  imagePickerButton: {
    marginBottom: theme.spacingL,
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imagePickerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL,
  },
  imagePickerText: {
    color: theme.textWhite,
    marginLeft: theme.spacingS,
    fontWeight: theme.fontSemiBold,
    fontSize: 15,
  },
  sectionContainer: {
    marginBottom: theme.spacingXL,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingL,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginLeft: theme.spacingS,
  },
  inputGroup: {
    marginBottom: theme.spacingL,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: theme.spacingS,
    color: theme.textLight,
    fontWeight: theme.fontMedium,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    color: theme.textWhite,
    fontSize: 16,
  },
  actionsContainer: {
    marginBottom: theme.spacingL,
  },
  actionButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingL,
  },
  actionIcon: {
    marginRight: theme.spacingS,
  },
  actionText: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    fontSize: 16,
  },
  deleteButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    shadowColor: theme.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  deleteGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingL,
  },
  deleteIcon: {
    marginRight: theme.spacingS,
  },
  deleteText: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    fontSize: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.radiusMedium,
    padding: theme.spacingL,
    marginBottom: theme.spacingS,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingL,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: theme.textWhite,
    fontWeight: theme.fontMedium,
  },
  logoutButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    marginTop: theme.spacingS,
    marginBottom: theme.spacingXL,
    shadowColor: theme.accent2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    alignSelf: "center",
    width: "80%",
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingL,
  },
  logoutText: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    fontSize: 16,
    marginLeft: theme.spacingS,
  },
  bottomSpacing: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.pageBg,
    padding: theme.spacingXL,
  },
  errorBox: {
    width: "100%",
    alignItems: "center",
    backgroundColor: `rgba(${parseInt(theme.error.substring(1, 3), 16)}, ${parseInt(
      theme.error.substring(3, 5),
      16,
    )}, ${parseInt(theme.error.substring(5, 7), 16)}, 0.05)`,
    borderWidth: 1,
    borderColor: `rgba(${parseInt(theme.error.substring(1, 3), 16)}, ${parseInt(
      theme.error.substring(3, 5),
      16,
    )}, ${parseInt(theme.error.substring(5, 7), 16)}, 0.1)`,
    borderRadius: theme.radiusLarge,
    padding: theme.spacingXL,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: theme.spacingM,
    marginBottom: theme.spacingS,
  },
  errorText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
    marginBottom: theme.spacingXL,
  },
  errorButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacingXL,
    paddingVertical: theme.spacingM,
    borderRadius: theme.radiusMedium,
  },
  errorButtonText: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  warningBox: {
    width: "100%",
    alignItems: "center",
    backgroundColor: `rgba(${parseInt(theme.accent1.substring(1, 3), 16)}, ${parseInt(
      theme.accent1.substring(3, 5),
      16,
    )}, ${parseInt(theme.accent1.substring(5, 7), 16)}, 0.05)`,
    borderWidth: 1,
    borderColor: `rgba(${parseInt(theme.accent1.substring(1, 3), 16)}, ${parseInt(
      theme.accent1.substring(3, 5),
      16,
    )}, ${parseInt(theme.accent1.substring(5, 7), 16)}, 0.1)`,
    borderRadius: theme.radiusLarge,
    padding: theme.spacingXL,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: theme.spacingM,
    marginBottom: theme.spacingS,
  },
  warningText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
    marginBottom: theme.spacingXL,
  },
  warningButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacingXL,
    paddingVertical: theme.spacingM,
    borderRadius: theme.radiusMedium,
  },
  warningButtonText: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacingXL,
  },
  modalContent: {
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusLarge,
    padding: theme.spacingXL,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.error,
    marginBottom: theme.spacingL,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: theme.textLight,
    marginBottom: theme.spacingXL,
    textAlign: "center",
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: theme.radiusMedium,
    paddingVertical: theme.spacingM,
    marginRight: theme.spacingS,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: theme.error,
    borderRadius: theme.radiusMedium,
    paddingVertical: theme.spacingM,
    marginLeft: theme.spacingS,
    alignItems: "center",
  },
  modalConfirmButtonText: {
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
    fontSize: 16,
  },
  deleteConfirmInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    color: theme.textWhite,
    fontSize: 16,
    marginBottom: theme.spacingXL,
  },
  denominationSelector: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  denominationText: {
    color: theme.textWhite,
    fontSize: 16,
  },
  denominationModalContent: {
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusLarge,
    padding: 0,
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    overflow: "hidden",
  },
  denominationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacingL,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  denominationModalTitle: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  denominationList: {
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
    maxHeight: 500,
  },
  denominationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    marginBottom: theme.spacingS,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  selectedDenominationItem: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  denominationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusFull,
    backgroundColor: `rgba(${parseInt(theme.primary.substring(1, 3), 16)}, ${parseInt(
      theme.primary.substring(3, 5),
      16,
    )}, ${parseInt(theme.primary.substring(5, 7), 16)}, 0.1)`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacingM,
  },
  denominationTextContainer: {
    flex: 1,
  },
  denominationItemName: {
    fontSize: 15,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: 2,
  },
  denominationItemDescription: {
    fontSize: 13,
    color: theme.textLight,
  },
  selectedDenominationText: {
    color: theme.textWhite,
  },
  checkIcon: {
    marginLeft: theme.spacingS,
  },
  settingsSection: {
    marginBottom: theme.spacingXL,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.radiusMedium,
    padding: theme.spacingM,
    marginBottom: theme.spacingS,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  settingIcon: {
    marginRight: theme.spacingM,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.textLight,
  },
  
  // Upload Loading Styles
  uploadOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadBlur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadContent: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  uploadGradient: {
    paddingVertical: theme.spacing3XL,
    paddingHorizontal: theme.spacingXL * 2,
    alignItems: "center",
    minWidth: 280,
  },
  uploadText: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: "#FFFFFF",
    marginTop: theme.spacingL,
    textAlign: "center",
  },
  uploadSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: theme.spacingS,
    textAlign: "center",
  },

  // Success Modal Styles
  successOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacingXL,
  },
  successContent: {
    backgroundColor: theme.neutral800,
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  successHeader: {
    paddingVertical: theme.spacingXL,
    alignItems: "center",
  },
  successBody: {
    padding: theme.spacingXL,
    alignItems: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingM,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: theme.spacingXL,
  },
  successButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  successButtonGradient: {
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingXL * 1.5,
    alignItems: "center",
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: "#FFFFFF",
  },
});
