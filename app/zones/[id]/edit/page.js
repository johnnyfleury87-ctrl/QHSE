/**
 * Page: Édition Zone
 * Route: /zones/[id]/edit
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.4 ligne 300-324
 * RLS: zones_update_admin_manager (admin + manager uniquement)
 * 
 * Utilise ZoneForm en mode "edit"
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/layout/page-header'
import ZoneForm from '@/components/zones/zone-form'
import { LoadingState } from '@/components/ui/loading-states'
import { Alert } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function EditZonePage() {
  const params = useParams()
  const zoneId = params.id

  const [zone, setZone] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadZone = async () => {
      try {
        const zoneData = await mockApi.getZoneById(zoneId)
        
        if (!zoneData) {
          setError('Zone non trouvée')
          return
        }

        setZone(zoneData)
      } catch (err) {
        console.error('Erreur chargement zone:', err)
        setError(err.message || 'Erreur lors du chargement de la zone')
      } finally {
        setLoading(false)
      }
    }

    loadZone()
  }, [zoneId])

  if (loading) {
    return <LoadingState message="Chargement de la zone..." />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Erreur"
          backLink="/zones"
          backLabel="Retour aux zones"
        />

        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">Erreur</p>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      </div>
    )
  }

  if (!zone) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Zone non trouvée"
          backLink="/zones"
          backLabel="Retour aux zones"
        />

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">Zone non trouvée</p>
            <p className="text-sm">La zone demandée n'existe pas ou a été supprimée.</p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Modifier ${zone.code}`}
        description={zone.name}
        backLink="/zones"
        backLabel="Retour aux zones"
      />

      <ZoneForm zone={zone} mode="edit" />
    </div>
  )
}
