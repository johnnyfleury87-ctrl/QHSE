/**
 * Page: Édition Template d'Audit
 * Route: /templates/[id]/edit
 * Source: docs/UI/PLAN_VUES_QHSE.md section F.3 ligne 500-530
 * RLS: audit_templates_update_admin_manager (admin + manager uniquement)
 * 
 * Utilise TemplateForm en mode "edit"
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import TemplateForm from '@/components/templates/template-form'
import { LoadingState } from '@/components/ui/loading-states'
import { Alert } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function EditTemplatePage() {
  const params = useParams()
  const templateId = params.id

  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const templateData = await mockApi.getTemplateById(templateId)
        
        if (!templateData) {
          setError('Template non trouvé')
          return
        }

        setTemplate(templateData)
      } catch (err) {
        console.error('Erreur chargement template:', err)
        setError(err.message || 'Erreur lors du chargement du template')
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [templateId])

  if (loading) {
    return <LoadingState message="Chargement du template..." />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Erreur"
          backLink="/templates"
          backLabel="Retour aux templates"
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

  if (!template) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Template non trouvé"
          backLink="/templates"
          backLabel="Retour aux templates"
        />

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-medium">Template non trouvé</p>
            <p className="text-sm">Le template demandé n&apos;existe pas ou a été supprimé.</p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Modifier ${template.code}`}
        description={template.titre}
        backLink="/templates"
        backLabel="Retour aux templates"
      />

      <TemplateForm template={template} mode="edit" />
    </div>
  )
}
