-- =====================================================================
-- MIGRATION ÉTAPE 02 - AUDITS & TEMPLATES (QHSE)
-- =====================================================================
-- Date: 22 janvier 2026
-- Phase: IMPLÉMENTATION
-- Périmètre: Audits terrain et modèles d'audit réutilisables
-- Prérequis: Migration 0001_etape_01_foundations.sql appliquée
-- =====================================================================

-- =====================================================================
-- 1. TYPES ENUM
-- =====================================================================

-- Type: Domaines QHSE
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'domaine_audit') THEN
    CREATE TYPE domaine_audit AS ENUM (
      'securite',      -- Sécurité au travail
      'qualite',       -- Qualité des processus
      'hygiene',       -- Hygiène et santé
      'environnement', -- Impact environnemental
      'global'         -- Audit complet multi-domaines
    );
  END IF;
END $$;

-- Type: Cycle de vie template
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_template') THEN
    CREATE TYPE statut_template AS ENUM (
      'brouillon', -- En cours de création
      'actif',     -- Utilisable pour nouveaux audits
      'archive'    -- Plus utilisable (historique seulement)
    );
  END IF;
END $$;

-- Type: Format réponse question
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_question') THEN
    CREATE TYPE type_question AS ENUM (
      'oui_non',         -- Réponse booléenne
      'choix_multiple',  -- Options prédéfinies
      'texte_libre',     -- Commentaire ouvert
      'note_1_5'         -- Notation 1 à 5
    );
  END IF;
END $$;

-- Type: Niveau criticité question
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'criticite_question') THEN
    CREATE TYPE criticite_question AS ENUM (
      'faible',   -- Impact mineur
      'moyenne',  -- Impact modéré
      'haute',    -- Impact important
      'critique'  -- Impact majeur (sécurité, légal)
    );
  END IF;
END $$;

-- Type: État avancement audit
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_audit') THEN
    CREATE TYPE statut_audit AS ENUM (
      'planifie', -- Audit planifié (pas encore commencé)
      'en_cours', -- Audit en cours de réalisation
      'termine',  -- Audit terminé (toutes réponses saisies)
      'annule'    -- Audit annulé (non réalisé)
    );
  END IF;
END $$;

-- =====================================================================
-- 2. FONCTIONS HELPER
-- =====================================================================

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

-- Fonction: Vérifier accès audit (helper RLS)
CREATE OR REPLACE FUNCTION has_audit_access(audit_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_audit_auditeur UUID;
BEGIN
  v_user_role := get_current_user_role();
  
  -- Admin/Manager: accès total
  IF v_user_role IN ('admin_dev', 'qhse_manager') THEN
    RETURN true;
  END IF;
  
  -- Auditeurs: accès si auditeur_id = auth.uid()
  IF v_user_role IN ('qh_auditor', 'safety_auditor') THEN
    SELECT auditeur_id INTO v_audit_auditeur
    FROM audits
    WHERE id = audit_uuid;
    
    IF v_audit_auditeur = auth.uid() THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Viewer: accès si audit terminé
  IF v_user_role = 'viewer' THEN
    RETURN EXISTS (
      SELECT 1 FROM audits
      WHERE id = audit_uuid
      AND statut = 'termine'
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION has_audit_access TO authenticated;

COMMENT ON FUNCTION has_audit_access IS 
'Vérifie accès audit selon rôle: admin/manager (tous), auditeur (propres), viewer (terminés). Helper RLS Étape 02.';

-- =====================================================================
-- 3. TABLE: audit_templates
-- =====================================================================

CREATE TABLE IF NOT EXISTS audit_templates (
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

-- Index sur audit_templates
CREATE INDEX IF NOT EXISTS idx_audit_templates_domaine ON audit_templates(domaine);
CREATE INDEX IF NOT EXISTS idx_audit_templates_statut ON audit_templates(statut);
CREATE INDEX IF NOT EXISTS idx_audit_templates_createur ON audit_templates(createur_id);
CREATE INDEX IF NOT EXISTS idx_audit_templates_code ON audit_templates(code);

-- Triggers sur audit_templates
CREATE TRIGGER set_updated_at_audit_templates
  BEFORE UPDATE ON audit_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER uppercase_audit_template_code
  BEFORE INSERT OR UPDATE ON audit_templates
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();

-- =====================================================================
-- 4. TABLE: questions
-- =====================================================================

CREATE TABLE IF NOT EXISTS questions (
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

-- Index sur questions
CREATE INDEX IF NOT EXISTS idx_questions_template ON questions(template_id);
CREATE INDEX IF NOT EXISTS idx_questions_template_ordre ON questions(template_id, ordre);
CREATE INDEX IF NOT EXISTS idx_questions_criticite ON questions(criticite);

-- Trigger sur questions
CREATE TRIGGER set_updated_at_questions
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 5. TABLE: audits
-- =====================================================================

CREATE TABLE IF NOT EXISTS audits (
  -- Clé primaire
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  code VARCHAR(30) NOT NULL UNIQUE,
  
  -- Relations
  template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE RESTRICT,
  auditeur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Cible: dépôt obligatoire, zone optionnelle (hiérarchie: zone IN depot)
  depot_id UUID NOT NULL REFERENCES depots(id) ON DELETE RESTRICT,
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
  -- depot_id obligatoire, zone_id optionnel (NULL = audit dépôt global)
  CONSTRAINT audits_depot_required_check
    CHECK (depot_id IS NOT NULL),
  CONSTRAINT audits_date_realisee_si_termine_check 
    CHECK (
      (statut = 'termine' AND date_realisee IS NOT NULL) OR
      (statut != 'termine')
    ),
  CONSTRAINT audits_taux_conformite_check 
    CHECK (taux_conformite BETWEEN 0 AND 100)
);

-- Index sur audits
CREATE INDEX IF NOT EXISTS idx_audits_template ON audits(template_id);
CREATE INDEX IF NOT EXISTS idx_audits_auditeur ON audits(auditeur_id);
CREATE INDEX IF NOT EXISTS idx_audits_depot ON audits(depot_id);
CREATE INDEX IF NOT EXISTS idx_audits_zone ON audits(zone_id);
CREATE INDEX IF NOT EXISTS idx_audits_statut ON audits(statut);
CREATE INDEX IF NOT EXISTS idx_audits_date_planifiee ON audits(date_planifiee);
CREATE INDEX IF NOT EXISTS idx_audits_date_realisee ON audits(date_realisee);
CREATE INDEX IF NOT EXISTS idx_audits_code ON audits(code);

-- Triggers sur audits
CREATE TRIGGER set_updated_at_audits
  BEFORE UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER uppercase_audit_code
  BEFORE INSERT OR UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();

-- =====================================================================
-- 6. TABLE: reponses
-- =====================================================================

CREATE TABLE IF NOT EXISTS reponses (
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

-- Index sur reponses
CREATE INDEX IF NOT EXISTS idx_reponses_audit ON reponses(audit_id);
CREATE INDEX IF NOT EXISTS idx_reponses_question ON reponses(question_id);
CREATE INDEX IF NOT EXISTS idx_reponses_est_conforme ON reponses(est_conforme);
CREATE INDEX IF NOT EXISTS idx_reponses_audit_question ON reponses(audit_id, question_id);

-- Trigger sur reponses
CREATE TRIGGER set_updated_at_reponses
  BEFORE UPDATE ON reponses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 7. TRIGGERS VALIDATION MÉTIER
-- =====================================================================

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

-- Trigger: Valider points_obtenus ≤ points_max
CREATE OR REPLACE FUNCTION validate_points_obtenus()
RETURNS TRIGGER AS $$
DECLARE
  v_points_max INTEGER;
BEGIN
  SELECT points_max INTO v_points_max
  FROM questions
  WHERE id = NEW.question_id;

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

-- =====================================================================
-- Trigger: Validation zone appartient au dépôt (modèle hiérarchique)
-- =====================================================================
-- Règle métier: Si audit a une zone, vérifier que zones.depot_id = audits.depot_id
CREATE OR REPLACE FUNCTION validate_audit_zone_depot()
RETURNS TRIGGER AS $$
DECLARE
  v_zone_depot_id UUID;
BEGIN
  -- Si zone renseignée, vérifier cohérence avec depot_id audit
  IF NEW.zone_id IS NOT NULL THEN
    SELECT depot_id INTO v_zone_depot_id
    FROM zones 
    WHERE id = NEW.zone_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Zone % introuvable', NEW.zone_id;
    END IF;
    
    IF v_zone_depot_id != NEW.depot_id THEN
      RAISE EXCEPTION 'Cohérence zone/depot: zone % appartient au dépôt %, pas au dépôt % de l''audit',
        NEW.zone_id, v_zone_depot_id, NEW.depot_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_audit_zone_depot
  BEFORE INSERT OR UPDATE ON audits
  FOR EACH ROW
  WHEN (NEW.zone_id IS NOT NULL)
  EXECUTE FUNCTION validate_audit_zone_depot();

-- =====================================================================
-- Trigger: Validation audit complété avant statut 'termine' (MAJEUR-02)
-- =====================================================================
CREATE OR REPLACE FUNCTION validate_audit_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_total_questions_obligatoires INT;
  v_total_reponses_distinctes INT;
BEGIN
  -- Si passage à 'termine'
  IF NEW.statut = 'termine' AND OLD.statut != 'termine' THEN
    -- Compter questions OBLIGATOIRES du template
    SELECT COUNT(*) INTO v_total_questions_obligatoires
    FROM questions
    WHERE template_id = NEW.template_id
      AND obligatoire = true;
    
    -- Compter DISTINCT question_id répondues (seulement questions obligatoires)
    SELECT COUNT(DISTINCT r.question_id) INTO v_total_reponses_distinctes
    FROM reponses r
    JOIN questions q ON r.question_id = q.id
    WHERE r.audit_id = NEW.id
      AND q.template_id = NEW.template_id
      AND q.obligatoire = true;
    
    IF v_total_reponses_distinctes < v_total_questions_obligatoires THEN
      RAISE EXCEPTION 'Audit % incomplet: % réponses sur % questions obligatoires', 
        NEW.code, v_total_reponses_distinctes, v_total_questions_obligatoires;
    END IF;
    
    -- Auto-remplir date_realisee si NULL
    IF NEW.date_realisee IS NULL THEN
      NEW.date_realisee := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_audit_completion_before_termine
  BEFORE UPDATE ON audits
  FOR EACH ROW
  WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
  EXECUTE FUNCTION validate_audit_completion();

COMMENT ON FUNCTION validate_audit_completion() IS
'Valide qu''un audit a toutes réponses avant passage statut termine. Auto-remplit date_realisee.';

-- =====================================================================
-- 8. ACTIVATION RLS SUR TOUTES LES TABLES
-- =====================================================================

ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reponses ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 9. RLS POLICIES: TABLE audit_templates
-- =====================================================================

-- Policy 1: admin_dev - CRUD complet
CREATE POLICY admin_dev_all_audit_templates ON audit_templates
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_audit_templates ON audit_templates
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT templates actifs seulement
CREATE POLICY auditors_select_active_templates ON audit_templates
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    statut = 'actif'
  );

-- Policy 4: Viewer - SELECT templates actifs seulement
CREATE POLICY viewer_select_active_templates ON audit_templates
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer' AND
    statut = 'actif'
  );

-- =====================================================================
-- 10. RLS POLICIES: TABLE questions
-- =====================================================================

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

-- =====================================================================
-- 11. RLS POLICIES: TABLE audits
-- =====================================================================

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

-- Policy 6: Viewer - SELECT audits terminés seulement
CREATE POLICY viewer_select_finished_audits ON audits
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer' AND
    statut = 'termine'
  );

-- =====================================================================
-- 12. RLS POLICIES: TABLE reponses
-- =====================================================================

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

-- =====================================================================
-- FIN DE LA MIGRATION ÉTAPE 02
-- =====================================================================
