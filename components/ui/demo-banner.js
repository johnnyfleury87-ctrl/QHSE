/**
 * Composant: Demo Banner
 * Source: README.md section 15
 * 
 * Bandeau affiché UNIQUEMENT en mode démo SANS session réelle
 * Se cache automatiquement si l'utilisateur est connecté en production
 */

'use client'

import { Play } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export function DemoBanner() {
  const { isDemo, user, loading } = useAuth()

  // 🔍 LOG DIAGNOSTIQUE
  console.log('🎪 DEMO BANNER render:', {
    isDemo,
    hasUser: !!user,
    loading,
    shouldShow: isDemo && !loading
  })

  // Ne pas afficher pendant le chargement
  if (loading) {
    return null
  }

  // ✅ RÈGLE: Afficher uniquement si mode demo ET pas de session réelle
  if (!isDemo || user) {
    console.log('🎪 DEMO BANNER: caché (session réelle ou mode prod)')
    return null
  }

  console.log('🎪 DEMO BANNER: visible (mode démo actif)')

  return (
    <div className="bg-blue-600 text-white px-4 py-2">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <Play className="h-4 w-4" fill="currentColor" />
        <span>MODE DÉMO - Données d&apos;exemple</span>
      </div>
    </div>
  )
}
