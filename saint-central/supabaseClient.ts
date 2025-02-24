import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-url-polyfill/auto";

const extra = Constants.manifest?.extra ?? Constants.expoConfig?.extra;

if (!extra) {
  throw new Error(
    "Extra configuration is missing in your manifest/expoConfig."
  );
}

const { supabaseUrl, supabaseAnonKey } = extra as {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
