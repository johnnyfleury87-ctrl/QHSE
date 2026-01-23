/**
 * Vue: Liste Non-Conformités
 * Route: /non-conformites
 * Source: docs/UI/PLAN_VUES_QHSE.md section H.1
 * SQL: Mode démo = mockData.js, Mode prod = table non_conformites
 * RLS: Policies NC (admin/manager = tous, auditeurs = assignés ou créés par eux)
 * API: mockApi.getNonConformities()
 * 
 * Objectif: Afficher liste des NC avec filtres (statut, priorité)
 * Support query params: ?status=open|in_progress|resolved|closed&priority=critical|high|medium|low&audit=[id]
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
import { AlertCircle, ArrowLeft } from 'lucide-react'
import mockApi from '@/src/data/mockData'

function NonConformitesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status')
  const priorityFilter = searchParams.get('priority')
  const auditFilter = searchParams.get('audit')

  const [nonConformities, setNonConformities] = useState([])
  const [audits, setAudits] = useState([])
  const [users, setUsers] = useState([])
  const [depots, setDepots] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Charger toutes les données nécessaires
        const [ncData, auditsData, usersData, depotsData, zonesData] = await Promise.all([
          mockApi.getNonConformities(),
          mockApi.getAudits(),
          mockApi.getUsers(),
          mockApi.getDepots(),
          mockApi.getZones()
        ])

        setNonConformities(ncData)
        setAudits(auditsData)
        setUsers(usersData)
        setDepots(depotsData)
        setZones(zonesData)
      } catch (err) {
        console.error('Erreur chargement NC:', err)
        setError('Impossible de charger les non-conformités')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filtrer NC selon query params
  let filteredNC = nonConformities

  if (statusFilter) {
    filteredNC = filteredNC.filter(nc => nc.status === statusFilter)
  }
  if (priorityFilter) {
    filteredNC = filteredNC.filter(nc => nc.priority === priorityFilter)
  }
  if (auditFilter) {
    filteredNC = filteredNC.filter(nc => nc.auditId === auditFilter)
  }

  // Helpers
  const getAudit = (auditId) => audits.find(a => a.id === auditId)
  const getUser = (userId) => users.find(u => u.id === userId)
  const getDepot = (depotId) => depots.find(d => d.id === depotId)
  const getZone = (zoneId) => zones.find(z => z.id === zoneId)

  // Stats pour filtres
  const stats = {
    total: nonConformities.length,
    open: nonConformities.filter(nc => nc.status === 'open').length,
    inProgress: nonConformities.filter(nc => nc.status === 'in_progress').length,
    resolved: nonConformities.filter(nc => nc.status === 'resolved').length,
    closed: nonConformities.filter(nc => nc.status === 'closed').length,
    critical: nonConformities.filter(nc => nc.priority === 'critical').length,
    high: nonConformities.filter(nc => nc.priority === 'high').length,
    medium: nonConformities.filter(nc => nc.priority === 'medium').length,
    low: nonConformities.filter(nc => nc.priority === 'low').length,
  }

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <PageHeader
            title="Non-conformités"
            description="Liste des non-conformités détectées"
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
            title="Non-conformités"
            description={
              statusFilter || priorityFilter || auditFilter
                ? `NC filtrées (${filteredNC.length} résultat${filteredNC.length > 1 ? 's' : ''})`
                : `Liste complète des non-conformités (${stats.total})`
            }
          >
            <Link href="/demo">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au dashboard
              </Button>
            </Link>
          </PageHeader>

          {/* Filtres par statut */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Filtrer par statut</div>
              <div className="flex flex-wrap gap-2">
                <Link href="/non-conformites">
                  <Button 
                    variant={!statusFilter ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Toutes ({stats.total})
                  </Button>
                </Link>
                <Link href="/non-conformites?status=open">
                  <Button 
                    variant={statusFilter === 'open' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Ouvertes ({stats.open})
                  </Button>
                </Link>
                <Link href="/non-conformites?status=in_progress">
                  <Button 
                    variant={statusFilter === 'in_progress' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    En traitement ({stats.inProgress})
                  </Button>
                </Link>
                <Link href="/non-conformites?status=resolved">
                  <Button 
                    variant={statusFilter === 'resolved' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Résolues ({stats.resolved})
                  </Button>
                </Link>
                <Link href="/non-conformites?status=closed">
                  <Button 
                    variant={statusFilter === 'closed' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Clôturées ({stats.closed})
                  </Button>
                </Link>
              </div>
            </div>

            <div className="border-t mt-4 pt-4 space-y-3">
              <div className="text-sm font-medium">Filtrer par priorité</div>
              <div className="flex flex-wrap gap-2">
                <Link href="/non-conformites?priority=critical">
                  <Button 
                    variant={priorityFilter === 'critical' ? 'danger' : 'outline'}
                    size="sm"
                  >
                    Critique ({stats.critical})
                  </Button>
                </Link>
                <Link href="/non-conformites?priority=high">
                  <Button 
                    variant={priorityFilter === 'high' ? 'warning' : 'outline'}
                    size="sm"
                  >
                    Élevée ({stats.high})
                  </Button>
                </Link>
                <Link href="/non-conformites?priority=medium">
                  <Button 
                    variant={priorityFilter === 'medium' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Moyenne ({stats.medium})
                  </Button>
                </Link>
                <Link href="/non-conformites?priority=low">
                  <Button 
                    variant={priorityFilter === 'low' ? 'secondary' : 'outline'}
                    size="sm"
                  >
                    Faible ({stats.low})
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Table NC */}
          {filteredNC.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="Aucune non-conformité"
              message={
                statusFilter || priorityFilter || auditFilter
                  ? "Aucune non-conformité ne correspond aux filtres sélectionnés"
                  : "Aucune non-conformité n'a été détectée"
              }
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dépôt / Zone</TableHead>
                    <TableHead>Assigné à</TableHead>
                    <TableHead>Échéance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNC.map((nc) => {
                    const audit = getAudit(nc.auditId)
                    const assignedUser = getUser(nc.assignedTo)
                    const depot = getDepot(nc.depotId)
                    const zone = getZone(nc.zoneId)
                    const isOverdue = nc.deadline && new Date(nc.deadline) < new Date()

                    return (
                      <TableRow 
                        key={nc.id} 
                        clickable
                        onClick={() => router.push(`/non-conformites/${nc.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{nc.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {nc.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={`nc-${nc.priority}`}>
                            {nc.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={`nc-${nc.status}`}>
                            {nc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{depot?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {zone?.name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignedUser 
                            ? `${assignedUser.firstName} ${assignedUser.lastName}`
                            : 'Non assigné'
                          }
                        </TableCell>
                        <TableCell>
                          {nc.deadline ? (
                            <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {formatDate(nc.deadline)}
                              {isOverdue && (
                                <div className="text-xs">En retard</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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

export default function NonConformitesPage() {
  return (
    <Suspense fallback={
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement des non-conformités" />
        </AppShell>
      </>
    }>
      <NonConformitesContent />
    </Suspense>
  )
}
