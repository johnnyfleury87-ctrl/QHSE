/**
 * Vue: Création Dépôt
 * Route: /depots/new
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.3 ligne 277-297
 * SQL: Table depots (migration 0001)
 * RLS: Policy depots_insert_admin_manager
 * Rôles autorisés: admin_dev, qhse_manager
 * 
 * Objectif: Créer un nouveau dépôt
 */

'use client'

import { AppShell } from '@/components/layout/app-shell'
import { DemoBanner } from '@/components/ui/demo-banner'
import { PageHeader } from '@/components/layout/page-header'
import DepotForm from '@/components/depots/depot-form'
import { Building2 } from 'lucide-react'

export default function NewDepotPage() {
  return (
    <>
      <DemoBanner />
      <AppShell>
        <PageHeader
          title="Nouveau dépôt"
          description="Créez un nouveau dépôt dans le système QHSE"
          icon={Building2}
        />

        <div className="mt-6">
          <DepotForm mode="create" />
        </div>
      </AppShell>
    </>
  )
}
