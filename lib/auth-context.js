/**
 * Hook useAuth - Gestion authentification
 * Gère session Supabase et profil utilisateur
 * Source: PLAN_VUES_QHSE.md section B.1 (Login)
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { DEMO_MODE } from '@/src/config/demoConfig'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  isDemo: false,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(DEMO_MODE)

  // 🔍 LOG: État initial
  useEffect(() => {
    console.log('🔐 AUTH CONTEXT - Init', {
      demoModeEnv: DEMO_MODE,
      hasSupabase: !!supabase,
      nodeEnv: process.env.NODE_ENV
    })
  }, [])

  useEffect(() => {
    // Skip if Supabase not configured
    if (!supabase) {
      console.log('⚠️ AUTH: Supabase non configuré → mode DEMO forcé')
      setIsDemo(true)
      setLoading(false)
      return
    }

    // Check active session
    console.log('🔍 AUTH: Vérification session Supabase...')
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 AUTH: Session récupérée', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      })

      setUser(session?.user ?? null)

      if (session?.user) {
        // Session réelle → désactiver mode demo
        console.log('✅ AUTH: Session valide → MODE DEMO DÉSACTIVÉ')
        setIsDemo(false)
        loadProfile(session.user.id)
      } else {
        console.log('❌ AUTH: Pas de session → mode demo selon config')
        setIsDemo(DEMO_MODE)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 AUTH: State changed', {
        event,
        hasSession: !!session,
        userId: session?.user?.id
      })

      setUser(session?.user ?? null)

      if (session?.user) {
        setIsDemo(false)
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setIsDemo(DEMO_MODE)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProfile = async (userId) => {
    console.log('📥 AUTH: Chargement profil pour user', userId)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('📥 AUTH: Résultat fetch profile', {
        hasData: !!data,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint
      })

      if (error) {
        // Erreur RLS ou profil non trouvé
        if (error.code === 'PGRST116') {
          console.error('❌ AUTH: Profil non trouvé (0 rows)')
          throw new Error('PROFILE_NOT_FOUND')
        }
        if (error.code === '42501') {
          console.error('❌ AUTH: Erreur RLS (permission denied)')
          throw new Error('RLS_ERROR')
        }
        throw error
      }

      if (!data) {
        console.error('❌ AUTH: Data null (aucun profil)')
        throw new Error('PROFILE_NOT_FOUND')
      }

      console.log('✅ AUTH: Profil chargé', {
        userId: data.id,
        email: data.email,
        role: data.role,
        status: data.status,
        isJetcAdmin: data.is_jetc_admin,
        firstName: data.first_name,
        lastName: data.last_name
      })

      // Bloquer si status = 'inactive' (RG du PLAN_VUES_QHSE.md B.1)
      if (data.status === 'inactive') {
        console.error('❌ AUTH: Compte inactif → logout')
        await signOut()
        throw new Error('Compte désactivé. Contactez un administrateur.')
      }

      setProfile(data)
    } catch (error) {
      console.error('❌ AUTH: Erreur loading profile:', error)
      setProfile(null)

      // Remonter l'erreur dans l'UI si c'est un problème de profil
      if (error.message === 'PROFILE_NOT_FOUND' || error.message === 'RLS_ERROR') {
        // L'UI doit afficher une erreur claire
      }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase non configuré. Utilisez le mode démo.')
    }

    console.log('🔑 AUTH: Tentative login', { email })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ AUTH: Erreur login', error)
      throw error
    }

    console.log('✅ AUTH: Login réussi', {
      userId: data.user?.id,
      email: data.user?.email
    })

    // Désactiver mode demo après login réussi
    setIsDemo(false)

    return data
  }

  const signOut = async () => {
    if (!supabase) return

    console.log('🚪 AUTH: Logout')
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    setUser(null)
    setProfile(null)
    setIsDemo(DEMO_MODE)

    console.log('✅ AUTH: Logout terminé')
  }

  const value = {
    user,
    profile,
    loading,
    isDemo,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
