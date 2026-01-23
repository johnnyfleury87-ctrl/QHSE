/**
 * Vue: Rapport Audit
 * Route: /audits/[id]/report
 * Source: Plan B2 - Parcours démo cliquable
 * SQL: Mode démo = calculé via apiWrapper, Mode prod = table rapports ou calcul
 * API: api.reports.getByAuditId()
 * 
 * Objectif: Afficher rapport complet d'un audit terminé
 * - Résumé audit (dates, auditeur, score)
 * - Tableau des réponses par question
 * - Liste des non-conformités liées
 * - Stats visuelles (conformité, progress)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { DemoBanner } from '@/components/ui/demo-banner'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/loading-states'
import { Alert } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  User,
  MapPin,
  Download
} from 'lucide-react'
import api from '@/src/lib/apiWrapper'
import { formatDate, formatDateTime } from '@/lib/utils/formatters'

export default function AuditReportPage({ params }) {
  const router = useRouter()
  const auditId = params.id

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Générer/récupérer rapport
      const reportData = await api.reports.getByAuditId(auditId)
      
      if (!reportData) {
        setError('Rapport non disponible')
        return
      }

      setReport(reportData)

    } catch (err) {
      console.error('Erreur chargement rapport:', err)
      setError(err.message || 'Impossible de charger le rapport')
    } finally {
      setLoading(false)
    }
  }, [auditId])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // Badge statut
  const getStatusBadge = (status) => {
    const variants = {
      planifie: 'audit-assigned',
      en_cours: 'audit-in-progress',
      termine: 'audit-completed',
      annule: 'audit-draft',
    }
    const labels = {
      planifie: 'Planifié',
      en_cours: 'En cours',
      termine: 'Terminé',
      annule: 'Annulé',
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  // Badge priorité NC
  const getPriorityBadge = (priority) => {
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
    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
  }

  // Rendu valeur réponse
  const formatAnswerValue = (value) => {
    if (value === 'yes') return <span className="text-green-600 font-medium">Oui</span>
    if (value === 'no') return <span className="text-red-600 font-medium">Non</span>
    if (!isNaN(value) && value >= 1 && value <= 5) {
      return <span className="font-medium">{value}/5</span>
    }
    return <span className="text-muted-foreground">{value || '-'}</span>
  }

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Génération du rapport..." />
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
            title="Erreur"
            message={error}
            actionLabel="Retour à l'audit"
            onAction={() => router.push(`/audits/${auditId}`)}
          />
        </AppShell>
      </>
    )
  }

  if (!report) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <EmptyState
            title="Rapport non disponible"
            message="Ce rapport n'existe pas ou n'a pas encore été généré"
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
            title="Rapport d'audit"
            description={`Généré le ${formatDateTime(report.generatedAt)}`}
          >
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled>
                <Download className="h-4 w-4 mr-2" />
                Exporter PDF
              </Button>
              <Link href={`/audits/${auditId}`}>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </Link>
            </div>
          </PageHeader>

          {/* En-tête rapport */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Audit {report.audit.code}
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    {report.audit.template}
                  </CardDescription>
                </div>
                {getStatusBadge(report.audit.statut)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Date planifiée:</span>
                  <span className="font-medium">{formatDate(report.audit.date_planifiee)}</span>
                </div>
                {report.audit.date_debut && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date début:</span>
                    <span className="font-medium">{formatDateTime(report.audit.date_debut)}</span>
                  </div>
                )}
                {report.audit.date_fin && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date fin:</span>
                    <span className="font-medium">{formatDateTime(report.audit.date_fin)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Auditeur:</span>
                  <span className="font-medium">{report.audit.auditeur}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Dépôt:</span>
                  <span className="font-medium">{report.audit.depot || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Zone:</span>
                  <span className="font-medium">{report.audit.zone || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats globales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-3xl font-bold">
                    {report.stats.conformityScore}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Taux de conformité
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-3xl font-bold">
                    {report.stats.answeredQuestions}/{report.stats.totalQuestions}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Questions répondues
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <div className="text-3xl font-bold">
                    {report.stats.nonConformitiesCount}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Non-conformités
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <div className="text-3xl font-bold">
                    {report.stats.criticalNCCount}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    NC critiques
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des réponses */}
          <Card>
            <CardHeader>
              <CardTitle>Réponses détaillées</CardTitle>
              <CardDescription>
                {report.responses.length} réponse(s) enregistrée(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.responses.length === 0 ? (
                <EmptyState
                  title="Aucune réponse"
                  message="Cet audit ne contient pas encore de réponses"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead className="w-[120px]">Réponse</TableHead>
                        <TableHead>Commentaire</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.responses.map((response, index) => (
                        <TableRow key={response.questionId}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{response.questionLabel}</TableCell>
                          <TableCell>{formatAnswerValue(response.value)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {response.comment || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Non-conformités */}
          {report.nonConformities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Non-conformités détectées</CardTitle>
                <CardDescription>
                  {report.nonConformities.length} non-conformité(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.nonConformities.map((nc) => (
                    <div key={nc.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{nc.title}</h4>
                            {getPriorityBadge(nc.priority)}
                            {nc.isAutoGenerated && (
                              <Badge variant="outline" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {nc.description}
                          </p>
                        </div>
                      </div>
                      {nc.deadline && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Échéance: {formatDate(nc.deadline)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message si audit pas terminé */}
          {report.audit.statut !== 'termine' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              Ce rapport est provisoire. L&apos;audit n&apos;est pas encore terminé.
            </Alert>
          )}
        </div>
      </AppShell>
    </>
  )
}
