'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

/**
 * Composant: Bloc d'accès JETC Solution (admin uniquement)
 * Visible uniquement si l'utilisateur connecté a is_jetc_admin = true
 * FIX: Utilise useAuth() au lieu de dupliquer la logique
 */
export function JETCAdminAccess() {
  const { profile, loading } = useAuth()

  // 🔍 LOG DIAGNOSTIQUE
  console.log('🎫 JETCAdminAccess render:', {
    loading,
    hasProfile: !!profile,
    isJetcAdmin: profile?.is_jetc_admin,
    profileRole: profile?.role,
    profileStatus: profile?.status
  })

  // Ne rien afficher si:
  // - en cours de chargement
  // - pas de profil
  // - profil pas is_jetc_admin
  // - profil inactif
  if (loading || !profile?.is_jetc_admin || profile?.status !== 'active') {
    console.log('🎫 JETCAdminAccess: caché (critères non remplis)')
    return null
  }

  console.log('🎫 JETCAdminAccess: visible (autorisé)')

  return (
    <div className="mt-16">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Accès JETC Solution</CardTitle>
              <CardDescription>
                Administration complète de la plateforme QHSE
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Gérez les utilisateurs, consultez les statistiques globales et administrez
            l&apos;ensemble de la plateforme.
          </p>
          <Link href="/admin">
            <Button variant="primary" className="w-full sm:w-auto">
              Entrer dans l&apos;espace admin
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
