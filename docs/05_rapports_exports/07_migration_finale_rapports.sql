-- ============================================================================
-- MIGRATION ÉTAPE 05: RAPPORTS & EXPORTS QHSE
-- ============================================================================
-- Date: 22 janvier 2026
-- Auteur: GitHub Copilot (Claude Sonnet 4.5)
-- Dépendances: Étapes 01 (Foundation), 02 (Audits), 03 (NC), 04 (Dashboard)
-- 
-- OBJECTIF:
--   Créer infrastructure rapports générés (PDF, Excel, Markdown) avec:
--   - 3 tables (rapport_templates, rapports_generes, rapport_consultations)
--   - 3 triggers (code auto, version auto, updated_at)
--   - 3 fonctions métier (latest report, stats, archivage)
--   - 13 policies RLS (isolation rapports selon rôle)
--   - 15 indexes performance
--
-- STATUT: ✅ PRÊTE - NON EXÉCUTÉE (attente validation humaine)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: MÉTADONNÉES MIGRATION
-- ============================================================================

-- Commentaire migration
COMMENT ON SCHEMA public IS 'QHSE Schema - Migration Étape 05 (Rapports) en cours';

-- ============================================================================
-- SECTION 2: VÉRIFICATIONS PRÉ-MIGRATION
-- ============================================================================

-- Vérifier existence tables Étapes 01-04
DO $$
BEGIN
    -- Tables Étape 01
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE EXCEPTION 'Table profiles manquante (Étape 01 non appliquée)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'depots') THEN
        RAISE EXCEPTION 'Table depots manquante (Étape 01 non appliquée)';
    END IF;
    
    -- Tables Étape 02
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audits') THEN
        RAISE EXCEPTION 'Table audits manquante (Étape 02 non appliquée)';
    END IF;
    
    -- Tables Étape 03
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'non_conformites') THEN
        RAISE EXCEPTION 'Table non_conformites manquante (Étape 03 non appliquée)';
    END IF;
    
    -- Fonctions helper existantes
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_role') THEN
        RAISE EXCEPTION 'Fonction get_current_user_role() manquante (Étape 01)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_audit_access') THEN
        RAISE EXCEPTION 'Fonction has_audit_access() manquante (Étape 02)';
    END IF;
    
    RAISE NOTICE '✅ Vérifications pré-migration passées';
END $$;

-- ============================================================================
-- SECTION 3: CRÉATION TABLES
-- ============================================================================

-- Table: rapport_templates (templates rapports versionés)
CREATE TABLE rapport_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    type VARCHAR(50) NOT NULL CHECK (type IN ('audit_complet', 'synthese_nc', 'conformite_globale')),
    version VARCHAR(10) NOT NULL DEFAULT '1.0',
    nom VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Structure JSON
    structure_json JSONB NOT NULL,
    
    -- Configuration
    active BOOLEAN NOT NULL DEFAULT true,
    default_format VARCHAR(20) CHECK (default_format IN ('pdf', 'markdown', 'excel')),
    
    -- Métadonnées
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT unique_template_type_version UNIQUE (type, version)
);

COMMENT ON TABLE rapport_templates IS 'Templates rapports versionés définissant structure sections (Étape 05)';
COMMENT ON COLUMN rapport_templates.structure_json IS 'Configuration JSON sections, calculs et charts rapport';

-- Table: rapports_generes (rapports générés - métadonnées)
CREATE TABLE rapports_generes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification unique
    code_rapport VARCHAR(16) NOT NULL UNIQUE,
    
    -- Type et format
    type_rapport VARCHAR(50) NOT NULL CHECK (type_rapport IN ('audit_complet', 'synthese_nc', 'conformite_globale', 'export_audits', 'export_nc', 'export_conformite')),
    format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'markdown', 'excel')),
    
    -- Relations
    template_id UUID REFERENCES rapport_templates(id) ON DELETE RESTRICT,
    audit_id UUID REFERENCES audits(id) ON DELETE RESTRICT,
    
    -- Versionning
    version SMALLINT NOT NULL DEFAULT 1,
    
    -- Filtres appliqués (exports)
    filters_json JSONB,
    
    -- Stockage Supabase Storage
    storage_path TEXT NOT NULL,
    storage_bucket VARCHAR(50) NOT NULL DEFAULT 'reports',
    file_size_bytes BIGINT,
    
    -- Statut génération
    statut VARCHAR(30) NOT NULL DEFAULT 'generation_en_cours' CHECK (statut IN ('generation_en_cours', 'disponible', 'erreur', 'archive')),
    error_message TEXT,
    
    -- Métadonnées
    generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Archivage
    archived_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Contraintes métier
    CONSTRAINT check_audit_required_for_audit_complet 
        CHECK (type_rapport != 'audit_complet' OR audit_id IS NOT NULL),
    CONSTRAINT check_error_message_if_erreur 
        CHECK (statut != 'erreur' OR error_message IS NOT NULL),
    CONSTRAINT check_archived_at_if_archive 
        CHECK (statut != 'archive' OR archived_at IS NOT NULL)
);

COMMENT ON TABLE rapports_generes IS 'Métadonnées rapports générés (audit PDF/MD, exports Excel, synthèses NC) - Étape 05';
COMMENT ON COLUMN rapports_generes.code_rapport IS 'Code unique format RAPyyyymm-NNNN (RG-02)';
COMMENT ON COLUMN rapports_generes.version IS 'Version rapport (regénération incrémente, RG-04)';
COMMENT ON COLUMN rapports_generes.filters_json IS 'Filtres appliqués exports (période, dépôt, gravité)';
COMMENT ON COLUMN rapports_generes.storage_path IS 'Chemin relatif fichier dans Supabase Storage bucket reports (RG-03)';

-- Table: rapport_consultations (historique consultations - audit trail)
CREATE TABLE rapport_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relations
    rapport_id UUID NOT NULL REFERENCES rapports_generes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Action
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('view', 'download', 'regenerate')),
    
    -- Contexte
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamp
    consulted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE rapport_consultations IS 'Historique consultations rapports - traçabilité audit trail (RG-06)';
COMMENT ON COLUMN rapport_consultations.action_type IS 'Type action: view, download, regenerate';

-- ============================================================================
-- SECTION 4: INDEXES PERFORMANCE
-- ============================================================================

-- Indexes rapport_templates
CREATE INDEX idx_templates_type_active ON rapport_templates(type, active);
CREATE INDEX idx_templates_created_at ON rapport_templates(created_at DESC);

-- Indexes rapports_generes
CREATE UNIQUE INDEX idx_rapports_code ON rapports_generes(code_rapport);
CREATE INDEX idx_rapports_type_statut ON rapports_generes(type_rapport, statut);
CREATE INDEX idx_rapports_audit_type_version ON rapports_generes(audit_id, type_rapport, version DESC) WHERE audit_id IS NOT NULL;
CREATE INDEX idx_rapports_generated_by ON rapports_generes(generated_by);
CREATE INDEX idx_rapports_generated_at ON rapports_generes(generated_at DESC);
CREATE INDEX idx_rapports_statut_disponible ON rapports_generes(statut) WHERE statut = 'disponible';
CREATE INDEX idx_rapports_archivage ON rapports_generes(generated_at) WHERE statut != 'archive';
CREATE INDEX idx_rapports_filters_gin ON rapports_generes USING gin(filters_json);

-- Indexes rapport_consultations
CREATE INDEX idx_consultations_rapport ON rapport_consultations(rapport_id, consulted_at DESC);
CREATE INDEX idx_consultations_user ON rapport_consultations(user_id, consulted_at DESC);
CREATE INDEX idx_consultations_date ON rapport_consultations(consulted_at DESC);

-- ============================================================================
-- SECTION 5: SÉQUENCE + FONCTION GÉNÉRATION CODE RAPPORT
-- ============================================================================

-- Séquence codes rapports
CREATE SEQUENCE rapport_code_seq START 1;

-- Fonction génération code rapport RAPyyyymm-NNNN
CREATE OR REPLACE FUNCTION generate_rapport_code()
RETURNS VARCHAR(16)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_month TEXT;
    next_num INT;
    new_code VARCHAR(16);
BEGIN
    -- Format yyyymm
    current_month := to_char(now(), 'YYYYMM');
    
    -- Récupérer prochain numéro pour ce mois
    SELECT COALESCE(MAX(CAST(SUBSTRING(code_rapport FROM 11 FOR 4) AS INT)), 0) + 1
    INTO next_num
    FROM rapports_generes
    WHERE code_rapport LIKE 'RAP' || current_month || '-%';
    
    -- Construire code RAP202601-0042
    new_code := 'RAP' || current_month || '-' || LPAD(next_num::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$;

COMMENT ON FUNCTION generate_rapport_code() IS 'Génère code rapport unique format RAPyyyymm-NNNN (RG-02 Étape 05)';

-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

-- Trigger: Générer code_rapport automatiquement
CREATE OR REPLACE FUNCTION trigger_generate_rapport_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.code_rapport IS NULL THEN
        NEW.code_rapport := generate_rapport_code();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rapport_code_auto
BEFORE INSERT ON rapports_generes
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_rapport_code();

COMMENT ON TRIGGER trg_rapport_code_auto ON rapports_generes IS 'Génère automatiquement code_rapport si NULL (RG-02)';

-- Trigger: Calculer version rapport
CREATE OR REPLACE FUNCTION trigger_calculate_rapport_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    max_version INT;
BEGIN
    IF NEW.type_rapport = 'audit_complet' AND NEW.audit_id IS NOT NULL THEN
        SELECT COALESCE(MAX(version), 0) + 1
        INTO max_version
        FROM rapports_generes
        WHERE audit_id = NEW.audit_id 
          AND type_rapport = 'audit_complet'
          AND id != NEW.id;
        
        NEW.version := max_version;
    ELSE
        NEW.version := 1;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rapport_version_auto
BEFORE INSERT ON rapports_generes
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_rapport_version();

COMMENT ON TRIGGER trg_rapport_version_auto ON rapports_generes IS 'Calcule version rapport automatiquement (RG-04 versionning)';

-- Trigger: updated_at timestamps
CREATE TRIGGER trg_rapport_templates_updated_at
BEFORE UPDATE ON rapport_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rapports_generes_updated_at
BEFORE UPDATE ON rapports_generes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: FONCTIONS MÉTIER
-- ============================================================================

-- Fonction: Obtenir dernier rapport audit
CREATE OR REPLACE FUNCTION get_latest_audit_report(p_audit_id UUID)
RETURNS TABLE (
    rapport_id UUID,
    code_rapport VARCHAR(16),
    version SMALLINT,
    format VARCHAR(20),
    storage_path TEXT,
    statut VARCHAR(30),
    generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Vérifier accès audit (sécurité)
    IF NOT has_audit_access(p_audit_id) THEN
        RAISE EXCEPTION 'Accès rapport refusé (audit non autorisé)';
    END IF;
    
    RETURN QUERY
    SELECT 
        id,
        rapports_generes.code_rapport,
        rapports_generes.version,
        rapports_generes.format,
        rapports_generes.storage_path,
        rapports_generes.statut,
        rapports_generes.generated_at
    FROM rapports_generes
    WHERE audit_id = p_audit_id
      AND type_rapport = 'audit_complet'
      AND statut = 'disponible'
    ORDER BY version DESC, generated_at DESC
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_latest_audit_report TO authenticated;

COMMENT ON FUNCTION get_latest_audit_report IS 'Retourne dernière version rapport disponible pour audit (RG-04 versionning)';

-- Fonction: Statistiques rapports utilisateur
CREATE OR REPLACE FUNCTION get_user_rapport_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_generes', COUNT(*),
        'par_type', json_object_agg(type_rapport, type_count),
        'en_erreur', SUM(CASE WHEN statut = 'erreur' THEN 1 ELSE 0 END)
    )
    INTO result
    FROM (
        SELECT 
            type_rapport,
            COUNT(*) as type_count
        FROM rapports_generes
        WHERE generated_by = p_user_id
          AND statut != 'archive'
        GROUP BY type_rapport
    ) sub;
    
    RETURN COALESCE(result, '{}'::JSON);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_rapport_stats TO authenticated;

COMMENT ON FUNCTION get_user_rapport_stats IS 'Statistiques rapports générés par utilisateur (dashboard admin)';

-- Fonction: Archiver rapports anciens (job cron annuel)
CREATE OR REPLACE FUNCTION archive_old_reports()
RETURNS TABLE (archived_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    nb_archived INT;
BEGIN
    -- Vérifier rôle admin/manager
    IF get_current_user_role() NOT IN ('admin_dev', 'qhse_manager') THEN
        RAISE EXCEPTION 'Accès refusé: fonction réservée admin/manager';
    END IF;
    
    -- Archiver rapports > 7 ans (RG-09)
    UPDATE rapports_generes
    SET statut = 'archive',
        archived_at = now(),
        updated_at = now()
    WHERE generated_at < (now() - INTERVAL '7 years')
      AND statut = 'disponible';
    
    GET DIAGNOSTICS nb_archived = ROW_COUNT;
    
    RAISE NOTICE 'Archived % reports older than 7 years', nb_archived;
    
    RETURN QUERY SELECT nb_archived;
END;
$$;

GRANT EXECUTE ON FUNCTION archive_old_reports TO admin_dev, qhse_manager;

COMMENT ON FUNCTION archive_old_reports IS 'Archive rapports > 7 ans (RG-09 conformité QHSE Suisse), exécution annuelle';

-- ============================================================================
-- SECTION 8: FONCTION HELPER RLS
-- ============================================================================

-- Fonction: Vérifier accès rapport
CREATE OR REPLACE FUNCTION can_access_rapport(p_rapport_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_role TEXT;
    rapport_audit_id UUID;
    rapport_type TEXT;
    rapport_generated_by UUID;
BEGIN
    current_role := get_current_user_role();
    
    -- Admin et Manager: accès total
    IF current_role IN ('admin_dev', 'qhse_manager') THEN
        RETURN TRUE;
    END IF;
    
    -- Récupérer métadonnées rapport
    SELECT audit_id, type_rapport, generated_by
    INTO rapport_audit_id, rapport_type, rapport_generated_by
    FROM rapports_generes
    WHERE id = p_rapport_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Type audit_complet: vérifier accès audit
    IF rapport_type = 'audit_complet' AND rapport_audit_id IS NOT NULL THEN
        RETURN has_audit_access(rapport_audit_id);
    END IF;
    
    -- Exports: uniquement générateur
    IF rapport_type LIKE 'export_%' THEN
        RETURN rapport_generated_by = auth.uid();
    END IF;
    
    -- Synthèse NC: générateur + managers (déjà géré ci-dessus)
    IF rapport_type = 'synthese_nc' THEN
        RETURN rapport_generated_by = auth.uid();
    END IF;
    
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION can_access_rapport TO authenticated;

COMMENT ON FUNCTION can_access_rapport IS 'Vérifie accès rapport selon type + rôle + audit lié (helper RLS)';

-- ============================================================================
-- SECTION 9: POLICIES RLS
-- ============================================================================

-- Activer RLS
ALTER TABLE rapport_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_generes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapport_consultations ENABLE ROW LEVEL SECURITY;

-- ============ rapport_templates (4 policies) ============

-- SELECT: Tous voient templates actifs
CREATE POLICY policy_templates_select_active
ON rapport_templates
FOR SELECT
TO authenticated
USING (active = true);

-- INSERT: Admin + Manager
CREATE POLICY policy_templates_insert_admin
ON rapport_templates
FOR INSERT
TO authenticated
WITH CHECK (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
);

-- UPDATE: Admin + Manager
CREATE POLICY policy_templates_update_admin
ON rapport_templates
FOR UPDATE
TO authenticated
USING (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
)
WITH CHECK (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
);

-- DELETE: Admin uniquement
CREATE POLICY policy_templates_delete_admin
ON rapport_templates
FOR DELETE
TO authenticated
USING (
    get_current_user_role() = 'admin_dev'
);

-- ============ rapports_generes (5 policies) ============

-- SELECT: Selon accès (admin all, auditeur propres audits, viewer completed)
CREATE POLICY policy_rapports_select_access
ON rapports_generes
FOR SELECT
TO authenticated
USING (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
    OR
    (
        get_current_user_role() IN ('qh_auditor', 'safety_auditor')
        AND (
            (type_rapport = 'audit_complet' AND has_audit_access(audit_id))
            OR
            (type_rapport LIKE 'export_%' AND generated_by = auth.uid())
        )
    )
    OR
    (
        get_current_user_role() = 'viewer'
        AND type_rapport = 'audit_complet'
        AND EXISTS (
            SELECT 1 FROM audits
            WHERE audits.id = rapports_generes.audit_id
              AND audits.status = 'completed'
        )
    )
);

-- INSERT: Génération rapport (auditeur propres audits, manager tous)
CREATE POLICY policy_rapports_insert_access
ON rapports_generes
FOR INSERT
TO authenticated
WITH CHECK (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
    OR
    (
        get_current_user_role() IN ('qh_auditor', 'safety_auditor')
        AND (
            (type_rapport = 'audit_complet' AND has_audit_access(audit_id))
            OR
            (type_rapport LIKE 'export_%')
        )
    )
);

-- UPDATE: Admin + Manager uniquement
CREATE POLICY policy_rapports_update_admin
ON rapports_generes
FOR UPDATE
TO authenticated
USING (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
)
WITH CHECK (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
);

-- DELETE: Admin uniquement (exceptionnel)
CREATE POLICY policy_rapports_delete_admin
ON rapports_generes
FOR DELETE
TO authenticated
USING (
    get_current_user_role() = 'admin_dev'
);

-- ============ rapport_consultations (4 policies) ============

-- SELECT: Propres consultations + admin/manager all
CREATE POLICY policy_consultations_select_own
ON rapport_consultations
FOR SELECT
TO authenticated
USING (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
    OR
    user_id = auth.uid()
);

-- INSERT: Automatique système (utilisateur trace propres actions)
CREATE POLICY policy_consultations_insert_any
ON rapport_consultations
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- UPDATE: Admin uniquement
CREATE POLICY policy_consultations_update_admin
ON rapport_consultations
FOR UPDATE
TO authenticated
USING (
    get_current_user_role() = 'admin_dev'
)
WITH CHECK (
    get_current_user_role() = 'admin_dev'
);

-- DELETE: Admin uniquement
CREATE POLICY policy_consultations_delete_admin
ON rapport_consultations
FOR DELETE
TO authenticated
USING (
    get_current_user_role() = 'admin_dev'
);

-- ============================================================================
-- SECTION 10: GRANTS PERMISSIONS
-- ============================================================================

-- Tables
GRANT SELECT, INSERT, UPDATE ON rapport_templates TO authenticated;
GRANT DELETE ON rapport_templates TO admin_dev;

GRANT SELECT, INSERT, UPDATE ON rapports_generes TO authenticated;
GRANT DELETE ON rapports_generes TO admin_dev;

GRANT SELECT, INSERT ON rapport_consultations TO authenticated;
GRANT UPDATE, DELETE ON rapport_consultations TO admin_dev;

-- Séquence
GRANT USAGE ON SEQUENCE rapport_code_seq TO authenticated;

-- Fonctions (déjà GRANT ci-dessus)

-- ============================================================================
-- SECTION 11: VALIDATIONS POST-MIGRATION
-- ============================================================================

DO $$
DECLARE
    table_count INT;
    index_count INT;
    function_count INT;
    policy_count INT;
BEGIN
    -- Vérifier tables créées
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN ('rapport_templates', 'rapports_generes', 'rapport_consultations');
    
    IF table_count != 3 THEN
        RAISE EXCEPTION 'Tables rapports manquantes (attendu 3, trouvé %)', table_count;
    END IF;
    
    -- Vérifier indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename IN ('rapport_templates', 'rapports_generes', 'rapport_consultations');
    
    IF index_count < 15 THEN
        RAISE EXCEPTION 'Indexes manquants (attendu 15+, trouvé %)', index_count;
    END IF;
    
    -- Vérifier fonctions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN ('generate_rapport_code', 'get_latest_audit_report', 'get_user_rapport_stats', 'archive_old_reports', 'can_access_rapport');
    
    IF function_count != 5 THEN
        RAISE EXCEPTION 'Fonctions rapports manquantes (attendu 5, trouvé %)', function_count;
    END IF;
    
    -- Vérifier policies RLS
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename IN ('rapport_templates', 'rapports_generes', 'rapport_consultations');
    
    IF policy_count != 13 THEN
        RAISE EXCEPTION 'Policies RLS manquantes (attendu 13, trouvé %)', policy_count;
    END IF;
    
    RAISE NOTICE '✅ Validations post-migration réussies:';
    RAISE NOTICE '   - 3 tables créées';
    RAISE NOTICE '   - % indexes créés', index_count;
    RAISE NOTICE '   - 5 fonctions créées';
    RAISE NOTICE '   - 13 policies RLS créées';
END $$;

-- ============================================================================
-- SECTION 12: TESTS FONCTIONNELS
-- ============================================================================

-- Test fonction génération code rapport
DO $$
DECLARE
    test_code VARCHAR(16);
BEGIN
    test_code := generate_rapport_code();
    IF test_code NOT LIKE 'RAP______-____' THEN
        RAISE EXCEPTION 'Format code rapport invalide: %', test_code;
    END IF;
    RAISE NOTICE '✅ Test génération code rapport: %', test_code;
END $$;

-- Note: Tests RLS nécessitent SET ROLE authenticated + jwt.claims
-- (à exécuter manuellement post-migration avec utilisateurs réels)

-- ============================================================================
-- SECTION 13: DOCUMENTATION INLINE
-- ============================================================================

-- Commentaires politiques RLS
COMMENT ON POLICY policy_templates_select_active ON rapport_templates IS 'Tous utilisateurs voient templates actifs';
COMMENT ON POLICY policy_templates_insert_admin ON rapport_templates IS 'Admin et Manager peuvent créer templates';
COMMENT ON POLICY policy_templates_update_admin ON rapport_templates IS 'Admin et Manager peuvent modifier templates';
COMMENT ON POLICY policy_templates_delete_admin ON rapport_templates IS 'Seul admin peut supprimer templates';

COMMENT ON POLICY policy_rapports_select_access ON rapports_generes IS 'Lecture rapports: admin all, auditeur propres audits, viewer completed';
COMMENT ON POLICY policy_rapports_insert_access ON rapports_generes IS 'Génération rapport: auditeur propres audits + exports, manager tous';
COMMENT ON POLICY policy_rapports_update_admin ON rapports_generes IS 'Modification rapport: admin et manager uniquement';
COMMENT ON POLICY policy_rapports_delete_admin ON rapports_generes IS 'DELETE physique: admin uniquement (exceptionnel)';

COMMENT ON POLICY policy_consultations_select_own ON rapport_consultations IS 'Lecture consultations: propres + admin/manager all';
COMMENT ON POLICY policy_consultations_insert_any ON rapport_consultations IS 'Insertion consultation: automatique système';
COMMENT ON POLICY policy_consultations_update_admin ON rapport_consultations IS 'Modification: admin uniquement';
COMMENT ON POLICY policy_consultations_delete_admin ON rapport_consultations IS 'Suppression: admin uniquement';

-- ============================================================================
-- SECTION 14: NOTES VOLUMÉTRIE & MONITORING
-- ============================================================================

-- Volumétrie estimée (voir 01_spec_metier_rapports.md):
-- - rapport_templates: ~20 templates (croissance lente)
-- - rapports_generes: ~670 rapports/an = 3350 / 5 ans
-- - rapport_consultations: ~5000 consultations/an = 25k / 5 ans
-- - Storage Supabase: 2.45 GB / 7 ans (rapports PDF/Excel/MD)
--
-- Monitoring recommandé:
-- - EXPLAIN ANALYZE: get_latest_audit_report() (cible <50ms)
-- - Index usage: idx_rapports_audit_type_version (vérifier utilisation)
-- - Taille Storage: surveiller croissance bucket `reports`
-- - Job cron: archive_old_reports() exécution annuelle

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (si besoin annuler migration)
-- ============================================================================

-- ATTENTION: Exécuter UNIQUEMENT si besoin rollback
-- BEGIN;
-- DROP TABLE IF EXISTS rapport_consultations CASCADE;
-- DROP TABLE IF EXISTS rapports_generes CASCADE;
-- DROP TABLE IF EXISTS rapport_templates CASCADE;
-- DROP FUNCTION IF EXISTS can_access_rapport CASCADE;
-- DROP FUNCTION IF EXISTS archive_old_reports CASCADE;
-- DROP FUNCTION IF EXISTS get_user_rapport_stats CASCADE;
-- DROP FUNCTION IF EXISTS get_latest_audit_report CASCADE;
-- DROP FUNCTION IF EXISTS trigger_calculate_rapport_version CASCADE;
-- DROP FUNCTION IF EXISTS trigger_generate_rapport_code CASCADE;
-- DROP FUNCTION IF EXISTS generate_rapport_code CASCADE;
-- DROP SEQUENCE IF EXISTS rapport_code_seq CASCADE;
-- COMMIT;

-- ============================================================================
-- FIN MIGRATION ÉTAPE 05
-- ============================================================================

-- Mise à jour métadonnées
COMMENT ON SCHEMA public IS 'QHSE Schema - Migration Étape 05 (Rapports) APPLIQUÉE';
