'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ArrowRight } from 'lucide-react'

/**
 * Composant: Bloc d'accès JETC Solution (admin uniquement)
 * Visible uniquement si l'utilisateur connecté a is_jetc_admin = true
 */
export function JETCAdminAccess() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkJETCAdmin() {
      try {
        // Vérifier si Supabase est configuré
        const { supabase } = await import('@/lib/supabase-client')
        if (!supabase) {
          setLoading(false)
          return
        }

        // Récupérer la session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        // Récupérer le profil
        const { data, error } = await supabase
          .from('profiles')
          .select('is_jetc_admin')
          .eq('id', session.user.id)
          .single()

        if (!error && data?.is_jetc_admin) {
          setProfile(data)
        }
      } catch (error) {
        console.error('Erreur vérification JETC admin:', error)
      } finally {
        setLoading(false)
      }
    }

    checkJETCAdmin()
  }, [])

  // Ne rien afficher si pas JETC admin
  if (loading || !profile?.is_jetc_admin) {
    return null
  }

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
