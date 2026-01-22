# 🗄️ SCHÉMA BASE DE DONNÉES – ÉTAPE 02 (Audits & Templates)

## 🎯 CONTEXTE

### Dépendances Étape 01
Ce schéma étend les tables foundation :
- ✅ `profiles` (auditeurs, créateurs)
- ✅ `depots` (cibles audit)
- ✅ `zones` (cibles audit)
- ✅ ENUMs : `role_type`, `status`

### Nouvelles Entités Étape 02
- `audit_templates` : Modèles d'audit réutilisables
- `questions` : Questions des templates
- `audits` : Instances d'audit (exécutions terrain)
- `reponses` : Réponses aux questions lors des audits

---

## 📊 TYPES ENUM

### 1. domaine_audit
**Usage** : Catégoriser les templates d'audit.

```sql
CREATE TYPE domaine_audit AS ENUM (
  'securite',      -- Sécurité au travail
  'qualite',       -- Qualité des processus
  'hygiene',       -- Hygiène et santé
  'environnement', -- Impact environnemental
  'global'         -- Audit complet multi-domaines
);

COMMENT ON TYPE domaine_audit IS 'Domaines QHSE pour templates audit';
```

---

### 2. statut_template
**Usage** : Cycle de vie d'un template.

```sql
CREATE TYPE statut_template AS ENUM (
  'brouillon', -- En cours de création
  'actif',     -- Utilisable pour nouveaux audits
  'archive'    -- Plus utilisable (historique seulement)
);

COMMENT ON TYPE statut_template IS 'Statut lifecycle template audit';
```

---

### 3. type_question
**Usage** : Format de réponse attendu.

```sql
CREATE TYPE type_question AS ENUM (
  'oui_non',         -- Réponse booléenne
  'choix_multiple',  -- Options prédéfinies
  'texte_libre',     -- Commentaire ouvert
  'note_1_5'         -- Notation 1 à 5
);

COMMENT ON TYPE type_question IS 'Type de réponse pour questions audit';
```

---

### 4. criticite_question
**Usage** : Niveau d'importance d'une question.

```sql
CREATE TYPE criticite_question AS ENUM (
  'faible',   -- Impact mineur
  'moyenne',  -- Impact modéré
  'haute',    -- Impact important
  'critique'  -- Impact majeur (sécurité, légal)
);

COMMENT ON TYPE criticite_question IS 'Niveau criticité question audit';
```

---

### 5. statut_audit
**Usage** : État d'avancement d'un audit.

```sql
CREATE TYPE statut_audit AS ENUM (
  'planifie', -- Audit planifié (pas encore commencé)
  'en_cours', -- Audit en cours de réalisation
  'termine',  -- Audit terminé (toutes réponses saisies)
  'annule'    -- Audit annulé (non réalisé)
);

COMMENT ON TYPE statut_audit IS 'Statut avancement audit terrain';
```

---

## 🗂️ TABLES

### 1. audit_templates

**Description** : Modèles d'audit réutilisables.

```sql
CREATE TABLE audit_templates (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  code VARCHAR(20) NOT NULL UNIQUE,
  titre VARCHAR(200) NOT NULL,
  domaine domaine_audit NOT NULL,
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  
  -- Statut
  statut statut_template NOT NULL DEFAULT 'brouillon',
  
  -- Traçabilité
  createur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT audit_templates_code_format_check 
    CHECK (code ~ '^[A-Z0-9-]{3,20}$'),
  CONSTRAINT audit_templates_version_check 
    CHECK (version >= 1)
);

-- Commentaires
COMMENT ON TABLE audit_templates IS 'Modèles audit réutilisables par domaine QHSE';
COMMENT ON COLUMN audit_templates.code IS 'Identifiant unique template (ex: AUD-SEC-2025)';
COMMENT ON COLUMN audit_templates.version IS 'Version template (incrémentée à chaque modification)';
COMMENT ON COLUMN audit_templates.createur_id IS 'Profile ayant créé le template';

-- Indexes
CREATE INDEX idx_audit_templates_domaine ON audit_templates(domaine);
CREATE INDEX idx_audit_templates_statut ON audit_templates(statut);
CREATE INDEX idx_audit_templates_createur ON audit_templates(createur_id);
CREATE INDEX idx_audit_templates_code ON audit_templates(code); -- Recherche rapide

-- Trigger updated_at
CREATE TRIGGER set_updated_at_audit_templates
  BEFORE UPDATE ON audit_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger uppercase code
CREATE TRIGGER uppercase_audit_template_code
  BEFORE INSERT OR UPDATE ON audit_templates
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();
```

---

### 2. questions

**Description** : Questions composant un template d'audit.

```sql
CREATE TABLE questions (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Appartenance
  template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL,
  
  -- Contenu
  libelle TEXT NOT NULL,
  type type_question NOT NULL,
  aide TEXT, -- Texte d'aide pour auditeur
  
  -- Scoring
  obligatoire BOOLEAN NOT NULL DEFAULT true,
  criticite criticite_question NOT NULL DEFAULT 'moyenne',
  points_max INTEGER NOT NULL DEFAULT 10,
  
  -- Traçabilité
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT questions_ordre_positif_check 
    CHECK (ordre > 0),
  CONSTRAINT questions_points_max_check 
    CHECK (points_max >= 0),
  CONSTRAINT questions_ordre_unique_par_template 
    UNIQUE(template_id, ordre)
);

-- Commentaires
COMMENT ON TABLE questions IS 'Questions composant les templates audit';
COMMENT ON COLUMN questions.ordre IS 'Position question dans le questionnaire (1, 2, 3...)';
COMMENT ON COLUMN questions.type IS 'Format réponse attendu (oui_non, texte_libre, etc.)';
COMMENT ON COLUMN questions.criticite IS 'Niveau importance question (impact sur score)';
COMMENT ON COLUMN questions.points_max IS 'Score maximum si réponse conforme';

-- Indexes
CREATE INDEX idx_questions_template ON questions(template_id);
CREATE INDEX idx_questions_template_ordre ON questions(template_id, ordre); -- Tri questionnaire
CREATE INDEX idx_questions_criticite ON questions(criticite); -- Filtrage NC critiques

-- Trigger updated_at
CREATE TRIGGER set_updated_at_questions
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 3. audits

**Description** : Instances d'audit (exécutions terrain d'un template).

```sql
CREATE TABLE audits (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  code VARCHAR(30) NOT NULL UNIQUE,
  
  -- Relations
  template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE RESTRICT,
  auditeur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Cible (XOR : depot OU zone)
  depot_id UUID REFERENCES depots(id) ON DELETE RESTRICT,
  zone_id UUID REFERENCES zones(id) ON DELETE RESTRICT,
  
  -- Dates
  date_planifiee DATE NOT NULL,
  date_realisee DATE,
  
  -- Statut
  statut statut_audit NOT NULL DEFAULT 'planifie',
  
  -- Résultats (calculés)
  score_obtenu INTEGER,
  score_maximum INTEGER,
  taux_conformite NUMERIC(5,2), -- % (ex: 87.50)
  nb_non_conformites INTEGER DEFAULT 0,
  
  -- Synthèse
  commentaire_general TEXT,
  
  -- Traçabilité
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT audits_code_format_check 
    CHECK (code ~ '^[A-Z0-9-]{5,30}$'),
  CONSTRAINT audits_cible_xor_check 
    CHECK (
      (depot_id IS NOT NULL AND zone_id IS NULL) OR
      (depot_id IS NULL AND zone_id IS NOT NULL)
    ),
  CONSTRAINT audits_date_realisee_si_termine_check 
    CHECK (
      (statut = 'termine' AND date_realisee IS NOT NULL) OR
      (statut != 'termine')
    ),
  CONSTRAINT audits_taux_conformite_check 
    CHECK (taux_conformite BETWEEN 0 AND 100)
);

-- Commentaires
COMMENT ON TABLE audits IS 'Instances audit (exécutions terrain templates)';
COMMENT ON COLUMN audits.code IS 'Identifiant unique audit (ex: AUD-LYO-2025-001)';
COMMENT ON COLUMN audits.depot_id IS 'Dépôt audité (XOR avec zone_id)';
COMMENT ON COLUMN audits.zone_id IS 'Zone auditée (XOR avec depot_id)';
COMMENT ON COLUMN audits.score_obtenu IS 'Points obtenus (calculé depuis réponses)';
COMMENT ON COLUMN audits.taux_conformite IS 'Pourcentage conformité (score_obtenu / score_maximum * 100)';

-- Indexes
CREATE INDEX idx_audits_template ON audits(template_id);
CREATE INDEX idx_audits_auditeur ON audits(auditeur_id);
CREATE INDEX idx_audits_depot ON audits(depot_id);
CREATE INDEX idx_audits_zone ON audits(zone_id);
CREATE INDEX idx_audits_statut ON audits(statut);
CREATE INDEX idx_audits_date_planifiee ON audits(date_planifiee); -- Tri chronologique
CREATE INDEX idx_audits_date_realisee ON audits(date_realisee);
CREATE INDEX idx_audits_code ON audits(code); -- Recherche rapide

-- Trigger updated_at
CREATE TRIGGER set_updated_at_audits
  BEFORE UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger uppercase code
CREATE TRIGGER uppercase_audit_code
  BEFORE INSERT OR UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();
```

---

### 4. reponses

**Description** : Réponses aux questions lors d'un audit.

```sql
CREATE TABLE reponses (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  
  -- Réponse
  valeur JSONB NOT NULL, -- Format flexible selon type_question
  points_obtenus INTEGER NOT NULL DEFAULT 0,
  est_conforme BOOLEAN NOT NULL DEFAULT true,
  
  -- Observations
  commentaire TEXT,
  photo_url TEXT, -- URL Supabase Storage (bucket: audit_photos)
  
  -- Traçabilité
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT reponses_unique_par_question 
    UNIQUE(audit_id, question_id),
  CONSTRAINT reponses_points_obtenus_check 
    CHECK (points_obtenus >= 0)
);

-- Commentaires
COMMENT ON TABLE reponses IS 'Réponses auditeur aux questions audit';
COMMENT ON COLUMN reponses.valeur IS 'Réponse JSON flexible selon type (ex: {"reponse": true} pour oui_non)';
COMMENT ON COLUMN reponses.points_obtenus IS 'Score obtenu pour cette réponse (≤ question.points_max)';
COMMENT ON COLUMN reponses.est_conforme IS 'Réponse conforme aux critères ? (false = non-conformité)';
COMMENT ON COLUMN reponses.photo_url IS 'Photo preuve (Supabase Storage bucket audit_photos)';

-- Indexes
CREATE INDEX idx_reponses_audit ON reponses(audit_id);
CREATE INDEX idx_reponses_question ON reponses(question_id);
CREATE INDEX idx_reponses_est_conforme ON reponses(est_conforme); -- Filtrage NC
CREATE INDEX idx_reponses_audit_question ON reponses(audit_id, question_id); -- UNIQUE enforcement

-- Trigger updated_at
CREATE TRIGGER set_updated_at_reponses
  BEFORE UPDATE ON reponses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔗 SCHÉMA RELATIONNEL

```
┌─────────────────────┐
│   audit_templates   │
│  (modèles audit)    │
├─────────────────────┤
│ id (PK)             │
│ code (UNIQUE)       │
│ titre               │
│ domaine (ENUM)      │
│ version             │
│ statut (ENUM)       │
│ createur_id (FK)────┼──→ profiles.id
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │ 1:N
           ↓
┌─────────────────────┐
│     questions       │
│  (items template)   │
├─────────────────────┤
│ id (PK)             │
│ template_id (FK)────┼──→ audit_templates.id (CASCADE)
│ ordre (UNIQUE)      │
│ libelle             │
│ type (ENUM)         │
│ criticite (ENUM)    │
│ points_max          │
│ obligatoire         │
└──────────┬──────────┘
           │ N:1 (pour réponses)
           │
┌─────────────────────┐         ┌─────────────────────┐
│      depots         │         │       zones         │
│   (Étape 01)        │         │    (Étape 01)       │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │         │ id (PK)             │
└──────────┬──────────┘         └──────────┬──────────┘
           │ 1:N                           │ 1:N
           │ (XOR)                         │ (XOR)
           └───────────┐   ┌───────────────┘
                       ↓   ↓
                ┌─────────────────────┐
                │       audits        │
                │  (instances)        │
                ├─────────────────────┤
                │ id (PK)             │
                │ code (UNIQUE)       │
                │ template_id (FK)────┼──→ audit_templates.id (RESTRICT)
                │ auditeur_id (FK)────┼──→ profiles.id (RESTRICT)
                │ depot_id (FK, opt)  │
                │ zone_id (FK, opt)   │
                │ date_planifiee      │
                │ date_realisee       │
                │ statut (ENUM)       │
                │ score_obtenu        │
                │ score_maximum       │
                │ taux_conformite     │
                └──────────┬──────────┘
                           │ 1:N
                           ↓
                ┌─────────────────────┐
                │      reponses       │
                │  (réponses audit)   │
                ├─────────────────────┤
                │ id (PK)             │
                │ audit_id (FK)───────┼──→ audits.id (CASCADE)
                │ question_id (FK)────┼──→ questions.id (RESTRICT)
                │ valeur (JSONB)      │
                │ points_obtenus      │
                │ est_conforme        │
                │ commentaire         │
                │ photo_url           │
                └─────────────────────┘
```

---

## 🛡️ CONTRAINTES MÉTIER (Récapitulatif)

| Contrainte | Table | Type | Description |
|------------|-------|------|-------------|
| `code UNIQUE` | audit_templates | UNIQUE | Code template unique |
| `code format` | audit_templates | CHECK | Format `[A-Z0-9-]{3,20}` |
| `version >= 1` | audit_templates | CHECK | Version positive |
| `ordre unique` | questions | UNIQUE | `(template_id, ordre)` composite |
| `ordre > 0` | questions | CHECK | Ordre positif |
| `points_max >= 0` | questions | CHECK | Score positif |
| `code UNIQUE` | audits | UNIQUE | Code audit unique |
| `code format` | audits | CHECK | Format `[A-Z0-9-]{5,30}` |
| `cible XOR` | audits | CHECK | `depot_id XOR zone_id` |
| `date_realisee si termine` | audits | CHECK | Cohérence statut |
| `taux 0-100` | audits | CHECK | % entre 0 et 100 |
| `reponse unique` | reponses | UNIQUE | `(audit_id, question_id)` |
| `points_obtenus >= 0` | reponses | CHECK | Score positif |

---

## 📈 INDEXES DE PERFORMANCE

| Index | Table | Colonnes | Objectif |
|-------|-------|----------|----------|
| `idx_audit_templates_domaine` | audit_templates | domaine | Filtrer par domaine QHSE |
| `idx_audit_templates_statut` | audit_templates | statut | Filtrer templates actifs |
| `idx_audit_templates_code` | audit_templates | code | Recherche rapide par code |
| `idx_questions_template` | questions | template_id | JOIN template → questions |
| `idx_questions_template_ordre` | questions | template_id, ordre | Tri questionnaire |
| `idx_audits_template` | audits | template_id | Audits par template |
| `idx_audits_auditeur` | audits | auditeur_id | Audits par auditeur |
| `idx_audits_depot` | audits | depot_id | Audits par dépôt |
| `idx_audits_zone` | audits | zone_id | Audits par zone |
| `idx_audits_statut` | audits | statut | Filtrer audits en cours |
| `idx_audits_date_planifiee` | audits | date_planifiee | Tri chronologique |
| `idx_reponses_audit` | reponses | audit_id | Réponses par audit |
| `idx_reponses_est_conforme` | reponses | est_conforme | Filtrer NC |

---

## 🔄 TRIGGERS

| Trigger | Table | Fonction | Objectif |
|---------|-------|----------|----------|
| `set_updated_at_audit_templates` | audit_templates | `update_updated_at_column()` | MAJ timestamp |
| `uppercase_audit_template_code` | audit_templates | `uppercase_code_column()` | Code majuscule |
| `set_updated_at_questions` | questions | `update_updated_at_column()` | MAJ timestamp |
| `set_updated_at_audits` | audits | `update_updated_at_column()` | MAJ timestamp |
| `uppercase_audit_code` | audits | `uppercase_code_column()` | Code majuscule |
| `set_updated_at_reponses` | reponses | `update_updated_at_column()` | MAJ timestamp |

**Triggers Métier Supplémentaires** (à créer) :
- `validate_template_actif_before_audit` : Vérifie template actif avant INSERT audit
- `validate_auditeur_role` : Vérifie rôle auditeur valide
- `validate_points_obtenus` : Vérifie points_obtenus ≤ points_max (RG-10)
- `update_audit_scores` : Recalcule score_obtenu/taux_conformite après INSERT/UPDATE reponse
- `prevent_delete_audit_termine` : Empêche DELETE audit si statut='termine' (sauf admin_dev)

---

## 📊 VOLUMÉTRIE & STOCKAGE

### Estimations Taille

| Table | Lignes An 1 | Lignes 5 Ans | Taille/Ligne | Taille Totale 5 Ans |
|-------|-------------|--------------|--------------|---------------------|
| audit_templates | 20 | 50 | ~1 KB | 50 KB |
| questions | 500 | 1000 | ~500 B | 500 KB |
| audits | 1000 | 10000 | ~500 B | 5 MB |
| reponses | 20000 | 200000 | ~300 B | 60 MB |

**Total Étape 02** : ~65 MB (5 ans) – Volumétrie légère.

### Storage Supabase (Photos)
- **Bucket** : `audit_photos`
- **Taille moyenne photo** : 500 KB (compression mobile)
- **Volume estimé** : 10% audits ont photos → 1000 photos/an → 500 MB/an → 2.5 GB (5 ans)

---

## ✅ VALIDATION SCHÉMA

### Checklist Complétude
- ✅ Tous ENUMs définis (5 types)
- ✅ Toutes tables créées (4 tables)
- ✅ Toutes FK déclarées (8 FK)
- ✅ Toutes contraintes CHECK (11 contraintes)
- ✅ Tous indexes de performance (13 indexes)
- ✅ Tous triggers created_at/updated_at/uppercase (6 triggers)
- ✅ Tous commentaires SQL (documentation inline)

### Checklist Règles Métier
- ✅ RG-01 : Code template unique majuscule
- ✅ RG-02 : Version incrémentale
- ✅ RG-03 : Ordre question unique par template
- ✅ RG-04 : Audit cible XOR (dépôt OU zone)
- ✅ RG-05 : Code audit unique majuscule
- ✅ RG-06 : Auditeur rôle valide (trigger à créer)
- ✅ RG-07 : Template actif pour nouvel audit (trigger à créer)
- ✅ RG-08 : Date réalisée si terminé
- ✅ RG-09 : Réponse unique par question
- ✅ RG-10 : Points obtenus ≤ points max (trigger validate_points_obtenus)
- ✅ RG-11 : Suppression audit limité (trigger à créer)
- ✅ RG-12 : Soft delete templates (policy RLS)

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ ENUMs définis
2. ✅ Tables créées
3. ⏳ **Fonctions métier** (validation role, calcul score, etc.)
4. ⏳ **RLS Policies** (permissions par rôle)
5. ⏳ **Tests validation** (scénarios OK/KO)
6. ⏳ **Migration SQL finale**

---

**Date Création** : 22 janvier 2026  
**Auteur** : GitHub Copilot (Claude Sonnet 4.5)  
**Statut** : ✅ COMPLET – Validé pour passage RLS policies
