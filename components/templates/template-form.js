/**
 * Composant: Formulaire Template d'Audit (Création/Édition)
 * Usage: /templates/new, /templates/[id]/edit
 * Source: docs/UI/PLAN_VUES_QHSE.md section F.3 ligne 500-530
 * SQL: Table audit_templates (migration 0002 ligne 1-50)
 * RLS: audit_templates_insert_admin_manager, audit_templates_update_admin_manager
 * 
 * Champs obligatoires: code, titre, domaine
 * Validation: code format ^[A-Z0-9-]{3,20}$, UNIQUE
 * Statut défaut: brouillon
 * Créateur: auth.uid() auto
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { LoadingState } from '@/components/ui/loading-states'
import { AlertCircle, Save, CheckCircle, X } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function TemplateForm({ template = null, mode = 'create' }) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  // Form state
  const [formData, setFormData] = useState({
    code: template?.code || '',
    titre: template?.titre || '',
    domaine: template?.domaine || 'securite',
    description: template?.description || '',
    statut: template?.statut || 'brouillon',
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Validation helpers
  const validateCode = (code) => {
    if (!code) return 'Le code est obligatoire'
    if (code.length < 3 || code.length > 20) return 'Le code doit contenir entre 3 et 20 caractères'
    if (!/^[A-Z0-9-]+$/.test(code)) return 'Le code doit contenir uniquement des majuscules, chiffres et tirets'
    return null
  }

  const validateRequired = (value, fieldName) => {
    if (!value || value.trim() === '') return `${fieldName} est obligatoire`
    return null
  }

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Uppercase auto pour le code
    const finalValue = name === 'code' ? value.toUpperCase() : value

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
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

  // Validate all fields
  const validateForm = () => {
    const newErrors = {}

    // Code obligatoire + format
    const codeError = validateCode(formData.code)
    if (codeError) newErrors.code = codeError

    // Titre obligatoire
    const titreError = validateRequired(formData.titre, 'Le titre')
    if (titreError) newErrors.titre = titreError

    // Domaine obligatoire
    if (!formData.domaine) {
      newErrors.domaine = 'Le domaine est obligatoire'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit (brouillon)
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const templateData = {
        code: formData.code,
        titre: formData.titre,
        domaine: formData.domaine,
        description: formData.description || null,
        statut: 'brouillon', // Toujours brouillon pour submit normal
      }

      if (isEdit) {
        // UPDATE existant
        await mockApi.updateTemplate(template.id, templateData)
      } else {
        // INSERT nouveau
        await mockApi.createTemplate(templateData)
      }

      // Redirection vers liste templates
      router.push('/templates')
    } catch (error) {
      console.error('Erreur sauvegarde template:', error)
      
      // Gestion erreur UNIQUE constraint (code)
      if (error.message?.includes('unique') || error.message?.includes('duplicate') || error.message?.includes('existe déjà')) {
        setErrors(prev => ({
          ...prev,
          code: 'Ce code existe déjà'
        }))
        setSubmitError('Un template avec ce code existe déjà')
      } else {
        setSubmitError(error.message || 'Erreur lors de la sauvegarde')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle submit actif (active le template)
  const handleSubmitActif = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const templateData = {
        code: formData.code,
        titre: formData.titre,
        domaine: formData.domaine,
        description: formData.description || null,
        statut: 'actif', // Activation directe
      }

      if (isEdit) {
        await mockApi.updateTemplate(template.id, templateData)
      } else {
        await mockApi.createTemplate(templateData)
      }

      router.push('/templates')
    } catch (error) {
      console.error('Erreur activation template:', error)
      
      if (error.message?.includes('unique') || error.message?.includes('duplicate') || error.message?.includes('existe déjà')) {
        setErrors(prev => ({
          ...prev,
          code: 'Ce code existe déjà'
        }))
        setSubmitError('Un template avec ce code existe déjà')
      } else {
        setSubmitError(error.message || 'Erreur lors de l&apos;activation')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    router.push('/templates')
  }

  if (isSubmitting) {
    return <LoadingState message={`${isEdit ? 'Mise à jour' : 'Création'} du template...`} />
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? 'Modifier le template' : 'Nouveau template d\'audit'}
          </CardTitle>
          <CardDescription>
            {isEdit 
              ? 'Modifiez les informations du template' 
              : 'Créez un nouveau template d\'audit (brouillon ou actif)'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Erreur globale */}
          {submitError && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <div>
                <p className="font-medium">Erreur</p>
                <p className="text-sm">{submitError}</p>
              </div>
            </Alert>
          )}

          {/* Section Informations principales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations principales</h3>

            {/* Code */}
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Code <span className="text-red-500">*</span>
              </label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="AUD-SEC-01"
                maxLength={20}
                error={errors.code}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code}</p>
              )}
              <p className="text-sm text-muted-foreground">
                3 à 20 caractères, majuscules/chiffres/tirets uniquement (ex: AUD-SEC-01)
              </p>
            </div>

            {/* Titre */}
            <div className="space-y-2">
              <label htmlFor="titre" className="text-sm font-medium">
                Titre <span className="text-red-500">*</span>
              </label>
              <Input
                id="titre"
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                placeholder="Audit Sécurité Standard"
                maxLength={200}
                error={errors.titre}
              />
              {errors.titre && (
                <p className="text-sm text-red-500">{errors.titre}</p>
              )}
            </div>

            {/* Domaine */}
            <div className="space-y-2">
              <label htmlFor="domaine" className="text-sm font-medium">
                Domaine <span className="text-red-500">*</span>
              </label>
              <select
                id="domaine"
                name="domaine"
                value={formData.domaine}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-md border ${
                  errors.domaine ? 'border-red-500' : 'border-input'
                } bg-background`}
              >
                <option value="securite">Sécurité</option>
                <option value="qualite">Qualité</option>
                <option value="hygiene">Hygiène</option>
                <option value="environnement">Environnement</option>
                <option value="global">Global (multi-domaines)</option>
              </select>
              {errors.domaine && (
                <p className="text-sm text-red-500">{errors.domaine}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description détaillée du template (objectifs, périmètre, etc.)"
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2 rounded-md border border-input bg-background resize-none"
              />
              <p className="text-sm text-muted-foreground">
                {formData.description.length}/1000 caractères
              </p>
            </div>

            {/* Info version (si édition) */}
            {isEdit && template && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <div>
                  <p className="text-sm">
                    <strong>Version actuelle:</strong> {template.version || 1}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    La version est auto-incrémentée à chaque modification du template actif
                  </p>
                </div>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Enregistrer (brouillon)' : 'Créer (brouillon)'}
            </Button>
            
            <Button 
              type="button" 
              variant="success" 
              onClick={handleSubmitActif}
              disabled={isSubmitting}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isEdit ? 'Enregistrer et activer' : 'Créer et activer'}
            </Button>

            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </div>

          {/* Info statut */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="text-sm font-medium">
                Statuts template:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                <li><strong>Brouillon:</strong> Template en cours de construction, non utilisable pour audits</li>
                <li><strong>Actif:</strong> Template validé, disponible pour création d&apos;audits</li>
                <li><strong>Archivé:</strong> Template obsolète, conservé pour historique</li>
              </ul>
            </div>
          </Alert>
        </CardContent>
      </Card>
    </form>
  )
}
