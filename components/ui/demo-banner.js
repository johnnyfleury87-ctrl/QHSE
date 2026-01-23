/**
 * Composant: Demo Banner
 * Source: README.md section 15
 * 
 * Bandeau permanent affiché en mode démo pour informer l'utilisateur
 * qu'il utilise des données d'exemple
 */

import { Play } from 'lucide-react'

export function DemoBanner() {
  return (
    <div className="bg-blue-600 text-white px-4 py-2">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <Play className="h-4 w-4" fill="currentColor" />
        <span>MODE DÉMO - Données d&apos;exemple</span>
      </div>
    </div>
  )
}
