# ✅ UI "Créer utilisateur" - Confirmation présence

**Date:** 23 janvier 2026  
**Statut:** ✅ UI EXISTANTE + AMÉLIORATIONS APPLIQUÉES

---

## 🎯 Confirmation: L'UI existe déjà !

### Fichiers vérifiés

✅ **Page admin principale:** [`app/admin/page.js`](app/admin/page.js)
- Carte "Gestion de la plateforme"
- Bouton **"Gérer les utilisateurs"** (ligne 172)
- Lien vers `/admin/users`

✅ **Page gestion utilisateurs:** [`app/admin/users/page.js`](app/admin/users/page.js)
- Liste complète des utilisateurs (table filtrable)
- Bouton **"Créer un utilisateur"** dans le header (ligne 173)
- Modal de création intégré (lignes 320-491)

✅ **API création:** [`app/api/admin/users/route.js`](app/api/admin/users/route.js)
- Route POST `/api/admin/users`
- Vérifie `is_jetc_admin` côté serveur
- Utilise `SUPABASE_SERVICE_ROLE_KEY` pour créer user Auth + profile

---

## 🔧 Améliorations appliquées

### 1. Visibilité accrue du bouton "Gérer les utilisateurs"

**Avant:** Bouton outline gris, peu visible

**Après:** Carte mise en avant avec:
- Fond primary (bleu)
- Taille augmentée (`py-4`)
- Icône + texte + description
- Position en haut de la liste

[`app/admin/page.js`](app/admin/page.js#L165-L185)

```javascript
<Button variant="default" className="w-full justify-between bg-primary text-primary-foreground hover:bg-primary/90 h-auto py-4">
  <span className="flex items-center gap-3">
    <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
      <Users className="h-5 w-5" />
    </div>
    <div className="text-left">
      <div className="font-semibold">Gérer les utilisateurs</div>
      <div className="text-xs opacity-90">Créer, modifier, désactiver des comptes</div>
    </div>
  </span>
  <ArrowRight className="h-5 w-5" />
</Button>
```

### 2. Logs diagnostiques ajoutés

**Dans [`app/admin/page.js`](app/admin/page.js#L27-L37):**

```javascript
console.log('📊 ADMIN DASHBOARD render:', {
  hasProfile: !!profile,
  profileRole: profile?.role,
  isJetcAdmin: profile?.is_jetc_admin,
  loading,
  hasError: !!error,
  hasStats: !!stats
})
```

**Dans [`app/admin/users/page.js`](app/admin/users/page.js#L32-L43):**

```javascript
console.log('👥 ADMIN USERS PAGE render:', {
  hasUser: !!user,
  loading,
  hasError: !!error,
  usersCount: users.length,
  filteredCount: filteredUsers.length,
  showModal: showCreateModal
})
```

---

## 📍 Chemin complet pour créer un utilisateur

### Étape 1: Accéder à l'admin

1. Se connecter avec `contact@jetc-immo.ch`
2. Aller sur `/` (accueil)
3. Cliquer sur **"Entrer dans l'espace admin"** (bloc JETC)
   → Redirect vers `/admin`

### Étape 2: Accéder à la gestion utilisateurs

Sur `/admin`, dans la carte **"Gestion de la plateforme"**:
- Bouton bleu **"Gérer les utilisateurs"** (en haut, impossible à rater)
- Cliquer dessus → Redirect vers `/admin/users`

### Étape 3: Créer un utilisateur

Sur `/admin/users`:
1. Bouton vert **"+ Créer un utilisateur"** (en haut à droite du header)
2. Cliquer → Modal s'ouvre
3. Remplir:
   - Email *
   - Prénom *
   - Nom *
   - Rôle * (dropdown)
4. Info affichée: Mot de passe par défaut = `Test1234!`
5. Cliquer **"Créer"**
6. → Appel API `/api/admin/users` (POST)
7. → Création user Auth + profile
8. → Rechargement liste automatique

---

## 🧪 Validation avec logs

### Console attendue sur `/admin`

```javascript
// Render page admin
📊 ADMIN DASHBOARD render: {
  hasProfile: true,
  profileRole: 'admin_dev',
  isJetcAdmin: true,
  loading: false,
  hasError: false,
  hasStats: true  // ou false pendant chargement
}

// Stats chargées (ou erreur)
✅ Stats: { users: 5, audits: 12, nonConformites: 3, actions: 8 }
```

### Console attendue sur `/admin/users`

```javascript
// Render page users
👥 ADMIN USERS PAGE render: {
  hasUser: true,
  loading: false,
  hasError: false,
  usersCount: 5,
  filteredCount: 5,
  showModal: false
}

// Après clic "Créer un utilisateur"
👥 ADMIN USERS PAGE render: {
  ...,
  showModal: true  // ← Modal ouvert
}
```

### Console lors de la création

```javascript
// Appel API
POST /api/admin/users
Body: {
  "email": "nouveau@example.com",
  "first_name": "Nouveau",
  "last_name": "User",
  "role": "viewer"
}

// Réponse succès
{
  "success": true,
  "user": {
    "id": "...",
    "email": "nouveau@example.com",
    "first_name": "Nouveau",
    "last_name": "User",
    "role": "viewer",
    "status": "active"
  }
}

// Liste rechargée
👥 ADMIN USERS PAGE render: {
  usersCount: 6,  // ← +1
  filteredCount: 6
}
```

---

## ⚠️ Si le bouton n'est toujours pas visible

### Causes possibles

1. **Page `/admin` ne charge pas**
   - Vérifier console: `📊 ADMIN DASHBOARD render`
   - Si absent → problème guard/layout (spinner infini résolu normalement)

2. **Erreur chargement stats**
   - Console: `hasError: true`
   - Vérifier permissions RLS sur tables `profiles`, `audits`, `non_conformites`, `actions_correctives`
   - → Section "Accès rapide" s'affiche quand même (après états loading/error)

3. **CSS masque le bouton**
   - Improbable mais vérifier:
   - DevTools > Inspecter bouton "Gérer les utilisateurs"
   - Vérifier `display`, `visibility`, `opacity`

4. **JavaScript désactivé**
   - Page admin est en `'use client'` → nécessite JS
   - Vérifier console errors

### Debug immédiat

Ouvrir DevTools Console et chercher:

```javascript
// Doit apparaître
📊 ADMIN DASHBOARD render

// Si absent → layout admin bloque
🛡️ GUARD ADMIN  // Voir logs du guard

// Si présent mais bouton invisible → CSS/DOM issue
```

---

## 🔐 Variables d'environnement requises (Production)

**Pour que l'API de création fonctionne:**

```bash
# Vercel Dashboard > Settings > Environment Variables
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # ⚠️ CRITIQUE
```

**Si manquant:**

```javascript
// Erreur API
POST /api/admin/users → 500 Internal Server Error
{
  "error": "Erreur serveur interne"
}

// Console serveur (Vercel logs)
Error: supabaseUrl is required
```

**Solution:** Ajouter la variable dans Vercel + redéployer

---

## 📊 Résumé

| Élément | Statut | Fichier |
|---------|--------|---------|
| Page `/admin` | ✅ Existe | [app/admin/page.js](app/admin/page.js) |
| Bouton "Gérer utilisateurs" | ✅ Existe + **Amélioré** | [app/admin/page.js](app/admin/page.js#L165) |
| Page `/admin/users` | ✅ Existe | [app/admin/users/page.js](app/admin/users/page.js) |
| Bouton "Créer utilisateur" | ✅ Existe | [app/admin/users/page.js](app/admin/users/page.js#L173) |
| Modal création | ✅ Existe | [app/admin/users/page.js](app/admin/users/page.js#L320) |
| API POST `/api/admin/users` | ✅ Existe | [app/api/admin/users/route.js](app/api/admin/users/route.js) |
| Logs diagnostiques | ✅ Ajoutés | Toutes les pages admin |

**Conclusion:** Tout est en place. Si le bouton n'apparaît pas, c'est un problème de rendu côté client (vérifier logs console).

---

## 🗑️ TODO après validation

Une fois validé que l'UI est bien visible, **supprimer les logs temporaires:**

```bash
# Supprimer dans app/admin/page.js
grep -n "console.log.*📊 ADMIN DASHBOARD" app/admin/page.js

# Supprimer dans app/admin/users/page.js
grep -n "console.log.*👥 ADMIN USERS PAGE" app/admin/users/page.js
```

Garder les logs du guard admin ([app/admin/layout.js](app/admin/layout.js)) jusqu'à validation complète.
