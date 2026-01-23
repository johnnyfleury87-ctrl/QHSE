/**
 * Vue: Dashboard Admin (JETC Solution)
 * Route: /admin
 * Objectif: Stats globales + liens rapides vers gestion
 * Sécurité: Layout guard vérifie is_jetc_admin
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/loading-states'
import { Users, ClipboardCheck, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

export default function AdminDashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 🔍 LOG DIAGNOSTIQUE
  useEffect(() => {
    console.log('📊 ADMIN DASHBOARD render:', {
      hasProfile: !!profile,
      profileRole: profile?.role,
      isJetcAdmin: profile?.is_jetc_admin,
      loading,
      hasError: !!error,
      hasStats: !!stats
    })
  }, [profile, loading, error, stats])

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!supabase) {
        throw new Error('Supabase non configuré')
      }

      // Compteur utilisateurs
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (usersError) throw usersError

      // Compteur audits
      const { count: auditsCount, error: auditsError } = await supabase
        .from('audits')
        .select('*', { count: 'exact', head: true })

      if (auditsError) throw auditsError

      // Compteur non-conformités
      const { count: ncCount, error: ncError } = await supabase
        .from('non_conformites')
        .select('*', { count: 'exact', head: true })

      if (ncError) throw ncError

      // Compteur actions correctives
      const { count: actionsCount, error: actionsError } = await supabase
        .from('actions_correctives')
        .select('*', { count: 'exact', head: true })

      if (actionsError) throw actionsError

      setStats({
        users: usersCount || 0,
        audits: auditsCount || 0,
        nonConformites: ncCount || 0,
        actions: actionsCount || 0,
      })
    } catch (err) {
      console.error('Erreur chargement stats:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      label: 'Utilisateurs',
      value: stats?.users,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      link: '/admin/users',
    },
    {
      label: 'Audits',
      value: stats?.audits,
      icon: ClipboardCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/audits',
    },
    {
      label: 'Non-Conformités',
      value: stats?.nonConformites,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      link: '/non-conformites',
    },
    {
      label: 'Actions Correctives',
      value: stats?.actions,
      icon: CheckCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      link: '/non-conformites',
    },
  ]

  return (
    <>
      <PageHeader
        title="Administration JETC Solution"
        description={`Bienvenue ${profile?.first_name}, vous avez accès complet à la plateforme.`}
      />

      {/* États */}
      {loading && <LoadingState message="Chargement des statistiques..." />}
      
      {error && (
        <ErrorState 
          message={`Erreur: ${error}`}
          onRetry={loadStats}
        />
      )}

      {!loading && !error && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label} hover>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {stat.value !== undefined ? stat.value : '-'}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Liens rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Gestion de la plateforme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Carte UTILISATEURS mise en avant */}
              <Link href="/admin/users">
                <Button variant="default" className="w-full justify-between bg-primary text-primary-foreground hover:bg-primary/90 h-auto py-4">
                  <span className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Gérer les utilisateurs</div>
                      <div className="text-xs opacity-90">Créer, modifier, désactiver des comptes</div>
                    </div>
                  </span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              
              <Link href="/templates">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Gérer les templates d&apos;audit
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              
              <Link href="/depots">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Gérer les dépôts & zones
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
