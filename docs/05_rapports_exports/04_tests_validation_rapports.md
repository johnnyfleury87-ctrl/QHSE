# Tests de Validation – Rapports & Exports QHSE

## Date
22 janvier 2026

## Vue d'ensemble
Documentation des scénarios de test pour valider fonctionnalités rapports (génération, exports, RLS, UI). Tests couvrent base de données, sécurité, génération PDF/Excel et interface utilisateur.

---

## 📋 COUVERTURE TESTS

| Catégorie | Nombre Tests | Priorité |
|-----------|--------------|----------|
| **Tests DB** | 12 | Critique |
| **Tests RLS** | 11 | Critique |
| **Tests Génération** | 8 | Critique |
| **Tests Exports** | 5 | Haute |
| **Tests UI** | 6 | Haute |
| **Tests Performance** | 3 | Moyenne |
| **Total** | **45** | - |

---

## 🗄️ TESTS BASE DE DONNÉES (12 tests)

### DB-01: Génération code rapport unique RAPyyyymm-NNNN

**Objectif**: Vérifier fonction `generate_rapport_code()` génère codes uniques séquentiels par mois.

**Pré-requis**: Tables vides ou mois en cours sans rapports.

**SQL**:
```sql
-- Test génération code
SELECT generate_rapport_code(); -- Doit retourner RAP202601-0001
SELECT generate_rapport_code(); -- Doit retourner RAP202601-0002

-- Insérer 2 rapports
INSERT INTO rapports_generes (type_rapport, format, template_id, storage_path, generated_by, statut)
VALUES 
    ('audit_complet', 'pdf', 'tpl-audit-001', 'test1.pdf', 'admin-001', 'disponible'),
    ('synthese_nc', 'pdf', 'tpl-nc-001', 'test2.pdf', 'manager-001', 'disponible');

-- Vérifier codes
SELECT code_rapport FROM rapports_generes ORDER BY created_at;
```

**Attendu**:
✅ Codes séquentiels: `RAP202601-0001`, `RAP202601-0002`  
✅ Aucun duplicata

**Cas KO**:
❌ Code manuel duplicata → violation UNIQUE constraint

---

### DB-02: Trigger version rapport auto-incrémentée

**Objectif**: Vérifier trigger `trigger_calculate_rapport_version()` incrémente version rapports audit regénérés.

**SQL**:
```sql
-- Insérer rapport audit v1
INSERT INTO rapports_generes (type_rapport, format, audit_id, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'audit-003', 'tpl-audit-001', 'audit_003_v1.pdf', 'auditor-001', 'disponible');

-- Vérifier version
SELECT version FROM rapports_generes WHERE audit_id = 'audit-003' AND format = 'pdf';
-- Attendu: version = 1

-- Regénérer rapport (v2)
INSERT INTO rapports_generes (type_rapport, format, audit_id, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'audit-003', 'tpl-audit-001', 'audit_003_v2.pdf', 'manager-001', 'disponible');

-- Vérifier version
SELECT version FROM rapports_generes WHERE audit_id = 'audit-003' AND format = 'pdf' ORDER BY created_at DESC LIMIT 1;
-- Attendu: version = 2
```

**Attendu**:
✅ v1 = 1, v2 = 2  
✅ Index `idx_rapports_audit_type_version` utilisé (vérifier EXPLAIN)

---

### DB-03: Contrainte audit_id obligatoire pour type audit_complet

**Objectif**: Vérifier CHECK constraint `check_audit_required_for_audit_complet`.

**SQL**:
```sql
-- Test OK: audit_id fourni
INSERT INTO rapports_generes (type_rapport, format, audit_id, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'audit-003', 'tpl-audit-001', 'test.pdf', 'auditor-001', 'disponible');
-- Attendu: ✅ INSERT réussie

-- Test KO: audit_id NULL
INSERT INTO rapports_generes (type_rapport, format, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'tpl-audit-001', 'test.pdf', 'admin-001', 'disponible');
-- Attendu: ❌ Erreur CHECK constraint violation
```

---

### DB-04: Contrainte error_message obligatoire si statut erreur

**Objectif**: Vérifier CHECK constraint `check_error_message_if_erreur`.

**SQL**:
```sql
-- Test KO: statut erreur sans message
UPDATE rapports_generes
SET statut = 'erreur'
WHERE code_rapport = 'RAP202601-0001';
-- Attendu: ❌ Erreur CHECK constraint

-- Test OK: statut erreur avec message
UPDATE rapports_generes
SET statut = 'erreur', error_message = 'Timeout génération PDF'
WHERE code_rapport = 'RAP202601-0001';
-- Attendu: ✅ UPDATE réussie
```

---

### DB-05: FK template_id empêche suppression template utilisé

**Objectif**: Vérifier FK `ON DELETE RESTRICT` bloque suppression template si rapports existent.

**SQL**:
```sql
-- Créer rapport avec template
INSERT INTO rapports_generes (type_rapport, format, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'tpl-audit-001', 'test.pdf', 'admin-001', 'disponible');

-- Tenter supprimer template
DELETE FROM rapport_templates WHERE id = 'tpl-audit-001';
-- Attendu: ❌ Erreur FK constraint violation
```

---

### DB-06: Fonction get_latest_audit_report() retourne dernière version

**Objectif**: Vérifier fonction retourne rapport version la plus récente pour audit donné.

**SQL**:
```sql
-- Insérer 3 versions rapport audit-003
INSERT INTO rapports_generes (type_rapport, format, audit_id, template_id, storage_path, generated_by, statut, version)
VALUES 
    ('audit_complet', 'pdf', 'audit-003', 'tpl-audit-001', 'v1.pdf', 'auditor-001', 'disponible', 1),
    ('audit_complet', 'pdf', 'audit-003', 'tpl-audit-001', 'v2.pdf', 'manager-001', 'disponible', 2),
    ('audit_complet', 'pdf', 'audit-003', 'tpl-audit-001', 'v3.pdf', 'manager-001', 'disponible', 3);

-- Appeler fonction
SELECT version, storage_path FROM get_latest_audit_report('audit-003');
-- Attendu: version = 3, storage_path = 'v3.pdf'
```

---

### DB-07: Fonction get_user_rapport_stats() agrège correctement

**Objectif**: Vérifier statistiques rapports utilisateur calculées correctement.

**SQL**:
```sql
-- Insérer rapports variés pour auditor-001
INSERT INTO rapports_generes (type_rapport, format, template_id, storage_path, generated_by, statut)
VALUES 
    ('audit_complet', 'pdf', 'tpl-audit-001', 'a1.pdf', 'auditor-001', 'disponible'),
    ('audit_complet', 'pdf', 'tpl-audit-001', 'a2.pdf', 'auditor-001', 'disponible'),
    ('export_nc', 'excel', NULL, 'nc.xlsx', 'auditor-001', 'disponible'),
    ('audit_complet', 'pdf', 'tpl-audit-001', 'a3.pdf', 'auditor-001', 'erreur');

-- Appeler fonction
SELECT get_user_rapport_stats('auditor-001');
-- Attendu JSON:
-- {
--   "total_generes": 4,
--   "par_type": {"audit_complet": 3, "export_nc": 1},
--   "en_erreur": 1
-- }
```

---

### DB-08: Fonction archive_old_reports() archive rapports > 7 ans

**Objectif**: Vérifier fonction archivage automatique (RG-09).

**SQL**:
```sql
-- Créer rapport vieux 8 ans
INSERT INTO rapports_generes (type_rapport, format, template_id, storage_path, generated_by, statut, generated_at)
VALUES ('audit_complet', 'pdf', 'tpl-audit-001', 'old.pdf', 'admin-001', 'disponible', now() - INTERVAL '8 years');

-- Appeler fonction archivage
SELECT * FROM archive_old_reports();
-- Attendu: archived_count = 1

-- Vérifier statut
SELECT statut, archived_at FROM rapports_generes WHERE storage_path = 'old.pdf';
-- Attendu: statut = 'archive', archived_at NOT NULL
```

---

### DB-09: Index idx_rapports_filters_gin recherche JSON efficace

**Objectif**: Vérifier index GIN permet recherche rapide dans filters_json.

**SQL**:
```sql
-- Insérer export avec filtres
INSERT INTO rapports_generes (type_rapport, format, storage_path, generated_by, statut, filters_json)
VALUES ('export_nc', 'excel', 'export.xlsx', 'manager-001', 'disponible', '{"gravite": "critique", "depot_id": "depot-001"}');

-- Rechercher avec filtre JSON
EXPLAIN ANALYZE
SELECT * FROM rapports_generes
WHERE filters_json @> '{"gravite": "critique"}'::jsonb;
-- Attendu: Index Scan using idx_rapports_filters_gin
```

---

### DB-10: Soft delete (archived_at) préserve données

**Objectif**: Vérifier archivage ne supprime pas données physiquement.

**SQL**:
```sql
-- Archiver rapport
UPDATE rapports_generes
SET statut = 'archive', archived_at = now()
WHERE code_rapport = 'RAP202601-0010';

-- Vérifier données préservées
SELECT statut, archived_at, storage_path FROM rapports_generes
WHERE code_rapport = 'RAP202601-0010';
-- Attendu: statut = 'archive', archived_at NOT NULL, storage_path présent
```

---

### DB-11: Consultation INSERT automatique traçabilité

**Objectif**: Vérifier INSERT rapport_consultations fonctionne sans erreur.

**SQL**:
```sql
-- Insérer consultation
INSERT INTO rapport_consultations (rapport_id, user_id, action_type, user_agent)
VALUES ('rapport-001', 'auditor-001', 'download', 'Mozilla/5.0');

-- Vérifier insertion
SELECT action_type, consulted_at FROM rapport_consultations
WHERE rapport_id = 'rapport-001' AND user_id = 'auditor-001';
-- Attendu: 1 ligne, consulted_at = now()
```

---

### DB-12: CASCADE delete rapport → consultations supprimées

**Objectif**: Vérifier FK CASCADE supprime consultations si rapport supprimé.

**SQL**:
```sql
-- Créer rapport + consultation
INSERT INTO rapports_generes (code_rapport, type_rapport, format, template_id, storage_path, generated_by, statut)
VALUES ('RAP202601-9999', 'audit_complet', 'pdf', 'tpl-audit-001', 'test.pdf', 'admin-001', 'disponible');

INSERT INTO rapport_consultations (rapport_id, user_id, action_type)
VALUES ((SELECT id FROM rapports_generes WHERE code_rapport = 'RAP202601-9999'), 'admin-001', 'view');

-- Supprimer rapport
DELETE FROM rapports_generes WHERE code_rapport = 'RAP202601-9999';

-- Vérifier consultations supprimées
SELECT COUNT(*) FROM rapport_consultations
WHERE rapport_id = (SELECT id FROM rapports_generes WHERE code_rapport = 'RAP202601-9999');
-- Attendu: 0 (CASCADE)
```

---

## 🔐 TESTS RLS (11 tests)

### RLS-01: Admin voit tous rapports

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "admin-001", "role": "authenticated"}';

SELECT COUNT(*) FROM rapports_generes;
```

**Attendu**: ✅ Tous rapports visibles (≥5 mock).

---

### RLS-02: Auditeur voit uniquement rapports audits assignés

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT code_rapport FROM rapports_generes;
```

**Attendu**: ✅ Uniquement rapports audit-003 (assigné auditor-001).

---

### RLS-03: Auditeur NE VOIT PAS rapport synthèse NC manager

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT * FROM rapports_generes WHERE type_rapport = 'synthese_nc';
```

**Attendu**: ❌ 0 lignes (refusé).

---

### RLS-04: Viewer voit uniquement rapports audits completed

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "viewer-001", "role": "authenticated"}';

SELECT COUNT(*) FROM rapports_generes WHERE type_rapport = 'audit_complet';
```

**Attendu**: ✅ Uniquement rapports audits completed.

---

### RLS-05: Auditeur génère rapport audit assigné (OK)

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

INSERT INTO rapports_generes (type_rapport, format, audit_id, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'audit-003', 'tpl-audit-001', 'test.pdf', 'auditor-001', 'disponible');
```

**Attendu**: ✅ INSERT réussie.

---

### RLS-06: Auditeur tente générer rapport audit NON assigné (KO)

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

INSERT INTO rapports_generes (type_rapport, format, audit_id, template_id, storage_path, generated_by, statut)
VALUES ('audit_complet', 'pdf', 'audit-001', 'tpl-audit-001', 'test.pdf', 'auditor-001', 'disponible');
```

**Attendu**: ❌ INSERT refusée (has_audit_access = FALSE).

---

### RLS-07: Manager modifie rapport erreur → disponible (OK)

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "manager-001", "role": "authenticated"}';

UPDATE rapports_generes
SET statut = 'disponible', error_message = NULL
WHERE code_rapport = 'RAP202601-0042';
```

**Attendu**: ✅ UPDATE réussie.

---

### RLS-08: Auditeur tente modifier rapport (KO)

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

UPDATE rapports_generes
SET statut = 'disponible'
WHERE code_rapport = 'RAP202601-0001';
```

**Attendu**: ❌ UPDATE refusée.

---

### RLS-09: Utilisateur voit propre historique consultations (OK)

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT COUNT(*) FROM rapport_consultations WHERE user_id = 'auditor-001';
```

**Attendu**: ✅ ≥3 consultations propres.

---

### RLS-10: Utilisateur NE VOIT PAS consultations autres users

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT * FROM rapport_consultations WHERE user_id = 'manager-001';
```

**Attendu**: ❌ 0 lignes.

---

### RLS-11: Fonction can_access_rapport() isolation correcte

**Procédure**:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "auditor-001", "role": "authenticated"}';

SELECT can_access_rapport('rapport-001'::UUID); -- Audit assigné
SELECT can_access_rapport('rapport-003'::UUID); -- Synthèse NC manager
```

**Attendu**:
- Rapport-001: ✅ TRUE
- Rapport-003: ❌ FALSE

---

## 📄 TESTS GÉNÉRATION RAPPORTS (8 tests)

### GEN-01: Génération PDF rapport audit complet (succès)

**Objectif**: Vérifier génération PDF fonctionne sans erreur (bibliothèque PDF utilisée).

**Procédure**:
1. Appel API `/api/rapports/generate` (audit-003, format: pdf)
2. Vérifier INSERT rapports_generes (statut: generation_en_cours → disponible)
3. Vérifier fichier uploadé Supabase Storage
4. Télécharger PDF, ouvrir, vérifier contenu (sections, données audit)

**Attendu**:
✅ PDF généré ~500 KB  
✅ Contenu: métadonnées audit, questions/réponses, NC, conformité, signatures  
✅ Aucune erreur génération

---

### GEN-02: Génération Markdown rapport audit (succès)

**Objectif**: Vérifier génération Markdown archivage texte pur.

**Procédure**:
1. Appel API `/api/rapports/generate` (audit-003, format: markdown)
2. Vérifier fichier `.md` uploadé Storage
3. Télécharger Markdown, vérifier YAML front-matter + contenu

**Attendu**:
✅ Markdown ~50 KB  
✅ Front-matter YAML (métadonnées audit)  
✅ Body Markdown structuré (sections, tableaux)

---

### GEN-03: Génération PDF synthèse NC (succès)

**Objectif**: Vérifier génération synthèse NC avec filtres période/dépôt.

**Procédure**:
1. Appel API `/api/rapports/generate-synthese-nc` (période: 01/2026, depot: depot-001)
2. Vérifier PDF contient KPIs, top 5 zones, liste NC filtrée
3. Vérifier filters_json stocké correctement

**Attendu**:
✅ PDF ~400 KB  
✅ KPIs cohérents filtres  
✅ Top 5 zones calculé

---

### GEN-04: Export Excel NC avec filtres (succès)

**Objectif**: Vérifier export Excel NC filtrée par gravité/statut.

**Procédure**:
1. Appel API `/api/rapports/export-nc` (gravite: critique, statut: open)
2. Vérifier fichier `.xlsx` uploadé Storage
3. Ouvrir Excel, vérifier colonnes + données filtrées

**Attendu**:
✅ Excel ~200 KB  
✅ Colonnes: code_nc, gravité, statut, audit, responsable, deadline  
✅ Données filtrées (critique, open uniquement)

---

### GEN-05: Export Excel conformité global (succès)

**Objectif**: Vérifier export conformité par zone calculé depuis dashboard.

**Procédure**:
1. Appel API `/api/rapports/export-conformite` (période: 30j)
2. Vérifier Excel contient dépôts/zones + stats conformité

**Attendu**:
✅ Excel ~150 KB  
✅ Colonnes: depot, zone, nb_audits, taux_conformite, nc_total  
✅ Calculs cohérents fonction `calculate_conformity_rate()`

---

### GEN-06: Échec génération → statut erreur (timeout)

**Objectif**: Vérifier gestion erreur si génération PDF timeout.

**Procédure**:
1. Simuler timeout (mock générateur PDF retourne erreur après 60s)
2. Vérifier rapports_generes: statut = 'erreur', error_message rempli

**Attendu**:
✅ Statut = 'erreur'  
✅ error_message = "Timeout génération PDF (60s)"  
✅ Aucun fichier Storage uploadé

---

### GEN-07: Regénération rapport → version incrémentée

**Objectif**: Vérifier regénération crée v2 sans supprimer v1.

**Procédure**:
1. Générer rapport audit-003 v1
2. Regénérer rapport audit-003 (clic "Regénérer rapport")
3. Vérifier 2 rapports existent (v1, v2)
4. Vérifier fonction `get_latest_audit_report()` retourne v2

**Attendu**:
✅ 2 rapports (v1, v2)  
✅ v1 storage_path préservé  
✅ v2 version = 2  
✅ get_latest_audit_report() → v2

---

### GEN-08: Génération rapport audit non-completed bloquée

**Objectif**: Vérifier RG-01 (génération uniquement si completed).

**Procédure**:
1. Tenter générer rapport audit in_progress
2. Vérifier validation applicative (apiWrapper) refuse

**Attendu**:
❌ Erreur validation: "Rapport impossible, audit non terminé"  
❌ Aucun INSERT rapports_generes

---

## 📊 TESTS EXPORTS EXCEL (5 tests)

### EXP-01: Export audits avec filtres période/dépôt

**Procédure**:
1. Appel API `/api/rapports/export-audits` (periode: 30j, depot: depot-001)
2. Ouvrir Excel généré
3. Vérifier colonnes + données filtrées

**Attendu**:
✅ Colonnes: code, depot, zone, statut, auditeur, date_prevue, conformite  
✅ Uniquement audits depot-001 + derniers 30j

---

### EXP-02: Export NC limité 10k lignes (RG-11)

**Procédure**:
1. Créer 15k NC (test volumétrie)
2. Tenter export sans filtre
3. Vérifier message UI: "Résultats > 10k, affiner filtres"

**Attendu**:
❌ Export bloqué  
✅ Message utilisateur explicite

---

### EXP-03: Export conformité calculs cohérents

**Procédure**:
1. Export conformité global
2. Comparer taux conformité Excel vs Dashboard
3. Vérifier cohérence calculs

**Attendu**:
✅ Taux conformité identiques (source: fonction DB `calculate_conformity_rate()`)

---

### EXP-04: Export Excel respecte RLS auditeur

**Procédure**:
1. Auditeur exporte audits (sans filtre)
2. Vérifier Excel contient uniquement audits assignés

**Attendu**:
✅ RLS appliqué automatiquement (SELECT filtré DB-side)

---

### EXP-05: Export stocké Storage + traçabilité

**Procédure**:
1. Générer export Excel
2. Vérifier fichier uploadé Storage bucket `reports`
3. Vérifier INSERT rapport_consultations (action: download)

**Attendu**:
✅ Fichier Storage présent  
✅ Consultation tracée

---

## 🖥️ TESTS UI (6 tests)

### UI-01: Liste rapports affiche rapports accessibles

**Procédure**:
1. Connexion auditeur
2. Naviguer `/rapports`
3. Vérifier liste affiche uniquement rapports audits assignés

**Attendu**:
✅ Liste filtrée RLS  
✅ Colonnes: code, type, audit, date génération, statut, actions

---

### UI-02: Bouton "Générer rapport" audit completed

**Procédure**:
1. Détail audit completed
2. Vérifier bouton "Générer rapport PDF" visible
3. Clic bouton → génération lancée → toast "Génération en cours..."

**Attendu**:
✅ Bouton visible (audit completed)  
✅ Génération asynchrone (UI non bloquée)  
✅ Toast succès: "Rapport disponible"

---

### UI-03: Téléchargement rapport trace consultation

**Procédure**:
1. Liste rapports
2. Clic bouton "Télécharger PDF"
3. Vérifier INSERT rapport_consultations (action: download)

**Attendu**:
✅ PDF téléchargé navigateur  
✅ Consultation tracée DB

---

### UI-04: Export Excel NC avec filtres interactifs

**Procédure**:
1. Naviguer `/non-conformites/exports`
2. Sélectionner filtres: gravité (critique), statut (open), période (30j)
3. Clic "Exporter Excel"
4. Vérifier Excel filtré

**Attendu**:
✅ Filtres UI → filters_json DB  
✅ Excel contient uniquement données filtrées

---

### UI-05: Regénération rapport v2 + historique versions

**Procédure**:
1. Détail rapport audit (v1)
2. Clic "Regénérer rapport"
3. Vérifier liste versions affiche v1 + v2
4. Clic "Voir v1" → télécharge v1

**Attendu**:
✅ Historique versions visible  
✅ Téléchargement versions antérieures fonctionne

---

### UI-06: Mode Démo: rapports mock accessibles

**Procédure**:
1. Activer Mode Démo
2. Naviguer `/rapports`
3. Vérifier liste affiche 5 rapports mock
4. Clic "Télécharger" → fichier mock (ou message "Démo, téléchargement simulé")

**Attendu**:
✅ Liste rapports mock  
✅ Aucun appel Supabase  
✅ Téléchargement simulé (ou fichier PDF mock statique)

---

## ⚡ TESTS PERFORMANCE (3 tests)

### PERF-01: Génération PDF audit < 5s

**Procédure**:
1. Générer rapport audit complet (~10 pages, 15 questions, 5 photos)
2. Mesurer temps génération (API start → Storage upload)

**Attendu**:
✅ Temps < 5s  
⚠️ Si > 5s: optimiser bibliothèque PDF ou cache données

---

### PERF-02: Export Excel 5k NC < 3s

**Procédure**:
1. Créer 5000 NC (script SQL)
2. Export Excel sans filtre
3. Mesurer temps génération

**Attendu**:
✅ Temps < 3s  
✅ Fichier Excel ~2 MB

---

### PERF-03: Fonction get_latest_audit_report() < 50ms

**Procédure**:
1. Créer 100 rapports audit (10 audits × 10 versions)
2. Mesurer temps exécution `get_latest_audit_report(audit_id)`

**SQL**:
```sql
EXPLAIN ANALYZE
SELECT * FROM get_latest_audit_report('audit-003');
```

**Attendu**:
✅ Temps < 50ms  
✅ Index `idx_rapports_audit_type_version` utilisé

---

## ✅ CHECKLIST VALIDATION GLOBALE

### Tests Critiques (Blocants)
- [ ] DB-01: Code rapport unique
- [ ] DB-02: Version auto-incrémentée
- [ ] DB-03: audit_id obligatoire audit_complet
- [ ] RLS-01 à RLS-11: Isolation RLS complète
- [ ] GEN-01: PDF généré sans erreur
- [ ] GEN-02: Markdown généré
- [ ] GEN-08: Rapport audit completed uniquement

### Tests Hauts (Importants)
- [ ] DB-05: FK RESTRICT template
- [ ] DB-06: get_latest_audit_report()
- [ ] GEN-03: Synthèse NC PDF
- [ ] GEN-04: Export Excel NC
- [ ] EXP-01: Export audits filtré
- [ ] EXP-04: Export RLS auditeur
- [ ] UI-01 à UI-06: Parcours UI complets

### Tests Moyens (Souhaitables)
- [ ] DB-08: Archivage 7 ans
- [ ] DB-09: Index GIN JSON
- [ ] GEN-06: Gestion erreur timeout
- [ ] PERF-01 à PERF-03: Performance < seuils

---

## 📋 RÉCAPITULATIF TESTS PAR PRIORITÉ

| Priorité | Tests | Statut Attendu |
|----------|-------|----------------|
| **Critique** | 18 | 100% passés avant migration |
| **Haute** | 15 | 90% passés avant migration |
| **Moyenne** | 12 | 70% passés (autres post-migration) |

---

**Document prêt pour validation UI (exemples wireframes).**
