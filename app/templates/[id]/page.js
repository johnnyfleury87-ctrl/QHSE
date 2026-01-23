/**
 * Vue: Détail Template d'Audit
 * Route: /templates/[id]
 * Source: docs/UI/PLAN_VUES_QHSE.md section F.2
 * SQL: Mode démo = mockData.js, Mode prod = tables audit_templates + questions
 * RLS: Policies audit_templates + questions
 * API: mockApi.getTemplateById(), mockApi.getQuestionsByTemplate()
 * 
 * Objectif: Afficher détail template + questions groupées par catégorie
 * - Infos template: nom, domaine, version, statut, description
 * - Section questions groupées par catégorie
 * - Table questions: ordre, libellé, type réponse, criticité
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { DemoBanner } from '@/components/ui/demo-banner'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/loading-states'
import { formatDate } from '@/lib/utils/formatters'
import { 
  ArrowLeft, 
  FileText,
  Calendar
} from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function TemplateDetailPage({ params }) {
  const router = useRouter()
  const templateId = params.id

  const [template, setTemplate] = useState(null)
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Charger template
        const templateData = await mockApi.getTemplateById(templateId)
        
        if (!templateData) {
          setError('Template non trouvé')
          return
        }

        setTemplate(templateData)

        // Charger questions
        const questionsData = await mockApi.getQuestionsByTemplate(templateId)
        setQuestions(questionsData)

        // Extraire catégories uniques
        const uniqueCategories = [...new Map(
          questionsData.map(q => {
            const categoryId = q.categoryId
            return [categoryId, { id: categoryId, name: getCategoryName(categoryId) }]
          })
        ).values()]
        
        setCategories(uniqueCategories)

      } catch (err) {
        console.error('Erreur chargement template:', err)
        setError('Impossible de charger le template')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [templateId])

  // Helper pour obtenir le nom de catégorie (depuis mockData)
  const getCategoryName = (categoryId) => {
    const categoryNames = {
      'cat-security-001': 'Equipements de Protection Individuelle',
      'cat-security-002': 'Signalisation et Balisage',
      'cat-quality-001': 'Hygiène du Personnel',
      'cat-quality-002': 'Traçabilité Produits'
    }
    return categoryNames[categoryId] || 'Catégorie'
  }

  // Badge domaine (type)
  const getDomaineBadge = (type) => {
    const variants = {
      security: 'danger',
      quality: 'primary',
      hygiene: 'info',
      environment: 'success',
      global: 'default'
    }

    const labels = {
      security: 'Sécurité',
      quality: 'Qualité',
      hygiene: 'Hygiène',
      environment: 'Environnement',
      global: 'Global'
    }

    return <Badge variant={variants[type] || 'default'}>{labels[type] || type}</Badge>
  }

  // Badge statut
  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      draft: 'warning',
      archive: 'secondary'
    }

    const labels = {
      active: 'Actif',
      draft: 'Brouillon',
      archive: 'Archivé'
    }

    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>
  }

  // Badge type question
  const getQuestionTypeBadge = (type) => {
    const labels = {
      yes_no: 'Oui/Non',
      score_1_5: 'Note 1-5',
      text: 'Texte libre',
      multiple_choice: 'Choix multiple'
    }
    return <Badge variant="secondary" className="text-xs">{labels[type] || type}</Badge>
  }

  // Badge criticité
  const getCriticalityBadge = (criticality) => {
    const variants = {
      critical: 'danger',
      high: 'warning',
      medium: 'default',
      low: 'secondary'
    }
    
    const labels = {
      critical: 'Critique',
      high: 'Élevée',
      medium: 'Moyenne',
      low: 'Faible'
    }

    return <Badge variant={variants[criticality]}>{labels[criticality]}</Badge>
  }

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement du template" />
        </AppShell>
      </>
    )
  }

  if (error || !template) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <ErrorState
            title="Erreur"
            message={error || 'Template non trouvé'}
            actionLabel="Retour à la liste"
            onAction={() => router.push('/templates')}
          />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <DemoBanner />
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            title={template.name}
            description={template.description || 'Template d&apos;audit'}
          >
            <div className="flex gap-2">
              <Link href="/templates">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la liste
                </Button>
              </Link>
              {/* Bouton modification (visible uniquement avec droits admin/manager) */}
              {/* <Link href={`/templates/${templateId}/edit`}>
                <Button variant="primary">
                  Modifier
                </Button>
              </Link> */}
            </div>
          </PageHeader>

          {/* Infos générales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informations générales</CardTitle>
                {getStatusBadge(template.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Domaine</div>
                    <div className="mt-1">
                      {getDomaineBadge(template.type)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Version</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {template.version}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Créé le</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(template.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {template.description && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Description</div>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questions groupées par catégorie */}
          <Card>
            <CardHeader>
              <CardTitle>Questions ({questions.length})</CardTitle>
              <CardDescription>
                Questions organisées par catégorie
              </CardDescription>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Aucune question"
                  message="Ce template ne contient aucune question"
                />
              ) : (
                <div className="space-y-6">
                  {categories.map((category) => {
                    const categoryQuestions = questions
                      .filter(q => q.categoryId === category.id)
                      .sort((a, b) => a.order - b.order)

                    return (
                      <div key={category.id} className="space-y-3">
                        <div className="font-medium text-lg border-b pb-2">
                          {category.name}
                        </div>
                        <div className="space-y-3">
                          {categoryQuestions.map((question, index) => (
                            <div 
                              key={question.id}
                              className="p-4 border rounded-lg bg-muted/20"
                            >
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-mono text-muted-foreground">
                                      Q{index + 1}
                                    </span>
                                    {getCriticalityBadge(question.criticality)}
                                    {getQuestionTypeBadge(question.type)}
                                  </div>
                                  <div className="font-medium">{question.label}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  )
}
