import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "../supabaseClient";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Set up notification handler - how notifications are presented while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Storage keys
const PUSH_TOKEN_KEY = "pushToken";
const USER_NOTIFICATION_PREFERENCES = "userNotificationPreferences";
const APP_STATE_KEY = "appState";

// Default user preferences for different notification types
const DEFAULT_NOTIFICATION_PREFERENCES = {
  ministryMessages: true,
  prayerRequests: true,
  announcements: true,
  eventReminders: true,
};

export type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFERENCES;

/**
 * Get the Expo push token for the device
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  // Notifications only work on physical devices, not simulators
  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return undefined;
  }

  // Check if we have permission to send notifications
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If we don't have permission, ask for it
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token for push notification!");
    return undefined;
  }

  try {
    // Get the token that uniquely identifies this device
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    token = expoPushToken.data;

    // Store token in local storage
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    // Platform-specific setup
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5B6EF5",
      });
    }

    return token;
  } catch (error) {
    console.error("Error getting push token:", error);
    return undefined;
  }
}

/**
 * Save the device token to the Supabase database for the current user
 */
export async function saveUserPushToken(pushToken: string | undefined): Promise<void> {
  if (!pushToken) return;

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      return;
    }

    // Check if token already exists
    const { data: existingTokens, error: checkError } = await supabase
      .from("user_push_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("token", pushToken);

    if (checkError) {
      console.error("Error checking existing token:", checkError);
      return;
    }

    // If token doesn't exist, save it
    if (!existingTokens || existingTokens.length === 0) {
      const { error } = await supabase.from("user_push_tokens").insert({
        user_id: user.id,
        token: pushToken,
        device_type: Platform.OS,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error saving push token:", error);
      }
    }
  } catch (error) {
    console.error("Error in saveUserPushToken:", error);
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>,
): Promise<void> {
  try {
    // Get current preferences first
    const storedPrefs = await AsyncStorage.getItem(USER_NOTIFICATION_PREFERENCES);
    const currentPrefs = storedPrefs ? JSON.parse(storedPrefs) : DEFAULT_NOTIFICATION_PREFERENCES;

    // Update with new preferences
    const newPrefs = { ...currentPrefs, ...preferences };
    await AsyncStorage.setItem(USER_NOTIFICATION_PREFERENCES, JSON.stringify(newPrefs));

    // Save to database
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      return;
    }

    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      notification_preferences: newPrefs,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error saving notification preferences:", error);
    }
  } catch (error) {
    console.error("Error updating notification preferences:", error);
  }
}

/**
 * Get current notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    // Get from local storage first
    const storedPrefs = await AsyncStorage.getItem(USER_NOTIFICATION_PREFERENCES);
    if (storedPrefs) {
      return JSON.parse(storedPrefs);
    }

    // If not in local storage, try to get from database
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("notification_preferences")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      console.error("Error getting notification preferences:", error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    // Save to local storage for future use
    await AsyncStorage.setItem(
      USER_NOTIFICATION_PREFERENCES,
      JSON.stringify(data.notification_preferences),
    );

    return data.notification_preferences;
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  trigger: Notifications.NotificationTriggerInput = null,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger,
  });
}

/**
 * Check if the app is in foreground
 * This helps determine if we should send push notifications or just show local notifications
 */
export async function isAppInForeground(): Promise<boolean> {
  try {
    const appState = await AsyncStorage.getItem(APP_STATE_KEY);
    return appState === "foreground";
  } catch (error) {
    console.error("Error checking app state:", error);
    return false;
  }
}

/**
 * Update app state (call this in your AppState change listener)
 */
export async function updateAppState(
  state: "foreground" | "background" | "inactive",
): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_STATE_KEY, state);
  } catch (error) {
    console.error("Error updating app state:", error);
  }
}

/**
 * Send a message to a ministry chat
 */
export async function sendMinistryMessage(ministryId: number, messageText: string): Promise<void> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      return;
    }

    // Check app state to determine if push notifications will be handled by Edge Function
    const isInForeground = await isAppInForeground();

    // Add message to database
    // If app is in foreground, mark push_sent as true since we'll handle notifications in the app
    // If app is in background, mark push_sent as false so the Edge Function will send push notifications
    const { error } = await supabase.from("ministry_messages").insert({
      ministry_id: ministryId,
      user_id: user.id,
      message_text: messageText,
      sent_at: new Date().toISOString(),
      push_sent: isInForeground, // If app is in foreground, we don't need the Edge Function to send push
    });

    if (error) {
      console.error("Error sending ministry message:", error);
    }
  } catch (error) {
    console.error("Error in sendMinistryMessage:", error);
  }
}

/**
 * Send message to a ministry channel as a notification
 */
export async function sendMinistryNotification(
  ministryId: number,
  title: string,
  message: string,
): Promise<void> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      return;
    }

    // Check app state to determine if push notifications will be handled by Edge Function
    const isInForeground = await isAppInForeground();

    // Add notification to database
    const { error } = await supabase.from("ministry_notifications").insert({
      ministry_id: ministryId,
      sender_id: user.id,
      title,
      message,
      created_at: new Date().toISOString(),
      push_sent: isInForeground, // If app is in foreground, we don't need the Edge Function to send push
    });

    if (error) {
      console.error("Error sending ministry notification:", error);
    }
  } catch (error) {
    console.error("Error in sendMinistryNotification:", error);
  }
}

/**
 * Set up a Supabase real-time listener for ministry notifications
 * This will trigger local notifications when new ministry messages are received
 *
 * @param ministryIds Array of ministry IDs to listen for notifications from
 * @returns A cleanup function to remove the subscription
 */
export function setupMinistryNotificationsListener(ministryIds: number[] = []): () => void {
  if (!ministryIds.length) {
    console.log("No ministry IDs provided for notification listener");
    return () => {};
  }

  try {
    // First get the current user
    const notificationsChannel = supabase.channel("ministry_notifications");

    // For each ministry ID, set up a notification listener
    ministryIds.forEach((ministryId) => {
      notificationsChannel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ministry_notifications",
          filter: `ministry_id=eq.${ministryId}`,
        },
        async (payload) => {
          const notification = payload.new;

          // Get current user
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) return;

          // Don't notify for your own messages
          if (notification.sender_id === user.id) return;

          // Get notification preferences
          const prefs = await getNotificationPreferences();

          // Skip if ministry messages are turned off
          if (!prefs.ministryMessages) return;

          // Show the notification
          await scheduleLocalNotification(notification.title, notification.message, {
            ministryId: notification.ministry_id,
            notificationId: notification.id,
            type: "ministry_notification",
          });

          // Mark this notification as push_sent=true since we've handled it locally
          await supabase
            .from("ministry_notifications")
            .update({ push_sent: true })
            .eq("id", notification.id);
        },
      );
    });

    // Subscribe to the channel
    notificationsChannel.subscribe((status) => {
      console.log("Ministry notifications subscription status:", status);
    });

    // Return cleanup function
    return () => {
      try {
        supabase.removeChannel(notificationsChannel);
      } catch (error) {
        console.error("Error removing notification channel:", error);
      }
    };
  } catch (error) {
    console.error("Error setting up ministry notifications listener:", error);
    return () => {};
  }
}

/**
 * Set up a Supabase real-time listener for direct ministry messages
 * This is separate from the ministry_notifications table and listens directly
 * to the ministry_messages table for real-time updates
 *
 * @param ministryIds Array of ministry IDs to listen for messages from
 * @returns A cleanup function to remove the subscription
 */
export function setupMinistryMessagesListener(ministryIds: number[] = []): () => void {
  if (!ministryIds.length) {
    console.log("No ministry IDs provided for message listener");
    return () => {};
  }

  try {
    const messagesChannel = supabase.channel("ministry_messages_notifications");

    // For each ministry ID, set up a message listener
    ministryIds.forEach((ministryId) => {
      messagesChannel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ministry_messages",
          filter: `ministry_id=eq.${ministryId}`,
        },
        async (payload) => {
          const message = payload.new;

          // Get current user
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) return;

          // Don't notify for your own messages
          if (message.user_id === user.id) return;

          // Get ministry details for the notification title
          const { data: ministryData } = await supabase
            .from("ministries")
            .select("name")
            .eq("id", ministryId)
            .single();

          if (!ministryData) return;

          // Get message sender details
          const { data: senderData } = await supabase
            .from("users")
            .select("first_name, last_name")
            .eq("id", message.user_id)
            .single();

          const senderName = senderData
            ? `${senderData.first_name} ${senderData.last_name}`
            : "Someone";

          // Get notification preferences
          const prefs = await getNotificationPreferences();

          // Skip if ministry messages are turned off
          if (!prefs.ministryMessages) return;

          // Show the notification
          await scheduleLocalNotification(
            `New message in ${ministryData.name}`,
            `${senderName}: ${message.message_text}`,
            {
              ministryId,
              messageId: message.id,
              type: "ministry_message",
            },
          );

          // Mark this message as push_sent=true since we've handled it locally
          await supabase.from("ministry_messages").update({ push_sent: true }).eq("id", message.id);
        },
      );
    });

    // Subscribe to the channel
    messagesChannel.subscribe((status) => {
      console.log("Ministry messages subscription status:", status);
    });

    // Return cleanup function
    return () => {
      try {
        supabase.removeChannel(messagesChannel);
      } catch (error) {
        console.error("Error removing messages channel:", error);
      }
    };
  } catch (error) {
    console.error("Error setting up ministry messages listener:", error);
    return () => {};
  }
}
