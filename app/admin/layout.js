/**
 * Layout: Espace Admin (JETC Solution uniquement)
 * Route: /admin/*
 * Sécurité: Guard vérifie is_jetc_admin = true
 * Redirecte vers /dashboard si pas autorisé
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppShell } from '@/components/layout/app-shell'
import { LoadingState } from '@/components/ui/loading-states'

export default function AdminLayout({ children }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Attendre fin du chargement
    if (loading) return

    // Rediriger si pas connecté
    if (!profile) {
      router.push('/login')
      return
    }

    // Rediriger si pas JETC admin
    if (!profile.is_jetc_admin) {
      router.push('/dashboard')
    }
  }, [profile, loading, router])

  // État de chargement
  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Vérification des permissions..." />
      </AppShell>
    )
  }

  // Pas autorisé (le temps de la redirection)
  if (!profile?.is_jetc_admin) {
    return null
  }

  // Autorisé: afficher le contenu
  return <AppShell>{children}</AppShell>
}
