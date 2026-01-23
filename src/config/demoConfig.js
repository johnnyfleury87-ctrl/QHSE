/**
 * Configuration Démo/Prod - Source de vérité unique
 * 
 * Ce fichier détermine si l'application fonctionne en mode Démo ou Production.
 * 
 * Mode Démo (DEMO_MODE=true):
 * - Aucun appel réseau
 * - Aucun import supabaseClient
 * - Données mockées (mockData.js)
 * - Auth simulée (demoAuth.js + localStorage)
 * 
 * Mode Production (DEMO_MODE=false):
 * - Auth Supabase active
 * - Database PostgreSQL + RLS
 * - Storage Supabase
 */

import { logEnvDiagnostic } from '@/lib/env-diagnostic';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const APP_CONFIG = {
  name: 'QHSE Audit Manager',
  version: '1.0.0',
  demoMode: DEMO_MODE,
  
  // Informations affichées dans l'UI si mode démo
  demoBanner: {
    enabled: DEMO_MODE,
    message: 'Mode Démo - Aucune donnée réelle',
    color: 'info', // info, warning, etc.
  },
};

// Log du mode au chargement
if (typeof window !== 'undefined') {
  logEnvDiagnostic('demoConfig-client');
} else {
  logEnvDiagnostic('demoConfig-server');
}
