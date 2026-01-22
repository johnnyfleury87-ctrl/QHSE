/**
 * API Wrapper - Point d'entrée unique pour toutes les requêtes données
 * 
 * Route automatiquement vers:
 * - mockData.js (mode démo)
 * - supabaseClient.js (mode production)
 * 
 * ✅ TOUS les composants doivent passer par cette API
 * ❌ JAMAIS d'import direct de supabaseClient ou mockData dans les composants
 */

import { DEMO_MODE } from '@/config/demoConfig';

// Import conditionnel selon mode
let dataSource;

if (DEMO_MODE) {
  // Mode démo: utiliser mockData
  const mockDataModule = require('@/data/mockData');
  dataSource = mockDataModule.default;
} else {
  // Mode prod: utiliser Supabase (implémentation à compléter)
  // Pour l'instant, on importe mais on ne l'utilise pas encore
  // const supabaseModule = require('@/lib/supabaseClient');
  // const supabase = supabaseModule.default;
  
  // Placeholder: sera implémenté lors de l'étape 01 (après validation DB schema)
  dataSource = {
    getUsers: async () => { throw new Error('Supabase non implémenté - étape 01 en attente'); },
    getDepots: async () => { throw new Error('Supabase non implémenté - étape 01 en attente'); },
    // ... autres méthodes
  };
}

// ============================================
// API PUBLIQUE (utilisée par les composants)
// ============================================

/**
 * Users
 */
export const getUsers = async () => {
  return dataSource.getUsers();
};

export const getUserById = async (id) => {
  return dataSource.getUserById(id);
};

/**
 * Depots
 */
export const getDepots = async () => {
  return dataSource.getDepots();
};

export const getDepotById = async (id) => {
  return dataSource.getDepotById(id);
};

export const createDepot = async (depotData) => {
  if (DEMO_MODE) {
    // Mode démo: simulation (pas de vrai CRUD)
    console.log('[API Wrapper - Démo] createDepot:', depotData);
    return { id: 'demo-depot-new', ...depotData };
  }
  // TODO: Implémenter Supabase insert
  throw new Error('createDepot non implémenté en prod');
};

export const updateDepot = async (id, depotData) => {
  if (DEMO_MODE) {
    console.log('[API Wrapper - Démo] updateDepot:', id, depotData);
    return { id, ...depotData };
  }
  throw new Error('updateDepot non implémenté en prod');
};

export const deleteDepot = async (id) => {
  if (DEMO_MODE) {
    console.log('[API Wrapper - Démo] deleteDepot:', id);
    return { success: true };
  }
  throw new Error('deleteDepot non implémenté en prod');
};

/**
 * Zones
 */
export const getZones = async () => {
  return dataSource.getZones();
};

export const getZonesByDepot = async (depotId) => {
  return dataSource.getZonesByDepot(depotId);
};

export const getZoneById = async (id) => {
  return dataSource.getZoneById(id);
};

export const createZone = async (zoneData) => {
  if (DEMO_MODE) {
    console.log('[API Wrapper - Démo] createZone:', zoneData);
    return { id: 'demo-zone-new', ...zoneData };
  }
  throw new Error('createZone non implémenté en prod');
};

export const updateZone = async (id, zoneData) => {
  if (DEMO_MODE) {
    console.log('[API Wrapper - Démo] updateZone:', id, zoneData);
    return { id, ...zoneData };
  }
  throw new Error('updateZone non implémenté en prod');
};

export const deleteZone = async (id) => {
  if (DEMO_MODE) {
    console.log('[API Wrapper - Démo] deleteZone:', id);
    return { success: true };
  }
  throw new Error('deleteZone non implémenté en prod');
};

/**
 * Templates
 */
export const getTemplates = async () => {
  return dataSource.getTemplates();
};

export const getTemplateById = async (id) => {
  return dataSource.getTemplateById(id);
};

/**
 * Questions
 */
export const getQuestionsByTemplate = async (templateId) => {
  return dataSource.getQuestionsByTemplate(templateId);
};

/**
 * Audits
 */
export const getAudits = async () => {
  return dataSource.getAudits();
};

export const getAuditById = async (id) => {
  return dataSource.getAuditById(id);
};

export const getAuditsByUser = async (userId) => {
  return dataSource.getAuditsByUser(userId);
};

export const createAudit = async (auditData) => {
  if (DEMO_MODE) {
    console.log('[API Wrapper - Démo] createAudit:', auditData);
    return { id: 'demo-audit-new', ...auditData };
  }
  throw new Error('createAudit non implémenté en prod');
};

/**
 * Responses
 */
export const getResponsesByAudit = async (auditId) => {
  return dataSource.getResponsesByAudit(auditId);
};

export const createResponse = async (responseData) => {
  if (DEMO_MODE) {
    console.log('[API Wrapper - Démo] createResponse:', responseData);
    return { id: 'demo-response-new', ...responseData };
  }
  throw new Error('createResponse non implémenté en prod');
};

/**
 * Non-Conformities
 */
export const getNonConformities = async () => {
  return dataSource.getNonConformities();
};

export const getNonConformityById = async (id) => {
  return dataSource.getNonConformityById(id);
};

export const createNonConformity = async (ncData) => {
  if (DEMO_MODE) {
    console.log('[API Wrapper - Démo] createNonConformity:', ncData);
    return { id: 'demo-nc-new', ...ncData };
  }
  throw new Error('createNonConformity non implémenté en prod');
};

/**
 * Dashboard
 */
export const getDashboardStats = async () => {
  return dataSource.getDashboardStats();
};

// Export par défaut (objet API complet)
const api = {
  // Users
  getUsers,
  getUserById,
  
  // Depots
  getDepots,
  getDepotById,
  createDepot,
  updateDepot,
  deleteDepot,
  
  // Zones
  getZones,
  getZonesByDepot,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  
  // Templates
  getTemplates,
  getTemplateById,
  
  // Questions
  getQuestionsByTemplate,
  
  // Audits
  getAudits,
  getAuditById,
  getAuditsByUser,
  createAudit,
  
  // Responses
  getResponsesByAudit,
  createResponse,
  
  // Non-Conformities
  getNonConformities,
  getNonConformityById,
  createNonConformity,
  
  // Dashboard
  getDashboardStats,
};

export default api;
