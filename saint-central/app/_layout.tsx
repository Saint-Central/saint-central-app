import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import "react-native-reanimated";
import { StripeProvider } from "@stripe/stripe-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";

import { useColorScheme } from "@/hooks/useColorScheme";
import { supabase } from "../supabaseClient";
import { registerForPushNotificationsAsync, saveUserPushToken } from "@/utils/notifications";

// Prevent the splash screen from auto-hiding until ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [loading, setLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const appState = useRef(AppState.currentState);

  // Handle notifications
  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      if (token) {
        saveUserPushToken(token);
      }
    });

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification response:", response);

      // Extract data from the notification
      const data = response.notification.request.content.data;

      // Handle navigation based on notification data
      if (data.ministryId) {
        router.push(`/(tabs)/ministryDetail?id=${data.ministryId}`);
      }
    });

    // App state change listener for reconnecting to notification services
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      // Clean up the listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription.remove();
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      console.log("App has come to the foreground!");
      // Re-register for push notifications when app comes to foreground
      registerForPushNotificationsAsync().then((token) => {
        if (token && token !== expoPushToken) {
          setExpoPushToken(token);
          saveUserPushToken(token);
        }
      });
    }
    appState.current = nextAppState;
  };

  useEffect(() => {
    if (fontsLoaded) {
      // Schedule navigation on the next frame to ensure Root Layout is mounted
      requestAnimationFrame(() => {
        supabase.auth
          .getSession()
          .then(({ data }) => {
            if (data.session) {
              router.replace("/(tabs)/home");
            } else {
              router.replace("/(auth)/auth");
            }
          })
          .catch((error) => {
            console.error("Session check error:", error);
          })
          .finally(() => {
            setLoading(false);
            SplashScreen.hideAsync();
          });
      });
    }
  }, [fontsLoaded, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey="pk_live_51QxbTHLRn9raMPQqDLHJzIvyWgG7UwJU0WVuw9XrigLtSDDGeXctdUA4kaWlObeOB53Bk2dqxotHXdc1xBcvrSWv00Lt2A5aFX"
        merchantIdentifier="merchant.com.saintcentral"
      >
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          {/* Always render Slot so that a navigator is mounted */}
          <Slot />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FAC898" />
            </View>
          )}
        </ThemeProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
});
