/**
 * Vue: Dashboard Mode Démo
 * Route: /demo
 * Source: docs/UI/PLAN_VUES_QHSE.md section C.1
 * SQL: Aucune (mode démo, zéro appel Supabase)
 * RLS: N/A (pas de DB)
 * API: mockApi via apiWrapper (mockData.js)
 * 
 * Objectif: Démonstration immédiate avec données mock, parcours cliquable
 * Données requises:
 * - 6 KPIs (audits à faire, en cours, terminés, taux conformité, NC ouvertes, NC échues)
 * - Possibilité de cliquer pour accéder aux listes
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { DemoBanner } from '@/components/ui/demo-banner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/loading-states'
import { 
  ClipboardCheck, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp,
  AlertTriangle,
  Calendar,
  Building2,
  FileText
} from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function DemoPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        // Charger les stats depuis mockApi
        const dashboardStats = await mockApi.getDashboardStats()
        setStats(dashboardStats)
      } catch (err) {
        console.error('Erreur chargement dashboard démo:', err)
        setError('Impossible de charger les données')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement du dashboard démo" />
        </AppShell>
      </>
    )
  }

  if (error) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <ErrorState
            title="Erreur de chargement"
            message={error}
            actionLabel="Retour à l'accueil"
            onAction={() => window.location.href = '/'}
          />
        </AppShell>
      </>
    )
  }

  if (!stats) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <EmptyState
            title="Aucune donnée"
            message="Les statistiques ne sont pas disponibles"
          />
        </AppShell>
      </>
    )
  }

  // KPIs data
  const kpis = [
    {
      id: 'audits-planifie',
      title: 'Audits à faire',
      value: stats.audits.planifie,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      href: '/audits?status=planifie',
      description: 'Audits planifiés'
    },
    {
      id: 'audits-en-cours',
      title: 'Audits en cours',
      value: stats.audits.en_cours,
      icon: ClipboardCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      href: '/audits?status=en_cours',
      description: 'En cours de réalisation'
    },
    {
      id: 'audits-termine',
      title: 'Audits terminés (30j)',
      value: stats.audits.termine,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      href: '/audits?status=termine',
      description: 'Ce mois-ci'
    },
    {
      id: 'conformity-rate',
      title: 'Taux de conformité',
      value: `${stats.conformityRate}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      href: '/audits',
      description: 'Moyenne globale'
    },
    {
      id: 'nc-open',
      title: 'NC ouvertes',
      value: stats.nonConformities.ouverte,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
      href: '/non-conformites?status=ouverte',
      description: 'À traiter'
    },
    {
      id: 'nc-critical',
      title: 'NC critiques',
      value: stats.nonConformities.critical,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
      href: '/non-conformites?priority=critical',
      description: 'Action immédiate requise'
    },
  ]

  return (
    <>
      <DemoBanner />
      <AppShell>
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Dashboard QHSE</h1>
            <p className="text-muted-foreground">
              Vue d&apos;ensemble des audits et non-conformités
            </p>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((kpi) => {
              const Icon = kpi.icon
              return (
                <Link key={kpi.id} href={kpi.href}>
                  <Card hover className="cursor-pointer h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {kpi.title}
                      </CardTitle>
                      <div className={`h-10 w-10 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${kpi.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{kpi.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpi.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>
                Explorez les différentes fonctionnalités de l&apos;application
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link href="/audits">
                <Button variant="primary">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Voir tous les audits
                </Button>
              </Link>
              <Link href="/non-conformites">
                <Button variant="outline">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Voir les non-conformités
                </Button>
              </Link>
              <Link href="/depots">
                <Button variant="outline">
                  <Building2 className="h-4 w-4 mr-2" />
                  Voir les dépôts
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Voir les templates
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost">
                  Retour à l&apos;accueil
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Info Section */}
          <Card>
            <CardHeader>
              <CardTitle>À propos du mode démo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                ✓ Toutes les données affichées sont des exemples
              </p>
              <p>
                ✓ Vous pouvez naviguer librement et explorer les fonctionnalités
              </p>
              <p>
                ✓ Aucune connexion ou authentification requise
              </p>
              <p>
                ✓ Les modifications ne sont pas enregistrées
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  )
}
