# Spécifications Métier – Foundations (Étape 01)

## Date
22 janvier 2026

## Objectif de l'étape
Mettre en place les fondations du système:
- Authentification utilisateurs
- Gestion des rôles et permissions
- Structure de base des dépôts et zones
- Infrastructure RLS Supabase

## Inclus dans cette étape

### 1. Authentification
- Système Auth Supabase (Email/Password)
- Session management
- Login/Logout
- Récupération mot de passe (optionnel étape 01, peut être reporté)

### 2. Utilisateurs et rôles
- Table `profiles` (extends auth.users (relation 1:1 via profiles) Supabase)
- 5 rôles métier: admin_dev, qhse_manager, qh_auditor, safety_auditor, viewer
- Profil utilisateur (nom, prénom, email, rôle, statut actif/inactif)

### 3. Dépôts (Depots)
- CRUD dépôts
- Attributs: code unique, nom, ville, adresse, contact (nom, email, téléphone)
- Statut: active, inactive

### 4. Zones
- CRUD zones
- Rattachement à un dépôt
- Types: warehouse, loading, office, production, cold_storage
- Statut: active, inactive

## Exclu de cette étape

- Templates d'audit (étape 02)
- Questions (étape 02)
- Audits et réponses (étape 03)
- Non-conformités (étape 04)
- Dashboard KPI (étape 05)
- UI avancée (wireframes suffisent, implémentation étapes suivantes)

## Règles métier détaillées

### R1-01: Unicité code dépôt
- Code dépôt UNIQUE (ex: "DEP001", "PAR75", "LYO69")
- Format: alphanumérique, 3-10 caractères
- Insensible à la casse (stocké uppercase)

### R1-02: Rattachement zone → dépôt
- Une zone appartient à UN SEUL dépôt
- Contrainte FK: zones.depot_id → depots.id (ON DELETE CASCADE)
- Si dépôt supprimé → zones supprimées aussi

### R1-03: Code zone unique dans un dépôt
- Code zone unique AU SEIN d'un dépôt (ex: "Z01", "QUAI-A")
- Contrainte UNIQUE (depot_id, code)
- Deux dépôts peuvent avoir zones avec même code (ex: DEP001/Z01 et DEP002/Z01)

### R1-04: Rôles utilisateurs
- Un utilisateur a UN SEUL rôle (pas multi-rôles pour simplifier étape 01)
- Rôle stocké dans users.role (type ENUM)
- Rôle non modifiable par l'utilisateur lui-même (sauf admin_dev)

### R1-05: Statut utilisateur actif/inactif
- Utilisateur inactif → ne peut plus se connecter (vérification Auth Supabase)
- Utilisateur inactif → données historiques préservées (audits passés)
- admin_dev peut réactiver utilisateur

### R1-06: Suppression logique vs physique
- Dépôts/zones: suppression physique OK si pas d'audits liés (contrainte étapes suivantes)
- Users: suppression logique (inactif) préférée pour historique audits

## Acteurs et droits (RLS basis)

### admin_dev
- **Depots**: SELECT, INSERT, UPDATE, DELETE tous dépôts
- **Zones**: SELECT, INSERT, UPDATE, DELETE toutes zones
- **Users**: SELECT, INSERT, UPDATE (role, status) tous users

### qhse_manager
- **Depots**: SELECT tous, INSERT, UPDATE tous
- **Zones**: SELECT toutes, INSERT, UPDATE toutes
- **Users**: SELECT tous (lecture seule, pas de modification rôles)

### qh_auditor
- **Depots**: SELECT tous (lecture)
- **Zones**: SELECT toutes (lecture)
- **Users**: SELECT tous (lecture, pour voir collègues)

### safety_auditor
- **Depots**: SELECT tous (lecture)
- **Zones**: SELECT toutes (lecture)
- **Users**: SELECT tous (lecture)

### viewer
- **Depots**: SELECT tous (lecture)
- **Zones**: SELECT toutes (lecture)
- **Users**: SELECT tous (lecture)

## Parcours utilisateurs

### Parcours 1: admin_dev crée dépôt et zones
1. Login en tant que admin_dev
2. Accéder section "Dépôts"
3. Cliquer "Créer dépôt"
4. Remplir formulaire:
   - Code: DEP001
   - Nom: Entrepôt Paris Nord
   - Ville: Paris
   - Adresse: 123 rue de la République
   - Contact: Jean Dupont, jean.dupont@example.com, 0612345678
5. Sauvegarder → dépôt créé (statut active par défaut)
6. Accéder détail dépôt → section "Zones"
7. Cliquer "Créer zone"
8. Remplir formulaire:
   - Code: Z01
   - Nom: Zone stockage principal
   - Type: warehouse
9. Sauvegarder → zone créée (statut active)
10. Répéter pour zone Z02 (type: loading, nom: Quai de chargement)

### Parcours 2: qhse_manager consulte dépôts
1. Login en tant que qhse_manager
2. Accéder section "Dépôts"
3. Voir liste dépôts (tous visibles)
4. Cliquer sur dépôt DEP001
5. Voir détails + liste zones associées
6. (peut modifier dépôt/zones si nécessaire)

### Parcours 3: qh_auditor consulte zones pour préparer audit (anticipation étape 03)
1. Login en tant que qh_auditor
2. Accéder section "Dépôts"
3. Filtrer par ville (ex: Paris)
4. Cliquer sur dépôt
5. Voir zones (lecture seule)
6. (plus tard: créer audit pour cette zone)

### Parcours 4: admin_dev gère utilisateurs
1. Login admin_dev
2. Accéder section "Utilisateurs"
3. Voir liste profiles (email, nom, rôle, statut)
4. Cliquer "Inviter utilisateur"
5. Remplir formulaire:
   - Email: auditeur@example.com
   - Nom: Marie Martin
   - Rôle: qh_auditor
6. Envoyer invitation (email Supabase Auth)
7. Utilisateur reçoit email, définit mot de passe
8. Utilisateur actif, rôle qh_auditor

### Parcours 5: viewer consulte dépôts (lecture seule)
1. Login viewer
2. Accéder "Dépôts"
3. Voir liste (lecture seule, pas de boutons CRUD)
4. Cliquer détail dépôt
5. Voir zones (lecture seule)

## Cas limites

### C1-01: Dépôt sans zones
- Autorisé (dépôt peut être créé avant zones)
- Pas de contrainte "au moins 1 zone"

### C1-02: Zone orpheline (dépôt supprimé)
- Impossible grâce ON DELETE CASCADE
- Si dépôt supprimé → zones automatiquement supprimées

### C1-03: Utilisateur change de rôle
- Possible par admin_dev uniquement
- Implications audits assignés: réassignation manuelle (étape 03)

### C1-04: Utilisateur passe inactif
- Ne peut plus se connecter
- Audits passés préservés (auditeur historique)
- Audits en cours: réassignation manuelle par qhse_manager

### C1-05: Deux dépôts même code
- INTERDIT (contrainte UNIQUE sur code)
- Message erreur: "Code dépôt déjà existant"

### C1-06: Email utilisateur déjà existant
- INTERDIT (email est identifiant Auth Supabase)
- Message erreur: "Utilisateur déjà enregistré"

## Données de référence (seed data production)

Optionnel pour étape 01, peut être ajouté en migration initiale:

### Utilisateur admin par défaut
- Email: admin@qhse.local
- Nom: Admin System
- Rôle: admin_dev
- Mot de passe: défini lors premier setup

### Types de zones (ENUM)
- warehouse (Entrepôt)
- loading (Quai de chargement)
- office (Bureau)
- production (Production)
- cold_storage (Chambre froide)

### Rôles (ENUM)
- admin_dev
- qhse_manager
- qh_auditor
- safety_auditor
- viewer

## Contraintes techniques

### CT1-01: Auth Supabase
- Utiliser auth.users table native Supabase
- Étendre avec table public.profiles (id = auth.uid())
- RLS basée sur auth.uid()

### CT1-02: Soft delete vs Hard delete
- Étape 01: hard delete dépôts/zones OK (pas d'audits encore)
- Étape 03+: ajouter soft delete si nécessaire

### CT1-03: Validation côté DB
- Contraintes CHECK (code format, email format)
- Contraintes NOT NULL (champs obligatoires)
- Triggers optionnels (ex: uppercase code dépôt)

## Livrables attendus

1. **02_schema_db.md**: Tables profiles, depots, zones avec relations, contraintes
2. **03_rls_policies.md**: Policies RLS par table et par rôle
3. **04_tests_validation.md**: Scénarios test CRUD + RLS
4. **05_exemples_ui.md**: Wireframes pages Dépôts, Zones, Users
5. **06_decisions_log.md**: Décisions étape 01 (Auth strategy, role management, etc.)
6. **07_migration_finale.sql**: Migration SQL complète (à appliquer après validation)

---

**Statut**: ✅ Spec métier étape 01 prête (placeholder, sera complétée après étape 0)
