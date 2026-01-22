# Spécifications Métier – QHSE Global

## Date
22 janvier 2026

## Contexte métier

Application QHSE (Qualité, Hygiène, Sécurité, Environnement) destinée à la gestion des audits et non-conformités pour des sites de production/logistique.

## Périmètre fonctionnel

### Inclus
- Gestion multi-sites (dépôts, zones au sein des dépôts)
- Gestion des templates d'audit (sécurité, qualité/HACCP)
- Réalisation d'audits avec questionnaires structurés
- Détection et suivi des non-conformités
- Tableau de bord KPI
- Système d'authentification et rôles
- Mode Démo complet (sans backend)
- Mode Production (Supabase)

### Exclu (pour l'étape 0 et fondations)
- Plans d'actions correctives détaillés (CAPA)
- Intégrations externes (ERP, SIRH)
- Notifications temps réel (emails, SMS)
- Mobile app native
- Analyse IA des audits

## Acteurs et rôles métier

### 1. admin_dev
- **Objectif**: Administration technique complète
- **Droits**: CRUD sur toutes les entités
- **Cas d'usage**: Configuration initiale, import bulk, debug

### 2. qhse_manager
- **Objectif**: Pilotage global QHSE
- **Droits**: 
  - Créer/modifier templates
  - Assigner audits
  - Créer/modifier dépôts, zones
  - Accès lecture complète
  - Accès écriture sur NC (validation, clôture)
- **Cas d'usage**: Planification audits, suivi KPI, validation NC critiques

### 3. qh_auditor
- **Objectif**: Auditer qualité/hygiène
- **Droits**:
  - Réaliser audits qualité/HACCP assignés
  - Créer NC détectées lors de ses audits
  - Lecture templates qualité
- **Restrictions**: Pas d'accès aux audits sécurité

### 4. safety_auditor
- **Objectif**: Auditer sécurité
- **Droits**:
  - Réaliser audits sécurité assignés
  - Créer NC détectées lors de ses audits
  - Lecture templates sécurité
- **Restrictions**: Pas d'accès aux audits qualité

### 5. viewer
- **Objectif**: Consultation reporting
- **Droits**: Lecture seule (audits, NC, KPI)
- **Restrictions**: Aucune modification

## Concepts métier

### Dépôt (Depot)
- Site physique (entrepôt, usine)
- Attributs: code, nom, ville, adresse, contact
- Contient 1 à N zones

### Zone
- Subdivision d'un dépôt (zone de stockage, quai, bureau)
- Attributs: code, nom, type (enum: warehouse, loading, office, production, cold_storage)
- Rattachée à un dépôt unique

### Template d'audit
- Modèle de questionnaire
- Types: security, quality, haccp
- Contient questions regroupées en catégories
- Versionné (v1, v2...)

### Catégorie de questions
- Regroupe questions par thème (ex: "Equipements de protection", "Hygiène alimentaire")
- Ordre d'affichage

### Question
- Libellé
- Type de réponse: yes_no, score_1_5, text
- Criticité: low, medium, high, critical
- Point de contrôle métier

### Audit
- Instance d'un template pour un dépôt/zone
- Statuts (workflow):
  - **assigned**: créé, auditeur désigné, pas commencé
  - **in_progress**: au moins 1 réponse saisie
  - **completed**: toutes questions répondues + rapport généré
  - **archived**: audit clos, historique
- Données: date prévue, date réalisation, auditeur assigné
- Génère un rapport final (PDF ou markdown)

### Réponse d'audit
- Lien: audit + question
- Valeur selon type question
- Commentaire optionnel
- Photos (URLs Storage)
- Si non-conforme → peut créer NC

### Non-conformité (NC)
- Détectée lors d'un audit ou signalement direct
- Statuts:
  - **open**: détectée, en attente traitement
  - **in_progress**: plan d'action en cours
  - **resolved**: corrigée, attente validation
  - **closed**: validée et clôturée
- Priorités: low, medium, high, critical
- Attributs: description, zone concernée, auditeur détecteur, responsable traitement, photos, deadline

### Tableau de bord (Dashboard)
- KPI calculés:
  - Nombre audits (par statut)
  - Nombre NC (par priorité, par statut)
  - Taux de conformité moyen
  - NC en retard (deadline dépassée)
- Visualisations: graphiques, top zones à risque

## Règles métier critiques

### R1: Séparation des domaines d'audit
- Un auditeur QH ne peut pas réaliser d'audit sécurité
- Un auditeur sécurité ne peut pas réaliser d'audit qualité
- Validation via RLS et contrôles applicatifs

### R2: Workflow d'audit
- Transition assigned → in_progress: dès 1ère réponse
- Transition in_progress → completed: quand toutes questions répondues ET rapport généré
- Impossible de modifier réponses une fois completed (sauf admin_dev)

### R3: Criticité des questions
- Question critical + réponse non-conforme → NC créée automatiquement avec priorité critical
- Question high + réponse non-conforme → suggestion NC priorité high

### R4: Clôture NC
- Seuls qhse_manager et admin_dev peuvent passer resolved → closed
- Requiert validation terrain

### R5: Intégrité référentielle
- Suppression dépôt → cascade zones, audits, NC
- Suppression template → bloque si audits actifs (assigned, in_progress)
- Suppression auditeur (user) → réassigner audits en cours

## Parcours utilisateurs typiques

### Parcours 1: qhse_manager crée audit
1. Créer dépôt (si inexistant)
2. Créer zones
3. Sélectionner template
4. Assigner auditeur (selon type audit)
5. Définir date prévue
6. Sauvegarder → audit statut assigned

### Parcours 2: safety_auditor réalise audit
1. Consulter audits assignés (filtre: assigned, auditeur = moi)
2. Ouvrir audit
3. Parcourir questions par catégorie
4. Répondre (yes/no, score, texte) + ajouter photos si besoin
5. Si non-conformité → créer NC liée
6. Terminer audit → saisir commentaires généraux
7. Générer rapport → audit passe completed

### Parcours 3: viewer consulte dashboard
1. Accéder /dashboard
2. Voir KPI synthétiques (audits, NC, conformité)
3. Voir graphiques évolution
4. Cliquer sur KPI → drill-down (liste audits ou NC correspondants)

### Parcours 4: qhse_manager traite NC
1. Consulter NC ouvertes
2. Filtrer par priorité critical
3. Ouvrir NC
4. Assigner responsable traitement
5. Définir deadline
6. Suivre progression (in_progress → resolved)
7. Valider sur terrain
8. Clôturer NC (closed)

## Hypothèses et contraintes

### Hypothèses
- Les templates sont créés/maintenus par qhse_manager ou admin_dev
- Un auditeur est une personne physique (1 utilisateur = 1 compte)
- Les dépôts et zones sont relativement stables (peu de modifications)

### Contraintes
- Mode Démo: aucun appel réseau, données mockées, mais parcours complets cliquables
- RLS Supabase obligatoire en production
- Pas de TypeScript (JavaScript pur)
- Pas de clés dans le code (env variables)

## Cas limites identifiés

### C1: Auditeur absent en cours d'audit
- qhse_manager peut réassigner audit à un autre auditeur (même profil)
- Réponses déjà saisies conservées

### C2: Template modifié après création audit
- Audits en cours utilisent snapshot du template (version gelée)
- Nouvelles versions de template n'impactent pas audits existants

### C3: Zone supprimée avec NC ouvertes
- Suppression zone bloquée si NC open ou in_progress
- Nécessite clôture NC avant suppression

### C4: Mode Démo vs Prod
- Mode Démo: détection via demoConfig.js (DEMO_MODE=true)
- Tous les appels passent par apiWrapper.js qui route vers mockData ou Supabase
- Aucun import direct de supabaseClient.js en mode démo

## Livrables attendus (étape 01_foundations)

- Schéma DB complet (tables, relations, contraintes)
- RLS policies par table et par rôle
- Tests de validation SQL (scénarios OK/KO)
- Migration SQL finale (à appliquer après validation)

## Prochaines étapes (hors étape 0)

1. Étape 01: Foundations (DB, RLS, Auth)
2. Étape 02: Templates et Questions
3. Étape 03: Audits et Réponses
4. Étape 04: Non-conformités
5. Étape 05: Dashboard KPI
6. Étape 06: UI/UX finale

---

**Statut**: ✅ Spec métier validée pour cadrage étape 0
