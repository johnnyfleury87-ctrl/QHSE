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

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase Client] Variables d\'environnement manquantes. ' +
    'Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
