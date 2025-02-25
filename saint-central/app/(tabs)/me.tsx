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
} from "react-native";
import { supabase } from "../../supabaseClient";
import { Session } from "@supabase/supabase-js";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  theme_preference?: string;
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
    theme_preference: "auto",
  });
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
          theme_preference: data.theme_preference || "auto",
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
          theme_preference: editForm.theme_preference,
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
          theme_preference: data[0].theme_preference || "auto",
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
        <ActivityIndicator size="large" color="#FFD700" />
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
            color="#FFF9C4"
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
        <LinearGradient colors={["#292524", "#1C1917"]} style={styles.card}>
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
              color="#FFF9C4"
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
              color="#FFF9C4"
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
                  placeholderTextColor="rgba(255,215,0,0.5)"
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
                  placeholderTextColor="rgba(255,215,0,0.5)"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Theme Preference</Text>
                <View style={styles.themeSelector}>
                  {["dark", "light", "auto"].map((theme) => (
                    <TouchableOpacity
                      key={theme}
                      style={[
                        styles.themeOption,
                        editForm.theme_preference === theme &&
                          styles.themeOptionSelected,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditForm({ ...editForm, theme_preference: theme });
                      }}
                    >
                      <MaterialCommunityIcons
                        name={
                          theme === "dark"
                            ? "weather-night"
                            : theme === "light"
                            ? "weather-sunny"
                            : "theme-light-dark"
                        }
                        size={18}
                        color={
                          editForm.theme_preference === theme
                            ? "#FFF9C4"
                            : "rgba(255,215,0,0.7)"
                        }
                      />
                      <Text
                        style={[
                          styles.themeText,
                          editForm.theme_preference === theme &&
                            styles.themeTextSelected,
                        ]}
                      >
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
              >
                <MaterialCommunityIcons
                  name="content-save-outline"
                  size={22}
                  color="#FFF9C4"
                />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailsContainer}>
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <MaterialCommunityIcons
                    name="account"
                    size={22}
                    color="rgba(255,215,0,0.7)"
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
                  <Text style={styles.detailLabel}>
                    Theme:{" "}
                    <Text style={styles.detailValue}>
                      {userProfile.theme_preference
                        ? userProfile.theme_preference.charAt(0).toUpperCase() +
                          userProfile.theme_preference.slice(1)
                        : "Auto"}
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <MaterialCommunityIcons
                    name="email"
                    size={22}
                    color="rgba(255,215,0,0.7)"
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
                    color="rgba(255,215,0,0.7)"
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
        </LinearGradient>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color="#FFF9C4" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1917",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    padding: 24,
    position: "relative",
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
    color: "#FFF9C4",
    marginLeft: 6,
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
    backgroundColor: "#1C1917",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1C1917",
    padding: 16,
  },
  errorBox: {
    backgroundColor: "rgba(220,38,38,0.2)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.4)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: "#FFCCCC",
    marginLeft: 8,
  },
  warningBox: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  warningText: {
    color: "#FFF9C4",
    marginLeft: 8,
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
    backgroundColor: "rgba(255,215,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF9C4",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF9C4",
    marginBottom: 8,
  },
  profileEmail: {
    color: "rgba(255,215,0,0.7)",
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
    color: "#FFF9C4",
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#1C1917",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
    borderRadius: 8,
    padding: 8,
    color: "#FFF9C4",
    fontSize: 16,
  },
  themeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  themeOption: {
    flex: 1,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  themeOptionSelected: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderColor: "rgba(255,215,0,0.4)",
  },
  themeText: {
    color: "#FFF9C4",
    marginLeft: 6,
  },
  themeTextSelected: {
    color: "#FFF9C4",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  saveButtonText: {
    color: "#FFF9C4",
    fontWeight: "500",
    marginLeft: 8,
    fontSize: 16,
  },
  detailsContainer: {
    gap: 16,
  },
  detailCard: {
    backgroundColor: "rgba(41,37,36,0.5)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailHeaderText: {
    color: "#FFF9C4",
    fontWeight: "500",
    marginLeft: 12,
    fontSize: 16,
  },
  detailContent: {
    paddingLeft: 32,
  },
  detailLabel: {
    color: "rgba(255,249,196,0.8)",
    marginBottom: 10,
    fontSize: 15,
  },
  detailValue: {
    color: "rgba(255,215,0,0.7)",
  },
  logoutButton: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  logoutButtonText: {
    color: "#FFF9C4",
    fontWeight: "500",
    marginLeft: 8,
    fontSize: 16,
  },
});
