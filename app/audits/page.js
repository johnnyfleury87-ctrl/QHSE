/**
 * Vue: Liste des Audits
 * Route: /audits
 * Source: docs/UI/PLAN_VUES_QHSE.md section G.1
 * SQL: Mode démo = mockData.js, Mode prod = table audits
 * RLS: Policies audits (admin/manager = tous, auditeurs = assignés uniquement)
 * API: mockApi.getAudits() via apiWrapper
 * 
 * Objectif: Afficher liste des audits avec filtres (statut)
 * Support query params: ?status=planifie|en_cours|termine
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { ClipboardCheck, ArrowLeft, Plus } from 'lucide-react'
import mockApi from '@/src/data/mockData'

function AuditsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status')

  const [audits, setAudits] = useState([])
  const [users, setUsers] = useState([])
  const [depots, setDepots] = useState([])
  const [zones, setZones] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Charger toutes les données nécessaires en parallèle
        const [auditsData, usersData, depotsData, zonesData, templatesData] = await Promise.all([
          mockApi.getAudits(),
          mockApi.getUsers(),
          mockApi.getDepots(),
          mockApi.getZones(),
          mockApi.getTemplates()
        ])

        setAudits(auditsData)
        setUsers(usersData)
        setDepots(depotsData)
        setZones(zonesData)
        setTemplates(templatesData)
      } catch (err) {
        console.error('Erreur chargement audits:', err)
        setError('Impossible de charger les audits')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filtrer audits selon query param
  const filteredAudits = statusFilter
    ? audits.filter(audit => audit.status === statusFilter)
    : audits

  // Helper pour obtenir les infos liées
  const getUser = (userId) => users.find(u => u.id === userId)
  const getDepot = (depotId) => depots.find(d => d.id === depotId)
  const getZone = (zoneId) => zones.find(z => z.id === zoneId)
  const getTemplate = (templateId) => templates.find(t => t.id === templateId)

  // Badge statut
  const getStatusBadge = (status) => {
    const variants = {
      planifie: 'audit-assigned',
      en_cours: 'audit-in-progress',
      termine: 'audit-completed',
      brouillon: 'audit-draft',
      annule: 'audit-draft'
    }
    
    const labels = {
      planifie: 'À faire',
      en_cours: 'En cours',
      termine: 'Terminé',
      brouillon: 'Brouillon',
      annule: 'Annulé'
    }

    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>
  }

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <PageHeader
            title="Audits"
            description="Liste des audits QHSE"
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
            title="Audits"
            description={
              statusFilter 
                ? `Audits filtrés par statut: ${statusFilter}`
                : "Liste complète des audits QHSE"
            }
          >
            <div className="flex items-center gap-2">
              <Link href="/audits/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel audit
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </Link>
            </div>
          </PageHeader>

          {/* Filtres rapides */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              <Link href="/audits">
                <Button 
                  variant={!statusFilter ? 'primary' : 'outline'}
                  size="sm"
                >
                  Tous ({audits.length})
                </Button>
              </Link>
              <Link href="/audits?status=planifie">
                <Button 
                  variant={statusFilter === 'planifie' ? 'primary' : 'outline'}
                  size="sm"
                >
                  À faire ({audits.filter(a => a.status === 'planifie').length})
                </Button>
              </Link>
              <Link href="/audits?status=en_cours">
                <Button 
                  variant={statusFilter === 'en_cours' ? 'primary' : 'outline'}
                  size="sm"
                >
                  En cours ({audits.filter(a => a.status === 'en_cours').length})
                </Button>
              </Link>
              <Link href="/audits?status=termine">
                <Button 
                  variant={statusFilter === 'termine' ? 'primary' : 'outline'}
                  size="sm"
                >
                  Terminés ({audits.filter(a => a.status === 'termine').length})
                </Button>
              </Link>
            </div>
          </Card>

          {/* Table audits */}
          {filteredAudits.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Aucun audit"
              message={
                statusFilter
                  ? `Aucun audit avec le statut "${statusFilter}"`
                  : "Aucun audit n'a été créé"
              }
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Dépôt / Zone</TableHead>
                    <TableHead>Auditeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date planifiée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.map((audit) => {
                    const user = getUser(audit.assignedTo)
                    const depot = getDepot(audit.depotId)
                    const zone = getZone(audit.zoneId)
                    const template = getTemplate(audit.templateId)

                    return (
                      <TableRow 
                        key={audit.id} 
                        clickable
                        onClick={() => router.push(`/audits/${audit.id}`)}
                      >
                        <TableCell className="font-mono text-sm">
                          {audit.id.slice(0, 12)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{template?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {template?.type || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{depot?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {zone?.name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user ? `${user.firstName} ${user.lastName}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(audit.status)}
                        </TableCell>
                        <TableCell>
                          {formatDate(audit.scheduledDate)}
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

export default function AuditsPage() {
  return (
    <Suspense fallback={
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement des audits" />
        </AppShell>
      </>
    }>
      <AuditsContent />
    </Suspense>
  )
}
