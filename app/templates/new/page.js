/**
 * Page: Création Template d'Audit
 * Route: /templates/new
 * Source: docs/UI/PLAN_VUES_QHSE.md section F.3 ligne 500-530
 * RLS: audit_templates_insert_admin_manager (admin + manager uniquement)
 * 
 * Utilise TemplateForm en mode "create"
 */

import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import TemplateForm from '@/components/templates/template-form'
import { LoadingState } from '@/components/ui/loading-states'

export const metadata = {
  title: 'Nouveau template | QHSE',
  description: 'Créer un nouveau template d\'audit'
}

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Nouveau template d'audit"
        description="Créez un nouveau template pour vos audits QHSE"
        backLink="/templates"
        backLabel="Retour aux templates"
      />

      <Suspense fallback={<LoadingState message="Chargement du formulaire..." />}>
        <TemplateForm mode="create" />
      </Suspense>
    </div>
  )
}
