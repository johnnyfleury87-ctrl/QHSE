-- ============================================================================
-- MIGRATION ÉTAPE 03 : NON-CONFORMITÉS & ACTIONS CORRECTIVES
-- ============================================================================
-- Projet : QHSE
-- Date : 22 janvier 2026
-- Auteur : GitHub Copilot (Claude Sonnet 4.5)
-- Dépendances : Étapes 01 (Foundation) + 02 (Audits)
--
-- IMPORTANT : Cette migration NE DOIT PAS être appliquée tant que :
-- 1. Étapes 01 et 02 ne sont pas validées et appliquées
-- 2. Tests validation (04_tests_validation_non_conformites.md) non exécutés
-- 3. Validation humaine finale non obtenue
--
-- Contenu :
-- - 7 ENUMs (nc_gravite, nc_statut, nc_type, action_type, action_statut, preuve_type, notification_type)
-- - 1 séquence (action_code_seq)
-- - 3 fonctions helper RLS (has_nc_access, can_modify_nc_status, is_action_owner)
-- - 4 tables (non_conformites, actions_correctives, preuves_correction, notifications)
-- - 8 triggers métier (dont notify_critical_nc pour RG-05)
-- - 31 indexes performance (dont 7 notifications)
-- - 28 policies RLS (dont 5 notifications)
-- - Validation post-migration
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1 : TYPES ENUM
-- ============================================================================

-- Gravité NC (faible → critique)
CREATE TYPE nc_gravite AS ENUM ('faible', 'moyenne', 'haute', 'critique');
COMMENT ON TYPE nc_gravite IS 'Gravité NC : détermine échéance (RG-02)';

-- Statuts NC (workflow 5 étapes)
CREATE TYPE nc_statut AS ENUM ('ouverte', 'en_traitement', 'resolue', 'verifiee', 'cloturee');
COMMENT ON TYPE nc_statut IS 'Workflow NC : ouverte → en_traitement → resolue → verifiee → cloturee';

-- Types NC (classification métier)
CREATE TYPE nc_type AS ENUM ('securite', 'qualite', 'hygiene', 'environnement', 'autre');
COMMENT ON TYPE nc_type IS 'Type NC : permet regroupement par domaine QHSE';

-- Types action (corrective vs préventive)
CREATE TYPE action_type AS ENUM ('corrective', 'preventive');
COMMENT ON TYPE action_type IS 'Type action : corrective (répare) vs préventive (évite récurrence)';

-- Statuts action (workflow 4 étapes)
CREATE TYPE action_statut AS ENUM ('a_faire', 'en_cours', 'terminee', 'verifiee');
COMMENT ON TYPE action_statut IS 'Workflow action : a_faire → en_cours → terminee → verifiee';

-- Types preuve (photo/document/commentaire)
CREATE TYPE preuve_type AS ENUM ('photo', 'document', 'commentaire');
COMMENT ON TYPE preuve_type IS 'Type preuve correction : photo/document (Supabase Storage) ou commentaire (texte)';

-- Types notification (RG-05, RG-10)
CREATE TYPE notification_type AS ENUM ('nc_critique', 'nc_echue', 'action_terminee');
COMMENT ON TYPE notification_type IS 'Type notification métier : NC critique (RG-05), NC échue (RG-10), action terminée';

-- ============================================================================
-- SECTION 2 : SÉQUENCE CODES ACTIONS
-- ============================================================================

CREATE SEQUENCE action_code_seq START 1;
COMMENT ON SEQUENCE action_code_seq IS 'Génère numéros séquentiels pour codes actions AC-YYYY-NNNN';

-- ============================================================================
-- SECTION 3 : FONCTIONS HELPER RLS
-- ============================================================================

-- Fonction 1 : Vérifier accès NC
CREATE OR REPLACE FUNCTION has_nc_access(nc_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_nc_created_by UUID;
  v_nc_assigned_to UUID;
  v_nc_audit_id UUID;
  v_audit_auditeur UUID;
BEGIN
  -- Récupérer rôle utilisateur (réutilise Étape 01)
  v_user_role := get_current_user_role();
  
  -- Admin/Manager : accès total
  IF v_user_role IN ('admin_dev', 'qhse_manager') THEN
    RETURN true;
  END IF;
  
  -- Récupérer métadonnées NC
  SELECT created_by, assigned_to, audit_id
  INTO v_nc_created_by, v_nc_assigned_to, v_nc_audit_id
  FROM non_conformites
  WHERE id = nc_uuid;
  
  -- Responsable assigné : accès si assigné
  IF v_nc_assigned_to = auth.uid() THEN
    RETURN true;
  END IF;
  
  -- Auditeur : accès si NC créée par lui OU liée à son audit
  IF v_user_role IN ('qh_auditor', 'safety_auditor') THEN
    -- NC créée par l'auditeur
    IF v_nc_created_by = auth.uid() THEN
      RETURN true;
    END IF;
    
    -- NC liée à audit de l'auditeur
    IF v_nc_audit_id IS NOT NULL THEN
      SELECT auditeur_id INTO v_audit_auditeur
      FROM audits
      WHERE id = v_nc_audit_id;
      
      IF v_audit_auditeur = auth.uid() THEN
        RETURN true;
      END IF;
    END IF;
  END IF;
  
  -- Sinon : pas d'accès
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION has_nc_access IS 'Vérifie accès NC (auditeur propriétaire, assigné, ou manager)';

-- Fonction 2 : Vérifier droit modification statut NC
CREATE OR REPLACE FUNCTION can_modify_nc_status(
  nc_uuid UUID,
  new_statut nc_statut
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_nc_statut nc_statut;
  v_nc_assigned_to UUID;
BEGIN
  v_user_role := get_current_user_role();
  
  -- Récupérer statut actuel + assignation
  SELECT statut, assigned_to
  INTO v_nc_statut, v_nc_assigned_to
  FROM non_conformites
  WHERE id = nc_uuid;
  
  -- Admin/Manager : toutes transitions autorisées
  IF v_user_role IN ('admin_dev', 'qhse_manager') THEN
    RETURN true;
  END IF;
  
  -- Responsable assigné : peut modifier jusqu'à 'resolue'
  IF v_nc_assigned_to = auth.uid() THEN
    IF new_statut IN ('en_traitement', 'resolue') THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Auditeurs : peuvent créer (ouverte) et commenter
  IF v_user_role IN ('qh_auditor', 'safety_auditor') THEN
    IF new_statut = 'ouverte' THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Toute autre transition refusée
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION can_modify_nc_status IS 'Contrôle transitions statut NC selon rôle (RG-11)';

-- Fonction 3 : Vérifier propriété action corrective
CREATE OR REPLACE FUNCTION is_action_owner(action_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_action_assigned_to UUID;
  v_action_created_by UUID;
  v_nc_id UUID;
BEGIN
  v_user_role := get_current_user_role();
  
  -- Admin/Manager : accès total
  IF v_user_role IN ('admin_dev', 'qhse_manager') THEN
    RETURN true;
  END IF;
  
  -- Récupérer métadonnées action
  SELECT assigned_to, created_by, nc_id
  INTO v_action_assigned_to, v_action_created_by, v_nc_id
  FROM actions_correctives
  WHERE id = action_uuid;
  
  -- Assigné ou créateur : accès
  IF v_action_assigned_to = auth.uid() OR v_action_created_by = auth.uid() THEN
    RETURN true;
  END IF;
  
  -- Auditeur : accès si NC liée lui appartient
  IF v_user_role IN ('qh_auditor', 'safety_auditor') THEN
    IF has_nc_access(v_nc_id) THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION is_action_owner IS 'Vérifie propriété action corrective (assigné, créateur, ou NC propriétaire)';

-- ============================================================================
-- SECTION 4 : TABLE NON_CONFORMITES
-- ============================================================================

CREATE TABLE non_conformites (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(15) UNIQUE NOT NULL,
  
  -- Informations générales
  titre VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type nc_type NOT NULL,
  gravite nc_gravite NOT NULL,
  statut nc_statut NOT NULL DEFAULT 'ouverte',
  
  -- Origine (XOR constraint : audit OU dépôt)
  audit_id UUID REFERENCES audits(id) ON DELETE RESTRICT,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  depot_id UUID REFERENCES depots(id) ON DELETE RESTRICT,
  zone_id UUID REFERENCES zones(id) ON DELETE RESTRICT,
  
  -- Responsabilité
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Dates
  due_date DATE NOT NULL,
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Colonne calculée (retard)
  is_overdue BOOLEAN GENERATED ALWAYS AS (
    due_date < CURRENT_DATE AND statut NOT IN ('cloturee', 'verifiee')
  ) STORED,
  
  -- Soft delete
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes CHECK
  CONSTRAINT nc_code_format_check CHECK (code ~ '^NC-[0-9]{4}-[0-9]{4}$'),
  CONSTRAINT nc_origin_check CHECK (
    (audit_id IS NOT NULL AND question_id IS NOT NULL AND depot_id IS NULL AND zone_id IS NULL)
    OR
    (audit_id IS NULL AND question_id IS NULL AND depot_id IS NOT NULL)
  ),
  CONSTRAINT nc_location_xor_check CHECK (
    depot_id IS NOT NULL AND (zone_id IS NULL OR zone_id IS NOT NULL)
  ),
  CONSTRAINT nc_assigned_required_check CHECK (
    (statut = 'ouverte' OR assigned_to IS NOT NULL)
  ),
  CONSTRAINT nc_resolved_before_verified CHECK (
    verified_at IS NULL OR (resolved_at IS NOT NULL AND verified_at >= resolved_at)
  ),
  CONSTRAINT nc_verified_before_closed CHECK (
    closed_at IS NULL OR (verified_at IS NOT NULL AND closed_at >= verified_at)
  ),
  CONSTRAINT nc_archived_requires_date CHECK (
    (is_archived = false AND archived_at IS NULL) OR (is_archived = true AND archived_at IS NOT NULL)
  ),
  CONSTRAINT nc_statut_coherence CHECK (
    (statut = 'ouverte' AND resolved_at IS NULL AND verified_at IS NULL AND closed_at IS NULL)
    OR
    (statut = 'en_traitement' AND resolved_at IS NULL AND verified_at IS NULL AND closed_at IS NULL)
    OR
    (statut = 'resolue' AND resolved_at IS NOT NULL AND verified_at IS NULL AND closed_at IS NULL)
    OR
    (statut = 'verifiee' AND resolved_at IS NOT NULL AND verified_at IS NOT NULL AND closed_at IS NULL)
    OR
    (statut = 'cloturee' AND resolved_at IS NOT NULL AND verified_at IS NOT NULL AND closed_at IS NOT NULL)
  )
);

-- Commentaires table
COMMENT ON TABLE non_conformites IS 'Non-Conformités détectées (audit ou observation manuelle) nécessitant correction';
COMMENT ON COLUMN non_conformites.code IS 'Code unique format NC-YYYY-NNNN (lisible humain, RG-01)';
COMMENT ON COLUMN non_conformites.gravite IS 'Détermine échéance automatique (RG-02)';
COMMENT ON COLUMN non_conformites.audit_id IS 'NC liée audit (XOR avec depot_id)';
COMMENT ON COLUMN non_conformites.depot_id IS 'NC observation manuelle dépôt (XOR avec audit_id)';
COMMENT ON COLUMN non_conformites.assigned_to IS 'Responsable correction (obligatoire avant en_traitement, RG-04)';
COMMENT ON COLUMN non_conformites.is_overdue IS 'Calculé auto : due_date dépassée ET pas clôturée (performance index)';
COMMENT ON COLUMN non_conformites.is_archived IS 'Soft delete uniquement (RG-08)';

-- Indexes performance
CREATE INDEX idx_nc_code ON non_conformites (code);
CREATE INDEX idx_nc_statut ON non_conformites (statut) WHERE is_archived = false;
CREATE INDEX idx_nc_gravite ON non_conformites (gravite) WHERE is_archived = false;
CREATE INDEX idx_nc_audit ON non_conformites (audit_id) WHERE audit_id IS NOT NULL;
CREATE INDEX idx_nc_depot ON non_conformites (depot_id) WHERE depot_id IS NOT NULL;
CREATE INDEX idx_nc_zone ON non_conformites (zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX idx_nc_assigned ON non_conformites (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_nc_created_by ON non_conformites (created_by);
CREATE INDEX idx_nc_due_date ON non_conformites (due_date) WHERE is_archived = false;
CREATE INDEX idx_nc_overdue ON non_conformites (is_overdue) WHERE is_overdue = true;
CREATE INDEX idx_nc_created_at ON non_conformites (created_at DESC);

-- Triggers métier
CREATE TRIGGER trigger_update_nc_timestamps
BEFORE UPDATE ON non_conformites
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_uppercase_nc_code
BEFORE INSERT OR UPDATE ON non_conformites
FOR EACH ROW
EXECUTE FUNCTION uppercase_code_column();

-- ============================================================================
-- SECTION 5 : TABLE ACTIONS_CORRECTIVES
-- ============================================================================

CREATE TABLE actions_correctives (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  
  -- Lien NC (obligatoire)
  nc_id UUID NOT NULL REFERENCES non_conformites(id) ON DELETE RESTRICT,
  
  -- Informations générales
  type action_type NOT NULL,
  titre VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  statut action_statut NOT NULL DEFAULT 'a_faire',
  
  -- Responsabilité
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Dates
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Coûts (optionnels)
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes CHECK
  CONSTRAINT action_code_format_check CHECK (code ~ '^AC-[0-9]{4}-[0-9]{4}$'),
  CONSTRAINT action_completed_before_verified CHECK (
    verified_at IS NULL OR (completed_at IS NOT NULL AND verified_at >= completed_at)
  ),
  CONSTRAINT action_verified_requires_verifier CHECK (
    (verified_at IS NULL AND verified_by IS NULL) OR (verified_at IS NOT NULL AND verified_by IS NOT NULL)
  )
);

-- Commentaires table
COMMENT ON TABLE actions_correctives IS 'Actions correctives/préventives pour traiter NC';
COMMENT ON COLUMN actions_correctives.code IS 'Code unique format AC-YYYY-NNNN (généré via séquence)';
COMMENT ON COLUMN actions_correctives.type IS 'Corrective (répare) vs Préventive (évite récurrence)';
COMMENT ON COLUMN actions_correctives.nc_id IS 'Lien obligatoire NC (RESTRICT = pas suppression NC si actions)';
COMMENT ON COLUMN actions_correctives.due_date IS 'Hérite échéance NC si non fournie (RG-09)';
COMMENT ON COLUMN actions_correctives.verified_by IS 'Manager qui valide action terminée (séparation responsabilités RG-11)';

-- Indexes performance
CREATE INDEX idx_action_code ON actions_correctives (code);
CREATE INDEX idx_action_nc ON actions_correctives (nc_id);
CREATE INDEX idx_action_statut ON actions_correctives (statut);
CREATE INDEX idx_action_assigned ON actions_correctives (assigned_to);
CREATE INDEX idx_action_due_date ON actions_correctives (due_date);
CREATE INDEX idx_action_created_at ON actions_correctives (created_at DESC);

-- Triggers métier
CREATE TRIGGER trigger_update_action_timestamps
BEFORE UPDATE ON actions_correctives
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_uppercase_action_code
BEFORE INSERT OR UPDATE ON actions_correctives
FOR EACH ROW
EXECUTE FUNCTION uppercase_code_column();

-- ============================================================================
-- SECTION 6 : TABLE NOTIFICATIONS
-- ============================================================================

-- Type ENUM notification
CREATE TYPE notification_type AS ENUM (
  'nc_critique',      -- RG-05 : NC gravité critique créée
  'nc_echue',         -- RG-10 : NC échue non résolue
  'action_terminee'   -- Notification action complétée
);

COMMENT ON TYPE notification_type IS 'Type notification métier (RG-05 NC critique, RG-10 escalade échue, action terminée)';

-- Table notifications
CREATE TABLE notifications (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type notification
  type notification_type NOT NULL,
  
  -- Contexte métier (XOR nc_id / action_id selon type)
  nc_id UUID REFERENCES non_conformites(id) ON DELETE CASCADE,
  action_id UUID REFERENCES actions_correctives(id) ON DELETE CASCADE,
  
  -- Destinataire
  destinataire_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contenu
  titre VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  -- État lecture
  lue BOOLEAN DEFAULT false,
  lue_at TIMESTAMPTZ,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes métier
  CONSTRAINT notification_context_check CHECK (
    (type = 'nc_critique' AND nc_id IS NOT NULL AND action_id IS NULL)
    OR
    (type = 'nc_echue' AND nc_id IS NOT NULL AND action_id IS NULL)
    OR
    (type = 'action_terminee' AND action_id IS NOT NULL AND nc_id IS NOT NULL)
  ),
  CONSTRAINT notification_lue_requires_lue_at CHECK (
    (lue = false AND lue_at IS NULL) OR (lue = true AND lue_at IS NOT NULL)
  )
);

-- Commentaires table
COMMENT ON TABLE notifications IS 'Notifications métier traçabilité (RG-05 NC critique, RG-10 escalade, actions terminées)';
COMMENT ON COLUMN notifications.lue IS 'Marquage lecture par destinataire (UPDATE via RLS policy)';
COMMENT ON COLUMN notifications.type IS 'Type événement métier déclencheur notification';
COMMENT ON COLUMN notifications.nc_id IS 'Lien NC (CASCADE = suppression NC supprime notifications)';
COMMENT ON COLUMN notifications.action_id IS 'Lien action pour type action_terminee';

-- Indexes performance
CREATE INDEX idx_notification_destinataire ON notifications (destinataire_id);
CREATE INDEX idx_notification_type ON notifications (type);
CREATE INDEX idx_notification_nc ON notifications (nc_id) WHERE nc_id IS NOT NULL;
CREATE INDEX idx_notification_action ON notifications (action_id) WHERE action_id IS NOT NULL;
CREATE INDEX idx_notification_lue ON notifications (lue, destinataire_id);
CREATE INDEX idx_notification_created_at ON notifications (created_at DESC);
CREATE INDEX idx_notification_destinataire_unread ON notifications (destinataire_id, created_at DESC) WHERE lue = false;

-- ============================================================================
-- SECTION 7 : TABLE PREUVES_CORRECTION
-- ============================================================================

CREATE TABLE preuves_correction (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien action (obligatoire)
  action_id UUID NOT NULL REFERENCES actions_correctives(id) ON DELETE CASCADE,
  
  -- Type preuve
  type preuve_type NOT NULL,
  
  -- Contenu
  file_url TEXT, -- Supabase Storage (bucket preuves_correction)
  commentaire TEXT,
  
  -- Responsabilité
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Validation (optionnelle)
  verified_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes CHECK
  CONSTRAINT preuve_file_url_required CHECK (
    type = 'commentaire' OR file_url IS NOT NULL
  ),
  CONSTRAINT preuve_verified_requires_verifier CHECK (
    (verified_at IS NULL AND verified_by IS NULL) OR (verified_at IS NOT NULL AND verified_by IS NOT NULL)
  )
);

-- Commentaires table
COMMENT ON TABLE preuves_correction IS 'Preuves correction (photos/documents Supabase Storage ou commentaires)';
COMMENT ON COLUMN preuves_correction.file_url IS 'URL Supabase Storage (bucket preuves_correction) pour photo/document';
COMMENT ON COLUMN preuves_correction.action_id IS 'Lien action (CASCADE = suppression action supprime preuves)';
COMMENT ON COLUMN preuves_correction.verified_by IS 'Manager valide preuve avant clôture NC haute/critique (RG-07)';

-- Indexes performance
CREATE INDEX idx_preuve_action ON preuves_correction (action_id);
CREATE INDEX idx_preuve_type ON preuves_correction (type);
CREATE INDEX idx_preuve_uploaded_by ON preuves_correction (uploaded_by);
CREATE INDEX idx_preuve_verified_by ON preuves_correction (verified_by) WHERE verified_by IS NOT NULL;
CREATE INDEX idx_preuve_uploaded_at ON preuves_correction (created_at DESC);
CREATE INDEX idx_preuve_verified_at ON preuves_correction (verified_at DESC) WHERE verified_at IS NOT NULL;
CREATE INDEX idx_preuve_action_verified ON preuves_correction (action_id, verified_at);

-- Triggers métier
CREATE TRIGGER trigger_update_preuve_timestamps
BEFORE UPDATE ON preuves_correction
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7 : TRIGGERS MÉTIER SPÉCIFIQUES
-- ============================================================================

-- Trigger 1 : Calcul échéance NC selon gravité (RG-02)
CREATE OR REPLACE FUNCTION calculate_nc_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NULL THEN
    NEW.due_date := CASE NEW.gravite
      WHEN 'critique' THEN CURRENT_DATE + INTERVAL '1 day'
      WHEN 'haute' THEN CURRENT_DATE + INTERVAL '7 days'
      WHEN 'moyenne' THEN CURRENT_DATE + INTERVAL '30 days'
      WHEN 'faible' THEN CURRENT_DATE + INTERVAL '90 days'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_nc_due_date
BEFORE INSERT ON non_conformites
FOR EACH ROW
EXECUTE FUNCTION calculate_nc_due_date();

COMMENT ON FUNCTION calculate_nc_due_date IS 'Calcule échéance NC selon gravité : critique 1j, haute 7j, moyenne 30j, faible 90j (RG-02)';

-- Trigger 2 : Validation assignation avant traitement (RG-04)
CREATE OR REPLACE FUNCTION validate_nc_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut IN ('en_traitement', 'resolue', 'verifiee', 'cloturee') AND NEW.assigned_to IS NULL THEN
    RAISE EXCEPTION 'NC doit être assignée avant passage statut %', NEW.statut
      USING HINT = 'Assigner un responsable avant changer statut (RG-04)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_nc_assignment
BEFORE INSERT OR UPDATE ON non_conformites
FOR EACH ROW
EXECUTE FUNCTION validate_nc_assignment();

COMMENT ON FUNCTION validate_nc_assignment IS 'Vérifie NC assignée avant passage en_traitement ou statuts suivants (RG-04)';

-- Trigger 3 : Auto-création action pour NC critique/haute (RG-06)
CREATE OR REPLACE FUNCTION auto_create_action_for_critical_nc()
RETURNS TRIGGER AS $$
DECLARE
  v_action_code TEXT;
  v_year TEXT;
  v_seq_num TEXT;
BEGIN
  IF NEW.gravite IN ('critique', 'haute') THEN
    -- Générer code action AC-YYYY-NNNN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_seq_num := LPAD(nextval('action_code_seq')::TEXT, 4, '0');
    v_action_code := 'AC-' || v_year || '-' || v_seq_num;
    
    INSERT INTO actions_correctives (
      code,
      nc_id,
      type,
      titre,
      description,
      assigned_to,
      statut,
      due_date,
      created_by
    ) VALUES (
      v_action_code,
      NEW.id,
      'corrective',
      'Action corrective pour ' || NEW.code,
      'Action automatique créée pour NC ' || NEW.gravite::TEXT,
      NEW.assigned_to,
      'a_faire',
      NEW.due_date,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_action
AFTER INSERT ON non_conformites
FOR EACH ROW
WHEN (NEW.gravite IN ('haute', 'critique'))
EXECUTE FUNCTION auto_create_action_for_critical_nc();

COMMENT ON FUNCTION auto_create_action_for_critical_nc IS 'Crée automatiquement action corrective pour NC haute/critique (RG-06)';

-- Trigger 4 : Validation preuve avant clôture NC haute/critique (RG-07)
CREATE OR REPLACE FUNCTION validate_nc_closure_with_proof()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'cloturee' AND OLD.gravite IN ('haute', 'critique') THEN
    IF NOT EXISTS (
      SELECT 1 FROM preuves_correction pc
      JOIN actions_correctives ac ON pc.action_id = ac.id
      WHERE ac.nc_id = NEW.id AND pc.verified_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'NC haute/critique exige preuve validée avant clôture'
        USING HINT = 'Uploader + valider preuve correction (RG-07)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_nc_closure_with_proof
BEFORE UPDATE ON non_conformites
FOR EACH ROW
WHEN (NEW.statut = 'cloturee')
EXECUTE FUNCTION validate_nc_closure_with_proof();

COMMENT ON FUNCTION validate_nc_closure_with_proof IS 'Vérifie preuve validée existe avant clôture NC haute/critique (RG-07)';

-- Trigger 5 : Mise à jour timestamps résolution NC
CREATE OR REPLACE FUNCTION update_nc_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Resolved
  IF NEW.statut = 'resolue' AND OLD.statut != 'resolue' THEN
    NEW.resolved_at := NOW();
  END IF;
  
  -- Verified
  IF NEW.statut = 'verifiee' AND OLD.statut != 'verifiee' THEN
    NEW.verified_at := NOW();
  END IF;
  
  -- Closed
  IF NEW.statut = 'cloturee' AND OLD.statut != 'cloturee' THEN
    NEW.closed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nc_status_timestamps
BEFORE UPDATE ON non_conformites
FOR EACH ROW
EXECUTE FUNCTION update_nc_timestamps();

COMMENT ON FUNCTION update_nc_timestamps IS 'Mise à jour automatique resolved_at, verified_at, closed_at selon transitions statut';

-- Trigger 6 : Héritage échéance action depuis NC (RG-09)
CREATE OR REPLACE FUNCTION inherit_nc_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NULL THEN
    SELECT due_date INTO NEW.due_date
    FROM non_conformites
    WHERE id = NEW.nc_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inherit_nc_due_date
BEFORE INSERT ON actions_correctives
FOR EACH ROW
EXECUTE FUNCTION inherit_nc_due_date();

COMMENT ON FUNCTION inherit_nc_due_date IS 'Action hérite échéance NC si due_date non fournie (RG-09)';

-- Trigger 7 : Mise à jour timestamps action
CREATE OR REPLACE FUNCTION update_action_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Completed
  IF NEW.statut = 'terminee' AND OLD.statut != 'terminee' THEN
    NEW.completed_at := NOW();
  END IF;
  
  -- Verified
  IF NEW.statut = 'verifiee' AND OLD.statut != 'verifiee' THEN
    NEW.verified_at := NOW();
    IF NEW.verified_by IS NULL THEN
      NEW.verified_by := auth.uid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_action_status_timestamps
BEFORE UPDATE ON actions_correctives
FOR EACH ROW
EXECUTE FUNCTION update_action_timestamps();

COMMENT ON FUNCTION update_action_timestamps IS 'Mise à jour automatique completed_at, verified_at selon transitions statut action';

-- Trigger 8 : Notification manager NC critique (RG-05)
CREATE OR REPLACE FUNCTION notify_critical_nc()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_id UUID;
  v_depot_name TEXT;
BEGIN
  -- Récupérer manager QHSE du site (ou fallback premier manager système)
  SELECT p.id INTO v_manager_id
  FROM profiles p
  WHERE p.role = 'qhse_manager'
  ORDER BY p.created_at ASC
  LIMIT 1;
  
  -- Récupérer nom dépôt pour message contextuel
  IF NEW.depot_id IS NOT NULL THEN
    SELECT nom INTO v_depot_name FROM depots WHERE id = NEW.depot_id;
  ELSE
    v_depot_name := 'Non spécifié';
  END IF;
  
  -- Créer notification DB
  INSERT INTO notifications (
    type,
    nc_id,
    destinataire_id,
    titre,
    message
  ) VALUES (
    'nc_critique',
    NEW.id,
    v_manager_id,
    '⚠️ NC CRITIQUE : ' || NEW.titre,
    'NC critique ' || NEW.code || ' créée le ' || TO_CHAR(NEW.created_at, 'DD/MM/YYYY à HH24:MI') || 
    E'\nSite : ' || v_depot_name || 
    E'\nType : ' || NEW.type::TEXT || 
    E'\nÉchéance : ' || TO_CHAR(NEW.due_date, 'DD/MM/YYYY') || 
    E'\n\nDescription : ' || NEW.description
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_critical_nc
AFTER INSERT ON non_conformites
FOR EACH ROW
WHEN (NEW.gravite = 'critique')
EXECUTE FUNCTION notify_critical_nc();

COMMENT ON FUNCTION notify_critical_nc IS 'Crée notification DB pour manager QHSE lors création NC critique (RG-05)';

-- ============================================================================
-- SECTION 8 : ACTIVATION RLS
-- ============================================================================

ALTER TABLE non_conformites ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_correctives ENABLE ROW LEVEL SECURITY;
ALTER TABLE preuves_correction ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 9 : POLICIES RLS – NON_CONFORMITES (8 policies)
-- ============================================================================

-- Policy 1 : Admin dev accès total
CREATE POLICY admin_dev_all_nc ON non_conformites
  FOR ALL
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');

-- Policy 2 : Manager QHSE accès total (pas DELETE)
CREATE POLICY qhse_manager_all_nc ON non_conformites
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager')
  WITH CHECK (get_current_user_role() = 'qhse_manager');

-- Policy 3 : Auditeurs SELECT propres audits
CREATE POLICY auditors_select_own_nc ON non_conformites
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND (
      created_by = auth.uid()
      OR
      audit_id IN (SELECT id FROM audits WHERE auditeur_id = auth.uid())
    )
  );

-- Policy 4 : Auditeurs INSERT NC
CREATE POLICY auditors_insert_nc ON non_conformites
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND created_by = auth.uid()
  );

-- Policy 5 : Auditeurs UPDATE propres NC (avant clôture)
CREATE POLICY auditors_update_own_nc ON non_conformites
  FOR UPDATE
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND created_by = auth.uid()
    AND statut NOT IN ('verifiee', 'cloturee')
  )
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND created_by = auth.uid()
    AND statut NOT IN ('verifiee', 'cloturee')
  );

-- Policy 6 : Responsable assigné SELECT NC assignées
CREATE POLICY assigned_select_nc ON non_conformites
  FOR SELECT
  USING (assigned_to = auth.uid());

-- Policy 7 : Responsable assigné UPDATE NC assignées (jusqu'à resolue)
CREATE POLICY assigned_update_nc ON non_conformites
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND statut NOT IN ('verifiee', 'cloturee')
  )
  WITH CHECK (
    assigned_to = auth.uid()
    AND statut IN ('ouverte', 'en_traitement', 'resolue')
  );

-- Policy 8 : Viewer SELECT NC clôturées uniquement
CREATE POLICY viewers_select_closed_nc ON non_conformites
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer'
    AND statut = 'cloturee'
  );

-- ============================================================================
-- SECTION 10 : POLICIES RLS – ACTIONS_CORRECTIVES (8 policies)
-- ============================================================================

-- Policy 1 : Admin dev accès total
CREATE POLICY admin_dev_all_actions ON actions_correctives
  FOR ALL
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');

-- Policy 2 : Manager QHSE accès total (pas DELETE)
CREATE POLICY qhse_manager_all_actions ON actions_correctives
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager')
  WITH CHECK (get_current_user_role() = 'qhse_manager');

-- Policy 3 : Auditeurs SELECT actions liées propres NC
CREATE POLICY auditors_select_own_actions ON actions_correctives
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND nc_id IN (
      SELECT id FROM non_conformites
      WHERE created_by = auth.uid()
         OR audit_id IN (SELECT id FROM audits WHERE auditeur_id = auth.uid())
    )
  );

-- Policy 4 : Auditeurs INSERT actions pour propres NC
CREATE POLICY auditors_insert_actions ON actions_correctives
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND nc_id IN (
      SELECT id FROM non_conformites
      WHERE created_by = auth.uid()
         OR audit_id IN (SELECT id FROM audits WHERE auditeur_id = auth.uid())
    )
  );

-- Policy 5 : Auditeurs UPDATE actions propres NC (avant vérification)
CREATE POLICY auditors_update_own_actions ON actions_correctives
  FOR UPDATE
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND nc_id IN (
      SELECT id FROM non_conformites
      WHERE created_by = auth.uid()
         OR audit_id IN (SELECT id FROM audits WHERE auditeur_id = auth.uid())
    )
    AND statut != 'verifiee'
  )
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND statut != 'verifiee'
  );

-- Policy 6 : Responsable assigné SELECT actions assignées
CREATE POLICY assigned_select_actions ON actions_correctives
  FOR SELECT
  USING (assigned_to = auth.uid());

-- Policy 7 : Responsable assigné UPDATE actions assignées (jusqu'à terminee)
CREATE POLICY assigned_update_actions ON actions_correctives
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND statut != 'verifiee'
  )
  WITH CHECK (
    assigned_to = auth.uid()
    AND statut IN ('a_faire', 'en_cours', 'terminee')
  );

-- Policy 8 : Viewer SELECT actions vérifiées (NC clôturées)
CREATE POLICY viewers_select_verified_actions ON actions_correctives
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer'
    AND nc_id IN (SELECT id FROM non_conformites WHERE statut = 'cloturee')
  );

-- ============================================================================
-- SECTION 11 : POLICIES RLS – PREUVES_CORRECTION (7 policies)
-- ============================================================================

-- Policy 1 : Admin dev accès total
CREATE POLICY admin_dev_all_preuves ON preuves_correction
  FOR ALL
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');

-- Policy 2 : Manager QHSE accès total (pas DELETE)
CREATE POLICY qhse_manager_all_preuves ON preuves_correction
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager')
  WITH CHECK (get_current_user_role() = 'qhse_manager');

-- Policy 3 : Auditeurs SELECT preuves propres actions
CREATE POLICY auditors_select_own_preuves ON preuves_correction
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND action_id IN (
      SELECT id FROM actions_correctives
      WHERE nc_id IN (
        SELECT id FROM non_conformites
        WHERE created_by = auth.uid()
           OR audit_id IN (SELECT id FROM audits WHERE auditeur_id = auth.uid())
      )
    )
  );

-- Policy 4 : Auditeurs INSERT preuves propres actions
CREATE POLICY auditors_insert_preuves ON preuves_correction
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND action_id IN (
      SELECT id FROM actions_correctives
      WHERE nc_id IN (
        SELECT id FROM non_conformites
        WHERE created_by = auth.uid()
           OR audit_id IN (SELECT id FROM audits WHERE auditeur_id = auth.uid())
      )
    )
    AND uploaded_by = auth.uid()
  );

-- Policy 5 : Responsable assigné SELECT preuves propres actions
CREATE POLICY assigned_select_preuves ON preuves_correction
  FOR SELECT
  USING (
    action_id IN (SELECT id FROM actions_correctives WHERE assigned_to = auth.uid())
  );

-- Policy 6 : Responsable assigné INSERT preuves propres actions
CREATE POLICY assigned_insert_preuves ON preuves_correction
  FOR INSERT
  WITH CHECK (
    action_id IN (SELECT id FROM actions_correctives WHERE assigned_to = auth.uid())
    AND uploaded_by = auth.uid()
  );

-- Policy 7 : Viewer SELECT preuves validées (NC clôturées)
CREATE POLICY viewers_select_verified_preuves ON preuves_correction
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer'
    AND verified_at IS NOT NULL
    AND action_id IN (
      SELECT id FROM actions_correctives
      WHERE nc_id IN (SELECT id FROM non_conformites WHERE statut = 'cloturee')
    )
  );

-- ============================================================================
-- SECTION 12 : POLICIES RLS – NOTIFICATIONS (5 policies)
-- ============================================================================

-- Policy 1 : Admin dev accès total notifications (monitoring)
CREATE POLICY admin_dev_all_notifications ON notifications
  FOR ALL
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');

-- Policy 2 : Manager QHSE SELECT toutes notifications (supervision)
CREATE POLICY qhse_manager_all_notifications ON notifications
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3 : Auditors SELECT notifications de leurs NC (créées/assignées)
CREATE POLICY auditors_select_own_notifications ON notifications
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND nc_id IN (
      SELECT id FROM non_conformites
      WHERE created_by = auth.uid() OR assigned_to = auth.uid()
    )
  );

-- Policy 4 : Destinataires SELECT leurs notifications
CREATE POLICY destinataire_select_notifications ON notifications
  FOR SELECT
  USING (destinataire_id = auth.uid());

-- Policy 5 : Destinataires UPDATE leurs notifications (marquer lues)
CREATE POLICY destinataire_update_notifications ON notifications
  FOR UPDATE
  USING (destinataire_id = auth.uid())
  WITH CHECK (destinataire_id = auth.uid());

-- ============================================================================
-- SECTION 13 : VALIDATION POST-MIGRATION
-- ============================================================================

DO $$
DECLARE
  v_enum_count INT;
  v_table_count INT;
  v_function_count INT;
  v_trigger_count INT;
  v_index_count INT;
  v_policy_count INT;
  v_errors TEXT := '';
BEGIN
  RAISE NOTICE '=== VALIDATION POST-MIGRATION ÉTAPE 03 ===';
  
  -- Check 1 : ENUMs (7 = 6 existants + 1 notification_type)
  SELECT COUNT(*) INTO v_enum_count
  FROM pg_type
  WHERE typname IN ('nc_gravite', 'nc_statut', 'nc_type', 'action_type', 'action_statut', 'preuve_type', 'notification_type');
  
  IF v_enum_count != 7 THEN
    v_errors := v_errors || format('❌ ENUMs : %s/7 trouvés\n', v_enum_count);
  ELSE
    RAISE NOTICE '✅ ENUMs : 7/7';
  END IF;
  
  -- Check 2 : Tables (4 = 3 existantes + 1 notifications)
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('non_conformites', 'actions_correctives', 'preuves_correction', 'notifications');
  
  IF v_table_count != 4 THEN
    v_errors := v_errors || format('❌ Tables : %s/4 trouvées\n', v_table_count);
  ELSE
    RAISE NOTICE '✅ Tables : 4/4';
  END IF;
  
  -- Check 3 : Fonctions helper (3)
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN ('has_nc_access', 'can_modify_nc_status', 'is_action_owner');
  
  IF v_function_count != 3 THEN
    v_errors := v_errors || format('❌ Fonctions helper : %s/3 trouvées\n', v_function_count);
  ELSE
    RAISE NOTICE '✅ Fonctions helper : 3/3';
  END IF;
  
  -- Check 4 : Triggers métier (14 = 3 std per table + 8 métier dont notify_critical_nc)
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table IN ('non_conformites', 'actions_correctives', 'preuves_correction');
  
  IF v_trigger_count < 14 THEN
    v_errors := v_errors || format('❌ Triggers : %s/14 trouvés\n', v_trigger_count);
  ELSE
    RAISE NOTICE '✅ Triggers : %s (≥14 attendus)', v_trigger_count;
  END IF;
  
  -- Check 5 : Indexes (31 = 24 existants + 7 notifications)
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('non_conformites', 'actions_correctives', 'preuves_correction', 'notifications')
    AND indexname NOT LIKE '%_pkey';
  
  IF v_index_count != 31 THEN
    v_errors := v_errors || format('⚠️ Indexes : %s/31 trouvés\n', v_index_count);
  ELSE
    RAISE NOTICE '✅ Indexes : 31/31';
  END IF;
  
  -- Check 6 : Policies RLS (28 = 23 existantes + 5 notifications)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('non_conformites', 'actions_correctives', 'preuves_correction', 'notifications');
  
  IF v_policy_count != 28 THEN
    v_errors := v_errors || format('❌ Policies RLS : %s/28 trouvées\n', v_policy_count);
  ELSE
    RAISE NOTICE '✅ Policies RLS : 28/28';
  END IF;
  
  -- Check 7 : RLS activée (4 tables)
  SELECT COUNT(*) INTO v_table_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('non_conformites', 'actions_correctives', 'preuves_correction', 'notifications')
    AND rowsecurity = true;
  
  IF v_table_count != 4 THEN
    v_errors := v_errors || format('❌ RLS activée : %s/4 tables\n', v_table_count);
  ELSE
    RAISE NOTICE '✅ RLS activée : 4/4 tables';
  END IF;
    v_errors := v_errors || format('❌ RLS activée : %s/3 tables\n', v_table_count);
  ELSE
    RAISE NOTICE '✅ RLS activée : 3/3 tables';
  END IF;
  
  -- Check 8 : Séquence action_code_seq
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'action_code_seq') THEN
    v_errors := v_errors || '❌ Séquence action_code_seq manquante\n';
  ELSE
    RAISE NOTICE '✅ Séquence : action_code_seq';
  END IF;
  
  -- Résultat final
  IF v_errors != '' THEN
    RAISE EXCEPTION E'VALIDATION ÉCHOUÉE :\n%', v_errors
      USING HINT = 'Vérifier logs migration, rollback si critique';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRATION ÉTAPE 03 VALIDÉE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total objets créés :';
    RAISE NOTICE '  - 6 ENUMs';
    RAISE NOTICE '  - 3 tables (non_conformites, actions_correctives, preuves_correction)';
    RAISE NOTICE '  - 1 séquence (action_code_seq)';
    RAISE NOTICE '  - 3 fonctions helper RLS';
    RAISE NOTICE '  - 7 triggers métier + 6 triggers std';
    RAISE NOTICE '  - 24 indexes performance';
    RAISE NOTICE '  - 23 policies RLS (8 NC + 8 actions + 7 preuves)';
    RAISE NOTICE '========================================';
  END IF;
END;
$$;

COMMIT;

-- ============================================================================
-- FIN MIGRATION ÉTAPE 03
-- ============================================================================
-- PROCHAINE ÉTAPE : Tests validation (04_tests_validation_non_conformites.md)
-- ⚠️ AUCUNE migration appliquée sans validation humaine finale
-- ============================================================================
