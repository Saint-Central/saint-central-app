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
  ImageBackground,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons, Ionicons, FontAwesome5, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import LottieView from "lottie-react-native";
import theme from "@/theme";
import { NotificationSettings } from "../../components/NotificationSettings";
import { useAuth } from "@/contexts/AuthContext";

// API Configuration
const AUTH_API_BASE = "https://auth-worker.colinmcherney.workers.dev";
const CRUD_API_BASE = "https://crud-worker.colinmcherney.workers.dev";
const STORAGE_API_BASE = "https://storage-worker.colinmcherney.workers.dev";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const profileScale = useRef(new Animated.Value(0.8)).current;

  const profileImageScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.3, 1, 0.8],
    extrapolate: "clamp",
  });

  useEffect(() => {
    // Animate content fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(profileScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
          const uploadedImageUrl = await uploadToStorageBase64(
            base64Data,
            fileName,
            getAccessToken,
          );

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
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <LinearGradient
          colors={[theme.neutral900, theme.neutral800]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContent}>
          <LottieView
            source={require("@/assets/lottie/loading.json")}
            autoPlay
            loop
            style={styles.loadingAnimation}
          />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="light" />
        <LinearGradient
          colors={[theme.neutral900, theme.neutral800]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={50} color={theme.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <LinearGradient colors={theme.gradientDanger} style={styles.errorButtonGradient}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="light" />
        <LinearGradient
          colors={[theme.neutral900, theme.neutral800]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={50} color={theme.info} />
          <Text style={styles.warningTitle}>No Profile Found</Text>
          <Text style={styles.warningText}>We couldn't find your user profile.</Text>
          <TouchableOpacity style={styles.warningButton} onPress={() => router.back()}>
            <LinearGradient colors={theme.gradientInfo} style={styles.warningButtonGradient}>
              <Text style={styles.warningButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Image */}
      <ImageBackground
        source={require("@/assets/images/rainforest2.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(28, 25, 23, 0.5)", "rgba(28, 25, 23, 0.75)", "rgba(28, 25, 23, 0.9)"]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <SafeAreaView edges={["top"]}>
          {/* Profile Header */}
          <Animated.View
            style={[
              styles.profileSection,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsEditing(!isEditing);
              }}
            >
              <BlurView intensity={80} tint="dark" style={styles.editButtonBlur}>
                <LinearGradient
                  colors={isEditing ? theme.gradientDanger : theme.gradientPrimary}
                  style={styles.editButtonGradient}
                >
                  <MaterialCommunityIcons
                    name={isEditing ? "close" : "pencil-outline"}
                    size={20}
                    color={theme.textWhite}
                  />
                </LinearGradient>
              </BlurView>
            </TouchableOpacity>

            {/* Avatar */}
            <Animated.View
              style={[
                styles.avatarContainer,
                {
                  transform: [{ scale: profileScale }, { scale: profileImageScale }],
                },
              ]}
            >
              <View style={styles.avatarGlow} />
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={theme.gradientWarm}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </LinearGradient>
              )}
              {isEditing && (
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <BlurView intensity={90} tint="dark" style={styles.cameraButtonBlur}>
                    <FontAwesome5 name="camera" size={16} color={theme.textWhite} />
                  </BlurView>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Name and Email */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {userProfile.first_name
                  ? `${userProfile.first_name} ${userProfile.last_name || ""}`
                  : "Welcome"}
              </Text>
              <Text style={styles.profileEmail}>{userProfile.email}</Text>
              {userProfile.denomination && (
                <View style={styles.denominationBadge}>
                  <LinearGradient
                    colors={theme.gradientPrimary}
                    style={styles.denominationBadgeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <FontAwesome5 name="church" size={12} color={theme.textWhite} />
                    <Text style={styles.denominationBadgeText}>
                      {denominations.find((d) => d.id === userProfile.denomination)?.name ||
                        userProfile.denomination}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Content Cards */}
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {isEditing ? (
              /* Edit Form */
              <View style={styles.editFormContainer}>
                <View style={styles.formHeader}>
                  <LinearGradient colors={theme.gradientPrimary} style={styles.formHeaderAccent} />
                  <Text style={styles.formHeaderText}>Edit Profile</Text>
                </View>

                <View style={styles.formFields}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={editForm.first_name}
                        onChangeText={(text) => setEditForm({ ...editForm, first_name: text })}
                        placeholderTextColor={theme.textLight}
                        placeholder="Your first name"
                      />
                      <View style={styles.inputIcon}>
                        <FontAwesome5 name="user" size={14} color={theme.primary} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={editForm.last_name}
                        onChangeText={(text) => setEditForm({ ...editForm, last_name: text })}
                        placeholderTextColor={theme.textLight}
                        placeholder="Your last name"
                      />
                      <View style={styles.inputIcon}>
                        <FontAwesome5 name="user" size={14} color={theme.primary} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Denomination</Text>
                    <TouchableOpacity
                      style={styles.inputWrapper}
                      onPress={() => setDenominationModalVisible(true)}
                    >
                      <View style={styles.denominationSelector}>
                        <Text
                          style={[
                            styles.denominationText,
                            !editForm.denomination && styles.placeholderText,
                          ]}
                        >
                          {getSelectedDenominationName() || "Select your denomination"}
                        </Text>
                        <Feather name="chevron-down" size={18} color={theme.primary} />
                      </View>
                      <View style={styles.inputIcon}>
                        <FontAwesome5 name="church" size={14} color={theme.primary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={theme.gradientPrimary}
                    style={styles.saveButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons name="content-save" size={20} color={theme.textWhite} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteAccountButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setDeleteModalVisible(true);
                  }}
                >
                  <View style={styles.deleteAccountContent}>
                    <MaterialCommunityIcons name="delete-forever" size={18} color={theme.error} />
                    <Text style={styles.deleteAccountText}>Delete Account</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              /* Profile Details */
              <>
                <View style={styles.detailsSection}>
                  <View style={styles.sectionHeader}>
                    <LinearGradient
                      colors={theme.gradientPrimary}
                      style={styles.sectionHeaderAccent}
                    />
                    <FontAwesome5 name="info-circle" size={16} color={theme.primary} />
                    <Text style={styles.sectionHeaderText}>Profile Details</Text>
                  </View>

                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconWrapper}>
                        <LinearGradient
                          colors={theme.gradientPrimary}
                          style={styles.detailIconGradient}
                        >
                          <FontAwesome5 name="fingerprint" size={12} color={theme.textWhite} />
                        </LinearGradient>
                      </View>
                      <View style={styles.detailTextWrapper}>
                        <Text style={styles.detailLabel}>Unique ID</Text>
                        <Text style={styles.detailValue}>{userProfile.id.slice(0, 8)}...</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.detailIconWrapper}>
                        <LinearGradient
                          colors={theme.gradientSuccess}
                          style={styles.detailIconGradient}
                        >
                          <FontAwesome5 name="calendar-plus" size={12} color={theme.textWhite} />
                        </LinearGradient>
                      </View>
                      <View style={styles.detailTextWrapper}>
                        <Text style={styles.detailLabel}>Joined</Text>
                        <Text style={styles.detailValue}>
                          {userProfile.created_at
                            ? new Date(userProfile.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "Recently"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.detailIconWrapper}>
                        <LinearGradient
                          colors={theme.gradientInfo}
                          style={styles.detailIconGradient}
                        >
                          <FontAwesome5 name="sync" size={12} color={theme.textWhite} />
                        </LinearGradient>
                      </View>
                      <View style={styles.detailTextWrapper}>
                        <Text style={styles.detailLabel}>Last Updated</Text>
                        <Text style={styles.detailValue}>
                          {userProfile.updated_at
                            ? new Date(userProfile.updated_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "Today"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionDivider} />

                {/* Settings Section */}
                <View style={styles.settingsSection}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={toggleNotificationSettings}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingLeft}>
                      <View style={styles.settingIconWrapper}>
                        <LinearGradient
                          colors={theme.gradientPrimary}
                          style={styles.settingIconGradient}
                        >
                          <Ionicons name="notifications" size={18} color={theme.textWhite} />
                        </LinearGradient>
                      </View>
                      <View style={styles.settingTextWrapper}>
                        <Text style={styles.settingTitle}>Notifications</Text>
                        <Text style={styles.settingSubtitle}>
                          Manage your notification preferences
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme.gradientWarm}
                style={styles.logoutGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="log-out" size={22} color={theme.textWhite} />
                <Text style={styles.logoutText}>Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </Animated.ScrollView>

      {/* Modals */}
      {/* Delete Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Animated.View style={styles.modalContent}>
            <LinearGradient
              colors={[theme.neutral800, theme.neutral700]}
              style={styles.modalGradient}
            >
              <View style={styles.modalIconWrapper}>
                <LinearGradient colors={theme.gradientDanger} style={styles.modalIconGradient}>
                  <Ionicons name="warning" size={40} color={theme.textWhite} />
                </LinearGradient>
              </View>
              <Text style={styles.modalTitle}>Delete Account?</Text>
              <Text style={styles.modalMessage}>
                This action cannot be undone. All your data will be permanently removed from our
                platform.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDeleteModalVisible(false);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDeleteButton}
                  onPress={handleShowDeleteConfirmModal}
                >
                  <LinearGradient colors={theme.gradientDanger} style={styles.modalDeleteGradient}>
                    <Text style={styles.modalDeleteText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteConfirmModalVisible}
        onRequestClose={() => setDeleteConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Animated.View style={styles.modalContent}>
            <LinearGradient
              colors={[theme.neutral800, theme.neutral700]}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>Final Confirmation</Text>
              <Text style={styles.modalMessage}>
                To confirm deletion, please type "delete my account" below.
              </Text>
              <TextInput
                style={styles.deleteConfirmInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="Type 'delete my account'"
                placeholderTextColor={theme.textLight}
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
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalDeleteButton} onPress={handleDeleteAccount}>
                  <LinearGradient colors={theme.gradientDanger} style={styles.modalDeleteGradient}>
                    <Text style={styles.modalDeleteText}>Delete Forever</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Denomination Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={denominationModalVisible}
        onRequestClose={() => setDenominationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Animated.View style={styles.denominationModal}>
            <LinearGradient
              colors={[theme.neutral800, theme.neutral700]}
              style={styles.denominationModalGradient}
            >
              <View style={styles.denominationHeader}>
                <Text style={styles.denominationTitle}>Select Denomination</Text>
                <TouchableOpacity
                  onPress={() => setDenominationModalVisible(false)}
                  style={styles.denominationClose}
                >
                  <BlurView intensity={80} tint="dark" style={styles.denominationCloseBlur}>
                    <Feather name="x" size={20} color={theme.textWhite} />
                  </BlurView>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.denominationList} showsVerticalScrollIndicator={false}>
                {denominations.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.denominationItem,
                      editForm.denomination === item.id && styles.denominationItemSelected,
                    ]}
                    onPress={() => {
                      setEditForm({ ...editForm, denomination: item.id });
                      setDenominationModalVisible(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={styles.denominationItemLeft}>
                      <View
                        style={[
                          styles.denominationIcon,
                          editForm.denomination === item.id && styles.denominationIconSelected,
                        ]}
                      >
                        <Feather
                          name={item.icon as any}
                          size={20}
                          color={
                            editForm.denomination === item.id ? theme.textWhite : theme.primary
                          }
                        />
                      </View>
                      <View style={styles.denominationInfo}>
                        <Text
                          style={[
                            styles.denominationName,
                            editForm.denomination === item.id && styles.denominationNameSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.denominationDescription,
                            editForm.denomination === item.id &&
                              styles.denominationDescriptionSelected,
                          ]}
                        >
                          {item.description}
                        </Text>
                      </View>
                    </View>
                    {editForm.denomination === item.id && (
                      <Feather name="check-circle" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                {/* Extra space at bottom to ensure last item is fully visible */}
                <View style={{ height: theme.spacing4XL }} />
              </ScrollView>
            </LinearGradient>
          </Animated.View>
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

      {/* Upload Loading Modal */}
      {isUploading && (
        <Modal visible={isUploading} transparent={true} animationType="fade">
          <View style={styles.uploadOverlay}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.uploadContent}>
              <LinearGradient colors={theme.gradientPrimary} style={styles.uploadGradient}>
                <ActivityIndicator size="large" color={theme.textWhite} />
                <Text style={styles.uploadText}>Uploading Image...</Text>
                <Text style={styles.uploadSubtext}>Please wait while we process your photo</Text>
              </LinearGradient>
            </View>
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
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Animated.View style={styles.successContent}>
            <LinearGradient colors={theme.gradientSuccess} style={styles.successGradient}>
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark-circle" size={60} color={theme.textWhite} />
              </View>
              <Text style={styles.successTitle}>Success!</Text>
              <Text style={styles.successMessage}>
                Your image has been uploaded. Remember to save your changes to update your profile.
              </Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSuccessModal(false);
                }}
              >
                <LinearGradient colors={theme.gradientPrimary} style={styles.successButtonGradient}>
                  <Text style={styles.successButtonText}>Got it!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Increased padding to ensure content is above nav bar
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingAnimation: {
    width: 150,
    height: 150,
  },
  loadingText: {
    fontSize: 18,
    color: theme.textMedium,
    fontWeight: theme.fontMedium,
    marginTop: theme.spacingL,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacingXL,
  },
  errorBox: {
    alignItems: "center",
    padding: theme.spacing2XL,
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: theme.spacingL,
    marginBottom: theme.spacingS,
  },
  errorText: {
    fontSize: 16,
    color: theme.textMedium,
    textAlign: "center",
    marginBottom: theme.spacingXL,
  },
  errorButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
  },
  errorButtonGradient: {
    paddingHorizontal: theme.spacing2XL,
    paddingVertical: theme.spacingM,
  },
  errorButtonText: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },

  warningBox: {
    alignItems: "center",
    padding: theme.spacing2XL,
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  warningTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: theme.spacingL,
    marginBottom: theme.spacingS,
  },
  warningText: {
    fontSize: 16,
    color: theme.textMedium,
    textAlign: "center",
    marginBottom: theme.spacingXL,
  },
  warningButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
  },
  warningButtonGradient: {
    paddingHorizontal: theme.spacing2XL,
    paddingVertical: theme.spacingM,
  },
  warningButtonText: {
    color: theme.textWhite,
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
  },

  // Profile Section
  profileSection: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 120 : 100,
    paddingBottom: theme.spacing2XL,
  },
  editButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 120 : 100,
    right: theme.spacingXL,
    zIndex: 10,
    borderRadius: theme.radiusFull,
    overflow: "hidden",
  },
  editButtonBlur: {
    padding: 2,
  },
  editButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
  },

  // Avatar
  avatarContainer: {
    width: 120,
    height: 120,
    marginBottom: theme.spacingXL,
    position: "relative",
  },
  avatarGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.primary,
    opacity: 0.15,
    top: -10,
    left: -10,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: theme.radiusFull,
    borderWidth: 4,
    borderColor: theme.accent2,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: theme.radiusFull,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: theme.accent2,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: theme.neutral900,
  },
  cameraButtonBlur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.8)",
  },

  // Profile Info
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 28,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingS,
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 16,
    color: theme.textMedium,
    marginBottom: theme.spacingM,
  },
  denominationBadge: {
    borderRadius: theme.radiusFull,
    overflow: "hidden",
  },
  denominationBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacingL,
    paddingVertical: theme.spacingS,
    gap: theme.spacingS,
  },
  denominationBadgeText: {
    fontSize: 14,
    color: theme.textWhite,
    fontWeight: theme.fontSemiBold,
  },

  // Content Container
  contentContainer: {
    paddingHorizontal: theme.spacingXL,
  },

  // Form Styles
  editFormContainer: {
    marginBottom: theme.spacing2XL,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingXL,
  },
  formHeaderAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: theme.spacingM,
  },
  formHeaderText: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  formFields: {
    gap: theme.spacingL,
    marginBottom: theme.spacingXL,
  },
  inputGroup: {
    gap: theme.spacingS,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.textMedium,
    fontWeight: theme.fontMedium,
    marginLeft: theme.spacingS,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: "rgba(254, 243, 199, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.08)",
    borderRadius: theme.radiusMedium,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
    paddingRight: 50,
    color: theme.textWhite,
    fontSize: 16,
  },
  inputIcon: {
    position: "absolute",
    right: theme.spacingL,
    top: "50%",
    transform: [{ translateY: -7 }],
  },
  denominationSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(254, 243, 199, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.08)",
    borderRadius: theme.radiusMedium,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
    paddingRight: 50,
  },
  denominationText: {
    fontSize: 16,
    color: theme.textWhite,
  },
  placeholderText: {
    color: theme.textLight,
  },

  // Buttons
  saveButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    marginBottom: theme.spacingL,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingL,
    gap: theme.spacingS,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  deleteAccountButton: {
    alignItems: "center",
  },
  deleteAccountContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacingS,
  },
  deleteAccountText: {
    fontSize: 14,
    color: theme.error,
    fontWeight: theme.fontMedium,
  },

  // Details Section
  detailsSection: {
    marginBottom: theme.spacing3XL,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacingXL,
  },
  sectionHeaderAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: theme.spacingM,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginLeft: theme.spacingS,
  },
  detailsList: {
    gap: theme.spacingL,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacingM,
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusFull,
    overflow: "hidden",
  },
  detailIconGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: theme.textWhite,
    fontWeight: theme.fontMedium,
  },

  // Settings
  settingsSection: {
    marginBottom: theme.spacing3XL,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(254, 243, 199, 0.05)",
    marginVertical: theme.spacing2XL,
    marginHorizontal: theme.spacingXL,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(254, 243, 199, 0.03)",
    borderRadius: theme.radiusMedium,
    padding: theme.spacingL,
    borderWidth: 1,
    borderColor: "rgba(254, 243, 199, 0.08)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacingM,
    flex: 1,
  },
  settingIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: theme.radiusFull,
    overflow: "hidden",
  },
  settingIconGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  settingTextWrapper: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: theme.textMedium,
  },

  // Logout Button
  logoutButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
    marginBottom: theme.spacing3XL, // Extra margin to ensure it's above nav bar
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacingL,
    gap: theme.spacingS,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacingXL,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
  },
  modalGradient: {
    padding: theme.spacing2XL,
    alignItems: "center",
  },
  modalIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    overflow: "hidden",
    marginBottom: theme.spacingXL,
  },
  modalIconGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingM,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: theme.textMedium,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: theme.spacingXL,
  },
  modalButtons: {
    flexDirection: "row",
    gap: theme.spacingM,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: theme.spacingM,
    alignItems: "center",
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  modalDeleteButton: {
    flex: 1,
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
  },
  modalDeleteGradient: {
    paddingVertical: theme.spacingM,
    alignItems: "center",
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
  deleteConfirmInput: {
    width: "100%",
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: theme.radiusMedium,
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacingL,
    color: theme.textWhite,
    fontSize: 16,
    marginBottom: theme.spacingXL,
  },

  // Denomination Modal
  denominationModal: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
  },
  denominationModalGradient: {
    paddingTop: theme.spacingXL,
  },
  denominationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacingXL,
    marginBottom: theme.spacingL,
  },
  denominationTitle: {
    fontSize: 22,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
  },
  denominationClose: {
    width: 36,
    height: 36,
    borderRadius: theme.radiusFull,
    overflow: "hidden",
  },
  denominationCloseBlur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.cardBg,
  },
  denominationList: {
    paddingHorizontal: theme.spacingXL,
    paddingBottom: theme.spacing3XL, // Increased padding to ensure last item shows
  },
  denominationItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    padding: theme.spacingL,
    marginBottom: theme.spacingM,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  denominationItemSelected: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: theme.primary,
  },
  denominationItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacingM,
    flex: 1,
  },
  denominationIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radiusFull,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  denominationIconSelected: {
    backgroundColor: theme.primary,
  },
  denominationInfo: {
    flex: 1,
  },
  denominationName: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
    marginBottom: 2,
  },
  denominationNameSelected: {
    color: theme.textWhite,
  },
  denominationDescription: {
    fontSize: 14,
    color: theme.textMedium,
  },
  denominationDescriptionSelected: {
    color: theme.textLight,
  },

  // Upload Modal
  uploadOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadContent: {
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
  },
  uploadGradient: {
    paddingVertical: theme.spacing3XL,
    paddingHorizontal: theme.spacing3XL,
    alignItems: "center",
  },
  uploadText: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginTop: theme.spacingL,
  },
  uploadSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: theme.spacingS,
  },

  // Success Modal
  successOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacingXL,
  },
  successContent: {
    width: "100%",
    maxWidth: 350,
    borderRadius: theme.radiusLarge,
    overflow: "hidden",
  },
  successGradient: {
    padding: theme.spacing2XL,
    alignItems: "center",
  },
  successIconWrapper: {
    marginBottom: theme.spacingL,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: theme.fontBold,
    color: theme.textWhite,
    marginBottom: theme.spacingM,
  },
  successMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: theme.spacingXL,
  },
  successButton: {
    borderRadius: theme.radiusMedium,
    overflow: "hidden",
  },
  successButtonGradient: {
    paddingVertical: theme.spacingM,
    paddingHorizontal: theme.spacing2XL,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: theme.fontSemiBold,
    color: theme.textWhite,
  },
});
