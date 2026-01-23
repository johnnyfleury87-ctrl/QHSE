/**
 * Vue: Questions Audit (Interactive)
 * Route: /audits/[id]/questions
 * Source: Plan B2 - Parcours démo cliquable
 * SQL: Mode démo = état mémoire via apiWrapper, Mode prod = table reponses_audit
 * API: api.audits.getById(), api.questions.getByTemplateId(), api.answers.*
 * 
 * Objectif: Interface interactive pour répondre aux questions d'un audit
 * - Affichage questions par catégorie
 * - Saisie réponses selon type (yes_no, score, text)
 * - Sauvegarde en mémoire (démo) ou DB (prod)
 * - Calcul progress en temps réel
 * - Bouton "Terminer l'audit" quand toutes réponses OK
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { DemoBanner } from '@/components/ui/demo-banner'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/loading-states'
import { Alert } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  CheckCircle2,
  Save,
  AlertCircle,
  MessageSquare
} from 'lucide-react'
import api from '@/src/lib/apiWrapper'
import { evaluateRule, getSeverityColor, getSeverityIcon } from '@/src/lib/rulesEngine'

export default function AuditQuestionsPage({ params }) {
  const router = useRouter()
  const auditId = params.id

  const [audit, setAudit] = useState(null)
  const [template, setTemplate] = useState(null)
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])
  const [answers, setAnswers] = useState({}) // { questionId: { value, comment } }
  const [ruleResults, setRuleResults] = useState({}) // { questionId: { severity, message } }
  const [progress, setProgress] = useState({ answered_count: 0, question_count: 0, percentage: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Charger audit
      const auditData = await api.audits.getById(auditId)
      
      if (!auditData) {
        setError('Audit non trouvé')
        return
      }

      setAudit(auditData)

      // Charger template et questions
      const templateData = await api.templates.getById(auditData.templateId)
      const questionsData = await api.questions.getByTemplateId(auditData.templateId)
      
      setTemplate(templateData)
      setQuestions(questionsData)

      // Charger réponses existantes
      const existingAnswers = await api.answers.getByAuditId(auditId)
      const answersMap = {}
      existingAnswers.forEach(answer => {
        answersMap[answer.questionId] = {
          value: answer.value,
          comment: answer.comment || ''
        }
      })
      setAnswers(answersMap)

      // Calculer progress
      const progressData = await api.answers.getProgress(auditId)
      setProgress(progressData)

      // Extraire catégories (grouper questions)
      const categoriesMap = {}
      questionsData.forEach(q => {
        if (q.categoryId && !categoriesMap[q.categoryId]) {
          categoriesMap[q.categoryId] = {
            id: q.categoryId,
            name: getCategoryName(q.categoryId),
            questions: []
          }
        }
        if (q.categoryId) {
          categoriesMap[q.categoryId].questions.push(q)
        }
      })
      setCategories(Object.values(categoriesMap))

    } catch (err) {
      console.error('Erreur chargement questions:', err)
      setError('Impossible de charger les questions')
    } finally {
      setLoading(false)
    }
  }, [auditId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Helper pour noms catégories (hardcodé pour démo, à améliorer)
  const getCategoryName = (categoryId) => {
    const names = {
      'cat-security-001': 'Équipements de Protection Individuelle',
      'cat-security-002': 'Signalisation et Balisage',
      'cat-quality-001': 'Hygiène du Personnel',
      'cat-quality-002': 'Traçabilité Produits',
    }
    return names[categoryId] || 'Catégorie'
  }

  // Sauvegarder une réponse
  const handleSaveAnswer = async (questionId, value, comment = '') => {
    try {
      setSaving(true)
      setError(null)
      
      // Trouver la question pour évaluation règles
      const question = questions.find(q => q.id === questionId)
      
      // Sauvegarder via API
      await api.answers.upsert({
        audit_id: auditId,
        question_id: questionId,
        value,
        comment,
      })

      // Mettre à jour état local
      setAnswers(prev => ({
        ...prev,
        [questionId]: { value, comment }
      }))

      // Évaluer règles métier
      if (question) {
        const ruleResult = evaluateRule(question, value)
        
        // Stocker résultat évaluation
        setRuleResults(prev => ({
          ...prev,
          [questionId]: {
            severity: ruleResult.severity,
            message: ruleResult.message
          }
        }))

        // Auto-créer NC si nécessaire
        if (ruleResult.shouldCreateNC && ruleResult.ncPayload) {
          try {
            await api.nonConformities.createFromRule({
              ...ruleResult.ncPayload,
              auditId,
              questionId,
            })
            setSuccessMessage('Réponse enregistrée - NC créée automatiquement')
          } catch (ncErr) {
            console.error('Erreur création NC:', ncErr)
            setSuccessMessage('Réponse enregistrée (erreur création NC)')
          }
        } else {
          setSuccessMessage(ruleResult.message || 'Réponse enregistrée')
        }
      } else {
        setSuccessMessage('Réponse enregistrée')
      }

      // Recalculer progress
      const newProgress = await api.answers.getProgress(auditId)
      setProgress(newProgress)

      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (err) {
      console.error('Erreur sauvegarde réponse:', err)
      setError('Impossible de sauvegarder la réponse')
    } finally {
      setSaving(false)
    }
  }

  // Démarrer l'audit (si planifié)
  const handleStartAudit = async () => {
    try {
      setSaving(true)
      await api.audits.start(auditId)
      await loadData() // Recharger pour mettre à jour statut
      setSuccessMessage('Audit démarré')
    } catch (err) {
      console.error('Erreur démarrage audit:', err)
      setError(err.message || 'Impossible de démarrer l\'audit')
    } finally {
      setSaving(false)
    }
  }

  // Terminer l'audit
  const handleCompleteAudit = async () => {
    try {
      // Vérification: toutes questions répondues ?
      if (progress.percentage < 100) {
        setError(`Vous devez répondre à toutes les questions (${progress.answered_count}/${progress.question_count})`)
        return
      }

      setSaving(true)
      await api.audits.complete(auditId)
      setSuccessMessage('Audit terminé avec succès')
      
      // Rediriger vers détail audit
      setTimeout(() => {
        router.push(`/audits/${auditId}`)
      }, 1500)

    } catch (err) {
      console.error('Erreur complétion audit:', err)
      setError(err.message || 'Impossible de terminer l\'audit')
    } finally {
      setSaving(false)
    }
  }

  // Rendu champ selon type question
  const renderQuestionInput = (question) => {
    const currentAnswer = answers[question.id]
    const value = currentAnswer?.value || ''
    const comment = currentAnswer?.comment || ''

    switch (question.type) {
      case 'yes_no':
        return (
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button
                variant={value === 'yes' ? 'primary' : 'outline'}
                onClick={() => handleSaveAnswer(question.id, 'yes', comment)}
                disabled={saving || audit.status === 'termine'}
                className="flex-1"
              >
                Oui
              </Button>
              <Button
                variant={value === 'no' ? 'primary' : 'outline'}
                onClick={() => handleSaveAnswer(question.id, 'no', comment)}
                disabled={saving || audit.status === 'termine'}
                className="flex-1"
              >
                Non
              </Button>
            </div>
            {renderCommentField(question.id, comment)}
          </div>
        )

      case 'score_1_5':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(score => (
                <Button
                  key={score}
                  variant={value === String(score) ? 'primary' : 'outline'}
                  onClick={() => handleSaveAnswer(question.id, String(score), comment)}
                  disabled={saving || audit.status === 'termine'}
                  size="sm"
                  className="flex-1"
                >
                  {score}
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground flex justify-between px-1">
              <span>Très mauvais</span>
              <span>Excellent</span>
            </div>
            {renderCommentField(question.id, comment)}
          </div>
        )

      case 'text':
        return (
          <div className="space-y-2">
            <textarea
              value={comment}
              onChange={(e) => {
                setAnswers(prev => ({
                  ...prev,
                  [question.id]: { value: e.target.value, comment: e.target.value }
                }))
              }}
              onBlur={(e) => handleSaveAnswer(question.id, e.target.value, e.target.value)}
              disabled={saving || audit.status === 'termine'}
              placeholder="Saisissez votre commentaire..."
              className="w-full min-h-[100px] p-3 border rounded-md resize-y"
            />
          </div>
        )

      case 'number':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => {
                  setAnswers(prev => ({
                    ...prev,
                    [question.id]: { value: e.target.value, comment }
                  }))
                }}
                onBlur={(e) => handleSaveAnswer(question.id, e.target.value, comment)}
                disabled={saving || audit.status === 'termine'}
                placeholder="Entrez la valeur..."
                className="w-40"
              />
              {question.rule_config?.unit && (
                <span className="text-sm text-muted-foreground">
                  {question.rule_config.unit}
                </span>
              )}
            </div>
            {question.rule_config && (question.rule_config.min !== undefined || question.rule_config.max !== undefined) && (
              <div className="text-xs text-muted-foreground">
                Limites acceptables: {question.rule_config.min ?? '?'}{question.rule_config.unit || ''} - {question.rule_config.max ?? '?'}{question.rule_config.unit || ''}
              </div>
            )}
            {renderCommentField(question.id, comment)}
          </div>
        )

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => {
              setAnswers(prev => ({
                ...prev,
                [question.id]: { value: e.target.value, comment }
              }))
            }}
            onBlur={(e) => handleSaveAnswer(question.id, e.target.value, comment)}
            disabled={saving || audit.status === 'termine'}
            placeholder="Réponse..."
          />
        )
    }
  }

  // Champ commentaire (optionnel pour yes_no et score)
  const renderCommentField = (questionId, comment) => {
    return (
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Commentaire (optionnel)
        </label>
        <Input
          type="text"
          value={comment}
          onChange={(e) => {
            setAnswers(prev => ({
              ...prev,
              [questionId]: { ...prev[questionId], comment: e.target.value }
            }))
          }}
          onBlur={(e) => {
            const currentValue = answers[questionId]?.value || ''
            handleSaveAnswer(questionId, currentValue, e.target.value)
          }}
          disabled={saving || audit.status === 'termine'}
          placeholder="Ajouter un commentaire..."
        />
      </div>
    )
  }

  // Badge criticité question
  const getCriticalityBadge = (criticality) => {
    const variants = {
      critical: 'destructive',
      high: 'warning',
      medium: 'default',
      low: 'secondary',
    }
    const labels = {
      critical: 'Critique',
      high: 'Haute',
      medium: 'Moyenne',
      low: 'Faible',
    }
    return <Badge variant={variants[criticality]}>{labels[criticality]}</Badge>
  }

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement des questions..." />
        </AppShell>
      </>
    )
  }

  if (error && !audit) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <ErrorState
            title="Erreur"
            message={error}
            actionLabel="Retour à l'audit"
            onAction={() => router.push(`/audits/${auditId}`)}
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
            title={`Questions - ${template?.titre || 'Audit'}`}
            description={`Audit ${auditId} • ${progress.answered_count}/${progress.question_count} réponses`}
          >
            <div className="flex items-center gap-2">
              <Link href={`/audits/${auditId}`}>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </Link>
            </div>
          </PageHeader>

          {/* Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              {successMessage}
            </Alert>
          )}

          {/* Progress bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression</span>
                  <span className="font-medium">{progress.percentage}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {progress.answered_count} sur {progress.question_count} questions répondues
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bouton démarrer (si planifié) */}
          {audit.status === 'planifie' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Audit planifié</h3>
                    <p className="text-sm text-muted-foreground">
                      Cliquez sur &quot;Démarrer&quot; pour commencer l&apos;audit
                    </p>
                  </div>
                  <Button onClick={handleStartAudit} disabled={saving}>
                    Démarrer l&apos;audit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions par catégorie */}
          {categories.length === 0 ? (
            <EmptyState
              title="Aucune question"
              message="Ce template ne contient pas encore de questions"
            />
          ) : (
            <div className="space-y-6">
              {categories.map((category, catIndex) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {category.questions?.map((question, qIndex) => {
                      const isAnswered = !!answers[question.id]?.value
                      const ruleResult = ruleResults[question.id]
                      return (
                        <div key={question.id} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Q{catIndex + 1}.{qIndex + 1}
                                </span>
                                {getCriticalityBadge(question.criticality)}
                                {isAnswered && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <h4 className="font-medium mb-1">{question.label}</h4>
                              <p className="text-sm text-muted-foreground">
                                Type: {
                                  question.type === 'yes_no' ? 'Oui/Non' : 
                                  question.type === 'score_1_5' ? 'Note 1-5' : 
                                  question.type === 'number' ? 'Numérique' :
                                  'Texte'
                                }
                              </p>
                            </div>
                          </div>
                          {renderQuestionInput(question)}
                          
                          {/* Indicateur sévérité après évaluation règle */}
                          {ruleResult && ruleResult.message && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${getSeverityColor(ruleResult.severity)}`}>
                              <span>{getSeverityIcon(ruleResult.severity)}</span>
                              <span>{ruleResult.message}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Actions finales */}
          {audit.status === 'en_cours' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Terminer l&apos;audit</h3>
                    <p className="text-sm text-muted-foreground">
                      {progress.percentage === 100 
                        ? 'Toutes les questions ont été répondues'
                        : `Il reste ${progress.question_count - progress.answered_count} question(s) à répondre`
                      }
                    </p>
                  </div>
                  <Button 
                    onClick={handleCompleteAudit} 
                    disabled={saving || progress.percentage < 100}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Terminer l&apos;audit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit déjà terminé */}
          {audit.status === 'termine' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              Cet audit est terminé. Les réponses sont en lecture seule.
            </Alert>
          )}
        </div>
      </AppShell>
    </>
  )
}
