# Log des Décisions – Foundations (Étape 01)

## Date
22 janvier 2026

## Objectif
Documenter les décisions spécifiques à l'étape 01

---

## D1-01: Extension auth.users via table public.profiles (1:1)

**Date**: 22/01/2026

**Contexte**: Gérer profil utilisateur + rôle métier avec Supabase Auth

**Décision**: Créer table `public.profiles` avec `id = auth.users.id` (FK), stocker rôle métier dedans

**Alternatives rejetées**:
- **JWT custom claims** (stocker rôle dans token Supabase):
  - **Inconvénient**: Complexité setup (Edge Functions pour sync), changement rôle nécessite régénération token
- **Table profiles indépendante** (user_id différent de auth.uid):
  - **Inconvénient**: Complexité jointures, risque désynchronisation

**Conséquences**:
- ✅ Simplicité: 1 user = 1 id unique
- ✅ Synchronisation automatique (ON DELETE CASCADE)
- ✅ Flexibilité: Changer rôle sans régénérer JWT
- ⚠️ Requête supplémentaire pour récupérer rôle (mitigé par fonction `get_current_user_role()` cachée)

**Statut**: ✅ Acceptée

---

## D1-02: Fonction helper get_current_user_role() pour RLS

**Date**: 22/01/2026

**Contexte**: Simplifier policies RLS (éviter répétition SELECT profiles WHERE id = auth.uid())

**Décision**: Créer fonction `get_current_user_role()` SECURITY DEFINER, retourne `role_type`

**Alternatives rejetées**:
- **Répéter SELECT dans chaque policy**:
  - **Inconvénient**: Duplication code, maintenance difficile
- **JWT custom claims** (rôle dans token):
  - **Inconvénient**: Complexité (voir D1-01)

**Conséquences**:
- ✅ Code RLS lisible: `USING (get_current_user_role() = 'admin_dev')`
- ✅ Maintenance centralisée (changement logique → 1 fonction)
- ⚠️ SECURITY DEFINER nécessaire (fonction exécutée avec droits créateur)
- ⚠️ Overhead léger (1 query supplémentaire), mais cache Supabase session

**Statut**: ✅ Acceptée

---

## D1-03: Trigger prevent_role_status_self_change (sécurité)

**Date**: 22/01/2026

**Contexte**: Empêcher user de modifier son propre rôle/statut (escalade privilèges)

**Décision**: Créer trigger BEFORE UPDATE sur `users`, restaure `role` et `status` si modifiés par self (sauf admin_dev)

**Alternatives rejetées**:
- **Validation côté client uniquement**:
  - **Inconvénient**: Contournable (appels API directs)
- **Policy RLS WITH CHECK complexe**:
  - **Inconvénient**: Syntaxe lourde, moins lisible

**Conséquences**:
- ✅ Sécurité renforcée (protection DB-level)
- ✅ Transparent pour user (UPDATE exécuté, mais champs restaurés)
- ⚠️ Complexité trigger (mais documenté)

**Statut**: ✅ Acceptée

---

## D1-04: Trigger uppercase depot code (normalisation)

**Date**: 22/01/2026

**Contexte**: Éviter doublons casse (DEP001 vs dep001)

**Décision**: Trigger BEFORE INSERT/UPDATE sur `depots.code`, force UPPER()

**Alternatives rejetées**:
- **Validation applicative uniquement**:
  - **Inconvénient**: Risque incohérence si insertion SQL directe
- **Contrainte CHECK case-insensitive**:
  - **Inconvénient**: PostgreSQL pas de CHECK case-insensitive natif, regex complexe

**Conséquences**:
- ✅ Cohérence garantie (casse normalisée DB-level)
- ✅ UX simplifiée (user tape lowercase, DB convertit)
- ⚠️ Complexité légère (trigger supplémentaire)

**Statut**: ✅ Acceptée

---

## D1-05: UUID plutôt que SERIAL (IDs)

**Date**: 22/01/2026

**Contexte**: Choix type clé primaire (profiles, depots, zones)

**Décision**: Utiliser UUID v4 (`gen_random_uuid()`)

**Alternatives rejetées**:
- **SERIAL (INT auto-increment)**:
  - **Inconvénient**: Prédictible (énumération facile), limite scalabilité distribution, incompatible Supabase Auth (UUID)

**Conséquences**:
- ✅ Sécurité: IDs non prédictibles
- ✅ Compatibilité Supabase Auth (`auth.users.id` = UUID)
- ✅ Distribution: Génération UUID côté client possible (offline, bulk inserts)
- ⚠️ Performance légèrement inférieure (index UUID > index INT), mais négligeable volumétrie QHSE

**Statut**: ✅ Acceptée

---

## D1-06: TIMESTAMPTZ (avec timezone) pour dates

**Date**: 22/01/2026

**Contexte**: Choix type colonnes `created_at`, `updated_at`

**Décision**: Utiliser `TIMESTAMPTZ` (TIMESTAMP WITH TIME ZONE)

**Alternatives rejetées**:
- **TIMESTAMP (sans timezone)**:
  - **Inconvénient**: Incohérences DST (Daylight Saving Time), dépôts internationaux futurs

**Conséquences**:
- ✅ Support multi-timezone (dépôts Paris, Lyon, internationaux futurs)
- ✅ Conversion automatique selon timezone client
- ⚠️ Légèrement plus complexe (mais géré automatiquement par PostgreSQL)

**Statut**: ✅ Acceptée

---

## D1-07: Zones.code unique PAR dépôt (UNIQUE composite)

**Date**: 22/01/2026

**Contexte**: Contrainte unicité code zone

**Décision**: `UNIQUE(depot_id, code)` (code unique AU SEIN d'un dépôt, pas globalement)

**Alternatives rejetées**:
- **Code unique globalement** (UNIQUE code seul):
  - **Inconvénient**: Contrainte métier non nécessaire (deux dépôts peuvent avoir "Z01")

**Conséquences**:
- ✅ Flexibilité: DEP001/Z01 et DEP002/Z01 autorisés
- ✅ Cohérence métier respectée
- ⚠️ Requiert validation applicative "zone existe dans CE dépôt"

**Statut**: ✅ Acceptée

---

## D1-08: Stratégie de suppression (soft delete + DELETE admin_dev)

**Date**: 22/01/2026

**Contexte**: Suppression profiles/depots/zones

**Décision FINALE**: 
- **Profiles**: **Soft delete OBLIGATOIRE** (`status = 'inactive'`) - **AUCUN hard delete** (préserve historique audits)
- **Depots/Zones**: **DELETE physique AUTORISÉ** pour admin_dev uniquement (CASCADE zones→depots)
  - Avant DELETE: vérifier aucun audit lié (responsabilité admin_dev)
  - Préférer soft delete si doute

**Alternatives rejetées**:
- **OPTION 1 - Soft delete uniquement (profiles + depots + zones)**:
  - **Inconvénient**: Accumulation données inutiles (depots fermés depuis 10 ans)
  - **Inconvénient**: Complexité WHERE status='active' partout
- **Hard delete systématique**:
  - **Inconvénient**: Perte historique audits (auditeur supprimé → audits orphelins)

**Conséquences**:
- ✅ Historique préservé profiles (audits passés conservent auditeur)
- ✅ Traçabilité (qui a fait quoi)
- ✅ Flexibilité admin_dev (cleanup depots test, doublons)
- ⚠️ Responsabilité admin_dev: vérifier dépendances avant DELETE
- ⚠️ Filtrage status='active' pour profiles dans queries

**Implémentation RLS**:
```sql
-- admin_dev: seul rôle autorisé DELETE physique
CREATE POLICY admin_dev_delete_profiles ON profiles
  FOR DELETE
  USING (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_delete_depots ON depots
  FOR DELETE
  USING (get_current_user_role() = 'admin_dev');

CREATE POLICY admin_dev_delete_zones ON zones
  FOR DELETE
  USING (get_current_user_role() = 'admin_dev');
```

**Documentation obligatoire** (README admin):
1. Avant DELETE profile → vérifier aucun audit assigné
2. Avant DELETE depot → vérifier aucun audit lié
3. Si doute → utiliser soft delete (`UPDATE ... SET status='inactive'`)

**Statut**: ✅ Acceptée (validation finale 22/01/2026)

---

## D1-09: RLS qhse_manager ne peut pas supprimer depots/zones

**Date**: 22/01/2026

**Contexte**: Droits qhse_manager sur depots/zones

**Décision**: qhse_manager peut INSERT, UPDATE, SELECT, mais **pas DELETE** (seul admin_dev)

**Alternatives rejetées**:
- **DELETE autorisé**:
  - **Inconvénient**: Risque suppression accidentelle (données critiques)

**Conséquences**:
- ✅ Sécurité renforcée (principe moindre privilège)
- ✅ Suppression = opération admin uniquement
- ⚠️ Workflow: qhse_manager doit demander à admin_dev pour supprimer (acceptable, rare)

**Statut**: ✅ Acceptée

---

## D1-10: Lecture profiles autorisée pour tous rôles

**Date**: 22/01/2026

**Contexte**: Visibilité liste utilisateurs

**Décision**: Tous rôles (admin, manager, auditeurs, viewer) peuvent SELECT profiles (lecture seule)

**Alternatives rejetées**:
- **Restreindre lecture à admin/manager uniquement**:
  - **Inconvénient**: Complexité UI assignations audits (auditeur ne voit pas collègues)

**Conséquences**:
- ✅ Transparence équipe (voir collègues)
- ✅ Simplification assignations audits (étapes futures)
- ⚠️ Emails visibles par tous (acceptable dans contexte entreprise)

**Statut**: ✅ Acceptée

---

## D1-11: Auth Supabase Email/Password (pas OAuth pour étape 01)

**Date**: 22/01/2026

**Contexte**: Méthode authentification production

**Décision**: Implémenter Email/Password uniquement pour étape 01, OAuth (Google) reporté étape future si besoin

**Alternatives rejetées**:
- **OAuth Google immédiatement**:
  - **Inconvénient**: Complexité setup (client ID, redirect URLs), pas critique pour MVP

**Conséquences**:
- ✅ Simplicité setup étape 01
- ✅ Auth fonctionnelle rapidement
- ⚠️ OAuth ajouté plus tard si demandé (étape 06+)

**Statut**: ✅ Acceptée

---

## D1-12: Pas de table audit_logs pour étape 01

**Date**: 22/01/2026

**Contexte**: Traçabilité modifications sensibles (profiles, depots)

**Décision**: Reporter audit logs à étape future (06+), pas critique pour MVP

**Alternatives rejetées**:
- **Implémenter audit_logs immédiatement**:
  - **Inconvénient**: Overhead développement, pas bloquant pour fonctionnalités core

**Conséquences**:
- ✅ Simplification étape 01 (focus fondations)
- ⚠️ Pas de traçabilité complète modifications (acceptable MVP)
- ⏳ Audit logs ajouté étape future si nécessaire

**Statut**: ✅ Acceptée

---

## D1-13: CASCADE depot → zones (ON DELETE CASCADE)

**Date**: 22/01/2026

**Contexte**: Comportement suppression dépôt

**Décision**: FK `zones.depot_id` avec `ON DELETE CASCADE` (zones supprimées automatiquement si dépôt supprimé)

**Alternatives rejetées**:
- **ON DELETE RESTRICT** (bloquer suppression si zones existent):
  - **Inconvénient**: Nécessite suppression manuelle zones avant dépôt (workflow lourd)
- **ON DELETE SET NULL**:
  - **Inconvénient**: Zones orphelines (incohérent métier)

**Conséquences**:
- ✅ Intégrité référentielle garantie (pas de zones orphelines)
- ✅ Workflow simplifié (suppression dépôt → cascade automatique)
- ⚠️ Risque suppression accidentelle massive (mitigé par: seul admin_dev peut DELETE depots)

**Statut**: ✅ Acceptée

---

## D1-14: Index sur colonnes fréquemment filtrées

**Date**: 22/01/2026

**Contexte**: Performance queries SELECT

**Décision**: Créer index sur:
- `profiles.email`, `profiles.role`, `profiles.status`
- `depots.code`, `depots.city`, `depots.status`
- `zones.depot_id`, `zones.type`, `zones.status`

**Alternatives rejetées**:
- **Pas d'index (laisser PostgreSQL auto-optimizer)**:
  - **Inconvénient**: Performance dégradée sur filtres fréquents (WHERE role = 'qh_auditor')

**Conséquences**:
- ✅ Performance queries améliorée (scan index vs table scan)
- ✅ Anticipation volumétrie future (100+ profiles, 50+ dépôts)
- ⚠️ Overhead léger INSERT/UPDATE (maintenance index), mais négligeable

**Statut**: ✅ Acceptée

---

## D1-15: Validation email basique (CHECK contient '@')

**Date**: 22/01/2026

**Contexte**: Validation format email DB-level

**Décision**: `CHECK (email ~ '@')` (regex simple)

**Alternatives rejetées**:
- **Regex email complexe RFC 5322**:
  - **Inconvénient**: Lourdeur syntaxe PostgreSQL, validation applicative suffit
- **Pas de validation DB**:
  - **Inconvénient**: Risque emails invalides si insertion SQL directe

**Conséquences**:
- ✅ Protection basique DB-level
- ✅ Validation complète côté applicatif (formulaires)
- ⚠️ Accepte emails syntaxiquement invalides (ex: "a@b", acceptable car validation app)

**Statut**: ✅ Acceptée

---

## Prochaines décisions attendues (étape 02+)

### Étape 02 (Templates/Questions)
- Format stockage questions (JSON vs tables normalisées)
- Versioning templates (soft copy vs hard copy)

### Étape 03 (Audits)
- Génération PDF rapports (librairie)
- Storage photos (path structure, permissions)

### Étape 04 (NC)
- Workflow CAPA (plans d'actions correctives)
- Notifications (email/SMS)

---

**Statut**: ✅ Log de décisions étape 01 complet
