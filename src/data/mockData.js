/**
 * Données Mock - Mode Démo
 * 
 * Contient des données stables et cohérentes pour le mode démo.
 * 
 * Règles:
 * - Données NON aléatoires (pas de faker)
 * - IDs prévisibles (UUID ou numéros fixes)
 * - Relations valides (FK cohérentes)
 * - Couvre tous les cas d'usage métier
 */

// ============================================
// 1. USERS (5 utilisateurs, 1 par rôle)
// ============================================
export const mockUsers = [
  {
    id: 'user-admin-001',
    email: 'admin@qhse-demo.com',
    firstName: 'Admin',
    lastName: 'System',
    role: 'admin_dev',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-manager-001',
    email: 'manager@qhse-demo.com',
    firstName: 'Sophie',
    lastName: 'Durand',
    role: 'qhse_manager',
    status: 'active',
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'user-qh-001',
    email: 'qh.auditor@qhse-demo.com',
    firstName: 'Marie',
    lastName: 'Martin',
    role: 'qh_auditor',
    status: 'active',
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'user-safety-001',
    email: 'safety.auditor@qhse-demo.com',
    firstName: 'Pierre',
    lastName: 'Dubois',
    role: 'safety_auditor',
    status: 'active',
    createdAt: '2026-01-04T00:00:00Z',
  },
  {
    id: 'user-viewer-001',
    email: 'viewer@qhse-demo.com',
    firstName: 'Luc',
    lastName: 'Bernard',
    role: 'viewer',
    status: 'active',
    createdAt: '2026-01-05T00:00:00Z',
  },
];

// ============================================
// 2. DEPOTS (1 dépôt)
// ============================================
export const mockDepots = [
  {
    id: 'depot-001',
    code: 'DEP001',
    name: 'Entrepôt Paris Nord',
    city: 'Paris',
    address: '123 rue de la République, 75018 Paris',
    contactName: 'Jean Dupont',
    contactEmail: 'jean.dupont@depot-paris.com',
    contactPhone: '+33612345678',
    status: 'active',
    createdAt: '2026-01-10T00:00:00Z',
  },
];

// ============================================
// 3. ZONES (2 zones rattachées au dépôt)
// ============================================
export const mockZones = [
  {
    id: 'zone-001',
    depotId: 'depot-001',
    code: 'Z01',
    name: 'Zone stockage principal',
    type: 'warehouse',
    status: 'active',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'zone-002',
    depotId: 'depot-001',
    code: 'QUAI-A',
    name: 'Quai de chargement A',
    type: 'loading',
    status: 'active',
    createdAt: '2026-01-10T10:30:00Z',
  },
];

// ============================================
// 4. TEMPLATES (2 templates: security, quality)
// SQL: audit_templates (code, titre, domaine, version, statut, createur_id)
// ============================================
export const mockTemplates = [
  {
    id: 'template-security-001',
    code: 'AUD-SEC-01',
    titre: 'Audit Sécurité Standard',
    domaine: 'securite',
    version: 1,
    statut: 'actif',
    description: 'Template pour audits sécurité (EPI, formations, signalisation)',
    createurId: 'user-manager-001',
    createdAt: '2026-01-08T00:00:00Z',
    updatedAt: '2026-01-08T00:00:00Z',
  },
  {
    id: 'template-quality-001',
    code: 'AUD-QUAL-01',
    titre: 'Audit Qualité HACCP',
    domaine: 'qualite',
    version: 1,
    statut: 'actif',
    description: 'Template pour audits qualité et hygiène alimentaire',
    createurId: 'user-manager-001',
    createdAt: '2026-01-08T00:00:00Z',
    updatedAt: '2026-01-08T00:00:00Z',
  },
];

// ============================================
// 5. CATEGORIES (regroupements de questions)
// ============================================
export const mockCategories = [
  // Categories template security
  {
    id: 'cat-security-001',
    templateId: 'template-security-001',
    name: 'Equipements de Protection Individuelle',
    order: 1,
  },
  {
    id: 'cat-security-002',
    templateId: 'template-security-001',
    name: 'Signalisation et Balisage',
    order: 2,
  },
  
  // Categories template quality
  {
    id: 'cat-quality-001',
    templateId: 'template-quality-001',
    name: 'Hygiène du Personnel',
    order: 1,
  },
  {
    id: 'cat-quality-002',
    templateId: 'template-quality-001',
    name: 'Traçabilité Produits',
    order: 2,
  },
];

// ============================================
// 6. QUESTIONS (~15 questions)
// ============================================
export const mockQuestions = [
  // Template Security - Catégorie EPI
  {
    id: 'q-security-001',
    categoryId: 'cat-security-001',
    templateId: 'template-security-001',
    label: 'Les EPI sont-ils disponibles en quantité suffisante?',
    type: 'yes_no',
    criticality: 'high',
    order: 1,
  },
  {
    id: 'q-security-002',
    categoryId: 'cat-security-001',
    templateId: 'template-security-001',
    label: 'Les EPI sont-ils conformes aux normes en vigueur?',
    type: 'yes_no',
    criticality: 'critical',
    order: 2,
  },
  {
    id: 'q-security-003',
    categoryId: 'cat-security-001',
    templateId: 'template-security-001',
    label: 'État général des EPI (échelle 1-5)',
    type: 'score_1_5',
    criticality: 'medium',
    order: 3,
  },
  
  // Template Security - Catégorie Signalisation
  {
    id: 'q-security-004',
    categoryId: 'cat-security-002',
    templateId: 'template-security-001',
    label: 'Les issues de secours sont-elles clairement signalées?',
    type: 'yes_no',
    criticality: 'critical',
    order: 1,
  },
  {
    id: 'q-security-005',
    categoryId: 'cat-security-002',
    templateId: 'template-security-001',
    label: 'Les zones dangereuses sont-elles balisées?',
    type: 'yes_no',
    criticality: 'high',
    order: 2,
  },
  {
    id: 'q-security-006',
    categoryId: 'cat-security-002',
    templateId: 'template-security-001',
    label: 'Commentaires sur la signalisation',
    type: 'text',
    criticality: 'low',
    order: 3,
  },
  
  // Template Quality - Catégorie Hygiène
  {
    id: 'q-quality-001',
    categoryId: 'cat-quality-001',
    templateId: 'template-quality-001',
    label: 'Le personnel porte-t-il les vêtements adaptés?',
    type: 'yes_no',
    criticality: 'high',
    order: 1,
  },
  {
    id: 'q-quality-002',
    categoryId: 'cat-quality-001',
    templateId: 'template-quality-001',
    label: 'Les lavabos sont-ils fonctionnels et accessibles?',
    type: 'yes_no',
    criticality: 'critical',
    order: 2,
  },
  {
    id: 'q-quality-003',
    categoryId: 'cat-quality-001',
    templateId: 'template-quality-001',
    label: 'Évaluation hygiène générale (échelle 1-5)',
    type: 'score_1_5',
    criticality: 'medium',
    order: 3,
  },
  
  // Template Quality - Catégorie Traçabilité
  {
    id: 'q-quality-004',
    categoryId: 'cat-quality-002',
    templateId: 'template-quality-001',
    label: 'Les produits sont-ils correctement étiquetés?',
    type: 'yes_no',
    criticality: 'high',
    order: 1,
  },
  {
    id: 'q-quality-005',
    categoryId: 'cat-quality-002',
    templateId: 'template-quality-001',
    label: 'Les dates de péremption sont-elles visibles?',
    type: 'yes_no',
    criticality: 'critical',
    order: 2,
  },
  {
    id: 'q-quality-006',
    categoryId: 'cat-quality-002',
    templateId: 'template-quality-001',
    label: 'Observations traçabilité',
    type: 'text',
    criticality: 'low',
    order: 3,
  },
  
  // Question température (type number avec rule_config)
  {
    id: 'q-quality-007',
    categoryId: 'cat-quality-002',
    templateId: 'template-quality-001',
    label: 'Température chambre froide (°C)',
    type: 'number',
    criticality: 'critical',
    rule_config: {
      type: 'temperature',
      min: -18,
      max: -15,
      unit: '°C'
    },
    order: 4,
  },
];

// ============================================
// 7. AUDITS (3 audits: planifie, en_cours, termine)
// ============================================
export const mockAudits = [
  // Audit 1: assigné (pas commencé)
  {
    id: 'audit-001',
    templateId: 'template-security-001',
    depotId: 'depot-001',
    zoneId: 'zone-001',
    assignedTo: 'user-safety-001', // Pierre Dubois (safety_auditor)
    status: 'planifie',
    scheduledDate: '2026-02-01',
    completedDate: null,
    reportUrl: null,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  
  // Audit 2: en cours (quelques réponses)
  {
    id: 'audit-002',
    templateId: 'template-quality-001',
    depotId: 'depot-001',
    zoneId: 'zone-002',
    assignedTo: 'user-qh-001', // Marie Martin (qh_auditor)
    status: 'en_cours',
    scheduledDate: '2026-01-20',
    completedDate: null,
    reportUrl: null,
    createdAt: '2026-01-12T00:00:00Z',
    updatedAt: '2026-01-20T14:30:00Z',
  },
  
  // Audit 3: terminé (toutes réponses + rapport)
  {
    id: 'audit-003',
    templateId: 'template-security-001',
    depotId: 'depot-001',
    zoneId: 'zone-001',
    assignedTo: 'user-safety-001',
    status: 'termine',
    scheduledDate: '2026-01-18',
    completedDate: '2026-01-18',
    reportUrl: '/reports/audit-003.pdf',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-18T16:00:00Z',
  },
];

// ============================================
// 8. RESPONSES (réponses audits)
// ============================================
export const mockResponses = [
  // Audit 002 (en_cours): 3 réponses partielles
  {
    id: 'resp-002-001',
    auditId: 'audit-002',
    questionId: 'q-quality-001',
    value: 'yes',
    comment: 'Tenues propres et adaptées',
    photos: [],
    respondedAt: '2026-01-20T14:10:00Z',
  },
  {
    id: 'resp-002-002',
    auditId: 'audit-002',
    questionId: 'q-quality-002',
    value: 'no',
    comment: 'Un lavabo hors service',
    photos: ['/demo-photos/lavabo-hs.jpg'],
    respondedAt: '2026-01-20T14:15:00Z',
  },
  {
    id: 'resp-002-003',
    auditId: 'audit-002',
    questionId: 'q-quality-003',
    value: '4',
    comment: 'Bon niveau général',
    photos: [],
    respondedAt: '2026-01-20T14:20:00Z',
  },
  
  // Audit 003 (termine): toutes les réponses (6 questions template security)
  {
    id: 'resp-003-001',
    auditId: 'audit-003',
    questionId: 'q-security-001',
    value: 'yes',
    comment: 'Stock EPI suffisant',
    photos: [],
    respondedAt: '2026-01-18T10:00:00Z',
  },
  {
    id: 'resp-003-002',
    auditId: 'audit-003',
    questionId: 'q-security-002',
    value: 'no',
    comment: 'Casques non conformes norme EN397',
    photos: ['/demo-photos/casques-nc.jpg'],
    respondedAt: '2026-01-18T10:05:00Z',
  },
  {
    id: 'resp-003-003',
    auditId: 'audit-003',
    questionId: 'q-security-003',
    value: '3',
    comment: 'État moyen, nécessite remplacement',
    photos: [],
    respondedAt: '2026-01-18T10:10:00Z',
  },
  {
    id: 'resp-003-004',
    auditId: 'audit-003',
    questionId: 'q-security-004',
    value: 'yes',
    comment: 'Issues de secours bien signalées',
    photos: [],
    respondedAt: '2026-01-18T10:15:00Z',
  },
  {
    id: 'resp-003-005',
    auditId: 'audit-003',
    questionId: 'q-security-005',
    value: 'yes',
    comment: 'Balisage conforme',
    photos: [],
    respondedAt: '2026-01-18T10:20:00Z',
  },
  {
    id: 'resp-003-006',
    auditId: 'audit-003',
    questionId: 'q-security-006',
    value: '',
    comment: 'RAS, signalisation correcte',
    photos: [],
    respondedAt: '2026-01-18T10:25:00Z',
  },
];

// ============================================
// 9. NON-CONFORMITES (1 NC liée à audit-003)
// ============================================
export const mockNonConformities = [
  {
    id: 'nc-001',
    auditId: 'audit-003',
    responseId: 'resp-003-002', // Question casques non conformes
    depotId: 'depot-001',
    zoneId: 'zone-001',
    title: 'Casques non conformes EN397',
    description: 'Les casques de sécurité ne respectent pas la norme EN397 en vigueur',
    priority: 'critical',
    status: 'ouverte',
    detectedBy: 'user-safety-001',
    assignedTo: 'user-manager-001',
    deadline: '2026-02-15',
    photos: ['/demo-photos/casques-nc.jpg'],
    createdAt: '2026-01-18T10:30:00Z',
    updatedAt: '2026-01-18T10:30:00Z',
  },
];

// ============================================
// 10. DASHBOARD STATS (calculées depuis données)
// ============================================
export const calculateDashboardStats = () => {
  return {
    audits: {
      total: mockAudits.length,
      planifie: mockAudits.filter(a => a.status === 'planifie').length,
      en_cours: mockAudits.filter(a => a.status === 'en_cours').length,
      termine: mockAudits.filter(a => a.status === 'termine').length,
    },
    nonConformities: {
      total: mockNonConformities.length,
      ouverte: mockNonConformities.filter(nc => nc.status === 'ouverte').length,
      en_traitement: mockNonConformities.filter(nc => nc.status === 'en_traitement').length,
      resolue: mockNonConformities.filter(nc => nc.status === 'resolue').length,
      fermee: mockNonConformities.filter(nc => nc.status === 'fermee').length,
      critical: mockNonConformities.filter(nc => nc.priority === 'critical').length,
      high: mockNonConformities.filter(nc => nc.priority === 'high').length,
    },
    conformityRate: 92.5, // Calculé: réponses conformes / total réponses * 100
    overdueNC: 0, // NC avec deadline passée
  };
};

// ============================================
// 11. API MOCK (retours synchrones)
// ============================================
const mockApi = {
  // Users
  getUsers: () => Promise.resolve(mockUsers),
  getUserById: (id) => Promise.resolve(mockUsers.find(u => u.id === id)),
  
  // Depots
  getDepots: () => Promise.resolve(mockDepots),
  getDepotById: (id) => Promise.resolve(mockDepots.find(d => d.id === id)),
  createDepot: (depotData) => {
    // Validation UNIQUE code
    const existingDepot = mockDepots.find(d => d.code === depotData.code);
    if (existingDepot) {
      return Promise.reject(new Error('Un dépôt avec ce code existe déjà'));
    }

    const newDepot = {
      id: `depot-${String(mockDepots.length + 1).padStart(3, '0')}`,
      ...depotData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDepots.push(newDepot);
    return Promise.resolve(newDepot);
  },
  updateDepot: (id, depotData) => {
    const index = mockDepots.findIndex(d => d.id === id);
    if (index === -1) {
      return Promise.reject(new Error('Dépôt introuvable'));
    }

    // Validation UNIQUE code (si modifié)
    if (depotData.code && depotData.code !== mockDepots[index].code) {
      const existingDepot = mockDepots.find(d => d.code === depotData.code && d.id !== id);
      if (existingDepot) {
        return Promise.reject(new Error('Un dépôt avec ce code existe déjà'));
      }
    }

    mockDepots[index] = {
      ...mockDepots[index],
      ...depotData,
      updatedAt: new Date().toISOString(),
    };
    return Promise.resolve(mockDepots[index]);
  },
  
  // Zones
  getZones: () => Promise.resolve(mockZones),
  getZonesByDepot: (depotId) => Promise.resolve(mockZones.filter(z => z.depotId === depotId)),
  getZoneById: (id) => Promise.resolve(mockZones.find(z => z.id === id)),
  createZone: (zoneData) => {
    // Validation UNIQUE (depot_id, code)
    const existingZone = mockZones.find(z => z.depotId === zoneData.depotId && z.code === zoneData.code);
    if (existingZone) {
      return Promise.reject(new Error('Une zone avec ce code existe déjà dans ce dépôt'));
    }

    const newZone = {
      id: `zone-${String(mockZones.length + 1).padStart(3, '0')}`,
      ...zoneData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockZones.push(newZone);
    return Promise.resolve(newZone);
  },
  updateZone: (id, zoneData) => {
    const index = mockZones.findIndex(z => z.id === id);
    if (index === -1) {
      return Promise.reject(new Error('Zone introuvable'));
    }

    // Validation UNIQUE (depot_id, code) si code modifié
    if (zoneData.code && zoneData.code !== mockZones[index].code) {
      const depotId = zoneData.depotId || mockZones[index].depotId;
      const existingZone = mockZones.find(z => 
        z.depotId === depotId && 
        z.code === zoneData.code && 
        z.id !== id
      );
      if (existingZone) {
        return Promise.reject(new Error('Une zone avec ce code existe déjà dans ce dépôt'));
      }
    }

    mockZones[index] = {
      ...mockZones[index],
      ...zoneData,
      updatedAt: new Date().toISOString(),
    };
    return Promise.resolve(mockZones[index]);
  },
  
  // Templates
  getTemplates: () => Promise.resolve(mockTemplates),
  getTemplateById: (id) => Promise.resolve(mockTemplates.find(t => t.id === id)),
  createTemplate: (templateData) => {
    // Validation UNIQUE code
    const existingTemplate = mockTemplates.find(t => t.code === templateData.code);
    if (existingTemplate) {
      return Promise.reject(new Error('Un template avec ce code existe déjà'));
    }

    const newTemplate = {
      id: `template-${String(mockTemplates.length + 1).padStart(3, '0')}`,
      ...templateData,
      version: 1, // Version initiale
      createurId: 'user-manager-001', // Simule auth.uid()
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockTemplates.push(newTemplate);
    return Promise.resolve(newTemplate);
  },
  updateTemplate: (id, templateData) => {
    const index = mockTemplates.findIndex(t => t.id === id);
    if (index === -1) {
      return Promise.reject(new Error('Template introuvable'));
    }

    // Validation UNIQUE code (si modifié)
    if (templateData.code && templateData.code !== mockTemplates[index].code) {
      const existingTemplate = mockTemplates.find(t => t.code === templateData.code && t.id !== id);
      if (existingTemplate) {
        return Promise.reject(new Error('Un template avec ce code existe déjà'));
      }
    }

    // Auto-incrémenter version si passage à "actif"
    let newVersion = mockTemplates[index].version;
    if (templateData.statut === 'actif' && mockTemplates[index].statut === 'brouillon') {
      newVersion = mockTemplates[index].version + 1;
    }

    mockTemplates[index] = {
      ...mockTemplates[index],
      ...templateData,
      version: newVersion,
      updatedAt: new Date().toISOString(),
    };
    return Promise.resolve(mockTemplates[index]);
  },
  
  // Questions
  getQuestionsByTemplate: (templateId) => Promise.resolve(mockQuestions.filter(q => q.templateId === templateId)),
  
  // Audits
  getAudits: () => Promise.resolve(mockAudits),
  getAuditById: (id) => Promise.resolve(mockAudits.find(a => a.id === id)),
  getAuditsByUser: (userId) => Promise.resolve(mockAudits.filter(a => a.assignedTo === userId)),
  createAudit: (auditData) => {
    // Validation: template doit être actif (règle métier G.4)
    const template = mockTemplates.find(t => t.id === auditData.templateId);
    if (!template || template.statut !== 'actif') {
      return Promise.reject(new Error('Le template sélectionné n\'est pas actif'));
    }

    // Validation: auditeur doit être valide (règle métier G.4)
    const auditeur = mockUsers.find(u => u.id === auditData.auditeurId);
    if (!auditeur || !['qh_auditor', 'safety_auditor', 'qhse_manager'].includes(auditeur.role)) {
      return Promise.reject(new Error('L\'auditeur sélectionné n\'est pas valide'));
    }

    // Validation: XOR depot_id / zone_id (contrainte SQL G.4)
    if ((auditData.depotId && auditData.zoneId) || (!auditData.depotId && !auditData.zoneId)) {
      return Promise.reject(new Error('Vous devez sélectionner soit un dépôt, soit une zone (pas les deux)'));
    }

    const newAudit = {
      id: `audit-${String(mockAudits.length + 1).padStart(3, '0')}`,
      templateId: auditData.templateId,
      depotId: auditData.depotId || null,
      zoneId: auditData.zoneId || null,
      auditeurId: auditData.auditeurId,
      status: auditData.statut || 'planifie', // Statut initial G.4
      scheduledDate: auditData.datePrevue,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    mockAudits.push(newAudit);
    return Promise.resolve(newAudit);
  },
  
  // Responses
  getResponsesByAudit: (auditId) => Promise.resolve(mockResponses.filter(r => r.auditId === auditId)),
  
  // Non-Conformities
  getNonConformities: () => Promise.resolve(mockNonConformities),
  getNonConformityById: (id) => Promise.resolve(mockNonConformities.find(nc => nc.id === id)),
  
  // Dashboard - 7 fonctions SQL Étape 04
  dashboard: {
    // KPI 1: Nombre audits terminés sur période
    getAuditsCompleted: (periodDays = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);
      const count = mockAudits.filter(a => 
        a.status === 'termine' && 
        a.completedAt && 
        new Date(a.completedAt) >= cutoffDate
      ).length;
      return Promise.resolve(count);
    },

    // KPI 2: Taux de conformité global
    calculateConformityRate: (periodDays = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);
      const relevantResponses = mockResponses.filter(r => {
        const audit = mockAudits.find(a => a.id === r.auditId);
        return audit && audit.completedAt && new Date(audit.completedAt) >= cutoffDate;
      });
      
      if (relevantResponses.length === 0) return Promise.resolve(0);
      
      const conformCount = relevantResponses.filter(r => r.isCompliant).length;
      const rate = ((conformCount / relevantResponses.length) * 100).toFixed(1);
      return Promise.resolve(parseFloat(rate));
    },

    // KPI 3: Répartition audits par statut (pour donut chart)
    getAuditsByStatus: (depotId = null, zoneId = null, periodDays = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);
      
      let filtered = mockAudits.filter(a => {
        const dateCheck = a.createdAt && new Date(a.createdAt) >= cutoffDate;
        const depotCheck = !depotId || a.depotId === depotId;
        const zoneCheck = !zoneId || a.zoneId === zoneId;
        return dateCheck && depotCheck && zoneCheck;
      });

      const statusCounts = {
        planifie: filtered.filter(a => a.status === 'planifie').length,
        en_cours: filtered.filter(a => a.status === 'en_cours').length,
        termine: filtered.filter(a => a.status === 'termine').length,
        annule: filtered.filter(a => a.status === 'annule').length,
      };

      return Promise.resolve(statusCounts);
    },

    // KPI 4: NC par gravité (pour bar chart)
    getNCByGravity: (depotId = null, periodDays = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);
      
      let filtered = mockNonConformities.filter(nc => {
        const dateCheck = nc.createdAt && new Date(nc.createdAt) >= cutoffDate;
        const depotCheck = !depotId || nc.depotId === depotId;
        return dateCheck && depotCheck;
      });

      const gravityCounts = {
        critique: filtered.filter(nc => nc.gravite === 'critique').length,
        haute: filtered.filter(nc => nc.gravite === 'haute').length,
        moyenne: filtered.filter(nc => nc.gravite === 'moyenne').length,
        faible: filtered.filter(nc => nc.gravite === 'faible').length,
      };

      return Promise.resolve(gravityCounts);
    },

    // KPI 5: Historique 6 mois audits terminés (pour line chart)
    getAuditsHistory6Months: () => {
      const history = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const count = mockAudits.filter(a => {
          if (a.status !== 'termine' || !a.completedAt) return false;
          const completedDate = new Date(a.completedAt);
          return completedDate >= monthDate && completedDate <= monthEnd;
        }).length;

        history.push({
          month: monthDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          count: count,
        });
      }

      return Promise.resolve(history);
    },

    // KPI 6: Top 5 dépôts conformité (optionnel)
    getTop5DepotsConformity: (periodDays = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);
      
      const depotStats = mockDepots.map(depot => {
        const depotAudits = mockAudits.filter(a => 
          a.depotId === depot.id && 
          a.status === 'termine' &&
          a.completedAt &&
          new Date(a.completedAt) >= cutoffDate
        );

        const responses = mockResponses.filter(r => 
          depotAudits.some(a => a.id === r.auditId)
        );

        const conformCount = responses.filter(r => r.isCompliant).length;
        const rate = responses.length > 0 
          ? ((conformCount / responses.length) * 100).toFixed(1) 
          : 0;

        return {
          depotName: depot.name,
          rate: parseFloat(rate),
          auditsCount: depotAudits.length,
        };
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

      return Promise.resolve(depotStats);
    },

    // KPI 7: Top 5 zones NC critiques (optionnel)
    getTop5ZonesCriticalNC: (periodDays = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);
      
      const zoneStats = mockZones.map(zone => {
        const criticalNC = mockNonConformities.filter(nc => 
          nc.zoneId === zone.id &&
          nc.gravite === 'critique' &&
          nc.createdAt &&
          new Date(nc.createdAt) >= cutoffDate
        );

        return {
          zoneName: `${zone.name} (${zone.code})`,
          count: criticalNC.length,
        };
      })
      .filter(z => z.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

      return Promise.resolve(zoneStats);
    },
  },
  
  // Stats simplifiées (legacy, kept for compatibility)
  getDashboardStats: () => Promise.resolve(calculateDashboardStats()),
};

export default mockApi;
