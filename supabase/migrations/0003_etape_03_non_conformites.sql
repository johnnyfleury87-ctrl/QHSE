-- =====================================================================
-- MIGRATION ÉTAPE 03 - NON-CONFORMITÉS & ACTIONS CORRECTIVES (QHSE)
-- =====================================================================
-- Date: 22 janvier 2026
-- Phase: IMPLÉMENTATION
-- Périmètre: Gestion NC, actions correctives, preuves, notifications
-- Prérequis: Migrations 0001_etape_01_foundations.sql ET 0002_etape_02_audits_templates.sql
-- =====================================================================

-- =====================================================================
-- 1. TYPES ENUM
-- =====================================================================

-- Type: Gravité NC
CREATE TYPE nc_gravite AS ENUM (
  'faible',    -- 90 jours échéance
  'moyenne',   -- 30 jours échéance
  'haute',     -- 7 jours échéance
  'critique'   -- 24h échéance
);

-- Type: Statut lifecycle NC
CREATE TYPE nc_statut AS ENUM (
  'ouverte',       -- Créée, en attente assignation
  'en_traitement', -- Assignée, correction en cours
  'resolue',       -- Correction effectuée, attente vérification
  'verifiee',      -- Vérifiée par manager, attente clôture
  'cloturee'       -- Archivée définitivement
);

-- Type: Classification NC
CREATE TYPE nc_type AS ENUM (
  'securite',
  'qualite',
  'hygiene',
  'environnement',
  'autre'
);

-- Type: Nature action
CREATE TYPE action_type AS ENUM (
  'corrective',  -- Corrige NC existante
  'preventive'   -- Empêche récurrence
);

-- Type: Statut action
CREATE TYPE action_statut AS ENUM (
  'a_faire',   -- Créée, non démarrée
  'en_cours',  -- En cours exécution
  'terminee',  -- Terminée, attente vérification
  'verifiee'   -- Validée par manager
);

-- Type: Type preuve
CREATE TYPE preuve_type AS ENUM (
  'photo',
  'document',
  'commentaire'
);

-- Type: Type notification
CREATE TYPE notification_type AS ENUM (
  'nc_critique',      -- NC gravité critique créée (RG-05)
  'nc_echue',         -- NC échue non résolue (RG-10)
  'action_terminee'   -- Action complétée
);

-- =====================================================================
-- 2. SÉQUENCE CODES ACTIONS
-- =====================================================================

CREATE SEQUENCE action_code_seq START 1;

-- =====================================================================
-- 3. FONCTIONS HELPER RLS
-- =====================================================================

-- Fonction: Vérifier accès NC
CREATE OR REPLACE FUNCTION has_nc_access(nc_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_nc_created_by UUID;
  v_nc_assigned_to UUID;
  v_nc_audit_id UUID;
  v_audit_auditeur UUID;
BEGIN
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
    IF v_nc_created_by = auth.uid() THEN
      RETURN true;
    END IF;
    
    IF v_nc_audit_id IS NOT NULL THEN
      SELECT auditeur_id INTO v_audit_auditeur
      FROM audits
      WHERE id = v_nc_audit_id;
      
      IF v_audit_auditeur = auth.uid() THEN
        RETURN true;
      END IF;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fonction: Vérifier propriété action corrective
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

-- =====================================================================
-- 4. TABLE: non_conformites
-- =====================================================================

CREATE TABLE non_conformites (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(15) NOT NULL UNIQUE,
  
  -- Classification
  type nc_type NOT NULL,
  gravite nc_gravite NOT NULL,
  statut nc_statut NOT NULL DEFAULT 'ouverte',
  
  -- Origine NC (audit OU manuel)
  audit_id UUID REFERENCES audits(id) ON DELETE RESTRICT,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  
  -- Localisation (si NC manuelle)
  depot_id UUID REFERENCES depots(id) ON DELETE RESTRICT,
  zone_id UUID REFERENCES zones(id) ON DELETE RESTRICT,
  
  -- Contenu
  titre VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- Assignation
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Échéances
  due_date DATE NOT NULL,
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Flags calculés
  is_overdue BOOLEAN GENERATED ALWAYS AS (
    CASE 
      WHEN statut IN ('ouverte', 'en_traitement') AND due_date < CURRENT_DATE THEN true
      ELSE false
    END
  ) STORED,
  
  -- Soft delete
  is_archived BOOLEAN DEFAULT false,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes métier
  CONSTRAINT nc_code_format_check 
    CHECK (code ~ '^NC-[0-9]{4}-[0-9]{4}$'),
  
  -- RG-03: NC liée audit (avec question) OU manuelle (avec depot)
  CONSTRAINT nc_origin_check CHECK (
    (audit_id IS NOT NULL AND question_id IS NOT NULL AND depot_id IS NULL AND zone_id IS NULL)
    OR
    (audit_id IS NULL AND question_id IS NULL AND (depot_id IS NOT NULL OR zone_id IS NOT NULL))
  ),
  
  -- XOR depot/zone pour NC manuelles
  CONSTRAINT nc_location_xor_check CHECK (
    (depot_id IS NOT NULL AND zone_id IS NULL)
    OR
    (depot_id IS NULL AND zone_id IS NOT NULL)
    OR
    (depot_id IS NULL AND zone_id IS NULL)
  ),
  
  -- RG-04: assigned_to obligatoire si statut >= en_traitement
  CONSTRAINT nc_assigned_required_check CHECK (
    CASE
      WHEN statut IN ('en_traitement', 'resolue', 'verifiee', 'cloturee') THEN assigned_to IS NOT NULL
      ELSE true
    END
  ),
  
  -- Cohérence dates
  CONSTRAINT nc_resolved_at_check CHECK (
    CASE
      WHEN statut IN ('resolue', 'verifiee', 'cloturee') THEN resolved_at IS NOT NULL
      ELSE resolved_at IS NULL
    END
  ),
  
  CONSTRAINT nc_verified_at_check CHECK (
    CASE
      WHEN statut IN ('verifiee', 'cloturee') THEN verified_at IS NOT NULL
      ELSE verified_at IS NULL
    END
  ),
  
  CONSTRAINT nc_closed_at_check CHECK (
    CASE
      WHEN statut = 'cloturee' THEN closed_at IS NOT NULL
      ELSE closed_at IS NULL
    END
  )
);

-- Index sur non_conformites
CREATE INDEX idx_nc_statut ON non_conformites(statut);
CREATE INDEX idx_nc_gravite ON non_conformites(gravite);
CREATE INDEX idx_nc_assigned_to ON non_conformites(assigned_to);
CREATE INDEX idx_nc_created_by ON non_conformites(created_by);
CREATE INDEX idx_nc_audit ON non_conformites(audit_id);
CREATE INDEX idx_nc_depot ON non_conformites(depot_id);
CREATE INDEX idx_nc_zone ON non_conformites(zone_id);
CREATE INDEX idx_nc_due_date ON non_conformites(due_date);
CREATE INDEX idx_nc_is_overdue ON non_conformites(is_overdue) WHERE is_overdue = true;
CREATE INDEX idx_nc_type ON non_conformites(type);
CREATE INDEX idx_nc_code ON non_conformites(code);

-- Triggers sur non_conformites
CREATE TRIGGER set_updated_at_non_conformites
  BEFORE UPDATE ON non_conformites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER uppercase_nc_code
  BEFORE INSERT OR UPDATE ON non_conformites
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();

-- =====================================================================
-- 5. TABLE: actions_correctives
-- =====================================================================

CREATE TABLE actions_correctives (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  
  -- Classification
  type action_type NOT NULL DEFAULT 'corrective',
  statut action_statut NOT NULL DEFAULT 'a_faire',
  
  -- Lien NC (obligatoire)
  nc_id UUID NOT NULL REFERENCES non_conformites(id) ON DELETE RESTRICT,
  
  -- Contenu
  titre VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- Assignation
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Échéances
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  
  -- Coût (optionnel)
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT action_code_format_check 
    CHECK (code ~ '^AC-[0-9]{4}-[0-9]{4}$'),
  
  CONSTRAINT action_completed_at_check CHECK (
    CASE
      WHEN statut IN ('terminee', 'verifiee') THEN completed_at IS NOT NULL
      ELSE completed_at IS NULL
    END
  ),
  
  CONSTRAINT action_verified_at_check CHECK (
    CASE
      WHEN statut = 'verifiee' THEN verified_at IS NOT NULL
      ELSE verified_at IS NULL
    END
  )
);

-- Index sur actions_correctives
CREATE INDEX idx_action_nc ON actions_correctives(nc_id);
CREATE INDEX idx_action_statut ON actions_correctives(statut);
CREATE INDEX idx_action_assigned_to ON actions_correctives(assigned_to);
CREATE INDEX idx_action_created_by ON actions_correctives(created_by);
CREATE INDEX idx_action_due_date ON actions_correctives(due_date);
CREATE INDEX idx_action_type ON actions_correctives(type);
CREATE INDEX idx_action_code ON actions_correctives(code);

-- Triggers sur actions_correctives
CREATE TRIGGER set_updated_at_actions
  BEFORE UPDATE ON actions_correctives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER uppercase_action_code
  BEFORE INSERT OR UPDATE ON actions_correctives
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_code_column();

-- =====================================================================
-- 6. TABLE: preuves_correction
-- =====================================================================

CREATE TABLE preuves_correction (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien action
  action_id UUID NOT NULL REFERENCES actions_correctives(id) ON DELETE CASCADE,
  
  -- Type preuve
  type preuve_type NOT NULL,
  
  -- Contenu
  titre VARCHAR(200),
  description TEXT,
  file_url TEXT,
  
  -- Validation
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT preuve_file_url_check CHECK (
    CASE
      WHEN type IN ('photo', 'document') THEN file_url IS NOT NULL
      ELSE true
    END
  ),
  
  CONSTRAINT preuve_verified_check CHECK (
    CASE
      WHEN verified_at IS NOT NULL THEN verified_by IS NOT NULL
      ELSE true
    END
  )
);

-- Index sur preuves_correction
CREATE INDEX idx_preuve_action ON preuves_correction(action_id);
CREATE INDEX idx_preuve_uploaded_by ON preuves_correction(uploaded_by);
CREATE INDEX idx_preuve_verified_by ON preuves_correction(verified_by);
CREATE INDEX idx_preuve_type ON preuves_correction(type);

-- =====================================================================
-- 7. TABLE: notifications
-- =====================================================================

CREATE TABLE notifications (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type notification
  type notification_type NOT NULL,
  
  -- Lien contexte métier
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
  
  -- Contraintes
  CONSTRAINT notification_context_check CHECK (
    (type = 'nc_critique' AND nc_id IS NOT NULL AND action_id IS NULL)
    OR
    (type = 'nc_echue' AND nc_id IS NOT NULL AND action_id IS NULL)
    OR
    (type = 'action_terminee' AND action_id IS NOT NULL AND nc_id IS NOT NULL)
  )
);

-- Index sur notifications
CREATE INDEX idx_notification_destinataire ON notifications(destinataire_id);
CREATE INDEX idx_notification_lue ON notifications(lue);
CREATE INDEX idx_notification_type ON notifications(type);
CREATE INDEX idx_notification_nc ON notifications(nc_id);
CREATE INDEX idx_notification_action ON notifications(action_id);
CREATE INDEX idx_notification_created ON notifications(created_at);

-- =====================================================================
-- 8. TRIGGERS MÉTIER
-- =====================================================================

-- Trigger: Calcul échéance NC selon gravité (RG-02)
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

CREATE TRIGGER set_nc_due_date_before_insert
  BEFORE INSERT ON non_conformites
  FOR EACH ROW
  EXECUTE FUNCTION calculate_nc_due_date();

-- Trigger: Notification NC critique (RG-05)
CREATE OR REPLACE FUNCTION notify_critical_nc()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_id UUID;
BEGIN
  IF NEW.gravite = 'critique' THEN
    -- Récupérer manager QHSE (premier trouvé)
    SELECT id INTO v_manager_id
    FROM profiles
    WHERE role = 'qhse_manager'
    AND status = 'active'
    LIMIT 1;
    
    IF v_manager_id IS NOT NULL THEN
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
        'NC CRITIQUE: ' || NEW.titre,
        'Une non-conformité CRITIQUE a été créée: ' || NEW.code || '. Échéance: ' || NEW.due_date
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_notification_for_critical_nc
  AFTER INSERT ON non_conformites
  FOR EACH ROW
  WHEN (NEW.gravite = 'critique')
  EXECUTE FUNCTION notify_critical_nc();

-- Trigger: Création action corrective automatique NC haute/critique (RG-06)
CREATE OR REPLACE FUNCTION auto_create_action_for_critical_nc()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.gravite IN ('haute', 'critique') THEN
    INSERT INTO actions_correctives (
      code,
      type,
      nc_id,
      titre,
      description,
      created_by,
      assigned_to,
      due_date
    ) VALUES (
      'AC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('action_code_seq')::TEXT, 4, '0'),
      'corrective',
      NEW.id,
      'Action corrective: ' || NEW.titre,
      'Action générée automatiquement pour NC ' || NEW.gravite,
      NEW.created_by,
      COALESCE(NEW.assigned_to, NEW.created_by),
      NEW.due_date
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_action_for_critical_nc
  AFTER INSERT ON non_conformites
  FOR EACH ROW
  WHEN (NEW.gravite IN ('haute', 'critique'))
  EXECUTE FUNCTION auto_create_action_for_critical_nc();

-- Trigger: Validation preuve obligatoire clôture NC haute/critique (RG-07)
CREATE OR REPLACE FUNCTION validate_nc_closure_with_proof()
RETURNS TRIGGER AS $$
DECLARE
  v_proof_count INTEGER;
BEGIN
  IF NEW.statut = 'cloturee' AND OLD.statut != 'cloturee' 
     AND NEW.gravite IN ('haute', 'critique') THEN
    
    SELECT COUNT(*) INTO v_proof_count
    FROM preuves_correction pc
    JOIN actions_correctives ac ON pc.action_id = ac.id
    WHERE ac.nc_id = NEW.id
      AND pc.verified_at IS NOT NULL;
    
    IF v_proof_count = 0 THEN
      RAISE EXCEPTION 'NC % gravité % ne peut être clôturée sans preuve validée (RG-07)', 
        NEW.code, NEW.gravite;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_nc_closure_proof
  BEFORE UPDATE ON non_conformites
  FOR EACH ROW
  WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
  EXECUTE FUNCTION validate_nc_closure_with_proof();

-- Trigger: Mise à jour timestamps statut NC
CREATE OR REPLACE FUNCTION update_nc_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'resolue' AND OLD.statut != 'resolue' THEN
    NEW.resolved_at := NOW();
  END IF;
  
  IF NEW.statut = 'verifiee' AND OLD.statut != 'verifiee' THEN
    NEW.verified_at := NOW();
  END IF;
  
  IF NEW.statut = 'cloturee' AND OLD.statut != 'cloturee' THEN
    NEW.closed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_nc_timestamps_on_status_change
  BEFORE UPDATE ON non_conformites
  FOR EACH ROW
  WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
  EXECUTE FUNCTION update_nc_timestamps();

-- =====================================================================
-- 9. ACTIVATION RLS SUR TOUTES LES TABLES
-- =====================================================================

ALTER TABLE non_conformites ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_correctives ENABLE ROW LEVEL SECURITY;
ALTER TABLE preuves_correction ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 10. RLS POLICIES: TABLE non_conformites
-- =====================================================================

-- Policy 1: admin_dev - Accès complet
CREATE POLICY admin_dev_all_nc ON non_conformites
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_nc ON non_conformites
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT NC de leurs audits
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

-- Policy 4: Auditeurs - INSERT NC
CREATE POLICY auditors_insert_nc ON non_conformites
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND created_by = auth.uid()
  );

-- Policy 5: Auditeurs - UPDATE NC créées par eux (avant clôture)
CREATE POLICY auditors_update_own_nc ON non_conformites
  FOR UPDATE
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor')
    AND created_by = auth.uid()
    AND statut NOT IN ('verifiee', 'cloturee')
  );

-- Policy 6: Responsable assigné - SELECT NC assignées
CREATE POLICY assigned_select_nc ON non_conformites
  FOR SELECT
  USING (assigned_to = auth.uid());

-- Policy 7: Responsable assigné - UPDATE NC assignées (avant clôture)
CREATE POLICY assigned_update_nc ON non_conformites
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND statut NOT IN ('verifiee', 'cloturee')
  );

-- Policy 8: Viewer - SELECT NC clôturées
CREATE POLICY viewers_select_closed_nc ON non_conformites
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer'
    AND statut = 'cloturee'
  );

-- =====================================================================
-- 11. RLS POLICIES: TABLE actions_correctives
-- =====================================================================

-- Policy 1: admin_dev - Accès complet
CREATE POLICY admin_dev_all_actions ON actions_correctives
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_actions ON actions_correctives
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT actions de leurs NC
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

-- Policy 4: Auditeurs - INSERT actions pour leurs NC
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

-- Policy 5: Responsable assigné - SELECT actions assignées
CREATE POLICY assigned_select_actions ON actions_correctives
  FOR SELECT
  USING (assigned_to = auth.uid());

-- Policy 6: Responsable assigné - UPDATE actions assignées
CREATE POLICY assigned_update_actions ON actions_correctives
  FOR UPDATE
  USING (assigned_to = auth.uid());

-- Policy 7: Viewer - SELECT actions terminées
CREATE POLICY viewers_select_verified_actions ON actions_correctives
  FOR SELECT
  USING (
    get_current_user_role() = 'viewer'
    AND statut = 'verifiee'
  );

-- =====================================================================
-- 12. RLS POLICIES: TABLE preuves_correction
-- =====================================================================

-- Policy 1: admin_dev - Accès complet
CREATE POLICY admin_dev_all_preuves ON preuves_correction
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_preuves ON preuves_correction
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Tous - SELECT preuves de leurs actions
CREATE POLICY users_select_own_preuves ON preuves_correction
  FOR SELECT
  USING (
    action_id IN (
      SELECT id FROM actions_correctives
      WHERE assigned_to = auth.uid() OR created_by = auth.uid()
    )
  );

-- Policy 4: Assigné action - INSERT preuves
CREATE POLICY assigned_insert_preuves ON preuves_correction
  FOR INSERT
  WITH CHECK (
    action_id IN (
      SELECT id FROM actions_correctives
      WHERE assigned_to = auth.uid()
    )
  );

-- Policy 5: Uploader - UPDATE propres preuves (avant vérification)
CREATE POLICY uploader_update_own_preuves ON preuves_correction
  FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    AND verified_at IS NULL
  );

-- =====================================================================
-- 13. RLS POLICIES: TABLE notifications
-- =====================================================================

-- Policy 1: admin_dev - Accès complet
CREATE POLICY admin_dev_all_notifications ON notifications
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - SELECT toutes notifications
CREATE POLICY manager_select_all_notifications ON notifications
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Destinataire - SELECT ses notifications
CREATE POLICY user_select_own_notifications ON notifications
  FOR SELECT
  USING (destinataire_id = auth.uid());

-- Policy 4: Destinataire - UPDATE ses notifications (marquer comme lues)
CREATE POLICY user_update_own_notifications ON notifications
  FOR UPDATE
  USING (destinataire_id = auth.uid());

-- =====================================================================
-- FIN DE LA MIGRATION ÉTAPE 03
-- =====================================================================
