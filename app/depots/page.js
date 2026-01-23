/**
 * Vue: Liste Dépôts
 * Route: /depots
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.1
 * SQL: Mode démo = mockData.js, Mode prod = table depots
 * RLS: Policy depots_select_all (tous peuvent SELECT)
 * API: mockApi.getDepots()
 * 
 * Objectif: Afficher tous les dépôts avec filtres
 * - Table: code, nom, ville, statut, nb zones
 * - Filtres: statut (active/inactive), ville, recherche texte
 * - Actions: "Nouveau dépôt" (admin/manager), clic ligne → détail
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
import { Input } from '@/components/ui/input'
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
import { Building2, ArrowLeft, Plus, Search } from 'lucide-react'
import mockApi from '@/src/data/mockData'

function DepotsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status')

  const [depots, setDepots] = useState([])
  const [zones, setZones] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Charger dépôts et zones
        const [depotsData, zonesData] = await Promise.all([
          mockApi.getDepots(),
          mockApi.getZones()
        ])

        setDepots(depotsData)
        setZones(zonesData)
      } catch (err) {
        console.error('Erreur chargement dépôts:', err)
        setError('Impossible de charger les dépôts')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Compter zones par dépôt
  const getZoneCount = (depotId) => {
    return zones.filter(z => z.depotId === depotId).length
  }

  // Filtrer dépôts
  let filteredDepots = depots

  // Filtre statut
  if (statusFilter) {
    filteredDepots = filteredDepots.filter(depot => depot.status === statusFilter)
  }

  // Filtre recherche (code, nom, ville)
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredDepots = filteredDepots.filter(depot => 
      depot.code.toLowerCase().includes(query) ||
      depot.name.toLowerCase().includes(query) ||
      depot.city.toLowerCase().includes(query)
    )
  }

  // Badge statut
  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <Badge variant="success">Actif</Badge>
    }
    return <Badge variant="secondary">Inactif</Badge>
  }

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <PageHeader
            title="Dépôts"
            description="Gestion des dépôts et entrepôts"
          />
          <TableSkeleton rows={5} cols={5} />
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
            title="Dépôts"
            description={`${depots.length} dépôt${depots.length > 1 ? 's' : ''} enregistré${depots.length > 1 ? 's' : ''}`}
          >
            <div className="flex gap-2">
              <Link href="/demo">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au dashboard
                </Button>
              </Link>
              {/* Bouton création (visible uniquement en mode prod avec droits admin/manager) */}
              {/* <Link href="/depots/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau dépôt
                </Button>
              </Link> */}
            </div>
          </PageHeader>

          {/* Filtres et recherche */}
          <Card className="p-4">
            <div className="space-y-4">
              {/* Recherche */}
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par code, nom ou ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>

              {/* Filtres statut */}
              <div className="flex flex-wrap gap-2">
                <Link href="/depots">
                  <Button 
                    variant={!statusFilter ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Tous ({depots.length})
                  </Button>
                </Link>
                <Link href="/depots?status=active">
                  <Button 
                    variant={statusFilter === 'active' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Actifs ({depots.filter(d => d.status === 'active').length})
                  </Button>
                </Link>
                <Link href="/depots?status=inactive">
                  <Button 
                    variant={statusFilter === 'inactive' ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Inactifs ({depots.filter(d => d.status === 'inactive').length})
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Table dépôts */}
          {filteredDepots.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Aucun dépôt"
              message={
                searchQuery || statusFilter
                  ? "Aucun dépôt ne correspond aux critères de recherche"
                  : "Aucun dépôt n'a été créé"
              }
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Zones</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepots.map((depot) => {
                    const zoneCount = getZoneCount(depot.id)

                    return (
                      <TableRow 
                        key={depot.id} 
                        clickable
                        onClick={() => router.push(`/depots/${depot.id}`)}
                      >
                        <TableCell>
                          <div className="font-mono font-medium">{depot.code}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{depot.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {depot.address}
                          </div>
                        </TableCell>
                        <TableCell>
                          {depot.city}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{zoneCount} zone{zoneCount > 1 ? 's' : ''}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(depot.status)}
                        </TableCell>
                        <TableCell>
                          {formatDate(depot.createdAt)}
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

export default function DepotsPage() {
  return (
    <Suspense fallback={
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement des dépôts" />
        </AppShell>
      </>
    }>
      <DepotsContent />
    </Suspense>
  )
}
