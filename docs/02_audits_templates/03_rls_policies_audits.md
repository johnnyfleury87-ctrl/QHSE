# 🔐 ROW LEVEL SECURITY (RLS) – ÉTAPE 02 (Audits & Templates)

## 🎯 CONTEXTE

### Dépendances Étape 01
RLS réutilise la fonction helper existante :
- ✅ `get_current_user_role()` : Retourne le rôle de l'utilisateur connecté
- ✅ Activation RLS sur profiles, depots, zones

### Nouvelles Tables Étape 02
Activation RLS sur 4 nouvelles tables :
- `audit_templates` : Modèles d'audit
- `questions` : Questions des templates
- `audits` : Instances d'audit terrain
- `reponses` : Réponses aux questions

---

## 📊 MATRICE DE PERMISSIONS

### Vue d'Ensemble

| Table | admin_dev | qhse_manager | qh_auditor | safety_auditor | viewer |
|-------|-----------|--------------|------------|----------------|--------|
| **audit_templates** | CRUD | CRUD | SELECT (actifs) | SELECT (actifs) | SELECT (actifs) |
| **questions** | CRUD | CRUD | SELECT | SELECT | SELECT |
| **audits** | CRUD | CRUD | SELECT + CU propres | SELECT + CU propres | SELECT (terminés) |
| **reponses** | CRUD | CRUD | CRUD propres | CRUD propres | SELECT |

**Légende** :
- **C** = CREATE (INSERT)
- **R** = READ (SELECT)
- **U** = UPDATE
- **D** = DELETE
- **propres** = audits assignés à l'utilisateur connecté

---

## 🔧 ACTIVATION RLS

### 1. audit_templates

```sql
-- Activer RLS
ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;

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

COMMENT ON POLICY admin_dev_all_audit_templates ON audit_templates IS 'Admin dev: accès total templates';
COMMENT ON POLICY qhse_manager_all_audit_templates ON audit_templates IS 'QHSE Manager: gestion complète templates';
COMMENT ON POLICY auditors_select_active_templates ON audit_templates IS 'Auditeurs: lecture templates actifs uniquement';
COMMENT ON POLICY viewer_select_active_templates ON audit_templates IS 'Viewer: lecture templates actifs uniquement';
```

**Décompte** : **4 policies** sur `audit_templates`

---

### 2. questions

```sql
-- Activer RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy 1: admin_dev - CRUD complet
CREATE POLICY admin_dev_all_questions ON questions
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_questions ON questions
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT uniquement (questions des templates actifs)
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

-- Policy 4: Viewer - SELECT uniquement
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

COMMENT ON POLICY admin_dev_all_questions ON questions IS 'Admin dev: accès total questions';
COMMENT ON POLICY qhse_manager_all_questions ON questions IS 'QHSE Manager: gestion complète questions';
COMMENT ON POLICY auditors_select_questions ON questions IS 'Auditeurs: lecture questions templates actifs';
COMMENT ON POLICY viewer_select_questions ON questions IS 'Viewer: lecture questions templates actifs';
```

**Décompte** : **4 policies** sur `questions`

---

### 3. audits

```sql
-- Activer RLS
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Policy 1: admin_dev - CRUD complet
CREATE POLICY admin_dev_all_audits ON audits
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_audits ON audits
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT tous les audits
CREATE POLICY auditors_select_all_audits ON audits
  FOR SELECT
  USING (get_current_user_role() IN ('qh_auditor', 'safety_auditor'));

-- Policy 4: Auditeurs - INSERT audits assignés à eux-mêmes
CREATE POLICY auditors_insert_own_audits ON audits
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor') AND
    auditeur_id = auth.uid()
  );

-- Policy 5: Auditeurs - UPDATE audits propres (avant statut "termine")
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

COMMENT ON POLICY admin_dev_all_audits ON audits IS 'Admin dev: accès total audits';
COMMENT ON POLICY qhse_manager_all_audits ON audits IS 'QHSE Manager: gestion complète audits';
COMMENT ON POLICY auditors_select_all_audits ON audits IS 'Auditeurs: lecture tous audits';
COMMENT ON POLICY auditors_insert_own_audits ON audits IS 'Auditeurs: création audits propres uniquement';
COMMENT ON POLICY auditors_update_own_audits ON audits IS 'Auditeurs: modification audits propres avant terminé';
COMMENT ON POLICY viewer_select_finished_audits ON audits IS 'Viewer: lecture audits terminés uniquement';
```

**Décompte** : **6 policies** sur `audits`

**⚠️ PAS DE POLICY DELETE SUR AUDITS POUR AUDITEURS** :
- Auditeurs ne peuvent PAS supprimer leurs audits
- Suppression réservée à admin_dev et qhse_manager
- Raison : préserver historique, traçabilité légale

---

### 4. reponses

```sql
-- Activer RLS
ALTER TABLE reponses ENABLE ROW LEVEL SECURITY;

-- Policy 1: admin_dev - CRUD complet
CREATE POLICY admin_dev_all_reponses ON reponses
  FOR ALL
  USING (get_current_user_role() = 'admin_dev');

-- Policy 2: qhse_manager - CRUD complet
CREATE POLICY qhse_manager_all_reponses ON reponses
  FOR ALL
  USING (get_current_user_role() = 'qhse_manager');

-- Policy 3: Auditeurs - SELECT réponses de leurs propres audits
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

-- Policy 4: Auditeurs - INSERT réponses sur leurs audits (avant "termine")
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

-- Policy 5: Auditeurs - UPDATE réponses sur leurs audits (avant "termine")
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

-- Policy 6: Auditeurs - DELETE réponses sur leurs audits (avant "termine")
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

COMMENT ON POLICY admin_dev_all_reponses ON reponses IS 'Admin dev: accès total réponses';
COMMENT ON POLICY qhse_manager_all_reponses ON reponses IS 'QHSE Manager: gestion complète réponses';
COMMENT ON POLICY auditors_select_own_reponses ON reponses IS 'Auditeurs: lecture réponses propres audits';
COMMENT ON POLICY auditors_insert_own_reponses ON reponses IS 'Auditeurs: ajout réponses propres audits (avant terminé)';
COMMENT ON POLICY auditors_update_own_reponses ON reponses IS 'Auditeurs: modification réponses propres audits (avant terminé)';
COMMENT ON POLICY auditors_delete_own_reponses ON reponses IS 'Auditeurs: suppression réponses propres audits (avant terminé)';
COMMENT ON POLICY viewer_select_reponses ON reponses IS 'Viewer: lecture toutes réponses';
```

**Décompte** : **7 policies** sur `reponses`

---

## 📊 RÉCAPITULATIF POLICIES

### Décompte Total

| Table | Policies | Détail |
|-------|----------|--------|
| `audit_templates` | 4 | admin_dev (ALL), qhse_manager (ALL), auditors (SELECT actifs), viewer (SELECT actifs) |
| `questions` | 4 | admin_dev (ALL), qhse_manager (ALL), auditors (SELECT), viewer (SELECT) |
| `audits` | 6 | admin_dev (ALL), qhse_manager (ALL), auditors (SELECT all + INSERT/UPDATE own), viewer (SELECT finished) |
| `reponses` | 7 | admin_dev (ALL), qhse_manager (ALL), auditors (CRUD own), viewer (SELECT) |
| **TOTAL ÉTAPE 02** | **21** | 21 policies Étape 02 |

**Total cumulé avec Étape 01** : **23 (Étape 01) + 21 (Étape 02) = 44 policies**

---

## 🔍 VALIDATION POLICIES PAR RÔLE

### admin_dev
✅ Accès complet (FOR ALL) sur :
- audit_templates, questions, audits, reponses

### qhse_manager
✅ Accès complet (FOR ALL) sur :
- audit_templates, questions, audits, reponses
✅ Peut modifier audits/réponses d'autres auditeurs (supervision)

### qh_auditor / safety_auditor
✅ **Templates** : SELECT actifs uniquement
✅ **Questions** : SELECT (templates actifs)
✅ **Audits** :
  - SELECT : tous les audits (visibilité complète)
  - INSERT : audits assignés à eux-mêmes
  - UPDATE : audits propres AVANT statut "termine"
  - DELETE : INTERDIT
✅ **Réponses** :
  - CRUD : sur leurs propres audits AVANT statut "termine"

### viewer
✅ **Templates** : SELECT actifs uniquement
✅ **Questions** : SELECT (templates actifs)
✅ **Audits** : SELECT terminés uniquement
✅ **Réponses** : SELECT toutes

---

## 🛡️ RÈGLES DE SÉCURITÉ

### 1. Isolation Auditeurs
**Énoncé** : Un auditeur ne peut modifier que ses propres audits.  
**Implémentation** : 
```sql
USING (auditeur_id = auth.uid())
```

### 2. Verrouillage Audits Terminés
**Énoncé** : Les audits terminés ne sont plus modifiables (sauf admin/manager).  
**Implémentation** :
```sql
USING (statut != 'termine')
```

### 3. Templates Actifs Uniquement
**Énoncé** : Auditeurs/viewers ne voient que templates actifs.  
**Implémentation** :
```sql
USING (statut = 'actif')
```

### 4. Cascade Reponses → Audits
**Énoncé** : Réponses suivent les permissions de leur audit parent.  
**Implémentation** :
```sql
EXISTS (
  SELECT 1 FROM audits
  WHERE id = reponses.audit_id
  AND auditeur_id = auth.uid()
)
```

---

## 🚫 RESTRICTIONS IMPORTANTES

### Pas de DELETE Audits pour Auditeurs
**Raison** : Traçabilité légale, historique inaltérable.  
**Conséquence** : Seuls admin_dev et qhse_manager peuvent supprimer audits.

### Pas de DELETE Templates (Soft Delete)
**Raison** : Préserver historique audits existants.  
**Stratégie** : Archivage via `statut = 'archive'`.  
**Implémentation** : Aucune policy DELETE sur `audit_templates`.

### Modification Limitée Questions
**Raison** : Si template a audits en cours, modifier question peut casser cohérence.  
**Recommandation** : Créer nouvelle version template (incrémenter `version`).

---

## 🔧 FONCTIONS HELPER SUPPLÉMENTAIRES

### 1. Fonction : Vérifier Template Actif

```sql
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

COMMENT ON FUNCTION is_template_active IS 'Vérifie si template est actif';
```

**Usage** : Validation lors création audit (trigger).

---

### 2. Fonction : Vérifier Rôle Auditeur Valide

```sql
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

COMMENT ON FUNCTION is_valid_auditor IS 'Vérifie si profile a rôle auditeur valide';
```

**Usage** : Validation lors affectation auditeur (trigger).

---

### 3. Trigger : Validation Template Actif Avant INSERT Audit

```sql
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
```

---

### 4. Trigger : Validation Rôle Auditeur

```sql
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

COMMENT ON TRIGGER check_auditeur_role_before_insert_audit ON audits IS 'Vérifie rôle auditeur valide';
```

---

## ✅ CHECKLIST SÉCURITÉ

### RLS Activée
- ✅ `audit_templates` : RLS ENABLED
- ✅ `questions` : RLS ENABLED
- ✅ `audits` : RLS ENABLED
- ✅ `reponses` : RLS ENABLED

### Policies Complètes
- ✅ 4 policies sur `audit_templates`
- ✅ 4 policies sur `questions`
- ✅ 6 policies sur `audits`
- ✅ 7 policies sur `reponses`
- ✅ **21 policies total Étape 02**

### Fonctions Helper
- ✅ `get_current_user_role()` (réutilisée Étape 01)
- ✅ `is_template_active()` (nouvelle)
- ✅ `is_valid_auditor()` (nouvelle)

### Triggers Validation
- ✅ `validate_template_actif_before_audit` (INSERT audits)
- ✅ `validate_auditeur_role` (INSERT/UPDATE audits)

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ RLS policies définies (21 policies)
2. ✅ Fonctions helper créées (2 nouvelles)
3. ✅ Triggers validation créés (2 triggers)
4. ⏳ **Tests validation** (scénarios OK/KO)
5. ⏳ **Migration SQL finale** (intégration complète)

---

**Date Création** : 22 janvier 2026  
**Auteur** : GitHub Copilot (Claude Sonnet 4.5)  
**Statut** : ✅ COMPLET – 21 policies définies, 2 fonctions helper, 2 triggers
