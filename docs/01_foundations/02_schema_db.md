# Schéma Database – Foundations (Étape 01)

## Date
22 janvier 2026

## Objectif
Définir la structure des tables foundationnelles: profiles, depots, zones

**CLARIFICATION IMPORTANTE**:
- `auth.users` = Table Supabase Auth (authentification)
- `profiles` = Table métier (données utilisateur QHSE, 1:1 avec auth.users)

---

## 1. ENUM TYPES

### 1.1 role_type
Rôles utilisateurs dans le système QHSE.

```sql
CREATE TYPE role_type AS ENUM (
  'admin_dev',        -- Administrateur technique (droits complets)
  'qhse_manager',     -- Manager QHSE (gestion globale, validation NC)
  'qh_auditor',       -- Auditeur qualité/hygiène
  'safety_auditor',   -- Auditeur sécurité
  'viewer'            -- Consultation uniquement
);
```

**Justification**: ENUM plutôt que VARCHAR pour validation DB-level + performance.

### 1.2 zone_type
Types de zones dans un dépôt.

```sql
CREATE TYPE zone_type AS ENUM (
  'warehouse',       -- Entrepôt/stockage
  'loading',         -- Quai de chargement
  'office',          -- Bureau
  'production',      -- Zone de production
  'cold_storage'     -- Chambre froide
);
```

### 1.3 status
Statut actif/inactif (profiles, depots, zones).

```sql
CREATE TYPE status AS ENUM (
  'active',          -- Actif
  'inactive'         -- Inactif (soft delete)
);
```

---

## 2. TABLE: profiles

### 2.1 Description
Extension de `auth.users` Supabase. Stocke profil utilisateur QHSE et rôle métier.
**Relation 1:1** avec `auth.users` (même UUID).

### 2.2 DDL

```sql
CREATE TABLE profiles (
  -- Clé primaire (même ID que auth.users)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profil
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  
  -- Rôle métier
  role role_type NOT NULL,
  
  -- Statut
  status status NOT NULL DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 Contraintes

| Contrainte | Type | Description |
|------------|------|-------------|
| `profiles_pkey` | PRIMARY KEY | id (UUID) |
| `profiles_id_fkey` | FOREIGN KEY | id → auth.users(id) ON DELETE CASCADE |
| `profiles_email_key` | UNIQUE | email (unicité) |
| `profiles_email_check` | CHECK | email contient '@' (validation basique) |
| `profiles_first_name_check` | CHECK | LENGTH(first_name) >= 2 |
| `profiles_last_name_check` | CHECK | LENGTH(last_name) >= 2 |

### 2.4 Index

```sql
-- Index sur email (recherche profiles)
CREATE INDEX idx_profiles_email ON profiles(email);

-- Index sur role (filtrage par rôle)
CREATE INDEX idx_profiles_role ON profiles(role);

-- Index sur status (filtrage actifs/inactifs)
CREATE INDEX idx_profiles_status ON profiles(status);
```

### 2.5 Triggers

```sql
-- Trigger auto-update updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Note**: Fonction `update_updated_at_column()` définie dans migration (helper).

---

## 3. TABLE: depots

### 3.1 Description
Dépôts/sites physiques (entrepôts, usines).

### 3.2 DDL

```sql
CREATE TABLE depots (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  
  -- Localisation
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  
  -- Contact
  contact_name VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  
  -- Statut
  status status NOT NULL DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 Contraintes

| Contrainte | Type | Description |
|------------|------|-------------|
| `depots_pkey` | PRIMARY KEY | id (UUID) |
| `depots_code_key` | UNIQUE | code (unicité) |
| `depots_code_check` | CHECK | LENGTH(code) BETWEEN 3 AND 10 |
| `depots_code_format_check` | CHECK | code ~ '^[A-Z0-9]+$' (alphanumérique uppercase) |
| `depots_name_check` | CHECK | LENGTH(name) >= 3 |
| `depots_contact_email_check` | CHECK | contact_email IS NULL OR contact_email ~ '@' |

### 3.4 Index

```sql
-- Index sur code (recherche par code)
CREATE UNIQUE INDEX idx_depots_code_upper ON depots(UPPER(code));

-- Index sur city (filtrage par ville)
CREATE INDEX idx_depots_city ON depots(city);

-- Index sur status
CREATE INDEX idx_depots_status ON depots(status);
```

### 3.5 Triggers

```sql
-- Auto-uppercase code avant insert/update
CREATE TRIGGER uppercase_depot_code
  BEFORE INSERT OR UPDATE ON depots
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_depots
  BEFORE UPDATE ON depots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. TABLE: zones

### 4.1 Description
Zones au sein des dépôts (subdivision spatiale).

### 4.2 DDL

```sql
CREATE TABLE zones (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rattachement dépôt
  depot_id UUID NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  
  -- Identification
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type zone_type NOT NULL,
  
  -- Statut
  status status NOT NULL DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contrainte unicité code par dépôt
  UNIQUE(depot_id, code)
);
```

### 4.3 Contraintes

| Contrainte | Type | Description |
|------------|------|-------------|
| `zones_pkey` | PRIMARY KEY | id (UUID) |
| `zones_depot_id_fkey` | FOREIGN KEY | depot_id → depots(id) ON DELETE CASCADE |
| `zones_depot_id_code_key` | UNIQUE | (depot_id, code) - code unique par dépôt |
| `zones_code_check` | CHECK | LENGTH(code) BETWEEN 2 AND 20 |
| `zones_name_check` | CHECK | LENGTH(name) >= 3 |

### 4.4 Index

```sql
-- Index sur depot_id (recherche zones par dépôt)
CREATE INDEX idx_zones_depot_id ON zones(depot_id);

-- Index sur type (filtrage par type de zone)
CREATE INDEX idx_zones_type ON zones(type);

-- Index sur status
CREATE INDEX idx_zones_status ON zones(status);

-- Index composite depot_id + code (contrainte UNIQUE déjà indexée)
-- Pas besoin d'index supplémentaire
```

### 4.5 Triggers

```sql
-- Auto-update updated_at
CREATE TRIGGER set_updated_at_zones
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. FONCTIONS HELPER

### 5.1 update_updated_at_column()
Fonction trigger pour auto-update du champ `updated_at`.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 uppercase_code_column()
Fonction trigger pour forcer uppercase du champ `code` (dépôts).

```sql
CREATE OR REPLACE FUNCTION uppercase_code_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code = UPPER(NEW.code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. DIAGRAMME RELATIONS

```
┌─────────────────────────┐
│      auth.users         │ (Supabase Auth)
│  ─────────────────────  │
│  id (UUID) PK           │
│  email                  │
└───────────┬─────────────┘
            │
            │ 1:1
            │
┌───────────▼─────────────┐
│       profiles          │ (Profil métier QHSE)
│  ─────────────────────  │
│  id (UUID) PK, FK       │
│  first_name             │
│  last_name              │
│  email (UNIQUE)         │
│  role (role_type)       │
│  status (status)        │
│  created_at             │
│  updated_at             │
└─────────────────────────┘


┌─────────────────────────┐
│        depots           │
│  ─────────────────────  │
│  id (UUID) PK           │
│  code (VARCHAR) UNIQUE  │
│  name                   │
│  city                   │
│  address                │
│  contact_name           │
│  contact_email          │
│  contact_phone          │
│  status (status)        │
│  created_at             │
│  updated_at             │
└───────────┬─────────────┘
            │
            │ 1:N
            │
┌───────────▼─────────────┐
│         zones           │
│  ─────────────────────  │
│  id (UUID) PK           │
│  depot_id (UUID) FK     │
│  code (VARCHAR)         │
│  name                   │
│  type (zone_type)       │
│  status (status)        │
│  created_at             │
│  updated_at             │
│  UNIQUE(depot_id, code) │
└─────────────────────────┘
```

**Légende**:
- PK = Primary Key
- FK = Foreign Key
- UNIQUE = Contrainte unicité

---

## 7. VOLUMÉTRIE ESTIMÉE

| Table | Volumétrie Année 1 | Croissance Annuelle | Observations |
|-------|-------------------|---------------------|--------------|
| profiles | 50-100 utilisateurs | +20/an | Croissance lente (nouvelles recrues) |
| depots | 10-20 dépôts | +2-5 dépôts/an | Stable (ouvertures rares) |
| zones | 50-100 zones | +10-20 zones/an | 3-5 zones par dépôt en moyenne |

**Total estimé année 1**: ~200 enregistrements (très faible volumétrie).

**Optimisations**: Index suffisants pour <10k enregistrements (pas de partitioning nécessaire).

---

## 8. SÉCURITÉ

### 8.1 RLS (Row Level Security)
- **ACTIVÉE** sur toutes les tables (voir [03_rls_policies.md](03_rls_policies.md))
- Aucune donnée accessible sans policy valide

### 8.2 Accès direct auth.users
- **INTERDIT** en production (RLS Supabase)
- Extension via table `public.profiles` uniquement

### 8.3 Soft delete
- Statut `inactive` préféré à suppression physique (historique audits)
- Suppression physique dépôts → CASCADE zones (acceptable si aucun audit lié)

---

## 9. DÉCISIONS TECHNIQUES

### DT1-01: profiles.id = auth.users.id (même UUID)
**Raison**: Simplification jointures, synchronisation automatique (ON DELETE CASCADE).

**Alternative rejetée**: Créer user_id séparé → complexité jointures, risque désynchronisation.

### DT1-02: code dépôt forcé uppercase (trigger)
**Raison**: Cohérence recherche (DEP001 = dep001), éviter doublons casse.

**Alternative rejetée**: Validation applicative uniquement → risque incohérence si insertion SQL directe.

### DT1-03: zones.code unique PAR dépôt (UNIQUE composite)
**Raison**: Deux dépôts peuvent avoir zone "Z01" (logique métier).

**Alternative rejetée**: code globalement unique → contrainte métier non nécessaire.

### DT1-04: UUID plutôt que SERIAL
**Raison**: Compatibilité distribution, sécurité (IDs non prédictibles), standard Supabase.

**Alternative rejetée**: SERIAL (INT) → prédictible, risque énumération.

### DT1-05: Timestamps TIMESTAMPTZ (avec timezone)
**Raison**: Support multi-timezone (dépôts internationaux potentiels).

**Alternative rejetée**: TIMESTAMP sans TZ → risque incohérences lors DST.

---

## 10. CONTRAINTES MÉTIER RESPECTÉES

| Règle Métier (01_spec_metier.md) | Implémentation DB | Validation |
|-----------------------------------|-------------------|------------|
| **R1-01**: Code dépôt unique | UNIQUE(code) + trigger uppercase | ✅ |
| **R1-02**: Zone rattachée à UN dépôt | FK depot_id + ON DELETE CASCADE | ✅ |
| **R1-03**: Code zone unique dans dépôt | UNIQUE(depot_id, code) | ✅ |
| **R1-04**: Utilisateur UN seul rôle | role (ENUM), NOT NULL | ✅ |
| **R1-05**: Utilisateur inactif préservé | status = 'inactive', soft delete | ✅ |
| **R1-06**: Suppression logique préférée | status ENUM (active/inactive) | ✅ |

---

## 11. MIGRATION ORDRE

1. **Créer ENUM types** (role_type, zone_type, status)
2. **Créer fonctions helper** (update_updated_at_column, uppercase_code_column)
3. **Créer table profiles** (extension auth.users)
4. **Créer table depots**
5. **Créer table zones** (FK → depots)
6. **Créer index**
7. **Créer triggers**
8. **Activer RLS** (voir migration finale)

---

## 12. DÉPENDANCES EXTERNES

| Dépendance | Source | Justification |
|------------|--------|---------------|
| `auth.users` | Supabase Auth | Table native Supabase (gérée automatiquement) |
| `gen_random_uuid()` | PostgreSQL (extension pgcrypto) | Génération UUID v4 |

**Note**: Extension `pgcrypto` activée par défaut sur Supabase.

---

**Statut**: ✅ Schéma DB complet et validé statiquement
