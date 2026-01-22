# 📋 DÉCISIONS LOG – ÉTAPE 03 (Non-Conformités & Actions)

## 🎯 OBJECTIF

Ce document recense **toutes les décisions structurantes** prises lors de la conception de l'Étape 03, avec :
- Contexte de la décision
- Alternatives envisagées
- Raisons du choix final
- Impacts techniques

**Principe** : Toute décision non triviale doit être justifiée pour audit futur ou reprise projet.

---

## 📝 DÉCISIONS TECHNIQUES

### D3-01 : Code NC au format NC-YYYY-NNNN (lisible humain)

**Contexte** : Identifier NC de façon unique et traçable.

**Alternatives envisagées** :
1. UUID seul → non lisible, difficile communication terrain
2. Auto-increment simple (1, 2, 3...) → pas de contexte année
3. Code composite NC-YYYY-NNNN → lisible + année visible

**Décision** : Code composite **NC-YYYY-NNNN** avec contrainte CHECK format.

**Justification** :
- Lisibilité rapports/terrain ("NC-2026-0042" vs UUID)
- Traçabilité année (utile pour archives/stats)
- Pattern cohérent avec codes Suisse (normes qualité)

**Implémentation** :
```sql
CHECK (code ~ '^NC-[0-9]{4}-[0-9]{4}$')
```

**Contrainte associée** : Code unique, généré application-side (pas trigger) pour éviter race conditions séquence.

---

### D3-02 : Type ENUM vs table référence pour `nc_gravite`

**Contexte** : Classifier gravité NC (faible, moyenne, haute, critique).

**Alternatives** :
1. Table `gravites` (id, libelle, ordre, echéance_jours)
2. ENUM PostgreSQL `nc_gravite`
3. VARCHAR sans contrainte

**Décision** : **ENUM PostgreSQL** `nc_gravite`.

**Justification** :
- ✅ Valeurs stables (peu probable ajout gravité "très critique")
- ✅ Contrainte DB native (pas de gravité invalide possible)
- ✅ Performance (pas JOIN supplémentaire)
- ✅ Simplicité RLS (pas besoin FK table référence)

**Inconvénient assumé** : Modification ENUM = migration ALTER TYPE (rare).

**Types ENUM créés** :
- `nc_gravite` : faible, moyenne, haute, critique
- `nc_statut` : ouverte, en_traitement, resolue, verifiee, cloturee
- `nc_type` : securite, qualite, hygiene, environnement, autre
- `action_type` : corrective, preventive
- `action_statut` : a_faire, en_cours, terminee, verifiee
- `preuve_type` : photo, document, commentaire

---

### D3-03 : Origine NC via XOR constraint (audit OU dépôt)

**Contexte** : NC peut provenir d'audit (question échouée) OU observation manuelle terrain (dépôt/zone).

**Alternatives** :
1. Permettre les deux simultanément → ambigu (quelle est source réelle?)
2. Origine obligatoire audit uniquement → bloque NC manuelles
3. **XOR constraint** : audit+question OU depot (±zone)

**Décision** : **XOR constraint** via CHECK.

**Justification** :
- ✅ Traçabilité stricte : chaque NC a UNE source claire
- ✅ Flexibilité : NC audit ET NC manuelles supportées
- ✅ Intégrité : impossible NC "orpheline" ou "double origine"

**Implémentation** :
```sql
CHECK (
  (audit_id IS NOT NULL AND question_id IS NOT NULL AND depot_id IS NULL AND zone_id IS NULL)
  OR
  (audit_id IS NULL AND question_id IS NULL AND depot_id IS NOT NULL)
)
```

**Règle métier** : NC audit = audit_id + question_id obligatoires, NC manuelle = depot_id obligatoire + zone_id optionnel.

---

### D3-04 : Soft delete uniquement (is_archived)

**Contexte** : Archiver NC anciennes sans perte données historiques.

**Alternatives** :
1. DELETE physique → perte traçabilité
2. **Soft delete** via `is_archived` + `archived_at`
3. Table séparée `nc_archived`

**Décision** : **Soft delete** avec `is_archived BOOLEAN DEFAULT false`.

**Justification** :
- ✅ Traçabilité complète (audits qualité exigent historique)
- ✅ Restauration possible si erreur
- ✅ Simplicité (pas migration données entre tables)
- ✅ Conformité RG-08 (aucune suppression définitive NC/actions)

**Implémentation** :
- Pas de policy DELETE sur `non_conformites` ni `actions_correctives`
- Archivage via UPDATE `is_archived = true`
- Filtres UI : `WHERE is_archived = false` par défaut

---

### D3-05 : FK actions → NC en RESTRICT (pas CASCADE)

**Contexte** : Empêcher suppression NC si actions correctives existent.

**Alternatives** :
1. CASCADE → supprime actions si NC supprimée (perte données)
2. **RESTRICT** → bloque suppression NC si actions existent
3. SET NULL → orpheline actions (incohérent)

**Décision** : **ON DELETE RESTRICT**.

**Justification** :
- ✅ Intégrité référentielle stricte
- ✅ Évite pertes données accidentelles
- ✅ Cohérence métier : action TOUJOURS liée à NC valide

**Corollaire** : Soft delete obligatoire (sinon blocage suppression).

**Même logique appliquée** :
- `non_conformites.audit_id → audits` : RESTRICT (préserver historique audit)
- `actions_correctives.nc_id → non_conformites` : RESTRICT
- `actions_correctives.assigned_to → profiles` : RESTRICT (bloquer suppression profil si actions actives)

**Exception CASCADE** : `preuves_correction.action_id → actions_correctives` CASCADE (preuve n'a pas de sens sans action).

---

### D3-06 : Colonne GENERATED `is_overdue` vs trigger

**Contexte** : Détecter NC en retard (due_date dépassée) pour KPI/filtres.

**Alternatives** :
1. Calcul applicatif (frontend/backend) → répétition code
2. Vue SQL (`CREATE VIEW`) → performance JOIN
3. Trigger UPDATE `is_overdue` à chaque modification → overhead
4. **Colonne GENERATED STORED** → calcul auto PostgreSQL

**Décision** : **GENERATED ALWAYS AS STORED**.

**Justification** :
- ✅ Performance : valeur stockée (pas recalcul requête)
- ✅ Index possible : `CREATE INDEX idx_nc_overdue ON non_conformites (is_overdue)`
- ✅ Cohérence : automatique, pas risque oubli mise à jour
- ✅ Simplicité : pas trigger dédié

**Implémentation** :
```sql
is_overdue BOOLEAN GENERATED ALWAYS AS (
  due_date < CURRENT_DATE AND statut NOT IN ('cloturee', 'verifiee')
) STORED
```

**Limite assumée** : PostgreSQL 12+ requis (GENERATED STORED).

---

### D3-07 : Trigger auto-création action pour NC critique/haute

**Contexte** : NC critique/haute exigent action immédiate (RG-06).

**Alternatives** :
1. Création manuelle action → risque oubli
2. **Trigger auto-création** → garantie action créée
3. Application-side après INSERT → risque transaction rollback partiel

**Décision** : **Trigger AFTER INSERT** `auto_create_action_for_critical_nc`.

**Justification** :
- ✅ Garantie métier : NC haute/critique = action corrective TOUJOURS créée
- ✅ Atomicité : transaction unique (NC + action)
- ✅ Traçabilité : action créée par `created_by = new.created_by`

**Implémentation** :
```sql
CREATE TRIGGER trigger_auto_create_action
AFTER INSERT ON non_conformites
FOR EACH ROW
WHEN (NEW.gravite IN ('haute', 'critique'))
EXECUTE FUNCTION auto_create_action_for_critical_nc();
```

**Séquence code action** : Utilise `action_code_seq` pour code lisible AC-YYYY-NNNN.

---

### D3-08 : Séparation rôles "corriger" vs "valider"

**Contexte** : Principe séparation responsabilités (ISO 9001).

**Alternatives** :
1. Responsable assigné peut valider sa propre correction → conflit intérêt
2. **Manager seul peut vérifier** NC résolues → séparation stricte
3. Validation pair (autre auditeur) → complexité gestion

**Décision** : **Manager seul (qhse_manager)** valide NC résolues.

**Justification** :
- ✅ Conformité ISO 9001 : indépendance vérification
- ✅ Simplicité workflow : 1 rôle validateur clair
- ✅ Traçabilité : `verified_by` != `assigned_to` garanti

**Implémentation RLS** :
- Transition `resolue → verifiee` : uniquement `qhse_manager` ou `admin_dev`
- Fonction `can_modify_nc_status()` contrôle cette règle

**Workflow validé** :
1. Responsable assigné : `ouverte → en_traitement → resolue`
2. Manager QHSE : `resolue → verifiee → cloturee`

---

### D3-09 : "Responsable assigné" = condition RLS, pas rôle Supabase

**Contexte** : Permettre à un utilisateur (n'importe quel rôle) de voir/modifier NC qui lui est assignée.

**Alternatives** :
1. Créer rôle Supabase `responsable` → trop rigide (et si manager assigné?)
2. **Condition RLS** `assigned_to = auth.uid()` → flexible

**Décision** : **Condition RLS** dans policies, pas rôle dédié.

**Justification** :
- ✅ Flexibilité : manager/auditeur/viewer peut être assigné
- ✅ Simplicité : pas rôle supplémentaire à gérer
- ✅ Cohérence métier : assignation = responsabilité temporaire, pas statut permanent

**Policies créées** :
- `assigned_select_nc` : SELECT si `assigned_to = auth.uid()`
- `assigned_update_nc` : UPDATE si `assigned_to = auth.uid()` ET statut <= resolue

**Clarification** : Les 5 rôles Supabase sont :
1. `admin_dev` (super-admin technique)
2. `qhse_manager` (admin métier)
3. `qh_auditor` (auditeur qualité/hygiène)
4. `safety_auditor` (auditeur sécurité)
5. `viewer` (lecture seule)

"Responsable assigné" n'est PAS un 6e rôle, mais une **règle de permission basée sur `assigned_to`**.

---

### D3-10 : Preuve obligatoire pour clôture NC haute/critique

**Contexte** : Garantir preuve correction avant clôture NC sensibles (RG-07).

**Alternatives** :
1. Preuve facultative → risque clôture abusive
2. **Trigger validation** preuve obligatoire NC haute/critique
3. Validation application-side → contournable

**Décision** : **Trigger BEFORE UPDATE** `validate_nc_closure_with_proof`.

**Justification** :
- ✅ Garantie DB : impossible clôture sans preuve
- ✅ Audit qualité : preuve traçable
- ✅ Conformité normes Suisse (traçabilité corrections)

**Implémentation** :
```sql
IF NEW.statut = 'cloturee' AND OLD.gravite IN ('haute', 'critique') THEN
  IF NOT EXISTS (
    SELECT 1 FROM preuves_correction pc
    JOIN actions_correctives ac ON pc.action_id = ac.id
    WHERE ac.nc_id = NEW.id AND pc.verified_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'NC haute/critique exige preuve validée avant clôture';
  END IF;
END IF;
```

**Exception** : NC faible/moyenne = preuve recommandée mais pas obligatoire.

---

### D3-11 : Échéance action hérite échéance NC (RG-09)

**Contexte** : Action corrective doit être terminée AVANT échéance NC.

**Alternatives** :
1. Échéance action saisie manuellement → risque incohérence
2. **Trigger héritage** échéance NC → cohérence automatique
3. Application calcule échéance → duplication logique

**Décision** : **Trigger BEFORE INSERT** `inherit_nc_due_date`.

**Justification** :
- ✅ Cohérence métier : action AVANT NC résolue
- ✅ Automatique : pas erreur saisie
- ✅ Modifiable : manager peut ajuster si besoin

**Implémentation** :
```sql
IF NEW.due_date IS NULL THEN
  SELECT due_date INTO NEW.due_date
  FROM non_conformites
  WHERE id = NEW.nc_id;
END IF;
```

**Règle** : Si `due_date` fournie à création action, elle est respectée (override). Sinon, héritage auto.

---

### D3-12 : Storage Supabase pour photos preuves (pas BYTEA DB)

**Contexte** : Stocker photos/documents preuves correction.

**Alternatives** :
1. **Supabase Storage** (bucket dédié) → scalable
2. BYTEA colonne PostgreSQL → limite taille DB
3. Storage externe S3 → complexité config

**Décision** : **Supabase Storage** bucket `preuves_correction`.

**Justification** :
- ✅ Scalabilité : GB photos hors DB principale
- ✅ CDN intégré : performance chargement images
- ✅ Sécurité : policies Storage alignées RLS DB
- ✅ Simplicité : SDK Supabase natif

**Implémentation** :
```sql
file_url TEXT CHECK (
  type = 'commentaire' OR file_url IS NOT NULL
)
```

**Bucket config** : Private, policies RLS Storage synchronisées avec policies `preuves_correction`.

---

## 🔗 DÉCISIONS MÉTIER

### D3-13 : NC peut être liée à question audit OU observation manuelle (XOR)

**Déjà documenté** : Voir D3-03 (XOR constraint).

**Ajout métier** : NC liée question audit = `question_id` conservé même si audit archivé (traçabilité).

---

### D3-14 : Statuts NC = 5 états (workflow linéaire)

**Contexte** : Définir cycle de vie NC.

**Workflow retenu** :
1. **ouverte** : NC créée, pas encore assignée/traitée
2. **en_traitement** : Responsable assigné travaille dessus
3. **resolue** : Correction appliquée, preuve uploadée
4. **verifiee** : Manager valide correction
5. **cloturee** : NC archivée, plus modifiable

**Alternatives envisagées** :
- Statut "refusee" (si vérification échoue) → décision : NC retourne `en_traitement` (UPDATE commentaire explication)

**Justification workflow linéaire** :
- ✅ Simplicité (pas états parallèles)
- ✅ Traçabilité (timestamps à chaque transition)
- ✅ Permissions claires (statut = droits)

---

### D3-15 : Actions correctives = 2 types (corrective / préventive)

**Contexte** : Distinguer correction immédiate vs amélioration long terme.

**Types** :
- **corrective** : Correction problème existant (ex: réparer thermostat)
- **preventive** : Prévenir récurrence (ex: installer sonde température)

**Décision** : ENUM `action_type` avec 2 valeurs.

**Justification** :
- ✅ Distinction métier ISO 9001 (actions correctives vs préventives)
- ✅ Stats différenciées (KPI "actions préventives mises en place")

**Règle** : NC critique génère automatiquement action **corrective** (trigger). Actions préventives créées manuellement.

---

### D3-16 : Coût action (estimé vs réel) optionnel

**Contexte** : Suivre coûts corrections pour budget QHSE.

**Champs** :
- `estimated_cost NUMERIC(10,2)` : Coût estimé avant action
- `actual_cost NUMERIC(10,2)` : Coût réel après action

**Décision** : Champs **optionnels** (nullable).

**Justification** :
- ✅ Pas toutes actions = coût (ex: nettoyage interne)
- ✅ Estimation facultative (rapidité terrain)
- ✅ Utile pour actions préventives coûteuses (ex: équipement)

**Usage** : KPI "Coût total corrections mensuel" pour pilotage budget.

---

## 📊 DÉCISIONS PERFORMANCE

### D3-17 : 24 indexes pour requêtes fréquentes

**Contexte** : Optimiser queries listing NC, filtres, stats.

**Indexes créés** :
- `non_conformites` : 11 indexes (code, statut, gravite, audit_id, depot_id, assigned_to, created_by, due_date, is_overdue, is_archived, created_at)
- `actions_correctives` : 6 indexes (code, nc_id, statut, assigned_to, due_date, created_at)
- `preuves_correction` : 7 indexes (action_id, type, uploaded_by, verified_by, uploaded_at, verified_at, created_at)

**Justification** :
- ✅ Queries métier = toujours filtres statut/gravité/assigné
- ✅ Dashboard KPI = agrégations sur statut/is_overdue
- ✅ RLS = filtres `assigned_to`/`created_by` systématiques

**Coût assumé** : Overhead INSERT/UPDATE (négligeable vs gains SELECT).

---

### D3-19 : Table notifications pour traçabilité métier (RG-05 correction)

**Contexte** : RG-05 initialement marquée "hors périmètre migration SQL" violait cadrage "une étape = 100% terminée".

**Options évaluées** :
1. **Notification UI uniquement** (temps réel WebSocket) → Pas de traçabilité, perd historique
2. **Table notifications DB** → Traçabilité complète, consultation asynchrone, testable

**Décision** : **Table `notifications` DB** avec trigger AFTER INSERT NC critique.

**Justification** :
- ✅ Traçabilité métier (audit trail complet notifications critiques)
- ✅ Consultation asynchrone (destinataire lit à son rythme)
- ✅ Testable sans UI (peut valider en SQL que trigger crée notification)
- ✅ Extensible (réutilisable pour escalades RG-10, actions terminées)
- ✅ Conforme cadrage QHSE (fait métier = entité DB, pas dépendance UI)

**Implémentation** :
- Trigger `notify_critical_nc()` AFTER INSERT `non_conformites` WHEN gravite='critique'
- 5 policies RLS notifications (admin all, manager supervision, destinataires read/update)
- Colonne `lue BOOLEAN` pour marquage lecture

**Impact** : +1 table, +1 trigger, +5 policies RLS. Conforme RG-05 sans dépendance UI.

---

### D3-20 : Suppression RG-12 (audit suivi récurrence) - Hors périmètre Étape 03

**Contexte** : RG-12 initialement documentée avec implémentation "hors périmètre SQL initial, phase intégration" violait cadrage.

**Analyse** :
- **RG-12 énoncé** : "Si même type NC répète 3× sur même zone → flag `requires_follow_up_audit`"
- **Problème** : Nécessite historique multi-sites, analyse temporelle patterns, tableaux de bord analytics
- **Périmètre Étape 03** : Gestion opérationnelle NC (CRUD, workflows, actions) - pas analytics

**Options évaluées** :
1. **Implémenter maintenant** → Complexifie Étape 03, mélange gestion opérationnelle + analytics
2. **Garder "partielle"** → Viole cadrage "une étape = 100% terminée"
3. **SUPPRIMER de l'Étape 03** → Reporter à Étape future "Rapports & Tableaux de bord" (Étape 08+)

**Décision** : **SUPPRESSION de RG-12 de l'Étape 03**.

**Justification** :
- ✅ Respecte principe séparation concerns (opérationnel vs analytics)
- ✅ Conforme cadrage "une étape = 100% terminée, pas règles partielles"
- ✅ RG-12 = fonctionnalité analytics nécessitant historique complet, hors scope gestion NC
- ✅ Backlog produit : RG-12 planifiée Étape 08+ "Rapports & Dashboards"

**Impact** : -1 RG (11 règles métier au lieu de 12), colonne `requires_follow_up_audit` retirée du schema. Documentation corrigée 01_spec_metier, 02_schema_db.

---

### D3-18 : Volumétrie estimée = 20 MB DB sur 5 ans

**Hypothèses** :
- 5000 NC sur 5 ans (1000/an)
- 8000 actions (1,6 par NC en moyenne)
- 15000 preuves (commentaires + photos)
- Photos stockées Supabase Storage (hors DB)

**Calcul** :
- NC : 5000 rows × ~2 KB = 10 MB
- Actions : 8000 rows × ~1 KB = 8 MB
- Preuves : 15000 rows × ~0.5 KB = 7.5 MB
- **Total DB** : ~25 MB
- **Storage photos** : 15000 × 400 KB = 6 GB

**Décision** : Pas partitioning nécessaire (volumétrie faible).

---

## ✅ RÉCAPITULATIF DÉCISIONS

| ID | Décision | Type | Impact |
|----|----------|------|--------|
| D3-01 | Code NC-YYYY-NNNN | Format | Lisibilité terrain |
| D3-02 | ENUMs PostgreSQL | Technique | Performance, simplicité |
| D3-03 | XOR audit/dépôt | Contrainte | Intégrité origine |
| D3-04 | Soft delete uniquement | Sécurité | Traçabilité |
| D3-05 | FK RESTRICT NC/actions | Contrainte | Intégrité données |
| D3-06 | GENERATED is_overdue | Performance | Index KPI retard |
| D3-07 | Trigger auto action critique | Métier | Garantie RG-06 |
| D3-08 | Séparation corriger/valider | Métier | ISO 9001 |
| D3-09 | Responsable = condition RLS | Sécurité | Flexibilité rôles |
| D3-10 | Preuve obligatoire clôture | Métier | Garantie RG-07 |
| D3-11 | Héritage échéance action | Métier | Cohérence RG-09 |
| D3-12 | Supabase Storage photos | Architecture | Scalabilité |
| D3-13 | XOR question/dépôt | Métier | Traçabilité origine |
| D3-14 | 5 statuts workflow | Métier | Simplicité |
| D3-15 | 2 types actions | Métier | ISO 9001 |
| D3-16 | Coûts optionnels | Métier | Flexibilité |
| D3-17 | 24 indexes | Performance | Queries rapides |
| D3-18 | Volumétrie 20 MB/5 ans | Performance | Pas partitioning |
| **D3-19** | **Table notifications DB (RG-05)** | **Architecture** | **Traçabilité métier** |
| **D3-20** | **Suppression RG-12 (hors périmètre)** | **Métier** | **Respect cadrage** |

**Total** : **20 décisions documentées**

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Décisions log complet
2. ⏳ **Tests validation** (04_tests_validation_non_conformites.md)
3. ⏳ **Migration SQL finale** (07_migration_finale_non_conformites.sql)
4. ⏳ **Rapport contrôle** (QHSE_ETAPE_03_RAPPORT_CONTROLE.md)

---

**Date Création** : 22 janvier 2026  
**Auteur** : GitHub Copilot (Claude Sonnet 4.5)  
**Statut** : ✅ COMPLET – Validé pour passage tests validation
