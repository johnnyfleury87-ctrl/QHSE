/**
 * Layout: Espace Admin (JETC Solution uniquement)
 * Route: /admin/*
 * Sécurité: Guard vérifie is_jetc_admin = true
 * Redirecte vers /dashboard si pas autorisé
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppShell } from '@/components/layout/app-shell'
import { LoadingState } from '@/components/ui/loading-states'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AdminLayout({ children }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [error, setError] = useState(null)
  const [timedOut, setTimedOut] = useState(false)
  const hasRedirected = useRef(false)

  // 🔍 LOGS DIAGNOSTIQUES (temporaires)
  useEffect(() => {
    console.log('🛡️ GUARD ADMIN - Start', {
      loading,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasProfile: !!profile,
      profileRole: profile?.role,
      profileStatus: profile?.status,
      isJetcAdmin: profile?.is_jetc_admin,
      currentPath: window.location.pathname,
      hasRedirected: hasRedirected.current
    })
  }, [loading, user, profile])

  // ⏱️ TIMEOUT: si loading > 5s → erreur
  useEffect(() => {
    if (!loading) return

    const timer = setTimeout(() => {
      console.error('⏱️ TIMEOUT: chargement permissions > 5s')
      setTimedOut(true)
      setError('timeout')
    }, 5000)

    return () => clearTimeout(timer)
  }, [loading])

  // 🚦 LOGIQUE DE GUARD (sans router en dépendance!)
  useEffect(() => {
    // Attendre fin du chargement
    if (loading) {
      console.log('⏳ GUARD: en attente chargement...')
      return
    }

    // Éviter redirection multiple
    if (hasRedirected.current) {
      console.log('🔄 GUARD: redirection déjà effectuée, skip')
      return
    }

    console.log('✅ GUARD: chargement terminé, analyse...')

    // CAS A: Pas de session
    if (!user) {
      console.log('❌ GUARD: Pas de session → redirect /login')
      hasRedirected.current = true
      router.replace('/login?next=/admin')
      return
    }

    // CAS B: Session OK mais profil introuvable
    if (!profile) {
      console.error('❌ GUARD: Profil non trouvé pour user', user.id)
      setError('no_profile')
      return
    }

    // CAS C: Profil inactif (normalement géré par auth-context mais double check)
    if (profile.status === 'inactive') {
      console.error('❌ GUARD: Compte désactivé')
      setError('inactive')
      hasRedirected.current = true
      router.replace('/login?error=compte_desactive')
      return
    }

    // CAS D: Profil non autorisé (pas is_jetc_admin)
    if (!profile.is_jetc_admin) {
      console.log('🚫 GUARD: Accès refusé (is_jetc_admin=false) → redirect /dashboard')
      hasRedirected.current = true
      router.replace('/dashboard?error=acces_refuse')
      return
    }

    // CAS E: Autorisé
    console.log('✅ GUARD: Accès autorisé (is_jetc_admin=true)')
  }, [loading, user, profile, router])

  // ⏱️ AFFICHAGE TIMEOUT
  if (timedOut) {
    console.error('💥 GUARD: Timeout atteint')
    return (
      <AppShell>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erreur de chargement des permissions (timeout)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Le chargement des permissions a pris trop de temps. Vérifiez votre connexion internet.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Recharger la page
            </button>
          </CardContent>
        </Card>
      </AppShell>
    )
  }

  // ❌ AFFICHAGE ERREUR: Profil non trouvé
  if (error === 'no_profile') {
    console.error('💥 GUARD: Affichage erreur no_profile')
    return (
      <AppShell>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Profil non initialisé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Votre compte existe mais votre profil n&apos;a pas été créé dans la base de données.
              Contactez l&apos;administrateur.
            </p>
            <p className="text-xs text-muted-foreground">
              User ID: <code>{user?.id}</code>
            </p>
          </CardContent>
        </Card>
      </AppShell>
    )
  }

  // ⏳ LOADING
  if (loading) {
    console.log('⏳ GUARD: Affichage spinner loading')
    return (
      <AppShell>
        <LoadingState message="Vérification des permissions..." />
      </AppShell>
    )
  }

  // 🚫 PAS AUTORISÉ (pendant redirection)
  if (!profile?.is_jetc_admin) {
    console.log('🚫 GUARD: Pas autorisé, null pendant redirection')
    return null
  }

  // ✅ AUTORISÉ: afficher contenu
  console.log('✅ GUARD: Render children autorisé')
  return <AppShell>{children}</AppShell>
}
