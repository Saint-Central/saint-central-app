import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import "react-native-reanimated";
import { StripeProvider } from "@stripe/stripe-react-native";

import { useColorScheme } from "@/hooks/useColorScheme";
import { supabase } from "../supabaseClient";

// Prevent the splash screen from auto-hiding until ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fontsLoaded) {
      // Schedule navigation on the next frame to ensure Root Layout is mounted
      requestAnimationFrame(() => {
        supabase.auth
          .getSession()
          .then(({ data }) => {
            if (data.session) {
              router.replace("/(tabs)/social/screens/FeedScreen");
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
