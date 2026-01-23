/**
 * Utilitaire Supabase pour Next.js App Router (Server-Side)
 * Gère correctement les cookies pour l'authentification
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * Créer un client Supabase serveur qui lit les cookies
 * À utiliser dans API Routes pour récupérer la session utilisateur
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

/**
 * Créer un client Supabase Admin (service_role)
 * UNIQUEMENT pour opérations admin (bypass RLS)
 * NE PAS utiliser pour récupérer la session utilisateur
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
