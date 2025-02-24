import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
