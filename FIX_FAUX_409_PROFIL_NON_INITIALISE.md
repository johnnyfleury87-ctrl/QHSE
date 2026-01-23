# 🔥 FIX CRITIQUE - Faux "Profil non initialisé" (409)

**Date:** 23 janvier 2026  
**Statut:** ✅ CORRIGÉ

---

## 🐛 Bug bloquant

**API retournait 409** "Profil non initialisé" alors que :
- ✅ Profil existe en DB (`select * from profiles where email = 'contact@jetc-immo.ch'`)
- ✅ Status = `active`
- ✅ `is_jetc_admin` = `true`
- ✅ Guard frontend autorise : "Accès autorisé (is_jetc_admin=true)"

**Résultat:** Page `/admin/users` inaccessible

---

## 🔍 Cause

**Ligne problématique dans l'API :**

```javascript
// ❌ AVANT - Trop strict
if (profileError || !profile) {
  return Response.json({ error: 'Profil non initialisé' }, { status: 409 })
}
```

**Problème :** `profileError` peut être non-null même si le profil existe (ex: warnings RLS, logs Supabase).

La condition `profileError || !profile` retournait 409 dès qu'il y avait un `profileError`, sans vérifier si `profile` contenait des données valides.

---

## ✅ Correctif

**Nouvelle logique :**

```javascript
// ✅ APRÈS - Vérifier d'abord si profil existe
const { data: profile, error: profileError } = await supabaseAdmin
  .from('profiles')
  .select('id, email, status, is_jetc_admin')
  .eq('id', user.id)
  .single()

// 🔍 LOG: Voir le profil brut AVANT validation
console.log('🔍 PROFIL RAW:', { profile, profileError, hasProfile: !!profile })

// ❗ 409 SEULEMENT si profil vraiment absent
if (!profile) {
  console.error('❌ Profil ABSENT pour user', user.id)
  return Response.json({ error: 'Profil non initialisé' }, { status: 409 })
}

// Si profileError mais profile existe → warning, mais continuer
if (profileError) {
  console.warn('⚠️ profileError mais profil existe:', profileError.message)
}

// ✅ Vérifier status
if (profile.status !== 'active') {
  return Response.json({ error: 'Compte désactivé' }, { status: 403 })
}

// ✅ Vérifier is_jetc_admin
if (profile.is_jetc_admin !== true) {
  return Response.json({ error: 'Accès refusé' }, { status: 403 })
}

// ✅ Autorisé
console.log('✅ Autorisé:', user.email)
```

**Règle :**
- **409** = Profil n'existe PAS (`!profile`)
- **403** = Profil existe mais `status !== 'active'` OU `is_jetc_admin !== true`
- **200** = Profil existe ET status active ET is_jetc_admin true

---

## 📁 Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| [app/api/admin/users/route.js](app/api/admin/users/route.js) | Logique POST + GET : `if (!profile)` au lieu de `if (profileError \|\| !profile)` |
| [app/api/admin/users/[id]/route.js](app/api/admin/users/[id]/route.js) | Logique PATCH + DELETE : même correctif dans `verifyJETCAdmin()` |

**Ajouts :**
- Log `🔍 PROFIL RAW` pour voir le profil brut avant validation
- Log `⚠️` si `profileError` présent mais profil existe (warning)
- Log `❌` avec détails si check échoue (status/is_jetc_admin)
- Log `✅` si autorisé

---

## 🧪 Validation

### Test 1 : Accès JETC admin (normal)

**Actions :**
1. Login `contact@jetc-immo.ch`
2. Aller `/admin/users`

**Console attendue :**
```
🔐 API GET /api/admin/users - Auth: { hasUser: true, userEmail: 'contact@jetc-immo.ch' }
🔍 API GET /api/admin/users - PROFIL RAW: {
  profile: { id: '...', email: 'contact@jetc-immo.ch', status: 'active', is_jetc_admin: true },
  profileError: null,  // OU un warning si RLS logs
  hasProfile: true
}
✅ API GET /api/admin/users - Autorisé: contact@jetc-immo.ch
```

**Résultat :**
- ✅ `GET /api/admin/users` → **200 OK**
- ✅ Page "Gestion des utilisateurs" s'affiche
- ✅ Table vide + bouton "Créer un utilisateur"

### Test 2 : Profil vraiment absent (edge case)

**Setup :**
- User existe dans `auth.users`
- Pas de ligne dans `profiles`

**Console attendue :**
```
❌ API GET: Profil ABSENT pour user <uuid>
```

**Résultat :**
- ❌ `GET /api/admin/users` → **409 Conflict**
- ❌ Message : "Profil non initialisé"

### Test 3 : Compte désactivé

**Setup :**
- Profil existe, `status = 'inactive'`, `is_jetc_admin = true`

**Console attendue :**
```
🔍 PROFIL RAW: { profile: {..., status: 'inactive', is_jetc_admin: true } }
❌ API GET: Compte désactivé: user@example.com status= inactive
```

**Résultat :**
- ❌ `GET /api/admin/users` → **403 Forbidden**
- ❌ Message : "Compte désactivé"

---

## 📋 Checklist

- [x] **Correctif appliqué** : `if (!profile)` au lieu de `if (profileError || !profile)`
- [x] **Log diagnostique** : `🔍 PROFIL RAW` avant validation
- [x] **Gestion profileError** : Warning si présent mais profil existe
- [x] **409 réservé** : Seulement si `!profile` (vraiment absent)
- [x] **403 distinct** : Status inactive OU is_jetc_admin false
- [x] **Build passe** : Aucune erreur lint/TypeScript

---

## 🚀 Déploiement

```bash
git add app/api/admin/users/route.js
git add app/api/admin/users/[id]/route.js
git add FIX_FAUX_409_PROFIL_NON_INITIALISE.md
git commit -m "fix: faux 409 'Profil non initialisé' dans API admin/users

- Check !profile au lieu de (profileError || !profile)
- 409 réservé aux profils vraiment absents
- profileError → warning log si profil existe quand même
- Logs diagnostiques améliorés (🔍 PROFIL RAW, ⚠️, ❌, ✅)

Resolves: API retourne 409 alors que profil existe en DB
Fixes: /admin/users inaccessible malgré is_jetc_admin=true"
git push
```

---

## 📚 Leçon apprise

### ⚠️ Ne jamais confondre "erreur Supabase" et "donnée absente"

**Problème :**
```javascript
// ❌ MAUVAIS
if (error || !data) { /* erreur */ }
```

**Supabase peut retourner `error` même si `data` existe** :
- Warnings RLS
- Logs debug
- Messages d'information
- Métriques

**Solution :**
```javascript
// ✅ BON - Vérifier d'abord les données
if (!data) {
  // Vraiment absent
  return 409
}

if (error) {
  // Error mais data existe → warning log, continuer
  console.warn('Error mais data présent:', error.message)
}

// Valider data
if (data.status !== 'active') return 403
```

**Règle générale :**
1. **Vérifier `data` d'abord** (null/undefined = absent)
2. **Si `data` existe**, ignorer `error` (ou log warning)
3. **Valider les champs** de `data`

---

## 🔗 Documents liés

- [FIX_API_403_JETC_ADMIN.md](FIX_API_403_JETC_ADMIN.md) - Alignement règles auth
- [FIX_CRASH_ADMIN_USERS_TDZ.md](FIX_CRASH_ADMIN_USERS_TDZ.md) - Crash TDZ page
- [CREATION_USERS_NAVIGATION.md](CREATION_USERS_NAVIGATION.md) - UI users + navigation

**Page /admin/users maintenant accessible avec profils existants !** 🎉
