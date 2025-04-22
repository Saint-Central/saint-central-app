import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as IntentLauncher from "expo-intent-launcher";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  registerForPushNotificationsAsync,
  NotificationPreferences,
} from "../utils/notifications";

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    ministryMessages: true,
    prayerRequests: true,
    announcements: true,
    eventReminders: true,
  });

  // Load notification settings on component mount
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);

        // Check notification permissions
        const { status } = await Notifications.getPermissionsAsync();
        setPermissions(status === "granted");

        // Get user preferences
        const userPrefs = await getNotificationPreferences();
        setPreferences(userPrefs);
      } catch (error) {
        console.error("Error loading notification settings:", error);
        Alert.alert("Error", "Failed to load notification settings.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Open device settings to enable notifications
  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS, {
        data: "package:com.saintcentral.app",
      });
    }
  };

  // Request permissions from the user
  const requestPermissions = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      const hasPermission = !!token;
      setPermissions(hasPermission);

      if (!hasPermission) {
        Alert.alert(
          "Permissions Required",
          "Please enable notifications in your device settings to receive ministry updates.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: openSettings,
            },
          ],
        );
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Alert.alert("Error", "Failed to request notification permissions.");
    }
  };

  // Update a specific preference
  const togglePreference = async (key: keyof NotificationPreferences) => {
    try {
      // If no permissions, request them first
      if (!permissions) {
        await requestPermissions();
        if (!permissions) return; // Exit if still no permissions
      }

      // Update local state first for responsive UI
      const newPreferences = {
        ...preferences,
        [key]: !preferences[key],
      };
      setPreferences(newPreferences);

      // Save the preferences
      await updateNotificationPreferences({ [key]: !preferences[key] });
    } catch (error) {
      console.error(`Error toggling ${key}:`, error);
      // Revert the change if it failed
      setPreferences(preferences);
      Alert.alert("Error", "Failed to update notification settings.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.permissionSection}>
        <View style={styles.permissionContent}>
          <Ionicons
            name={permissions ? "notifications" : "notifications-off"}
            size={24}
            color={permissions ? "#5B6EF5" : "#9CA3AF"}
          />
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Notification Permissions</Text>
            <Text style={styles.permissionDescription}>
              {permissions
                ? "Notifications are enabled for this app"
                : "Enable notifications to stay updated"}
            </Text>
          </View>
        </View>
        {!permissions && (
          <TouchableOpacity style={styles.enableButton} onPress={requestPermissions}>
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Notification Types</Text>

      <View style={styles.preferencesContainer}>
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Ministry Messages</Text>
            <Text style={styles.preferenceDescription}>
              Get notified when new messages are posted in your ministries
            </Text>
          </View>
          <Switch
            value={preferences.ministryMessages}
            onValueChange={() => togglePreference("ministryMessages")}
            trackColor={{ false: "#E5E7EB", true: "#CBD5E1" }}
            thumbColor={preferences.ministryMessages ? "#5B6EF5" : "#F3F4F6"}
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Prayer Requests</Text>
            <Text style={styles.preferenceDescription}>Get notified about new prayer requests</Text>
          </View>
          <Switch
            value={preferences.prayerRequests}
            onValueChange={() => togglePreference("prayerRequests")}
            trackColor={{ false: "#E5E7EB", true: "#CBD5E1" }}
            thumbColor={preferences.prayerRequests ? "#5B6EF5" : "#F3F4F6"}
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Announcements</Text>
            <Text style={styles.preferenceDescription}>
              Get notified about church-wide announcements
            </Text>
          </View>
          <Switch
            value={preferences.announcements}
            onValueChange={() => togglePreference("announcements")}
            trackColor={{ false: "#E5E7EB", true: "#CBD5E1" }}
            thumbColor={preferences.announcements ? "#5B6EF5" : "#F3F4F6"}
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Event Reminders</Text>
            <Text style={styles.preferenceDescription}>Get reminders about upcoming events</Text>
          </View>
          <Switch
            value={preferences.eventReminders}
            onValueChange={() => togglePreference("eventReminders")}
            trackColor={{ false: "#E5E7EB", true: "#CBD5E1" }}
            thumbColor={preferences.eventReminders ? "#5B6EF5" : "#F3F4F6"}
            ios_backgroundColor="#E5E7EB"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>You can change notification settings at any time</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 8,
  },
  permissionSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFC",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  permissionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  permissionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  enableButton: {
    backgroundColor: "#5B6EF5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  enableButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  preferencesContainer: {
    marginBottom: 24,
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  preferenceTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    padding: 16,
  },
  footerText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
