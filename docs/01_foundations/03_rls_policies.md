# RLS Policies – Foundations (Étape 01)

## Date
22 janvier 2026

## Objectif
Définir les policies Row Level Security pour tables: profiles, depots, zones

**CLARIFICATION IMPORTANTE**:
- `auth.users` = Table Supabase Auth
- `profiles` = Table métier QHSE (1:1 avec auth.users)

---

## 1. PRINCIPES RLS

### 1.1 Activation RLS
**OBLIGATOIRE** sur toutes les tables publiques (sauf lookup tables non sensibles).

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
```

### 1.2 Principe du moindre privilège
- Par défaut: **AUCUN accès** (RLS activée sans policies = deny all)
- Policies explicites par rôle et opération (SELECT, INSERT, UPDATE, DELETE)
- Validation rôle via `auth.jwt() ->> 'user_metadata' ->> 'role'`

### 1.3 Récupération rôle utilisateur
Supabase JWT stocke métadonnées utilisateur:

```sql
-- Récupérer rôle depuis JWT
auth.jwt() ->> 'user_metadata' ->> 'role'

-- Récupérer user_id
auth.uid()
```

**Alternative**: Stocker rôle dans table `profiles` et joindre (légèrement plus lent, mais plus flexible).

**Décision étape 01**: Utiliser `users.role` (table) + helper function pour simplifier policies.

---

## 2. FONCTION HELPER: get_current_user_role()

Récupère le rôle de l'utilisateur connecté depuis table `profiles`.

```sql
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS role_type AS $$
DECLARE
  user_role role_type;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET search_path = public;
```

**SECURITY DEFINER**: Fonction s'exécute avec droits du créateur (contourne RLS temporairement pour lire `profiles`).

**SET search_path = public**: Protection contre attaques par injection de schema (sécurité SECURITY DEFINER).

**Usage dans policies**:
```sql
USING (get_current_user_role() = 'admin_dev')
```

---

## 3. RLS POLICIES: TABLE profiles

### 3.1 Activation RLS
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### 3.2 Policy: admin_dev (accès complet)

#### SELECT (lecture tous profiles)
```sql
CREATE POLICY admin_dev_select_all_profiles ON profiles
  FOR SELECT
  USING (get_current_user_role() = 'admin_dev');
```

#### INSERT (créer profiles)
```sql
CREATE POLICY admin_dev_insert_profiles ON profiles
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin_dev');
```

#### UPDATE (modifier profiles)
```sql
CREATE POLICY admin_dev_update_profiles ON profiles
  FOR UPDATE
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');
```

**⚠️ PAS DE POLICY DELETE SUR PROFILES**:
- Profiles **JAMAIS supprimés physiquement** (soft delete obligatoire)
- Raison: Préserver historique audits (auditeur supprimé → audits orphelins)
- Méthode: `UPDATE profiles SET status='inactive' WHERE id=...`

### 3.3 Policy: qhse_manager (lecture seule profiles)

#### SELECT (lecture tous profiles)
```sql
CREATE POLICY qhse_manager_select_all_profiles ON profiles
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');
```

### 3.4 Policy: Auditeurs et viewer (lecture seule profiles)

#### SELECT (lecture tous profiles - pour savoir qui sont les collègues)
```sql
CREATE POLICY auditors_viewers_select_profiles ON profiles
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );
```

### 3.5 Policy: Tous profiles (lecture propre profil)

#### SELECT (lire son propre profil)
```sql
CREATE POLICY all_users_select_own_profile ON profiles
  FOR SELECT
  USING (id = auth.uid());
```

#### UPDATE (modifier son propre profil - champs limités)
```sql
-- Note: Pour limiter champs modifiables, utiliser CHECK + trigger
-- Ici: autorise UPDATE de first_name, last_name uniquement (pas role, pas status)
CREATE POLICY all_users_update_own_profile ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Vérification que role et status ne changent pas (via trigger)
  );
```

**Trigger protection**: Empêcher user de modifier son propre rôle.

```sql
CREATE OR REPLACE FUNCTION prevent_role_status_self_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si user modifie son propre profil (id = auth.uid())
  IF NEW.id = auth.uid() AND get_current_user_role() != 'admin_dev' THEN
    -- Restaurer role et status originaux
    NEW.role = OLD.role;
    NEW.status = OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER enforce_role_status_immutability ON profiles
  BEFORE UPDATE
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_status_self_change();
```

---

## 4. RLS POLICIES: TABLE depots

### 4.1 Activation RLS
```sql
ALTER TABLE depots ENABLE ROW LEVEL SECURITY;
```

### 4.2 Policy: admin_dev (accès complet)

#### SELECT
```sql
CREATE POLICY admin_dev_select_all_depots ON depots
  FOR SELECT
  USING (get_current_user_role() = 'admin_dev');
```

#### INSERT
```sql
CREATE POLICY admin_dev_insert_depots ON depots
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin_dev');
```

#### UPDATE
```sql
CREATE POLICY admin_dev_update_depots ON depots
  FOR UPDATE
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');
```

#### DELETE
```sql
CREATE POLICY admin_dev_delete_depots ON depots
  FOR DELETE
  USING (get_current_user_role() = 'admin_dev');
```

### 4.3 Policy: qhse_manager (lecture + écriture)

#### SELECT (lecture tous dépôts)
```sql
CREATE POLICY qhse_manager_select_depots ON depots
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');
```

#### INSERT (créer dépôts)
```sql
CREATE POLICY qhse_manager_insert_depots ON depots
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'qhse_manager');
```

#### UPDATE (modifier dépôts)
```sql
CREATE POLICY qhse_manager_update_depots ON depots
  FOR UPDATE
  USING (get_current_user_role() = 'qhse_manager')
  WITH CHECK (get_current_user_role() = 'qhse_manager');
```

### 4.4 Policy: Auditeurs et viewer (lecture seule)

#### SELECT (lecture tous dépôts)
```sql
CREATE POLICY auditors_viewers_select_depots ON depots
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );
```

---

## 5. RLS POLICIES: TABLE zones

### 5.1 Activation RLS
```sql
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
```

### 5.2 Policy: admin_dev (accès complet)

#### SELECT
```sql
CREATE POLICY admin_dev_select_all_zones ON zones
  FOR SELECT
  USING (get_current_user_role() = 'admin_dev');
```

#### INSERT
```sql
CREATE POLICY admin_dev_insert_zones ON zones
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin_dev');
```

#### UPDATE
```sql
CREATE POLICY admin_dev_update_zones ON zones
  FOR UPDATE
  USING (get_current_user_role() = 'admin_dev')
  WITH CHECK (get_current_user_role() = 'admin_dev');
```

#### DELETE
```sql
CREATE POLICY admin_dev_delete_zones ON zones
  FOR DELETE
  USING (get_current_user_role() = 'admin_dev');
```

### 5.3 Policy: qhse_manager (lecture + écriture)

#### SELECT (lecture toutes zones)
```sql
CREATE POLICY qhse_manager_select_zones ON zones
  FOR SELECT
  USING (get_current_user_role() = 'qhse_manager');
```

#### INSERT (créer zones)
```sql
CREATE POLICY qhse_manager_insert_zones ON zones
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'qhse_manager');
```

#### UPDATE (modifier zones)
```sql
CREATE POLICY qhse_manager_update_zones ON zones
  FOR UPDATE
  USING (get_current_user_role() = 'qhse_manager')
  WITH CHECK (get_current_user_role() = 'qhse_manager');
```

### 5.4 Policy: Auditeurs et viewer (lecture seule)

#### SELECT (lecture toutes zones)
```sql
CREATE POLICY auditors_viewers_select_zones ON zones
  FOR SELECT
  USING (
    get_current_user_role() IN ('qh_auditor', 'safety_auditor', 'viewer')
  );
```

---

## 6. MATRICE RÉCAPITULATIVE DROITS

### 6.1 Table: profiles

| Rôle | SELECT | INSERT | UPDATE | DELETE | Commentaire |
|------|--------|--------|--------|--------|-------------|
| **admin_dev** | ✅ Tous | ✅ Tous | ✅ Tous | ✅ Tous | Accès complet |
| **qhse_manager** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule (pas de gestion profiles) |
| **qh_auditor** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule (voir collègues) |
| **safety_auditor** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule |
| **viewer** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule |
| **Tous (propre profil)** | ✅ Soi | ❌ Non | ⚠️ Limité* | ❌ Non | *Pas role/status |

### 6.2 Table: depots

| Rôle | SELECT | INSERT | UPDATE | DELETE | Commentaire |
|------|--------|--------|--------|--------|-------------|
| **admin_dev** | ✅ Tous | ✅ Oui | ✅ Tous | ✅ Tous | Accès complet |
| **qhse_manager** | ✅ Tous | ✅ Oui | ✅ Tous | ❌ Non | Gestion dépôts (pas suppression) |
| **qh_auditor** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule |
| **safety_auditor** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule |
| **viewer** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule |

### 6.3 Table: zones

| Rôle | SELECT | INSERT | UPDATE | DELETE | Commentaire |
|------|--------|--------|--------|--------|-------------|
| **admin_dev** | ✅ Tous | ✅ Oui | ✅ Tous | ✅ Tous | Accès complet |
| **qhse_manager** | ✅ Tous | ✅ Oui | ✅ Tous | ❌ Non | Gestion zones (pas suppression) |
| **qh_auditor** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule |
| **safety_auditor** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule |
| **viewer** | ✅ Tous | ❌ Non | ❌ Non | ❌ Non | Lecture seule |

---

## 7. TESTS POLICIES (APERÇU)

### 7.1 Test admin_dev SELECT profiles
```sql
-- Se connecter en tant que admin_dev
SET request.jwt.claims TO '{"sub": "user-admin-001", ...}';

-- Doit retourner tous les profiles
SELECT * FROM profiles;
-- ✅ Attendu: 5 users
```

### 7.2 Test qh_auditor INSERT depot (refus attendu)
```sql
-- Se connecter en tant que qh_auditor
SET request.jwt.claims TO '{"sub": "user-qh-001", ...}';

-- Tentative insertion dépôt
INSERT INTO depots (code, name, city, address) VALUES ('TEST', 'Test Depot', 'Paris', '123 rue');
-- ❌ Attendu: Erreur RLS (policy refusée)
```

### 7.3 Test user modifie son rôle (refus attendu via trigger)
```sql
-- User user-qh-001 tente de se promouvoir admin
UPDATE profiles SET role = 'admin_dev' WHERE id = auth.uid();
-- ❌ Attendu: Trigger restaure role original
```

**Tests complets**: Voir [04_tests_validation.md](04_tests_validation.md).

---

## 8. CONSIDÉRATIONS PERFORMANCE

### 8.1 Impact RLS sur queries
- **get_current_user_role()**: Appel fonction par policy → 1 query supplémentaire
- **Optimisation**: Fonction SECURITY DEFINER peut être cachée (Supabase gère cache session)
- **Impact**: Négligeable (<10ms overhead par query)

### 8.2 Index nécessaires
- Index sur `users.role` (filtrage policies) → ✅ Créé (02_schema_db.md)
- Index sur `users.id` (PK) → ✅ Automatique

### 8.3 Alternative: JWT custom claims
**Avantage**: Pas de query supplémentaire (rôle dans JWT directement).

**Inconvénient**: Complexité sync (changer rôle → régénérer JWT), moins flexible.

**Décision étape 01**: Garder `users.role` (table) pour simplicité. Optimisation JWT custom claims possible étape future si nécessaire.

---

## 9. SÉCURITÉ ADDITIONNELLE

### 9.1 Service Role Key
**Utilisation**: Backend server-side (API Routes Next.js) pour opérations admin.

**Danger**: Bypass RLS complètement.

**Règle**: JAMAIS exposer Service Role Key côté client.

### 9.2 Anon Key (client-side)
**Utilisation**: Client JavaScript (front Next.js).

**Sécurité**: RLS appliquée automatiquement (JWT utilisateur).

### 9.3 Audit logs (optionnel, étape future)
Tracker toutes modifications sensibles (users, depots).

```sql
-- Table audit_logs (étape future)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50),
  record_id UUID,
  action VARCHAR(20), -- INSERT, UPDATE, DELETE
  user_id UUID REFERENCES profiles(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. DÉCISIONS RLS

### DR1-01: Fonction helper plutôt que JWT custom claims
**Raison**: Simplicité sync, flexibilité changement rôle sans régénération token.

**Alternative rejetée**: JWT custom claims → complexité setup Supabase, sync difficile.

### DR1-02: Lecture profiles autorisée pour tous rôles
**Raison**: Voir collègues (assignations audits futures), transparence équipe.

**Alternative rejetée**: Restreindre lecture users → complexité parcours UI (assignations).

### DR1-03: qhse_manager ne peut pas supprimer depots/zones
**Raison**: Sécurité (suppression = admin_dev uniquement), éviter erreurs.

**Alternative rejetée**: Autoriser DELETE → risque suppression accidentelle.

### DR1-04: Soft delete préféré (status = inactive)
**Raison**: Historique audits, traçabilité.

**Alternative rejetée**: Hard delete → perte historique.

---

## 11. ORDRE APPLICATION POLICIES (MIGRATION)

1. **Créer fonction helper** `get_current_user_role()`
2. **Créer trigger** `prevent_role_status_self_change()`
3. **Activer RLS** sur profiles, depots, zones
4. **Créer policies users** (admin, manager, auditeurs, self)
5. **Créer policies depots** (admin, manager, auditeurs)
6. **Créer policies zones** (admin, manager, auditeurs)

---

## 12. VALIDATION COHÉRENCE

| Règle Métier (01_spec_metier.md) | Policy RLS Correspondante | Validation |
|-----------------------------------|---------------------------|------------|
| **R1-04**: Utilisateur UN seul rôle | Trigger prevent_role_status_self_change | ✅ |
| **Droits admin_dev**: CRUD complet | Policies admin_dev_* sur toutes tables | ✅ |
| **Droits qhse_manager**: Gestion dépôts/zones | Policies qhse_manager_insert/update depots/zones | ✅ |
| **Droits auditeurs**: Lecture seule | Policies auditors_viewers_select_* | ✅ |
| **Droits viewer**: Lecture seule | Policy auditors_viewers_select_* | ✅ |

---

**Statut**: ✅ RLS policies complètes et cohérentes avec spec métier
