/**
 * Vue: Liste Zones
 * Route: /zones
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.4 ligne 300-324
 * SQL: Table zones (migration 0001 ligne 102-131)
 * RLS: Policy zones_select_all (tous peuvent SELECT)
 * API: mockApi.getZones()
 * 
 * Objectif: Afficher toutes les zones avec filtres
 * - Table: code zone, nom, type, dépôt, statut
 * - Filtres: dépôt, type, statut
 * - Actions: "Nouvelle zone" (admin/manager), clic ligne → détail dépôt
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
import { MapPin, ArrowLeft, Plus, Search } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function ZonesPage() {
  const router = useRouter()

  const [zones, setZones] = useState([])
  const [depots, setDepots] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [depotFilter, setDepotFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        const [zonesData, depotsData] = await Promise.all([
          mockApi.getZones(),
          mockApi.getDepots()
        ])

        setZones(zonesData)
        setDepots(depotsData)
      } catch (err) {
        console.error('Erreur chargement zones:', err)
        setError('Impossible de charger les zones')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filtrer zones
  const filteredZones = zones.filter(zone => {
    const matchSearch = !searchQuery || 
      zone.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      zone.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchDepot = depotFilter === 'all' || zone.depotId === depotFilter
    const matchType = typeFilter === 'all' || zone.type === typeFilter
    const matchStatus = statusFilter === 'all' || zone.status === statusFilter

    return matchSearch && matchDepot && matchType && matchStatus
  })

  // Helper pour obtenir dépôt
  const getDepot = (depotId) => depots.find(d => d.id === depotId)

  // Badge statut
  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <Badge variant="success">Actif</Badge>
    }
    return <Badge variant="secondary">Inactif</Badge>
  }

  // Badge type zone
  const getTypeBadge = (type) => {
    const labels = {
      warehouse: 'Entrepôt',
      loading: 'Chargement',
      office: 'Bureau',
      production: 'Production',
      cold_storage: 'Stockage froid'
    }
    
    const colors = {
      warehouse: 'default',
      loading: 'warning',
      office: 'info',
      production: 'primary',
      cold_storage: 'secondary'
    }

    return <Badge variant={colors[type] || 'default'}>{labels[type] || type}</Badge>
  }

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <PageHeader
            title="Zones"
            description="Gestion des zones par dépôt"
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
            title="Zones"
            description={`${zones.length} zone${zones.length > 1 ? 's' : ''} enregistrée${zones.length > 1 ? 's' : ''}`}
          >
            <div className="flex gap-2">
              <Link href="/depots">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour aux dépôts
                </Button>
              </Link>
              {/* Bouton création (visible en mode démo, admin/manager en prod) */}
              <Link href="/zones/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle zone
                </Button>
              </Link>
            </div>
          </PageHeader>

          {/* Filtres et recherche */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex gap-4">
                {/* Recherche */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par code ou nom..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Filtre dépôt */}
                <select
                  value={depotFilter}
                  onChange={(e) => setDepotFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border border-input bg-background"
                >
                  <option value="all">Tous les dépôts</option>
                  {depots.map(depot => (
                    <option key={depot.id} value={depot.id}>
                      {depot.code} - {depot.name}
                    </option>
                  ))}
                </select>

                {/* Filtre type */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border border-input bg-background"
                >
                  <option value="all">Tous les types</option>
                  <option value="warehouse">Entrepôt</option>
                  <option value="loading">Chargement</option>
                  <option value="office">Bureau</option>
                  <option value="production">Production</option>
                  <option value="cold_storage">Stockage froid</option>
                </select>

                {/* Filtre statut */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border border-input bg-background"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>

              {/* Résultats filtrés */}
              <div className="text-sm text-muted-foreground">
                {filteredZones.length} zone{filteredZones.length > 1 ? 's' : ''} trouvée{filteredZones.length > 1 ? 's' : ''}
              </div>
            </div>
          </Card>

          {/* Table zones */}
          <Card>
            {filteredZones.length === 0 ? (
              <EmptyState
                title="Aucune zone trouvée"
                message={
                  searchQuery || depotFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all'
                    ? "Essayez de modifier vos filtres"
                    : "Commencez par créer une zone"
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dépôt</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredZones.map((zone) => {
                    const depot = getDepot(zone.depotId)
                    
                    return (
                      <TableRow key={zone.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{zone.code}</TableCell>
                        <TableCell>{zone.name}</TableCell>
                        <TableCell>{getTypeBadge(zone.type)}</TableCell>
                        <TableCell>
                          {depot ? (
                            <Link 
                              href={`/depots/${depot.id}`}
                              className="text-primary hover:underline"
                            >
                              {depot.code} - {depot.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(zone.status)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/zones/${zone.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Modifier
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </AppShell>
    </>
  )
}
