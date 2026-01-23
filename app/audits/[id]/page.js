/**
 * Vue: Détail Audit
 * Route: /audits/[id]
 * Source: docs/UI/PLAN_VUES_QHSE.md section G.2
 * SQL: Mode démo = mockData.js, Mode prod = table audits + reponses + non_conformites
 * RLS: Policies audits (admin/manager = tous, auditeurs = assignés uniquement)
 * API: mockApi.getAuditById(), mockApi.getResponsesByAudit(), mockApi.getNonConformities()
 * 
 * Objectif: Afficher détail complet d'un audit
 * - Informations générales (template, depot/zone, auditeur, dates)
 * - Progression (nb réponses / total questions)
 * - Actions: voir questions, voir rapport (si terminé), NC liées
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
import { formatDate, formatDateTime } from '@/lib/utils/formatters'
import { 
  ArrowLeft, 
  ClipboardCheck, 
  MapPin, 
  User, 
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function AuditDetailPage({ params }) {
  const router = useRouter()
  const auditId = params.id

  const [audit, setAudit] = useState(null)
  const [template, setTemplate] = useState(null)
  const [depot, setDepot] = useState(null)
  const [zone, setZone] = useState(null)
  const [user, setUser] = useState(null)
  const [responses, setResponses] = useState([])
  const [questions, setQuestions] = useState([])
  const [nonConformities, setNonConformities] = useState([])
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

        // Charger données liées en parallèle
        const [
          templateData,
          depotData,
          zoneData,
          userData,
          responsesData,
          questionsData,
          allNC
        ] = await Promise.all([
          mockApi.getTemplateById(auditData.templateId),
          mockApi.getDepotById(auditData.depotId),
          mockApi.getZoneById(auditData.zoneId),
          mockApi.getUserById(auditData.assignedTo),
          mockApi.getResponsesByAudit(auditId),
          mockApi.getQuestionsByTemplate(auditData.templateId),
          mockApi.getNonConformities()
        ])

        setTemplate(templateData)
        setDepot(depotData)
        setZone(zoneData)
        setUser(userData)
        setResponses(responsesData)
        setQuestions(questionsData)
        
        // Filtrer NC liées à cet audit
        setNonConformities(allNC.filter(nc => nc.auditId === auditId))

      } catch (err) {
        console.error('Erreur chargement audit:', err)
        setError('Impossible de charger l\'audit')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [auditId])

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement de l&apos;audit" />
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
            actionLabel="Retour à la liste"
            onAction={() => router.push('/audits')}
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

  // Badge statut
  const getStatusBadge = (status) => {
    const variants = {
      assigned: 'audit-assigned',
      in_progress: 'audit-in-progress',
      completed: 'audit-completed',
      draft: 'audit-draft'
    }
    
    const labels = {
      assigned: 'À faire',
      in_progress: 'En cours',
      completed: 'Terminé',
      draft: 'Brouillon'
    }

    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  return (
    <>
      <DemoBanner />
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            title={`Audit ${template?.name || 'N/A'}`}
            description={`ID: ${auditId.slice(0, 12)}`}
          >
            <Link href="/audits">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la liste
              </Button>
            </Link>
          </PageHeader>

          {/* Statut et progression */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Statut</CardTitle>
              </CardHeader>
              <CardContent>
                {getStatusBadge(audit.status)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progressPercent}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {answeredQuestions} / {totalQuestions} questions
                </p>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">NC liées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{nonConformities.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Non-conformités détectées
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Template</div>
                    <div className="text-sm text-muted-foreground">
                      {template?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Type: {template?.type || 'N/A'} • Version: {template?.version || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Localisation</div>
                    <div className="text-sm text-muted-foreground">
                      {depot?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Zone: {zone?.name || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Auditeur</div>
                    <div className="text-sm text-muted-foreground">
                      {user ? `${user.firstName} ${user.lastName}` : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Rôle: {user?.role || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Dates</div>
                    <div className="text-sm text-muted-foreground">
                      Planifié: {formatDate(audit.scheduledDate)}
                    </div>
                    {audit.completedDate && (
                      <div className="text-xs text-muted-foreground">
                        Terminé: {formatDate(audit.completedDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Accéder aux différentes sections de l&apos;audit
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link href={`/audits/${auditId}/realiser`}>
                <Button variant="primary">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Voir les questions ({totalQuestions})
                </Button>
              </Link>

              {audit.status === 'completed' && (
                <Link href={`/audits/${auditId}/rapport`}>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Voir le rapport
                  </Button>
                </Link>
              )}

              {nonConformities.length > 0 && (
                <Link href={`/non-conformites?audit=${auditId}`}>
                  <Button variant="outline">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    NC liées ({nonConformities.length})
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Liste NC si présentes */}
          {nonConformities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Non-conformités détectées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nonConformities.map((nc) => (
                  <Link key={nc.id} href={`/non-conformites/${nc.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={`nc-${nc.priority}`}>
                              {nc.priority}
                            </Badge>
                            <Badge variant={`nc-${nc.status}`}>
                              {nc.status}
                            </Badge>
                          </div>
                          <div className="font-medium">{nc.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {nc.description}
                          </div>
                          {nc.deadline && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Échéance: {formatDate(nc.deadline)}
                            </div>
                          )}
                        </div>
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </AppShell>
    </>
  )
}
