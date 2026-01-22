-- =====================================================
-- Migration Finale – Foundations (Étape 01)
-- =====================================================
-- Date: 22 janvier 2026
-- Objectif: Créer tables profiles, depots, zones + RLS
-- Version: 20260122_foundations
-- CLARIFICATION: profiles = table métier (1:1 avec auth.users)
-- =====================================================

-- ⚠️ CETTE MIGRATION NE DOIT PAS ÊTRE EXÉCUTÉE TANT QUE:
-- 1. Documentation étape 01 complète et validée
-- 2. Rapport QHSE_ETAPE_01_RAPPORT_CONTROLE.md généré
-- 3. Validation humaine explicite reçue
-- =====================================================

BEGIN;

-- =====================================================
-- 0. EXTENSIONS REQUISES
-- =====================================================

-- Extension pgcrypto (pour gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMENT ON EXTENSION pgcrypto IS 'Fonction gen_random_uuid() pour UUID aléatoires';

-- =====================================================
-- 1. CRÉATION ENUM TYPES
-- =====================================================

-- Rôles utilisateurs
CREATE TYPE role_type AS ENUM (
  'admin_dev',
  'qhse_manager',
  'qh_auditor',
  'safety_auditor',
  'viewer'
);

-- Types de zones
CREATE TYPE zone_type AS ENUM (
  'warehouse',
  'loading',
  'office',
  'production',
  'cold_storage'
);

-- Statut (actif/inactif)
CREATE TYPE status AS ENUM (
  'active',
  'inactive'
);

COMMENT ON TYPE role_type IS 'Rôles utilisateurs QHSE';
COMMENT ON TYPE zone_type IS 'Types de zones dans dépôts';
COMMENT ON TYPE status IS 'Statut entités (active/inactive)';

-- =====================================================
-- 2. FONCTIONS HELPER
-- =====================================================

-- Fonction: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function: auto-update updated_at timestamp';

-- Fonction: Force uppercase code (depots)
CREATE OR REPLACE FUNCTION uppercase_code_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code = UPPER(NEW.code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION uppercase_code_column() IS 'Trigger function: force uppercase depot code';

-- Fonction: Récupérer rôle utilisateur courant (pour RLS)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS role_type AS $$
DECLARE
  user_role role_type;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_current_user_role() IS 'RLS helper: retourne rôle de l''utilisateur connecté';

-- Fonction: Empêcher user de modifier son propre role/status
CREATE OR REPLACE FUNCTION prevent_role_status_self_change()
RETURNS TRIGGER AS $$
BEGIN
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

COMMENT ON FUNCTION prevent_role_status_self_change() IS 'Trigger function: empêche auto-modification role/status (sauf admin_dev)';

-- =====================================================
-- 3. TABLE: profiles
-- =====================================================

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT profiles_first_name_check CHECK (LENGTH(first_name) >= 2),
  CONSTRAINT profiles_last_name_check CHECK (LENGTH(last_name) >= 2),
  CONSTRAINT profiles_email_check CHECK (email ~ '@')
);

COMMENT ON TABLE profiles IS 'Profils utilisateurs QHSE (extension auth.users, relation 1:1)';
COMMENT ON COLUMN profiles.id IS 'UUID (même que auth.users.id)';
COMMENT ON COLUMN profiles.role IS 'Rôle métier QHSE';
COMMENT ON COLUMN profiles.status IS 'Statut utilisateur (active/inactive)';

-- Index profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- Triggers profiles
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_role_status_immutability
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_status_self_change();

-- =====================================================
-- 4. TABLE: depots
-- =====================================================

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT depots_code_check CHECK (LENGTH(code) BETWEEN 3 AND 10),
  CONSTRAINT depots_code_format_check CHECK (code ~ '^[A-Z0-9]+$'),
  CONSTRAINT depots_name_check CHECK (LENGTH(name) >= 3),
  CONSTRAINT depots_contact_email_check CHECK (contact_email IS NULL OR contact_email ~ '@')
);

COMMENT ON TABLE depots IS 'Dépôts/sites physiques (entrepôts, usines)';
COMMENT ON COLUMN depots.code IS 'Code unique dépôt (alphanumérique uppercase, 3-10 chars)';
COMMENT ON COLUMN depots.status IS 'Statut dépôt (active/inactive)';

-- Index depots
CREATE UNIQUE INDEX idx_depots_code_upper ON depots(UPPER(code));
CREATE INDEX idx_depots_city ON depots(city);
CREATE INDEX idx_depots_status ON depots(status);

-- Triggers depots
CREATE TRIGGER uppercase_depot_code
  BEFORE INSERT OR UPDATE ON depots
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();

CREATE TRIGGER set_updated_at_depots
  BEFORE UPDATE ON depots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. TABLE: zones
-- =====================================================

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
  
  -- Contraintes
  CONSTRAINT zones_code_check CHECK (LENGTH(code) BETWEEN 2 AND 20),
  CONSTRAINT zones_name_check CHECK (LENGTH(name) >= 3),
  UNIQUE(depot_id, code)
);

COMMENT ON TABLE zones IS 'Zones au sein des dépôts (subdivision spatiale)';
COMMENT ON COLUMN zones.depot_id IS 'FK vers depots (ON DELETE CASCADE)';
COMMENT ON COLUMN zones.code IS 'Code zone (unique PAR dépôt)';
COMMENT ON COLUMN zones.type IS 'Type de zone (warehouse, loading, office, production, cold_storage)';

-- Index zones
CREATE INDEX idx_zones_depot_id ON zones(depot_id);
CREATE INDEX idx_zones_type ON zones(type);
CREATE INDEX idx_zones_status ON zones(status);

-- Trigger zones
CREATE TRIGGER set_updated_at_zones
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- 6.1 RLS POLICIES: profiles
-- -----------------------------------------------------

-- admin_dev: Accès complet
CREATE POLICY admin_dev_select_all_profiles ON profiles
  FOR SELECT
  USING (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_insert_profiles ON profiles
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_update_profiles ON profiles
  FOR UPDATE
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');

-- ⚠️ PAS DE DELETE sur profiles (soft delete obligatoire via status='inactive')
-- Stratégie: Profiles JAMAIS supprimés physiquement (historique audits)

-- qhse_manager: Lecture seule profiles
CREATE POLICY qhse_manager_select_all_profiles ON profiles
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');

-- Auditeurs et viewer: Lecture seule profiles
CREATE POLICY auditors_viewers_select_profiles ON profiles
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );

-- Tous users: Lecture propre profil
CREATE POLICY all_users_select_own_profile ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Tous users: Modification propre profil (champs limités via trigger)
CREATE POLICY all_users_update_own_profile ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------
-- 6.2 RLS POLICIES: depots
-- -----------------------------------------------------

-- admin_dev: Accès complet
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

-- qhse_manager: Lecture + écriture (pas suppression)
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

-- Auditeurs et viewer: Lecture seule
CREATE POLICY auditors_viewers_select_depots ON depots
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );

-- -----------------------------------------------------
-- 6.3 RLS POLICIES: zones
-- -----------------------------------------------------

-- admin_dev: Accès complet
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

-- qhse_manager: Lecture + écriture (pas suppression)
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

-- Auditeurs et viewer: Lecture seule
CREATE POLICY auditors_viewers_select_zones ON zones
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );

-- =====================================================
-- 7. SEED DATA (OPTIONNEL - PROD)
-- =====================================================

-- Insérer utilisateur admin par défaut (à adapter selon environnement)
-- NOTE: En prod, créer via Supabase Dashboard ou CLI avec email réel
-- Ce seed est désactivé par défaut (commenté)

/*
-- Exemple seed admin (à décommenter après avoir créé user dans Supabase Auth)
INSERT INTO profiles (id, first_name, last_name, email, role, status)
VALUES (
  'REMPLACER_PAR_UUID_SUPABASE_AUTH'::uuid,
  'Admin',
  'System',
  'admin@qhse.local',
  'admin_dev',
  'active'
);
*/

-- =====================================================
-- 8. GRANTS (PERMISSIONS SUPABASE)
-- =====================================================

-- Supabase gère automatiquement les grants via RLS
-- Pas de GRANT explicites nécessaires

-- =====================================================
-- FIN MIGRATION
-- =====================================================

COMMIT;

-- =====================================================
-- POST-MIGRATION CHECKS (à exécuter manuellement)
-- =====================================================

-- Vérifier ENUM créés
-- SELECT * FROM pg_type WHERE typname IN ('role_type', 'zone_type', 'status');

-- Vérifier tables créées
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'depots', 'zones');

-- Vérifier RLS activée
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'depots', 'zones');

-- Vérifier policies créées
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Compter policies par table
-- SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename;

-- =====================================================
-- ROLLBACK (en cas d'erreur)
-- =====================================================

-- En cas d'erreur, exécuter:
-- BEGIN;
-- DROP TABLE IF EXISTS zones CASCADE;
-- DROP TABLE IF EXISTS depots CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;
-- DROP FUNCTION IF EXISTS prevent_role_status_self_change() CASCADE;
-- DROP FUNCTION IF EXISTS uppercase_code_column() CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- DROP TYPE IF EXISTS status CASCADE;
-- DROP TYPE IF EXISTS zone_type CASCADE;
-- DROP TYPE IF EXISTS role_type CASCADE;
-- COMMIT;

-- =====================================================
-- NOTES IMPORTANTES
-- =====================================================

-- 1. Cette migration doit être appliquée sur base Supabase vierge ou après reset complet
-- 2. Supabase Auth (auth.users) doit être actif
-- 3. Extension pgcrypto doit être activée (par défaut sur Supabase)
-- 4. Tester sur environnement TEST avant production
-- 5. Sauvegarder base avant application en production

-- =====================================================
-- VERSION & METADATA
-- =====================================================

-- Version migration: 20260122_foundations
-- Date création: 22 janvier 2026
-- Auteur: GitHub Copilot (Claude Sonnet 4.5)
-- Projet: QHSE Audit Manager
-- Étape: 01 - Foundations (DB + Auth)
-- Documentation: /docs/01_foundations/

-- =====================================================
-- ✅ MIGRATION PRÊTE (EN ATTENTE VALIDATION HUMAINE)
-- =====================================================
