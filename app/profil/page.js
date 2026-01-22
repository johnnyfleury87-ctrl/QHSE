/**
 * Vue: Page Profil Personnel
 * Route: /profil
 * Source: docs/UI/PLAN_VUES_QHSE.md section B.2
 * SQL: table public.profiles
 * RLS: Policy profiles_update_own (UPDATE autorisé sauf role/status)
 * 
 * Objectif: Afficher et modifier son propre profil
 * Champs modifiables: first_name, last_name, email
 * Champs lecture seule: role, status (trigger prevent_role_status_self_change)
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase-client'

export default function ProfilPage() {
  const router = useRouter()

  // Redirect to demo if Supabase not configured
  useEffect(() => {
    if (!supabase) {
      router.push('/demo')
    }
  }, [router])

  if (!supabase) {
    return null // Will redirect
  }

  return (
    <AppShell>
      <PageHeader
        title="Profil non disponible"
        description="Le mode production nécessite une configuration Supabase."
      />
      <Alert variant="info">
        Cette fonctionnalité n'est disponible qu'en mode production avec Supabase configuré.
        Utilisez le mode démo pour découvrir l'application.
      </Alert>
    </AppShell>
  )
}
