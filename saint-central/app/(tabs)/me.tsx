import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { supabase } from "../../supabaseClient";
import { Session } from "@supabase/supabase-js";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
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
  });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
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
        router.push("/");
      }
      return () => {};
    }, [session])
  );

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError("");

      if (!session?.user) {
        router.push("/");
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

  const handleSubmit = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!session?.user) return;

      const { data, error } = await supabase
        .from("users")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
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

  const handleDeleteAccount = async () => {
    try {
      setDeleteModalVisible(false);
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
          const { error: error1 } = await supabase
            .from(table)
            .delete()
            .eq("user_id_1", userId);

          const { error: error2 } = await supabase
            .from(table)
            .delete()
            .eq("user_id_2", userId);

          error = error1 || error2;
        } else {
          // For other tables, assume user_id is the standard column
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq("user_id", userId);

          error = deleteError;
        }

        // Log errors but continue with other tables
        if (error) {
          console.error(`Error deleting from ${table}: ${error.message}`);
        }
      }

      // Delete the user record last
      const { error: deleteUserError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (deleteUserError) {
        console.error(`Error deleting user: ${deleteUserError.message}`);
      }

      // Call the Edge Function to delete the authentication record
      try {
        const { error: edgeFunctionError } = await supabase.functions.invoke(
          "delete-user",
          {
            body: { userId },
          }
        );

        if (edgeFunctionError) {
          console.error(
            `Error calling delete-user function: ${edgeFunctionError.message}`
          );
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
      router.push("/");
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
      router.push("/");
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FAC898" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="light" />
        <View style={styles.errorBox}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={24}
            color="#DC2626"
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="light" />
        <View style={styles.warningBox}>
          <MaterialCommunityIcons
            name="information"
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.warningText}>No user profile found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsEditing(!isEditing);
            }}
          >
            <MaterialCommunityIcons
              name={isEditing ? "close" : "pencil-outline"}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <Text style={styles.profileName}>
              {userProfile.first_name
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : "My Profile"}
            </Text>
            <Text style={styles.profileEmail}>{userProfile.email}</Text>
          </View>

          {isEditing ? (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.first_name}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, first_name: text })
                  }
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.last_name}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, last_name: text })
                  }
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
              >
                <MaterialCommunityIcons
                  name="content-save-outline"
                  size={22}
                  color="#FFFFFF"
                />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setDeleteModalVisible(true);
                }}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={22}
                  color="#FFCCCC"
                />
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailsContainer}>
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <MaterialCommunityIcons
                    name="account"
                    size={22}
                    color="#E9967A"
                  />
                  <Text style={styles.detailHeaderText}>Account Details</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    ID: <Text style={styles.detailValue}>{userProfile.id}</Text>
                  </Text>
                  <Text style={styles.detailLabel}>
                    First Name:{" "}
                    <Text style={styles.detailValue}>
                      {userProfile.first_name || "Not set"}
                    </Text>
                  </Text>
                  <Text style={styles.detailLabel}>
                    Last Name:{" "}
                    <Text style={styles.detailValue}>
                      {userProfile.last_name || "Not set"}
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <MaterialCommunityIcons
                    name="email"
                    size={22}
                    color="#E9967A"
                  />
                  <Text style={styles.detailHeaderText}>Contact</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    Email:{" "}
                    <Text style={styles.detailValue}>{userProfile.email}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={22}
                    color="#E9967A"
                  />
                  <Text style={styles.detailHeaderText}>Timeline</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    Created:{" "}
                    <Text style={styles.detailValue}>
                      {userProfile.created_at
                        ? new Date(userProfile.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "N/A"}
                    </Text>
                  </Text>
                  <Text style={styles.detailLabel}>
                    Last Updated:{" "}
                    <Text style={styles.detailValue}>
                      {userProfile.updated_at
                        ? new Date(userProfile.updated_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "N/A"}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
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
              Are you sure you want to delete your account? This action cannot
              be undone and all your data will be permanently removed.
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
                onPress={handleDeleteAccount}
              >
                <Text style={styles.modalConfirmButtonText}>Delete</Text>
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
    backgroundColor: "#000000",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    width: "100%",
    borderRadius: 15,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 24,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  backButtonText: {
    color: "#FFFFFF",
    marginLeft: 6,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  editButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    padding: 16,
  },
  errorBox: {
    backgroundColor: "rgba(220,38,38,0.2)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.4)",
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: "#FFCCCC",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  warningBox: {
    backgroundColor: "rgba(233, 150, 122, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  warningText: {
    color: "#FFFFFF",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  profileHeader: {
    alignItems: "center",
    marginTop: 48,
    marginBottom: 32,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(233, 150, 122, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "300",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: 1,
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.5,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#FFFFFF",
    fontWeight: "400",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 15,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  saveButton: {
    backgroundColor: "rgba(233, 150, 122, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 8,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  deleteButton: {
    backgroundColor: "rgba(220,38,38,0.1)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.3)",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  deleteButtonText: {
    color: "#FFCCCC",
    fontWeight: "500",
    marginLeft: 8,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  detailsContainer: {
    gap: 16,
  },
  detailCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailHeaderText: {
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 12,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  detailContent: {
    paddingLeft: 32,
  },
  detailLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 10,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  detailValue: {
    color: "#FAC898",
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: "rgba(233, 150, 122, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
    width: "60%",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 8,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 15,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.3)",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "300",
    color: "#FFCCCC",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 1,
  },
  modalMessage: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(233, 150, 122, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(233, 150, 122, 0.3)",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "rgba(220,38,38,0.2)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.4)",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 8,
    alignItems: "center",
  },
  modalConfirmButtonText: {
    color: "#FFCCCC",
    fontWeight: "500",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
