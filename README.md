# QHSE📘 DOCUMENT DE CADRAGE – RECONSTRUCTION DU PROJET QHSE
1. Objectif du document
Ce document définit la méthode, la structure et les règles à suivre pour reconstruire le projet QHSE de manière propre, cohérente et déployable sans erreur dès le premier déploiement Supabase.
Il sert de :
•	référence unique pour le développement
•	contrat de travail pour Copilot
•	base de validation avant toute implémentation
Aucune étape ne doit être commencée sans respecter ce document.
________________________________________
2. Objectif global du projet
Construire une application QHSE :
•	structurée
•	sécurisée
•	compréhensible dans le temps
•	utilisable en mode Démo et en Production Supabase sans refactor applicatif
Le projet doit pouvoir être repris dans plusieurs mois sans perte de compréhension.
________________________________________
3. Principes non négociables
•	JavaScript uniquement (pas TypeScript)
•	Supabase comme backend unique (Auth, DB, Storage)
•	RLS activée dès la création des tables
•	Aucune clé sensible commitée
•	Aucune migration appliquée tant que l’étape n’est pas validée
•	La documentation précède l’implémentation
•	Chaque décision doit être justifiée et traçable
________________________________________
4. Méthode de travail imposée
Le projet est reconstruit par étapes.
Pour chaque étape :
1.	Rédiger la documentation métier
2.	Définir le schéma de données
3.	Définir les règles de sécurité (RLS)
4.	Décrire les scénarios UI (ex: login admin)
5.	Définir les tests de validation
6.	Valider l’étape
7.	Générer la migration SQL finale
8.	Appliquer la migration
Aucune implémentation partielle ou anticipée n’est autorisée.
________________________________________
5. Organisation de la documentation
La documentation est structurée par étapes, dans le dossier docs/.
Structure type d’une étape
/docs
  /XX_nom_etape
    01_spec_metier.md
    02_schema_db.md
    03_rls_policies.md
    04_tests_validation.md
    05_exemples_ui.md
    06_decisions_log.md
    07_migration_finale.sql
Chaque fichier a un rôle précis et obligatoire.
________________________________________
6. Rôle de chaque fichier
01_spec_metier.md
•	Objectif métier de l’étape
•	Règles fonctionnelles
•	Rôles concernés
•	Cas limites
02_schema_db.md
•	Tables prévues
•	Champs et types
•	Relations
•	Contraintes
•	Choix structurants
03_rls_policies.md
•	Activation RLS
•	Policies par table
•	Droits par rôle
•	Logique de sécurité expliquée
04_tests_validation.md
•	Scénarios de test
•	Cas OK / KO
•	Vérifications SQL
•	Critères de validation
05_exemples_ui.md
•	Parcours utilisateurs
•	Exemples concrets (login admin, accès refusé, etc.)
•	Comportement attendu de l’interface
06_decisions_log.md
•	Décisions prises
•	Alternatives rejetées
•	Raisons des choix
07_migration_finale.sql
•	SQL final de l’étape
•	Appliqué uniquement après validation complète
________________________________________
7. Mode Démo
Le projet doit fonctionner :
•	avec Supabase (production)
•	sans Supabase (mode Démo)
Les contrats d’API doivent être identiques.
Le mode Démo est une fonctionnalité officielle, pas un outil temporaire.
________________________________________
8. Gestion des clés et configuration
•	Les clés sont stockées dans :
o	.env.local (local)
o	variables d’environnement Supabase / Vercel (prod)
•	Aucune clé ne doit apparaître dans le code ou les commits
•	Toute variable doit être documentée
________________________________________
9. Règle d’or avant implémentation
Si un point n’est pas clair dans la documentation :
→ on s’arrête
→ on documente
→ on valide
→ ensuite seulement, on code
________________________________________
10. Critère de réussite final
•	Déploiement Supabase sans erreur
•	Aucun SQL fragile
•	Sécurité cohérente
•	Logique métier compréhensible
•	Documentation suffisante pour audit ou reprise du projet

Mode Démo accessible depuis l’accueil
11. Règle “Mode Démo public” (obligatoire)
Objectif
Permettre à n’importe qui de tester l’application sans compte depuis la page d’accueil, via un bouton “Mode Démo”.
Principes
•	Le Mode Démo doit être utilisable sans authentification.
•	Le Mode Démo doit afficher des données exemple codées en dur (mock data).
•	Le Mode Démo ne doit jamais exposer ou nécessiter des clés Supabase.
•	Le Mode Démo ne doit pas permettre d’actions qui pourraient être confondues avec de la prod (ex: “Supprimer définitivement”, “Envoyer email réel”, etc.)
________________________________________
12. Comportement UI attendu (Accueil)
Page d’accueil (publique)
•	Bouton principal: “Entrer en mode Démo”
•	Bouton secondaire: “Se connecter” (pour mode Production)
Quand on clique “Entrer en mode Démo”
•	L’app active DEMO_MODE=true (mécanisme défini dans demoConfig.js)
•	L’utilisateur arrive sur un dashboard démo
•	Un bandeau visible affiche: 🎭 MODE DÉMO (données exemple)
________________________________________
13. Identité des utilisateurs Démo (sans login)
Règle
En mode démo, on simule un utilisateur par défaut sans login.
Optionnel: un sélecteur permet de changer de rôle (admin, auditeur, viewer) instantanément.
Valeur par défaut
•	Utilisateur démo par défaut: qhse_manager (ou admin_dev, à choisir mais fixé dans la doc)
•	Stockage session: localStorage (déjà prévu par demoAuth.js)
________________________________________
14. Exemples “codés en dur” obligatoires
Le Mode Démo doit inclure des exemples visibles et parlants dès l’arrivée:
Exemples minimum à afficher
•	1 dépôt + 1 zone
•	1 template d’audit “Sécurité - Rondes Terrain”
•	5 questions (différents types si possible: oui/non, texte, note)
•	1 audit instance “à faire”
•	1 audit instance “terminé”
•	1 non-conformité exemple
•	1 rapport exemple
Règle
Ces exemples doivent être:
•	disponibles dès le premier lancement
•	stables (pas aléatoires)
•	compréhensibles sans explication
________________________________________
15. Séparation stricte Démo / Production (anti-boulette)
Obligatoire
•	En mode Démo:
o	aucun appel Supabase ne doit être fait
o	toutes les fonctions passent par apiWrapper
•	En mode Production:
o	Supabase actif
o	RLS s’applique
o	login requis pour toute donnée privée
Indicateurs visuels
•	Bandeau permanent “MODE DÉMO”
•	Couleur / badge spécifique sur le header
•	Icône 🎭 affichée dans la navbar
________________________________________
16. Navigation et routes en Démo
Routes accessibles sans login en Démo
•	/ (accueil)
•	/demo (landing dashboard démo)
•	toutes les pages nécessaires à la démonstration (templates, audits, rapports, NC)
En production (hors Démo)
•	routes admin protégées
•	routes audit protégées
•	page publique limitée à l’accueil + pages marketing
________________________________________
17. Critères de validation (Mode Démo)
Le Mode Démo est validé si:
•	l’app fonctionne sur un navigateur neuf (aucun cache)
•	clic “Entrer en mode Démo” → dashboard démo sans login
•	toutes les pages démo chargent des données (mock)
•	aucun appel réseau Supabase n’est effectué en démo
________________________________________
18. Notes d’implémentation (direction Copilot)
Copilot doit respecter:
•	demoConfig.js comme source de vérité du mode
•	apiWrapper.js comme passage unique vers données
•	demoAuth.js pour session démo
•	mockData.js comme base d’exemples codés en dur
Exigences de navigation et données cliquables en Mode Démo
19. Mode Démo “Full parcours cliquable” (obligatoire)
Objectif
Le mode Démo doit permettre une démonstration complète sans login et sans dépendance backend, avec un parcours utilisateur réaliste.
Exigence principale
En Mode Démo, l’utilisateur doit pouvoir:
1.	voir un tableau de bord avec valeurs d’exemple
2.	cliquer sur un audit
3.	voir le détail de l’audit (statut, zone, auditeur simulé, dates)
4.	ouvrir l’écran questions
5.	voir les questions + réponses d’exemple
6.	accéder à un rapport généré (exemple)
7.	accéder aux non-conformités liées (exemple)
________________________________________
20. Contenu minimum visible sur le Dashboard Démo
Le dashboard doit afficher des valeurs chiffrées cohérentes avec les données mockées, par exemple:
KPIs (cartes)
•	Audits à faire: X
•	Audits en cours: Y
•	Audits terminés (30j): Z
•	Taux de conformité global: %
•	Non-conformités ouvertes: N
Graphiques / tableaux (au moins 2)
•	Répartition audits par statut (ex: draft/assigned/in_progress/completed)
•	NC par gravité (ex: low/medium/high) ou par type
•	Historique mensuel (ex: nombre d’audits terminés sur 6 mois)
Règle: les chiffres doivent provenir de mockData.js via mockApi.stats.getDashboard() (ou équivalent), pas codés en dur dans le composant UI.
________________________________________
21. Parcours “Audit cliquable” en Démo (obligatoire)
Page Liste Audits (Démo)
•	tableau/listing avec:
o	code audit
o	template utilisé
o	depot / zone
o	statut
o	date planifiée
o	auditeur simulé
•	au clic sur une ligne:
o	navigation vers /audits/:id
Page Détail Audit (Démo)
Doit afficher:
•	template (nom + type)
•	dépôt/zone
•	statut
•	progress (ex: 3/10 questions répondues)
•	lien/bouton: “Voir les questions”
•	lien/bouton: “Voir le rapport”
•	bloc “Non-conformités liées”
Page Questions Audit (Démo)
Doit afficher:
•	liste des questions dans l’ordre
•	type question (oui/non, texte, note)
•	réponse existante d’exemple si audit déjà fait
•	si audit “à faire”: possibilité de répondre (en mémoire)
Règle: en mode démo, les réponses peuvent être stockées en mémoire (mock state) avec mockApi, pas besoin de persistance.
________________________________________
22. Rapports et Non-conformités en Démo
Rapport (Démo)
•	accessible depuis audit detail
•	contient:
o	résumé: score conformité
o	points forts / points faibles (exemple)
o	tableau des réponses
Non-conformités (Démo)
•	accessible depuis audit detail + menu NC
•	listing NC avec:
o	titre
o	gravité / priorité
o	statut (open / in_progress / closed)
o	liée à un audit
Règle: au moins 1 audit doit avoir 1 NC liée, sinon la démo “sonne vide”.
________________________________________
23. Données mock minimales à garantir (pour que ça marche vraiment)
Le mock doit contenir au minimum:
•	1 dépôt, 2 zones
•	2 templates (ex: sécurité + qualité)
•	1 audit “à faire” (assigned) avec 0 réponse
•	1 audit “en cours” avec quelques réponses
•	1 audit “terminé” avec réponses complètes + rapport + NC
•	1 série de stats dashboard cohérentes calculées depuis ces audits
________________________________________
24. Critères de validation (Mode Démo cliquable)
Le mode démo est validé si:
•	depuis l’accueil → “Mode Démo”
•	dashboard affiche des chiffres cohérents
•	clic sur “audits à faire” (ou liste) ouvre un audit
•	audit détail → questions → affichage OK
•	audit détail → rapport → affichage OK
•	audit détail → NC → affichage OK
•	aucune page ne contient “No data” ou “undefined” en démo
________________________________________
25. Règle anti-triche (important)
Les valeurs visibles (dashboard, états, progress) doivent être:
•	dérivées des données mock
•	retournées par mockApi / apiWrapper
•	pas codées en dur dans les composants UI
🧠 Logique métier par vue
Conventions (pour toutes les vues)
Pour chaque vue on documente:
•	But (à quoi sert l’écran)
•	Accès (Public / Demo / Auth requis / Rôles)
•	Entrées (query params, route params)
•	Données (API calls via apiWrapper)
•	Actions utilisateur (boutons, formulaires)
•	Règles métier (permissions, statuts, validations)
•	États UI (loading, empty, error)
•	Sorties (navigation, création d’objet, messages)
________________________________________
1) Vue: Accueil /
But
Portail d’entrée: choisir Mode Démo ou Connexion Prod.
Accès
Public (toujours accessible).
Données
Aucune donnée privée.
Optionnel: statut environnement (demo détecté ou non).
Actions
•	Bouton Entrer en mode Démo → active DEMO_MODE=true → redirect /demo
•	Bouton Se connecter → redirect /login
Règles métier
•	Aucun login requis pour démo.
•	Indiquer clairement la séparation Démo / Prod.
________________________________________
2) Vue: Login /login
But
Connexion Production via Supabase Auth.
Accès
Public, mais mène à un espace privé après login.
Données
•	auth.signInWithPassword()
•	fetch profiles après session (prod)
Actions
•	login email/password
•	logout (si déjà connecté)
Règles métier
•	Si Auth OK mais profiles absent: bloquer accès + message “profil non initialisé”
•	Redirection post-login:
o	Admin/QHSE manager → /admin/dashboard
o	Auditeur → /audits
o	Viewer → /dashboard (lecture seule)
________________________________________
3) Vue: Dashboard Démo /demo
But
Démonstration immédiate: chiffres + accès rapides aux parcours.
Accès
Démo uniquement (sans login).
Données
•	api.stats.getDashboard()
•	api.audits.getAll({ limit: ... }) (ex: derniers audits)
Actions
•	Cliquer KPI “Audits à faire” → /audits?status=assigned
•	Cliquer KPI “NC ouvertes” → /non-conformities?status=open
•	Bouton “Changer d’utilisateur démo” (optionnel) → switch role
Règles métier
•	Toujours afficher bandeau “MODE DÉMO”
•	Les chiffres doivent provenir des données mock (pas hardcodés dans le composant)
________________________________________
4) Vue: Dashboard Prod /dashboard
But
Vue synthèse utilisateur connecté (prod).
Accès
Auth requis (tous rôles), contenu filtré par rôle.
Données
•	api.stats.getDashboard() (prod)
•	filtres selon rôle:
o	auditeur → ses audits
o	manager/admin → tous + filtres dépôt/zone
Actions
•	Accès rapide aux listes (audits, rapports, NC)
Règles métier
•	Respect strict RLS: l’écran ne doit pas “inventer” des données si la requête est refusée.
________________________________________
5) Vue: Liste Audits /audits
But
Afficher les audits, filtrer, accéder au détail.
Accès
•	Démo: public via mode démo
•	Prod: auth requis
Entrées
•	status, depot_id, zone_id, mine=true, q=...
Données
•	api.audits.getAll(filters)
•	éventuellement api.depots.getAll() + api.zones.getAll() pour filtres
Actions
•	click audit → /audits/:id
•	(admin/manager) bouton “Créer audit” → /audits/new
•	(admin/manager) assign audit à auditeur
Règles métier
•	Auditeur ne voit que:
o	ses audits assignés
o	audits publics si viewer (lecture seule)
•	Statuts: draft/assigned/in_progress/completed/archived
•	Affichage progress: answered_count / question_count
________________________________________
6) Vue: Détail Audit /audits/:id
But
Voir le contexte audit + actions (questions, rapport, NC, statut).
Accès
•	Démo: accessible
•	Prod: restreint par rôle/RLS
Données
•	api.audits.getById(id)
•	api.questions.getByTemplateId(template_id)
•	api.answers.getByAuditId(id) (si séparé)
•	api.reports.getByAuditId(id) (si existe)
•	api.nonConformities.getAll({ audit_id: id })
Actions
•	bouton “Voir questions” → /audits/:id/questions
•	bouton “Voir rapport” → /audits/:id/report
•	bouton “Créer NC” → /audits/:id/non-conformities/new
•	changer statut (selon droits)
Règles métier
•	Un audit “completed” devient lecture seule (sauf admin/manager)
•	Un auditeur ne peut modifier que ses audits
•	Les transitions de statut sont contrôlées (pas “completed” direct sans réponses)
________________________________________
7) Vue: Questions Audit /audits/:id/questions
But
Répondre aux questions du template pour cet audit.
Accès
•	Démo: accessible
•	Prod: auditeur assigné + admin/manager
Données
•	questions (ordre)
•	réponses existantes
Actions
•	répondre question (autosave ou save)
•	navigation question suivante
•	marquer audit “in_progress”
•	soumettre audit (validation) → statut “completed”
Règles métier
•	Validation avant completion:
o	X% min répondu ou toutes questions “required”
•	En démo: sauvegarde en mémoire (mockApi)
•	En prod: insert/update audit_answers
________________________________________
8) Vue: Rapport /audits/:id/report
But
Afficher un rapport lisible (résumé + détails).
Accès
•	Démo: accessible
•	Prod: viewer inclus (lecture) si autorisé par RLS
Données
•	api.reports.getByAuditId(id) ou calcul à la volée depuis réponses
Actions
•	Export PDF (optionnel plus tard)
•	Partage interne (pas d’email réel en démo)
Règles métier
•	Rapport cohérent avec les réponses et NC
•	Si audit pas completed: afficher “Rapport provisoire”
________________________________________
9) Vue: Non-Conformités /non-conformities
But
Lister et filtrer les NC.
Accès
•	Démo: accessible
•	Prod: selon rôle (viewer peut lire si permis, auditeur sur ses audits)
Données
•	api.nonConformities.getAll(filters)
Actions
•	click NC → /non-conformities/:id
•	créer NC (si droits)
Règles métier
•	Une NC doit être liée à un audit (au minimum en prod)
•	Statuts (ex): open / in_progress / closed
•	Assignation responsable (optionnel)
________________________________________
10) Vue: Admin Dashboard /admin/dashboard
But
Pilotage global (templates, audits, dépôts, utilisateurs).
Accès
Prod uniquement: admin_dev, qhse_manager.
Données
•	stats globales
•	listes principales (templates, audits, depots)
Actions
•	CRUD templates
•	création audit + assignation
•	gestion dépôts/zones
•	(optionnel) gestion utilisateurs/rôles
Règles métier
•	Aucune route admin ne doit être accessible sans rôle autorisé
•	Le bouton “audit à faire” pour l’auditeur doit provenir des audits assignés
________________________________________
Annexe: Matrice “Vues x Accès”
Vue	Public	Démo	Prod Viewer	Prod Auditeur	Manager/Admin
/	✅	✅	✅	✅	✅
/login	✅	✅	✅	✅	✅
/demo	❌	✅	❌	❌	❌
/dashboard	❌	❌	✅	✅	✅
/audits	❌	✅	✅*	✅	✅
/audits/:id	❌	✅	✅*	✅ (si assigné)	✅
/admin/*	❌	❌	❌	❌	✅
* dépend des règles RLS (lecture).

0) Définition “Admin”
On distingue 2 niveaux (sinon tout devient flou):
•	admin_dev: super-admin technique (tout, y compris maintenance)
•	qhse_manager: admin métier (gestion QHSE complète, mais pas “dangerous ops” techniques)
Si tu ne veux qu’un seul admin, tu peux fusionner, mais c’est plus risqué.
________________________________________
1) Après login: landing & navigation
Redirection
•	admin_dev / qhse_manager → /admin/dashboard
Header (toujours visible)
•	Badge rôle: ADMIN
•	Sélecteur “Mode Démo / Mode Prod” interdit en prod (la démo est une route à part, pas un toggle en prod)
•	Menu admin:
o	Dashboard
o	Templates
o	Audits
o	Dépôts & Zones
o	Non-conformités
o	Rapports
o	Utilisateurs (optionnel selon périmètre)
o	Paramètres (optionnel)
________________________________________
2) Vue /admin/dashboard (pilotage global)
Peut voir
•	stats globales: audits par statut, NC ouvertes, conformité moyenne
•	derniers audits créés / en retard
•	top zones/dépôts “à risque” (si calcul existant)
Peut faire
•	créer un audit (raccourci)
•	aller sur gestion templates
•	aller sur gestion dépôts/zones
•	filtrer: dépôt, période, statut, auditeur
________________________________________
3) Vue Templates /admin/templates
Peut voir
•	liste des templates (actifs / archivés)
•	nombre de questions
•	type (SAFETY/QUALITY/QHSE)
•	dernière modification
Peut faire
•	Créer template
•	Modifier template
•	Dupliquer template
•	Archiver template
•	Réordonner questions
•	Ajouter / modifier / supprimer questions
Règles métier
•	Un template utilisé par des audits existants:
o	modification possible mais doit être contrôlée (versionning recommandé plus tard)
o	sinon risque: audit historique incohérent
•	Au minimum:
o	interdire de supprimer une question si elle a déjà des réponses en prod (ou alors soft delete)
________________________________________
4) Vue Audits /admin/audits
Peut voir
•	tous les audits (tous dépôts, tous auditeurs)
•	filtres avancés: statut, dépôt, zone, auditeur, dates
Peut faire
•	Créer un audit (choisir template + dépôt + zone + date)
•	Assigner un auditeur (qh_auditor / safety_auditor)
•	Changer statut (draft → assigned → in_progress → completed → archived)
•	Réassigner un audit
•	Annuler/Archiver un audit
Règles métier
•	Assigned = auditeur désigné obligatoire
•	Completed seulement si règles de validation respectées (questions requises, etc.)
•	Archived = lecture seule
________________________________________
5) Vue Détail Audit /admin/audits/:id
Peut voir
•	tout le contenu: questions, réponses, score, photos, rapport, NC
Peut faire
•	modifier métadonnées: date, zone, auditeur, statut (avec règles)
•	compléter ou corriger des réponses (si tu l’autorises)
•	créer une NC liée à une question
•	générer / recalculer rapport
Règles métier
•	Sur audit completed:
o	qhse_manager peut corriger (audit trail conseillé)
o	admin_dev peut tout faire
•	Si tu veux être strict:
o	completed = lecture seule, corrections via “audit de correction” (plus tard)
________________________________________
6) Vue Dépôts & Zones /admin/depots
Peut voir
•	dépôts, zones, affectations
Peut faire
•	créer/modifier dépôt
•	créer/modifier zone
•	activer/désactiver une zone (si besoin)
•	gérer codes, libellés, périmètres
Règles métier
•	interdire suppression “hard” si déjà utilisé dans un audit
•	préférer: is_active=false ou archived_at
________________________________________
7) Vue Non-conformités /admin/non-conformities
Peut voir
•	toutes les NC (tous audits)
Peut faire
•	créer NC
•	changer statut (open/in_progress/closed)
•	assigner responsable
•	ajouter commentaires / actions correctives
•	lier/délier NC à audit (si autorisé)
Règles métier
•	une NC doit être rattachée à un audit en prod (recommandé)
•	clôture = action corrective documentée (au moins un texte)
________________________________________
8) Vue Rapports /admin/reports
Peut voir
•	tous les rapports
•	filtres (période, dépôt, template, auditeur)
Peut faire
•	regénérer un rapport
•	exporter (PDF plus tard)
•	consulter l’historique
________________________________________
9) Vue Utilisateurs /admin/users (optionnel)
Si tu inclus cette vue, elle doit être très cadrée.
Peut voir
•	liste des users + rôles + statut
Peut faire (qhse_manager)
•	changer rôle: viewer ↔ auditeur ↔ manager (selon règles)
•	activer/désactiver un user (soft)
•	forcer reset (optionnel)
Peut faire (admin_dev)
•	tout + maintenance (voir logs, debug)
Règles métier
•	interdire de retirer le dernier admin (sinon tu te tires dans le pied)
•	toute modification rôle doit être tracée (audit trail recommandé)
________________________________________
✅ Résumé ultra clair (ce que “Admin” peut faire)
Admin peut:
•	gérer templates
•	gérer audits (créer, assigner, statuts)
•	gérer dépôts/zones
•	gérer NC
•	consulter rapports
•	(optionnel) gérer utilisateurs et rôles

1) Modèle métier: comment “penser” un audit HACCP
Un audit HACCP, ce n’est pas juste “questions/réponses”. C’est :
A. Un Template (la checklist)
•	versionné (sinon tu détruis l’historique)
•	organisé par sections
•	questions typées + règles
B. Une Instance d’audit (l’exécution terrain)
•	liée à un dépôt/zone
•	assignée à une personne
•	datée (planifiée + réelle)
•	contient les réponses, photos, signatures
C. Un moteur de règles (CCP / limites / alertes)
•	exemple: température attendue min/max
•	si hors plage → warning ou critical
•	déclenche :
o	un flag dans l’audit
o	une non-conformité automatique
o	éventuellement une alerte (notification)
o	éventuellement un process “retrait/rappel” si critique
________________________________________
2) Les champs indispensables (par entité)
2.1 Template d’audit
Champs recommandés :
•	id
•	code (HYG-001, QUAL-003…)
•	name
•	audit_category : HYGIENE_SAFETY | QUALITY
•	version (1,2,3…)
•	status : draft | active | archived
•	applies_to (optionnel) : dépôt/zone/type d’activité
•	created_by
•	created_at, updated_at
✅ Règle: on modifie un template en créant une nouvelle version quand il est déjà utilisé.
________________________________________
2.2 Section
•	template_id
•	title
•	order_index
•	is_optional (si tu veux masquer des blocs)
________________________________________
2.3 Question (le cœur)
Champs recommandés :
•	template_id
•	section_id
•	question_text
•	question_type :
o	CHECKLIST_YN (oui/non)
o	CHECKLIST_OK_NOK_NA
o	NUMBER (température, poids…)
o	TEXT
o	MULTI_CHECK (plusieurs cases)
o	PHOTO (preuve obligatoire)
o	SIGNATURE (si besoin par section ou fin)
•	is_required
•	order_index
•	help_text (ex: “mesurer au cœur du produit”)
•	tags (HACCP, CCP, Nettoyage, Allergènes…)
•	risk_level : info | warning | critical
•	has_rule (bool) + rule_config (json) (voir juste après)
________________________________________
3) Règles HACCP: limites, tolérances, alertes
Tu ne veux pas coder “4–6°C” dans le dur partout. Tu veux une règle configurable par question.
3.1 Exemple de règle pour température
Pour une question de type NUMBER, tu définis dans rule_config :
•	unit: "°C"
•	expected_min: 4
•	expected_max: 6
•	severity_if_below: warning
•	severity_if_above: critical
•	trigger_non_conformity: true
•	non_conformity_title: "Température hors tolérance"
•	action_hint: "Isoler le lot + vérifier chaîne du froid"
Résultat attendu
•	Si l’auditeur saisit 7
o	UI affiche immédiatement: CRITICAL
o	l’instance d’audit prend un flag “attention”
o	une NC est créée (automatique) liée à la question/réponse
o	option: notification au manager
________________________________________
3.2 Règles possibles (au-delà température)
•	plage min/max (température, humidité)
•	seuil max (ex: “% de surfaces souillées”)
•	condition logique (si “NOK” alors photo obligatoire)
•	scoring (note 1–5)
•	conformité calculée (score pondéré)
________________________________________
4) Instance d’audit: start / finish / assign / planif
4.1 Champs Audit Instance
•	id
•	template_id + template_version
•	depot_id, zone_id
•	assigned_to (auditeur)
•	created_by (admin/manager)
•	status: draft | assigned | in_progress | completed | archived
•	scheduled_at (planifié)
•	started_at (quand l’auditeur clique “Démarrer”)
•	completed_at (quand il clique “Terminer”)
•	duration_seconds (optionnel, calcul)
•	overall_result : pass | pass_with_warnings | fail (calcul)
•	attention_count, critical_count
•	signature_auditor (si obligatoire)
•	signature_manager (optionnel)
•	notes
Règles métier
•	assigned → auditeur obligatoire
•	started_at set uniquement au premier démarrage
•	completed verrouille les réponses (sauf admin/manager selon décision)
________________________________________
5) Réponses, photos, pièces jointes
5.1 Answer
•	audit_instance_id
•	question_id
•	value (json: bool/number/text/array)
•	severity_evaluated (info/warning/critical)
•	is_non_conformity_created (bool)
•	answered_at
•	answered_by
5.2 Photos
Tu veux des photos par question et/ou par audit :
•	audit_photos
o	audit_instance_id
o	question_id (nullable)
o	storage_path
o	caption
o	created_by
o	created_at
________________________________________
6) Rapport automatique (généré à la fin)
Le rapport doit être une vue “métier” :
•	résumé audit (où/quand/qui)
•	stats (nb questions, nb NOK, nb warnings/critical)
•	réponses + photos
•	liste des NC (auto + manuelles)
•	signatures
Tu peux générer:
•	soit “à la volée” (calcul)
•	soit “snapshot” stocké (si tu veux figer un PDF plus tard)
________________________________________
7) Retrait / rappel produit (process admin/manager)
Tu veux relier ça à l’audit quand c’est critique.
7.1 Quand déclencher une alerte “retrait/rappel”
Exemples:
•	critical sur une mesure CCP
•	critical répétitif sur plusieurs audits
•	contamination/allergènes détectés
7.2 Entité “Incident / Retrait”
•	id
•	type: withdrawal | recall | incident
•	source: audit (ou manuel)
•	audit_instance_id (nullable)
•	status: draft | in_progress | closed
•	severity: critical
•	description
•	products_affected (json)
•	actions_taken (json)
•	created_by, created_at
⚠️ Accès: admin/manager uniquement.
________________________________________
8) Ce que ça donne “par type d’audit”
Hygiène / Sécurité (HACCP terrain)
•	nettoyage/désinfection
•	stockage froid/chaud (températures)
•	DLC / FIFO
•	allergènes
•	hygiène personnel
•	nuisibles
•	traçabilité
Qualité
•	conformité produit (aspect, étiquetage)
•	contrôle réception
•	emballage/étiquettes
•	intégrité lots
•	respect procédure
Tu peux partager 80% du moteur, mais les templates et règles changent.
________________________________________
9) Ce qu’on met dans la DOC (pour Copilot) tout de suite
Dans la section “Étape 3 – Templates d’audit” de ta doc, on doit écrire :
1.	la liste des types de questions
2.	le modèle de rule_config
3.	le workflow start/finish
4.	l’auto-génération NC sur dépassement
5.	le lien optionnel vers “Incident/Retrait”

🧪 AUDIT HACCP – HYGIÈNE & SÉCURITÉ
Logique métier ultra détaillée (terrain + admin – conformité Suisse)
________________________________________
A. AVANT LE TERRAIN – CÔTÉ ADMIN / MANAGER
A1. Création du template d’audit (ADMIN)
Vue : /admin/templates
L’admin crée ou modifie un template d’audit HACCP.
Champs obligatoires
•	Code audit : HACCP-HYG-001
•	Nom : HACCP – Hygiène & Sécurité (Terrain)
•	Catégorie : HYGIENE / SECURITE
•	Version : 1
•	Description
•	Fréquence recommandée : quotidien / hebdomadaire / mensuel
•	Classification HACCP globale : CCP / PRP / mixte
⚠️ Statut du template
•	⭕ Brouillon
•	🟢 Actif
•	🔴 Archivé
🔐 Règle critique
Un template NON ACTIF n’est JAMAIS visible :
•	ni pour créer un audit
•	ni pour un auditeur
•	ni en mode démo
➡️ sauf s’il est explicitement marqué demo_visible = true
________________________________________
A2. Gestion de la visibilité et options (ADMIN)
Options configurables sur le template :
•	☑️ Visible en production
•	☑️ Visible en mode démo
•	☑️ Autoriser création d’audit
•	☐ Audit obligatoire (bloquant) (optionnel)
•	☑️ Autoriser règles HACCP automatiques
•	☑️ Autoriser génération automatique de non-conformités
•	☑️ Autoriser photos
•	☑️ Photos obligatoires en cas de NOK / CRITICAL
Exemples :
•	Template en test → visible démo uniquement
•	Template validé → visible prod + démo
•	Ancienne version → archivée (lecture seule)
________________________________________
A3. Création d’un audit (ADMIN / MANAGER)
Vue : /admin/audits/new
Champs obligatoires
•	Template (uniquement ACTIFS)
•	Dépôt
•	Zone
•	Auditeur assigné
•	Date planifiée
Options activables
•	☑️ Audit planifié (date future)
•	☑️ Audit récurrent (future évolution)
•	☑️ Génération automatique de NC
•	☑️ Alertes actives (notification interne / email)
•	☑️ Bloc “Traçabilité produit” activable
•	☑️ Validation manager requise en fin d’audit
Règles de visibilité
•	draft → invisible pour l’auditeur
•	assigned → visible et prêt à démarrer
•	disabled → invisible terrain, visible admin
________________________________________
B. TERRAIN – CÔTÉ AUDITEUR
________________________________________
Écran 1 — Liste des audits assignés
Vue : /audits
L’auditeur voit UNIQUEMENT :
•	les audits qui lui sont assignés
•	dont le template est ACTIF
Affichage par audit
•	Nom audit
•	Dépôt / Zone
•	Statut
•	Date planifiée
•	Badge de risque :
o	🟢 Conforme attendu
o	⚠️ Attention possible
o	🔴 Risque critique identifié
________________________________________
Écran 2 — Détail audit (avant démarrage)
Boutons visibles :
•	▶️ Démarrer l’audit
•	👁️ Voir consignes / objectifs HACCP
Sécurité
•	❌ aucune saisie possible
•	❌ aucune photo
•	❌ aucune modification
________________________________________
Écran 3 — Audit démarré
Au clic Démarrer l’audit :
•	started_at enregistré
•	statut → in_progress
•	audit verrouillé pour les autres utilisateurs
________________________________________
SECTION 1 — CHAÎNE DU FROID (CCP)
Q1 — Température frigo principal
Type : Numérique (°C)
Classification HACCP : CCP
Affichage terrain
Température relevée du frigo (°C)
[ 7 ] °C
ⓘ Mesurer au thermomètre
📷 Ajouter une photo
Règle HACCP
•	Min : 4 °C
•	Max : 6 °C
Si valeur = 7
•	Badge 🔴 CRITIQUE
•	Message :
Température hors tolérance HACCP
Une non-conformité va être générée
Effets automatiques
•	Photo obligatoire
•	NC critique créée
•	Audit marqué EN ALERTE
•	Bloc Traçabilité produit affiché :
o	Nom produit
o	Numéro de lot
o	DLC / DDM
o	Quantité concernée
o	Emplacement
•	Bloc Action immédiate obligatoire :
o	Produit isolé ? (oui/non)
o	Action prise
o	Responsable informé ? (oui/non)
________________________________________
Q2 — Porte du frigo correctement fermée
Type : Oui / Non / NA
Classification HACCP : oPRP
Si Non :
•	commentaire obligatoire
•	photo obligatoire
•	gravité ⚠️ Warning
________________________________________
SECTION 2 — PROPRETÉ & NETTOYAGE (PRP)
Q3 — État de propreté général
Type : OK / NOK / NA
Si NOK :
•	commentaire obligatoire
•	photo obligatoire
•	NC automatique (warning)
•	action immédiate requise
________________________________________
Q4 — Plan de nettoyage respecté
Type : Oui / Non
Si Non :
•	NC auto
•	action corrective suggérée affichée
•	responsable informé requis
________________________________________
SECTION 3 — HYGIÈNE DU PERSONNEL (oPRP)
Q5 — Équipements portés
Type : Cases à cocher
☑️ Gants
☑️ Charlotte
☐ Blouse
☑️ Chaussures
Règles :
•	élément obligatoire manquant → ⚠️ Warning
•	commentaire requis
•	photo recommandée
________________________________________
Q6 — Lavage des mains observé
Type : Oui / Non
Si Non :
•	⚠️ Warning
•	commentaire requis
________________________________________
SECTION 4 — PRODUITS & TRAÇABILITÉ
Q7 — DLC respectée
Type : Oui / Non
Classification HACCP : CCP
Si Non :
•	🔴 Critique
•	Question dynamique affichée :
Q7a — Produit concerné
•	Nom produit
•	Numéro de lot
•	DLC
•	Photo obligatoire
Effets
•	NC critique créée
•	Proposition automatique :
Souhaitez-vous signaler un retrait / rappel produit ?
•	L’auditeur ne peut pas déclencher seul le retrait
________________________________________
ÉCRAN FINAL — CLÔTURE AUDIT
Résumé affiché
•	Questions : 8 / 8
•	Critiques : 2
•	Warnings : 1
•	NC générées : 2
Actions
•	✍️ Signature auditeur
•	✅ Terminer l’audit
👉 completed_at enregistré
👉 Audit verrouillé
👉 Rapport généré automatiquement
________________________________________
C. APRÈS – CÔTÉ ADMIN / MANAGER
Vue Audit complété
L’admin voit :
•	Statut global : ❌ NON CONFORME
•	Réponses + photos
•	NC auto + manuelles
•	Actions immédiates prises
•	Traçabilité produit
Actions possibles
•	Valider l’audit
•	Déclencher process retrait / rappel produit
•	Assigner actions correctives
•	Planifier audit de suivi
•	Désactiver temporairement le template si dérive répétée
________________________________________
D. ACTIVATION / DÉSACTIVATION (CRITIQUE)
D1. Désactiver un TEMPLATE
•	non sélectionnable
•	non visible pour nouveaux audits
•	audits existants accessibles en lecture
D2. Désactiver un AUDIT
•	invisible pour auditeur
•	visible admin
•	démarrage impossible
D3. Mode Démo
•	visibilité contrôlée par admin :
o	visible en démo
o	invisible en prod
________________________________________
E. POURQUOI CE MODÈLE EST ROBUSTE (SUISSE-COMPATIBLE)
•	conforme HACCP (CCP / PRP / oPRP)
•	traçabilité produit & lot
•	actions immédiates documentées
•	signatures & validation hiérarchique
•	alertes et escalade contrôlées
•	aucune action non tracée
•	démo = comportement identique à la prod
🦺 AUDIT SÉCURITÉ – SANTÉ & PRÉVENTION DES RISQUES
Logique métier ultra détaillée (terrain + admin – contexte suisse)
________________________________________
A. AVANT LE TERRAIN – CÔTÉ ADMIN / MANAGER
A1. Création du template d’audit Sécurité (ADMIN)
Vue : /admin/templates
Champs obligatoires
•	Code audit : SEC-001
•	Nom : Sécurité – Ronde terrain & prévention
•	Catégorie : SECURITE
•	Version : 1
•	Description
•	Fréquence recommandée : hebdomadaire / mensuelle
•	Portée :
o	☐ zone de travail
o	☐ machines
o	☐ circulation interne
o	☐ incendie
o	☐ personnel
⚠️ Statut du template
•	⭕ Brouillon
•	🟢 Actif
•	🔴 Archivé
🔐 Règle critique
Un template NON ACTIF :
•	n’est pas sélectionnable
•	n’est jamais visible terrain
•	peut rester visible admin uniquement (lecture)
________________________________________
A2. Options de sécurité configurables (ADMIN)
•	☑️ Visible en production
•	☑️ Visible en mode démo
•	☑️ Autoriser photos
•	☑️ Photos obligatoires en cas de danger
•	☑️ Génération automatique de NC
•	☑️ Bloc “Action immédiate” obligatoire si CRITIQUE
•	☑️ Escalade automatique vers manager si CRITIQUE
•	☐ Validation manager obligatoire (optionnel)
________________________________________
A3. Création d’un audit Sécurité (ADMIN / MANAGER)
Vue : /admin/audits/new
Champs obligatoires
•	Template Sécurité (ACTIF)
•	Dépôt
•	Zone
•	Auditeur
•	Date planifiée
Règles de visibilité
•	draft → invisible auditeur
•	assigned → visible auditeur
•	disabled → visible admin uniquement
________________________________________
B. TERRAIN – CÔTÉ AUDITEUR
________________________________________
Écran 1 — Liste audits Sécurité
Vue : /audits
Affichage :
•	Nom audit
•	Zone
•	Date
•	Statut
•	Badge risque :
o	🟢 Aucun danger apparent
o	⚠️ Danger potentiel
o	🔴 Danger immédiat
________________________________________
Écran 2 — Détail audit (avant démarrage)
Boutons :
•	▶️ Démarrer l’audit
•	👁️ Consignes sécurité
Aucune saisie possible avant démarrage.
________________________________________
Écran 3 — Audit démarré
•	started_at enregistré
•	statut → in_progress
•	audit verrouillé
________________________________________
SECTION 1 — CIRCULATION & CHUTES (PRP)
Q1 — Sols dégagés et en bon état
Type : OK / NOK / NA
Risque : PRP
Si NOK :
•	⚠️ Warning
•	Photo obligatoire
•	Action immédiate requise :
o	zone balisée ? (oui/non)
o	danger signalé ? (oui/non)
________________________________________
Q2 — Voies de circulation clairement identifiées
Oui / Non
Si Non :
•	Warning
•	Commentaire requis
________________________________________
SECTION 2 — MACHINES & ÉQUIPEMENTS (CCP SÉCURITÉ)
Q3 — Protections machines en place
Type : Oui / Non
Classification : CCP Sécurité
Si Non :
•	🔴 CRITIQUE
•	Photo obligatoire
•	Bloc “Danger immédiat” affiché :
o	Machine arrêtée ? (oui/non)
o	Accès interdit ? (oui/non)
o	Responsable informé ? (oui/non)
👉 NC critique automatique
________________________________________
Q4 — Arrêt d’urgence accessible et fonctionnel
Oui / Non
Si Non :
•	🔴 CRITIQUE
•	Action immédiate obligatoire
________________________________________
SECTION 3 — ÉQUIPEMENTS DE PROTECTION INDIVIDUELLE (oPRP)
Q5 — Port des EPI obligatoires
Type : Cases à cocher
☑️ Casque
☑️ Chaussures de sécurité
☑️ Gants
☐ Lunettes
Si un EPI obligatoire est manquant :
•	⚠️ Warning
•	Photo recommandée
•	Commentaire requis
________________________________________
SECTION 4 — INCENDIE & URGENCE (CCP)
Q6 — Extincteurs accessibles et non obstrués
Oui / Non
Si Non :
•	🔴 CRITIQUE
•	Photo obligatoire
•	Action immédiate requise
________________________________________
Q7 — Issues de secours dégagées
Oui / Non
Si Non :
•	🔴 CRITIQUE
•	Zone sécurisée obligatoire
________________________________________
SECTION 5 — COMPORTEMENTS À RISQUE
Q8 — Comportement dangereux observé
Oui / Non
Si Oui :
•	Description obligatoire
•	Photo facultative
•	Gravité sélectionnable :
o	⚠️ Danger potentiel
o	🔴 Danger immédiat
________________________________________
ÉCRAN FINAL — CLÔTURE AUDIT SÉCURITÉ
Résumé
•	Points contrôlés : 8 / 8
•	Critiques : X
•	Warnings : Y
•	NC générées : Z
Actions
•	✍️ Signature auditeur
•	✅ Terminer l’audit
👉 completed_at enregistré
👉 Audit verrouillé
👉 Rapport sécurité généré
________________________________________
C. APRÈS – CÔTÉ ADMIN / MANAGER
Vue Audit Sécurité complété
L’admin voit :
•	Carte des dangers
•	Photos
•	Actions immédiates prises
•	NC critiques
•	Historique incidents zone
Actions possibles
•	Arrêt temporaire zone / machine
•	Assignation action corrective
•	Formation ciblée
•	Audit de suivi obligatoire
•	Désactivation template si dérive grave
________________________________________
D. ACTIVATION / DÉSACTIVATION
Désactiver un TEMPLATE
•	plus utilisable
•	audits existants en lecture
Désactiver un AUDIT
•	invisible auditeur
•	visible admin
•	aucune reprise possible
________________________________________
E. POURQUOI CE MODÈLE EST SOLIDE
•	prévention des accidents (priorité suisse)
•	gestion du danger immédiat
•	traçabilité des décisions
•	séparation claire terrain / décision
•	escalade automatique
•	aucune action non justifiée
