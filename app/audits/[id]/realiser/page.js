/**
 * Vue: Réaliser Audit (Questions)
 * Route: /audits/[id]/realiser
 * Source: docs/UI/PLAN_VUES_QHSE.md section G.4
 * SQL: Mode démo = mockData.js, Mode prod = tables questions + reponses
 * RLS: Policies reponses (seul l'auditeur assigné peut INSERT/UPDATE)
 * API: mockApi.getQuestionsByTemplate(), mockApi.getResponsesByAudit()
 * 
 * Objectif: Afficher questions du template et réponses existantes
 * Mode démo: affichage lecture seule des réponses exemple
 * Mode prod: permettrait modification (non implémenté ici)
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
import { Alert } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  CheckCircle2,
  XCircle,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function AuditRealisationPage({ params }) {
  const router = useRouter()
  const auditId = params.id

  const [audit, setAudit] = useState(null)
  const [template, setTemplate] = useState(null)
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Charger audit
        const auditData = await mockApi.getAuditById(auditId)
        
        if (!auditData) {
          setError('Audit non trouvé')
          return
        }

        setAudit(auditData)

        // Charger données liées
        const [templateData, responsesData] = await Promise.all([
          mockApi.getTemplateById(auditData.templateId),
          mockApi.getResponsesByAudit(auditId)
        ])

        setTemplate(templateData)
        setResponses(responsesData)

        // Charger questions et catégories
        const questionsData = await mockApi.getQuestionsByTemplate(auditData.templateId)
        setQuestions(questionsData)

        // Extraire catégories uniques
        const uniqueCategories = [...new Map(
          questionsData.map(q => {
            // Trouver la catégorie dans les données mock
            const categoryId = q.categoryId
            return [categoryId, { id: categoryId, name: getCategoryName(categoryId) }]
          })
        ).values()]
        
        setCategories(uniqueCategories)

      } catch (err) {
        console.error('Erreur chargement questions:', err)
        setError('Impossible de charger les questions')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [auditId])

  // Helper pour obtenir le nom de catégorie (à améliorer avec mockCategories)
  const getCategoryName = (categoryId) => {
    const categoryNames = {
      'cat-security-001': 'Equipements de Protection Individuelle',
      'cat-security-002': 'Signalisation et Balisage',
      'cat-quality-001': 'Hygiène du Personnel',
      'cat-quality-002': 'Traçabilité Produits'
    }
    return categoryNames[categoryId] || 'Catégorie'
  }

  // Trouver réponse pour une question
  const getResponse = (questionId) => {
    return responses.find(r => r.questionId === questionId)
  }

  // Afficher valeur réponse selon type
  const renderResponseValue = (question, response) => {
    if (!response) {
      return <span className="text-muted-foreground text-sm">Non répondu</span>
    }

    switch (question.type) {
      case 'yes_no':
        if (response.value === 'yes') {
          return (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-600">Oui (Conforme)</span>
            </div>
          )
        } else if (response.value === 'no') {
          return (
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-600">Non (Non conforme)</span>
            </div>
          )
        }
        break
      
      case 'score_1_5':
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{response.value} / 5</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded ${
                    i <= parseInt(response.value) ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )
      
      case 'text':
        return (
          <div className="text-sm">
            {response.value || response.comment || <span className="text-muted-foreground">Aucun texte</span>}
          </div>
        )
      
      default:
        return <span className="text-sm">{response.value}</span>
    }
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
          <LoadingState message="Chargement des questions" />
        </AppShell>
      </>
    )
  }

  if (error || !audit) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <ErrorState
            title="Erreur"
            message={error || 'Audit non trouvé'}
            actionLabel="Retour à l'audit"
            onAction={() => router.push(`/audits/${auditId}`)}
          />
        </AppShell>
      </>
    )
  }

  // Calcul progression
  const totalQuestions = questions.length
  const answeredQuestions = responses.length
  const progressPercent = totalQuestions > 0 
    ? Math.round((answeredQuestions / totalQuestions) * 100)
    : 0

  return (
    <>
      <DemoBanner />
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            title="Questions de l'audit"
            description={`Template: ${template?.name || 'N/A'}`}
          >
            <Link href={`/audits/${auditId}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l&apos;audit
              </Button>
            </Link>
          </PageHeader>

          {/* Info mode démo */}
          <Alert variant="info" title="Mode démo">
            Les réponses affichées sont des exemples. En mode production, vous pourriez répondre aux questions directement.
          </Alert>

          {/* Progression */}
          <Card>
            <CardHeader>
              <CardTitle>Progression</CardTitle>
              <CardDescription>
                {answeredQuestions} / {totalQuestions} questions répondues ({progressPercent}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Questions par catégorie */}
          {categories.length === 0 ? (
            <EmptyState
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
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle>{category.name}</CardTitle>
                      <CardDescription>
                        {categoryQuestions.length} question{categoryQuestions.length > 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {categoryQuestions.map((question, index) => {
                        const response = getResponse(question.id)
                        const hasResponse = !!response

                        return (
                          <div 
                            key={question.id}
                            className={`p-4 border rounded-lg ${
                              hasResponse ? 'bg-muted/20' : 'bg-background'
                            }`}
                          >
                            {/* Question header */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-mono text-muted-foreground">
                                    Q{index + 1}
                                  </span>
                                  {getCriticalityBadge(question.criticality)}
                                  <Badge variant="secondary" className="text-xs">
                                    {question.type}
                                  </Badge>
                                </div>
                                <div className="font-medium">{question.label}</div>
                              </div>
                            </div>

                            {/* Réponse */}
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-sm font-medium text-muted-foreground mb-2">
                                Réponse:
                              </div>
                              {renderResponseValue(question, response)}
                              
                              {/* Commentaire */}
                              {response?.comment && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div className="text-sm">{response.comment}</div>
                                  </div>
                                </div>
                              )}

                              {/* Photos */}
                              {response?.photos && response.photos.length > 0 && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                                  <ImageIcon className="h-4 w-4" />
                                  <span>{response.photos.length} photo{response.photos.length > 1 ? 's' : ''} jointe{response.photos.length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </AppShell>
    </>
  )
}
