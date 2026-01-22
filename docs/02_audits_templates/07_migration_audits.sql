-- =====================================================
-- MIGRATION ÉTAPE 02 : AUDITS & TEMPLATES
-- =====================================================
-- Version: 2.0
-- Date: 22 janvier 2026
-- Auteur: GitHub Copilot (Claude Sonnet 4.5)
-- Prérequis: Migration Étape 01 appliquée (profiles, depots, zones)
-- 
-- CONTENU:
-- 1. ENUM Types (domaine_audit, statut_template, type_question, criticite_question, statut_audit)
-- 2. Helper Functions (validation template, validation auditeur)
-- 3. Tables (audit_templates, questions, audits, reponses)
-- 4. Triggers (updated_at, uppercase, validation métier)
-- 5. RLS Activation (4 tables)
-- 6. RLS Policies (21 policies)
-- 7. Post-migration Checks
--
-- ⚠️ IMPORTANT:
-- - Cette migration N'A PAS ÉTÉ APPLIQUÉE sur Supabase
-- - Exécution manuelle requise APRÈS validation humaine
-- - Tester sur environnement TEST en priorité
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TYPES ENUM
-- =====================================================

-- Domaines QHSE
CREATE TYPE domaine_audit AS ENUM (
  'securite',
  'qualite',
  'hygiene',
  'environnement',
  'global'
);

COMMENT ON TYPE domaine_audit IS 'Domaines QHSE pour catégoriser templates audit';

-- Statut lifecycle template
CREATE TYPE statut_template AS ENUM (
  'brouillon',
  'actif',
  'archive'
);

COMMENT ON TYPE statut_template IS 'Cycle de vie template (brouillon → actif → archive)';

-- Type réponse question
CREATE TYPE type_question AS ENUM (
  'oui_non',
  'choix_multiple',
  'texte_libre',
  'note_1_5'
);

COMMENT ON TYPE type_question IS 'Format réponse attendu pour questions audit';

-- Criticité question
CREATE TYPE criticite_question AS ENUM (
  'faible',
  'moyenne',
  'haute',
  'critique'
);

COMMENT ON TYPE criticite_question IS 'Niveau importance question (impact scoring)';

-- Statut avancement audit
CREATE TYPE statut_audit AS ENUM (
  'planifie',
  'en_cours',
  'termine',
  'annule'
);

COMMENT ON TYPE statut_audit IS 'État avancement audit terrain';

-- =====================================================
-- 2. HELPER FUNCTIONS
-- =====================================================

-- Fonction: Vérifier si template est actif
CREATE OR REPLACE FUNCTION is_template_active(template_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM audit_templates
    WHERE id = template_uuid
    AND statut = 'actif'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION is_template_active IS 'Vérifie si template audit est actif';

-- Fonction: Vérifier si profile a rôle auditeur valide
CREATE OR REPLACE FUNCTION is_valid_auditor(profile_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = profile_uuid
    AND role IN ('qh_auditor', 'safety_auditor', 'qhse_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION is_valid_auditor IS 'Vérifie si profile peut être auditeur (rôles autorisés)';

-- =====================================================
-- 3. TABLES
-- =====================================================

-- Table: audit_templates (modèles audit réutilisables)
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

COMMENT ON TABLE audit_templates IS 'Modèles audit réutilisables par domaine QHSE';
COMMENT ON COLUMN audit_templates.code IS 'Identifiant unique template (ex: AUD-SEC-2025)';
COMMENT ON COLUMN audit_templates.version IS 'Numéro version (incrémenté à chaque modification)';
COMMENT ON COLUMN audit_templates.createur_id IS 'Profile ayant créé le template';

-- Indexes audit_templates
CREATE INDEX idx_audit_templates_domaine ON audit_templates(domaine);
CREATE INDEX idx_audit_templates_statut ON audit_templates(statut);
CREATE INDEX idx_audit_templates_createur ON audit_templates(createur_id);
CREATE INDEX idx_audit_templates_code ON audit_templates(code);

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

-- =====================================================

-- Table: questions (items du questionnaire template)
CREATE TABLE questions (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Appartenance
  template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL,
  
  -- Contenu
  libelle TEXT NOT NULL,
  type type_question NOT NULL,
  aide TEXT,
  
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

COMMENT ON TABLE questions IS 'Questions composant les templates audit';
COMMENT ON COLUMN questions.ordre IS 'Position question dans questionnaire (1, 2, 3...)';
COMMENT ON COLUMN questions.type IS 'Format réponse (oui_non, texte_libre, etc.)';
COMMENT ON COLUMN questions.criticite IS 'Niveau importance (impact score)';
COMMENT ON COLUMN questions.points_max IS 'Score maximum si réponse conforme';

-- Indexes questions
CREATE INDEX idx_questions_template ON questions(template_id);
CREATE INDEX idx_questions_template_ordre ON questions(template_id, ordre);
CREATE INDEX idx_questions_criticite ON questions(criticite);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_questions
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- Table: audits (instances audit terrain)
CREATE TABLE audits (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  code VARCHAR(30) NOT NULL UNIQUE,
  
  -- Relations
  template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE RESTRICT,
  auditeur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Cible (XOR: depot OU zone)
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
  taux_conformite NUMERIC(5,2),
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

COMMENT ON TABLE audits IS 'Instances audit (exécutions terrain templates)';
COMMENT ON COLUMN audits.code IS 'Identifiant unique audit (ex: AUD-LYO-2025-001)';
COMMENT ON COLUMN audits.depot_id IS 'Dépôt audité (XOR avec zone_id)';
COMMENT ON COLUMN audits.zone_id IS 'Zone auditée (XOR avec depot_id)';
COMMENT ON COLUMN audits.score_obtenu IS 'Points obtenus (calculé depuis réponses)';
COMMENT ON COLUMN audits.taux_conformite IS '% conformité (score_obtenu / score_maximum * 100)';

-- Indexes audits
CREATE INDEX idx_audits_template ON audits(template_id);
CREATE INDEX idx_audits_auditeur ON audits(auditeur_id);
CREATE INDEX idx_audits_depot ON audits(depot_id);
CREATE INDEX idx_audits_zone ON audits(zone_id);
CREATE INDEX idx_audits_statut ON audits(statut);
CREATE INDEX idx_audits_date_planifiee ON audits(date_planifiee);
CREATE INDEX idx_audits_date_realisee ON audits(date_realisee);
CREATE INDEX idx_audits_code ON audits(code);

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

-- =====================================================

-- Table: reponses (réponses auditeur aux questions)
CREATE TABLE reponses (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  
  -- Réponse
  valeur JSONB NOT NULL,
  points_obtenus INTEGER NOT NULL DEFAULT 0,
  est_conforme BOOLEAN NOT NULL DEFAULT true,
  
  -- Observations
  commentaire TEXT,
  photo_url TEXT,
  
  -- Traçabilité
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT reponses_unique_par_question 
    UNIQUE(audit_id, question_id),
  CONSTRAINT reponses_points_obtenus_check 
    CHECK (points_obtenus >= 0)
);

COMMENT ON TABLE reponses IS 'Réponses auditeur aux questions audit';
COMMENT ON COLUMN reponses.valeur IS 'Réponse JSON flexible (ex: {"reponse": true} pour oui_non)';
COMMENT ON COLUMN reponses.points_obtenus IS 'Score obtenu pour cette réponse (≤ question.points_max)';
COMMENT ON COLUMN reponses.est_conforme IS 'Réponse conforme ? (false = non-conformité)';
COMMENT ON COLUMN reponses.photo_url IS 'Photo preuve (Supabase Storage bucket audit_photos)';

-- Indexes reponses
CREATE INDEX idx_reponses_audit ON reponses(audit_id);
CREATE INDEX idx_reponses_question ON reponses(question_id);
CREATE INDEX idx_reponses_est_conforme ON reponses(est_conforme);
CREATE INDEX idx_reponses_audit_question ON reponses(audit_id, question_id);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_reponses
  BEFORE UPDATE ON reponses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. TRIGGERS VALIDATION MÉTIER
-- =====================================================

-- Trigger: Valider template actif avant INSERT audit
CREATE OR REPLACE FUNCTION validate_template_actif_before_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_template_active(NEW.template_id) THEN
    RAISE EXCEPTION 'Template % n''est pas actif', NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_template_actif_before_insert_audit
  BEFORE INSERT ON audits
  FOR EACH ROW
  EXECUTE FUNCTION validate_template_actif_before_audit();

COMMENT ON TRIGGER check_template_actif_before_insert_audit ON audits IS 'Vérifie template actif avant création audit';

-- Trigger: Valider rôle auditeur
CREATE OR REPLACE FUNCTION validate_auditeur_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_valid_auditor(NEW.auditeur_id) THEN
    RAISE EXCEPTION 'Profile % n''a pas de rôle auditeur valide', NEW.auditeur_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_auditeur_role_before_insert_audit
  BEFORE INSERT OR UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION validate_auditeur_role();

COMMENT ON TRIGGER check_auditeur_role_before_insert_audit ON audits IS 'Vérifie rôle auditeur valide (qh_auditor, safety_auditor, qhse_manager)';

-- Trigger: Valider points_obtenus ≤ points_max (RG-10)
CREATE OR REPLACE FUNCTION validate_points_obtenus()
RETURNS TRIGGER AS $$
DECLARE
  v_points_max INTEGER;
BEGIN
  -- Récupérer points_max de la question
  SELECT points_max INTO v_points_max
  FROM questions
  WHERE id = NEW.question_id;

  -- Vérifier points_obtenus ≤ points_max
  IF NEW.points_obtenus > v_points_max THEN
    RAISE EXCEPTION 'Points obtenus (%) dépasse points_max (%) pour question %',
      NEW.points_obtenus, v_points_max, NEW.question_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_points_obtenus_before_insert_reponse
  BEFORE INSERT OR UPDATE ON reponses
  FOR EACH ROW
  WHEN (NEW.points_obtenus IS NOT NULL)
  EXECUTE FUNCTION validate_points_obtenus();

COMMENT ON TRIGGER check_points_obtenus_before_insert_reponse ON reponses IS 'Vérifie points_obtenus ≤ points_max de la question (RG-10)';

-- =====================================================
-- 5. ACTIVATION RLS
-- =====================================================

ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reponses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- -----------------------------------------
-- 6.1 POLICIES: audit_templates (4)
-- -----------------------------------------

-- Policy 1: admin_dev - CRUD complet
CREATE POLICY admin_dev_all_audit_templates ON audit_templates
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_audit_templates ON audit_templates
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT templates actifs
CREATE POLICY auditors_select_active_templates ON audit_templates
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    statut = 'actif'
  );

-- Policy 4: Viewer - SELECT templates actifs
CREATE POLICY viewer_select_active_templates ON audit_templates
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer' AND
    statut = 'actif'
  );

-- -----------------------------------------
-- 6.2 POLICIES: questions (4)
-- -----------------------------------------

-- Policy 1: admin_dev - CRUD complet
CREATE POLICY admin_dev_all_questions ON questions
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_questions ON questions
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT questions templates actifs
CREATE POLICY auditors_select_questions ON questions
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    EXISTS (
      SELECT 1 FROM audit_templates
      WHERE id = questions.template_id
      AND statut = 'actif'
    )
  );

-- Policy 4: Viewer - SELECT questions templates actifs
CREATE POLICY viewer_select_questions ON questions
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer' AND
    EXISTS (
      SELECT 1 FROM audit_templates
      WHERE id = questions.template_id
      AND statut = 'actif'
    )
  );

-- -----------------------------------------
-- 6.3 POLICIES: audits (6)
-- -----------------------------------------

-- Policy 1: admin_dev - CRUD complet
CREATE POLICY admin_dev_all_audits ON audits
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_audits ON audits
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT tous audits
CREATE POLICY auditors_select_all_audits ON audits
  FOR SELECT
  USING (get_current_user_role() IN ('qh_auditor', 'safety_auditor'));

-- Policy 4: Auditeurs - INSERT audits propres
CREATE POLICY auditors_insert_own_audits ON audits
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    auditeur_id = auth.uid()
  );

-- Policy 5: Auditeurs - UPDATE audits propres (avant terminé)
CREATE POLICY auditors_update_own_audits ON audits
  FOR UPDATE
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    auditeur_id = auth.uid() AND
    statut != 'termine'
  );

-- Policy 6: Viewer - SELECT audits terminés
CREATE POLICY viewer_select_finished_audits ON audits
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer' AND
    statut = 'termine'
  );

-- ⚠️ PAS DE POLICY DELETE AUDITS POUR AUDITEURS
-- Suppression réservée admin_dev et qhse_manager (traçabilité)

-- -----------------------------------------
-- 6.4 POLICIES: reponses (7)
-- -----------------------------------------

-- Policy 1: admin_dev - CRUD complet
CREATE POLICY admin_dev_all_reponses ON reponses
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_reponses ON reponses
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT réponses propres audits
CREATE POLICY auditors_select_own_reponses ON reponses
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    EXISTS (
      SELECT 1 FROM audits
      WHERE id = reponses.audit_id
      AND auditeur_id = auth.uid()
    )
  );

-- Policy 4: Auditeurs - INSERT réponses propres audits (avant terminé)
CREATE POLICY auditors_insert_own_reponses ON reponses
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    EXISTS (
      SELECT 1 FROM audits
      WHERE id = audit_id
      AND auditeur_id = auth.uid()
      AND statut != 'termine'
    )
  );

-- Policy 5: Auditeurs - UPDATE réponses propres audits (avant terminé)
CREATE POLICY auditors_update_own_reponses ON reponses
  FOR UPDATE
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    EXISTS (
      SELECT 1 FROM audits
      WHERE id = reponses.audit_id
      AND auditeur_id = auth.uid()
      AND statut != 'termine'
    )
  );

-- Policy 6: Auditeurs - DELETE réponses propres audits (avant terminé)
CREATE POLICY auditors_delete_own_reponses ON reponses
  FOR DELETE
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    EXISTS (
      SELECT 1 FROM audits
      WHERE id = reponses.audit_id
      AND auditeur_id = auth.uid()
      AND statut != 'termine'
    )
  );

-- Policy 7: Viewer - SELECT toutes réponses
CREATE POLICY viewer_select_reponses ON reponses
  FOR SELECT
  USING (get_current_user_role() = 'viewer');

-- =====================================================
-- 7. POST-MIGRATION CHECKS
-- =====================================================

-- Check 1: Vérifier ENUMs créés
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_type WHERE typname IN (
    'domaine_audit', 'statut_template', 'type_question', 'criticite_question', 'statut_audit'
  )) = 5, 'Erreur: 5 ENUMs attendus';
  RAISE NOTICE '✅ CHECK 1: ENUMs créés (5/5)';
END $$;

-- Check 2: Vérifier tables créées
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('audit_templates', 'questions', 'audits', 'reponses')
  ) = 4, 'Erreur: 4 tables attendues';
  RAISE NOTICE '✅ CHECK 2: Tables créées (4/4)';
END $$;

-- Check 3: Vérifier RLS activée
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('audit_templates', 'questions', 'audits', 'reponses')
    AND rowsecurity = true
  ) = 4, 'Erreur: RLS attendue sur 4 tables';
  RAISE NOTICE '✅ CHECK 3: RLS activée (4/4)';
END $$;

-- Check 4: Vérifier policies créées
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename IN ('audit_templates', 'questions', 'audits', 'reponses')
  ) = 21, 'Erreur: 21 policies attendues';
  RAISE NOTICE '✅ CHECK 4: Policies créées (21/21)';
END $$;

-- Check 5: Vérifier fonctions helper
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_proc 
    WHERE proname IN ('is_template_active', 'is_valid_auditor')
  ) = 2, 'Erreur: 2 fonctions helper attendues';
  RAISE NOTICE '✅ CHECK 5: Fonctions helper créées (2/2)';
END $$;

-- Check 6: Vérifier triggers validation
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_trigger 
    WHERE tgname IN ('check_template_actif_before_insert_audit', 'check_auditeur_role_before_insert_audit')
  ) = 2, 'Erreur: 2 triggers validation attendus';
  RAISE NOTICE '✅ CHECK 6: Triggers validation créés (2/2)';
END $$;

COMMIT;

-- =====================================================
-- FIN MIGRATION ÉTAPE 02
-- =====================================================

-- Récapitulatif:
-- ✅ 5 ENUMs créés
-- ✅ 4 tables créées (audit_templates, questions, audits, reponses)
-- ✅ 2 fonctions helper (is_template_active, is_valid_auditor)
-- ✅ 2 triggers validation métier
-- ✅ RLS activée sur 4 tables
-- ✅ 21 policies RLS (4 + 4 + 6 + 7)
--
-- Total cumulé:
-- - Étape 01: 23 policies (profiles, depots, zones)
-- - Étape 02: 21 policies (audit_templates, questions, audits, reponses)
-- - TOTAL: 44 policies RLS

-- ⚠️ PROCHAINES ÉTAPES:
-- 1. Valider cette migration sur environnement TEST
-- 2. Créer profiles test (5 rôles) via Supabase Dashboard
-- 3. Exécuter tests validation (21 scénarios)
-- 4. Si OK → appliquer en PRODUCTION
-- 5. Créer bucket Supabase Storage "audit_photos"
