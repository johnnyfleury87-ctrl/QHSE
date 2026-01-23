/**
 * API Wrapper - Point d'entrée unique pour toutes les requêtes données
 * 
 * Route automatiquement vers:
 * - mockData.js (mode démo)
 * - supabaseClient.js (mode production)
 * 
 * ✅ TOUS les composants doivent passer par cette API
 * ❌ JAMAIS d'import direct de supabaseClient ou mockData dans les composants
 * 
 * Structure:
 * - api.users.*
 * - api.depots.*
 * - api.zones.*
 * - api.templates.*
 * - api.questions.*
 * - api.audits.*
 * - api.answers.*
 * - api.nonConformities.*
 * - api.reports.*
 * - api.stats.*
 */

import { DEMO_MODE } from '@/src/config/demoConfig';

// Import conditionnel selon mode
let mockApi;

if (DEMO_MODE) {
  const mockDataModule = require('@/src/data/mockData');
  mockApi = mockDataModule.default;
}

// ============================================
// HELPERS - Gestion état en mémoire (démo)
// ============================================

// État en mémoire pour démo (simule DB)
let demoState = {
  auditsModified: {}, // { auditId: { status, started_at, completed_at } }
  answersStore: {},   // { auditId: { questionId: { value, comment, ... } } }
  ncStore: [],        // [ { id, ... } ]
};

/**
 * Reset demo state (utile pour tests)
 */
export const resetDemoState = () => {
  demoState = {
    auditsModified: {},
    answersStore: {},
    ncStore: [],
  };
};

// ============================================
// API - USERS
// ============================================

const users = {
  getAll: async () => {
    if (DEMO_MODE) return mockApi.getUsers();
    throw new Error('users.getAll non implémenté en prod');
  },
  
  getById: async (id) => {
    if (DEMO_MODE) return mockApi.getUserById(id);
    throw new Error('users.getById non implémenté en prod');
  },
};

// ============================================
// API - DEPOTS
// ============================================

const depots = {
  getAll: async () => {
    if (DEMO_MODE) return mockApi.getDepots();
    throw new Error('depots.getAll non implémenté en prod');
  },
  
  getById: async (id) => {
    if (DEMO_MODE) return mockApi.getDepotById(id);
    throw new Error('depots.getById non implémenté en prod');
  },
  
  create: async (depotData) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] depots.create:', depotData);
      return mockApi.createDepot(depotData);
    }
    throw new Error('depots.create non implémenté en prod');
  },
  
  update: async (id, depotData) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] depots.update:', id, depotData);
      return mockApi.updateDepot(id, depotData);
    }
    throw new Error('depots.update non implémenté en prod');
  },
  
  delete: async (id) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] depots.delete:', id);
      return { success: true };
    }
    throw new Error('depots.delete non implémenté en prod');
  },
};

// ============================================
// API - ZONES
// ============================================

const zones = {
  getAll: async () => {
    if (DEMO_MODE) return mockApi.getZones();
    throw new Error('zones.getAll non implémenté en prod');
  },
  
  getByDepot: async (depotId) => {
    if (DEMO_MODE) return mockApi.getZonesByDepot(depotId);
    throw new Error('zones.getByDepot non implémenté en prod');
  },
  
  getById: async (id) => {
    if (DEMO_MODE) return mockApi.getZoneById(id);
    throw new Error('zones.getById non implémenté en prod');
  },
  
  create: async (zoneData) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] zones.create:', zoneData);
      return mockApi.createZone(zoneData);
    }
    throw new Error('zones.create non implémenté en prod');
  },
  
  update: async (id, zoneData) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] zones.update:', id, zoneData);
      return mockApi.updateZone(id, zoneData);
    }
    throw new Error('zones.update non implémenté en prod');
  },
  
  delete: async (id) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] zones.delete:', id);
      return { success: true };
    }
    throw new Error('zones.delete non implémenté en prod');
  },
};

// ============================================
// API - TEMPLATES
// ============================================

const templates = {
  getAll: async (filters = {}) => {
    if (DEMO_MODE) {
      let templates = await mockApi.getTemplates();
      
      // Filtre: templates actifs uniquement (si demoVisibleOnly=true)
      if (filters.demoVisibleOnly) {
        templates = templates.filter(t => t.statut === 'actif');
      }
      
      return templates;
    }
    throw new Error('templates.getAll non implémenté en prod');
  },
  
  getById: async (id) => {
    if (DEMO_MODE) return mockApi.getTemplateById(id);
    throw new Error('templates.getById non implémenté en prod');
  },
  
  create: async (templateData) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] templates.create:', templateData);
      return mockApi.createTemplate(templateData);
    }
    throw new Error('templates.create non implémenté en prod');
  },
  
  update: async (id, templateData) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] templates.update:', id, templateData);
      return mockApi.updateTemplate(id, templateData);
    }
    throw new Error('templates.update non implémenté en prod');
  },
};

// ============================================
// API - QUESTIONS
// ============================================

const questions = {
  getByTemplateId: async (templateId) => {
    if (DEMO_MODE) return mockApi.getQuestionsByTemplate(templateId);
    throw new Error('questions.getByTemplateId non implémenté en prod');
  },
};

// ============================================
// API - AUDITS
// ============================================

const audits = {
  getAll: async (filters = {}) => {
    if (DEMO_MODE) {
      let audits = await mockApi.getAudits();
      
      // Appliquer modifications en mémoire
      audits = audits.map(audit => {
        if (demoState.auditsModified[audit.id]) {
          return { ...audit, ...demoState.auditsModified[audit.id] };
        }
        return audit;
      });
      
      // Filtres optionnels
      if (filters.status) {
        audits = audits.filter(a => a.status === filters.status);
      }
      if (filters.depotId) {
        audits = audits.filter(a => a.depotId === filters.depotId);
      }
      if (filters.zoneId) {
        audits = audits.filter(a => a.zoneId === filters.zoneId);
      }
      if (filters.assignedTo) {
        audits = audits.filter(a => a.assignedTo === filters.assignedTo);
      }
      
      return audits;
    }
    throw new Error('audits.getAll non implémenté en prod');
  },
  
  getById: async (id) => {
    if (DEMO_MODE) {
      const audit = await mockApi.getAuditById(id);
      if (!audit) return null;
      
      // Appliquer modifications en mémoire
      if (demoState.auditsModified[id]) {
        return { ...audit, ...demoState.auditsModified[id] };
      }
      return audit;
    }
    throw new Error('audits.getById non implémenté en prod');
  },
  
  getByUser: async (userId) => {
    if (DEMO_MODE) return mockApi.getAuditsByUser(userId);
    throw new Error('audits.getByUser non implémenté en prod');
  },
  
  create: async (auditData) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] audits.create:', auditData);
      return mockApi.createAudit(auditData);
    }
    throw new Error('audits.create non implémenté en prod');
  },
  
  /**
   * Démarrer un audit (planifie → en_cours)
   */
  start: async (id) => {
    if (DEMO_MODE) {
      const audit = await mockApi.getAuditById(id);
      if (!audit) throw new Error('Audit introuvable');
      
      if (audit.status !== 'planifie' && !demoState.auditsModified[id]) {
        throw new Error('Seul un audit planifié peut être démarré');
      }
      
      const now = new Date().toISOString();
      demoState.auditsModified[id] = {
        ...demoState.auditsModified[id],
        status: 'en_cours',
        started_at: now,
        updatedAt: now,
      };
      
      console.log('[API Wrapper - Démo] audits.start:', id, '→ en_cours');
      return { ...audit, ...demoState.auditsModified[id] };
    }
    throw new Error('audits.start non implémenté en prod');
  },
  
  /**
   * Terminer un audit (en_cours → termine)
   */
  complete: async (id) => {
    if (DEMO_MODE) {
      const audit = await mockApi.getAuditById(id);
      if (!audit) throw new Error('Audit introuvable');
      
      const currentStatus = demoState.auditsModified[id]?.status || audit.status;
      if (currentStatus !== 'en_cours') {
        throw new Error('Seul un audit en cours peut être terminé');
      }
      
      const now = new Date().toISOString();
      demoState.auditsModified[id] = {
        ...demoState.auditsModified[id],
        status: 'termine',
        completed_at: now,
        updatedAt: now,
      };
      
      console.log('[API Wrapper - Démo] audits.complete:', id, '→ termine');
      return { ...audit, ...demoState.auditsModified[id] };
    }
    throw new Error('audits.complete non implémenté en prod');
  },
};

// ============================================
// API - ANSWERS (Réponses)
// ============================================

const answers = {
  getByAuditId: async (auditId) => {
    if (DEMO_MODE) {
      // Récupérer réponses mock
      let responses = await mockApi.getResponsesByAudit(auditId);
      
      // Fusionner avec réponses en mémoire
      if (demoState.answersStore[auditId]) {
        const memoryAnswers = Object.entries(demoState.answersStore[auditId]).map(([questionId, data]) => ({
          id: `temp-${auditId}-${questionId}`,
          auditId,
          questionId,
          ...data,
        }));
        
        // Remplacer ou ajouter
        const questionIds = new Set(memoryAnswers.map(a => a.questionId));
        responses = [
          ...responses.filter(r => !questionIds.has(r.questionId)),
          ...memoryAnswers,
        ];
      }
      
      return responses;
    }
    throw new Error('answers.getByAuditId non implémenté en prod');
  },
  
  /**
   * Créer ou mettre à jour une réponse (en mémoire pour démo)
   */
  upsert: async ({ audit_id, question_id, value, comment = '', photos = [] }) => {
    if (DEMO_MODE) {
      if (!demoState.answersStore[audit_id]) {
        demoState.answersStore[audit_id] = {};
      }
      
      demoState.answersStore[audit_id][question_id] = {
        value,
        comment,
        photos,
        respondedAt: new Date().toISOString(),
      };
      
      console.log('[API Wrapper - Démo] answers.upsert:', audit_id, question_id, value);
      
      return {
        id: `temp-${audit_id}-${question_id}`,
        auditId: audit_id,
        questionId: question_id,
        value,
        comment,
        photos,
        respondedAt: demoState.answersStore[audit_id][question_id].respondedAt,
      };
    }
    throw new Error('answers.upsert non implémenté en prod');
  },
  
  /**
   * Calculer progression (réponses / total questions)
   */
  getProgress: async (audit_id) => {
    if (DEMO_MODE) {
      const audit = await mockApi.getAuditById(audit_id);
      if (!audit) throw new Error('Audit introuvable');
      
      const questions = await mockApi.getQuestionsByTemplate(audit.templateId);
      const responses = await answers.getByAuditId(audit_id);
      
      return {
        answered_count: responses.length,
        question_count: questions.length,
        percentage: questions.length > 0 
          ? Math.round((responses.length / questions.length) * 100) 
          : 0,
      };
    }
    throw new Error('answers.getProgress non implémenté en prod');
  },
};

// ============================================
// API - NON-CONFORMITES
// ============================================

const nonConformities = {
  getAll: async (filters = {}) => {
    if (DEMO_MODE) {
      let ncs = [...await mockApi.getNonConformities(), ...demoState.ncStore];
      
      // Filtres
      if (filters.status) {
        ncs = ncs.filter(nc => nc.status === filters.status);
      }
      if (filters.priority) {
        ncs = ncs.filter(nc => nc.priority === filters.priority);
      }
      if (filters.audit_id) {
        ncs = ncs.filter(nc => nc.auditId === filters.audit_id);
      }
      
      return ncs;
    }
    throw new Error('nonConformities.getAll non implémenté en prod');
  },
  
  getByAuditId: async (auditId) => {
    if (DEMO_MODE) {
      return nonConformities.getAll({ audit_id: auditId });
    }
    throw new Error('nonConformities.getByAuditId non implémenté en prod');
  },
  
  getById: async (id) => {
    if (DEMO_MODE) return mockApi.getNonConformityById(id);
    throw new Error('nonConformities.getById non implémenté en prod');
  },
  
  create: async (ncData) => {
    if (DEMO_MODE) {
      console.log('[API Wrapper - Démo] nonConformities.create:', ncData);
      return mockApi.createNonConformity(ncData);
    }
    throw new Error('nonConformities.create non implémenté en prod');
  },
  
  /**
   * Créer NC automatique depuis une règle violée
   */
  createFromRule: async ({ audit_id, question_id, severity, title, hint }) => {
    if (DEMO_MODE) {
      const audit = await mockApi.getAuditById(audit_id);
      if (!audit) throw new Error('Audit introuvable');
      
      const nc = {
        id: `nc-auto-${Date.now()}`,
        auditId: audit_id,
        responseId: null, // Pas de responseId car créé depuis rule
        questionId: question_id,
        depotId: audit.depotId,
        zoneId: audit.zoneId,
        title: title,
        description: hint || 'Non-conformité détectée automatiquement',
        priority: severity === 'critical' ? 'critical' : 'high',
        status: 'ouverte',
        detectedBy: audit.assignedTo,
        assignedTo: null,
        deadline: null,
        photos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAutoGenerated: true,
      };
      
      demoState.ncStore.push(nc);
      console.log('[API Wrapper - Démo] nonConformities.createFromRule:', nc.id);
      
      return nc;
    }
    throw new Error('nonConformities.createFromRule non implémenté en prod');
  },
};

// ============================================
// API - REPORTS (Rapports)
// ============================================

const reports = {
  /**
   * Générer/récupérer rapport pour un audit
   */
  getByAuditId: async (audit_id) => {
    if (DEMO_MODE) {
      const audit = await audits.getById(audit_id);
      if (!audit) throw new Error('Audit introuvable');
      
      const template = await mockApi.getTemplateById(audit.templateId);
      const questions = await mockApi.getQuestionsByTemplate(audit.templateId);
      const responses = await answers.getByAuditId(audit_id);
      const ncs = await nonConformities.getByAuditId(audit_id);
      const progress = await answers.getProgress(audit_id);
      
      // Calcul score conformité
      const conformResponses = responses.filter(r => {
        // Logique simple: yes=conforme, no/valeur basse=non conforme
        if (r.value === 'yes') return true;
        if (r.value === 'no') return false;
        if (typeof r.value === 'number') return r.value >= 3;
        return true; // Neutre pour texte
      });
      
      const conformityScore = responses.length > 0
        ? Math.round((conformResponses.length / responses.length) * 100)
        : 0;
      
      // Rapport "snapshot" calculé
      const report = {
        id: `report-${audit_id}`,
        auditId: audit_id,
        audit: {
          code: audit.id,
          template: template.titre,
          depot: audit.depotId,
          zone: audit.zoneId,
          auditeur: audit.assignedTo,
          date_planifiee: audit.scheduledDate,
          date_debut: audit.started_at || demoState.auditsModified[audit_id]?.started_at,
          date_fin: audit.completed_at || demoState.auditsModified[audit_id]?.completed_at,
          statut: demoState.auditsModified[audit_id]?.status || audit.status,
        },
        stats: {
          progress: progress.percentage,
          conformityScore,
          totalQuestions: questions.length,
          answeredQuestions: responses.length,
          nonConformitiesCount: ncs.length,
          criticalNCCount: ncs.filter(nc => nc.priority === 'critical').length,
        },
        responses: responses.map(r => {
          const question = questions.find(q => q.id === r.questionId);
          return {
            questionId: r.questionId,
            questionLabel: question?.label || 'Question inconnue',
            value: r.value,
            comment: r.comment,
            photos: r.photos,
          };
        }),
        nonConformities: ncs,
        generatedAt: new Date().toISOString(),
      };
      
      console.log('[API Wrapper - Démo] reports.getByAuditId:', audit_id);
      return report;
    }
    throw new Error('reports.getByAuditId non implémenté en prod');
  },
};

// ============================================
// API - STATS (Dashboard)
// ============================================

const stats = {
  getDashboard: async () => {
    if (DEMO_MODE) {
      // Utiliser les fonctions dashboard de mockApi
      return mockApi.getDashboardStats();
    }
    throw new Error('stats.getDashboard non implémenté en prod');
  },
  
  // Fonctions avancées dashboard (KPIs)
  getAuditsCompleted: async (periodDays = 30) => {
    if (DEMO_MODE) return mockApi.dashboard.getAuditsCompleted(periodDays);
    throw new Error('stats.getAuditsCompleted non implémenté en prod');
  },
  
  calculateConformityRate: async (periodDays = 30) => {
    if (DEMO_MODE) return mockApi.dashboard.calculateConformityRate(periodDays);
    throw new Error('stats.calculateConformityRate non implémenté en prod');
  },
  
  getAuditsByStatus: async (depotId = null, zoneId = null, periodDays = 30) => {
    if (DEMO_MODE) return mockApi.dashboard.getAuditsByStatus(depotId, zoneId, periodDays);
    throw new Error('stats.getAuditsByStatus non implémenté en prod');
  },
  
  getNCByGravity: async (depotId = null, periodDays = 30) => {
    if (DEMO_MODE) return mockApi.dashboard.getNCByGravity(depotId, periodDays);
    throw new Error('stats.getNCByGravity non implémenté en prod');
  },
  
  getAuditsHistory6Months: async () => {
    if (DEMO_MODE) return mockApi.dashboard.getAuditsHistory6Months();
    throw new Error('stats.getAuditsHistory6Months non implémenté en prod');
  },
  
  getTop5DepotsConformity: async (periodDays = 30) => {
    if (DEMO_MODE) return mockApi.dashboard.getTop5DepotsConformity(periodDays);
    throw new Error('stats.getTop5DepotsConformity non implémenté en prod');
  },
  
  getTop5ZonesCriticalNC: async (periodDays = 30) => {
    if (DEMO_MODE) return mockApi.dashboard.getTop5ZonesCriticalNC(periodDays);
    throw new Error('stats.getTop5ZonesCriticalNC non implémenté en prod');
  },
};

// ============================================
// EXPORT DEFAULT - API Complète
// ============================================

const api = {
  users,
  depots,
  zones,
  templates,
  questions,
  audits,
  answers,
  nonConformities,
  reports,
  stats,
  
  // Utils
  resetDemoState,
};

export default api;

// ============================================
// LEGACY EXPORTS (compatibilité)
// ============================================

export const getUsers = users.getAll;
export const getUserById = users.getById;
export const getDepots = depots.getAll;
export const getDepotById = depots.getById;
export const createDepot = depots.create;
export const updateDepot = depots.update;
export const deleteDepot = depots.delete;
export const getZones = zones.getAll;
export const getZonesByDepot = zones.getByDepot;
export const getZoneById = zones.getById;
export const createZone = zones.create;
export const updateZone = zones.update;
export const deleteZone = zones.delete;
export const getTemplates = templates.getAll;
export const getTemplateById = templates.getById;
export const getQuestionsByTemplate = questions.getByTemplateId;
export const getAudits = audits.getAll;
export const getAuditById = audits.getById;
export const getAuditsByUser = audits.getByUser;
export const createAudit = audits.create;
export const getResponsesByAudit = answers.getByAuditId;
export const createResponse = answers.upsert;
export const getNonConformities = nonConformities.getAll;
export const getNonConformityById = nonConformities.getById;
export const createNonConformity = nonConformities.create;
export const getDashboardStats = stats.getDashboard;
