# Tests de Validation – Foundations (Étape 01)

## Date
22 janvier 2026

## Objectif
Définir les scénarios de test pour valider le schéma DB et RLS étape 01

---

## 1. SCÉNARIOS OK (Fonctionnement nominal)

### T01-OK: Créer utilisateur (admin_dev)

**Contexte**: admin_dev crée un nouvel utilisateur qh_auditor

**Setup**:
```sql
-- Se connecter en tant que admin_dev (simulation)
SET LOCAL role TO 'admin_dev_user';
```

**Action**:
```sql
INSERT INTO profiles (id, first_name, last_name, email, role, status)
VALUES (
  'test-user-001'::uuid,
  'Test',
  'User',
  'test.user@qhse.com',
  'qh_auditor',
  'active'
);
```

**Résultat attendu**:
- ✅ 1 ligne insérée
- ✅ `profiles.created_at` auto-rempli (trigger)
- ✅ `profiles.updated_at` auto-rempli

**Validation**:
```sql
SELECT * FROM profiles WHERE id = 'test-user-001'::uuid;
-- Doit retourner 1 ligne avec role = 'qh_auditor'
```

---

### T02-OK: Créer dépôt (qhse_manager)

**Contexte**: qhse_manager crée un nouveau dépôt

**Action**:
```sql
INSERT INTO depots (code, name, city, address, contact_name, contact_email)
VALUES (
  'dep002',  -- Sera converti en 'DEP002' par trigger
  'Entrepôt Lyon',
  'Lyon',
  '456 avenue Jean Jaurès, 69007 Lyon',
  'Claire Martin',
  'claire.martin@depot-lyon.com'
);
```

**Résultat attendu**:
- ✅ 1 ligne insérée
- ✅ `code` converti en 'DEP002' (trigger uppercase)
- ✅ `status` = 'active' (default)
- ✅ UUID généré automatiquement

**Validation**:
```sql
SELECT * FROM depots WHERE code = 'DEP002';
-- Doit retourner 1 ligne avec code = 'DEP002' (uppercase)
```

---

### T03-OK: Créer zone rattachée à dépôt (qhse_manager)

**Contexte**: qhse_manager crée zone dans dépôt existant

**Prérequis**:
```sql
-- Dépôt DEP001 existe
SELECT id FROM depots WHERE code = 'DEP001';
```

**Action**:
```sql
INSERT INTO zones (depot_id, code, name, type, status)
VALUES (
  (SELECT id FROM depots WHERE code = 'DEP001'),
  'Z03',
  'Zone production',
  'production',
  'active'
);
```

**Résultat attendu**:
- ✅ 1 ligne insérée
- ✅ FK depot_id valide
- ✅ Contrainte UNIQUE(depot_id, code) OK

**Validation**:
```sql
SELECT z.*, d.code AS depot_code
FROM zones z
JOIN depots d ON z.depot_id = d.id
WHERE z.code = 'Z03';
-- Doit retourner 1 ligne avec depot_code = 'DEP001'
```

---

### T04-OK: Lire tous dépôts (qh_auditor, lecture seule)

**Contexte**: qh_auditor consulte liste dépôts

**Action**:
```sql
-- Simuler connexion qh_auditor
SET LOCAL role TO 'qh_auditor_user';

SELECT * FROM depots WHERE status = 'active';
```

**Résultat attendu**:
- ✅ Retourne tous dépôts actifs (RLS policy autorise SELECT)
- ✅ Aucune erreur permission

---

### T05-OK: Lire zones par dépôt (safety_auditor)

**Contexte**: safety_auditor consulte zones d'un dépôt

**Action**:
```sql
SET LOCAL role TO 'safety_auditor_user';

SELECT z.*, d.name AS depot_name
FROM zones z
JOIN depots d ON z.depot_id = d.id
WHERE d.code = 'DEP001';
```

**Résultat attendu**:
- ✅ Retourne zones du dépôt DEP001
- ✅ JOIN fonctionne (RLS sur les deux tables autorise SELECT)

---

### T06-OK: User modifie son prénom (self-update limité)

**Contexte**: User modifie son propre profil (champs autorisés)

**Action**:
```sql
-- Simuler user-qh-001
SET LOCAL role TO 'qh_auditor_user';
SET LOCAL request.jwt.claims.sub TO 'user-qh-001';

UPDATE profiles
SET first_name = 'Marie-Claire'
WHERE id = 'user-qh-001'::uuid;
```

**Résultat attendu**:
- ✅ 1 ligne modifiée
- ✅ `first_name` changé
- ✅ `role` et `status` INCHANGÉS (trigger protection)
- ✅ `updated_at` auto-mis à jour

---

### T07-OK: Suppression cascade zone (admin_dev supprime dépôt)

**Contexte**: admin_dev supprime dépôt → zones supprimées automatiquement

**Setup**:
```sql
-- Créer dépôt test avec zone
INSERT INTO depots (id, code, name, city, address) VALUES
  ('depot-test-del'::uuid, 'DEPTEST', 'Test Depot', 'Paris', '123 rue');

INSERT INTO zones (depot_id, code, name, type) VALUES
  ('depot-test-del'::uuid, 'Z99', 'Zone test', 'warehouse');
```

**Action**:
```sql
DELETE FROM depots WHERE id = 'depot-test-del'::uuid;
```

**Résultat attendu**:
- ✅ Dépôt supprimé
- ✅ Zone associée supprimée automatiquement (ON DELETE CASCADE)

**Validation**:
```sql
SELECT * FROM zones WHERE depot_id = 'depot-test-del'::uuid;
-- Doit retourner 0 ligne
```

---

## 2. SCÉNARIOS KO (Erreurs attendues)

### T08-KO: Code dépôt dupliqué (contrainte UNIQUE)

**Contexte**: Tentative création dépôt avec code existant

**Action**:
```sql
INSERT INTO depots (code, name, city, address)
VALUES ('DEP001', 'Dépôt Duplicate', 'Paris', '123 rue');
```

**Résultat attendu**:
- ❌ Erreur: `duplicate key value violates unique constraint "depots_code_key"`
- ❌ 0 ligne insérée

---

### T09-KO: Code dépôt format invalide (contrainte CHECK)

**Contexte**: Code contient caractères non autorisés

**Action**:
```sql
INSERT INTO depots (code, name, city, address)
VALUES ('DEP-001', 'Test Depot', 'Paris', '123 rue');  -- Tiret non autorisé
```

**Résultat attendu**:
- ❌ Erreur: `new row violates check constraint "depots_code_format_check"`

---

### T10-KO: Zone code dupliqué dans même dépôt (UNIQUE composite)

**Contexte**: Deux zones avec même code dans un dépôt

**Action**:
```sql
-- Zone Z01 existe déjà dans depot-001
INSERT INTO zones (depot_id, code, name, type)
VALUES (
  (SELECT id FROM depots WHERE code = 'DEP001'),
  'Z01',  -- Code déjà existant
  'Zone Duplicate',
  'warehouse'
);
```

**Résultat attendu**:
- ❌ Erreur: `duplicate key value violates unique constraint "zones_depot_id_code_key"`

---

### T11-KO: qh_auditor tente de créer dépôt (RLS refus INSERT)

**Contexte**: Auditeur tente création dépôt (pas autorisé)

**Action**:
```sql
SET LOCAL role TO 'qh_auditor_user';

INSERT INTO depots (code, name, city, address)
VALUES ('DEPTEST', 'Test', 'Paris', '123 rue');
```

**Résultat attendu**:
- ❌ Erreur: `new row violates row-level security policy for table "depots"`
- ❌ 0 ligne insérée

---

### T12-KO: viewer tente de modifier dépôt (RLS refus UPDATE)

**Contexte**: Viewer tente modification dépôt (lecture seule)

**Action**:
```sql
SET LOCAL role TO 'viewer_user';

UPDATE depots SET name = 'Modified Name' WHERE code = 'DEP001';
```

**Résultat attendu**:
- ❌ Erreur: `new row violates row-level security policy`
- ❌ 0 ligne modifiée

---

### T13-KO: User tente de modifier son rôle (trigger protection)

**Contexte**: User qh_auditor tente de se promouvoir admin

**Action**:
```sql
SET LOCAL role TO 'qh_auditor_user';
SET LOCAL request.jwt.claims.sub TO 'user-qh-001';

UPDATE profiles
SET role = 'admin_dev'
WHERE id = 'user-qh-001'::uuid;
```

**Résultat attendu**:
- ⚠️ Pas d'erreur SQL (UPDATE exécuté)
- ✅ Trigger `prevent_role_status_self_change` restaure `role` original
- ✅ `role` reste 'qh_auditor'

**Validation**:
```sql
SELECT role FROM profiles WHERE id = 'user-qh-001'::uuid;
-- Doit retourner 'qh_auditor' (pas 'admin_dev')
```

---

### T14-KO: Zone orpheline (FK depot_id invalide)

**Contexte**: Tentative création zone avec depot_id inexistant

**Action**:
```sql
INSERT INTO zones (depot_id, code, name, type)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,  -- UUID inexistant
  'ZORPHAN',
  'Zone Orphan',
  'warehouse'
);
```

**Résultat attendu**:
- ❌ Erreur: `violates foreign key constraint "zones_depot_id_fkey"`

---

### T15-KO: Email format invalide (contrainte CHECK)

**Contexte**: User sans @ dans email

**Action**:
```sql
INSERT INTO profiles (id, first_name, last_name, email, role)
VALUES (
  'test-user-bad'::uuid,
  'Bad',
  'Email',
  'bademailaddress',  -- Pas de @
  'viewer'
);
```

**Résultat attendu**:
- ❌ Erreur: `new row violates check constraint "users_email_check"`

---

### T16-KO: Nom dépôt trop court (contrainte CHECK)

**Contexte**: Nom dépôt < 3 caractères

**Action**:
```sql
INSERT INTO depots (code, name, city, address)
VALUES ('TST', 'AB', 'Paris', '123 rue');  -- Nom = 2 caractères
```

**Résultat attendu**:
- ❌ Erreur: `new row violates check constraint "depots_name_check"`

---

## 3. TESTS RLS PAR RÔLE

### 3.1 admin_dev (accès complet)

| Opération | Table | Attendu |
|-----------|-------|---------|
| SELECT | users | ✅ Tous profiles |
| INSERT | users | ✅ OK |
| UPDATE | users | ✅ OK |
| DELETE | users | ✅ OK |
| SELECT | depots | ✅ Tous depots |
| INSERT | depots | ✅ OK |
| UPDATE | depots | ✅ OK |
| DELETE | depots | ✅ OK |
| SELECT | zones | ✅ Toutes zones |
| INSERT | zones | ✅ OK |
| UPDATE | zones | ✅ OK |
| DELETE | zones | ✅ OK |

### 3.2 qhse_manager

| Opération | Table | Attendu |
|-----------|-------|---------|
| SELECT | users | ✅ Tous profiles (lecture) |
| INSERT | users | ❌ RLS refus |
| UPDATE | users | ❌ RLS refus |
| DELETE | users | ❌ RLS refus |
| SELECT | depots | ✅ Tous depots |
| INSERT | depots | ✅ OK |
| UPDATE | depots | ✅ OK |
| DELETE | depots | ❌ RLS refus |
| SELECT | zones | ✅ Toutes zones |
| INSERT | zones | ✅ OK |
| UPDATE | zones | ✅ OK |
| DELETE | zones | ❌ RLS refus |

### 3.3 qh_auditor / safety_auditor

| Opération | Table | Attendu |
|-----------|-------|---------|
| SELECT | users | ✅ Tous profiles (lecture) |
| INSERT | users | ❌ RLS refus |
| UPDATE | users | ⚠️ Soi uniquement (first/last name) |
| DELETE | users | ❌ RLS refus |
| SELECT | depots | ✅ Tous depots (lecture) |
| INSERT | depots | ❌ RLS refus |
| UPDATE | depots | ❌ RLS refus |
| DELETE | depots | ❌ RLS refus |
| SELECT | zones | ✅ Toutes zones (lecture) |
| INSERT | zones | ❌ RLS refus |
| UPDATE | zones | ❌ RLS refus |
| DELETE | zones | ❌ RLS refus |

### 3.4 viewer

| Opération | Table | Attendu |
|-----------|-------|---------|
| SELECT | users | ✅ Tous profiles (lecture) |
| INSERT | users | ❌ RLS refus |
| UPDATE | users | ⚠️ Soi uniquement (first/last name) |
| DELETE | users | ❌ RLS refus |
| SELECT | depots | ✅ Tous depots (lecture) |
| INSERT | depots | ❌ RLS refus |
| UPDATE | depots | ❌ RLS refus |
| DELETE | depots | ❌ RLS refus |
| SELECT | zones | ✅ Toutes zones (lecture) |
| INSERT | zones | ❌ RLS refus |
| UPDATE | zones | ❌ RLS refus |
| DELETE | zones | ❌ RLS refus |

---

## 4. TESTS CONTRAINTES DB

### 4.1 Checklist contraintes users

- [x] **PK id (UUID)**: Unicité garantie
- [x] **FK id → auth.users**: Référence valide
- [x] **UNIQUE email**: Pas de doublons
- [x] **CHECK email format**: Contient '@'
- [x] **CHECK first_name length**: >= 2 caractères
- [x] **CHECK last_name length**: >= 2 caractères
- [x] **NOT NULL role**: Toujours défini
- [x] **ENUM role**: Valeurs restreintes (admin_dev, qhse_manager, qh_auditor, safety_auditor, viewer)
- [x] **DEFAULT status**: 'active' si non spécifié
- [x] **Trigger updated_at**: Auto-mis à jour

### 4.2 Checklist contraintes depots

- [x] **PK id (UUID)**: Auto-généré
- [x] **UNIQUE code**: Pas de doublons
- [x] **CHECK code length**: BETWEEN 3 AND 10
- [x] **CHECK code format**: Alphanumérique uppercase (regex)
- [x] **CHECK name length**: >= 3 caractères
- [x] **CHECK contact_email**: Format @ si défini
- [x] **Trigger uppercase code**: Auto-conversion uppercase
- [x] **Trigger updated_at**: Auto-mis à jour

### 4.3 Checklist contraintes zones

- [x] **PK id (UUID)**: Auto-généré
- [x] **FK depot_id**: Référence valide (ON DELETE CASCADE)
- [x] **UNIQUE (depot_id, code)**: Code unique par dépôt
- [x] **CHECK code length**: BETWEEN 2 AND 20
- [x] **CHECK name length**: >= 3 caractères
- [x] **ENUM type**: Valeurs restreintes (warehouse, loading, office, production, cold_storage)
- [x] **Trigger updated_at**: Auto-mis à jour

---

## 5. TESTS RELATIONS FK

### 5.1 Test CASCADE depot → zones

**Setup**:
```sql
INSERT INTO depots (id, code, name, city, address) VALUES
  ('depot-cascade-test'::uuid, 'DTEST', 'Test Depot', 'Paris', '123 rue');

INSERT INTO zones (depot_id, code, name, type) VALUES
  ('depot-cascade-test'::uuid, 'ZTEST1', 'Zone 1', 'warehouse'),
  ('depot-cascade-test'::uuid, 'ZTEST2', 'Zone 2', 'loading');
```

**Action**:
```sql
DELETE FROM depots WHERE id = 'depot-cascade-test'::uuid;
```

**Validation**:
```sql
SELECT COUNT(*) FROM zones WHERE depot_id = 'depot-cascade-test'::uuid;
-- Attendu: 0 (zones supprimées automatiquement)
```

---

## 6. TESTS TRIGGERS

### 6.1 Test trigger updated_at (users)

**Action**:
```sql
UPDATE profiles SET first_name = 'Updated' WHERE id = 'user-qh-001'::uuid;
```

**Validation**:
```sql
SELECT updated_at > created_at AS updated_correctly
FROM profiles
WHERE id = 'user-qh-001'::uuid;
-- Attendu: updated_correctly = TRUE
```

### 6.2 Test trigger uppercase code (depots)

**Action**:
```sql
INSERT INTO depots (code, name, city, address)
VALUES ('dep999', 'Test Uppercase', 'Paris', '123 rue');  -- Lowercase
```

**Validation**:
```sql
SELECT code FROM depots WHERE name = 'Test Uppercase';
-- Attendu: 'DEP999' (pas 'dep999')
```

### 6.3 Test trigger prevent_role_status_self_change

**Action**:
```sql
-- User qh_auditor tente modifier son status
SET LOCAL role TO 'qh_auditor_user';
SET LOCAL request.jwt.claims.sub TO 'user-qh-001';

UPDATE profiles SET status = 'inactive' WHERE id = 'user-qh-001'::uuid;
```

**Validation**:
```sql
SELECT status FROM profiles WHERE id = 'user-qh-001'::uuid;
-- Attendu: 'active' (trigger a restauré valeur originale)
```

---

## 7. TESTS VOLUMÉTRIE (SIMULATION)

### 7.1 Test INSERT bulk users (100 users)

**Action**:
```sql
INSERT INTO profiles (id, first_name, last_name, email, role)
SELECT
  gen_random_uuid(),
  'User' || i,
  'Test' || i,
  'user' || i || '@test.com',
  CASE (i % 3)
    WHEN 0 THEN 'qh_auditor'::role_type
    WHEN 1 THEN 'safety_auditor'::role_type
    ELSE 'viewer'::role_type
  END
FROM generate_series(1, 100) AS i;
```

**Validation**:
```sql
SELECT COUNT(*) FROM profiles;
-- Attendu: >= 100 (+ users initiaux)
```

**Performance**:
- Temps exécution < 1s (acceptable pour 100 users)

### 7.2 Test SELECT zones avec JOIN depots (100 zones)

**Setup**: Créer 100 zones réparties sur 10 dépôts

**Action**:
```sql
SELECT z.*, d.name AS depot_name
FROM zones z
JOIN depots d ON z.depot_id = d.id
WHERE z.status = 'active';
```

**Validation**:
- Temps exécution < 100ms
- Index `idx_zones_depot_id` utilisé (vérifier EXPLAIN)

---

## 8. CRITÈRES DE SUCCÈS GLOBAUX

### 8.1 Checklist validation étape 01

- [ ] **Tous tests OK exécutés** sans erreur
- [ ] **Tous tests KO retournent erreurs attendues**
- [ ] **RLS policies testées** pour les 5 rôles
- [ ] **Contraintes DB validées** (UNIQUE, CHECK, FK)
- [ ] **Triggers validés** (uppercase, updated_at, role protection)
- [ ] **Performance acceptable** (<100ms queries simples)
- [ ] **Aucune référence orpheline** (FK valides)
- [ ] **Logs sans erreur** (migration appliquée proprement)

### 8.2 Validation humaine requise

Avant de passer à l'étape 02:
1. ✅ Lire rapport de contrôle QHSE_ETAPE_01
2. ✅ Vérifier cohérence schéma ↔ spec métier
3. ✅ Tester manuellement 3-5 scénarios critiques (via SQL ou UI)
4. ✅ Valider décisions RLS (lecture spec + policies)
5. ✅ Autoriser migration SQL (`Étape 01 validée, tu peux continuer.`)

---

## 9. ENVIRONNEMENT DE TEST

### 9.1 Base de test locale (Supabase CLI)

```bash
# Démarrer Supabase local
supabase start

# Appliquer migration
supabase db reset

# Exécuter tests SQL
psql postgresql://postgres:postgres@localhost:54322/postgres -f tests/01_foundations_tests.sql
```

### 9.2 Base de test Supabase Cloud (projet dédié)

- Projet: `qhse-test`
- URL: `https://qhse-test.supabase.co`
- Réinitialisation après chaque série de tests

### 9.3 Données de test

Utiliser mockData.js comme référence:
- 5 users (1 par rôle)
- 1 dépôt DEP001
- 2 zones (Z01, QUAI-A)

---

**Statut**: ✅ Tests de validation complets et exécutables
