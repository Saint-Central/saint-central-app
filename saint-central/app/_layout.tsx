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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [publishableKey] = useState(
    "pk_live_51QxbTHLRn9raMPQqDLHJzIvyWgG7UwJU0WVuw9XrigLtSDDGeXctdUA4kaWlObeOB53Bk2dqxotHXdc1xBcvrSWv00Lt2A5aFX"
  ); // Replace with your actual key

  useEffect(() => {
    if (loaded) {
      // Check auth and redirect
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/");
        }
        // Hide splash screen after routing decision
        SplashScreen.hideAsync();
      });

      // Set up auth listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_, session) => {
        if (session) router.replace("/(tabs)/home");
        else router.replace("/");
      });

      return () => subscription.unsubscribe();
    }
  }, [loaded, router]);

  // Always render a Slot even while loading
  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.saintcentral" // Replace with your merchant identifier
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Slot />
        <StatusBar style="auto" />
      </ThemeProvider>
    </StripeProvider>
  );
}
