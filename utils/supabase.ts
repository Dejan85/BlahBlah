import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

console.log("Supabase initialization:");
console.log("URL:", supabaseUrl);
console.log("ANON KEY (first 50 chars):", supabaseAnonKey.substring(0, 50));
console.log("ANON KEY length:", supabaseAnonKey.length);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // ENABLE THIS for deep linking!
  },
});
