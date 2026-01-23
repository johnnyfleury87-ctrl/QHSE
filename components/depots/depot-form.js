/**
 * Composant: Formulaire Dépôt (Création/Édition)
 * Usage: /depots/new, /depots/[id]/edit
 * Source: docs/UI/PLAN_VUES_QHSE.md section E.3 ligne 277-297
 * SQL: Table depots (migration 0001 ligne 33-97)
 * RLS: depots_insert_admin_manager, depots_update_admin_manager
 * 
 * Champs obligatoires: code (3-10 chars), name, city, address
 * Champs optionnels: contact_name, contact_email, contact_phone
 * Validations:
 * - Code: uppercase auto (trigger uppercase_depot_code), format ^[A-Z0-9]+$
 * - Email: format valide
 * - Unicité code (contrainte UNIQUE)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { LoadingState } from '@/components/ui/loading-states'
import { AlertCircle, Save, X } from 'lucide-react'
import mockApi from '@/src/data/mockData'

export default function DepotForm({ depot = null, mode = 'create' }) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  // Form state
  const [formData, setFormData] = useState({
    code: depot?.code || '',
    name: depot?.name || '',
    city: depot?.city || '',
    address: depot?.address || '',
    contactName: depot?.contactName || '',
    contactEmail: depot?.contactEmail || '',
    contactPhone: depot?.contactPhone || '',
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Validation helpers
  const validateCode = (code) => {
    if (!code) return 'Le code est obligatoire'
    if (code.length < 3 || code.length > 10) return 'Le code doit contenir entre 3 et 10 caractères'
    if (!/^[A-Z0-9]+$/.test(code)) return 'Le code ne peut contenir que des lettres majuscules et chiffres'
    return null
  }

  const validateEmail = (email) => {
    if (!email) return null // Email optionnel
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return 'Format email invalide'
    return null
  }

  const validateRequired = (value, fieldName) => {
    if (!value || value.trim() === '') return `${fieldName} est obligatoire`
    return null
  }

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Uppercase auto pour le code (comme trigger SQL)
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

    // Champs obligatoires
    const codeError = validateCode(formData.code)
    if (codeError) newErrors.code = codeError

    const nameError = validateRequired(formData.name, 'Le nom')
    if (nameError) newErrors.name = nameError

    const cityError = validateRequired(formData.city, 'La ville')
    if (cityError) newErrors.city = cityError

    const addressError = validateRequired(formData.address, "L'adresse")
    if (addressError) newErrors.address = addressError

    // Champs optionnels avec validation
    if (formData.contactEmail) {
      const emailError = validateEmail(formData.contactEmail)
      if (emailError) newErrors.contactEmail = emailError
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
      const depotData = {
        code: formData.code,
        name: formData.name,
        city: formData.city,
        address: formData.address,
        contactName: formData.contactName || null,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
        status: 'active',
      }

      if (isEdit) {
        // UPDATE existant
        await mockApi.updateDepot(depot.id, depotData)
      } else {
        // INSERT nouveau
        await mockApi.createDepot(depotData)
      }

      // Redirection vers liste dépôts
      router.push('/depots')
    } catch (error) {
      console.error('Erreur sauvegarde dépôt:', error)
      
      // Gestion erreur UNIQUE constraint
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        setErrors(prev => ({
          ...prev,
          code: 'Ce code existe déjà'
        }))
        setSubmitError('Un dépôt avec ce code existe déjà')
      } else {
        setSubmitError(error.message || 'Erreur lors de la sauvegarde')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    router.push('/depots')
  }

  if (isSubmitting) {
    return <LoadingState message={`${isEdit ? 'Mise à jour' : 'Création'} du dépôt...`} />
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? 'Modifier le dépôt' : 'Nouveau dépôt'}
          </CardTitle>
          <CardDescription>
            {isEdit 
              ? 'Modifiez les informations du dépôt' 
              : 'Créez un nouveau dépôt dans le système QHSE'
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
                placeholder="DEP001"
                maxLength={10}
                disabled={isEdit} // Code non modifiable en édition
                error={errors.code}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code}</p>
              )}
              <p className="text-sm text-muted-foreground">
                3 à 10 caractères, lettres majuscules et chiffres uniquement
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
                placeholder="Entrepôt Paris Nord"
                maxLength={255}
                error={errors.name}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Ville */}
            <div className="space-y-2">
              <label htmlFor="city" className="text-sm font-medium">
                Ville <span className="text-red-500">*</span>
              </label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Paris"
                maxLength={100}
                error={errors.city}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city}</p>
              )}
            </div>

            {/* Adresse */}
            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium">
                Adresse <span className="text-red-500">*</span>
              </label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 rue de la République, 75018 Paris"
                error={errors.address}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address}</p>
              )}
            </div>
          </div>

          {/* Section Contact */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Contact (optionnel)</h3>

            {/* Nom contact */}
            <div className="space-y-2">
              <label htmlFor="contactName" className="text-sm font-medium">
                Nom du contact
              </label>
              <Input
                id="contactName"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                placeholder="Jean Dupont"
                maxLength={100}
              />
            </div>

            {/* Email contact */}
            <div className="space-y-2">
              <label htmlFor="contactEmail" className="text-sm font-medium">
                Email du contact
              </label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="jean.dupont@depot.com"
                maxLength={255}
                error={errors.contactEmail}
              />
              {errors.contactEmail && (
                <p className="text-sm text-red-500">{errors.contactEmail}</p>
              )}
            </div>

            {/* Téléphone contact */}
            <div className="space-y-2">
              <label htmlFor="contactPhone" className="text-sm font-medium">
                Téléphone du contact
              </label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="+33612345678"
                maxLength={20}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Enregistrer' : 'Créer le dépôt'}
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
