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
} from "react-native";
import { supabase } from "../../supabaseClient";
import { Session } from "@supabase/supabase-js";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  profile_image?: string;
}

export default function MeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    profile_image: "",
  });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
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

    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        fetchUserProfile();
      } else if (session === null && !loading) {
        router.push("/(auth)/auth");
      }
      return () => {};
    }, [session]),
  );

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError("");

      if (!session?.user) {
        router.push("/(auth)/auth");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        setError(error.message);
      } else if (data) {
        setUserProfile(data);
        setEditForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          profile_image: data.profile_image || "",
        });
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

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Request base64 data to avoid blob conversion issues
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Show processing indicator
        setLoading(true);

        try {
          const imageAsset = result.assets[0];
          const imageUri = imageAsset.uri;
          const base64Data = imageAsset.base64;

          // Show selected image immediately for better UX
          setEditForm((prev) => ({
            ...prev,
            profile_image: imageUri,
          }));

          // Generate a unique file path
          const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpeg";
          const fileName = `profile-${Date.now()}.${fileExt}`;
          const filePath = `${session?.user.id}/${fileName}`;

          if (!base64Data) {
            throw new Error("Failed to get image data");
          }

          // Upload directly using base64 data
          const { error: uploadError } = await supabase.storage
            .from("profile-images")
            .upload(filePath, decode(base64Data), {
              contentType: `image/${fileExt}`,
              upsert: true,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          // Get the public URL
          const { data } = supabase.storage.from("profile-images").getPublicUrl(filePath);

          // Update form with new image URL
          setEditForm((prev) => ({
            ...prev,
            profile_image: data.publicUrl,
          }));

          // Save the updated profile immediately
          await supabase
            .from("users")
            .update({
              profile_image: data.publicUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", session?.user.id);

          // Enable editing mode if not already in it
          if (!isEditing) {
            setIsEditing(true);
          }

          Alert.alert(
            "Image Uploaded",
            "Your profile image has been uploaded. Click 'Save Changes' to update your profile.",
            [{ text: "OK" }],
          );
        } catch (err) {
          console.error("Upload process error:", err);
          Alert.alert("Upload Failed", "Please try again later");

          // Keep the local image for user experience
          // No need to revert the form state
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to select image");
    }
  };

  // Helper function to decode base64
  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  const handleSubmit = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!session?.user) return;

      const { data, error } = await supabase
        .from("users")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          profile_image: editForm.profile_image,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setUserProfile(data[0]);
        setEditForm({
          first_name: data[0].first_name || "",
          last_name: data[0].last_name || "",
          profile_image: data[0].profile_image || "",
        });

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

      if (!session?.user) return;

      const userId = session.user.id;

      // Delete data from all tables that might contain user data
      // Using a common pattern where user_id links to the user
      const tables = [
        "comments",
        "culture_posts",
        "faith_posts",
        "friends",
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
        let error;

        // Special case for friends table which has user_id_1 and user_id_2
        if (table === "friends") {
          // Delete records where user is either user_id_1 or user_id_2
          const { error: error1 } = await supabase.from(table).delete().eq("user_id_1", userId);

          const { error: error2 } = await supabase.from(table).delete().eq("user_id_2", userId);

          error = error1 || error2;
        } else {
          // For other tables, assume user_id is the standard column
          const { error: deleteError } = await supabase.from(table).delete().eq("user_id", userId);

          error = deleteError;
        }

        // Log errors but continue with other tables
        if (error) {
          console.error(`Error deleting from ${table}: ${error.message}`);
        }
      }

      // Delete the user record last
      const { error: deleteUserError } = await supabase.from("users").delete().eq("id", userId);

      if (deleteUserError) {
        console.error(`Error deleting user: ${deleteUserError.message}`);
      }

      // Call the Edge Function to delete the authentication record
      try {
        const { error: edgeFunctionError } = await supabase.functions.invoke("delete-user", {
          body: { userId },
        });

        if (edgeFunctionError) {
          console.error(`Error calling delete-user function: ${edgeFunctionError.message}`);
          // Continue with logout even if auth deletion fails
        }
      } catch (edgeError) {
        console.error("Edge function error:", edgeError);
        // Continue with logout even if auth deletion fails
      }

      // If we made it here, successfully deleted account data
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Sign out and redirect to home page
      await supabase.auth.signOut();
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
      await supabase.auth.signOut();
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#3A86FF" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="dark" />
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
        <StatusBar style="dark" />
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
      <StatusBar style="dark" />

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
              colors={["#3A86FF", "#4361EE"]}
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
              colors={["#3A86FF", "#4361EE"]}
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
            {userProfile.profile_image ? (
              <Image source={{ uri: userProfile.profile_image }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={["#3A86FF", "#4361EE"]}
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
              colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <CardDecoration />

              {/* Edit Form */}
              <View style={styles.formContainer}>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  <LinearGradient
                    colors={["#3A86FF", "#4361EE"]}
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
                    <FontAwesome5 name="user-edit" size={16} color="#3A86FF" />
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
                </View>

                <View style={styles.actionsContainer}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleSubmit}>
                    <LinearGradient
                      colors={["#3A86FF", "#4361EE"]}
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
                    colors={["#FF4560", "#FF006E"]}
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
              colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <CardDecoration />

              {/* Account Details Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="user-circle" size={16} color="#3A86FF" />
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
              </View>

              {/* Contact Section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="envelope" size={16} color="#3A86FF" />
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
                  <FontAwesome5 name="clock" size={16} color="#3A86FF" />
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
            </LinearGradient>
          </Animated.View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={["#4CC9F0", "#4895EF"]}
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
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 20 : RNStatusBar.currentHeight || 20,
    paddingBottom: 60,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 100 : 80,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 225, 0.5)",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingTitleContainer: {
    position: "absolute",
    width: "100%",
    paddingHorizontal: 20,
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
    borderRadius: 2,
    marginRight: 12,
  },
  floatingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    zIndex: 10,
    shadowColor: "#3A86FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
  editGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    shadowColor: "#3A86FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  profileEmail: {
    fontSize: 16,
    color: "#64748B",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.5)",
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
    borderRadius: 50,
  },
  decorationDot1: {
    width: 12,
    height: 12,
    backgroundColor: "rgba(58, 134, 255, 0.2)",
    top: 15,
    right: 15,
  },
  decorationDot2: {
    width: 8,
    height: 8,
    backgroundColor: "rgba(58, 134, 255, 0.15)",
    top: 30,
    right: 22,
  },
  decorationDot3: {
    width: 6,
    height: 6,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    top: 24,
    right: 35,
  },
  formContainer: {
    gap: 16,
  },
  imagePickerButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#3A86FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imagePickerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  imagePickerText: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 15,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#64748B",
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    color: "#1E293B",
    fontSize: 16,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#3A86FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  deleteButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#FF006E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  deleteGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  deleteIcon: {
    marginRight: 8,
  },
  deleteText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3A86FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  logoutButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 24,
    shadowColor: "#4895EF",
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
    paddingVertical: 16,
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  errorBox: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(255, 0, 110, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 110, 0.1)",
    borderRadius: 20,
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: "#3A86FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  warningBox: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(67, 97, 238, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.1)",
    borderRadius: 20,
    padding: 24,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },
  warningButton: {
    backgroundColor: "#3A86FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  warningButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 16,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "#1E293B",
    fontWeight: "600",
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: "center",
  },
  modalConfirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  deleteConfirmInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    color: "#1E293B",
    fontSize: 16,
    marginBottom: 24,
  },
});
