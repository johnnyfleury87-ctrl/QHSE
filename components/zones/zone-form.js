/**
 * Composant: Formulaire Zone (Création/Édition)
 * Usage: /zones/new, /zones/[id]/edit
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.4 ligne 300-324
 * SQL: Table zones (migration 0001 ligne 102-131)
 * RLS: zones_insert_admin_manager, zones_update_admin_manager
 * 
 * Champs obligatoires: depot_id, code, name, type
 * Contrainte: UNIQUE(depot_id, code) (code unique PAR dépôt)
 * Validations:
 * - Code: 1-20 chars, uppercase auto
 * - Type: ENUM zone_type (warehouse, loading, office, production, cold_storage)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { LoadingState } from '@/components/ui/loading-states'
import { AlertCircle, Save, X } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function ZoneForm({ zone = null, mode = 'create' }) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [depots, setDepots] = useState([])
  const [loadingDepots, setLoadingDepots] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    depotId: zone?.depotId || '',
    code: zone?.code || '',
    name: zone?.name || '',
    type: zone?.type || 'warehouse',
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Charger dépôts
  useEffect(() => {
    const loadDepots = async () => {
      try {
        const depotsData = await mockApi.getDepots()
        setDepots(depotsData.filter(d => d.status === 'active'))
      } catch (err) {
        console.error('Erreur chargement dépôts:', err)
      } finally {
        setLoadingDepots(false)
      }
    }

    loadDepots()
  }, [])

  // Validation helpers
  const validateCode = (code) => {
    if (!code) return 'Le code est obligatoire'
    if (code.length < 1 || code.length > 20) return 'Le code doit contenir entre 1 et 20 caractères'
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

    // Dépôt obligatoire
    if (!formData.depotId) {
      newErrors.depotId = 'Le dépôt est obligatoire'
    }

    // Code obligatoire
    const codeError = validateCode(formData.code)
    if (codeError) newErrors.code = codeError

    // Nom obligatoire
    const nameError = validateRequired(formData.name, 'Le nom')
    if (nameError) newErrors.name = nameError

    // Type obligatoire
    if (!formData.type) {
      newErrors.type = 'Le type est obligatoire'
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
      const zoneData = {
        depotId: formData.depotId,
        code: formData.code,
        name: formData.name,
        type: formData.type,
        status: 'active',
      }

      if (isEdit) {
        // UPDATE existant
        await mockApi.updateZone(zone.id, zoneData)
      } else {
        // INSERT nouveau
        await mockApi.createZone(zoneData)
      }

      // Redirection vers liste zones
      router.push('/zones')
    } catch (error) {
      console.error('Erreur sauvegarde zone:', error)
      
      // Gestion erreur UNIQUE constraint (depot_id, code)
      if (error.message?.includes('unique') || error.message?.includes('duplicate') || error.message?.includes('existe déjà')) {
        setErrors(prev => ({
          ...prev,
          code: 'Ce code existe déjà pour ce dépôt'
        }))
        setSubmitError('Une zone avec ce code existe déjà dans ce dépôt')
      } else {
        setSubmitError(error.message || 'Erreur lors de la sauvegarde')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    router.push('/zones')
  }

  if (loadingDepots) {
    return <LoadingState message="Chargement des dépôts..." />
  }

  if (isSubmitting) {
    return <LoadingState message={`${isEdit ? 'Mise à jour' : 'Création'} de la zone...`} />
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? 'Modifier la zone' : 'Nouvelle zone'}
          </CardTitle>
          <CardDescription>
            {isEdit 
              ? 'Modifiez les informations de la zone' 
              : 'Créez une nouvelle zone dans un dépôt'
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

            {/* Dépôt */}
            <div className="space-y-2">
              <label htmlFor="depotId" className="text-sm font-medium">
                Dépôt <span className="text-red-500">*</span>
              </label>
              <select
                id="depotId"
                name="depotId"
                value={formData.depotId}
                onChange={handleChange}
                disabled={isEdit} // Dépôt non modifiable en édition (contrainte UNIQUE depot_id + code)
                className={`w-full px-3 py-2 rounded-md border ${
                  errors.depotId ? 'border-red-500' : 'border-input'
                } bg-background disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">Sélectionnez un dépôt</option>
                {depots.map(depot => (
                  <option key={depot.id} value={depot.id}>
                    {depot.code} - {depot.name} ({depot.city})
                  </option>
                ))}
              </select>
              {errors.depotId && (
                <p className="text-sm text-red-500">{errors.depotId}</p>
              )}
              {isEdit && (
                <p className="text-sm text-muted-foreground">
                  Le dépôt ne peut pas être modifié après création
                </p>
              )}
            </div>

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
                placeholder="Z01"
                maxLength={20}
                error={errors.code}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code}</p>
              )}
              <p className="text-sm text-muted-foreground">
                1 à 20 caractères, unique par dépôt
              </p>
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nom <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Zone stockage principal"
                maxLength={255}
                error={errors.name}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-md border ${
                  errors.type ? 'border-red-500' : 'border-input'
                } bg-background`}
              >
                <option value="warehouse">Entrepôt (Warehouse)</option>
                <option value="loading">Zone de chargement (Loading)</option>
                <option value="office">Bureau (Office)</option>
                <option value="production">Production</option>
                <option value="cold_storage">Stockage froid (Cold Storage)</option>
              </select>
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Enregistrer' : 'Créer la zone'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
