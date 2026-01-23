/**
 * Vue: Détail Dépôt
 * Route: /depots/[id]
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.2
 * SQL: Mode démo = mockData.js, Mode prod = tables depots + zones + audits
 * RLS: Policies depots + zones + audits
 * API: mockApi.getDepotById(), mockApi.getZonesByDepot(), mockApi.getAudits()
 * 
 * Objectif: Afficher détail dépôt + zones associées + audits
 * - 3 sections: Infos générales, Zones (liste), Audits (liste filtrée)
 * - Actions: Modifier dépôt (admin/manager), Nouvelle zone (admin/manager)
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
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/loading-states'
import { formatDate } from '@/lib/utils/formatters'
import { 
  ArrowLeft, 
  Building2, 
  MapPin,
  User,
  Mail,
  Phone,
  Calendar,
  ClipboardCheck,
  Plus
} from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function DepotDetailPage({ params }) {
  const router = useRouter()
  const depotId = params.id

  const [depot, setDepot] = useState(null)
  const [zones, setZones] = useState([])
  const [audits, setAudits] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Charger dépôt
        const depotData = await mockApi.getDepotById(depotId)
        
        if (!depotData) {
          setError('Dépôt non trouvé')
          return
        }

        setDepot(depotData)

        // Charger zones + audits + templates en parallèle
        const [zonesData, allAudits, templatesData] = await Promise.all([
          mockApi.getZonesByDepot(depotId),
          mockApi.getAudits(),
          mockApi.getTemplates()
        ])

        setZones(zonesData)
        setTemplates(templatesData)
        
        // Filtrer audits liés à ce dépôt
        const depotAudits = allAudits.filter(audit => audit.depotId === depotId)
        setAudits(depotAudits)

      } catch (err) {
        console.error('Erreur chargement dépôt:', err)
        setError('Impossible de charger le dépôt')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [depotId])

  // Helpers
  const getTemplate = (templateId) => templates.find(t => t.id === templateId)

  // Badge statut
  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <Badge variant="success">Actif</Badge>
    }
    return <Badge variant="secondary">Inactif</Badge>
  }

  // Badge type zone
  const getZoneTypeBadge = (type) => {
    const labels = {
      warehouse: 'Entrepôt',
      loading: 'Chargement',
      office: 'Bureau',
      production: 'Production',
      cold_storage: 'Chambre froide'
    }
    return <Badge variant="default">{labels[type] || type}</Badge>
  }

  // Badge statut audit
  const getAuditStatusBadge = (status) => {
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

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement du dépôt" />
        </AppShell>
      </>
    )
  }

  if (error || !depot) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <ErrorState
            title="Erreur"
            message={error || 'Dépôt non trouvé'}
            actionLabel="Retour à la liste"
            onAction={() => router.push('/depots')}
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
            title={depot.name}
            description={`Code: ${depot.code}`}
          >
            <div className="flex gap-2">
              <Link href="/depots">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la liste
                </Button>
              </Link>
              {/* Bouton modification (visible en mode démo, admin/manager en prod) */}
              <Link href={`/depots/${depotId}/edit`}>
                <Button variant="primary">
                  Modifier
                </Button>
              </Link>
            </div>
          </PageHeader>

          {/* Infos générales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informations générales</CardTitle>
                {getStatusBadge(depot.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Code dépôt</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {depot.code}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Localisation</div>
                    <div className="text-sm text-muted-foreground">
                      {depot.city}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {depot.address}
                    </div>
                  </div>
                </div>

                {depot.contactName && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Contact</div>
                      <div className="text-sm text-muted-foreground">
                        {depot.contactName}
                      </div>
                    </div>
                  </div>
                )}

                {depot.contactEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <div className="text-sm text-muted-foreground">
                        {depot.contactEmail}
                      </div>
                    </div>
                  </div>
                )}

                {depot.contactPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Téléphone</div>
                      <div className="text-sm text-muted-foreground">
                        {depot.contactPhone}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Créé le</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(depot.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zones */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Zones ({zones.length})</CardTitle>
                  <CardDescription>
                    Zones rattachées à ce dépôt
                  </CardDescription>
                </div>
                {/* Bouton création zone (admin/manager uniquement) */}
                {/* <Link href={`/zones/new?depot=${depotId}`}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle zone
                  </Button>
                </Link> */}
              </div>
            </CardHeader>
            <CardContent>
              {zones.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Aucune zone"
                  message="Aucune zone n'a été créée pour ce dépôt"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell>
                          <div className="font-mono font-medium">{zone.code}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{zone.name}</div>
                        </TableCell>
                        <TableCell>
                          {getZoneTypeBadge(zone.type)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(zone.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Audits */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audits ({audits.length})</CardTitle>
                  <CardDescription>
                    Audits réalisés dans ce dépôt
                  </CardDescription>
                </div>
                <Link href={`/audits?depot=${depotId}`}>
                  <Button variant="outline" size="sm">
                    Voir tous les audits
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {audits.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="Aucun audit"
                  message="Aucun audit n'a été réalisé dans ce dépôt"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date planifiée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.slice(0, 5).map((audit) => {
                      const template = getTemplate(audit.templateId)
                      const zone = zones.find(z => z.id === audit.zoneId)

                      return (
                        <TableRow 
                          key={audit.id}
                          clickable
                          onClick={() => router.push(`/audits/${audit.id}`)}
                        >
                          <TableCell>
                            <div className="font-medium">{template?.name || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            {zone?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {getAuditStatusBadge(audit.status)}
                          </TableCell>
                          <TableCell>
                            {formatDate(audit.scheduledDate)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  )
}
