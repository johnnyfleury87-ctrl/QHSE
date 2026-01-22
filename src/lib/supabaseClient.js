/**
 * Supabase Client - Production uniquement
 * 
 * ⚠️ CE FICHIER NE DOIT JAMAIS ÊTRE IMPORTÉ EN MODE DÉMO
 * 
 * Import conditionnel dans apiWrapper.js uniquement.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;

// Only create client if credentials are provided
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.warn('[Supabase Client] Variables d\'environnement manquantes. Mode démo uniquement.');
}

export { supabase };
export default supabase;
