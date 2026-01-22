# Log des Décisions – QHSE Étape 0 (Cadrage)

## Date
22 janvier 2026

## Format des entrées
Chaque décision suit le format:
- **ID**: D0-XX (D = Decision, 0 = étape 0, XX = numéro séquentiel)
- **Date**: JJ/MM/AAAA
- **Contexte**: Pourquoi cette décision était nécessaire
- **Décision**: Ce qui a été choisi
- **Alternatives rejetées**: Autres options envisagées et pourquoi rejetées
- **Conséquences**: Impact sur le projet
- **Statut**: Acceptée / En discussion / Rejetée

---

## D0-01: Utilisation de JavaScript pur (pas TypeScript)

**Date**: 22/01/2026

**Contexte**: Choix du langage pour le projet QHSE (Next.js frontend)

**Décision**: Utiliser JavaScript uniquement (.js), pas de TypeScript (.ts, .tsx)

**Alternatives rejetées**:
- TypeScript: Overhead transpilation, configuration complexe (tsconfig.json), courbe d'apprentissage pour contributeurs non-TS
- Flow: Moins mature que TypeScript, écosystème limité

**Conséquences**:
- ✅ Simplification setup et build
- ✅ Prototypage rapide
- ⚠️ Pas de type-safety compile-time (compensé par validation runtime + JSDoc)
- ⚠️ Refactoring moins sécurisé (compensé par tests)

**Statut**: ✅ Acceptée

---

## D0-02: Supabase comme backend unique

**Date**: 22/01/2026

**Contexte**: Choix de la stack backend (Auth, DB, Storage)

**Décision**: Utiliser Supabase (Auth + PostgreSQL + Storage) comme backend unique en production

**Alternatives rejetées**:
- Firebase: NoSQL (Firestore) moins adapté aux relations complexes (dépôts ↔ zones ↔ audits ↔ NC), RLS moins robuste
- Backend Node.js custom (Express/Fastify + PostgreSQL): Overhead maintenance, nécessite développement Auth, Storage, gestion infrastructure
- Hasura: Complexité configuration, moins adapté pour MVP, coût

**Conséquences**:
- ✅ RLS natif PostgreSQL (sécurité renforcée)
- ✅ Auth intégré (OAuth Google, Email/Password)
- ✅ Storage intégré (photos audits/NC)
- ✅ Pricing généreux (gratuit jusqu'à 500 MB DB + 1 GB Storage)
- ⚠️ Dépendance à un vendor (mitigé par utilisation PostgreSQL standard)

**Statut**: ✅ Acceptée

---

## D0-03: Mode Démo SANS Supabase

**Date**: 22/01/2026

**Contexte**: Nécessité de démo publique sans backend (pas de compte Supabase requis)

**Décision**: Implémenter mode démo complet avec:
- ZÉRO appel réseau
- ZÉRO import supabaseClient.js en démo
- Données mockées stables (mockData.js)
- Auth démo (demoAuth.js + localStorage)
- Routage via apiWrapper.js

**Alternatives rejetées**:
- Démo avec Supabase partagé: Risque pollution données, sécurité (users démo pourraient voir données autres users), coût
- Démo avec données aléatoires (faker): Incohérence, pas reproductible, difficile à débugger

**Conséquences**:
- ✅ Démo déployable sans backend (Vercel static ou edge)
- ✅ Expérience utilisateur complète (parcours cliquables)
- ✅ Tests plus faciles (données stables)
- ⚠️ Maintenance double logique (démo + prod) → mitigé par apiWrapper.js

**Statut**: ✅ Acceptée

---

## D0-04: apiWrapper.js comme point d'entrée unique

**Date**: 22/01/2026

**Contexte**: Éviter duplication logique démo/prod dans chaque composant

**Décision**: Créer apiWrapper.js qui:
- Détecte mode (DEMO_MODE via demoConfig.js)
- Route vers mockData.js (démo) ou supabaseClient.js (prod)
- Expose API uniforme (getAudits, createAudit, etc.)

**Alternatives rejetées**:
- if (DEMO_MODE) dans chaque composant: Code spaghetti, duplication, difficile à maintenir
- Feature flags avancés (LaunchDarkly): Overkill pour ce besoin simple
- Deux builds séparés (démo/prod): Complexité CI/CD, duplication code

**Conséquences**:
- ✅ Isolation logique démo/prod
- ✅ Composants agnostiques du mode
- ✅ Tests unitaires facilités (mock API indépendante)
- ⚠️ Légère couche d'abstraction supplémentaire (négligeable)

**Statut**: ✅ Acceptée

---

## D0-05: Row Level Security (RLS) obligatoire dès création tables

**Date**: 22/01/2026

**Contexte**: Sécuriser données en production (isolation multi-utilisateurs)

**Décision**: Activer RLS sur TOUTES les tables sensibles dès création, avec policies par rôle

**Alternatives rejetées**:
- Sécurité applicative uniquement (middleware Next.js): Contournable (appels directs Supabase API), moins robuste
- RLS ajoutée plus tard: Risque oubli, données exposées pendant dev

**Conséquences**:
- ✅ Sécurité renforcée (defense in depth)
- ✅ Isolation données par utilisateur/rôle
- ⚠️ Complexité policies (mais documenté dans 03_rls_policies.md)
- ⚠️ Tests RLS nécessaires (mais prévu dans 04_tests_validation.md)

**Statut**: ✅ Acceptée

---

## D0-06: Documentation avant implémentation

**Date**: 22/01/2026

**Contexte**: Éviter dérives, incohérences, refactoring coûteux

**Décision**: Imposer création fichiers docs (spec_metier, schema_db, rls_policies, tests_validation) AVANT écriture code ou migration SQL

**Alternatives rejetées**:
- Documentation après implémentation: Risque désynchronisation doc/code, décisions implicites non documentées
- Pas de documentation: Impossible maintenance/onboarding, décisions perdues

**Conséquences**:
- ✅ Cohérence métier ↔ technique garantie
- ✅ Validation humaine facilitée (revue doc < revue code)
- ✅ Onboarding simplifié
- ⚠️ Overhead initial (mais rentabilisé sur long terme)

**Statut**: ✅ Acceptée

---

## D0-07: Validation humaine obligatoire avant passage étape suivante

**Date**: 22/01/2026

**Contexte**: Éviter accumulation dette technique, incohérences propagées

**Décision**: STOP après chaque étape (rapport de contrôle), attendre message explicite "Étape XX validée, tu peux continuer."

**Alternatives rejetées**:
- Validation automatique (tests): Pas suffisant pour valider cohérence métier globale
- Validation optionnelle: Risque dérive, décisions non challengées

**Conséquences**:
- ✅ Qualité garantie à chaque étape
- ✅ Feedback loop rapide
- ✅ Corrections moins coûteuses (détection précoce)
- ⚠️ Délai d'attente validation (acceptable pour éviter refactoring massif)

**Statut**: ✅ Acceptée

---

## D0-08: Next.js App Router (pas Pages Router)

**Date**: 22/01/2026

**Contexte**: Choix architecture routing Next.js

**Décision**: Utiliser Next.js 14+ App Router (app/), pas Pages Router (pages/)

**Alternatives rejetées**:
- Pages Router: Ancien système, moins de features (Server Components), migration future nécessaire
- React Router (SPA): Pas de SSR, moins optimisé pour SEO

**Conséquences**:
- ✅ Server Components (performance)
- ✅ Routing moderne (layouts imbriqués)
- ✅ Future-proof (direction officielle Next.js)
- ⚠️ Courbe apprentissage (App Router récent) → mitigé par documentation

**Statut**: ✅ Acceptée

---

## D0-09: Pas de migration SQL tant que doc non finalisée

**Date**: 22/01/2026

**Contexte**: Éviter migrations prématurées, refactoring DB coûteux

**Décision**: AUCUNE migration SQL exécutée tant que:
- Doc étape complète (spec, schéma, RLS, tests)
- Rapport de contrôle généré
- Validation humaine obtenue

**Alternatives rejetées**:
- Migration itérative (modif DB au fil de l'eau): Risque incohérences, rollback complexe, pollution historique migrations

**Conséquences**:
- ✅ Schéma DB stable dès première migration
- ✅ Moins de migrations (historique propre)
- ✅ Validation cohérence avant commit DB
- ⚠️ Délai mise en prod (acceptable pour qualité)

**Statut**: ✅ Acceptée

---

## D0-10: Variables d'environnement Vercel (pas de clés dans code)

**Date**: 22/01/2026

**Contexte**: Sécurité clés API Supabase

**Décision**: 
- Clés stockées dans variables d'environnement Vercel (prod)
- .env.local pour dev local (gitignored)
- .env.example commité (placeholders uniquement)

**Alternatives rejetées**:
- Clés en dur dans code: INTERDIT (sécurité, exposition publique GitHub)
- Clés dans fichiers config committés: INTERDIT (même problème)

**Conséquences**:
- ✅ Sécurité garantie
- ✅ Rotation clés facilitée (changement env vars)
- ⚠️ Setup dev nécessite copie .env.example → .env.local (documenté)

**Statut**: ✅ Acceptée

---

## D0-11: Données mock stables (pas de faker/aléatoire)

**Date**: 22/01/2026

**Contexte**: Reproductibilité démo, debug facilité

**Décision**: mockData.js contient données fixes (IDs, noms, dates hardcodées), pas de génération aléatoire

**Alternatives rejetées**:
- Faker.js: Données différentes à chaque rechargement, difficile debug, incohérent pour démo

**Conséquences**:
- ✅ Démo reproductible (même parcours = même résultat)
- ✅ Debug facilité (IDs prévisibles)
- ✅ Tests plus faciles
- ⚠️ Maintenance manuelle mockData (acceptable, peu fréquent)

**Statut**: ✅ Acceptée

---

## D0-12: Arborescence /docs structurée par étape

**Date**: 22/01/2026

**Contexte**: Organisation documentation projet

**Décision**: Créer /docs avec:
- /00_cadrage (spec globale, architecture)
- /01_foundations (DB, Auth)
- /02_templates (templates d'audit)
- /03_audits (module audits)
- /04_non_conformities (module NC)
- /05_dashboard (KPI)
- /QHSE (rapports centralisés)

**Alternatives rejetées**:
- Documentation flat (tous fichiers à la racine /docs): Difficile navigation, pas de regroupement logique
- Documentation externe (Notion, Confluence): Risque désynchronisation code/doc

**Conséquences**:
- ✅ Navigation facilitée
- ✅ Doc versionnée avec code (Git)
- ✅ Structure claire par feature
- ⚠️ Nécessite discipline nommage fichiers (mitigé par convention)

**Statut**: ✅ Acceptée

---

## Prochaines décisions attendues

### Étape 01 (Foundations)
- Choix Auth Supabase (OAuth Google vs Email/Password vs les deux)
- Gestion rôles (table users.role vs Supabase custom claims)
- Stratégie Storage photos (path, permissions)

### Étape 02 (Templates)
- Format stockage questions (JSON vs tables normalisées)
- Versioning templates (soft vs hard copy)

### Étape 03+ (Features)
- UI framework (Tailwind CSS vs autre)
- Gestion formulaires (React Hook Form vs controlled components)
- Graphiques dashboard (Chart.js vs Recharts vs D3)

---

**Statut**: ✅ Log de décisions étape 0 initialisé
