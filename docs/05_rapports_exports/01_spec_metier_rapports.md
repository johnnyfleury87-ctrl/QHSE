# Spécifications Métier – Rapports & Exports QHSE

## Date
22 janvier 2026

## Contexte
Étape 05 du projet QHSE : permettre la génération, consultation et export de rapports d'audit structurés, avec traçabilité et archivage sécurisé.

---

## 📋 OBJECTIF MÉTIER

Fournir aux utilisateurs QHSE :
- **Rapports d'audit formalisés** (PDF/Markdown) générés automatiquement
- **Exports Excel** pour analyse externe (audits, NC, conformité)
- **Templates rapports** standardisés (structure QHSE obligatoire)
- **Archivage long terme** (Supabase Storage, 7 ans minimum)
- **Historique consultations** (traçabilité accès, audit trail)

---

## 🎯 PÉRIMÈTRE FONCTIONNEL

### Inclus (Étape 05)
- ✅ Génération rapport audit complété (PDF + Markdown)
- ✅ Génération rapport synthèse NC (période, dépôt)
- ✅ Export Excel audits (avec filtres: période, dépôt, statut)
- ✅ Export Excel NC (avec filtres: gravité, statut, échéance)
- ✅ Export Excel conformité (stats par zone/dépôt)
- ✅ Templates rapports (3 types: audit, NC, conformité)
- ✅ Stockage rapports (Supabase Storage, bucket `reports`)
- ✅ Historique génération (table `rapports_generes`)
- ✅ Versionning rapports (regénération = nouvelle version)
- ✅ Accès contrôlé (RLS selon rôle + audit propriétaire)

### Exclus (hors Étape 05)
- ❌ Rapports prédictifs/tendances (phase analytics future)
- ❌ Rapports personnalisables drag&drop (complexité excessive)
- ❌ Envoi email automatique (différé Étape Notifications)
- ❌ Signature électronique rapports (différé Étape Validation)
- ❌ Comparaison rapports multi-périodes (différé)
- ❌ Watermarks/filigrane personnalisés (optionnel)

---

## 🧩 CONCEPTS MÉTIER

### Concept 1: Rapport Généré (Rapport Instance)
**Définition**: Document formalisé produit à partir de données QHSE (audit, NC, stats), stocké et traçable.

**Caractéristiques**:
- **Type rapport** (audit_complet, synthese_nc, conformite_globale)
- **Format** (pdf, markdown, excel)
- **Statut** (generation_en_cours, disponible, erreur, archive)
- **Métadonnées** (audit_id, période, dépôt_id, zone_id, générateur)
- **Stockage** (chemin Storage Supabase)
- **Version** (v1, v2... si regénération)

**Cycle de vie**:
1. **Demande génération** (utilisateur clic "Générer rapport")
2. **Generation_en_cours** (moteur collecte données + mise en forme)
3. **Disponible** (fichier uploadé Storage, lien accessible)
4. **Archive** (après 7 ans ou soft-delete)

### Concept 2: Template Rapport (Modèle)
**Définition**: Structure standardisée définissant sections, données incluses et mise en forme.

**Caractéristiques**:
- **Type** (audit_complet, synthese_nc, conformite_globale)
- **Sections obligatoires** (header, métadonnées, contenu, footer)
- **Configuration JSON** (sections, ordre, calculs automatiques)
- **Version template** (évolution structure sans casser anciens rapports)

**Exemple Template Audit Complet**:
```json
{
  "type": "audit_complet",
  "version": "1.0",
  "sections": [
    { "id": "header", "title": "En-tête QHSE", "required": true },
    { "id": "metadata", "title": "Métadonnées Audit", "required": true },
    { "id": "questions_reponses", "title": "Questions & Réponses", "required": true },
    { "id": "non_conformites", "title": "Non-Conformités Détectées", "required": false },
    { "id": "photos", "title": "Preuves Photos", "required": false },
    { "id": "scoring", "title": "Calcul Conformité", "required": true },
    { "id": "signature", "title": "Signatures", "required": true }
  ]
}
```

### Concept 3: Export Excel
**Définition**: Extraction données brutes QHSE au format Excel (`.xlsx`), avec filtres appliqués.

**Types exports**:
- **Export Audits** (colonnes: code, dépôt, zone, statut, auditeur, date_prevue, date_realisee, conformite)
- **Export NC** (colonnes: code, gravité, statut, audit, description, responsable, deadline, is_overdue)
- **Export Conformité** (colonnes: depot, zone, nb_audits, taux_conformite, nb_nc, nc_critiques)

**Filtres disponibles**:
- Période (date_debut, date_fin)
- Dépôt (depot_id)
- Zone (zone_id)
- Statut (audit_status ou nc_statut)

---

## 📏 RÈGLES DE GESTION (RG)

### RG-01: Génération rapport audit complété uniquement
**Énoncé**: Un rapport d'audit ne peut être généré QUE si audit.status = 'completed'.

**Justification**: Éviter rapports incomplets ou "brouillons" qui n'ont pas de valeur métier.

**Implémentation**:
- CHECK constraint DB: `(type_rapport != 'audit_complet' OR audit_id IS NULL OR EXISTS (SELECT 1 FROM audits WHERE id = audit_id AND status = 'completed'))`
- Validation applicative (apiWrapper)

**Tests**: 
- ✅ OK: Générer rapport audit completed
- ❌ KO: Tenter générer rapport audit in_progress → erreur

---

### RG-02: Code rapport unique format RAPyyyymm-NNNN
**Énoncé**: Chaque rapport a un code unique format `RAP202601-0001`, `RAP202601-0002`, etc.

**Justification**: Traçabilité long terme (archives physiques, références externes).

**Implémentation**:
- Colonne `code_rapport` VARCHAR(16) UNIQUE NOT NULL
- Fonction trigger `generate_rapport_code()` similaire NC

**Tests**:
- ✅ OK: 2 rapports même mois → RAP202601-0001, RAP202601-0002
- ❌ KO: Dupliquer code → violation UNIQUE

---

### RG-03: Stockage Storage Supabase bucket `reports`
**Énoncé**: Tous fichiers générés (PDF, Excel) sont stockés dans Supabase Storage bucket `reports`, avec chemin structuré par type/année/mois.

**Justification**: Centralisation sécurisée, RLS Storage, backup automatique Supabase.

**Structure chemin**:
```
reports/
  audit/
    2026/
      01/
        audit_123_v1_20260122.pdf
        audit_123_v2_20260125.pdf
  nc/
    2026/
      01/
        nc_synthese_depot1_20260122.pdf
  conformite/
    2026/
      01/
        conformite_global_20260122.xlsx
```

**Implémentation**:
- Colonne `storage_path` TEXT NOT NULL (chemin relatif bucket)
- Fonction helper `build_storage_path(type, annee, mois, filename)`

---

### RG-04: Versionning rapports (regénération)
**Énoncé**: Si utilisateur regénère rapport audit existant, système crée NOUVELLE version (v2, v3...) sans supprimer ancienne.

**Justification**: Historique modifications (ex: audit corrigé, NC ajoutées), audit trail.

**Implémentation**:
- Colonne `version` SMALLINT DEFAULT 1
- Calcul version: `MAX(version) + 1 WHERE audit_id = X AND type_rapport = 'audit_complet'`
- Index `idx_rapports_audit_version` (audit_id, type_rapport, version DESC)

**Tests**:
- ✅ OK: Regénérer rapport audit 123 → v1 reste, v2 créée
- ✅ OK: Lien "Voir dernier rapport" → SELECT MAX(version)

---

### RG-05: Accès rapport selon rôle + propriétaire audit
**Énoncé**: Permissions lecture rapports :
- **admin_dev / qhse_manager**: tous rapports
- **Auditeur**: rapports audits propres + NC liées
- **Viewer**: rapports audits completed uniquement (lecture)

**Justification**: Séparation responsabilités, confidentialité audits en cours.

**Implémentation**: Policies RLS (voir `03_rls_policies_rapports.md`)

---

### RG-06: Historique génération traçable
**Énoncé**: Chaque génération/téléchargement rapport est enregistré (user, date, action).

**Justification**: Audit trail, conformité réglementaire (traçabilité consultations).

**Implémentation**:
- Colonnes `generated_by` UUID (créateur), `generated_at` TIMESTAMPTZ
- Table `rapport_consultations` (rapport_id, user_id, consulted_at, action_type: download/view)

---

### RG-07: Formats obligatoires selon type
**Énoncé**: 
- **Rapport audit**: PDF + Markdown
- **Synthèse NC**: PDF
- **Export conformité**: Excel uniquement

**Justification**: PDF = lecture humaine formelle, Excel = analyse externe, Markdown = archivage texte pur.

**Implémentation**:
- Colonne `format` ENUM ('pdf', 'markdown', 'excel')
- Validation applicative (UI + apiWrapper)

---

### RG-08: Échec génération = statut 'erreur' + log
**Énoncé**: Si génération échoue (timeout, données manquantes, erreur Storage), statut = 'erreur' + message erreur stocké.

**Justification**: Débogage, retry manuel, alertes admin.

**Implémentation**:
- Colonne `statut` ENUM ('generation_en_cours', 'disponible', 'erreur', 'archive')
- Colonne `error_message` TEXT NULL (remplie si erreur)

---

### RG-09: Archivage automatique après 7 ans
**Énoncé**: Rapports > 7 ans passent automatiquement statut 'archive' (soft-delete), mais restent accessibles admin.

**Justification**: Conformité réglementaire (durée conservation QHSE Suisse), allègement tables.

**Implémentation**:
- Fonction planifiée `archive_old_reports()` (Supabase pg_cron ou job manuel annuel)
- Index `idx_rapports_archivage` (generated_at WHERE statut != 'archive')

---

### RG-10: Suppression Storage si soft-delete rapport
**Énoncé**: Si rapport soft-deleted (statut 'archive'), fichier Storage reste (pas suppression physique).

**Justification**: Récupération possible, audit long terme.

**Implémentation**:
- Colonne `archived_at` TIMESTAMPTZ NULL
- Storage Supabase: fichiers jamais DELETE (sauf purge manuelle admin après 10 ans)

---

### RG-11: Export Excel limité 10k lignes
**Énoncé**: Exports Excel limités à 10 000 lignes max (performance).

**Justification**: Fichiers Excel géants (50k+ lignes) = crashs navigateur/Excel, exports lents.

**Implémentation**:
- Validation applicative (apiWrapper) + message UI "Affiner filtres si > 10k résultats"
- Future: pagination exports ou fichier ZIP multi-onglets

---

### RG-12: Templates rapports versionés
**Énoncé**: Templates rapports ont version (template_version), permettant évolutions structure sans casser anciens rapports.

**Justification**: Évolution réglementaire (nouvelles sections obligatoires QHSE), maintenance long terme.

**Implémentation**:
- Table `rapport_templates` (type, version, structure_json, active)
- Rapport stocke `template_version` utilisée (lien figé)

---

## 👥 PERMISSIONS PAR RÔLE

### Matrice Accès Rapports

| Rôle | Voir Rapports | Générer Rapport Audit | Générer Export Excel | Regénérer Rapport | Supprimer (soft) | Accès Archives |
|------|---------------|------------------------|----------------------|-------------------|------------------|----------------|
| **admin_dev** | Tous | ✅ | ✅ | ✅ | ✅ | ✅ |
| **qhse_manager** | Tous | ✅ | ✅ | ✅ | ✅ | ✅ |
| **qh_auditor** | Propres audits | ✅ (propres) | ✅ (filtré) | ✅ (propres) | ❌ | ❌ |
| **safety_auditor** | Propres audits | ✅ (propres) | ✅ (filtré) | ✅ (propres) | ❌ | ❌ |
| **viewer** | Completed uniquement | ❌ | ❌ | ❌ | ❌ | ❌ |

**Notes**:
- "Propres audits" = audits où auditeur est `assigned_to`
- Exports Excel auditeurs = données filtrées automatiquement (RLS appliqué)

---

## 📊 TYPES DE RAPPORTS DÉTAILLÉS

### Type 1: Rapport Audit Complet (PDF + Markdown)

**Déclencheur**: Audit complété → bouton "Générer rapport" → génération immédiate

**Contenu obligatoire**:
1. **En-tête QHSE**
   - Logo entreprise (optionnel)
   - Titre: "Rapport d'Audit QHSE"
   - Code audit: AUDIT-2026-0123
   - Code rapport: RAP202601-0045
   - Date génération

2. **Métadonnées Audit**
   - Template utilisé (ex: "HACCP - Hygiène & Sécurité")
   - Dépôt / Zone
   - Auditeur (nom + rôle)
   - Date planifiée / Date réalisation
   - Durée audit (si trackée)

3. **Questions & Réponses**
   - Par section/catégorie
   - Question → Réponse → Commentaire (si existant)
   - Indication conformité (✅ Conforme / ❌ Non-conforme / ⚠️ Observation)

4. **Non-Conformités Détectées**
   - Liste NC créées pendant audit
   - Code NC, gravité, description, statut actuel

5. **Calcul Conformité**
   - Taux global: X%
   - Détail par section
   - Graphique barres (optionnel PDF, obligatoire Markdown)

6. **Preuves Photos**
   - Miniatures photos (PDF)
   - Liens Storage (Markdown)

7. **Signature**
   - Auditeur: [Nom] - Date
   - Validation manager: [Nom] - Date (optionnel)

**Format PDF**: Généré via bibliothèque (voir `06_decisions_log_rapports.md`)

**Format Markdown**: Structuré YAML front-matter + Markdown body (archivage texte pur)

---

### Type 2: Synthèse Non-Conformités (PDF)

**Déclencheur**: Manager → "Rapports" → "Générer synthèse NC" (sélection période + dépôt optionnel)

**Contenu obligatoire**:
1. **En-tête**
   - Titre: "Synthèse Non-Conformités QHSE"
   - Période: 01/01/2026 - 31/01/2026
   - Dépôt: (tous ou spécifique)
   - Date génération

2. **KPIs Synthétiques**
   - Total NC: X
   - Par gravité (critique, haute, moyenne, faible)
   - Par statut (open, en_traitement, resolue, validee, fermee)
   - NC échues: Y
   - Taux clôture: Z%

3. **Top 5 Zones à Risque**
   - Zone → Nb NC critiques
   - Graphique barres

4. **Liste NC Détaillée**
   - Tableau: Code NC, Gravité, Statut, Audit lié, Responsable, Deadline
   - Tri par gravité DESC, deadline ASC

5. **Actions Correctives en Cours**
   - NC → Action → Responsable → Deadline

**Format**: PDF uniquement (rapport direction/conformité)

---

### Type 3: Export Conformité Global (Excel)

**Déclencheur**: Manager → "Exports" → "Conformité par zone" (sélection période)

**Contenu Excel** (1 onglet):

| Dépôt | Zone | Nb Audits | Audits Completed | Taux Conformité | NC Total | NC Critiques | NC Ouvertes |
|-------|------|-----------|------------------|-----------------|----------|--------------|-------------|
| Dépôt 1 | Zone A | 10 | 8 | 92.5% | 3 | 1 | 1 |
| Dépôt 1 | Zone B | 5 | 5 | 88.0% | 2 | 0 | 0 |

**Calculs**:
- Taux conformité: AVG(audit.conformity_rate) WHERE depot/zone + periode
- NC Total: COUNT(*) FROM non_conformites WHERE audit.depot/zone + periode
- NC Critiques: COUNT(*) WHERE gravite = 'critique'

---

## 🔄 WORKFLOWS MÉTIER

### Workflow 1: Génération Rapport Audit

```
[Audit Complété] 
    ↓
[Manager/Auditeur clique "Générer rapport"]
    ↓
[Validation RG-01: status = completed ?]
    ↓ OUI
[Création entrée rapports_generes (statut: generation_en_cours)]
    ↓
[Collecte données: audit + questions + réponses + NC + photos]
    ↓
[Génération PDF (bibliothèque PDF)]
    ↓
[Génération Markdown (template + données)]
    ↓
[Upload Storage: reports/audit/2026/01/audit_123_v1.pdf + .md]
    ↓
[UPDATE rapports_generes: statut = disponible, storage_path]
    ↓
[Notification UI: "Rapport disponible" + lien téléchargement]
    ↓
[Historique consultation: INSERT rapport_consultations]
```

**Gestion erreurs**:
- Si échec génération PDF → statut 'erreur' + error_message
- Si échec upload Storage → retry 3× puis statut 'erreur'
- Si timeout (> 60s) → statut 'erreur' + "Timeout génération"

---

### Workflow 2: Export Excel NC

```
[Manager clique "Exporter NC Excel"]
    ↓
[Sélection filtres UI: gravité, statut, période, dépôt]
    ↓
[Validation RG-11: COUNT(*) < 10k ?]
    ↓ OUI
[Création entrée rapports_generes (type: export_nc, format: excel)]
    ↓
[Requête DB: SELECT * FROM non_conformites WHERE filtres + RLS]
    ↓
[Génération Excel (bibliothèque XLSX)]
    ↓
[Upload Storage: reports/nc/2026/01/export_nc_20260122.xlsx]
    ↓
[UPDATE rapports_generes: statut = disponible]
    ↓
[Téléchargement automatique navigateur]
```

---

## 📐 VOLUMÉTRIE ESTIMÉE

### Hypothèses
- 300 audits/an complétés
- 50% audits → rapport généré immédiatement
- 50% audits → rapport regénéré 1× (v2)
- 12 exports NC/mois (managers)
- 6 exports conformité/mois (direction)

### Calculs
- **Rapports audits/an**: 300 × 1.5 (versions) = 450 rapports
- **Exports NC/an**: 12 × 12 = 144 fichiers
- **Exports conformité/an**: 6 × 12 = 72 fichiers
- **Total rapports/an**: ~670 fichiers

### Taille fichiers
- Rapport audit PDF: ~500 KB (10 pages)
- Rapport audit Markdown: ~50 KB
- Export Excel: ~200 KB (1000 lignes)

### Stockage Storage
- **Année 1**: 670 × (500 KB + 50 KB) ≈ **350 MB/an**
- **5 ans**: 1.75 GB (sans purge)
- **7 ans** (durée conservation): 2.45 GB

**Conclusion**: Volumétrie raisonnable, pas besoin compression immédiate.

---

## 🔗 DÉPENDANCES ÉTAPES PRÉCÉDENTES

### Étape 01 (Foundation)
- ✅ Tables `profiles`, `depots`, `zones` (métadonnées rapports)
- ✅ Fonction `get_current_user_role()` (RLS rapports)

### Étape 02 (Audits & Templates)
- ✅ Tables `audits`, `reponses`, `questions`, `templates` (contenu rapports)
- ✅ Colonne `completed_at` (RG-01 génération)

### Étape 03 (Non-Conformités)
- ✅ Table `non_conformites` (NC liées audits, synthèse NC)
- ✅ Colonne `is_overdue` (calculs exports)

### Étape 04 (Dashboard)
- ✅ Fonctions `calculate_conformity_rate()`, `get_nc_by_gravity()` (exports conformité)

---

## ✅ CHECKLIST VALIDATION MÉTIER

- [ ] 12 RG métier définies et justifiées
- [ ] 3 types rapports spécifiés (audit, NC, conformité)
- [ ] Permissions 5 rôles documentées
- [ ] Workflows génération + export tracés
- [ ] Versionning rapports expliqué (RG-04)
- [ ] Archivage 7 ans conforme réglementaire
- [ ] Volumétrie estimée (2.45 GB / 7 ans)
- [ ] Dépendances Étapes 01-04 identifiées
- [ ] Mode Démo compatible (mock rapports)

---

**Document prêt pour validation technique (schéma DB).**
