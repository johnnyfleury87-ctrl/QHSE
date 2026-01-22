# Schéma Base de Données – Rapports & Exports QHSE

## Date
22 janvier 2026

## Vue d'ensemble
Documentation du schéma de données pour la gestion des rapports générés, templates et historique de consultation. Aucune modification des tables existantes, uniquement ajout de nouvelles tables spécifiques rapports.

---

## 📊 TABLES CRÉÉES (3 nouvelles)

### 1. rapport_templates

**Objectif**: Stocker les modèles de rapports versionés (structure sections, configuration).

**Schéma**:
```sql
CREATE TABLE rapport_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    type VARCHAR(50) NOT NULL CHECK (type IN ('audit_complet', 'synthese_nc', 'conformite_globale')),
    version VARCHAR(10) NOT NULL DEFAULT '1.0',
    nom VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Structure JSON
    structure_json JSONB NOT NULL,
    -- Exemple structure:
    -- {
    --   "sections": [
    --     {"id": "header", "title": "En-tête", "required": true},
    --     {"id": "metadata", "title": "Métadonnées", "required": true}
    --   ],
    --   "calculations": ["conformity_rate", "nc_count"],
    --   "charts": ["conformity_by_section"]
    -- }
    
    -- Configuration
    active BOOLEAN NOT NULL DEFAULT true,
    default_format VARCHAR(20) CHECK (default_format IN ('pdf', 'markdown', 'excel')),
    
    -- Métadonnées
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Contraintes métier
    CONSTRAINT unique_template_type_version UNIQUE (type, version)
);

-- Indexes performance
CREATE INDEX idx_templates_type_active ON rapport_templates(type, active);
CREATE INDEX idx_templates_created_at ON rapport_templates(created_at DESC);

-- Commentaires
COMMENT ON TABLE rapport_templates IS 'Templates rapports versionés définissant structure et sections';
COMMENT ON COLUMN rapport_templates.structure_json IS 'Configuration JSON sections, calculs et charts du rapport';
```

**Volumétrie**: ~20 templates (3 types × versions), croissance lente.

---

### 2. rapports_generes

**Objectif**: Table centrale stockant métadonnées de tous rapports générés (audit, NC, exports).

**Schéma**:
```sql
CREATE TABLE rapports_generes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification unique
    code_rapport VARCHAR(16) NOT NULL UNIQUE,
    -- Format: RAPyyyymm-NNNN (ex: RAP202601-0042)
    
    -- Type et format
    type_rapport VARCHAR(50) NOT NULL CHECK (type_rapport IN ('audit_complet', 'synthese_nc', 'conformite_globale', 'export_audits', 'export_nc', 'export_conformite')),
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'markdown', 'excel')),
    
    -- Relations
    template_id UUID REFERENCES rapport_templates(id) ON DELETE RESTRICT,
    audit_id UUID REFERENCES audits(id) ON DELETE RESTRICT,
    -- audit_id obligatoire uniquement pour type 'audit_complet'
    
    -- Versionning
    version SMALLINT NOT NULL DEFAULT 1,
    -- Incrémenté si regénération même audit/type
    
    -- Filtres appliqués (exports)
    filters_json JSONB,
    -- Exemple: {"periode_debut": "2026-01-01", "periode_fin": "2026-01-31", "depot_id": "uuid", "gravite": "critique"}
    
    -- Stockage Supabase Storage
    storage_path TEXT NOT NULL,
    -- Exemple: reports/audit/2026/01/audit_123_v1_20260122.pdf
    storage_bucket VARCHAR(50) NOT NULL DEFAULT 'reports',
    file_size_bytes BIGINT,
    
    -- Statut génération
    statut VARCHAR(30) NOT NULL DEFAULT 'generation_en_cours' CHECK (statut IN ('generation_en_cours', 'disponible', 'erreur', 'archive')),
    error_message TEXT,
    
    -- Métadonnées
    generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Archivage (soft delete)
    archived_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Contraintes métier
    CONSTRAINT check_audit_required_for_audit_complet 
        CHECK (type_rapport != 'audit_complet' OR audit_id IS NOT NULL),
    CONSTRAINT check_error_message_if_erreur 
        CHECK (statut != 'erreur' OR error_message IS NOT NULL),
    CONSTRAINT check_archived_at_if_archive 
        CHECK (statut != 'archive' OR archived_at IS NOT NULL)
);

-- Indexes performance
CREATE UNIQUE INDEX idx_rapports_code ON rapports_generes(code_rapport);
CREATE INDEX idx_rapports_type_statut ON rapports_generes(type_rapport, statut);
CREATE INDEX idx_rapports_audit_type_version ON rapports_generes(audit_id, type_rapport, version DESC) WHERE audit_id IS NOT NULL;
CREATE INDEX idx_rapports_generated_by ON rapports_generes(generated_by);
CREATE INDEX idx_rapports_generated_at ON rapports_generes(generated_at DESC);
CREATE INDEX idx_rapports_statut_disponible ON rapports_generes(statut) WHERE statut = 'disponible';
CREATE INDEX idx_rapports_archivage ON rapports_generes(generated_at) WHERE statut != 'archive';

-- GIN index filtres JSON
CREATE INDEX idx_rapports_filters_gin ON rapports_generes USING gin(filters_json);

-- Commentaires
COMMENT ON TABLE rapports_generes IS 'Métadonnées tous rapports et exports générés (audit, NC, conformité)';
COMMENT ON COLUMN rapports_generes.code_rapport IS 'Code unique format RAPyyyymm-NNNN (RG-02)';
COMMENT ON COLUMN rapports_generes.version IS 'Version rapport (v1, v2...) si regénération (RG-04)';
COMMENT ON COLUMN rapports_generes.filters_json IS 'Filtres appliqués pour exports (période, dépôt, gravité...)';
COMMENT ON COLUMN rapports_generes.storage_path IS 'Chemin relatif fichier dans Supabase Storage bucket reports';
```

**Volumétrie**: ~670 rapports/an, 2.45 GB Storage / 7 ans (voir spec métier).

---

### 3. rapport_consultations

**Objectif**: Historique consultations/téléchargements rapports (audit trail).

**Schéma**:
```sql
CREATE TABLE rapport_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relations
    rapport_id UUID NOT NULL REFERENCES rapports_generes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Action
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('view', 'download', 'regenerate')),
    
    -- Contexte
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamp
    consulted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes performance
CREATE INDEX idx_consultations_rapport ON rapport_consultations(rapport_id, consulted_at DESC);
CREATE INDEX idx_consultations_user ON rapport_consultations(user_id, consulted_at DESC);
CREATE INDEX idx_consultations_date ON rapport_consultations(consulted_at DESC);

-- Commentaires
COMMENT ON TABLE rapport_consultations IS 'Historique consultations rapports (traçabilité audit trail RG-06)';
COMMENT ON COLUMN rapport_consultations.action_type IS 'Type action: view (affichage), download (téléchargement), regenerate (regénération)';
```

**Volumétrie**: ~5000 consultations/an (670 rapports × ~7 consultations moyennes), 1 MB/an.

---

## 🔢 SÉQUENCES

### Séquence code_rapport

**Objectif**: Générer numéros séquentiels mensuels pour codes rapports (RAPyyyymm-NNNN).

```sql
CREATE SEQUENCE rapport_code_seq START 1;

-- Fonction génération code rapport
CREATE OR REPLACE FUNCTION generate_rapport_code()
RETURNS VARCHAR(16)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_month TEXT;
    next_num INT;
    new_code VARCHAR(16);
BEGIN
    -- Format yyyymm
    current_month := to_char(now(), 'YYYYMM');
    
    -- Récupérer prochain numéro pour ce mois
    SELECT COALESCE(MAX(CAST(SUBSTRING(code_rapport FROM 11 FOR 4) AS INT)), 0) + 1
    INTO next_num
    FROM rapports_generes
    WHERE code_rapport LIKE 'RAP' || current_month || '-%';
    
    -- Construire code RAP202601-0042
    new_code := 'RAP' || current_month || '-' || LPAD(next_num::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$;

COMMENT ON FUNCTION generate_rapport_code() IS 'Génère code rapport unique format RAPyyyymm-NNNN (RG-02)';
```

---

## ⚙️ TRIGGERS

### 1. Trigger: Générer code_rapport automatiquement

```sql
CREATE OR REPLACE FUNCTION trigger_generate_rapport_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Générer code uniquement si pas fourni (INSERT uniquement)
    IF NEW.code_rapport IS NULL THEN
        NEW.code_rapport := generate_rapport_code();
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rapport_code_auto
BEFORE INSERT ON rapports_generes
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_rapport_code();

COMMENT ON TRIGGER trg_rapport_code_auto ON rapports_generes IS 'Génère automatiquement code_rapport si NULL (RG-02)';
```

---

### 2. Trigger: Calculer version rapport

```sql
CREATE OR REPLACE FUNCTION trigger_calculate_rapport_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    max_version INT;
BEGIN
    -- Calculer version uniquement pour rapports audit_complet avec audit_id
    IF NEW.type_rapport = 'audit_complet' AND NEW.audit_id IS NOT NULL THEN
        SELECT COALESCE(MAX(version), 0) + 1
        INTO max_version
        FROM rapports_generes
        WHERE audit_id = NEW.audit_id 
          AND type_rapport = 'audit_complet'
          AND id != NEW.id; -- Exclure ligne courante (UPDATE)
        
        NEW.version := max_version;
    ELSE
        -- Exports: version toujours 1
        NEW.version := 1;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rapport_version_auto
BEFORE INSERT ON rapports_generes
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_rapport_version();

COMMENT ON TRIGGER trg_rapport_version_auto ON rapports_generes IS 'Calcule version rapport automatiquement (v2, v3... si regénération RG-04)';
```

---

### 3. Trigger: Timestamp updated_at

```sql
CREATE TRIGGER trg_rapport_templates_updated_at
BEFORE UPDATE ON rapport_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rapports_generes_updated_at
BEFORE UPDATE ON rapports_generes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Note: Fonction update_updated_at_column() existe déjà (Étape 01)
```

---

## 🛡️ CONTRAINTES MÉTIER SUPPLÉMENTAIRES

### 1. Validation format selon type rapport

```sql
-- Rapport audit_complet: PDF + Markdown obligatoires (2 entrées)
-- Synthèse NC: PDF uniquement
-- Exports: Excel uniquement
-- Note: Validation applicative (UI + apiWrapper), pas CHECK constraint complexe
```

**Justification**: Éviter contraintes SQL trop complexes, validation métier dans apiWrapper.

---

### 2. Empêcher suppression template si rapports existants

```sql
-- Déjà géré par FK: template_id REFERENCES rapport_templates(id) ON DELETE RESTRICT
-- Tentative DELETE template utilisé → erreur PostgreSQL FK violation
```

---

## 📈 FONCTIONS SQL MÉTIER

### 1. Fonction: Obtenir dernier rapport audit

```sql
CREATE OR REPLACE FUNCTION get_latest_audit_report(p_audit_id UUID)
RETURNS TABLE (
    rapport_id UUID,
    code_rapport VARCHAR(16),
    version SMALLINT,
    format VARCHAR(20),
    storage_path TEXT,
    statut VARCHAR(30),
    generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        code_rapport,
        version,
        format,
        storage_path,
        statut,
        generated_at
    FROM rapports_generes
    WHERE audit_id = p_audit_id
      AND type_rapport = 'audit_complet'
      AND statut = 'disponible'
    ORDER BY version DESC, generated_at DESC
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_latest_audit_report TO authenticated;

COMMENT ON FUNCTION get_latest_audit_report IS 'Retourne dernière version rapport disponible pour audit (RG-04)';
```

---

### 2. Fonction: Statistiques rapports par utilisateur

```sql
CREATE OR REPLACE FUNCTION get_user_rapport_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER -- RLS appliqué
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_generes', COUNT(*),
        'par_type', json_object_agg(type_rapport, type_count),
        'en_erreur', SUM(CASE WHEN statut = 'erreur' THEN 1 ELSE 0 END)
    )
    INTO result
    FROM (
        SELECT 
            type_rapport,
            COUNT(*) as type_count
        FROM rapports_generes
        WHERE generated_by = p_user_id
          AND statut != 'archive'
        GROUP BY type_rapport
    ) sub;
    
    RETURN COALESCE(result, '{}'::JSON);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_rapport_stats TO authenticated;

COMMENT ON FUNCTION get_user_rapport_stats IS 'Statistiques rapports générés par utilisateur (dashboard admin)';
```

---

### 3. Fonction: Archiver rapports anciens (cron job)

```sql
CREATE OR REPLACE FUNCTION archive_old_reports()
RETURNS TABLE (archived_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    nb_archived INT;
BEGIN
    -- Archiver rapports > 7 ans (RG-09)
    UPDATE rapports_generes
    SET statut = 'archive',
        archived_at = now(),
        updated_at = now()
    WHERE generated_at < (now() - INTERVAL '7 years')
      AND statut = 'disponible';
    
    GET DIAGNOSTICS nb_archived = ROW_COUNT;
    
    -- Log archivage
    RAISE NOTICE 'Archived % reports older than 7 years', nb_archived;
    
    RETURN QUERY SELECT nb_archived;
END;
$$;

-- Grant admin uniquement
GRANT EXECUTE ON FUNCTION archive_old_reports TO admin_dev, qhse_manager;

COMMENT ON FUNCTION archive_old_reports IS 'Archive rapports > 7 ans (RG-09), exécution annuelle cron job';
```

---

## 🔗 RELATIONS FOREIGN KEYS

### Récapitulatif FK

| Table Source | Colonne | Table Cible | ON DELETE | Justification |
|--------------|---------|-------------|-----------|---------------|
| `rapport_templates` | `created_by` | `profiles(id)` | SET NULL | Garder template si user supprimé |
| `rapports_generes` | `template_id` | `rapport_templates(id)` | RESTRICT | Bloquer suppression template utilisé |
| `rapports_generes` | `audit_id` | `audits(id)` | RESTRICT | Bloquer suppression audit avec rapports |
| `rapports_generes` | `generated_by` | `profiles(id)` | RESTRICT | Traçabilité obligatoire générateur |
| `rapport_consultations` | `rapport_id` | `rapports_generes(id)` | CASCADE | Supprimer consultations si rapport supprimé |
| `rapport_consultations` | `user_id` | `profiles(id)` | CASCADE | Anonymiser si user supprimé (optionnel SET NULL) |

**Stratégie globale**: RESTRICT pour traçabilité critique (rapports liés audit), CASCADE pour historique secondaire (consultations).

---

## 📊 INDEXES PERFORMANCE RÉCAPITULATIFS

### Table: rapport_templates (3 indexes)
1. `idx_templates_type_active` (type, active) - Sélection templates actifs
2. `idx_templates_created_at` (created_at DESC) - Historique versions
3. Primary Key `id` (automatique)

### Table: rapports_generes (8 indexes)
1. `idx_rapports_code` (code_rapport UNIQUE) - Recherche par code (RG-02)
2. `idx_rapports_type_statut` (type_rapport, statut) - Filtres UI
3. `idx_rapports_audit_type_version` (audit_id, type_rapport, version DESC WHERE audit_id IS NOT NULL) - Dernière version audit (RG-04)
4. `idx_rapports_generated_by` (generated_by) - Rapports utilisateur
5. `idx_rapports_generated_at` (generated_at DESC) - Tri chronologique
6. `idx_rapports_statut_disponible` (statut WHERE statut = 'disponible') - Liste rapports accessibles
7. `idx_rapports_archivage` (generated_at WHERE statut != 'archive') - Fonction archivage (RG-09)
8. `idx_rapports_filters_gin` (filters_json GIN) - Recherche filtres JSON exports

### Table: rapport_consultations (4 indexes)
1. `idx_consultations_rapport` (rapport_id, consulted_at DESC) - Historique consultations rapport
2. `idx_consultations_user` (user_id, consulted_at DESC) - Historique user
3. `idx_consultations_date` (consulted_at DESC) - Tri chronologique global
4. Primary Key `id` (automatique)

**Total indexes Étape 05**: 15 indexes (3 + 8 + 4)

---

## 🗂️ MOCK DATA (Mode Démo)

### Mock rapport_templates (2 templates)

```javascript
// mockData.js - À ajouter
export const mockRapportTemplates = [
  {
    id: 'tpl-audit-001',
    type: 'audit_complet',
    version: '1.0',
    nom: 'Template Rapport Audit Standard',
    description: 'Structure standard rapport audit QHSE (PDF + Markdown)',
    structure_json: {
      sections: [
        { id: 'header', title: 'En-tête QHSE', required: true },
        { id: 'metadata', title: 'Métadonnées Audit', required: true },
        { id: 'questions_reponses', title: 'Questions & Réponses', required: true },
        { id: 'non_conformites', title: 'Non-Conformités', required: false },
        { id: 'scoring', title: 'Calcul Conformité', required: true },
        { id: 'signature', title: 'Signatures', required: true }
      ],
      calculations: ['conformity_rate', 'nc_count', 'critical_nc_count'],
      charts: ['conformity_by_section']
    },
    active: true,
    default_format: 'pdf',
    created_by: 'admin-001', // admin_dev
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z'
  },
  {
    id: 'tpl-nc-001',
    type: 'synthese_nc',
    version: '1.0',
    nom: 'Template Synthèse Non-Conformités',
    description: 'Rapport synthèse NC par période/dépôt',
    structure_json: {
      sections: [
        { id: 'header', title: 'En-tête', required: true },
        { id: 'kpis', title: 'KPIs NC', required: true },
        { id: 'top_zones', title: 'Top 5 Zones Risque', required: true },
        { id: 'liste_nc', title: 'Liste NC Détaillée', required: true },
        { id: 'actions', title: 'Actions Correctives', required: false }
      ],
      calculations: ['total_nc', 'nc_by_gravity', 'nc_overdue', 'closure_rate']
    },
    active: true,
    default_format: 'pdf',
    created_by: 'admin-001',
    created_at: '2026-01-10T11:00:00Z',
    updated_at: '2026-01-10T11:00:00Z'
  }
];
```

---

### Mock rapports_generes (5 rapports)

```javascript
export const mockRapportsGeneres = [
  {
    id: 'rapport-001',
    code_rapport: 'RAP202601-0001',
    type_rapport: 'audit_complet',
    format: 'pdf',
    template_id: 'tpl-audit-001',
    audit_id: 'audit-003', // Audit complété démo
    version: 1,
    filters_json: null,
    storage_path: 'reports/audit/2026/01/audit_003_v1_20260115.pdf',
    storage_bucket: 'reports',
    file_size_bytes: 524288, // 512 KB
    statut: 'disponible',
    error_message: null,
    generated_by: 'auditor-001', // safety_auditor
    generated_at: '2026-01-15T14:30:00Z',
    archived_at: null,
    created_at: '2026-01-15T14:30:00Z',
    updated_at: '2026-01-15T14:30:00Z'
  },
  {
    id: 'rapport-002',
    code_rapport: 'RAP202601-0002',
    type_rapport: 'audit_complet',
    format: 'markdown',
    template_id: 'tpl-audit-001',
    audit_id: 'audit-003',
    version: 1,
    filters_json: null,
    storage_path: 'reports/audit/2026/01/audit_003_v1_20260115.md',
    storage_bucket: 'reports',
    file_size_bytes: 51200, // 50 KB
    statut: 'disponible',
    error_message: null,
    generated_by: 'auditor-001',
    generated_at: '2026-01-15T14:30:05Z',
    archived_at: null,
    created_at: '2026-01-15T14:30:05Z',
    updated_at: '2026-01-15T14:30:05Z'
  },
  {
    id: 'rapport-003',
    code_rapport: 'RAP202601-0003',
    type_rapport: 'synthese_nc',
    format: 'pdf',
    template_id: 'tpl-nc-001',
    audit_id: null,
    version: 1,
    filters_json: {
      periode_debut: '2026-01-01',
      periode_fin: '2026-01-31',
      depot_id: 'depot-001',
      gravite: null
    },
    storage_path: 'reports/nc/2026/01/synthese_nc_depot1_20260120.pdf',
    storage_bucket: 'reports',
    file_size_bytes: 409600, // 400 KB
    statut: 'disponible',
    error_message: null,
    generated_by: 'manager-001', // qhse_manager
    generated_at: '2026-01-20T09:00:00Z',
    archived_at: null,
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-01-20T09:00:00Z'
  },
  {
    id: 'rapport-004',
    code_rapport: 'RAP202601-0004',
    type_rapport: 'export_nc',
    format: 'excel',
    template_id: null,
    audit_id: null,
    version: 1,
    filters_json: {
      periode_debut: '2026-01-01',
      periode_fin: '2026-01-31',
      statut: 'open',
      gravite: 'critique'
    },
    storage_path: 'reports/nc/2026/01/export_nc_critiques_20260121.xlsx',
    storage_bucket: 'reports',
    file_size_bytes: 204800, // 200 KB
    statut: 'disponible',
    error_message: null,
    generated_by: 'manager-001',
    generated_at: '2026-01-21T10:30:00Z',
    archived_at: null,
    created_at: '2026-01-21T10:30:00Z',
    updated_at: '2026-01-21T10:30:00Z'
  },
  {
    id: 'rapport-005',
    code_rapport: 'RAP202601-0005',
    type_rapport: 'audit_complet',
    format: 'pdf',
    template_id: 'tpl-audit-001',
    audit_id: 'audit-003',
    version: 2, // Regénération
    filters_json: null,
    storage_path: 'reports/audit/2026/01/audit_003_v2_20260122.pdf',
    storage_bucket: 'reports',
    file_size_bytes: 532480, // 520 KB
    statut: 'disponible',
    error_message: null,
    generated_by: 'manager-001', // Regénéré par manager
    generated_at: '2026-01-22T08:00:00Z',
    archived_at: null,
    created_at: '2026-01-22T08:00:00Z',
    updated_at: '2026-01-22T08:00:00Z'
  }
];
```

---

### Mock rapport_consultations (8 consultations)

```javascript
export const mockRapportConsultations = [
  {
    id: 'consult-001',
    rapport_id: 'rapport-001',
    user_id: 'auditor-001',
    action_type: 'view',
    user_agent: 'Mozilla/5.0 Chrome/120.0',
    ip_address: '192.168.1.10',
    consulted_at: '2026-01-15T14:35:00Z'
  },
  {
    id: 'consult-002',
    rapport_id: 'rapport-001',
    user_id: 'manager-001',
    action_type: 'download',
    user_agent: 'Mozilla/5.0 Firefox/122.0',
    ip_address: '192.168.1.20',
    consulted_at: '2026-01-16T09:00:00Z'
  },
  {
    id: 'consult-003',
    rapport_id: 'rapport-001',
    user_id: 'manager-001',
    action_type: 'regenerate',
    user_agent: 'Mozilla/5.0 Firefox/122.0',
    ip_address: '192.168.1.20',
    consulted_at: '2026-01-22T08:00:00Z'
  },
  {
    id: 'consult-004',
    rapport_id: 'rapport-003',
    user_id: 'manager-001',
    action_type: 'view',
    user_agent: 'Mozilla/5.0 Firefox/122.0',
    ip_address: '192.168.1.20',
    consulted_at: '2026-01-20T09:05:00Z'
  },
  {
    id: 'consult-005',
    rapport_id: 'rapport-003',
    user_id: 'admin-001',
    action_type: 'download',
    user_agent: 'Mozilla/5.0 Chrome/120.0',
    ip_address: '192.168.1.1',
    consulted_at: '2026-01-20T15:00:00Z'
  },
  {
    id: 'consult-006',
    rapport_id: 'rapport-004',
    user_id: 'manager-001',
    action_type: 'download',
    user_agent: 'Mozilla/5.0 Firefox/122.0',
    ip_address: '192.168.1.20',
    consulted_at: '2026-01-21T10:32:00Z'
  },
  {
    id: 'consult-007',
    rapport_id: 'rapport-005',
    user_id: 'manager-001',
    action_type: 'view',
    user_agent: 'Mozilla/5.0 Firefox/122.0',
    ip_address: '192.168.1.20',
    consulted_at: '2026-01-22T08:05:00Z'
  },
  {
    id: 'consult-008',
    rapport_id: 'rapport-005',
    user_id: 'auditor-001',
    action_type: 'download',
    user_agent: 'Mozilla/5.0 Chrome/120.0',
    ip_address: '192.168.1.10',
    consulted_at: '2026-01-22T09:00:00Z'
  }
];
```

---

## ✅ CHECKLIST VALIDATION SCHÉMA

- [ ] 3 tables créées (rapport_templates, rapports_generes, rapport_consultations)
- [ ] 1 séquence définie (rapport_code_seq + fonction generate_rapport_code)
- [ ] 3 triggers métier (code auto, version auto, updated_at)
- [ ] 15 indexes performance (3 + 8 + 4)
- [ ] 6 FK relations avec stratégie ON DELETE cohérente
- [ ] 3 fonctions SQL métier (latest report, stats user, archivage)
- [ ] Contraintes CHECK métier (audit_complet → audit_id, erreur → error_message)
- [ ] Mock data complet (2 templates, 5 rapports, 8 consultations)
- [ ] Commentaires SQL (COMMENT ON TABLE/COLUMN/FUNCTION)
- [ ] Cohérence avec Étapes 01-04 (FK audits, profiles, depots)

---

**Document prêt pour validation sécurité (RLS Policies).**
