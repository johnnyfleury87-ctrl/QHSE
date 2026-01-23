/**
 * Vue: Édition Dépôt
 * Route: /depots/[id]/edit
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.3 ligne 277-297
 * SQL: Table depots (migration 0001)
 * RLS: Policy depots_update_admin_manager
 * Rôles autorisés: admin_dev, qhse_manager
 * 
 * Objectif: Modifier un dépôt existant
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { DemoBanner } from '@/components/ui/demo-banner'
import { PageHeader } from '@/components/layout/page-header'
import DepotForm from '@/components/depots/depot-form'
import { LoadingState, ErrorState } from '@/components/ui/loading-states'
import { Building2 } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function EditDepotPage() {
  const params = useParams()
  const depotId = params.id

  const [depot, setDepot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadDepot = async () => {
      try {
        setLoading(true)
        const depotData = await mockApi.getDepotById(depotId)
        
        if (!depotData) {
          setError('Dépôt introuvable')
          return
        }

        setDepot(depotData)
      } catch (err) {
        console.error('Erreur chargement dépôt:', err)
        setError(err.message || 'Impossible de charger le dépôt')
      } finally {
        setLoading(false)
      }
    }

    loadDepot()
  }, [depotId])

  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement du dépôt..." />
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
            title="Erreur de chargement"
            message={error || 'Dépôt introuvable'}
            actionLabel="Retour aux dépôts"
            onAction={() => window.location.href = '/depots'}
          />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <DemoBanner />
      <AppShell>
        <PageHeader
          title={`Modifier ${depot.code}`}
          description={depot.name}
          icon={Building2}
        />

        <div className="mt-6">
          <DepotForm depot={depot} mode="edit" />
        </div>
      </AppShell>
    </>
  )
}
