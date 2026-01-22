# Déploiement Vercel - QHSE App

## 🚀 Configuration Vercel

### 1. Framework & Build Settings

Dans **Vercel Project Settings** → **General**:

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: (laisser vide - default)
Install Command: npm install
```

⚠️ **IMPORTANT**: Ne pas mettre `public` comme Output Directory

### 2. Root Directory

Si votre repo contient plusieurs projets:
- Laisser vide (`.`) si Next.js est à la racine
- Sinon, spécifier le sous-dossier (ex: `apps/qhse`)

Pour ce projet: **laisser vide** (`.`)

### 3. Variables d'environnement

Dans **Vercel Project Settings** → **Environment Variables**:

**Mode Démo** (recommandé pour test):
```
NEXT_PUBLIC_DEMO_MODE=true
```

**Mode Production** (avec Supabase):
```
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
```

### 4. Node Version

Vercel utilise Node 18.x par défaut (compatible).

Si besoin de forcer:
```json
// package.json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 🔧 Fichiers de configuration

### `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

### `.vercelignore`
Exclut les fichiers inutiles du déploiement:
- Documentation (`docs/`, `*.md`)
- Migrations SQL (`supabase/`)
- Scripts dev

---

## ✅ Checklist avant déploiement

- [ ] `vercel.json` présent à la racine
- [ ] Framework Preset = **Next.js** (pas "Other")
- [ ] Output Directory = **vide** (pas "public")
- [ ] Variables d'environnement configurées
- [ ] Build local OK: `npm run build`
- [ ] Dossier `public/` existe (même vide avec `.gitkeep`)

---

## 🐛 Troubleshooting

### Erreur: "No Output Directory named 'public' found"

**Cause**: Vercel pense que c'est un Static Site, pas Next.js

**Solution**:
1. Vérifier Framework Preset = **Next.js**
2. Vérifier Output Directory = **vide**
3. S'assurer que `next.config.js` existe
4. Vérifier que `app/` ou `pages/` existe

### Erreur: Build timeout

**Solution**:
- Vérifier que `node_modules` n'est pas committé
- Vérifier `.vercelignore` exclut les gros dossiers inutiles

### Erreur: "Module not found"

**Cause**: Chemins absolus (`@/components`) non résolus

**Solution**:
- Vérifier `jsconfig.json` présent avec `baseUrl` et `paths`

---

## 📦 Build Output (attendu)

Après un build réussi:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    2.28 kB          97 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ○ /login                               4.15 kB         149 kB
└ ○ /profil                              3.12 kB         148 kB
```

Le dossier `.next/` est créé automatiquement (Vercel le gère).

---

## 🔗 Liens utiles

- [Vercel Next.js Docs](https://vercel.com/docs/frameworks/nextjs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🎯 Quick Deploy

1. Push sur GitHub:
```bash
git add -A
git commit -m "fix: config Vercel + upgrade Next.js"
git push
```

2. Sur Vercel:
- Import depuis GitHub
- Framework: Next.js (auto-détecté si `vercel.json` présent)
- Deploy

3. Vérifier:
- Build logs: ✅ "Compiled successfully"
- Preview URL: pages accessibles
- Variables env: `NEXT_PUBLIC_DEMO_MODE=true`

---

**Note**: Ce projet utilise Next.js 14.2.18 (App Router) avec Tailwind CSS et Supabase optionnel.
