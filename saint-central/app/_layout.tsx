import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { StripeProvider } from "@stripe/stripe-react-native";

import { useColorScheme } from "@/hooks/useColorScheme";
import { supabase } from "../supabaseClient";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [publishableKey] = useState(
    "pk_live_51QxbTHLRn9raMPQqDLHJzIvyWgG7UwJU0WVuw9XrigLtSDDGeXctdUA4kaWlObeOB53Bk2dqxotHXdc1xBcvrSWv00Lt2A5aFX"
  );

  // Only check if fonts are loaded, don't navigate here
  useEffect(() => {
    if (loaded) {
      // Just mark that we've checked auth
      supabase.auth.getSession().then(() => {
        setHasCheckedAuth(true);
      });
    }
  }, [loaded]);

  // Handle all navigation in ONE place only
  useEffect(() => {
    if (loaded && hasCheckedAuth) {
      // Hide splash screen once fonts are loaded and auth is checked
      SplashScreen.hideAsync();

      // Set up auth listener for ALL navigation related to auth state
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_, session) => {
        if (session) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/");
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [loaded, hasCheckedAuth, router]);

  // Always render a Slot even while loading
  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.saintcentral"
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Slot />
        <StatusBar style="auto" />
      </ThemeProvider>
    </StripeProvider>
  );
}
