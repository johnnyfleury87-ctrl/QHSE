/**
 * Page: Création Zone
 * Route: /zones/new
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.4 ligne 300-324
 * RLS: zones_insert_admin_manager (admin + manager uniquement)
 * 
 * Utilise ZoneForm en mode "create"
 */

import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import ZoneForm from '@/components/zones/zone-form'
import { LoadingState } from '@/components/ui/loading-states'

export const metadata = {
  title: 'Nouvelle zone | QHSE',
  description: 'Créer une nouvelle zone dans un dépôt'
}

export default function NewZonePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Nouvelle zone"
        description="Créez une nouvelle zone dans un dépôt"
        backLink="/zones"
        backLabel="Retour aux zones"
      />

      <Suspense fallback={<LoadingState message="Chargement du formulaire..." />}>
        <ZoneForm mode="create" />
      </Suspense>
    </div>
  )
}
