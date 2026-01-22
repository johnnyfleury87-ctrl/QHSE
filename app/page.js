/**
 * Vue: Landing Page (Accueil)
 * Route: /
 * Source: docs/UI/PLAN_VUES_QHSE.md section A.1
 * SQL: Aucune (pas d'appel DB)
 * RLS: Aucune (page publique)
 * 
 * Objectif: Page d'accueil permettant de choisir entre Mode Démo (sans login) 
 * ou Connexion Production
 */

import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardCheck, Shield, TrendingUp, FileText, Play, LogIn } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: ClipboardCheck,
      title: 'Audits QHSE',
      description: 'Créez et gérez vos audits de sécurité, qualité, hygiène et environnement',
    },
    {
      icon: Shield,
      title: 'Non-conformités',
      description: 'Suivez et traitez les non-conformités avec des actions correctives',
    },
    {
      icon: TrendingUp,
      title: 'Tableau de bord',
      description: 'Visualisez vos KPIs et indicateurs de performance en temps réel',
    },
    {
      icon: FileText,
      title: 'Rapports',
      description: 'Générez des rapports détaillés en PDF, Excel ou Markdown',
    },
  ]

  return (
    <AppShell>
      {/* Hero Section */}
      <div className="text-center space-y-8 py-12">
        <div className="space-y-4">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-primary items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-3xl">Q</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Gestion QHSE simplifiée
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Application complète pour gérer vos audits, templates, non-conformités et rapports
            en toute conformité.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/demo">
            <Button size="lg" variant="primary" className="w-full sm:w-auto">
              <Play className="h-5 w-5 mr-2" />
              Découvrir en mode démo
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <LogIn className="h-5 w-5 mr-2" />
              Se connecter
            </Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          Le mode démo vous permet d&apos;explorer l&apos;application sans créer de compte
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Card key={feature.title} hover>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* Info Section */}
      <div className="mt-16 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Conformité et traçabilité</CardTitle>
            <CardDescription>
              Assurez la conformité de vos processus avec une traçabilité complète des audits,
              des non-conformités et des actions correctives.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Gestion des rôles et permissions (RLS Supabase)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Templates d&apos;audit personnalisables
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Workflow de validation des NC (ouverte → en traitement → résolue → vérifiée → clôturée)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Rapports automatiques avec génération PDF/Excel
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Footer info */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Version 1.0 - Étapes 01 à 05 implémentées</p>
      </div>
    </AppShell>
  )
}
