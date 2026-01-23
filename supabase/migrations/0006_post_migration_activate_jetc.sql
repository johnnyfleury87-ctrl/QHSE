-- =====================================================================
-- SCRIPT POST-MIGRATION 0006
-- ⚠️ À EXÉCUTER APRÈS APPLICATION DE LA MIGRATION 0006
-- =====================================================================
-- Objectif: Activer le flag is_jetc_admin sur votre compte réel
-- Date: 23 janvier 2026
-- =====================================================================

-- =====================================================================
-- 1. IDENTIFIER VOTRE COMPTE
-- =====================================================================

-- Lister tous les comptes existants
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  is_jetc_admin,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- =====================================================================
-- 2. ACTIVER FLAG JETC ADMIN SUR VOTRE COMPTE
-- =====================================================================

-- ⚠️ REMPLACER 'votre-email@example.com' par votre vrai email
UPDATE profiles 
SET is_jetc_admin = true 
WHERE email = 'votre-email@example.com';

-- Vérification
SELECT 
  email,
  role,
  is_jetc_admin,
  status
FROM profiles 
WHERE is_jetc_admin = true;

-- Résultat attendu: 1 ligne (votre compte)
-- email: votre-email@example.com
-- role: admin_dev (ou autre)
-- is_jetc_admin: true
-- status: active

-- =====================================================================
-- 3. VÉRIFICATIONS SÉCURITÉ
-- =====================================================================

-- Vérifier que le trigger empêche auto-élévation
-- (Doit échouer avec erreur)
-- UPDATE profiles 
-- SET is_jetc_admin = true 
-- WHERE id = auth.uid();
-- Erreur attendue: "Interdiction: impossible de s'auto-attribuer le flag is_jetc_admin"

-- Vérifier policies RLS
-- (Doit retourner les 3 policies JETC admin)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
  AND policyname LIKE 'jetc%'
ORDER BY policyname;

-- Résultat attendu: 3 policies
-- jetc_admin_delete_profiles   | DELETE
-- jetc_admin_insert_profiles   | INSERT
-- jetc_admin_update_profiles   | UPDATE

-- =====================================================================
-- 4. TEST CRÉATION UTILISATEUR (VIA SUPABASE DASHBOARD)
-- =====================================================================

-- Après activation is_jetc_admin, tester création user via UI:
-- 1. Se connecter avec votre compte JETC
-- 2. Aller sur / (page d'accueil)
-- 3. Vérifier bloc "Accès JETC Solution" visible
-- 4. Cliquer "Entrer" → /admin
-- 5. Dashboard stats affichées
-- 6. Aller sur /admin/users
-- 7. Cliquer "+ Créer utilisateur"
-- 8. Remplir formulaire test:
--    - Email: test@example.com
--    - Prénom: Test
--    - Nom: User
--    - Rôle: viewer
-- 9. Cliquer "Créer"
-- 10. Vérifier user test apparaît dans liste

-- Vérification DB:
SELECT 
  email,
  first_name,
  last_name,
  role,
  status
FROM profiles
WHERE email = 'test@example.com';

-- Résultat attendu: 1 ligne
-- email: test@example.com
-- first_name: Test
-- last_name: User
-- role: viewer
-- status: active

-- =====================================================================
-- 5. NETTOYAGE (OPTIONNEL)
-- =====================================================================

-- Supprimer utilisateur test créé
-- ⚠️ Remplacer UUID par l'ID réel du user test
-- DELETE FROM profiles WHERE email = 'test@example.com';

-- Vérification: plus de user test
-- SELECT COUNT(*) FROM profiles WHERE email = 'test@example.com';
-- Résultat attendu: 0

-- =====================================================================
-- FIN DU SCRIPT POST-MIGRATION
-- =====================================================================
