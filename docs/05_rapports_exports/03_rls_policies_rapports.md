# Politiques RLS – Rapports & Exports QHSE

## Date
22 janvier 2026

## Vue d'ensemble
Documentation des politiques Row Level Security (RLS) pour sécuriser l'accès aux rapports générés, templates et historique consultations. Aucune modification des policies existantes (Étapes 01-04), uniquement ajout policies tables rapports.

---

## 🎯 OBJECTIFS SÉCURITÉ

### Principes RLS Rapports
1. **Accès contrôlé**: Utilisateur ne voit QUE rapports autorisés selon rôle + audit propriétaire
2. **Isolation auditeurs**: Auditeur voit uniquement rapports audits assignés
3. **Manager supervision**: qhse_manager voit tous rapports
4. **Viewer lecture**: viewer voit rapports audits completed uniquement
5. **Historique traçable**: Consultations protégées, utilisateur voit propre historique

---

## 🔐 ACTIVATION RLS

```sql
-- Activation RLS sur 3 nouvelles tables
ALTER TABLE rapport_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_generes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapport_consultations ENABLE ROW LEVEL SECURITY;

-- Note: Tables Étapes 01-04 déjà RLS activé (72 policies existantes)
```

---

## 🛠️ FONCTIONS HELPER (Réutilisation)

### Fonction: get_current_user_role() [EXISTANTE - Étape 01]

**Rappel**:
```sql
-- Fonction déjà créée Étape 01, réutilisée ici
-- Retourne: 'admin_dev', 'qhse_manager', 'qh_auditor', 'safety_auditor', 'viewer'
```

**Usage Rapports**: Déterminer permissions lecture/écriture rapports selon rôle.

---

### Fonction: has_audit_access() [EXISTANTE - Étape 02]

**Rappel**:
```sql
-- Fonction déjà créée Étape 02
-- Retourne TRUE si utilisateur courant peut accéder audit (assigned_to ou manager/admin)
CREATE OR REPLACE FUNCTION has_audit_access(p_audit_id UUID)
RETURNS BOOLEAN
...
```

**Usage Rapports**: Vérifier si utilisateur peut voir rapport audit donné.

---

### Fonction NOUVELLE: can_access_rapport()

**Objectif**: Vérifier si utilisateur courant peut accéder rapport donné (selon type rapport + rôle).

```sql
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
    -- Récupérer rôle utilisateur
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
    
    -- Rapport non trouvé
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Type audit_complet: vérifier accès audit lié
    IF rapport_type = 'audit_complet' AND rapport_audit_id IS NOT NULL THEN
        RETURN has_audit_access(rapport_audit_id);
    END IF;
    
    -- Type export (NC, audits, conformité): uniquement générateur peut voir
    IF rapport_type LIKE 'export_%' THEN
        RETURN rapport_generated_by = auth.uid();
    END IF;
    
    -- Type synthese_nc: générateur + managers (déjà géré ci-dessus)
    IF rapport_type = 'synthese_nc' THEN
        RETURN rapport_generated_by = auth.uid();
    END IF;
    
    -- Par défaut: refuser
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION can_access_rapport TO authenticated;

COMMENT ON FUNCTION can_access_rapport IS 'Vérifie si utilisateur courant peut accéder rapport (selon type + rôle + audit lié)';
```

---

## 📋 POLICIES RLS PAR TABLE

### Table: rapport_templates (4 policies)

#### Policy 1: Lecture templates actifs (TOUS utilisateurs authentifiés)

**Objectif**: Tous utilisateurs voient templates actifs pour comprendre structure rapports.

```sql
CREATE POLICY policy_templates_select_active
ON rapport_templates
FOR SELECT
TO authenticated
USING (active = true);

COMMENT ON POLICY policy_templates_select_active ON rapport_templates IS 'Tous utilisateurs authentifiés voient templates actifs';
```

---

#### Policy 2: Création templates (Admin + Manager)

**Objectif**: Seuls admin_dev et qhse_manager peuvent créer templates.

```sql
CREATE POLICY policy_templates_insert_admin
ON rapport_templates
FOR INSERT
TO authenticated
WITH CHECK (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
);

COMMENT ON POLICY policy_templates_insert_admin ON rapport_templates IS 'Admin et Manager peuvent créer templates';
```

---

#### Policy 3: Modification templates (Admin + Manager)

**Objectif**: Seuls admin_dev et qhse_manager peuvent modifier templates.

```sql
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

COMMENT ON POLICY policy_templates_update_admin ON rapport_templates IS 'Admin et Manager peuvent modifier templates';
```

---

#### Policy 4: Suppression templates (Admin uniquement)

**Objectif**: Seul admin_dev peut soft-delete templates (via active=false, pas DELETE physique).

**Note**: DELETE physique bloqué par FK RESTRICT si rapports existants.

```sql
CREATE POLICY policy_templates_delete_admin
ON rapport_templates
FOR DELETE
TO authenticated
USING (
    get_current_user_role() = 'admin_dev'
);

COMMENT ON POLICY policy_templates_delete_admin ON rapport_templates IS 'Seul admin_dev peut supprimer templates (rare, si aucun rapport lié)';
```

---

### Table: rapports_generes (5 policies)

#### Policy 1: Lecture rapports selon accès

**Objectif**: Utilisateur voit rapports selon rôle + audit lié + générateur.

**Règles**:
- **admin_dev / qhse_manager**: tous rapports
- **Auditeur**: rapports audits assignés + exports propres
- **Viewer**: rapports audits completed uniquement (pas exports)

```sql
CREATE POLICY policy_rapports_select_access
ON rapports_generes
FOR SELECT
TO authenticated
USING (
    -- Admin et Manager: tous rapports
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
    OR
    -- Auditeur: rapports audits assignés + exports générés par lui
    (
        get_current_user_role() IN ('qh_auditor', 'safety_auditor')
        AND (
            -- Rapport audit assigné
            (type_rapport = 'audit_complet' AND has_audit_access(audit_id))
            OR
            -- Export généré par auditeur
            (type_rapport LIKE 'export_%' AND generated_by = auth.uid())
        )
    )
    OR
    -- Viewer: rapports audits completed uniquement
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

COMMENT ON POLICY policy_rapports_select_access ON rapports_generes IS 'Lecture rapports selon rôle: admin all, auditeur propres audits, viewer completed uniquement';
```

---

#### Policy 2: Création rapport (Auditeur propres audits + Manager tous)

**Objectif**: Utilisateur peut générer rapport SI accès audit (auditeur assigné) OU manager/admin.

```sql
CREATE POLICY policy_rapports_insert_access
ON rapports_generes
FOR INSERT
TO authenticated
WITH CHECK (
    -- Admin et Manager: génération tous rapports
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
    OR
    -- Auditeur: génération rapport audit assigné uniquement
    (
        get_current_user_role() IN ('qh_auditor', 'safety_auditor')
        AND (
            (type_rapport = 'audit_complet' AND has_audit_access(audit_id))
            OR
            (type_rapport LIKE 'export_%') -- Exports autorisés (données filtrées RLS)
        )
    )
);

COMMENT ON POLICY policy_rapports_insert_access ON rapports_generes IS 'Génération rapport: auditeur propres audits + exports, manager tous';
```

---

#### Policy 3: Modification rapport (Admin + Manager uniquement)

**Objectif**: Seuls admin/manager peuvent modifier métadonnées rapport (ex: changer statut erreur → disponible).

**Note**: Auditeurs NE PEUVENT PAS modifier rapports générés (immuabilité).

```sql
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

COMMENT ON POLICY policy_rapports_update_admin ON rapports_generes IS 'Modification rapport: admin et manager uniquement (ex: corriger erreur)';
```

---

#### Policy 4: Soft-delete rapport (Admin + Manager)

**Objectif**: Seuls admin/manager peuvent archiver rapports (passage statut 'archive').

**Note**: DELETE physique interdit (traçabilité), utiliser UPDATE statut='archive'.

```sql
CREATE POLICY policy_rapports_update_archive
ON rapports_generes
FOR UPDATE
TO authenticated
USING (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
    AND statut != 'archive' -- Permettre archivage uniquement
)
WITH CHECK (
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
);

-- Note: Policy distincte pour archivage, mais techniquement couverte par policy_rapports_update_admin
-- Garder séparé pour clarté métier "archivage = action spécifique"
```

---

#### Policy 5: DELETE physique rapport (Admin uniquement, exceptionnel)

**Objectif**: Seul admin_dev peut DELETE physique rapport (très rare, erreur génération).

```sql
CREATE POLICY policy_rapports_delete_admin
ON rapports_generes
FOR DELETE
TO authenticated
USING (
    get_current_user_role() = 'admin_dev'
);

COMMENT ON POLICY policy_rapports_delete_admin ON rapports_generes IS 'DELETE physique: admin uniquement (exceptionnel, erreur génération)';
```

---

### Table: rapport_consultations (3 policies)

#### Policy 1: Lecture consultations (Propres consultations + Admin/Manager)

**Objectif**: Utilisateur voit historique consultations propres rapports. Admin/Manager voient tout.

```sql
CREATE POLICY policy_consultations_select_own
ON rapport_consultations
FOR SELECT
TO authenticated
USING (
    -- Admin et Manager: toutes consultations
    get_current_user_role() IN ('admin_dev', 'qhse_manager')
    OR
    -- Utilisateur: propres consultations uniquement
    user_id = auth.uid()
);

COMMENT ON POLICY policy_consultations_select_own ON rapport_consultations IS 'Lecture consultations: propres consultations + admin/manager all';
```

---

#### Policy 2: Insertion consultation (Automatique système)

**Objectif**: Tout utilisateur authentifié peut INSERT consultation (traçabilité automatique).

**Note**: INSERT fait par apiWrapper après téléchargement/vue rapport.

```sql
CREATE POLICY policy_consultations_insert_any
ON rapport_consultations
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() -- Utilisateur peut uniquement tracer propres actions
);

COMMENT ON POLICY policy_consultations_insert_any ON rapport_consultations IS 'Insertion consultation: automatique système, utilisateur trace propres actions';
```

---

#### Policy 3: Modification/Suppression (Admin uniquement)

**Objectif**: Seul admin_dev peut modifier/supprimer consultations (correction erreur, purge historique).

```sql
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

CREATE POLICY policy_consultations_delete_admin
ON rapport_consultations
FOR DELETE
TO authenticated
USING (
    get_current_user_role() = 'admin_dev'
);

COMMENT ON POLICY policy_consultations_update_admin ON rapport_consultations IS 'Modification consultations: admin uniquement (correction erreur)';
COMMENT ON POLICY policy_consultations_delete_admin ON rapport_consultations IS 'Suppression consultations: admin uniquement (purge historique)';
```

---

## 📊 RÉCAPITULATIF POLICIES RLS

### Policies par table

| Table | SELECT | INSERT | UPDATE | DELETE | Total |
|-------|--------|--------|--------|--------|-------|
| `rapport_templates` | 1 | 1 | 1 | 1 | **4** |
| `rapports_generes` | 1 | 1 | 2 | 1 | **5** |
| `rapport_consultations` | 1 | 1 | 1 | 1 | **4** |
| **Total Étape 05** | **3** | **3** | **4** | **3** | **13** |

### Policies cumulées projet

| Étape | Policies Créées | Cumul Projet |
|-------|-----------------|--------------|
| Étape 01 (Foundation) | 23 | 23 |
| Étape 02 (Audits) | 21 | 44 |
| Étape 03 (NC) | 28 | 72 |
| Étape 04 (Dashboard) | 0 (réutilisation) | 72 |
| **Étape 05 (Rapports)** | **13** | **85** |

---

## 🧪 TESTS RLS OBLIGATOIRES

### Test RLS-01: Admin voit tous rapports

**Scénario**: admin_dev SELECT rapports_generes.

**SQL**:
```sql
-- Connexion: admin_dev (admin-001)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "admin-001", "role": "authenticated"}';

SELECT COUNT(*) FROM rapports_generes; -- Doit retourner 5 (tous rapports mock)
```

**Attendu**: ✅ 5 rapports visibles.

---

### Test RLS-02: Auditeur voit uniquement rapports audits assignés

**Scénario**: safety_auditor (auditor-001) SELECT rapports_generes.

**SQL**:
```sql
-- Connexion: safety_auditor (auditor-001)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT code_rapport, type_rapport FROM rapports_generes;
-- Doit retourner uniquement rapports audit-003 (audit assigné)
```

**Attendu**:
```
code_rapport     | type_rapport
-----------------+-------------
RAP202601-0001   | audit_complet
RAP202601-0002   | audit_complet (markdown)
RAP202601-0005   | audit_complet (v2)
```

**Attendu**: ✅ 3 rapports (audit-003 versions 1 et 2, PDF + MD).

---

### Test RLS-03: Auditeur NE VOIT PAS rapport synthèse NC manager

**Scénario**: safety_auditor (auditor-001) tente voir rapport synthèse NC manager.

**SQL**:
```sql
-- Connexion: auditor-001
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT * FROM rapports_generes WHERE code_rapport = 'RAP202601-0003'; -- Synthèse NC manager
```

**Attendu**: ❌ 0 lignes (refusé RLS).

---

### Test RLS-04: Viewer voit uniquement rapports audits completed

**Scénario**: viewer SELECT rapports_generes.

**SQL**:
```sql
-- Connexion: viewer (viewer-001)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "viewer-001", "role": "authenticated"}';

SELECT code_rapport, type_rapport FROM rapports_generes;
-- Doit retourner uniquement rapports audits completed (audit-003 completed dans mock)
```

**Attendu**: ✅ 3 rapports audit-003 (completed).

---

### Test RLS-05: Auditeur génère rapport audit assigné (OK)

**Scénario**: safety_auditor (auditor-001) INSERT rapport audit-003 (assigné).

**SQL**:
```sql
-- Connexion: auditor-001
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

INSERT INTO rapports_generes (type_rapport, format, audit_id, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'audit-003', 'tpl-audit-001', 'reports/audit/2026/01/test.pdf', 'auditor-001', 'disponible');
```

**Attendu**: ✅ INSERT réussie (audit-003 assigné à auditor-001).

---

### Test RLS-06: Auditeur tente générer rapport audit NON assigné (KO)

**Scénario**: safety_auditor (auditor-001) tente INSERT rapport audit-001 (assigné auditeur différent).

**SQL**:
```sql
-- Connexion: auditor-001
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

INSERT INTO rapports_generes (type_rapport, format, audit_id, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'audit-001', 'tpl-audit-001', 'reports/audit/2026/01/test.pdf', 'auditor-001', 'disponible');
```

**Attendu**: ❌ INSERT refusée (violation policy: has_audit_access(audit-001) = FALSE).

---

### Test RLS-07: Manager modifie rapport statut erreur → disponible (OK)

**Scénario**: qhse_manager UPDATE rapport erreur.

**SQL**:
```sql
-- Connexion: qhse_manager (manager-001)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "manager-001", "role": "authenticated"}';

UPDATE rapports_generes
SET statut = 'disponible', error_message = NULL
WHERE code_rapport = 'RAP202601-0042'; -- Rapport en erreur
```

**Attendu**: ✅ UPDATE réussie (manager autorisé).

---

### Test RLS-08: Auditeur tente modifier rapport (KO)

**Scénario**: safety_auditor tente UPDATE rapport généré.

**SQL**:
```sql
-- Connexion: auditor-001
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

UPDATE rapports_generes
SET statut = 'disponible'
WHERE code_rapport = 'RAP202601-0001'; -- Rapport propre
```

**Attendu**: ❌ UPDATE refusée (policy: uniquement admin/manager).

---

### Test RLS-09: Utilisateur voit propre historique consultations (OK)

**Scénario**: auditor-001 SELECT rapport_consultations propres.

**SQL**:
```sql
-- Connexion: auditor-001
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT * FROM rapport_consultations WHERE user_id = 'auditor-001';
```

**Attendu**: ✅ 3 consultations (consult-001, consult-003, consult-008 dans mock).

---

### Test RLS-10: Utilisateur NE VOIT PAS consultations autres users

**Scénario**: auditor-001 tente voir consultations manager-001.

**SQL**:
```sql
-- Connexion: auditor-001
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT * FROM rapport_consultations WHERE user_id = 'manager-001';
```

**Attendu**: ❌ 0 lignes (refusé RLS).

---

### Test RLS-11: Fonction can_access_rapport() isolation

**Scénario**: Vérifier fonction helper isole correctement rapports.

**SQL**:
```sql
-- Connexion: auditor-001
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT can_access_rapport('rapport-001'::UUID); -- Rapport audit-003 assigné
SELECT can_access_rapport('rapport-003'::UUID); -- Synthèse NC manager
```

**Attendu**:
- `can_access_rapport('rapport-001')` → ✅ TRUE (audit-003 assigné)
- `can_access_rapport('rapport-003')` → ❌ FALSE (synthèse manager)

---

## 📋 MATRICE PERMISSIONS RÉCAPITULATIVE

### Rapports Générés (rapports_generes)

| Rôle | Voir Tous | Voir Propres Audits | Voir Exports Propres | Générer Rapport Audit | Générer Export | Modifier Rapport | Supprimer |
|------|-----------|---------------------|----------------------|-----------------------|----------------|------------------|-----------|
| **admin_dev** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **qhse_manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **qh_auditor** | ❌ | ✅ | ✅ | ✅ (assignés) | ✅ | ❌ | ❌ |
| **safety_auditor** | ❌ | ✅ | ✅ | ✅ (assignés) | ✅ | ❌ | ❌ |
| **viewer** | ❌ | ✅ (completed) | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### Templates Rapports (rapport_templates)

| Rôle | Voir Actifs | Créer | Modifier | Supprimer |
|------|-------------|-------|----------|-----------|
| **admin_dev** | ✅ | ✅ | ✅ | ✅ |
| **qhse_manager** | ✅ | ✅ | ✅ | ❌ |
| **Auditeurs** | ✅ | ❌ | ❌ | ❌ |
| **viewer** | ✅ | ❌ | ❌ | ❌ |

---

### Consultations Rapports (rapport_consultations)

| Rôle | Voir Propres | Voir Tous | Insérer (auto) | Modifier | Supprimer |
|------|--------------|-----------|----------------|----------|-----------|
| **admin_dev** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **qhse_manager** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Auditeurs** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **viewer** | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## ✅ CHECKLIST VALIDATION RLS

- [ ] RLS activé 3 tables (rapport_templates, rapports_generes, rapport_consultations)
- [ ] 1 fonction helper créée (can_access_rapport)
- [ ] 2 fonctions helper réutilisées (get_current_user_role, has_audit_access)
- [ ] 13 policies RLS créées (4 + 5 + 4)
- [ ] 11 tests RLS documentés (admin, auditeur isolation, viewer, génération, modification, consultations)
- [ ] Matrice permissions complète (3 tableaux rôles × actions)
- [ ] Isolation auditeurs garantie (rapports audits assignés uniquement)
- [ ] Viewer lecture seule audits completed
- [ ] Manager supervision globale
- [ ] Historique consultations traçable et sécurisé

---

**Document prêt pour validation tests (scénarios validation détaillés).**
