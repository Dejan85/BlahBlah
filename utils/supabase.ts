import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Ne logujemo vrednosti — samo signal da konfiguracija nedostaje.
  console.warn(
    'Supabase env nije postavljen (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).'
  );
}

// NAPOMENA: `Database` generic NIJE prosleđen u createClient namerno.
// Globalno tipiziranje klijenta surfacuje 51 neusklađenost (cast cleanup + tabele
// `friends`/`friend_requests` koje kod gađa a ne postoje u šemi) → odvojen follow-up.
// Tipovi su dostupni za eksplicitnu upotrebu preko `@/types` (Tables<'...'>, itd.).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // ENABLE THIS for deep linking!
  },
});
