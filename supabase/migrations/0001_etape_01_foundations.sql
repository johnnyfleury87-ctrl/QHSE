-- =====================================================================
-- MIGRATION ÉTAPE 01 - FOUNDATIONS (QHSE)
-- =====================================================================
-- Date: 22 janvier 2026
-- Phase: IMPLÉMENTATION
-- Périmètre: Fondations DB (Auth, Profiles, Depots, Zones)
-- =====================================================================

-- =====================================================================
-- 1. TYPES ENUM
-- =====================================================================

-- Type: Rôles utilisateurs QHSE
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM (
      'admin_dev',        -- Administrateur technique (droits complets)
      'qhse_manager',     -- Manager QHSE (gestion globale, validation NC)
      'qh_auditor',       -- Auditeur qualité/hygiène
      'safety_auditor',   -- Auditeur sécurité
      'viewer'            -- Consultation uniquement
    );
  END IF;
END $$;

-- Type: Types de zones dans un dépôt
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_type') THEN
    CREATE TYPE zone_type AS ENUM (
      'warehouse',       -- Entrepôt/stockage
      'loading',         -- Quai de chargement
      'office',          -- Bureau
      'production',      -- Zone de production
      'cold_storage'     -- Chambre froide
    );
  END IF;
END $$;

-- Type: Statut actif/inactif (soft delete)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status') THEN
    CREATE TYPE status AS ENUM (
      'active',          -- Actif
      'inactive'         -- Inactif (désactivé)
    );
  END IF;
END $$;

-- =====================================================================
-- 2. FONCTIONS HELPER (utilisées par triggers)
-- =====================================================================

-- Fonction: Auto-update du champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Force uppercase du champ code (pour depots)
CREATE OR REPLACE FUNCTION uppercase_code_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code = UPPER(NEW.code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 3. TABLE: profiles
-- =====================================================================

CREATE TABLE IF NOT EXISTS profiles (
  -- Clé primaire (= auth.users.id)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identité
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  
  -- Rôle métier
  role role_type NOT NULL,
  
  -- Statut
  status status NOT NULL DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes de validation
  CONSTRAINT profiles_email_check CHECK (email ~ '@'),
  CONSTRAINT profiles_first_name_check CHECK (LENGTH(first_name) >= 2),
  CONSTRAINT profiles_last_name_check CHECK (LENGTH(last_name) >= 2)
);

-- Index sur profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 4. TABLE: depots
-- =====================================================================

CREATE TABLE IF NOT EXISTS depots (
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes de validation
  CONSTRAINT depots_code_check CHECK (LENGTH(code) BETWEEN 3 AND 10),
  CONSTRAINT depots_code_format_check CHECK (code ~ '^[A-Z0-9]+$'),
  CONSTRAINT depots_name_check CHECK (LENGTH(name) >= 3),
  CONSTRAINT depots_contact_email_check CHECK (contact_email IS NULL OR contact_email ~ '@')
);

-- Index sur depots
CREATE UNIQUE INDEX IF NOT EXISTS idx_depots_code_upper ON depots(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_depots_city ON depots(city);
CREATE INDEX IF NOT EXISTS idx_depots_status ON depots(status);

-- Triggers sur depots
CREATE TRIGGER uppercase_depot_code
  BEFORE INSERT OR UPDATE ON depots
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();

CREATE TRIGGER set_updated_at_depots
  BEFORE UPDATE ON depots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 5. TABLE: zones
-- =====================================================================

CREATE TABLE IF NOT EXISTS zones (
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
  
  -- Contraintes de validation
  CONSTRAINT zones_code_check CHECK (LENGTH(code) BETWEEN 2 AND 20),
  CONSTRAINT zones_name_check CHECK (LENGTH(name) >= 3),
  
  -- Contrainte unicité code par dépôt
  UNIQUE(depot_id, code)
);

-- Index sur zones
CREATE INDEX IF NOT EXISTS idx_zones_depot_id ON zones(depot_id);
CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(type);
CREATE INDEX IF NOT EXISTS idx_zones_status ON zones(status);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at_zones
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 6. FONCTION HELPER POUR RLS: get_current_user_role()
-- =====================================================================

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS role_type AS $$
DECLARE
  user_role role_type;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Validation stricte
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Profil utilisateur inexistant ou incomplet (user_id: %)', auth.uid()
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================================
-- 7. ACTIVATION RLS SUR TOUTES LES TABLES
-- =====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 8. RLS POLICIES: TABLE profiles
-- =====================================================================

-- Policy 1: admin_dev - Lecture tous profiles
CREATE POLICY admin_dev_select_all_profiles ON profiles
  FOR SELECT
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: admin_dev - Insertion profiles
CREATE POLICY admin_dev_insert_profiles ON profiles
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin_dev');

-- Policy 3: admin_dev - Modification profiles
CREATE POLICY admin_dev_update_profiles ON profiles
  FOR UPDATE
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');

-- Policy 4: qhse_manager - Lecture tous profiles
CREATE POLICY qhse_manager_select_all_profiles ON profiles
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 5: Auditeurs et viewer - Lecture tous profiles
CREATE POLICY auditors_viewers_select_profiles ON profiles
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );

-- Policy 6: Tous utilisateurs - Lecture propre profil
CREATE POLICY all_users_select_own_profile ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy 7: Tous utilisateurs - Modification propre profil (champs limités)
CREATE POLICY all_users_update_own_profile ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================================
-- 9. TRIGGER: Protection modification role/status (anti-escalade)
-- =====================================================================

CREATE OR REPLACE FUNCTION prevent_role_status_self_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si utilisateur non admin tente de modifier son rôle ou statut
  -- Si user modifie son propre profil ET n'est pas admin_dev
  IF NEW.id = auth.uid() AND get_current_user_role() != 'admin_dev' THEN
    -- Restaurer role et status originaux
    NEW.role = OLD.role;
    NEW.status = OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER protect_role_status_self_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_status_self_change();

-- =====================================================================
-- 10. RLS POLICIES: TABLE depots
-- =====================================================================

-- Policy 1: admin_dev - Accès complet
CREATE POLICY admin_dev_select_all_depots ON depots
  FOR SELECT
  USING (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_insert_depots ON depots
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_update_depots ON depots
  FOR UPDATE
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_delete_depots ON depots
  FOR DELETE
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - Lecture, insertion, modification
CREATE POLICY qhse_manager_select_depots ON depots
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');

CREATE POLICY qhse_manager_insert_depots ON depots
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'qhse_manager');

CREATE POLICY qhse_manager_update_depots ON depots
  FOR UPDATE
  USING (get_current_user_role() = 'qhse_manager')
  WITH CHECK (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs et viewer - Lecture seule
CREATE POLICY auditors_viewers_select_depots ON depots
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );

-- =====================================================================
-- 11. RLS POLICIES: TABLE zones
-- =====================================================================

-- Policy 1: admin_dev - Accès complet
CREATE POLICY admin_dev_select_all_zones ON zones
  FOR SELECT
  USING (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_insert_zones ON zones
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_update_zones ON zones
  FOR UPDATE
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_delete_zones ON zones
  FOR DELETE
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - Lecture, insertion, modification
CREATE POLICY qhse_manager_select_zones ON zones
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');

CREATE POLICY qhse_manager_insert_zones ON zones
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'qhse_manager');

CREATE POLICY qhse_manager_update_zones ON zones
  FOR UPDATE
  USING (get_current_user_role() = 'qhse_manager')
  WITH CHECK (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs et viewer - Lecture seule
CREATE POLICY auditors_viewers_select_zones ON zones
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );

-- =====================================================================
-- FIN DE LA MIGRATION ÉTAPE 01
-- =====================================================================
