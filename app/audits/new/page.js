/**
 * Vue: Création Audit
 * Route: /audits/new
 * Source: docs/UI/PLAN_VUES_QHSE.md section G.4 lignes 459-477
 * SQL: Table audits (migration 0002 lignes 243-286)
 * RLS: Policy audits_insert_admin_manager
 * Rôles autorisés: admin_dev, qhse_manager
 * 
 * Objectif: Créer un nouvel audit (assigner template + auditeur + localisation)
 * 
 * Champs obligatoires:
 * - template_id (SELECT parmi templates actifs uniquement)
 * - auditeur_id (SELECT parmi profiles rôle = qh_auditor, safety_auditor, qhse_manager)
 * - date_prevue (DATE)
 * - XOR Localisation: soit depot_id, soit zone_id (pas les deux)
 * 
 * Contrainte XOR: (depot_id IS NOT NULL AND zone_id IS NULL) OR (depot_id IS NULL AND zone_id IS NOT NULL)
 * Statut initial: planifie
 * Validations:
 * - Template actif (trigger check_template_active_before_audit)
 * - Auditeur valide (trigger check_valid_auditor_before_audit)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { DemoBanner } from '@/components/ui/demo-banner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/loading-states'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck, AlertCircle, Save, X, Calendar, User, MapPin } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function NewAuditPage() {
  const router = useRouter()

  // Data loading state
  const [templates, setTemplates] = useState([])
  const [auditors, setAuditors] = useState([])
  const [depots, setDepots] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    templateId: '',
    auditeurId: '',
    datePrevue: '',
    locationType: '', // 'depot' ou 'zone'
    depotId: '',
    zoneId: '',
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Charger données nécessaires
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        const [templatesData, usersData, depotsData, zonesData] = await Promise.all([
          mockApi.getTemplates(),
          mockApi.getUsers(),
          mockApi.getDepots(),
          mockApi.getZones()
        ])

        // Filtrer templates actifs uniquement (règle métier PLAN_VUES G.4)
        const activeTemplates = templatesData.filter(t => t.statut === 'actif')
        setTemplates(activeTemplates)

        // Filtrer auditeurs valides: qh_auditor, safety_auditor, qhse_manager (règle métier G.4)
        const validAuditors = usersData.filter(u => 
          ['qh_auditor', 'safety_auditor', 'qhse_manager'].includes(u.role) &&
          u.status === 'active'
        )
        setAuditors(validAuditors)

        setDepots(depotsData)
        setZones(zonesData)
      } catch (err) {
        console.error('Erreur chargement données formulaire:', err)
        setLoadError('Impossible de charger les données nécessaires')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error pour ce champ
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle location type change (reset depot/zone)
  const handleLocationTypeChange = (e) => {
    const newType = e.target.value
    
    setFormData(prev => ({
      ...prev,
      locationType: newType,
      depotId: '',
      zoneId: ''
    }))

    // Clear location errors
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.locationType
      delete newErrors.depotId
      delete newErrors.zoneId
      return newErrors
    })
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    // Template obligatoire
    if (!formData.templateId) {
      newErrors.templateId = 'Le template est obligatoire'
    }

    // Auditeur obligatoire
    if (!formData.auditeurId) {
      newErrors.auditeurId = "L'auditeur est obligatoire"
    }

    // Date prévue obligatoire
    if (!formData.datePrevue) {
      newErrors.datePrevue = 'La date prévue est obligatoire'
    } else {
      // Vérifier date future (recommandé)
      const selectedDate = new Date(formData.datePrevue)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        newErrors.datePrevue = 'La date prévue doit être dans le futur ou aujourd&apos;hui'
      }
    }

    // XOR Localisation (CONTRAINTE CRITIQUE G.4)
    if (!formData.locationType) {
      newErrors.locationType = 'Sélectionnez un type de localisation'
    } else if (formData.locationType === 'depot' && !formData.depotId) {
      newErrors.depotId = 'Sélectionnez un dépôt'
    } else if (formData.locationType === 'zone' && !formData.zoneId) {
      newErrors.zoneId = 'Sélectionnez une zone'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Préparer données audit selon mapping SQL (table audits migration 0002 ligne 243)
      const auditData = {
        templateId: formData.templateId,
        auditeurId: formData.auditeurId,
        datePrevue: formData.datePrevue,
        // XOR: soit depot_id, soit zone_id (contrainte SQL G.4)
        depotId: formData.locationType === 'depot' ? formData.depotId : null,
        zoneId: formData.locationType === 'zone' ? formData.zoneId : null,
        statut: 'planifie', // Statut initial selon G.4
      }

      // INSERT audit via mockApi
      const newAudit = await mockApi.createAudit(auditData)

      // Redirection vers détail audit créé
      router.push(`/audits/${newAudit.id}`)
    } catch (error) {
      console.error('Erreur création audit:', error)
      
      // Gestion erreurs métier
      if (error.message.includes('template')) {
        setSubmitError('Le template sélectionné n\'est pas actif ou est invalide')
      } else if (error.message.includes('auditeur')) {
        setSubmitError('L\'auditeur sélectionné n\'est pas valide')
      } else if (error.message.includes('UNIQUE')) {
        setSubmitError('Un audit identique existe déjà')
      } else {
        setSubmitError('Erreur lors de la création de l\'audit. Veuillez réessayer.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    router.push('/audits')
  }

  // Get template badge
  const getTemplateBadge = (domaine) => {
    const variants = {
      securite: 'audit-assigned',
      qualite: 'default',
      hygiene: 'audit-in-progress',
      environnement: 'success',
      global: 'secondary'
    }
    return variants[domaine] || 'default'
  }

  // States: loading / error
  if (loading) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <LoadingState message="Chargement du formulaire..." />
        </AppShell>
      </>
    )
  }

  if (loadError) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <ErrorState
            message={loadError}
            action={{
              label: 'Retour aux audits',
              onClick: () => router.push('/audits')
            }}
          />
        </AppShell>
      </>
    )
  }

  // Check disponibilité données
  if (templates.length === 0) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <PageHeader
            title="Nouveau audit"
            description="Créez un nouvel audit en assignant un template et un auditeur"
            icon={ClipboardCheck}
          />
          
          <EmptyState
            icon={ClipboardCheck}
            title="Aucun template actif"
            description="Vous devez d'abord créer et activer au moins un template d'audit."
            action={{
              label: 'Gérer les templates',
              onClick: () => router.push('/templates')
            }}
          />
        </AppShell>
      </>
    )
  }

  if (auditors.length === 0) {
    return (
      <>
        <DemoBanner />
        <AppShell>
          <PageHeader
            title="Nouveau audit"
            description="Créez un nouvel audit en assignant un template et un auditeur"
            icon={ClipboardCheck}
          />
          
          <EmptyState
            icon={User}
            title="Aucun auditeur disponible"
            description="Vous devez d'abord créer au moins un utilisateur auditeur (qh_auditor, safety_auditor)."
            action={{
              label: 'Retour aux audits',
              onClick: () => router.push('/audits')
            }}
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
          title="Nouveau audit"
          description="Créez un nouvel audit en assignant un template et un auditeur"
          icon={ClipboardCheck}
        />

        <div className="mt-6 max-w-3xl">
          {submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">{submitError}</div>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Informations de l&apos;audit</CardTitle>
                <CardDescription>
                  Tous les champs sont obligatoires
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Template */}
                <div className="space-y-2">
                  <label htmlFor="templateId" className="text-sm font-medium">
                    Template d&apos;audit *
                  </label>
                  <select
                    id="templateId"
                    name="templateId"
                    value={formData.templateId}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md bg-background ${
                      errors.templateId ? 'border-destructive' : 'border-input'
                    }`}
                  >
                    <option value="">-- Sélectionner un template --</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        [{template.code}] {template.titre}
                      </option>
                    ))}
                  </select>
                  {errors.templateId && (
                    <p className="text-sm text-destructive">{errors.templateId}</p>
                  )}
                  {formData.templateId && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getTemplateBadge(
                        templates.find(t => t.id === formData.templateId)?.domaine
                      )}>
                        {templates.find(t => t.id === formData.templateId)?.domaine}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Version {templates.find(t => t.id === formData.templateId)?.version}
                      </span>
                    </div>
                  )}
                </div>

                {/* Auditeur */}
                <div className="space-y-2">
                  <label htmlFor="auditeurId" className="text-sm font-medium">
                    Auditeur assigné *
                  </label>
                  <select
                    id="auditeurId"
                    name="auditeurId"
                    value={formData.auditeurId}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md bg-background ${
                      errors.auditeurId ? 'border-destructive' : 'border-input'
                    }`}
                  >
                    <option value="">-- Sélectionner un auditeur --</option>
                    {auditors.map(auditor => (
                      <option key={auditor.id} value={auditor.id}>
                        {auditor.firstName} {auditor.lastName} ({auditor.role})
                      </option>
                    ))}
                  </select>
                  {errors.auditeurId && (
                    <p className="text-sm text-destructive">{errors.auditeurId}</p>
                  )}
                </div>

                {/* Date prévue */}
                <div className="space-y-2">
                  <label htmlFor="datePrevue" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date prévue *
                  </label>
                  <Input
                    id="datePrevue"
                    name="datePrevue"
                    type="date"
                    value={formData.datePrevue}
                    onChange={handleChange}
                    className={errors.datePrevue ? 'border-destructive' : ''}
                  />
                  {errors.datePrevue && (
                    <p className="text-sm text-destructive">{errors.datePrevue}</p>
                  )}
                </div>

                {/* XOR Localisation */}
                <div className="space-y-4 p-4 border rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    <h3 className="text-sm font-medium">Localisation *</h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez soit un dépôt, soit une zone (pas les deux)
                  </p>

                  {/* Type localisation */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type de localisation</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="locationType"
                          value="depot"
                          checked={formData.locationType === 'depot'}
                          onChange={handleLocationTypeChange}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Dépôt</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="locationType"
                          value="zone"
                          checked={formData.locationType === 'zone'}
                          onChange={handleLocationTypeChange}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Zone</span>
                      </label>
                    </div>
                    {errors.locationType && (
                      <p className="text-sm text-destructive">{errors.locationType}</p>
                    )}
                  </div>

                  {/* Select Dépôt */}
                  {formData.locationType === 'depot' && (
                    <div className="space-y-2">
                      <label htmlFor="depotId" className="text-sm font-medium">
                        Dépôt
                      </label>
                      <select
                        id="depotId"
                        name="depotId"
                        value={formData.depotId}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md bg-background ${
                          errors.depotId ? 'border-destructive' : 'border-input'
                        }`}
                      >
                        <option value="">-- Sélectionner un dépôt --</option>
                        {depots.filter(d => d.status === 'active').map(depot => (
                          <option key={depot.id} value={depot.id}>
                            [{depot.code}] {depot.name} - {depot.city}
                          </option>
                        ))}
                      </select>
                      {errors.depotId && (
                        <p className="text-sm text-destructive">{errors.depotId}</p>
                      )}
                    </div>
                  )}

                  {/* Select Zone */}
                  {formData.locationType === 'zone' && (
                    <div className="space-y-2">
                      <label htmlFor="zoneId" className="text-sm font-medium">
                        Zone
                      </label>
                      <select
                        id="zoneId"
                        name="zoneId"
                        value={formData.zoneId}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md bg-background ${
                          errors.zoneId ? 'border-destructive' : 'border-input'
                        }`}
                      >
                        <option value="">-- Sélectionner une zone --</option>
                        {zones.filter(z => z.status === 'active').map(zone => {
                          const depot = depots.find(d => d.id === zone.depotId)
                          return (
                            <option key={zone.id} value={zone.id}>
                              [{zone.code}] {zone.name} ({depot?.name})
                            </option>
                          )
                        })}
                      </select>
                      {errors.zoneId && (
                        <p className="text-sm text-destructive">{errors.zoneId}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Créer audit
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          </form>
        </div>
      </AppShell>
    </>
  )
}
