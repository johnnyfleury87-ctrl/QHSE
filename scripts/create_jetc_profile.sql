-- =====================================================================
-- SCRIPT: Création/Mise à jour profil JETC Solution
-- =====================================================================
-- Date: 23 janvier 2026
-- Objectif: Créer ligne profiles pour compte Auth JETC (idempotent)
-- User ID: 3ffcea6f-52da-4c83-a45f-31ff4aa35ea4
-- Email: contact@jetc-immo.ch
-- =====================================================================

-- ⚠️ VÉRIFICATION PRÉALABLE: User Auth existe-t-il ?
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4'
  ) THEN
    RAISE EXCEPTION 'User Auth inexistant (ID: 3ffcea6f-52da-4c83-a45f-31ff4aa35ea4). Créez d''abord le user dans Authentication.';
  END IF;
END $$;

-- =====================================================================
-- INSERTION/UPDATE PROFIL (idempotent)
-- =====================================================================

-- Insérer ou mettre à jour le profil
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  role,
  status,
  created_at,
  updated_at
)
VALUES (
  '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4'::uuid,
  'JETC',
  'Solution',
  'contact@jetc-immo.ch',
  'admin_dev'::role_type,
  'active'::status,
  NOW(),
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- =====================================================================
-- ACTIVATION FLAG is_jetc_admin (si colonne existe)
-- =====================================================================

-- Vérifier si colonne is_jetc_admin existe (migration 0006 appliquée)
DO $$
BEGIN
  -- Tenter de mettre à jour is_jetc_admin
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'is_jetc_admin'
  ) THEN
    -- Colonne existe → activer flag JETC admin
    UPDATE public.profiles 
    SET is_jetc_admin = true 
    WHERE id = '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4';
    
    RAISE NOTICE 'Flag is_jetc_admin activé pour contact@jetc-immo.ch';
  ELSE
    RAISE NOTICE 'Colonne is_jetc_admin inexistante (migration 0006 non appliquée). Profil créé sans flag.';
  END IF;
END $$;

-- =====================================================================
-- VÉRIFICATION FINALE
-- =====================================================================

-- Afficher le profil créé/mis à jour
SELECT 
  id,
  first_name,
  last_name,
  email,
  role,
  status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_jetc_admin'
    ) THEN (SELECT is_jetc_admin FROM profiles WHERE id = '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4')
    ELSE NULL
  END as is_jetc_admin,
  created_at,
  updated_at
FROM public.profiles
WHERE id = '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4';

-- =====================================================================
-- RÉSULTAT ATTENDU
-- =====================================================================
-- id                                  | 3ffcea6f-52da-4c83-a45f-31ff4aa35ea4
-- first_name                          | JETC
-- last_name                           | Solution
-- email                               | contact@jetc-immo.ch
-- role                                | admin_dev
-- status                              | active
-- is_jetc_admin                       | true (si colonne existe) / NULL (si pas migration 0006)
-- created_at                          | <timestamp>
-- updated_at                          | <timestamp>
-- =====================================================================

-- ✅ Script idempotent: peut être exécuté plusieurs fois sans erreur
-- ✅ Respect contraintes migration 0001 (first_name/last_name >= 2, email unique)
-- ✅ Gestion conditionnelle is_jetc_admin (migration 0006)
