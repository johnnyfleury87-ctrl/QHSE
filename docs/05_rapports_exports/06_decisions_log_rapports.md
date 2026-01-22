# Journal des Décisions – Rapports & Exports QHSE

## Date
22 janvier 2026

## Vue d'ensemble
Documentation des décisions architecturales, techniques et métier prises pour le module Rapports & Exports (Étape 05).

---

## 📋 DÉCISIONS MÉTIER

### D5-01: 3 types rapports (audit complet, synthèse NC, conformité globale)

**Contexte**: Besoins métier QHSE nécessitent rapports variés (détail vs synthèse).

**Alternatives considérées**:
1. ✅ **3 types distincts** (audit_complet, synthèse_nc, conformite_globale)
2. ❌ 1 type rapport "universel" configurable → trop complexe UI + génération
3. ❌ 10+ types rapports spécialisés → surcharge maintenance templates

**Décision**: 3 types rapports couvrent 90% besoins, extensibles via templates.

**Justification**:
- Audit complet = besoin quotidien auditeurs
- Synthèse NC = besoin hebdo/mensuel managers
- Conformité globale = besoin reporting direction

**Impacts**:
- ✅ Simple comprendre (3 choix clairs)
- ✅ Templates versionés permettent évolution
- ⚠️ Futurs types (ex: rapport incident) nécessitent migration ENUM

---

### D5-02: Versionning rapports (regénération → v2, v3...)

**Contexte**: Auditeur/manager peut vouloir regénérer rapport (corrections audit, NC ajoutées).

**Alternatives considérées**:
1. ✅ **Versionning** (v1, v2, v3...) = historique complet
2. ❌ Remplacement (supprimer v1, générer v2) → perte audit trail
3. ❌ Immutabilité totale (pas regénération) → inflexible métier

**Décision**: Versionning avec préservation anciennes versions.

**Justification**:
- Audit trail: voir évolution rapports (ex: corrections post-validation)
- Conformité réglementaire: traçabilité modifications
- Fonction `get_latest_audit_report()` simplifie accès dernière version

**Impacts**:
- ✅ Historique complet préservé
- ⚠️ Stockage: ~1.5× espace (moyenne 1.5 versions/rapport)
- ✅ Index `idx_rapports_audit_type_version` optimise performance

---

### D5-03: Archivage automatique 7 ans (conformité QHSE Suisse)

**Contexte**: Durée conservation documents QHSE Suisse = 7-10 ans selon réglementation.

**Alternatives considérées**:
1. ✅ **7 ans automatique** (fonction cron `archive_old_reports()`)
2. ❌ 5 ans → risque non-conformité réglementaire
3. ❌ 10 ans → stockage inutile (7 ans = minimum légal)
4. ❌ Archivage manuel → oubli humain, risque perte

**Décision**: Archivage automatique 7 ans, statut 'archive' (soft-delete).

**Justification**:
- Conformité réglementaire QHSE Suisse
- Automatisation évite oublis
- Soft-delete préserve récupération si besoin (admin)

**Impacts**:
- ✅ Conformité légale garantie
- ✅ Allègement tables (index `WHERE statut != 'archive'`)
- ⚠️ Job cron annuel à configurer (Supabase pg_cron ou manuel)

---

## 🛠️ DÉCISIONS TECHNIQUES

### D5-04: PDF généré via bibliothèque serveur-side (pas client-side)

**Contexte**: Génération PDF audit complet (~10 pages, photos) nécessite bibliothèque robuste.

**Alternatives considérées**:
1. ✅ **Server-side** (Node.js backend: `@react-pdf/renderer` ou `pdfkit`)
   - Avantages: Performances, contrôle qualité, génération lourde OK
   - Inconvénients: Charge serveur
2. ❌ Client-side (browser `jsPDF`)
   - Avantages: Pas charge serveur
   - Inconvénients: Crashs navigateur si gros PDFs, qualité moindre

**Décision**: Génération server-side avec `@react-pdf/renderer` (React components → PDF).

**Justification**:
- Rapports 10+ pages avec photos = génération lourde
- Qualité professionnelle PDF (mise en page, fonts)
- Timeout client-side inacceptable métier

**Bibliothèque choisie**: `@react-pdf/renderer` (React-native)

**Raisons**:
- ✅ Composants React réutilisables (DRY)
- ✅ Support images, tables, charts
- ✅ Qualité PDF professionnelle
- ✅ Maintenance active, documentation complète

**Impacts**:
- ✅ Performance: ~5s génération PDF 10 pages (acceptable)
- ⚠️ Charge serveur: limiter générations simultanées (queue job)
- ✅ Qualité: mise en page conforme charte graphique QHSE

---

### D5-05: Export Excel via bibliothèque `exceljs` (pas csv)

**Contexte**: Exports NC/audits nécessitent format Excel (.xlsx) pour managers (ouverture Excel desktop).

**Alternatives considérées**:
1. ✅ **Excel (.xlsx)** via `exceljs`
   - Avantages: Format attendu managers, colonnes formatées, charts possibles
   - Inconvénients: Bibliothèque +500 KB
2. ❌ CSV
   - Avantages: Léger, simple
   - Inconvénients: Pas formatage, encodage problèmes, ouverture Excel bugs

**Décision**: Excel via `exceljs`.

**Justification**:
- Managers attendent Excel natif (pas CSV)
- Formatage colonnes (dates, nombres) essentiel lisibilité
- Future: graphiques Excel intégrés (évolution)

**Impacts**:
- ✅ Expérience utilisateur professionnelle
- ⚠️ Taille bundle: +500 KB (acceptable)
- ✅ Extensible: ajout charts Excel futurs

---

### D5-06: Markdown rapports audit (archivage texte pur)

**Contexte**: Besoin archivage long terme lisible sans PDF (10+ ans).

**Alternatives considérées**:
1. ✅ **Markdown + YAML front-matter** (texte pur, lisible humain + machine)
2. ❌ JSON → pas lisible humain direct
3. ❌ HTML → complexe, dépendance CSS
4. ❌ PDF uniquement → risque obsolescence lecteur (10+ ans)

**Décision**: Génération Markdown systématique (parallèle PDF).

**Justification**:
- Texte pur = pérennité maximale (lisible dans 50 ans)
- Git-friendly (diff, versioning)
- YAML front-matter = métadonnées structurées machine

**Structure**:
```markdown
---
code_rapport: RAP202601-001
audit_id: AUDIT-2026-0123
generated_at: 2026-01-15T14:30:00Z
...
---
# Rapport Audit QHSE
## Métadonnées
...
```

**Impacts**:
- ✅ Archivage pérenne
- ✅ Lisibilité humaine + parsing machine
- ⚠️ Génération double (PDF + MD) = +1s temps génération

---

### D5-07: Stockage Supabase Storage (bucket `reports`, pas DB)

**Contexte**: Fichiers PDF/Excel volumineux (500 KB - 2 MB) inadaptés stockage DB.

**Alternatives considérées**:
1. ✅ **Supabase Storage** (bucket `reports`)
   - Avantages: Optimisé fichiers lourds, RLS Storage, CDN, backup automatique
   - Inconvénients: Dépendance Supabase
2. ❌ Stockage DB (colonnes bytea)
   - Avantages: Pas dépendance externe
   - Inconvénients: Performances dégradées, volumétrie DB explose
3. ❌ S3 externe
   - Avantages: Scalabilité
   - Inconvénients: Complexité setup, coût séparé

**Décision**: Supabase Storage bucket `reports`.

**Structure chemin**:
```
reports/
  audit/
    2026/
      01/
        audit_123_v1_20260115.pdf
        audit_123_v1_20260115.md
  nc/
    2026/01/...
  conformite/...
```

**Justification**:
- Optimisation performance (Storage vs DB)
- RLS Storage native Supabase
- Backup automatique inclus plan Supabase
- CDN (téléchargements rapides global)

**Impacts**:
- ✅ Performance: téléchargement rapide (CDN)
- ✅ Scalabilité: 10 GB inclus gratuit Supabase
- ⚠️ Coût: ~$0.021/GB supplémentaire (après 10 GB)

---

### D5-08: Codes rapports format RAPyyyymm-NNNN (lisibilité humaine)

**Contexte**: Codes lisibles essentiels communication verbale/email ("voir rapport RAP202601-0042").

**Alternatives considérées**:
1. ✅ **RAPyyyymm-NNNN** (ex: RAP202601-0042)
2. ❌ UUID → illisible humain
3. ❌ Séquentiel global (RAP-0001, RAP-0002) → collision multi-instances
4. ❌ Hash court (RAP-a3f9k2) → pas ordonné chronologiquement

**Décision**: Format `RAPyyyymm-NNNN` (4 lettres + 6 chiffres date + tiret + 4 chiffres séquence).

**Justification**:
- Lisibilité: "rapport janvier 2026 numéro 42"
- Ordonnancement chronologique naturel
- Séquence mensuelle évite collisions multi-sites

**Implémentation**: Fonction `generate_rapport_code()` + trigger.

**Impacts**:
- ✅ Communication claire humain
- ✅ Tri chronologique naturel
- ⚠️ Limite: 9999 rapports/mois (largement suffisant)

---

### D5-09: Limite exports Excel 10k lignes (RG-11 performance)

**Contexte**: Exports Excel 50k+ lignes = crashs Excel desktop, génération lente (>30s).

**Alternatives considérées**:
1. ✅ **Limite 10k lignes** + message UI "Affiner filtres"
2. ❌ Pas limite → risque crashs, expérience dégradée
3. ❌ Pagination exports (fichiers multiples) → complexité UI
4. ❌ Limit

e 100k lignes → toujours risque crash

**Décision**: Limite hard 10 000 lignes, validation applicative + message UI.

**Justification**:
- 10k lignes = maximum Excel confortable (ouverture <3s)
- Utilisateurs doivent affiner filtres (bonne pratique analyse)
- Évite charge serveur génération massive

**Impacts**:
- ✅ Performance garantie
- ✅ Expérience utilisateur stable
- ⚠️ Utilisateurs doivent filtrer (formation nécessaire)

---

### D5-10: Fonction `get_latest_audit_report()` SECURITY DEFINER (performance)

**Contexte**: Récupération dernière version rapport fréquente (UI détail audit).

**Alternatives considérées**:
1. ✅ **SECURITY DEFINER** + contrôle rôle interne
   - Avantages: 1 requête optimisée, index utilisé
   - Inconvénients: Risque sécurité si mal codée
2. ❌ SECURITY INVOKER + JOIN applicatif
   - Avantages: RLS naturelle
   - Inconvénients: 2-3 requêtes, performance moindre

**Décision**: SECURITY DEFINER avec `SET search_path = public` (protection schema poisoning).

**Sécurité**: Fonction vérifie `has_audit_access()` avant retour résultats.

**Justification**:
- Performance: 1 requête vs 3
- Index `idx_rapports_audit_type_version` utilisé
- Sécurité: validation rôle explicite

**Impacts**:
- ✅ Performance: <50ms
- ✅ Sécurité: protection schema poisoning + validation rôle
- ⚠️ Maintenance: bien documenter logique sécurité

---

## 🗂️ DÉCISIONS ARCHITECTURE

### D5-11: Templates rapports versionés (structure JSON évolutive)

**Contexte**: Structure rapports évoluera (nouvelles sections réglementaires).

**Alternatives considérées**:
1. ✅ **Templates versionés** (v1.0, v1.1, v2.0) + structure JSON
2. ❌ Code en dur générateur → pas flexible, refactor difficile
3. ❌ Templates DB relationnels (tables sections, champs) → complexité excessive

**Décision**: Table `rapport_templates` avec colonne `structure_json` JSONB.

**Exemple structure**:
```json
{
  "sections": [
    {"id": "header", "title": "En-tête", "required": true},
    {"id": "metadata", "title": "Métadonnées", "required": true}
  ],
  "calculations": ["conformity_rate"],
  "charts": ["conformity_by_section"]
}
```

**Justification**:
- Flexibilité: ajouter sections sans migration SQL
- Versionning: rapport stocke `template_version` utilisée (lien figé)
- Évolution: créer template v2.0 sans casser v1.0

**Impacts**:
- ✅ Flexibilité maximale
- ✅ Pas refactor générateur si nouvelles sections
- ⚠️ Validation JSON nécessaire (schéma JSON Schema recommandé)

---

### D5-12: Historique consultations (traçabilité audit trail)

**Contexte**: Conformité réglementaire nécessite traçabilité accès rapports sensibles.

**Alternatives considérées**:
1. ✅ **Table `rapport_consultations`** (rapport_id, user_id, action, timestamp)
2. ❌ Logs applicatifs uniquement → pas queryable SQL, expiration logs
3. ❌ Pas traçabilité → risque conformité

**Décision**: Table dédiée `rapport_consultations` avec FK CASCADE.

**Actions tracées**:
- `view`: Affichage rapport UI
- `download`: Téléchargement fichier
- `regenerate`: Regénération nouvelle version

**Justification**:
- Audit trail SQL queryable (ex: "qui a consulté rapport X ?")
- Conformité réglementaire (traçabilité accès données sensibles)
- Performance: table séparée (pas logs massifs)

**Impacts**:
- ✅ Conformité réglementaire
- ✅ Queries audit trail rapides (indexes)
- ⚠️ Volumétrie: ~5000 consultations/an = 1 MB/an (négligeable)

---

### D5-13: Génération asynchrone (job queue, pas synchrone)

**Contexte**: Génération PDF 10 pages = 5s, bloque requête HTTP si synchrone.

**Alternatives considérées**:
1. ✅ **Asynchrone** (job queue, webhook UI)
   - Avantages: UI non bloquée, scalabilité
   - Inconvénients: Complexité architecture (queue)
2. ❌ Synchrone (attente 5s)
   - Avantages: Simple
   - Inconvénients: Timeout HTTP, expérience dégradée

**Décision**: Génération asynchrone avec polling UI ou webhook.

**Architecture**:
1. Utilisateur clic "Générer"
2. INSERT `rapports_generes` (statut: generation_en_cours)
3. Job queue (ex: Bull, Supabase Edge Functions)
4. Génération backend (5s)
5. UPDATE statut → disponible
6. UI poll toutes 2s OU webhook Supabase Realtime

**Justification**:
- Expérience utilisateur: UI non bloquée
- Scalabilité: générations parallèles possibles
- Timeout: pas limite HTTP 30s

**Impacts**:
- ✅ UX améliorée (toast "Génération en cours...")
- ⚠️ Complexité: job queue nécessaire
- ✅ Scalabilité: 10 générations simultanées OK

---

### D5-14: RLS policies 13 nouvelles (isolation rapports/auditeurs)

**Contexte**: Auditeurs doivent voir uniquement rapports audits assignés.

**Alternatives considérées**:
1. ✅ **RLS policies strictes** (13 policies, isolation DB-side)
2. ❌ Filtrage applicatif uniquement → risque fuite données (bug code)

**Décision**: 13 policies RLS (4 templates + 5 rapports_generes + 4 consultations).

**Justification**:
- Sécurité DB-side = défense profonde (même si bug applicatif)
- Isolation auditeurs garantie (SELECT filtre automatiquement)
- Compliance: audit trail sécurisé RLS

**Impacts**:
- ✅ Sécurité maximale
- ✅ Isolation automatique (pas code applicatif fragile)
- ⚠️ Performance: RLS ajoute ~5-10ms requêtes (acceptable)

---

### D5-15: Exports stockés Storage (pas génération à la volée)

**Contexte**: Export Excel 5000 NC = 3s génération, regénérer à chaque consultation = gaspillage.

**Alternatives considérées**:
1. ✅ **Stocker exports Storage** (téléchargement instantané)
2. ❌ Générer à la volée → 3s attente, charge serveur inutile
3. ❌ Cache Redis → complexité, expiration cache problématique

**Décision**: Exports stockés Storage, entrée `rapports_generes` (type: export_nc).

**Justification**:
- Performance: téléchargement instantané après 1ère génération
- Scalabilité: pas regénération répétée
- Traçabilité: historique exports conservé

**Impacts**:
- ✅ Performance: téléchargement <1s
- ⚠️ Stockage: +200 KB/export (~150 exports/an = 30 MB/an)
- ✅ Traçabilité: historique exports queryable

---

## 📊 TABLEAU SYNTHÈSE DÉCISIONS

| ID | Décision | Catégorie | Impact |
|----|----------|-----------|--------|
| D5-01 | 3 types rapports (audit, NC, conformité) | Métier | ✅ Simplicité |
| D5-02 | Versionning rapports (v1, v2...) | Métier | ✅ Audit trail |
| D5-03 | Archivage automatique 7 ans | Métier | ✅ Conformité |
| D5-04 | PDF server-side (@react-pdf/renderer) | Technique | ✅ Qualité |
| D5-05 | Excel via exceljs (pas CSV) | Technique | ✅ UX managers |
| D5-06 | Markdown archivage texte pur | Technique | ✅ Pérennité |
| D5-07 | Supabase Storage (bucket reports) | Architecture | ✅ Performance |
| D5-08 | Codes RAPyyyymm-NNNN | Technique | ✅ Lisibilité |
| D5-09 | Limite exports 10k lignes | Métier | ✅ Performance |
| D5-10 | Fonction SECURITY DEFINER | Technique | ✅ Performance |
| D5-11 | Templates versionés JSON | Architecture | ✅ Flexibilité |
| D5-12 | Historique consultations (table) | Architecture | ✅ Conformité |
| D5-13 | Génération asynchrone (queue) | Architecture | ✅ Scalabilité |
| D5-14 | 13 policies RLS (isolation stricte) | Sécurité | ✅ Sécurité |
| D5-15 | Exports stockés (pas à la volée) | Architecture | ✅ Performance |

---

## ✅ CHECKLIST VALIDATION

- [ ] 15 décisions documentées (3 métier + 7 techniques + 5 architecture)
- [ ] Alternatives considérées pour chaque décision
- [ ] Justifications claires (métier + technique)
- [ ] Impacts identifiés (avantages + inconvénients)
- [ ] Cohérence avec Étapes 01-04 (décisions héritées)
- [ ] Bibliothèques choisies justifiées (@react-pdf/renderer, exceljs)
- [ ] Performance optimisée (asynchrone, Storage, indexes)
- [ ] Sécurité garantie (RLS, SECURITY DEFINER sécurisé)
- [ ] Conformité réglementaire (archivage 7 ans, traçabilité)

---

**Document prêt pour validation migration SQL finale.**
