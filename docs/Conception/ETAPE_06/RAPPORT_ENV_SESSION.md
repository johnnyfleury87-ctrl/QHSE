# Rapport: Variables d'environnement et Session Serveur

**Date:** 23 janvier 2026  
**Objectif:** Débloquer l'admin users en PROD (Vercel) sans toucher aux migrations

---

## 🔍 Diagnostic

### 1. Root Cause: Mode DÉMO activé en PROD

**Symptôme:**
- Bannière "Mode Démo" affichée en production
- Données mockées au lieu des vraies données Supabase
- APIs fonctionnent mais l'UI affiche des fausses données

**Cause:**
- Variable `NEXT_PUBLIC_DEMO_MODE=true` active en PROD
- Devrait être `false` pour utiliser Supabase

**Solution appliquée:**
- ✅ Logs diagnostic ajoutés au boot ([lib/env-diagnostic.js](../../../lib/env-diagnostic.js))
- ✅ Logs appelés dans [app/layout.js](../../../app/layout.js) et [src/config/demoConfig.js](../../../src/config/demoConfig.js)

---

### 2. Session non lue côté serveur (401 "Pas de session valide")

**Symptôme:**
- Vercel logs: `GET /api/admin/users → 401` alors que le front est connecté
- API ne récupère pas la session via cookies

**Cause:**
- Fetch côté client n'envoyait pas les cookies Supabase
- Missing: `credentials: 'include'` dans les appels `fetch()`

**Solution appliquée:**
- ✅ Ajout `credentials: 'include'` dans tous les fetch ([app/admin/users/page.js](../../../app/admin/users/page.js)):
  - GET `/api/admin/users`
  - POST `/api/admin/users`
  - PATCH `/api/admin/users/:id`
- ✅ L'API utilise déjà `createSupabaseServerClient()` avec cookies handlers corrects

---

### 3. Export/Import Supabase Client

**Vérification:**
- ✅ [src/lib/supabaseClient.js](../../../src/lib/supabaseClient.js): `export { supabase }` + `export default supabase`
- ✅ [lib/supabase-client.js](../../../lib/supabase-client.js): Wrapper qui réexporte correctement
- ✅ Pas de crash SSR lié aux exports

---

### 4. UI Création Utilisateur

**État:**
- ✅ Formulaire complet existant dans [app/admin/users/page.js](../../../app/admin/users/page.js)
- ✅ Modal avec champs: email, first_name, last_name, role
- ✅ POST `/api/admin/users` fonctionnel
- ✅ Ajout `credentials: 'include'` pour l'envoi des cookies

---

## 📋 Variables d'environnement - Source of Truth

### Développement local (.env.local)

```env
# Mode
NEXT_PUBLIC_DEMO_MODE=false

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

**Commandes:**
```bash
cp .env.example .env.local
# Remplir les valeurs
npm run dev
```

---

### Production Vercel

| Variable | Valeur | Environnement | Note |
|----------|--------|--------------|------|
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Production, Preview | ⚠️ CRITICAL: Doit être `false` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhb...` | Production, Preview | Clé publique anon |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhb...` | ✅ **Production uniquement** | ⚠️ SECRET: Bypass RLS |

**Où configurer:**
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Ajouter chaque variable avec les environnements cochés
3. Déployer: `vercel --prod`

**⚠️ ATTENTION:**
- `SUPABASE_SERVICE_ROLE_KEY` = **SECRET ABSOLU**
- Ne JAMAIS committer avec vraie valeur
- Utiliser UNIQUEMENT dans API Routes (`app/api/*`)
- Cette clé **bypass toutes les RLS policies**

---

### Supabase Auth Settings

**Site URL:**
```
https://votre-app.vercel.app
```

**Redirect URLs:**
```
https://votre-app.vercel.app/login
https://votre-app.vercel.app/dashboard
```

**Vérifier:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Ajouter les URLs de production Vercel

---

## 🔐 Logs diagnostic (production)

**Attendu en PROD:**
```
🚀 ============================================
🚀 QHSE APP - PRODUCTION
🚀 Context: root-layout-server
🚀 ============================================
📊 Configuration:
   - DEMO_MODE: false
   - Supabase URL: ✅
   - Anon Key: ✅
   - Service Role: ✅
   - Environment: production
   - Side: SERVER
🚀 ============================================
```

**Si DEMO_MODE=true en PROD:**
```
🎭 QHSE APP - DÉMO  ⬅️ ❌ INCORRECT EN PROD
```

---

## ✅ Checklist déploiement

- [ ] Vercel: `NEXT_PUBLIC_DEMO_MODE=false` (Production + Preview)
- [ ] Vercel: `NEXT_PUBLIC_SUPABASE_URL` présent
- [ ] Vercel: `NEXT_PUBLIC_SUPABASE_ANON_KEY` présent
- [ ] Vercel: `SUPABASE_SERVICE_ROLE_KEY` présent (Production uniquement)
- [ ] Supabase: Site URL = URL Vercel production
- [ ] Supabase: Redirect URLs incluent login/dashboard
- [ ] Déployer: `git push` → Vercel auto-deploy
- [ ] Vérifier logs: voir "PRODUCTION" au boot (pas "DÉMO")
- [ ] Tester login: contact@jetc-immo.ch
- [ ] Tester admin users: créer/lister utilisateurs

---

## 🛡️ Sécurité

### Variables NEXT_PUBLIC_*
- ✅ Exposées côté client (safe)
- ✅ `SUPABASE_URL` + `ANON_KEY` sont publiques

### Variable SUPABASE_SERVICE_ROLE_KEY
- ❌ **NE JAMAIS** exposer côté client
- ❌ **NE JAMAIS** préfixer avec `NEXT_PUBLIC_`
- ✅ Utiliser UNIQUEMENT dans `app/api/*` (server-side)
- ✅ Bypass RLS: créer/modifier/supprimer users

### Fichiers concernés
- [app/api/admin/users/route.js](../../../app/api/admin/users/route.js): Utilise `createSupabaseAdminClient()`
- [lib/supabase-server.js](../../../lib/supabase-server.js): Lit `process.env.SUPABASE_SERVICE_ROLE_KEY`

---

## 📊 Preuves (sans secrets)

### Logs attendus au boot

**Server-side:**
```javascript
logEnvDiagnostic('root-layout-server')
// Affiche: DEMO_MODE, hasSupabaseUrl, hasAnonKey, hasServiceRoleKey
```

**Client-side:**
```javascript
logEnvDiagnostic('demoConfig-client')
// Affiche: DEMO_MODE, hasSupabaseUrl, hasAnonKey (pas ServiceRole)
```

### Fetch avec credentials

```javascript
fetch('/api/admin/users', {
  credentials: 'include', // ⚠️ CRITICAL
  headers: { 'Authorization': `Bearer ${token}` }
})
```

Sans `credentials: 'include'`, les cookies Supabase Auth ne sont pas envoyés → 401.

---

## 🎯 Résultat attendu

**Après déploiement avec env vars correctes:**

1. ✅ Pas de bannière "Mode Démo" en PROD
2. ✅ Login fonctionne (contact@jetc-immo.ch)
3. ✅ `/admin/users` affiche la liste (200)
4. ✅ Bouton "Créer un utilisateur" fonctionnel
5. ✅ POST `/api/admin/users` crée user + profile
6. ✅ Logs montrent "PRODUCTION" au boot

---

## 📚 Références

- [.env.example](../../../.env.example): Template variables
- [lib/env-diagnostic.js](../../../lib/env-diagnostic.js): Logs diagnostic
- [lib/supabase-server.js](../../../lib/supabase-server.js): Session serveur
- [app/api/admin/users/route.js](../../../app/api/admin/users/route.js): API admin users
- [app/admin/users/page.js](../../../app/admin/users/page.js): UI admin users

---

## 🔄 Prochaines étapes

1. **Déploiement Vercel:**
   - Configurer les 4 variables d'environnement
   - Déployer en production
   - Vérifier logs au boot

2. **Test fonctionnel:**
   - Login avec contact@jetc-immo.ch
   - Accéder à `/admin/users`
   - Créer un utilisateur de test
   - Vérifier données dans Supabase

3. **Monitoring:**
   - Vercel logs: pas de 401 sur `/api/admin/users`
   - Supabase logs: créations users OK
   - Pas de crash SSR

---

**Fin du rapport.**
