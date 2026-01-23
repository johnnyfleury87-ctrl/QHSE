# Diagnostic 401 Admin Users - Source of Truth

**Date:** 23 janvier 2026  
**Problème:** GET `/api/admin/users` → 401 "Non authentifié"  
**Root Cause:** Serveur ne lit pas les cookies Supabase

---

## 🔑 Variables d'environnement - NOMS EXACTS

### Côté serveur (API Routes)

**Fichier:** [lib/supabase-server.js](../../../lib/supabase-server.js)

```javascript
// createSupabaseServerClient() lit:
process.env.NEXT_PUBLIC_SUPABASE_URL      // ✅ Avec NEXT_PUBLIC_
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // ✅ Avec NEXT_PUBLIC_

// createSupabaseAdminClient() lit:
process.env.SUPABASE_SERVICE_ROLE_KEY     // ✅ SANS NEXT_PUBLIC_
```

**⚠️ ATTENTION:** 
- `SUPABASE_SERVICE_ROLE_KEY` (pas `SUPABASE_SERVICE_ROLE`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pas `NEXT_PUBLIC_SUPABASE_KEY`)

---

### Vercel Dashboard Configuration

**Exactement 4 variables:**

```
NEXT_PUBLIC_DEMO_MODE              = false
NEXT_PUBLIC_SUPABASE_URL           = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY      = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY          = eyJhbGc...
```

**Environnements:**
- `NEXT_PUBLIC_*` → Production, Preview, Development
- `SUPABASE_SERVICE_ROLE_KEY` → **Production UNIQUEMENT**

---

### Développement local

**Fichier:** `.env.local` (racine du projet)

```env
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Créer:**
```bash
cp .env.example .env.local
# Éditer .env.local avec vraies valeurs
npm run dev
```

**⚠️ `.env.local` est dans `.gitignore` → ne sera jamais commité**

---

## 🔧 Fixes appliqués (code)

### 1. Forcer dynamic rendering

**Fichier:** [app/api/admin/users/route.js](../../../app/api/admin/users/route.js)

```javascript
// ⚠️ CRITICAL: Sans ça, Next peut optimiser et vider les cookies
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

**Pourquoi:** Next.js peut "pré-render" les routes API et cacher les cookies → 401

---

### 2. Logs diagnostic env vars (serveur uniquement)

**Fichier:** [app/api/admin/users/route.js](../../../app/api/admin/users/route.js)

```javascript
console.log('🔧 API GET /api/admin/users - ENV CHECK:', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE,
  runtime: process.env.NEXT_RUNTIME || 'nodejs'
})
```

**Attendu en PROD:**
```
hasUrl: true
hasAnon: true
hasServiceRole: true
demoMode: 'false'
runtime: 'nodejs'
```

---

### 3. Logs diagnostic cookies

**Fichier:** [app/api/admin/users/route.js](../../../app/api/admin/users/route.js)

```javascript
const cookieStore = cookies()
const allCookies = cookieStore.getAll()
const subaseCookies = cookieNames.filter(name => name.startsWith('sb-'))

console.log('🍪 DIAGNOSTIC COOKIES:', {
  totalCookies: cookieNames.length,
  supabaseCookies: subaseCookies.length,
  supabaseCookieNames: subaseCookies, // Noms uniquement
  hasSupabaseCookies: subaseCookies.length > 0
})
```

**Attendu en PROD (avec user connecté):**
```
totalCookies: 2-3
supabaseCookies: 2
supabaseCookieNames: ['sb-xxx-auth-token', 'sb-xxx-auth-token.0']
hasSupabaseCookies: true
```

**❌ Si `supabaseCookies: 0`:**
- Cookies non envoyés depuis le client
- Vérifier `credentials: 'include'` dans fetch
- Vérifier Site URL Supabase Auth

---

### 4. Logs session/user

**Fichier:** [app/api/admin/users/route.js](../../../app/api/admin/users/route.js)

```javascript
const { data: { user }, error: authError } = await supabase.auth.getUser()

console.log('🔐 SESSION RESULT:', {
  hasUser: !!user,
  userId: user?.id || null,
  userEmail: user?.email || null,
  authError: authError?.message || null
})
```

**Attendu en PROD (avec session valide):**
```
hasUser: true
userId: 'xxx-xxx-xxx'
userEmail: 'contact@jetc-immo.ch'
authError: null
```

**❌ Si `hasUser: false`:**
- Cookies Supabase corrompus/expirés
- Re-login depuis le client
- Vérifier validité de la session

---

### 5. Client fetch avec credentials

**Fichier:** [app/admin/users/page.js](../../../app/admin/users/page.js)

```javascript
const response = await fetch('/api/admin/users', {
  method: 'GET',
  credentials: 'include', // ⚠️ CRITICAL
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
})
```

**✅ Déjà appliqué**

---

## 🌐 Supabase Auth Configuration

**Dashboard → Authentication → URL Configuration:**

### Site URL
```
Production: https://votre-app.vercel.app
Development: http://localhost:3000
```

### Redirect URLs (ajouter)
```
https://votre-app.vercel.app/*
https://votre-app.vercel.app/login
https://votre-app.vercel.app/dashboard
http://localhost:3000/*
http://localhost:3000/login
http://localhost:3000/dashboard
```

**⚠️ Si Site URL incorrect:**
- Cookies Supabase peuvent être rejetés par le navigateur
- Session ne persiste pas entre requêtes
- 401 même avec login réussi

---

## 📊 Logs Vercel attendus (Production)

**Séquence complète pour GET `/api/admin/users`:**

```
🔧 API GET /api/admin/users - ENV CHECK: {
  hasUrl: true,
  hasAnon: true,
  hasServiceRole: true,
  demoMode: 'false',
  runtime: 'nodejs'
}

🍪 DIAGNOSTIC COOKIES: {
  totalCookies: 2,
  supabaseCookies: 2,
  supabaseCookieNames: [ 'sb-xxx-auth-token', 'sb-xxx-auth-token.0' ],
  hasSupabaseCookies: true
}

🔐 SESSION RESULT: {
  hasUser: true,
  userId: 'xxx-xxx-xxx',
  userEmail: 'contact@jetc-immo.ch',
  authError: null
}

✅ API GET /api/admin/users - Autorisé: contact@jetc-immo.ch
```

**➡️ Résultat:** 200 OK avec liste users

---

## ❌ Cas d'erreur et solutions

### Cas 1: Env vars manquantes

**Logs:**
```
hasUrl: false
hasAnon: false
hasServiceRole: false
```

**Solution:**
1. Vercel Dashboard → Settings → Environment Variables
2. Vérifier que les 4 variables existent
3. Vérifier les noms exacts (pas de typo)
4. Redéployer

---

### Cas 2: Pas de cookies Supabase

**Logs:**
```
supabaseCookies: 0
supabaseCookieNames: []
hasSupabaseCookies: false
```

**Solution:**
1. Vérifier `credentials: 'include'` dans le fetch client ✅
2. Vérifier Site URL dans Supabase Auth
3. Re-login côté client
4. Vérifier que le domaine Vercel est correct

---

### Cas 3: Cookies présents mais user null

**Logs:**
```
supabaseCookies: 2
hasUser: false
authError: 'Invalid token'
```

**Solution:**
1. Session expirée → Re-login
2. Clé `ANON_KEY` incorrecte → Vérifier dans Vercel
3. Cookies corrompus → Clear cookies navigateur + re-login

---

## ✅ Résultat attendu

**Après fixes + config correcte:**

1. **Login client:** ✅ Connexion `contact@jetc-immo.ch`
2. **Cookies:** ✅ `sb-xxx-auth-token` présents dans requêtes
3. **API GET:** ✅ `/api/admin/users` → 200 OK
4. **UI:** ✅ `/admin/users` affiche la page
5. **Formulaire:** ✅ Bouton "Créer un utilisateur" visible
6. **API POST:** ✅ `/api/admin/users` crée user + profile

---

## 🎯 Checklist validation

**Avant déploiement:**
- [ ] `.env.local` créé avec vraies valeurs (dev local)
- [ ] 4 variables dans Vercel (noms exacts)
- [ ] `NEXT_PUBLIC_DEMO_MODE=false` en Production
- [ ] Site URL Supabase = domaine Vercel
- [ ] Redirect URLs incluent login/dashboard

**Après déploiement:**
- [ ] Logs Vercel montrent env vars OK
- [ ] Logs montrent cookies Supabase présents
- [ ] Logs montrent user récupéré (`contact@jetc-immo.ch`)
- [ ] GET `/api/admin/users` → 200
- [ ] UI `/admin/users` s'affiche

**Test création user:**
- [ ] Bouton "Créer un utilisateur" cliquable
- [ ] Modal formulaire s'ouvre
- [ ] POST `/api/admin/users` → 201
- [ ] User créé visible dans Supabase Dashboard

---

## 📚 Fichiers modifiés

- ✅ [app/api/admin/users/route.js](../../../app/api/admin/users/route.js): dynamic + logs diagnostic
- ✅ [app/admin/users/page.js](../../../app/admin/users/page.js): credentials include
- ✅ [lib/supabase-server.js](../../../lib/supabase-server.js): noms exacts variables

---

**Fin.**
