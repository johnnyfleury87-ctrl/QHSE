# Tableau Variables d'Environnement - Source of Truth

## 📋 Vue d'ensemble

| Variable | .env.local (DEV) | Vercel Production | Vercel Preview | Vercel Dev | Description |
|----------|------------------|-------------------|----------------|------------|-------------|
| `NEXT_PUBLIC_DEMO_MODE` | `false` | `false` ✅ | `false` | `true` | Mode démo/prod |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | `https://xxx.supabase.co` ✅ | `https://xxx.supabase.co` | `https://xxx.supabase.co` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | `eyJhbGc...` ✅ | `eyJhbGc...` | `eyJhbGc...` | Clé publique |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | `eyJhbGc...` ✅ | ❌ | ❌ | Clé secrète admin |

---

## 🔑 Où récupérer les valeurs

**Supabase Dashboard → Settings → API:**

| Variable Vercel | Champ Supabase | Note |
|----------------|----------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` | Safe côté client |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` | ⚠️ SECRET - Server uniquement |

---

## 🛡️ Sécurité

### Variables NEXT_PUBLIC_* (exposées client)
- ✅ `NEXT_PUBLIC_DEMO_MODE`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

→ Peuvent être lues côté client (safe, Supabase design)

### Variable SUPABASE_SERVICE_ROLE_KEY
- ❌ **NE JAMAIS** préfixer `NEXT_PUBLIC_`
- ❌ **NE JAMAIS** exposer côté client
- ✅ Utiliser UNIQUEMENT dans API Routes (`app/api/*`)
- ⚠️ Cette clé **bypass toutes les RLS policies**

---

## 📍 Où les mettre

### 1. Développement local

**Fichier:** `.env.local` (à la racine du projet)

```env
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Commandes:**
```bash
cp .env.example .env.local
# Éditer .env.local avec vraies valeurs
npm run dev
```

**⚠️ `.env.local` est dans `.gitignore` → ne sera jamais commité**

---

### 2. Vercel Production

**Accès:**
- [Vercel Dashboard](https://vercel.com/dashboard)
- Project → Settings → Environment Variables

**Ajouter 4 variables:**

#### Variable 1
```
Name: NEXT_PUBLIC_DEMO_MODE
Value: false
Environments: ☑ Production ☑ Preview ☐ Development
```

#### Variable 2
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://xxx.supabase.co
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 3
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGc...
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 4 (⚠️ CRITIQUE)
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGc...
Environments: ☑ Production ☐ Preview ☐ Development
```

**IMPORTANT:** `SUPABASE_SERVICE_ROLE_KEY` sur **Production uniquement**

---

### 3. Supabase Auth Settings

**Dashboard → Authentication → URL Configuration:**

| Champ | Valeur Production | Valeur Locale |
|-------|-------------------|---------------|
| Site URL | `https://votre-app.vercel.app` | `http://localhost:3000` |
| Redirect URLs | `https://votre-app.vercel.app/*` | `http://localhost:3000/*` |

**Ajouter explicitement:**
```
https://votre-app.vercel.app/login
https://votre-app.vercel.app/dashboard
http://localhost:3000/login
http://localhost:3000/dashboard
```

---

## ✅ Validation

### Logs attendus (Production)

**Au boot:**
```
🚀 ============================================
🚀 QHSE APP - PRODUCTION
🚀 ============================================
📊 Configuration:
   - DEMO_MODE: false         ✅
   - Supabase URL: ✅
   - Anon Key: ✅
   - Service Role: ✅
```

**❌ Si vous voyez:**
```
🎭 QHSE APP - DÉMO
   - DEMO_MODE: true          ❌
```
→ Fixer `NEXT_PUBLIC_DEMO_MODE=false` dans Vercel

---

### Tests fonctionnels

1. **Login:** ✅ Connexion avec `contact@jetc-immo.ch`
2. **Dashboard:** ✅ Affiche données réelles (pas mockées)
3. **Admin Users:** ✅ GET `/api/admin/users` → 200 (pas 401)
4. **Créer User:** ✅ POST `/api/admin/users` → 201

---

## 🚨 Troubleshooting rapide

| Problème | Solution |
|----------|----------|
| Bannière "Mode Démo" en PROD | `NEXT_PUBLIC_DEMO_MODE=false` dans Vercel |
| 401 sur `/api/admin/users` | Vérifier `SUPABASE_SERVICE_ROLE_KEY` présente |
| Redirect login échoue | Vérifier Site URL + Redirect URLs Supabase |
| Crash SSR au boot | Vérifier syntaxe des clés (typo) |

---

## 📚 Fichiers modifiés

- ✅ [lib/env-diagnostic.js](../../../lib/env-diagnostic.js): Logs diagnostic
- ✅ [app/layout.js](../../../app/layout.js): Appel log au boot
- ✅ [src/config/demoConfig.js](../../../src/config/demoConfig.js): Mode démo/prod
- ✅ [app/admin/users/page.js](../../../app/admin/users/page.js): `credentials: 'include'`
- ✅ [.env.example](../../../.env.example): Template mis à jour

---

## 🎯 Checklist déploiement

- [ ] `.env.local` créé et rempli (dev local)
- [ ] 4 variables créées dans Vercel
- [ ] `NEXT_PUBLIC_DEMO_MODE=false` en Production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` sur Production uniquement
- [ ] Site URL configuré dans Supabase
- [ ] Redirect URLs ajoutées dans Supabase
- [ ] Code déployé via Git push
- [ ] Logs Vercel montrent "PRODUCTION"
- [ ] Login fonctionne
- [ ] Admin users accessible

---

**Fin.**
