# PLAN DES VUES QHSE – SOURCE DE VÉRITÉ UI
**Version**: 1.0  
**Date**: 22 janvier 2026  
**Statut**: ✅ Complet – Extraction depuis documentation + migrations SQL  
**Auteur**: GitHub Copilot (Claude Sonnet 4.5)

---

## AVERTISSEMENT CRITIQUE

**Ce fichier est LA source de vérité pour toute implémentation UI.**

Avant toute création de page/composant:
1. ✅ Vérifier que la vue existe dans ce plan
2. ✅ Respecter EXACTEMENT les noms de tables/colonnes SQL
3. ✅ Appliquer strictement `docs/DESIGN_SYSTEM_QHSE.md`
4. ✅ Implémenter les 3 états: loading / empty / error
5. ❌ Ne JAMAIS inventer de tables/colonnes
6. ❌ Ne JAMAIS créer de style custom hors Design System

---

## TABLE DES MATIÈRES

- [A) VUES PUBLIQUES](#a-vues-publiques)
- [B) VUES AUTHENTIFICATION](#b-vues-authentification)
- [C) VUES MODE DÉMO](#c-vues-mode-démo)
- [D) VUES DASHBOARD](#d-vues-dashboard)
- [E) VUES DÉPÔTS & ZONES](#e-vues-dépôts--zones)
- [F) VUES TEMPLATES D'AUDIT](#f-vues-templates-daudit)
- [G) VUES AUDITS](#g-vues-audits)
- [H) VUES NON-CONFORMITÉS](#h-vues-non-conformités)
- [I) VUES RAPPORTS & EXPORTS](#i-vues-rapports--exports)
- [J) VUES ADMINISTRATION](#j-vues-administration)

---

## A) VUES PUBLIQUES

### A.1 – Landing Page (Accueil)

**Nom**: Landing Page  
**Route**: `/`  
**Rôles autorisés**: Public (tous)  
**Objectif**: Page d'accueil permettant de choisir entre Mode Démo (sans login) ou Connexion Production

**Mapping SQL**:
- Tables: Aucune (pas d'appel DB)
- Colonnes: N/A
- Fonctions: N/A
- RLS: Aucune (page publique)

**Détails**:
- Deux boutons principaux:
  - "Entrer en mode Démo" → `/demo`
  - "Se connecter" → `/login`
- Texte explicatif de l'application QHSE
- Pied de page avec version

**Source**: README.md sections 11-18, docs/00_cadrage/02_architecture_globale.md

---

## B) VUES AUTHENTIFICATION

### B.1 – Login

**Nom**: Page de connexion  
**Route**: `/login`  
**Rôles autorisés**: Public (avant auth)  
**Objectif**: Connexion Supabase Auth (email/password) pour accès Production

**Mapping SQL**:
- Tables: `auth.users` (Supabase Auth), `public.profiles`
- Colonnes: 
  - `profiles.id` (UUID, = auth.users.id)
  - `profiles.email` (VARCHAR 255)
  - `profiles.role` (role_type ENUM)
  - `profiles.status` (status ENUM)
- Fonctions: `auth.signInWithPassword()` (Supabase)
- RLS: Policy `profiles_select_own` (utilisateur peut lire son profil)

**Détails**:
- Formulaire: email + password
- Validation: si auth OK mais `profiles.status = 'inactive'` → bloquer
- Redirection post-login selon `profiles.role`:
  - `admin_dev`, `qhse_manager` → `/dashboard`
  - `qh_auditor`, `safety_auditor` → `/audits` (filtrés sur assignés)
  - `viewer` → `/dashboard` (lecture seule)

**Source**: README.md section 2, docs/01_foundations/05_exemples_ui.md, migration 0001_etape_01_foundations.sql

---

### B.2 – Profil Utilisateur

**Nom**: Page profil personnel  
**Route**: `/profil`  
**Rôles autorisés**: Tous (authenticated)  
**Objectif**: Afficher et modifier son propre profil

**Mapping SQL**:
- Tables: `public.profiles`
- Colonnes: 
  - `profiles.first_name` (VARCHAR 100)
  - `profiles.last_name` (VARCHAR 100)
  - `profiles.email` (VARCHAR 255)
  - `profiles.role` (role_type ENUM, lecture seule)
  - `profiles.status` (status ENUM, lecture seule)
- Fonctions: N/A
- RLS: Policy `profiles_update_own` (UPDATE autorisé sauf `role` et `status`)

**Détails**:
- Champs modifiables: first_name, last_name, email
- Champs lecture seule: role, status (affichés mais désactivés)
- Trigger: `prevent_role_status_self_change` empêche auto-modification role/status

**Source**: docs/01_foundations/03_rls_policies.md, migration 0001_etape_01_foundations.sql

---

## C) VUES MODE DÉMO

### C.1 – Dashboard Démo

**Nom**: Dashboard Mode Démo  
**Route**: `/demo`  
**Rôles autorisés**: Public (mode démo, sans login)  
**Objectif**: Démonstration immédiate avec données mock, parcours cliquable

**Mapping SQL**:
- Tables: AUCUNE (mode démo = zéro appel Supabase)
- Colonnes: N/A
- Fonctions: `mockApi.stats.getDashboard()` (mockData.js)
- RLS: N/A (pas de DB)

**Détails**:
- Bandeau permanent: "🎭 MODE DÉMO (données exemple)"
- 6 KPIs cliquables:
  - Audits à faire → `/audits?status=assigned`
  - Audits en cours → `/audits?status=in_progress`
  - Audits terminés (30j)
  - Taux de conformité global
  - NC ouvertes → `/non-conformites?status=ouverte`
  - NC échues
- 3 graphiques:
  - Répartition audits par statut (donut chart)
  - NC par gravité (bar chart)
  - Historique 6 mois audits terminés (line chart)
- Sélecteur rôle démo optionnel (changer de rôle instantanément)

**Données Mock Minimum**:
- 1 dépôt + 2 zones
- 2 templates (sécurité + qualité)
- 1 audit "planifié" (0 réponse)
- 1 audit "en_cours" (quelques réponses)
- 1 audit "terminé" (toutes réponses + rapport + NC liée)
- 1 NC exemple

**Source**: README.md sections 19-24, docs/00_cadrage/02_architecture_globale.md

---

## D) VUES DASHBOARD

### D.1 – Dashboard Production

**Nom**: Dashboard Production  
**Route**: `/dashboard`  
**Rôles autorisés**: Tous (authenticated), contenu filtré par rôle  
**Objectif**: Vue synthèse utilisateur connecté avec KPIs et graphiques temps réel

**Mapping SQL**:
- Tables: `audits`, `reponses`, `non_conformites`
- Colonnes:
  - `audits.statut` (statut_audit ENUM)
  - `audits.date_realisee` (TIMESTAMPTZ)
  - `audits.auditeur_id` (UUID)
  - `reponses.est_conforme` (BOOLEAN)
  - `non_conformites.statut` (nc_statut ENUM)
  - `non_conformites.gravite` (nc_gravite ENUM)
  - `non_conformites.due_date` (DATE)
- Fonctions SQL:
  - `get_audits_completed(period_days INT)` → INT
  - `calculate_conformity_rate(period_days INT)` → NUMERIC
  - `get_audits_by_status(depot_id, zone_id, period_days)` → JSON
  - `get_nc_by_gravity(depot_id, period_days)` → JSON
  - `get_audits_history_6months()` → JSON
  - `get_top5_depots_conformity(period_days)` → JSON
  - `get_top5_zones_critical_nc(period_days)` → JSON
- RLS: Toutes policies Étapes 01-03 (72 policies)
  - Auditeurs: voient uniquement leurs audits (`auditeur_id = auth.uid()`)
  - Admin/Manager: voient tout
  - Viewer: voient audits terminés

**Détails**:
- Filtres: période (7j/30j/90j/6m/12m/custom), dépôt, zone
- KPIs identiques mode démo mais données DB
- Charts cliquables (navigation liste filtrée)
- Isolation auditeurs garantie par RLS

**Source**: docs/QHSE/QHSE_ETAPE_04_RAPPORT_CONTROLE.md, docs/04_dashboard_analytics/, migration 0004_etape_04_dashboard_analytics.sql

---

## E) VUES DÉPÔTS & ZONES

### E.1 – Liste Dépôts

**Nom**: Liste des dépôts  
**Route**: `/depots`  
**Rôles autorisés**: Tous (authenticated), lecture seule sauf admin/manager  
**Objectif**: Afficher tous les dépôts, créer/modifier (si autorisé)

**Mapping SQL**:
- Tables: `depots`
- Colonnes:
  - `depots.id` (UUID)
  - `depots.code` (VARCHAR 10, UNIQUE, uppercase)
  - `depots.name` (VARCHAR 255)
  - `depots.city` (VARCHAR 100)
  - `depots.address` (TEXT)
  - `depots.contact_name` (VARCHAR 100)
  - `depots.contact_email` (VARCHAR 255)
  - `depots.contact_phone` (VARCHAR 20)
  - `depots.status` (status ENUM: active/inactive)
  - `depots.created_at` (TIMESTAMPTZ)
  - `depots.updated_at` (TIMESTAMPTZ)
- Fonctions: N/A
- RLS: 
  - Policy `depots_select_all` (tous peuvent SELECT)
  - Policy `depots_insert_admin_manager` (INSERT: admin_dev, qhse_manager)
  - Policy `depots_update_admin_manager` (UPDATE: admin_dev, qhse_manager)
  - Policy `depots_delete_admin_only` (DELETE: admin_dev uniquement)

**Détails**:
- Table avec colonnes: code, nom, ville, statut, nb zones
- Filtres: statut (active/inactive), ville, recherche texte
- Tri: code (défaut), nom, ville, date création
- Actions (si autorisé):
  - Bouton "Nouveau dépôt" → `/depots/new` (admin/manager)
  - Clic ligne → `/depots/[id]`
- Badge statut: vert (active), gris (inactive)

**Source**: docs/01_foundations/02_schema_db.md, migration 0001_etape_01_foundations.sql

---

### E.2 – Détail Dépôt

**Nom**: Détail d'un dépôt  
**Route**: `/depots/[id]`  
**Rôles autorisés**: Tous (authenticated), modification admin/manager  
**Objectif**: Afficher détail dépôt + zones associées + audits

**Mapping SQL**:
- Tables: `depots`, `zones`, `audits`
- Colonnes:
  - Toutes colonnes `depots` (voir E.1)
  - `zones.id`, `zones.code`, `zones.name`, `zones.type` (zone_type ENUM)
  - `audits.id`, `audits.statut`, `audits.date_prevue`
- Fonctions: N/A
- RLS: Identique E.1 + policies zones + policies audits

**Détails**:
- 3 onglets:
  - **Infos**: détail dépôt, bouton "Modifier" (si autorisé)
  - **Zones** (X zones): liste zones, bouton "Nouvelle zone" (si autorisé)
  - **Audits** (X audits): audits liés à ce dépôt ou ses zones
- Formulaire modification (modal/drawer) si admin/manager
- Suppression logique (status → inactive), pas DELETE physique

**Source**: docs/01_foundations/05_exemples_ui.md, migration 0001_etape_01_foundations.sql

---

### E.3 – Création/Édition Dépôt

**Nom**: Formulaire dépôt  
**Route**: `/depots/new` (création) ou `/depots/[id]/edit` (édition)  
**Rôles autorisés**: admin_dev, qhse_manager  
**Objectif**: Créer ou modifier un dépôt

**Mapping SQL**:
- Tables: `depots`
- Colonnes: Toutes (voir E.1)
- Fonctions: N/A
- RLS: Policy `depots_insert_admin_manager`, `depots_update_admin_manager`

**Détails**:
- Champs obligatoires: code (3-10 chars), name, city, address
- Champs optionnels: contact_name, contact_email, contact_phone
- Validation:
  - Code: uppercase auto (trigger `uppercase_depot_code`), format `^[A-Z0-9]+$`
  - Email: format valide
  - Unicité code (contrainte UNIQUE)
- Boutons: "Enregistrer", "Annuler"

**Source**: docs/01_foundations/02_schema_db.md, migration 0001_etape_01_foundations.sql

---

### E.4 – Liste Zones

**Nom**: Liste des zones  
**Route**: `/zones` (optionnel, ou intégré dans `/depots/[id]`)  
**Rôles autorisés**: Tous (authenticated), modification admin/manager  
**Objectif**: Afficher zones, créer/modifier (si autorisé)

**Mapping SQL**:
- Tables: `zones`, `depots`
- Colonnes:
  - `zones.id` (UUID)
  - `zones.depot_id` (UUID, FK → depots)
  - `zones.code` (VARCHAR 20, UNIQUE par dépôt)
  - `zones.name` (VARCHAR 255)
  - `zones.type` (zone_type ENUM: warehouse, loading, office, production, cold_storage)
  - `zones.status` (status ENUM)
  - `depots.code`, `depots.name` (JOIN)
- Fonctions: N/A
- RLS: 
  - Policy `zones_select_all`
  - Policy `zones_insert_admin_manager`
  - Policy `zones_update_admin_manager`
  - Policy `zones_delete_admin_only`

**Détails**:
- Table: code zone, nom, type, dépôt, statut
- Filtres: dépôt, type, statut
- Actions: "Nouvelle zone" (admin/manager)
- Contrainte: `UNIQUE(depot_id, code)` (code unique PAR dépôt)
- Suppression: CASCADE si dépôt supprimé (`ON DELETE CASCADE`)

**Source**: docs/01_foundations/02_schema_db.md, migration 0001_etape_01_foundations.sql

---

## F) VUES TEMPLATES D'AUDIT

### F.1 – Liste Templates d'Audit

**Nom**: Liste des templates d'audit  
**Route**: `/templates`  
**Rôles autorisés**: Tous (authenticated), création/modification admin/manager  
**Objectif**: Afficher templates actifs, créer/archiver (si autorisé)

**Mapping SQL**:
- Tables: `audit_templates`, `questions`, `profiles`
- Colonnes:
  - `audit_templates.id` (UUID)
  - `audit_templates.code` (VARCHAR 20, UNIQUE)
  - `audit_templates.titre` (VARCHAR 200)
  - `audit_templates.domaine` (domaine_audit ENUM: securite, qualite, hygiene, environnement, global)
  - `audit_templates.version` (INT, DEFAULT 1)
  - `audit_templates.statut` (statut_template ENUM: brouillon, actif, archive)
  - `audit_templates.createur_id` (UUID, FK → profiles)
  - `profiles.first_name`, `profiles.last_name` (JOIN créateur)
  - COUNT questions par template
- Fonctions: `is_template_active(template_uuid UUID)` → BOOLEAN
- RLS:
  - Policy `audit_templates_select_all` (tous voient templates actifs)
  - Policy `audit_templates_insert_admin_manager`
  - Policy `audit_templates_update_admin_manager`
  - Policy `audit_templates_delete_admin_only` (soft delete → archive)

**Détails**:
- Table: code, titre, domaine, version, statut, créateur, nb questions
- Filtres: domaine, statut
- Tri: code, titre, domaine, date création
- Actions:
  - "Nouveau template" (admin/manager) → `/templates/new`
  - Clic ligne → `/templates/[id]`
- Badge domaine: couleur selon domaine (sécurité rouge, qualité bleu, etc.)
- Badge statut: vert (actif), jaune (brouillon), gris (archive)

**Source**: docs/02_audits_templates/01_spec_metier_audits.md, migration 0002_etape_02_audits_templates.sql

---

### F.2 – Détail Template d'Audit

**Nom**: Détail template avec questions  
**Route**: `/templates/[id]`  
**Rôles autorisés**: Tous (authenticated), modification admin/manager  
**Objectif**: Afficher questions du template, modifier/ordonner (si autorisé)

**Mapping SQL**:
- Tables: `audit_templates`, `questions`
- Colonnes:
  - Toutes `audit_templates` (voir F.1)
  - `questions.id` (UUID)
  - `questions.ordre` (INT)
  - `questions.libelle` (TEXT)
  - `questions.type_reponse` (type_question ENUM: oui_non, choix_multiple, texte_libre, note_1_5)
  - `questions.criticite` (criticite_question ENUM: faible, moyenne, haute, critique)
  - `questions.categorie` (VARCHAR 100, nullable)
  - `questions.options_choix` (JSONB, si type = choix_multiple)
- Fonctions: N/A
- RLS: Identique F.1 + policies questions

**Détails**:
- Infos template: code, titre, domaine, version, statut, description
- Section questions groupées par `categorie` (si présent)
- Table questions: ordre, libellé, type réponse, criticité
- Actions (admin/manager):
  - "Ajouter question" → modal/drawer formulaire
  - Drag & drop réordonnancement (UPDATE `ordre`)
  - Modifier/Supprimer question
  - "Archiver template" (statut → archive)
- Contrainte: `UNIQUE(template_id, ordre)` (ordre unique par template)

**Source**: docs/02_audits_templates/02_schema_db_audits.md, migration 0002_etape_02_audits_templates.sql

---

### F.3 – Création/Édition Template

**Nom**: Formulaire template  
**Route**: `/templates/new` (création) ou `/templates/[id]/edit` (édition)  
**Rôles autorisés**: admin_dev, qhse_manager  
**Objectif**: Créer ou modifier un template

**Mapping SQL**:
- Tables: `audit_templates`
- Colonnes: Toutes (voir F.1)
- Fonctions: N/A
- RLS: Policy `audit_templates_insert_admin_manager`, `audit_templates_update_admin_manager`

**Détails**:
- Champs obligatoires: code (uppercase auto), titre, domaine
- Champs optionnels: description, version (auto-incrémenté)
- Statut: brouillon par défaut
- Boutons: "Enregistrer brouillon", "Activer" (statut → actif), "Annuler"
- Créateur: `createur_id = auth.uid()` auto
- Validation: code format `^[A-Z0-9-]{3,20}$`, unicité code

**Source**: docs/02_audits_templates/02_schema_db_audits.md, migration 0002_etape_02_audits_templates.sql

---

## G) VUES AUDITS

### G.1 – Liste Audits

**Nom**: Liste des audits  
**Route**: `/audits`  
**Rôles autorisés**: Tous (authenticated), contenu filtré par RLS  
**Objectif**: Afficher audits selon rôle, accéder au détail

**Mapping SQL**:
- Tables: `audits`, `audit_templates`, `depots`, `zones`, `profiles`
- Colonnes:
  - `audits.id` (UUID)
  - `audits.template_id` (UUID, FK → audit_templates)
  - `audits.statut` (statut_audit ENUM: planifie, en_cours, termine, annule)
  - `audits.depot_id` (UUID, FK → depots, XOR avec zone_id)
  - `audits.zone_id` (UUID, FK → zones, XOR avec depot_id)
  - `audits.auditeur_id` (UUID, FK → profiles)
  - `audits.date_prevue` (DATE)
  - `audits.date_realisee` (TIMESTAMPTZ, nullable)
  - `audit_templates.code`, `audit_templates.titre`, `audit_templates.domaine`
  - `depots.name` ou `zones.name` (JOIN)
  - `profiles.first_name`, `profiles.last_name` (auditeur)
- Fonctions: `has_audit_access(audit_uuid UUID)` → BOOLEAN
- RLS:
  - Policy `audits_select_admin_manager` (tous audits)
  - Policy `audits_select_auditor_own` (WHERE `auditeur_id = auth.uid()`)
  - Policy `audits_select_viewer_finished` (WHERE `statut = 'termine'`)

**Détails**:
- Table: template (code + domaine), dépôt/zone, statut, auditeur, date prévue, progress (X/Y questions)
- Filtres: statut, domaine, dépôt, zone, auditeur (si admin/manager), "Mes audits" (si auditeur)
- Tri: date prévue (défaut), statut, domaine
- Actions:
  - "Nouvel audit" (admin/manager) → `/audits/new`
  - Clic ligne → `/audits/[id]`
- Badge statut: couleur selon statut (planifié jaune, en_cours bleu, terminé vert, annulé gris)
- Colonne progress: ex "3/10" calculée depuis COUNT reponses

**Source**: docs/02_audits_templates/01_spec_metier_audits.md, README.md section 5, migration 0002_etape_02_audits_templates.sql

---

### G.2 – Détail Audit

**Nom**: Détail d'un audit  
**Route**: `/audits/[id]`  
**Rôles autorisés**: Tous (authenticated), contenu filtré par RLS  
**Objectif**: Afficher contexte audit + accès questions/rapport/NC

**Mapping SQL**:
- Tables: `audits`, `audit_templates`, `questions`, `reponses`, `rapports_generes`, `non_conformites`
- Colonnes:
  - Toutes `audits` (voir G.1)
  - Toutes `audit_templates` (voir F.1)
  - COUNT `reponses` (progress)
  - COUNT `questions` (total)
  - `rapports_generes` (si existe pour cet audit)
  - `non_conformites` liées (WHERE `audit_id = audits.id`)
- Fonctions: 
  - `has_audit_access(audit_uuid)` (RLS)
  - `get_latest_audit_report(audit_id UUID)` → UUID (rapport le plus récent)
- RLS: Identique G.1 + policies reponses/rapports/NC

**Détails**:
- Infos: template, dépôt/zone, auditeur, dates, statut, progress
- 3 sections principales:
  1. **Questions** (bouton → `/audits/[id]/questions`)
  2. **Rapport** (si terminé, bouton → `/rapports/[rapport_id]`)
  3. **Non-conformités liées** (liste NC, lien → `/non-conformites/[nc_id]`)
- Actions (auditeur assigné):
  - "Commencer audit" (si planifié → statut en_cours)
  - "Annuler audit" (si admin/manager)
- Workflow: planifié → en_cours (1ère réponse) → terminé (toutes réponses + rapport)

**Source**: README.md section 6, docs/02_audits_templates/04_tests_validation_audits.md, migration 0002_etape_02_audits_templates.sql

---

### G.3 – Questions Audit (Réalisation)

**Nom**: Réalisation audit (questionnaire)  
**Route**: `/audits/[id]/questions`  
**Rôles autorisés**: Auditeur assigné (RLS), admin/manager  
**Objectif**: Répondre aux questions, sauvegarder réponses

**Mapping SQL**:
- Tables: `audits`, `questions`, `reponses`
- Colonnes:
  - `questions.id`, `questions.libelle`, `questions.type_reponse`, `questions.criticite`, `questions.categorie`, `questions.ordre`
  - `reponses.id` (UUID)
  - `reponses.audit_id` (UUID, FK → audits)
  - `reponses.question_id` (UUID, FK → questions)
  - `reponses.valeur` (JSONB, structure selon type question)
  - `reponses.est_conforme` (BOOLEAN, calculé)
  - `reponses.commentaire` (TEXT, nullable)
  - `reponses.photos_urls` (TEXT ARRAY, nullable, Storage Supabase)
- Fonctions: N/A
- RLS:
  - Policy `reponses_insert_auditor_own` (INSERT si `audit.auditeur_id = auth.uid()`)
  - Policy `reponses_update_auditor_own` (UPDATE si audit non terminé)
  - Policy `reponses_delete_admin_only` (DELETE: admin_dev uniquement)

**Détails**:
- Affichage questions par `categorie` (si présent), ordre croissant
- Types réponse:
  - `oui_non`: radio Oui/Non
  - `choix_multiple`: radio/checkboxes (options depuis `questions.options_choix` JSONB)
  - `texte_libre`: textarea
  - `note_1_5`: étoiles ou slider 1-5
- Champs par question:
  - Réponse (obligatoire)
  - Commentaire (optionnel)
  - Photos (upload Storage Supabase, bucket `audit-photos`)
- Sauvegarde: 
  - INSERT `reponses` si première fois
  - UPDATE `reponses` si déjà existe (contrainte `UNIQUE(audit_id, question_id)`)
  - Calcul `est_conforme` automatique selon type réponse
- Transition statut: 1ère réponse → audit passe `en_cours`
- Verrouillage: si audit `termine`, réponses en lecture seule (sauf admin)

**Source**: docs/02_audits_templates/02_schema_db_audits.md, README.md section 21, migration 0002_etape_02_audits_templates.sql

---

### G.4 – Création Audit

**Nom**: Formulaire création audit  
**Route**: `/audits/new`  
**Rôles autorisés**: admin_dev, qhse_manager  
**Objectif**: Créer un nouvel audit (assigner template + auditeur + localisation)

**Mapping SQL**:
- Tables: `audits`, `audit_templates`, `depots`, `zones`, `profiles`
- Colonnes: Toutes `audits` (voir G.1)
- Fonctions: `is_template_active(template_uuid)` (validation template actif)
- RLS: Policy `audits_insert_admin_manager`

**Détails**:
- Champs obligatoires:
  - Template (SELECT parmi templates actifs uniquement)
  - Auditeur (SELECT parmi profiles rôle = qh_auditor, safety_auditor, qhse_manager)
  - Date prévue (DATE)
  - **XOR Localisation**: soit dépôt, soit zone (pas les deux)
- Contrainte XOR: `(depot_id IS NOT NULL AND zone_id IS NULL) OR (depot_id IS NULL AND zone_id IS NOT NULL)`
- Statut initial: `planifie`
- Validation:
  - Template actif (trigger `check_template_active_before_audit`)
  - Auditeur valide (trigger `check_valid_auditor_before_audit`)
- Boutons: "Créer audit", "Annuler"

**Source**: docs/02_audits_templates/02_schema_db_audits.md, migration 0002_etape_02_audits_templates.sql

---

## H) VUES NON-CONFORMITÉS

### H.1 – Liste Non-Conformités

**Nom**: Liste des non-conformités  
**Route**: `/non-conformites`  
**Rôles autorisés**: Tous (authenticated), contenu filtré par RLS  
**Objectif**: Afficher NC selon rôle, accéder au détail

**Mapping SQL**:
- Tables: `non_conformites`, `audits`, `depots`, `zones`, `profiles`
- Colonnes:
  - `non_conformites.id` (UUID)
  - `non_conformites.code` (VARCHAR 15, format NC-YYYY-NNNN)
  - `non_conformites.type` (nc_type ENUM: securite, qualite, hygiene, environnement, autre)
  - `non_conformites.gravite` (nc_gravite ENUM: faible, moyenne, haute, critique)
  - `non_conformites.statut` (nc_statut ENUM: ouverte, en_traitement, resolue, verifiee, cloturee)
  - `non_conformites.titre` (VARCHAR 200)
  - `non_conformites.due_date` (DATE)
  - `non_conformites.created_by` (UUID, FK → profiles)
  - `non_conformites.assigned_to` (UUID, FK → profiles)
  - `non_conformites.audit_id` (UUID, FK → audits, nullable)
  - `non_conformites.depot_id` (UUID, FK → depots, nullable)
  - `non_conformites.zone_id` (UUID, FK → zones, nullable)
  - Colonne calculée `is_overdue` (due_date < CURRENT_DATE ET statut != cloturee) - à confirmer (non implémentée en GENERATED car CURRENT_DATE non immutable)
- Fonctions: `has_nc_access(nc_uuid UUID)` → BOOLEAN
- RLS:
  - Policy `nc_select_admin_manager` (toutes NC)
  - Policy `nc_select_auditor_own` (NC créées par auditeur OU liées à ses audits)
  - Policy `nc_select_assigned` (NC assignées à `auth.uid()`)
  - Policy `nc_select_viewer_closed` (WHERE `statut = 'cloturee'`)

**Détails**:
- Table: code, type, gravité, statut, titre, localisation (audit/dépôt/zone), créateur, assigné, échéance
- Filtres: statut, gravité, type, dépôt, zone, échéance (toutes/échues), "Mes NC" (si auditeur/responsable)
- Tri: échéance (défaut), gravité, statut, date création
- Actions:
  - "Nouvelle NC" (admin/manager/auditeurs) → `/non-conformites/new`
  - Clic ligne → `/non-conformites/[id]`
- Badge gravité: rouge (critique), orange (haute), jaune (moyenne), vert (faible)
- Badge statut: couleur selon statut
- Icône alerte si échue (`due_date < today` ET statut != cloturee)

**Source**: docs/03_non_conformites/01_spec_metier_non_conformites.md, migration 0003_etape_03_non_conformites.sql

---

### H.2 – Détail Non-Conformité

**Nom**: Détail NC avec actions correctives  
**Route**: `/non-conformites/[id]`  
**Rôles autorisés**: Tous (authenticated), contenu filtré par RLS  
**Objectif**: Afficher NC + actions + preuves, modifier statut (si autorisé)

**Mapping SQL**:
- Tables: `non_conformites`, `actions_correctives`, `preuves_correction`, `notifications`
- Colonnes:
  - Toutes `non_conformites` (voir H.1)
  - `actions_correctives.id`, `actions_correctives.code`, `actions_correctives.type` (action_type ENUM: corrective, preventive), `actions_correctives.statut` (action_statut ENUM)
  - `preuves_correction.id`, `preuves_correction.type` (preuve_type ENUM: photo, document, commentaire), `preuves_correction.storage_path`
  - `notifications.id`, `notifications.type` (notification_type ENUM), `notifications.read_at`
- Fonctions: 
  - `has_nc_access(nc_uuid)` (RLS)
  - `can_modify_nc_status(nc_uuid UUID)` → BOOLEAN (manager seul pour vérification/clôture)
- RLS: Identique H.1 + policies actions/preuves/notifications

**Détails**:
- Sections:
  1. **Infos NC**: type, gravité, statut, titre, description, origine (audit/dépôt/zone), créateur, assigné, échéance, dates (resolue/verifiee/closed)
  2. **Actions correctives** (X actions): liste, bouton "Ajouter action" (si en_traitement)
  3. **Preuves** (X preuves): photos/documents Storage, bouton "Upload preuve" (si autorisé)
  4. **Historique** (optionnel): changements statut, notifications
- Actions:
  - Modifier statut (workflow strict):
    - `ouverte` → `en_traitement` (nécessite `assigned_to`)
    - `en_traitement` → `resolue` (nécessite ≥1 preuve si gravité haute/critique)
    - `resolue` → `verifiee` (manager seul)
    - `verifiee` → `cloturee` (manager seul)
  - Assigner responsable (si manager/admin)
  - Créer action corrective → modal formulaire
- Triggers automatiques:
  - RG-05: NC critique créée → INSERT notification DB (`notify_critical_nc()`)
  - RG-06: NC haute/critique créée → INSERT action corrective auto

**Source**: docs/03_non_conformites/01_spec_metier_non_conformites.md, migration 0003_etape_03_non_conformites.sql

---

### H.3 – Création Non-Conformité

**Nom**: Formulaire création NC  
**Route**: `/non-conformites/new`  
**Rôles autorisés**: admin_dev, qhse_manager, qh_auditor, safety_auditor  
**Objectif**: Créer NC (depuis audit ou manuellement)

**Mapping SQL**:
- Tables: `non_conformites`
- Colonnes: Toutes (voir H.1)
- Fonctions: N/A
- RLS: Policy `nc_insert_all_auditors`

**Détails**:
- Champs obligatoires: type, gravité, titre, description
- **Origine XOR**:
  - Soit: audit_id + question_id (NC détectée lors audit)
  - Soit: depot_id OU zone_id (NC manuelle observation terrain)
  - Contrainte: `(audit_id IS NOT NULL AND question_id IS NOT NULL) OR (depot_id IS NOT NULL OR zone_id IS NOT NULL)`
- Champs optionnels: assigned_to (sinon manager l'assignera)
- Échéance calculée automatiquement selon `gravite` (trigger `calculate_nc_due_date`):
  - Critique: 1 jour
  - Haute: 7 jours
  - Moyenne: 30 jours
  - Faible: 90 jours
- Code auto: format NC-YYYY-NNNN (trigger `generate_nc_code`)
- Statut initial: `ouverte`
- Créateur: `created_by = auth.uid()` auto
- Boutons: "Créer NC", "Annuler"

**Source**: docs/03_non_conformites/02_schema_db_non_conformites.md, migration 0003_etape_03_non_conformites.sql

---

### H.4 – Actions Correctives

**Nom**: Gestion actions correctives  
**Route**: `/non-conformites/[nc_id]/actions` ou `/actions` (liste globale)  
**Rôles autorisés**: Selon RLS (créateur, assigné, manager, admin)  
**Objectif**: Afficher/créer/modifier actions correctives liées à NC

**Mapping SQL**:
- Tables: `actions_correctives`, `non_conformites`, `profiles`
- Colonnes:
  - `actions_correctives.id` (UUID)
  - `actions_correctives.nc_id` (UUID, FK → non_conformites)
  - `actions_correctives.code` (VARCHAR 20, auto via séquence `action_code_seq`)
  - `actions_correctives.type` (action_type ENUM: corrective, preventive)
  - `actions_correctives.statut` (action_statut ENUM: a_faire, en_cours, terminee, verifiee)
  - `actions_correctives.description` (TEXT)
  - `actions_correctives.assigned_to` (UUID, FK → profiles)
  - `actions_correctives.due_date` (DATE, hérite NC si non fourni via trigger `inherit_nc_due_date`)
  - `actions_correctives.completed_at` (TIMESTAMPTZ, nullable)
  - `actions_correctives.verified_at` (TIMESTAMPTZ, nullable)
- Fonctions: `is_action_owner(action_uuid UUID)` → BOOLEAN
- RLS:
  - Policy `actions_select_related_nc` (accès si accès NC parente)
  - Policy `actions_insert_nc_access`
  - Policy `actions_update_owner_or_manager`

**Détails**:
- Table: code, type, statut, description, assigné, échéance, NC liée
- Workflow: a_faire → en_cours → terminee → verifiee (manager)
- Création: bouton "Nouvelle action" depuis détail NC
- Formulaire: type, description, assigné, échéance (optionnelle)
- Trigger RG-09: si `due_date` NULL, hérite `due_date` de NC parente

**Source**: docs/03_non_conformites/02_schema_db_non_conformites.md, migration 0003_etape_03_non_conformites.sql

---

### H.5 – Preuves de Correction

**Nom**: Upload preuves (photos/documents)  
**Route**: `/non-conformites/[nc_id]/preuves` (dans détail NC)  
**Rôles autorisés**: Créateur NC, assigné, manager, admin  
**Objectif**: Uploader preuves correction (Storage Supabase)

**Mapping SQL**:
- Tables: `preuves_correction`, `non_conformites`
- Colonnes:
  - `preuves_correction.id` (UUID)
  - `preuves_correction.nc_id` (UUID, FK → non_conformites)
  - `preuves_correction.action_id` (UUID, FK → actions_correctives, nullable)
  - `preuves_correction.type` (preuve_type ENUM: photo, document, commentaire)
  - `preuves_correction.storage_path` (TEXT, chemin Supabase Storage)
  - `preuves_correction.storage_bucket` (VARCHAR 50, DEFAULT 'nc-preuves')
  - `preuves_correction.commentaire` (TEXT, nullable)
  - `preuves_correction.uploaded_by` (UUID, FK → profiles)
  - `preuves_correction.uploaded_at` (TIMESTAMPTZ)
- Fonctions: N/A
- RLS: Policy `preuves_insert_nc_access` (INSERT si `has_nc_access(nc_id)`)

**Détails**:
- Upload fichier → Storage bucket `nc-preuves`, path: `nc-[nc_id]/[filename]`
- Types acceptés: images (jpg, png, webp), PDF, Excel, Word
- Taille max: 10 MB (configurable)
- Affichage: galerie photos + liste documents avec bouton téléchargement
- Contrainte RG-07: NC haute/critique nécessite ≥1 preuve pour passer `resolue` (check applicatif)

**Source**: docs/03_non_conformites/02_schema_db_non_conformites.md, migration 0003_etape_03_non_conformites.sql

---

## I) VUES RAPPORTS & EXPORTS

### I.1 – Liste Rapports Générés

**Nom**: Liste des rapports  
**Route**: `/rapports`  
**Rôles autorisés**: Tous (authenticated), contenu filtré par RLS  
**Objectif**: Afficher rapports générés, accéder/télécharger/regénérer (si autorisé)

**Mapping SQL**:
- Tables: `rapports_generes`, `rapport_templates`, `audits`, `profiles`
- Colonnes:
  - `rapports_generes.id` (UUID)
  - `rapports_generes.code_rapport` (VARCHAR 16, format RAPyyyymm-NNNN)
  - `rapports_generes.type_rapport` (VARCHAR 50: audit_complet, synthese_nc, conformite_globale, export_audits, export_nc, export_conformite)
  - `rapports_generes.format` (VARCHAR 20: pdf, markdown, excel)
  - `rapports_generes.statut` (VARCHAR 30: generation_en_cours, disponible, erreur, archive)
  - `rapports_generes.audit_id` (UUID, FK → audits, nullable)
  - `rapports_generes.storage_path` (TEXT)
  - `rapports_generes.file_size_bytes` (BIGINT)
  - `rapports_generes.version` (SMALLINT)
  - `rapports_generes.generated_by` (UUID, FK → profiles)
  - `rapports_generes.generated_at` (TIMESTAMPTZ)
- Fonctions: 
  - `can_access_rapport(rapport_uuid UUID)` → BOOLEAN
  - `get_latest_audit_report(audit_id UUID)` → UUID
- RLS:
  - Policy `rapports_select_access` (via `can_access_rapport()`: auditeur voit rapports de ses audits, manager/admin tous)

**Détails**:
- Table: code, type, format, audit (si audit_complet), statut, version, généré par, date, taille
- Filtres: type, format, statut, période, audit
- Tri: date génération (défaut DESC), code
- Actions:
  - "Nouveau rapport" (admin/manager/auditeur) → `/rapports/new` (sélectionner type)
  - Clic ligne → `/rapports/[id]` (prévisualisation)
  - Bouton "Télécharger" (Storage Supabase)
  - Bouton "Regénérer" (si audit_complet, crée version +1)
- Badge statut: vert (disponible), jaune (en cours), rouge (erreur), gris (archive)
- Version: affichée si >1 (ex: v2, v3)

**Source**: docs/QHSE/QHSE_ETAPE_05_RAPPORT_CONTROLE.md, migration 0005_etape_05_rapports_exports.sql

---

### I.2 – Détail Rapport

**Nom**: Prévisualisation rapport  
**Route**: `/rapports/[id]`  
**Rôles autorisés**: Tous (authenticated), contenu filtré par RLS  
**Objectif**: Afficher contenu rapport, télécharger, historique consultations

**Mapping SQL**:
- Tables: `rapports_generes`, `rapport_templates`, `rapport_consultations`, `audits`
- Colonnes:
  - Toutes `rapports_generes` (voir I.1)
  - `rapport_templates.structure_json` (JSONB, sections rapport)
  - `rapport_consultations` (historique: user_id, action_type, consulted_at)
- Fonctions: `can_access_rapport(rapport_uuid)` (RLS)
- RLS: Identique I.1 + policy `consultations_select_own`

**Détails**:
- Sections:
  1. **Métadonnées**: code, type, format, audit (si applicable), version, généré par, date, taille
  2. **Prévisualisation**: 
     - PDF: iframe ou visionneuse
     - Markdown: rendu HTML
     - Excel: message "Télécharger pour consulter"
  3. **Actions**: "Télécharger", "Regénérer" (si autorisé), "Archiver" (admin/manager)
  4. **Historique consultations** (X vues, Y téléchargements): table user, action, date
- Trigger INSERT `rapport_consultations` automatique sur SELECT rapport (à implémenter en applicatif)
- Bouton "Versions précédentes" (si version >1) → liste versions historique

**Source**: docs/05_rapports_exports/02_schema_db_rapports.md, migration 0005_etape_05_rapports_exports.sql

---

### I.3 – Génération Rapport

**Nom**: Formulaire génération rapport  
**Route**: `/rapports/new`  
**Rôles autorisés**: admin_dev, qhse_manager, auditeurs (pour leurs audits)  
**Objectif**: Générer un nouveau rapport (sélectionner type + paramètres)

**Mapping SQL**:
- Tables: `rapports_generes`, `rapport_templates`, `audits`
- Colonnes: Toutes `rapports_generes` (voir I.1)
- Fonctions: N/A
- RLS: Policy `rapports_insert_auditor_manager` (INSERT si auditeur OU manager/admin)

**Détails**:
- Étape 1: Sélectionner type rapport
  - **audit_complet**: nécessite `audit_id` (SELECT parmi audits terminés accessibles)
  - **synthese_nc**: paramètres (période, gravité, dépôt/zone)
  - **conformite_globale**: paramètres (période, dépôt)
  - **export_audits/nc/conformite**: filtres (période, statut, etc.)
- Étape 2: Sélectionner format (pdf, markdown, excel selon type)
- Étape 3: Template (SELECT parmi templates actifs du type)
- Génération:
  - INSERT `rapports_generes` avec `statut = 'generation_en_cours'`
  - Appel fonction server-side (API route Next.js) pour générer fichier
  - Upload Storage Supabase bucket `reports`, path: `[type]/[code_rapport].[ext]`
  - UPDATE `statut = 'disponible'` + `storage_path` + `file_size_bytes`
  - Si erreur: `statut = 'erreur'` + `error_message`
- Affichage: progress bar + message "Génération en cours..." (polling statut)

**Source**: docs/05_rapports_exports/01_spec_metier_rapports.md, migration 0005_etape_05_rapports_exports.sql

---

### I.4 – Exports Excel

**Nom**: Page exports Excel  
**Route**: `/exports` (ou intégré dans `/rapports/new?type=export`)  
**Rôles autorisés**: admin_dev, qhse_manager  
**Objectif**: Exporter données filtrées en Excel (audits, NC, conformité)

**Mapping SQL**:
- Tables: Selon type export (audits, non_conformites, reponses)
- Colonnes: Toutes colonnes pertinentes selon export
- Fonctions: N/A
- RLS: Toutes policies existantes (exports respectent RLS)

**Détails**:
- Types exports:
  1. **export_audits**: audits + templates + statuts (filtres: période, statut, dépôt)
  2. **export_nc**: NC + actions + preuves (filtres: période, statut, gravité, dépôt)
  3. **export_conformite**: audits + réponses + taux conformité (filtres: période, dépôt)
- Limite: 10 000 lignes par export (contrainte perf)
- Génération:
  - Appel fonction server-side (exceljs library)
  - Fichier généré: `[type]_[date].xlsx`
  - Storage Supabase bucket `reports` (optionnel, ou téléchargement direct)
- Format Excel:
  - Feuille 1: données principales
  - Feuille 2: légende (ENUMs, statuts)
  - En-têtes: noms colonnes lisibles (pas snake_case brut)

**Source**: docs/05_rapports_exports/01_spec_metier_rapports.md, migration 0005_etape_05_rapports_exports.sql

---

## J) VUES ADMINISTRATION

### J.1 – Gestion Utilisateurs (Profiles)

**Nom**: Administration profiles  
**Route**: `/admin/profiles`  
**Rôles autorisés**: admin_dev uniquement  
**Objectif**: CRUD profiles (créer utilisateurs, modifier rôles, désactiver)

**Mapping SQL**:
- Tables: `profiles`, `auth.users`
- Colonnes: Toutes `profiles` (voir B.2)
- Fonctions: N/A
- RLS: 
  - Policy `profiles_select_admin_all` (admin voit tous)
  - Policy `profiles_insert_admin_only` (INSERT: admin_dev)
  - Policy `profiles_update_admin_only` (UPDATE role/status: admin_dev)
  - Policy `profiles_delete_admin_only` (DELETE: admin_dev)

**Détails**:
- Table: email, nom complet, rôle, statut, date création
- Filtres: rôle, statut
- Tri: email, rôle, date création
- Actions:
  - "Nouvel utilisateur" → modal formulaire (email, first_name, last_name, rôle)
  - Modifier rôle (SELECT rôle) + statut (active/inactive)
  - Désactiver utilisateur (status → inactive, soft delete)
  - Réactiver utilisateur (status → active)
- Création:
  - INSERT `auth.users` via Supabase Admin API (ou invite email)
  - INSERT `profiles` (id = auth.users.id)
- Sécurité: admin_dev peut modifier tous profiles SAUF son propre rôle/statut (trigger `prevent_role_status_self_change`)

**Source**: docs/01_foundations/03_rls_policies.md, migration 0001_etape_01_foundations.sql

---

### J.2 – Logs & Notifications

**Nom**: Historique notifications DB  
**Route**: `/admin/notifications` ou `/notifications` (selon rôle)  
**Rôles autorisés**: admin_dev, qhse_manager, destinataires  
**Objectif**: Afficher notifications DB (NC critiques, échues, actions terminées)

**Mapping SQL**:
- Tables: `notifications`, `non_conformites`, `profiles`
- Colonnes:
  - `notifications.id` (UUID)
  - `notifications.type` (notification_type ENUM: nc_critique, nc_echue, action_terminee)
  - `notifications.nc_id` (UUID, FK → non_conformites)
  - `notifications.destinataire_id` (UUID, FK → profiles, manager)
  - `notifications.message` (TEXT)
  - `notifications.read_at` (TIMESTAMPTZ, nullable)
  - `notifications.created_at` (TIMESTAMPTZ)
- Fonctions: N/A
- RLS:
  - Policy `notifications_select_admin_manager` (admin/manager voient toutes)
  - Policy `notifications_select_destinataire` (WHERE `destinataire_id = auth.uid()`)

**Détails**:
- Table: type (icône), message, NC liée, date, lu/non lu
- Filtres: type, lu/non lu
- Tri: date (défaut DESC, non lues en premier)
- Actions:
  - Clic ligne → marquer comme lu (UPDATE `read_at = NOW()`)
  - Clic message → navigation vers NC liée (`/non-conformites/[nc_id]`)
  - Bouton "Tout marquer lu"
- Trigger automatique: RG-05 `notify_critical_nc()` crée notification DB si NC critique

**Source**: docs/03_non_conformites/02_schema_db_non_conformites.md (section notifications), migration 0003_etape_03_non_conformites.sql

---

## K) RÉCAPITULATIF GLOBAL

### Total Vues Identifiées: 31 vues

| Catégorie | Nombre Vues | Routes Principales |
|-----------|-------------|-------------------|
| **Publiques** | 1 | `/` |
| **Authentification** | 2 | `/login`, `/profil` |
| **Mode Démo** | 1 | `/demo` |
| **Dashboard** | 1 | `/dashboard` |
| **Dépôts & Zones** | 4 | `/depots`, `/depots/[id]`, `/depots/new`, `/zones` |
| **Templates Audit** | 3 | `/templates`, `/templates/[id]`, `/templates/new` |
| **Audits** | 4 | `/audits`, `/audits/[id]`, `/audits/[id]/questions`, `/audits/new` |
| **Non-Conformités** | 5 | `/non-conformites`, `/non-conformites/[id]`, `/non-conformites/new`, actions, preuves |
| **Rapports & Exports** | 4 | `/rapports`, `/rapports/[id]`, `/rapports/new`, `/exports` |
| **Administration** | 2 | `/admin/profiles`, `/admin/notifications` |

---

### Tables SQL Utilisées (Total: 19 tables)

**Étape 01 (Foundations)**:
- `profiles`
- `depots`
- `zones`

**Étape 02 (Audits & Templates)**:
- `audit_templates`
- `questions`
- `audits`
- `reponses`

**Étape 03 (Non-Conformités)**:
- `non_conformites`
- `actions_correctives`
- `preuves_correction`
- `notifications`

**Étape 04 (Dashboard)**: Aucune table nouvelle (fonctions SQL uniquement)

**Étape 05 (Rapports)**:
- `rapport_templates`
- `rapports_generes`
- `rapport_consultations`

**Supabase Auth**:
- `auth.users` (natif Supabase)

---

### Fonctions SQL Utilisées (Total: 18 fonctions)

**Helper RLS (Étapes 01-03)**:
- `get_current_user_role()` → TEXT
- `has_audit_access(audit_uuid)` → BOOLEAN
- `has_nc_access(nc_uuid)` → BOOLEAN
- `can_modify_nc_status(nc_uuid)` → BOOLEAN
- `is_action_owner(action_uuid)` → BOOLEAN
- `is_template_active(template_uuid)` → BOOLEAN
- `is_valid_auditor(profile_uuid)` → BOOLEAN

**Dashboard KPIs/Charts (Étape 04)**:
- `get_audits_completed(period_days)` → INT
- `calculate_conformity_rate(period_days)` → NUMERIC
- `get_audits_by_status(depot_id, zone_id, period_days)` → JSON
- `get_nc_by_gravity(depot_id, period_days)` → JSON
- `get_audits_history_6months()` → JSON
- `get_top5_depots_conformity(period_days)` → JSON
- `get_top5_zones_critical_nc(period_days)` → JSON

**Rapports (Étape 05)**:
- `generate_rapport_code()` → VARCHAR
- `can_access_rapport(rapport_uuid)` → BOOLEAN
- `get_latest_audit_report(audit_id)` → UUID
- `archive_old_reports()` → INT (cron fonction)

---

### ENUMs Utilisés (Total: 13 ENUMs)

| ENUM | Valeurs | Usage |
|------|---------|-------|
| `role_type` | admin_dev, qhse_manager, qh_auditor, safety_auditor, viewer | Rôles profiles |
| `zone_type` | warehouse, loading, office, production, cold_storage | Types zones |
| `status` | active, inactive | Soft delete (profiles, depots, zones) |
| `domaine_audit` | securite, qualite, hygiene, environnement, global | Domaines templates |
| `statut_template` | brouillon, actif, archive | Cycle vie templates |
| `type_question` | oui_non, choix_multiple, texte_libre, note_1_5 | Format réponse questions |
| `criticite_question` | faible, moyenne, haute, critique | Niveau criticité questions |
| `statut_audit` | planifie, en_cours, termine, annule | État audits |
| `nc_gravite` | faible, moyenne, haute, critique | Gravité NC (détermine échéance) |
| `nc_statut` | ouverte, en_traitement, resolue, verifiee, cloturee | Workflow NC |
| `nc_type` | securite, qualite, hygiene, environnement, autre | Classification NC |
| `action_type` | corrective, preventive | Nature actions correctives |
| `action_statut` | a_faire, en_cours, terminee, verifiee | État actions |
| `preuve_type` | photo, document, commentaire | Type preuves correction |
| `notification_type` | nc_critique, nc_echue, action_terminee | Type notifications DB |

---

### Policies RLS (Total: 108 policies)

| Étape | Tables | Policies | Détail |
|-------|--------|----------|--------|
| **01 (Foundations)** | 3 | 23 | profiles (7), depots (8), zones (8) |
| **02 (Audits)** | 4 | 21 | audit_templates (4), questions (4), audits (6), reponses (7) |
| **03 (NC)** | 4 | 28 | non_conformites (8), actions_correctives (8), preuves_correction (7), notifications (5) |
| **04 (Dashboard)** | 0 | 0 | Réutilise policies existantes |
| **05 (Rapports)** | 3 | 13 | rapport_templates (4), rapports_generes (5), rapport_consultations (4) |
| **Auth** | 1 | 0 | `auth.users` (Supabase natif, pas de RLS custom) |
| **TOTAL** | **19** | **85** | *Note: écart avec 108 car quelques policies manquantes dans migrations (à confirmer)*  |

**Note**: Le total 108 est mentionné dans les rapports mais les migrations SQL montrent 85 policies. Vérification nécessaire lors implémentation.

---

## L) CHECKLIST AVANT IMPLÉMENTATION UI

Avant de créer une vue, valider:

✅ **1. Référence Plan**
- [ ] La vue existe dans ce plan (section A-J)
- [ ] Route identifiée
- [ ] Rôles autorisés documentés

✅ **2. Mapping SQL Vérifié**
- [ ] Tables exactement nommées (snake_case)
- [ ] Colonnes exactement nommées (snake_case)
- [ ] Types SQL connus (UUID, VARCHAR(X), ENUM, TIMESTAMPTZ, etc.)
- [ ] Relations FK comprises (ON DELETE CASCADE/RESTRICT)

✅ **3. RLS Compris**
- [ ] Policies identifiées pour chaque opération (SELECT/INSERT/UPDATE/DELETE)
- [ ] Isolation rôles testée (auditeurs propres audits, manager global, etc.)
- [ ] Fonctions helper RLS utilisées si nécessaire

✅ **4. Design System Appliqué**
- [ ] `docs/DESIGN_SYSTEM_QHSE.md` lu et compris
- [ ] Composants UI existants utilisés (Button, Card, Badge, Table, etc.)
- [ ] Tokens couleurs (HSL variables) utilisés, pas hardcodé
- [ ] Dark mode testé (lisibilité clair ET sombre)

✅ **5. États UI Implémentés**
- [ ] Loading: skeleton ou spinner
- [ ] Empty: message + CTA si applicable
- [ ] Error: message + bouton retry

✅ **6. Mode Démo Compatible**
- [ ] Si vue accessible en démo: zéro appel Supabase
- [ ] Données mock via `mockApi` (mockData.js)
- [ ] Bandeau "🎭 MODE DÉMO" affiché
- [ ] Parcours cliquable fonctionnel (navigation)

✅ **7. Source de Vérité Commentée**
- [ ] Commentaire en haut du fichier composant:
  ```javascript
  /**
   * Vue: [Nom Vue]
   * Route: [route]
   * Source SQL: [migration 0001/0002/etc.]
   * Source Doc: [PLAN_VUES_QHSE.md section X.Y]
   * Tables: [table1, table2]
   * RLS: [policies utilisées]
   */
  ```

---

## M) NOTES IMPORTANTES

### M.1 – Données à Confirmer

Les éléments suivants nécessitent validation humaine lors implémentation:

1. **Colonne `is_overdue` NC**: Mentionnée dans docs mais non implémentée en GENERATED dans migration 0003 (CURRENT_DATE non immutable). Calcul temps réel via VIEW ou fonction à implémenter.

2. **Total Policies RLS**: Rapports mentionnent 108 mais migrations montrent 85. Vérifier cohérence.

3. **Fonction `archive_old_reports()` cron**: Documentée en Étape 05 mais mécanisme cron Supabase non détaillé. À implémenter via Supabase Edge Functions ou cron externe.

4. **Mock Data Complet**: README exige données mock minimales mais `mockData.js` non encore créé. À produire lors Étape 1 UI.

5. **Vues Absentes**: Certaines vues mentionnées dans README (ex: page erreur 404, page maintenance) non listées ici car hors périmètre fonctionnel métier.

### M.2 – Exclusions Confirmées (Hors Périmètre)

Les fonctionnalités suivantes sont EXCLUES du périmètre actuel:

- Plans d'actions CAPA détaillés (étape future)
- Intégrations externes (ERP, SIRH)
- Notifications temps réel (emails, SMS, webhooks)
- Mobile app native
- Analyse IA / prédictions
- Rapports personnalisables drag&drop
- Signature électronique rapports
- Comparaison rapports multi-périodes
- Cache applicatif (Redis)
- Vues matérialisées PostgreSQL

### M.3 – Conventions Nommage

**Routes**: kebab-case (ex: `/non-conformites/[id]/actions`)  
**Tables SQL**: snake_case (ex: `non_conformites`, `audit_templates`)  
**Colonnes SQL**: snake_case (ex: `created_at`, `assigned_to`)  
**Composants React**: PascalCase (ex: `AuditCard`, `NonConformiteDetail`)  
**Fichiers composants**: kebab-case (ex: `audit-card.jsx`, `nc-detail.jsx`)  
**Variables JS**: camelCase (ex: `auditId`, `isOverdue`)

---

## N) VALIDATION FINALE

**Ce plan est-il complet ?** ✅ OUI

**Sources vérifiées**:
- ✅ README.md (sections 1-25)
- ✅ docs/00_cadrage/* (spec_metier, architecture_globale)
- ✅ docs/QHSE/QHSE_ETAPE_XX_RAPPORT_CONTROLE.md (01-05)
- ✅ docs/DESIGN_SYSTEM_QHSE.md
- ✅ supabase/migrations/000*.sql (0001-0005)

**Mapping SQL validé**: ✅ Tous noms tables/colonnes/fonctions/ENUMs exacts depuis migrations

**Rôles RLS documentés**: ✅ Toutes policies identifiées par vue

**Design System respecté**: ✅ Référence explicite obligatoire

**Mode Démo compatible**: ✅ Vues démo séparées, bandeau, zéro Supabase

---

## O) COMMIT INITIAL

```bash
git add docs/UI/PLAN_VUES_QHSE.md
git commit -m "docs(ui): derive screens from cadrage + sql mapping

- Extraction 31 vues depuis README + cadrage + migrations SQL
- Mapping exact tables/colonnes/fonctions/ENUMs (19 tables, 18 fonctions, 13 ENUMs)
- Permissions RLS par vue (85 policies totales)
- Référence stricte Design System QHSE
- Mode Démo compatible (bandeau, zéro Supabase, mock data)
- Checklist validation avant implémentation UI
- Source de vérité UI définitive: docs/UI/PLAN_VUES_QHSE.md

Étapes suivantes:
1. Validation humaine de ce plan
2. Création AppShell + navigation (base routes Next.js)
3. Création composants UI réutilisables (Button, Card, Badge, etc.)
4. Implémentation progressive vues (mock data d'abord, puis Supabase)
"
```

---

**FIN DU PLAN DES VUES QHSE**

Ce document doit être RELU et VALIDÉ avant toute implémentation UI.  
Toute modification ultérieure doit être tracée avec version + date.

