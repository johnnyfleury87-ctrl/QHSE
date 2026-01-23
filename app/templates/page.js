/**
 * Vue: Liste Templates d'Audit
 * Route: /templates
 * Source: docs/UI/PLAN_VUES_QHSE.md section F.1
 * SQL: Mode démo = mockData.js, Mode prod = table audit_templates
 * RLS: Policy audit_templates_select_all (tous voient templates actifs)
 * API: mockApi.getTemplates()
 * 
 * Objectif: Afficher tous les templates d'audit avec filtres
 * - Table: code, titre, domaine, version, statut, nb questions
 * - Filtres: domaine (securite, qualite, hygiene, environnement, global), statut
 * - Actions: "Nouveau template" (admin/manager), clic ligne → détail
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { DemoBanner } from '@/components/ui/demo-banner'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table'
import { LoadingState, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/loading-states'
import { formatDate } from '@/lib/utils/formatters'
import { FileText, ArrowLeft, Plus } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function TemplatesPage() {
  const router = useRouter()

  const [templates, setTemplates] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [domaineFilter, setDomaineFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active') // Par défaut: templates actifs

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Charger templates et toutes les questions
        const [templatesData, allQuestions] = await Promise.all([
          mockApi.getTemplates(),
          // On charge toutes les questions pour compter par template
          Promise.all([
            mockApi.getQuestionsByTemplate('template-security-001'),
            mockApi.getQuestionsByTemplate('template-quality-001')
          ]).then(results => results.flat())
        ])

        setTemplates(templatesData)
        setQuestions(allQuestions)
      } catch (err) {
        console.error('Erreur chargement templates:', err)
        setError('Impossible de charger les templates')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Compter questions par template
  const getQuestionCount = (templateId) => {
    return questions.filter(q => q.templateId === templateId).length
  }

  // Filtrer templates
  let filteredTemplates = templates

  // Filtre statut
  if (statusFilter) {
    filteredTemplates = filteredTemplates.filter(t => t.status === statusFilter)
  }

  // Filtre domaine (type dans mockData)
  if (domaineFilter) {
    filteredTemplates = filteredTemplates.filter(t => t.type === domaineFilter)
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

  // Stats pour filtres
  const stats = {
    total: templates.length,
    active: templates.filter(t => t.status === 'active').length,
    draft: templates.filter(t => t.status === 'draft').length,
    archive: templates.filter(t => t.status === 'archive').length,
    security: templates.filter(t => t.type === 'security').length,
    quality: templates.filter(t => t.type === 'quality').length,
    hygiene: templates.filter(t => t.type === 'hygiene').length,
    environment: templates.filter(t => t.type === 'environment').length,
  }

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <PageHeader
            title="Templates d&apos;audit"
            description="Gestion des modèles d&apos;audit"
          />
          <TableSkeleton rows={5} cols={6} />
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
            actionLabel="Retour au dashboard"
            onAction={() => router.push('/demo')}
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
            title="Templates d&apos;audit"
            description={`${templates.length} template${templates.length > 1 ? 's' : ''} enregistré${templates.length > 1 ? 's' : ''}`}
          >
            <div className="flex gap-2">
              <Link href="/demo">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au dashboard
                </Button>
              </Link>
              {/* Bouton création (visible uniquement avec droits admin/manager) */}
              {/* <Link href="/templates/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau template
                </Button>
              </Link> */}
            </div>
          </PageHeader>

          {/* Filtres */}
          <Card className="p-4">
            <div className="space-y-4">
              {/* Filtres statut */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Filtrer par statut</div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={!statusFilter ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('')}
                  >
                    Tous ({stats.total})
                  </Button>
                  <Button 
                    variant={statusFilter === 'active' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                  >
                    Actifs ({stats.active})
                  </Button>
                  <Button 
                    variant={statusFilter === 'draft' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('draft')}
                  >
                    Brouillons ({stats.draft})
                  </Button>
                  <Button 
                    variant={statusFilter === 'archive' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('archive')}
                  >
                    Archivés ({stats.archive})
                  </Button>
                </div>
              </div>

              {/* Filtres domaine */}
              <div className="space-y-2 border-t pt-4">
                <div className="text-sm font-medium">Filtrer par domaine</div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={!domaineFilter ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setDomaineFilter('')}
                  >
                    Tous
                  </Button>
                  <Button 
                    variant={domaineFilter === 'security' ? 'danger' : 'outline'}
                    size="sm"
                    onClick={() => setDomaineFilter('security')}
                  >
                    Sécurité ({stats.security})
                  </Button>
                  <Button 
                    variant={domaineFilter === 'quality' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setDomaineFilter('quality')}
                  >
                    Qualité ({stats.quality})
                  </Button>
                  <Button 
                    variant={domaineFilter === 'hygiene' ? 'info' : 'outline'}
                    size="sm"
                    onClick={() => setDomaineFilter('hygiene')}
                  >
                    Hygiène ({stats.hygiene})
                  </Button>
                  <Button 
                    variant={domaineFilter === 'environment' ? 'success' : 'outline'}
                    size="sm"
                    onClick={() => setDomaineFilter('environment')}
                  >
                    Environnement ({stats.environment})
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Table templates */}
          {filteredTemplates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun template"
              message={
                statusFilter || domaineFilter
                  ? "Aucun template ne correspond aux filtres sélectionnés"
                  : "Aucun template n'a été créé"
              }
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Domaine</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const questionCount = getQuestionCount(template.id)

                    return (
                      <TableRow 
                        key={template.id} 
                        clickable
                        onClick={() => router.push(`/templates/${template.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {template.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getDomaineBadge(template.type)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{template.version}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{questionCount} question{questionCount > 1 ? 's' : ''}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(template.status)}
                        </TableCell>
                        <TableCell>
                          {formatDate(template.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </AppShell>
    </>
  )
}
