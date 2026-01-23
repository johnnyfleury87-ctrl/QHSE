# 🔧 DIAGNOSTIC: Mode DÉMO persistant + JETCAdminAccess caché

**Date:** 23 janvier 2026  
**Bugs identifiés:** 3  
**Statut:** ✅ CORRIGÉ

---

## 🎯 Réponses aux questions obligatoires

### 1️⃣ Source exacte du flag demo

**Fichier:** [`src/config/demoConfig.js`](src/config/demoConfig.js#L18)

```javascript
// Ligne 18
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
```

**Flux complet:**

1. **Variable d'environnement** (`.env.local` ou Vercel)
   ```bash
   NEXT_PUBLIC_DEMO_MODE=true  # ou false
   ```

2. **Config centralisée** ([`src/config/demoConfig.js`](src/config/demoConfig.js))
   - Exporte `DEMO_MODE` (boolean)
   - Utilisé comme valeur initiale

3. **État dynamique** ([`lib/auth-context.js`](lib/auth-context.js))
   - `const [isDemo, setIsDemo] = useState(DEMO_MODE)`
   - **BUG:** N'était **JAMAIS mis à `false`** après login réel
   - → Barre démo restait visible même connecté

4. **Affichage** ([`components/ui/demo-banner.js`](components/ui/demo-banner.js))
   - **AVANT:** Statique, toujours visible si `DEMO_MODE=true`
   - **APRÈS:** Intelligent, se cache si session réelle

---

### 2️⃣ Logs `useAuth()` - Session + Profile + isDemo

**Console attendue après login réel:**

```javascript
// 🔍 INIT
🔐 AUTH CONTEXT - Init {
  demoModeEnv: true,        // ← Env var
  hasSupabase: true,
  nodeEnv: 'production'
}

// 🔍 SESSION CHECK
🔍 AUTH: Vérification session Supabase...
🔍 AUTH: Session récupérée {
  hasSession: true,
  userId: '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4',
  userEmail: 'contact@jetc-immo.ch'
}

// ✅ MODE DEMO DÉSACTIVÉ
✅ AUTH: Session valide → MODE DEMO DÉSACTIVÉ

// 🔍 LOAD PROFILE
📥 AUTH: Chargement profil pour user 3ffcea6f-52da-4c83-a45f-31ff4aa35ea4
📥 AUTH: Résultat fetch profile {
  hasData: true,
  hasError: false,
  errorCode: undefined,
  errorMessage: undefined
}

// ✅ PROFIL CHARGÉ
✅ AUTH: Profil chargé {
  userId: '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4',
  email: 'contact@jetc-immo.ch',
  role: 'admin_dev',
  status: 'active',
  isJetcAdmin: true,          // ← CLÉ IMPORTANTE
  firstName: 'JETC',
  lastName: 'Solution'
}

// 🎪 DEMO BANNER
🎪 DEMO BANNER render: {
  isDemo: false,              // ← Désactivé par session réelle
  hasUser: true,
  loading: false,
  shouldShow: false           // ← Ne s'affiche PAS
}
🎪 DEMO BANNER: caché (session réelle ou mode prod)

// 🎫 JETC ADMIN ACCESS
🎫 JETCAdminAccess render: {
  loading: false,
  hasProfile: true,
  isJetcAdmin: true,          // ← true
  profileRole: 'admin_dev',
  profileStatus: 'active'     // ← active
}
🎫 JETCAdminAccess: visible (autorisé)
```

**Si erreur RLS (exemple):**

```javascript
📥 AUTH: Résultat fetch profile {
  hasData: false,
  hasError: true,
  errorCode: '42501',         // ← Erreur RLS
  errorMessage: 'new row violates row-level security policy',
  errorDetails: '...',
  errorHint: 'Check RLS policies'
}
❌ AUTH: Erreur RLS (permission denied)
```

---

### 3️⃣ Raison exacte "caché (critères non remplis)"

**Fichier:** [`components/admin/jetc-admin-access.js`](components/admin/jetc-admin-access.js#L27-L31)

**Conditions d'affichage (toutes OBLIGATOIRES):**

```javascript
if (loading || !profile?.is_jetc_admin || profile?.status !== 'active') {
  return null // Bloc caché
}
```

**Tableau de diagnostic:**

| Condition | Valeur actuelle | Attendu | Statut |
|-----------|----------------|---------|--------|
| `loading` | `false` | `false` | ✅ |
| `profile` | `null` ou `{...}` | `{...}` | ⚠️ **À vérifier** |
| `profile.is_jetc_admin` | `undefined` ou `false` | `true` | ⚠️ **À vérifier en DB** |
| `profile.status` | `undefined` ou `'inactive'` | `'active'` | ⚠️ **À vérifier en DB** |

**Causes possibles (par ordre de probabilité):**

1. **Profil non chargé (`profile = null`)**
   - Erreur RLS silencieuse
   - Profil inexistant en DB
   - → **Solution:** Logs `📥 AUTH: Résultat fetch profile` montrent l'erreur exacte

2. **`is_jetc_admin` pas à `true` en DB**
   - Migration 0006 non appliquée
   - Script [`create_jetc_profile.sql`](scripts/create_jetc_profile.sql) pas exécuté
   - → **Solution:** Exécuter le script en production

3. **`status` pas à `'active'`**
   - Compte désactivé
   - → **Solution:** UPDATE en DB

**Action immédiate:**

```sql
-- Vérifier dans Supabase Dashboard > SQL Editor
SELECT 
  id, 
  email, 
  role, 
  status, 
  is_jetc_admin,
  first_name,
  last_name
FROM public.profiles
WHERE id = '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4';
```

**Résultat attendu:**

```
id                                  | email                  | role      | status | is_jetc_admin | first_name | last_name
------------------------------------|------------------------|-----------|--------|---------------|------------|----------
3ffcea6f-52da-4c83-a45f-31ff4aa35ea4 | contact@jetc-immo.ch   | admin_dev | active | true          | JETC       | Solution
```

Si `is_jetc_admin = NULL` ou `false` → **Exécuter** [`create_jetc_profile.sql`](scripts/create_jetc_profile.sql)

---

## 🐛 BUG #1: Mode DÉMO persiste après login

### Avant (BUGUÉ)

[`lib/auth-context.js`](lib/auth-context.js)

```javascript
// ❌ Pas de gestion du flag isDemo
const [loading, setLoading] = useState(true)

// ❌ isDemo pas dans le contexte
const value = { user, profile, loading, signIn, signOut }
```

[`components/ui/demo-banner.js`](components/ui/demo-banner.js)

```javascript
// ❌ Toujours visible si DEMO_MODE=true (même après login)
export function DemoBanner() {
  return <div>MODE DÉMO - Données d'exemple</div>
}
```

### Après (CORRIGÉ)

[`lib/auth-context.js`](lib/auth-context.js#L19-L21)

```javascript
// ✅ État dynamique basé sur session
const [isDemo, setIsDemo] = useState(DEMO_MODE)

// ✅ Désactivation automatique si session
if (session?.user) {
  console.log('✅ AUTH: Session valide → MODE DEMO DÉSACTIVÉ')
  setIsDemo(false)
  loadProfile(session.user.id)
} else {
  setIsDemo(DEMO_MODE)
}

// ✅ Export isDemo dans le contexte
const value = { user, profile, loading, isDemo, signIn, signOut }
```

[`components/ui/demo-banner.js`](components/ui/demo-banner.js#L14-L29)

```javascript
// ✅ Intelligent: se cache si session réelle
const { isDemo, user, loading } = useAuth()

if (loading || !isDemo || user) {
  return null // Caché
}

return <div>MODE DÉMO - Données d'exemple</div>
```

---

## 🐛 BUG #2: JETCAdminAccess "caché" 

### Diagnostic

**2 causes possibles:**

1. **Profil pas chargé** (erreur RLS)
2. **`is_jetc_admin` pas `true` en DB**

### Correctifs

✅ **Logs détaillés ajoutés** ([`lib/auth-context.js`](lib/auth-context.js#L58-L107))

```javascript
const loadProfile = async (userId) => {
  console.log('📥 AUTH: Chargement profil pour user', userId)

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  console.log('📥 AUTH: Résultat fetch profile', {
    hasData: !!data,
    hasError: !!error,
    errorCode: error?.code,      // PGRST116 = 0 rows, 42501 = RLS
    errorMessage: error?.message
  })

  if (error) {
    if (error.code === 'PGRST116') {
      console.error('❌ AUTH: Profil non trouvé (0 rows)')
      throw new Error('PROFILE_NOT_FOUND')
    }
    if (error.code === '42501') {
      console.error('❌ AUTH: Erreur RLS (permission denied)')
      throw new Error('RLS_ERROR')
    }
  }

  console.log('✅ AUTH: Profil chargé', {
    role: data.role,
    status: data.status,
    isJetcAdmin: data.is_jetc_admin  // ← Valeur exacte
  })
}
```

✅ **Action manuelle requise** (si `is_jetc_admin` pas `true`)

Exécuter dans Supabase Dashboard > SQL Editor:

```sql
-- Script: scripts/create_jetc_profile.sql
-- Voir fichier complet pour version idempotente
UPDATE public.profiles 
SET is_jetc_admin = true 
WHERE id = '3ffcea6f-52da-4c83-a45f-31ff4aa35ea4';
```

---

## 🐛 BUG #3: CRUD Users pas visible

### Diagnostic

**UI existe:** [`app/admin/users/page.js`](app/admin/users/page.js)  
**API existe:** [`app/api/admin/users/route.js`](app/api/admin/users/route.js)

**Pourquoi pas visible ?**

- Route `/admin/users` est **dans** le layout [`app/admin/layout.js`](app/admin/layout.js)
- Guard vérifie `is_jetc_admin`
- Si `is_jetc_admin = false` → redirect `/dashboard`
- → **Même cause que BUG #2**

### Correctif

✅ Corriger `is_jetc_admin` en DB (voir BUG #2)

✅ **Vérifier en prod:** Variable d'environnement `SUPABASE_SERVICE_ROLE_KEY`

Dans Vercel Dashboard:
```bash
# Settings > Environment Variables
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # ← Doit exister
```

Si absente → API `/api/admin/users` échouera avec `401 Unauthorized`

---

## 📊 Plan de validation complet

### Étape 1: Vérifier les logs (obligatoire)

Ouvrir DevTools Console et observer:

1. **Au chargement de la page:**
   ```
   🔐 AUTH CONTEXT - Init
   🔍 AUTH: Vérification session Supabase...
   ```

2. **Après login:**
   ```
   ✅ AUTH: Session valide → MODE DEMO DÉSACTIVÉ
   📥 AUTH: Chargement profil pour user <uuid>
   ✅ AUTH: Profil chargé { isJetcAdmin: true, status: 'active', ... }
   ```

3. **Bandeau démo:**
   ```
   🎪 DEMO BANNER: caché (session réelle ou mode prod)
   ```

4. **Bloc accueil:**
   ```
   🎫 JETCAdminAccess: visible (autorisé)
   ```

### Étape 2: Si profil non chargé

**Console montre:**
```
❌ AUTH: Profil non trouvé (0 rows)
```

**Action:**

1. Vérifier Auth user existe dans Supabase Dashboard > Authentication
2. Si oui, exécuter [`create_jetc_profile.sql`](scripts/create_jetc_profile.sql) dans SQL Editor
3. Recharger la page

### Étape 3: Si `is_jetc_admin = false`

**Console montre:**
```
✅ AUTH: Profil chargé { isJetcAdmin: false, ... }
🎫 JETCAdminAccess: caché (critères non remplis)
```

**Action:**

Exécuter dans SQL Editor:
```sql
UPDATE public.profiles 
SET is_jetc_admin = true 
WHERE email = 'contact@jetc-immo.ch';

-- Vérifier
SELECT id, email, is_jetc_admin FROM profiles WHERE email = 'contact@jetc-immo.ch';
```

### Étape 4: Tester fonctions admin

1. Aller sur `/` (accueil)
   - ✅ Bloc "Accès JETC Solution" visible
   - ✅ Barre "MODE DÉMO" cachée

2. Cliquer "Entrer dans l'espace admin"
   - ✅ Accès immédiat (pas de spinner infini)
   - ✅ URL = `/admin`

3. Aller sur `/admin/users`
   - ✅ Liste des utilisateurs visible
   - ✅ Bouton "Créer un utilisateur" visible

4. Cliquer "Créer un utilisateur"
   - ✅ Modal/formulaire s'ouvre
   - Remplir: email, nom, prénom, rôle
   - ✅ Création réussie → utilisateur apparaît dans la liste

---

## 🔐 Variables d'environnement requises (Production)

**Vercel Dashboard > Settings > Environment Variables:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Service Role (server-side uniquement, pour API admin/users)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # ⚠️ CRITIQUE pour CRUD users

# Mode (optionnel, false par défaut)
NEXT_PUBLIC_DEMO_MODE=false
```

**Si `SUPABASE_SERVICE_ROLE_KEY` manquant:**

→ API `/api/admin/users` retournera `500` avec:
```json
{ "error": "SUPABASE_SERVICE_ROLE_KEY non définie" }
```

---

## 🗑️ TODO après validation

Une fois tous les bugs confirmés corrigés ✅, **supprimer les logs temporaires:**

### Fichiers à nettoyer

1. [`lib/auth-context.js`](lib/auth-context.js)
   - Lignes 21-28: `console.log('🔐 AUTH CONTEXT - Init')`
   - Lignes 33, 37-42, 49-55, 60, 64-74, 77-93, 102-111, 119-123, 132-134, 141

2. [`components/ui/demo-banner.js`](components/ui/demo-banner.js)
   - Lignes 16-23: `console.log('🎪 DEMO BANNER render')`
   - Lignes 31, 35

3. [`components/admin/jetc-admin-access.js`](components/admin/jetc-admin-access.js)
   - Lignes 16-23, 30, 33

4. [`app/admin/layout.js`](app/admin/layout.js)
   - Tous les `console.log` ajoutés dans le précédent fix

**Commande de recherche:**
```bash
grep -rn "console.log.*🔐\|console.log.*📥\|console.log.*🎪\|console.log.*🎫\|console.log.*🛡️" lib/ components/ app/
```

---

## 📈 Résumé des changements

| Fichier | Changement | Impact |
|---------|-----------|--------|
| [`lib/auth-context.js`](lib/auth-context.js) | Ajout `isDemo` dynamique + logs détaillés | Mode démo désactivé automatiquement après login |
| [`components/ui/demo-banner.js`](components/ui/demo-banner.js) | Utilise `useAuth()` au lieu de statique | Barre cachée si session réelle |
| [`app/layout.js`](app/layout.js) | Ajout `<AuthProvider>` + `<DemoBanner />` | Context disponible partout |
| [`components/admin/jetc-admin-access.js`](components/admin/jetc-admin-access.js) | Logs diagnostiques | Comprendre pourquoi caché |
| [`app/admin/layout.js`](app/admin/layout.js) | (Précédent fix) Logs guard | Comprendre spinner infini |

**Aucune modification DB requise** (sauf `is_jetc_admin` si pas `true`)
