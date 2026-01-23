-- =====================================================================
-- MIGRATION ÉTAPE 06 - ADMIN USERS MANAGEMENT (JETC SOLUTION)
-- =====================================================================
-- Date: 23 janvier 2026
-- Phase: IMPLÉMENTATION
-- Périmètre: Flag JETC admin + policies DELETE/INSERT users
-- =====================================================================

-- =====================================================================
-- 1. AJOUT COLONNE is_jetc_admin (flag super-admin)
-- =====================================================================

-- Ajouter colonne is_jetc_admin sur profiles (default false)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_jetc_admin BOOLEAN NOT NULL DEFAULT false;

-- Index pour optimiser requêtes RLS
CREATE INDEX IF NOT EXISTS idx_profiles_is_jetc_admin 
ON profiles(is_jetc_admin) 
WHERE is_jetc_admin = true;

-- Commentaire documentation
COMMENT ON COLUMN profiles.is_jetc_admin IS 'Flag super-admin JETC Solution (gestion utilisateurs)';

-- =====================================================================
-- 2. RLS POLICIES: DELETE profiles (JETC admin uniquement)
-- =====================================================================

-- Policy: JETC admin peut supprimer utilisateurs (soft delete via status recommandé)
CREATE POLICY jetc_admin_delete_profiles ON profiles
  FOR DELETE
  USING (
    -- Vérifier que l'utilisateur connecté a le flag is_jetc_admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_jetc_admin = true
    )
  );

-- =====================================================================
-- 3. RLS POLICIES: Restreindre INSERT/UPDATE users (JETC admin)
-- =====================================================================

-- ⚠️ SUPPRESSION des anciennes policies admin_dev INSERT/UPDATE
-- (car elles donnent accès à TOUS les admin_dev)
DROP POLICY IF EXISTS admin_dev_insert_profiles ON profiles;
DROP POLICY IF EXISTS admin_dev_update_profiles ON profiles;

-- Nouvelle policy: INSERT profiles (JETC admin uniquement)
CREATE POLICY jetc_admin_insert_profiles ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_jetc_admin = true
    )
  );

-- Nouvelle policy: UPDATE profiles (JETC admin uniquement)
CREATE POLICY jetc_admin_update_profiles ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_jetc_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_jetc_admin = true
    )
  );

-- =====================================================================
-- 4. FONCTION HELPER: is_jetc_admin()
-- =====================================================================

CREATE OR REPLACE FUNCTION is_jetc_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_jetc_admin 
    FROM profiles 
    WHERE id = auth.uid()
  ) = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION is_jetc_admin IS 'Vérifie si l''utilisateur connecté est JETC admin';

-- =====================================================================
-- 5. PROTECTION: Empêcher auto-modification is_jetc_admin
-- =====================================================================

-- Fonction trigger: empêche utilisateur de s'auto-attribuer is_jetc_admin
CREATE OR REPLACE FUNCTION prevent_self_jetc_elevation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si utilisateur tente de modifier son propre is_jetc_admin
  IF NEW.id = auth.uid() AND OLD.is_jetc_admin != NEW.is_jetc_admin THEN
    -- Vérifier si l''utilisateur est déjà JETC admin
    IF NOT is_jetc_admin() THEN
      RAISE EXCEPTION 'Interdiction: impossible de s''auto-attribuer le flag is_jetc_admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Trigger: protection modification is_jetc_admin
CREATE TRIGGER protect_jetc_admin_self_elevation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_jetc_elevation();

-- =====================================================================
-- FIN DE LA MIGRATION ÉTAPE 06
-- =====================================================================
