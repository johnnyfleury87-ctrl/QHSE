# 📋 RAPPORT D'ANALYSE – GESTION ADMIN UTILISATEURS (JETC SOLUTION)

**Date**: 23 janvier 2026  
**Objectif**: Implémentation gestion admin des utilisateurs + dashboard stats (sans casser migrations existantes)  
**Périmètre**: CRUD utilisateurs, contrôle accès JETC Solution, dashboard admin  
**Auteur**: GitHub Copilot (Claude Sonnet 4.5)

---

## ⚠️ RÈGLES CRITIQUES

1. **AUCUNE modification** des migrations existantes (0001 → 0005)
2. **RESPECT ABSOLU** de la DB Source of Truth ([docs/implementation.md](../../implementation.md))
3. **Une seule migration** proposée (si nécessaire), claire et justifiée
4. **Sécurité DB-first**: RLS + guards front

---

## 📊 ÉTAT DES LIEUX – CE QUI EXISTE DÉJÀ

### ✅ 1. Structure DB (COMPLÈTE ET FONCTIONNELLE)

#### 1.1 Table `profiles` (Migration 0001)
**Source**: `/workspaces/QHSE/supabase/migrations/0001_etape_01_foundations.sql:78-105`

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role role_type NOT NULL,
  status status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Colonnes disponibles**:
- ✅ `id` (UUID, FK → auth.users)
- ✅ `first_name` (VARCHAR 100)
- ✅ `last_name` (VARCHAR 100)
- ✅ `email` (VARCHAR 255, UNIQUE)
- ✅ `role` (ENUM `role_type`)
- ✅ `status` (ENUM `status`: 'active' | 'inactive')
- ✅ `created_at` (TIMESTAMPTZ)
- ✅ `updated_at` (TIMESTAMPTZ, auto-update via trigger)

**Contraintes**:
- CHECK email contient '@'
- CHECK first_name >= 2 caractères
- CHECK last_name >= 2 caractères
- Trigger `prevent_role_status_self_change()` (ligne 289): empêche auto-modification role/status

---

#### 1.2 ENUM `role_type` (Migration 0001)
**Source**: `/workspaces/QHSE/supabase/migrations/0001_etape_01_foundations.sql:16-24`

```sql
CREATE TYPE role_type AS ENUM (
  'admin_dev',        -- Administrateur technique (droits complets)
  'qhse_manager',     -- Manager QHSE (gestion globale)
  'qh_auditor',       -- Auditeur qualité/hygiène
  'safety_auditor',   -- Auditeur sécurité
  'viewer'            -- Consultation uniquement
);
```

**Valeurs exactes à utiliser**:
- `admin_dev` (super-admin technique)
- `qhse_manager` (admin métier QHSE)
- `qh_auditor`
- `safety_auditor`
- `viewer`

---

#### 1.3 ENUM `status` (Migration 0001)
**Source**: `/workspaces/QHSE/supabase/migrations/0001_etape_01_foundations.sql:42-48`

```sql
CREATE TYPE status AS ENUM (
  'active',          -- Actif
  'inactive'         -- Inactif (désactivé)
);
```

---

#### 1.4 Fonction `get_current_user_role()` (Migration 0001)
**Source**: `/workspaces/QHSE/supabase/migrations/0001_etape_01_foundations.sql:218-234`

```sql
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS role_type AS $$
DECLARE
  user_role role_type;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Profil utilisateur inexistant ou incomplet (user_id: %)', auth.uid()
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
```

**Utilisation**: Toutes les RLS policies l'utilisent pour vérifier le rôle.

---

### ✅ 2. RLS POLICIES EXISTANTES (profiles)

**Source**: `/workspaces/QHSE/supabase/migrations/0001_etape_01_foundations.sql:241-278`

#### Policies actuelles:

| Policy | Opération | Condition | Rôles autorisés |
|--------|-----------|-----------|-----------------|
| `admin_dev_select_all_profiles` | SELECT | Toujours | `admin_dev` |
| `admin_dev_insert_profiles` | INSERT | Toujours | `admin_dev` |
| `admin_dev_update_profiles` | UPDATE | Toujours | `admin_dev` |
| `qhse_manager_select_all_profiles` | SELECT | Toujours | `qhse_manager` |
| `auditors_viewers_select_profiles` | SELECT | Toujours | `qh_auditor`, `safety_auditor`, `viewer` |
| `all_users_select_own_profile` | SELECT | `id = auth.uid()` | Tous |
| `all_users_update_own_profile` | UPDATE | `id = auth.uid()` | Tous (champs limités par trigger) |

**⚠️ CONSTAT CRITIQUE**: 
- ❌ **AUCUNE policy DELETE** sur `profiles` (suppression impossible via RLS)
- ✅ `admin_dev` peut INSERT/UPDATE tous les profiles
- ✅ Trigger `prevent_role_status_self_change()` empêche auto-élévation de privilèges

---

### ✅ 3. Auth Context Front (Existant)

**Source**: `/workspaces/QHSE/lib/auth-context.js`

Fonctionnalités actuelles:
- ✅ `signIn(email, password)` via Supabase Auth
- ✅ `signOut()`
- ✅ `loadProfile(userId)` → charge profile depuis table `profiles`
- ✅ Blocage si `status = 'inactive'` (ligne 69)
- ✅ Context expose `user`, `profile`, `loading`

**Limite actuelle**: Pas de fonction `createUser` / `deleteUser`.

---

### ✅ 4. Tables pour Dashboard Stats (Existantes)

| Table | Migration | Compteur Dashboard |
|-------|-----------|-------------------|
| `profiles` | 0001 | ✅ Nombre d'utilisateurs |
| `audits` | 0002 | ✅ Nombre d'audits |
| `non_conformites` | 0003 | ✅ Nombre de NC |
| `actions_correctives` | 0003 | ✅ Nombre d'actions correctives |

**Source DB Source of Truth**: [docs/implementation.md:164-334](../../implementation.md)

---

## ❌ CE QUI MANQUE POUR L'IMPLÉMENTATION

### 🔐 1. Sécurité: Identification "JETC Solution Admin"

**Problème**: Actuellement, **TOUT utilisateur avec rôle `admin_dev` a accès complet**.

**Besoin métier**:
> "Seul mon compte JETC Solution peut créer/modifier/supprimer des utilisateurs"

**Solutions possibles**:

#### ❌ Option A: Hardcoder l'email dans le code
```javascript
// ❌ REJETÉ: sécurité front uniquement, contournable
if (profile.email !== 'jetc@example.com') {
  // Refuser accès
}
```
**Raisons du rejet**: 
- Sécurité côté client uniquement
- Pas de protection DB
- Email hardcodé = maintenance cauchemar

---

#### ⚠️ Option B: Créer un super-rôle `super_admin`
```sql
-- ⚠️ COMPLEXE: modifie ENUM existant (breaking change potentiel)
ALTER TYPE role_type ADD VALUE 'super_admin';
```
**Raisons du rejet**:
- Modifie un ENUM utilisé partout
- Toutes les policies existantes doivent être revues
- Overkill pour 1 seul utilisateur

---

#### ✅ Option C: **Flag booléen `is_jetc_admin` dans `profiles`** (RECOMMANDÉ)
```sql
-- ✅ SOLUTION PROPRE: 1 colonne, RLS simple, pas de breaking change
ALTER TABLE profiles ADD COLUMN is_jetc_admin BOOLEAN NOT NULL DEFAULT false;
```

**Avantages**:
- ✅ Pas de modification des ENUMs existants
- ✅ Pas de breaking change sur RLS actuelles
- ✅ Politique RLS simple: `get_current_user_role() = 'admin_dev' AND is_jetc_admin = true`
- ✅ Facile à auditer (SELECT sur flag)
- ✅ Permet future extension (plusieurs JETC admins si besoin)

**Implémentation RLS**:
```sql
-- Nouvelle policy pour DELETE profiles (JETC admin uniquement)
CREATE POLICY jetc_admin_delete_profiles ON profiles
  FOR DELETE
  USING (
    (SELECT is_jetc_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Nouvelle policy pour INSERT/UPDATE users (JETC admin uniquement)
CREATE POLICY jetc_admin_manage_users ON profiles
  FOR INSERT
  WITH CHECK (
    (SELECT is_jetc_admin FROM profiles WHERE id = auth.uid()) = true
  );
```

---

### 🗄️ 2. Base de données: Aucune policy DELETE sur `profiles`

**Constat**: Migration 0001 ne définit **AUCUNE policy DELETE** sur `profiles`.

**Conséquence**: 
- ❌ Impossible de supprimer un utilisateur via RLS (même pour admin_dev)
- ❌ `supabase.from('profiles').delete()` échoue toujours

**Solution**: Ajouter policy DELETE pour JETC admin (voir migration ci-dessous).

---

### 📱 3. UI: Aucune vue admin users

**Manquant**:
- ❌ Route `/admin/users` ou `/admin/profiles`
- ❌ Composant table CRUD utilisateurs
- ❌ Formulaire création utilisateur
- ❌ Modal modification rôle/statut
- ❌ Dashboard admin avec stats

**Documenté mais non implémenté**:
- Spec UI: [docs/UI/PLAN_VUES_QHSE.md:932-970](../../docs/UI/PLAN_VUES_QHSE.md)
- Spec métier: [docs/01_foundations/05_exemples_ui.md:205-268](../../docs/01_foundations/05_exemples_ui.md)

---

### 🔌 4. API Supabase: Création utilisateurs

**Problème**: Création utilisateurs Supabase Auth nécessite **service_role key** (pas anon key).

**Doc Supabase officielle**:
```javascript
// ✅ Création user via Admin API (service_role)
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'Test1234!',
  email_confirm: true, // Auto-confirme email (pas d'email envoyé)
  user_metadata: {
    first_name: 'John',
    last_name: 'Doe'
  }
})

// Puis créer profile
await supabase.from('profiles').insert({
  id: data.user.id,
  email: data.user.email,
  first_name: 'John',
  last_name: 'Doe',
  role: 'viewer',
  status: 'active'
})
```

**⚠️ SÉCURITÉ CRITIQUE**: 
- La `service_role` key **NE DOIT JAMAIS** être exposée côté client
- **Solution**: Créer une Edge Function Supabase (API route protégée)

**Alternatives**:
1. **Edge Function Supabase** (recommandé pour prod)
2. **Next.js API Route** (backend Node.js, ok pour cette implémentation)
3. **Supabase Invite Flow** (email invitation, user définit son pwd) → ⚠️ Plus lent, nécessite email SMTP configuré

---

### 🏠 5. UI Accueil: Pas de bloc "Accès JETC Solution"

**Fichier actuel**: `/workspaces/QHSE/app/page.js`

**Contenu actuel**:
- ✅ Bloc Hero avec titre + CTA "Mode Démo" et "Se connecter"
- ✅ 4 cards features (Audits, NC, Dashboard, Rapports)
- ❌ **AUCUN bloc "Accès JETC Solution"**

**Besoin**:
```
┌────────────────────────────────────────┐
│  🔐 ACCÈS JETC SOLUTION                │
│                                        │
│  [Logo JETC]                           │
│                                        │
│  Administration complète de la         │
│  plateforme QHSE.                      │
│                                        │
│  [Entrer →]  (route: /admin)           │
└────────────────────────────────────────┘
```

**Logo**: Actuellement `/workspaces/QHSE/public/` contient uniquement `.gitkeep` → **Pas de logo existant**.

**Solution**: Utiliser une icône Lucide React (ex: `ShieldCheck`, `Crown`, `Lock`) en attendant logo réel.

---

## 🛠️ PROPOSITION DE MIGRATION (MINIMALE)

### Migration `0006_etape_06_admin_users.sql`

**Objectif**: Activer gestion admin utilisateurs (JETC Solution) sans casser l'existant.

**Contenu**:

```sql
-- =====================================================================
-- MIGRATION ÉTAPE 06 - ADMIN USERS MANAGEMENT (JETC SOLUTION)
-- =====================================================================
-- Date: 23 janvier 2026
-- Phase: IMPLÉMENTATION
-- Périmètre: Flag JETC admin + policies DELETE/INSERT users
-- =====================================================================

-- =====================================================================
-- 1. AJOUT COLONNE is_jetc_admin (flag super-admin)
-- =====================================================================

-- Ajouter colonne is_jetc_admin sur profiles (default false)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_jetc_admin BOOLEAN NOT NULL DEFAULT false;

-- Index pour optimiser requêtes RLS
CREATE INDEX IF NOT EXISTS idx_profiles_is_jetc_admin 
ON profiles(is_jetc_admin) 
WHERE is_jetc_admin = true;

-- Commentaire documentation
COMMENT ON COLUMN profiles.is_jetc_admin IS 'Flag super-admin JETC Solution (gestion utilisateurs)';

-- =====================================================================
-- 2. RLS POLICIES: DELETE profiles (JETC admin uniquement)
-- =====================================================================

-- Policy: JETC admin peut supprimer utilisateurs (soft delete via status recommandé)
CREATE POLICY jetc_admin_delete_profiles ON profiles
  FOR DELETE
  USING (
    -- Vérifier que l'utilisateur connecté a le flag is_jetc_admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_jetc_admin = true
    )
  );

-- =====================================================================
-- 3. RLS POLICIES: Restreindre INSERT/UPDATE users (JETC admin)
-- =====================================================================

-- ⚠️ SUPPRESSION des anciennes policies admin_dev INSERT/UPDATE
-- (car elles donnent accès à TOUS les admin_dev)
DROP POLICY IF EXISTS admin_dev_insert_profiles ON profiles;
DROP POLICY IF EXISTS admin_dev_update_profiles ON profiles;

-- Nouvelle policy: INSERT profiles (JETC admin uniquement)
CREATE POLICY jetc_admin_insert_profiles ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_jetc_admin = true
    )
  );

-- Nouvelle policy: UPDATE profiles (JETC admin uniquement)
CREATE POLICY jetc_admin_update_profiles ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_jetc_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_jetc_admin = true
    )
  );

-- =====================================================================
-- 4. FONCTION HELPER: is_jetc_admin()
-- =====================================================================

CREATE OR REPLACE FUNCTION is_jetc_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_jetc_admin 
    FROM profiles 
    WHERE id = auth.uid()
  ) = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION is_jetc_admin IS 'Vérifie si l\'utilisateur connecté est JETC admin';

-- =====================================================================
-- 5. PROTECTION: Empêcher auto-modification is_jetc_admin
-- =====================================================================

-- Fonction trigger: empêche utilisateur de s'auto-attribuer is_jetc_admin
CREATE OR REPLACE FUNCTION prevent_self_jetc_elevation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si utilisateur tente de modifier son propre is_jetc_admin
  IF NEW.id = auth.uid() AND OLD.is_jetc_admin != NEW.is_jetc_admin THEN
    -- Vérifier si l'utilisateur est déjà JETC admin
    IF NOT is_jetc_admin() THEN
      RAISE EXCEPTION 'Interdiction: impossible de s''auto-attribuer le flag is_jetc_admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Trigger: protection modification is_jetc_admin
CREATE TRIGGER protect_jetc_admin_self_elevation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_jetc_elevation();

-- =====================================================================
-- FIN DE LA MIGRATION ÉTAPE 06
-- =====================================================================
```

---

## 📋 IMPACTS & JUSTIFICATIONS

### ✅ Impacts sur l'existant

| Élément | Impact | Justification |
|---------|--------|---------------|
| **Migrations 0001-0005** | ✅ Aucun changement | Migration 0006 ajoute uniquement |
| **Table `profiles`** | ⚠️ Nouvelle colonne `is_jetc_admin` | Default `false` → pas de breaking change |
| **ENUM `role_type`** | ✅ Aucun changement | Pas de nouvelle valeur |
| **Policies SELECT** | ✅ Aucun changement | Policies lecture intactes |
| **Policies INSERT/UPDATE** | ⚠️ Suppression + remplacement | Nouvelles policies plus restrictives (JETC admin uniquement) |
| **Function `get_current_user_role()`** | ✅ Aucun changement | Utilisée telle quelle |

---

### ⚠️ Breaking Change : Policies INSERT/UPDATE

**Changement**:
- Avant: `admin_dev` pouvait créer/modifier utilisateurs
- Après: **Seul JETC admin** (`is_jetc_admin = true`) peut créer/modifier utilisateurs

**Risque**: Si un `admin_dev` existant (sans flag `is_jetc_admin`) tente de créer un user → **échec RLS**.

**Mitigation**:
1. Définir `is_jetc_admin = true` sur le compte JETC Solution **IMMÉDIATEMENT après migration**:
```sql
-- ⚠️ À exécuter en production APRÈS migration 0006
UPDATE profiles 
SET is_jetc_admin = true 
WHERE email = 'votre-email-jetc@example.com';
```

2. Documenter cette étape dans un script post-migration.

---

### 🔒 Sécurité renforcée

| Avant | Après |
|-------|-------|
| Tous `admin_dev` peuvent créer/modifier users | Seul JETC admin peut créer/modifier users |
| Aucune policy DELETE (suppression impossible) | JETC admin peut supprimer users (via policy) |
| Pas de protection flag admin | Trigger empêche auto-élévation |

---

## 🎨 PLAN D'IMPLÉMENTATION UI

### Phase 1: Bloc Accueil "Accès JETC Solution"

**Fichier**: `/workspaces/QHSE/app/page.js`

**Position**: Après les 4 cards features, avant le footer.

**Design** (conformité [docs/DESIGN_SYSTEM_QHSE.md](../../docs/DESIGN_SYSTEM_QHSE.md)):
- Card avec variant `surface` + border
- Icône `Shield` (Lucide React) en attendant logo
- Bouton `primary` variant
- États: loading (si check auth), error (si pas JETC admin)

**Guard**:
```javascript
// Afficher uniquement si connecté ET is_jetc_admin = true
{profile?.is_jetc_admin && (
  <Card>...</Card>
)}
```

---

### Phase 2: Route `/admin` (Dashboard Admin)

**Structure**:
```
/workspaces/QHSE/app/admin/
  layout.js          # Guard: vérifie is_jetc_admin
  page.js            # Dashboard stats + liens rapides
  users/
    page.js          # Liste utilisateurs (table)
    [id]/
      page.js        # Détail/modification utilisateur
    new/
      page.js        # Création utilisateur
```

**Guard Layout** (`/app/admin/layout.js`):
```javascript
'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({ children }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !profile?.is_jetc_admin) {
      router.push('/dashboard') // Redirection si pas JETC admin
    }
  }, [profile, loading, router])

  if (loading) return <LoadingState />
  if (!profile?.is_jetc_admin) return null

  return children
}
```

---

### Phase 3: Dashboard Admin Stats

**Route**: `/admin/page.js`

**Composants stats** (Cards):

```javascript
// Compteurs
const stats = [
  { label: 'Utilisateurs', value: usersCount, icon: Users },
  { label: 'Audits', value: auditsCount, icon: ClipboardCheck },
  { label: 'Non-Conformités', value: ncCount, icon: AlertTriangle },
  { label: 'Actions Correctives', value: actionsCount, icon: CheckCircle },
]
```

**Requêtes Supabase**:
```javascript
// Compteur utilisateurs
const { count: usersCount } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })

// Compteur audits
const { count: auditsCount } = await supabase
  .from('audits')
  .select('*', { count: 'exact', head: true })

// Compteur NC
const { count: ncCount } = await supabase
  .from('non_conformites')
  .select('*', { count: 'exact', head: true })

// Compteur actions correctives
const { count: actionsCount } = await supabase
  .from('actions_correctives')
  .select('*', { count: 'exact', head: true })
```

**États obligatoires** (Design System):
- ✅ Loading (skeleton cards)
- ✅ Error (message + retry)
- ✅ Empty (message + CTA)
- ✅ Loaded (stats + liens)

---

### Phase 4: CRUD Utilisateurs

**Route**: `/admin/users/page.js`

**Table utilisateurs**:

| Colonne | Données | Actions |
|---------|---------|---------|
| Email | `profiles.email` | - |
| Nom complet | `first_name + last_name` | - |
| Rôle | Badge coloré `role` | Modifier (modal) |
| Statut | Badge `active`/`inactive` | Toggle |
| Date création | `created_at` formatée | - |
| Actions | - | Modifier / Désactiver |

**Filtres**:
- Rôle (dropdown: tous / admin_dev / qhse_manager / auditeur / viewer)
- Statut (dropdown: tous / actif / inactif)
- Recherche (input: email / nom / prénom)

**Bouton "+ Créer utilisateur"** → Modal formulaire:
```
┌─────────────────────────────────────┐
│  Créer un utilisateur               │
├─────────────────────────────────────┤
│  Email: [__________________]        │
│  Prénom: [__________________]       │
│  Nom: [__________________]          │
│  Rôle: [Sélectionner ▼]            │
│                                     │
│  Mot de passe: Test1234! (fixe)     │
│                                     │
│  [Annuler]  [Créer]                │
└─────────────────────────────────────┘
```

**API Route** (Next.js) `/app/api/admin/users/route.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ Server-side uniquement
)

export async function POST(request) {
  const { email, first_name, last_name, role } = await request.json()

  // 1. Créer user Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'Test1234!',
    email_confirm: true,
    user_metadata: { first_name, last_name }
  })

  if (authError) return Response.json({ error: authError.message }, { status: 400 })

  // 2. Créer profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      first_name,
      last_name,
      role,
      status: 'active'
    })

  if (profileError) return Response.json({ error: profileError.message }, { status: 400 })

  return Response.json({ success: true, user: authData.user })
}
```

**⚠️ Sécurité API Route**:
```javascript
// Vérifier que l'utilisateur connecté est JETC admin
const session = await supabase.auth.getSession()
if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

const { data: profile } = await supabase
  .from('profiles')
  .select('is_jetc_admin')
  .eq('id', session.user.id)
  .single()

if (!profile?.is_jetc_admin) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

### Phase 5: Modification/Suppression Utilisateurs

**Modal Modification** (route `/admin/users/[id]/page.js`):
- Champ rôle modifiable (SELECT)
- Champ statut toggle (active ↔ inactive)
- ⚠️ **Interdire modification de son propre profil** (trigger DB + guard front)

**Suppression**:
- ⚠️ **Soft delete recommandé**: UPDATE `status = 'inactive'` plutôt que DELETE
- Si DELETE hard: API Route `DELETE /api/admin/users/[id]` + `supabaseAdmin.auth.admin.deleteUser()`

**Validation front**:
```javascript
// Empêcher suppression du dernier JETC admin
const jetcAdminsCount = profiles.filter(p => p.is_jetc_admin).length
if (jetcAdminsCount === 1 && profile.is_jetc_admin) {
  alert('Impossible de supprimer le dernier JETC admin')
  return
}
```

---

## 🚀 PLAN D'EXÉCUTION (ORDRE STRICT)

### ✅ Étape 1: Migration DB (1h)
1. Créer `/workspaces/QHSE/supabase/migrations/0006_etape_06_admin_users.sql`
2. Tester en local via Docker (`supabase db reset`)
3. Vérifier RLS policies via pgAdmin
4. Documenter migration dans `docs/Conception/ETAPE_06/`

---

### ✅ Étape 2: Activer flag JETC admin (5 min)
```sql
-- ⚠️ EXÉCUTER EN LOCAL ET PROD après migration 0006
UPDATE profiles 
SET is_jetc_admin = true 
WHERE email = 'votre-email-jetc-real@example.com';
```

---

### ✅ Étape 3: API Routes (2h)
1. Créer `/app/api/admin/users/route.js` (POST: create user)
2. Créer `/app/api/admin/users/[id]/route.js` (PATCH: update, DELETE: delete)
3. Ajouter guards sécurité (vérif `is_jetc_admin`)
4. Tester via Postman/curl

---

### ✅ Étape 4: UI Accueil (30 min)
1. Modifier `/app/page.js`
2. Ajouter Card "Accès JETC Solution" (icône Shield)
3. Guard `{profile?.is_jetc_admin && ...}`
4. Bouton → Link vers `/admin`

---

### ✅ Étape 5: Layout Admin (1h)
1. Créer `/app/admin/layout.js` (guard is_jetc_admin)
2. Créer `/app/admin/page.js` (dashboard stats)
3. Tester redirection si pas JETC admin

---

### ✅ Étape 6: Dashboard Admin Stats (2h)
1. Requêtes Supabase (count users/audits/nc/actions)
2. 4 Cards stats avec icônes
3. États loading/error/empty
4. Liens rapides vers CRUD

---

### ✅ Étape 7: CRUD Utilisateurs (4h)
1. Créer `/app/admin/users/page.js` (liste + table)
2. Créer `/app/admin/users/new/page.js` (formulaire création)
3. Créer `/app/admin/users/[id]/page.js` (modal modification)
4. Filtres + recherche + pagination
5. Boutons actions (modifier/désactiver)

---

### ✅ Étape 8: Tests & Validation (2h)
1. Test RLS en local (vérifier policies via SQL)
2. Test création utilisateur (API Route)
3. Test modification rôle/statut
4. Test suppression (soft delete)
5. Test guards (accès refusé si pas JETC admin)
6. Test UI (loading/error/empty states)

---

## 📝 CHECKLIST AVANT DÉPLOIEMENT

### ✅ Migration
- [ ] Migration 0006 créée et testée en local
- [ ] Aucune erreur SQL (idempotence vérifiée)
- [ ] Flag `is_jetc_admin` activé sur compte JETC Solution
- [ ] Policies RLS testées via SQL (SELECT/INSERT/UPDATE/DELETE)

### ✅ Sécurité
- [ ] `SUPABASE_SERVICE_ROLE_KEY` définie (server-side uniquement, jamais commitée)
- [ ] API Routes protégées (vérif `is_jetc_admin`)
- [ ] Guards front implémentés (`/admin` accessible uniquement si JETC admin)
- [ ] Trigger `prevent_self_jetc_elevation` testé (empêche auto-élévation)

### ✅ UI
- [ ] Bloc "Accès JETC Solution" sur page d'accueil
- [ ] Dashboard admin stats (4 cards: users/audits/nc/actions)
- [ ] CRUD utilisateurs (liste, création, modification, désactivation)
- [ ] Design System respecté (loading/error/empty states)
- [ ] Aucun style custom hors Design System

### ✅ Tests
- [ ] Création utilisateur via formulaire (API Route testée)
- [ ] Modification rôle/statut utilisateur
- [ ] Désactivation utilisateur (soft delete)
- [ ] Accès refusé si pas JETC admin (guard layout)
- [ ] Stats dashboard chargées correctement

---

## 📊 RÉCAPITULATIF TECHNIQUE

### Ce qui existe et fonctionne ✅
- Table `profiles` complète (colonnes, contraintes, triggers)
- ENUM `role_type` (5 rôles)
- ENUM `status` (active/inactive)
- Fonction `get_current_user_role()`
- RLS policies SELECT (tous rôles)
- RLS policy UPDATE own profile (trigger empêche auto-élévation role/status)
- Auth Context front (signIn/signOut/loadProfile)
- Tables stats (audits, non_conformites, actions_correctives)

### Ce qui manque ❌
- Colonne `is_jetc_admin` sur `profiles`
- RLS policy DELETE sur `profiles`
- RLS policies INSERT/UPDATE restreintes (JETC admin uniquement)
- Fonction helper `is_jetc_admin()`
- Trigger `prevent_self_jetc_elevation()`
- API Routes création/modification/suppression utilisateurs
- UI bloc "Accès JETC Solution" sur accueil
- UI Dashboard admin stats
- UI CRUD utilisateurs

### Migration nécessaire ✅
- **1 seule migration** (`0006_etape_06_admin_users.sql`)
- Contenu: colonne `is_jetc_admin` + policies + triggers
- **Aucune modification** des migrations 0001-0005
- **Aucun breaking change** sur structure existante (juste restriction policies)

---

## 🎯 CONCLUSION

### ✅ Faisabilité
**100% réalisable sans casser l'existant.**

La structure DB actuelle est **excellente** et permet d'ajouter la gestion admin utilisateurs via:
1. **1 colonne** (`is_jetc_admin`)
2. **3 policies** (INSERT/UPDATE/DELETE)
3. **1 fonction** (`is_jetc_admin()`)
4. **1 trigger** (protection auto-élévation)

Aucune modification des migrations existantes requise.

---

### ⚠️ Points d'attention
1. **Service Role Key**: NE JAMAIS exposer côté client (API Routes Next.js obligatoire)
2. **Breaking change policies**: Après migration, seul JETC admin peut créer/modifier users
3. **Post-migration**: Activer flag `is_jetc_admin = true` sur compte JETC Solution IMMÉDIATEMENT
4. **Soft delete recommandé**: Préférer `status = 'inactive'` plutôt que DELETE hard
5. **Dernier JETC admin**: Empêcher suppression du dernier admin (guard front + DB)

---

### 📅 Estimation
- Migration DB: **1h**
- API Routes: **2h**
- UI (accueil + admin layout + dashboard): **3h**
- CRUD utilisateurs: **4h**
- Tests & validation: **2h**
- **TOTAL: ~12h** (1.5 jours de développement)

---

**Prêt pour implémentation.** ✅
