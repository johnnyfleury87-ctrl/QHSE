# Guide Déploiement Vercel - Variables d'environnement

**Date:** 23 janvier 2026  
**Objectif:** Configurer correctement les variables d'environnement en production Vercel

---

## 🚀 Déploiement Production

### 1️⃣ Configurer les variables dans Vercel Dashboard

**Accès:**
1. [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionner le projet QHSE
3. Settings → Environment Variables

---

### 2️⃣ Variables à configurer

| Variable | Valeur | Environnement | Description |
|----------|--------|--------------|-------------|
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Production, Preview, Development | Mode production (pas démo) |
| `NEXT_PUBLIC_SUPABASE_URL` | Votre URL Supabase | Production, Preview, Development | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Votre clé anon | Production, Preview, Development | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Votre service_role key | **Production UNIQUEMENT** | Clé secrète admin |

---

### 3️⃣ Récupérer les valeurs Supabase

**Supabase Dashboard:**
1. [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Settings → API

**Copier:**
- **URL**: `https://xxx.supabase.co` → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public**: `eyJhbGc...` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role**: `eyJhbGc...` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️

---

### 4️⃣ Ajouter dans Vercel (étape par étape)

#### Variable 1: DEMO_MODE
```
Name: NEXT_PUBLIC_DEMO_MODE
Value: false
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 2: Supabase URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://votre-projet.supabase.co
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 3: Supabase Anon Key
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGc... (copier depuis Supabase)
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 4: Service Role Key (⚠️ CRITIQUE)
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGc... (copier depuis Supabase)
Environments: ☑ Production UNIQUEMENT
```

**⚠️ ATTENTION:**
- `SUPABASE_SERVICE_ROLE_KEY` ne doit être cochée que sur **Production**
- Cette clé bypass toutes les RLS policies Supabase
- Ne JAMAIS l'exposer côté client

---

### 5️⃣ Vérifier la configuration

**Checklist:**
- [ ] 4 variables créées
- [ ] `NEXT_PUBLIC_DEMO_MODE` = `false` (pas `true`)
- [ ] Les 3 premières sur Production + Preview + Development
- [ ] `SUPABASE_SERVICE_ROLE_KEY` sur Production uniquement
- [ ] Valeurs copiées-collées depuis Supabase (pas de typo)

---

### 6️⃣ Configurer Supabase Auth

**Supabase Dashboard → Authentication → URL Configuration:**

**Site URL:**
```
https://votre-app.vercel.app
```

**Redirect URLs (ajouter):**
```
https://votre-app.vercel.app/login
https://votre-app.vercel.app/dashboard
https://votre-app.vercel.app/*
```

**Redirect URLs locales (pour dev):**
```
http://localhost:3000/login
http://localhost:3000/dashboard
http://localhost:3000/*
```

---

### 7️⃣ Déployer

**Option 1: Push Git (auto-deploy)**
```bash
git add .
git commit -m "fix: configurer variables env production"
git push origin main
```

Vercel détecte le push et déploie automatiquement.

**Option 2: Vercel CLI**
```bash
vercel --prod
```

---

### 8️⃣ Vérifier le déploiement

**Logs attendus:**

Ouvrir Vercel → Deployments → Latest → Runtime Logs

**Boot server:**
```
🚀 ============================================
🚀 QHSE APP - PRODUCTION
🚀 Context: root-layout-server
🚀 ============================================
📊 Configuration:
   - DEMO_MODE: false         ✅
   - Supabase URL: ✅
   - Anon Key: ✅
   - Service Role: ✅
   - Environment: production
   - Side: SERVER
🚀 ============================================
```

**❌ Si vous voyez "DÉMO" au lieu de "PRODUCTION":**
```
🎭 QHSE APP - DÉMO
```
→ `NEXT_PUBLIC_DEMO_MODE` est encore à `true` dans Vercel

---

### 9️⃣ Test fonctionnel

**Accéder à l'app:**
```
https://votre-app.vercel.app
```

**Test login:**
1. Cliquer "Se connecter"
2. Email: `contact@jetc-immo.ch`
3. Mot de passe: (votre mot de passe)
4. ✅ Redirection vers `/dashboard`

**Test admin users:**
1. Cliquer "Admin" dans le menu
2. Cliquer "Utilisateurs"
3. ✅ Liste des utilisateurs s'affiche (pas de 401)
4. Cliquer "Créer un utilisateur"
5. Remplir le formulaire
6. ✅ Utilisateur créé avec succès

---

## 🔧 Développement local

**Fichier `.env.local` (à créer):**
```env
# Mode
NEXT_PUBLIC_DEMO_MODE=false

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Commandes:**
```bash
# Copier template
cp .env.example .env.local

# Éditer et remplir les valeurs
nano .env.local

# Démarrer
npm run dev
```

**⚠️ Ne JAMAIS committer `.env.local`**
```bash
# Déjà dans .gitignore
.env.local
```

---

## 🐛 Troubleshooting

### Erreur: "Mode Démo" affiché en PROD

**Cause:** `NEXT_PUBLIC_DEMO_MODE=true` dans Vercel

**Solution:**
1. Vercel → Settings → Environment Variables
2. Trouver `NEXT_PUBLIC_DEMO_MODE`
3. Changer valeur: `false`
4. Save
5. Redéployer

---

### Erreur 401 sur /api/admin/users

**Cause 1:** Variables Supabase manquantes

**Solution:**
1. Vérifier que les 3 variables sont présentes
2. Vérifier qu'elles sont sur Production
3. Redéployer

**Cause 2:** `SUPABASE_SERVICE_ROLE_KEY` manquante

**Solution:**
1. Vercel → Environment Variables
2. Ajouter `SUPABASE_SERVICE_ROLE_KEY`
3. Cocher **Production uniquement**
4. Redéployer

---

### Erreur: Supabase URL/Key invalide

**Cause:** Typo dans la copie-coller

**Solution:**
1. Revenir sur Supabase Dashboard → Settings → API
2. Re-copier les valeurs
3. Vercel → Edit variable → Coller
4. Save
5. Redéployer

---

### Erreur: Redirect après login échoue

**Cause:** Site URL mal configuré dans Supabase

**Solution:**
1. Supabase → Authentication → URL Configuration
2. Site URL: `https://votre-app.vercel.app`
3. Redirect URLs: ajouter `/login`, `/dashboard`, `/*`
4. Save
5. Ré-essayer login

---

## 📚 Références

- [docs/Conception/ETAPE_06/RAPPORT_ENV_SESSION.md](RAPPORT_ENV_SESSION.md): Rapport complet
- [.env.example](../../../.env.example): Template variables
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Supabase Auth URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)

---

## ✅ Checklist finale

- [ ] 4 variables créées dans Vercel
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] Valeurs Supabase correctes
- [ ] `SUPABASE_SERVICE_ROLE_KEY` sur Production uniquement
- [ ] Site URL configuré dans Supabase
- [ ] Redirect URLs ajoutées dans Supabase
- [ ] Déployé via Git push ou Vercel CLI
- [ ] Logs montrent "PRODUCTION" (pas "DÉMO")
- [ ] Login fonctionne
- [ ] Admin users fonctionne (GET + POST)

---

**Fin du guide.**
