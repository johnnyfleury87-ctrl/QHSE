# 📋 CHECKLIST POST-DÉPLOIEMENT – ADMIN USERS (JETC SOLUTION)

**Date**: 23 janvier 2026  
**Objectif**: Valider l'implémentation après déploiement  
**Durée estimée**: 15 minutes

---

## ⚠️ PRÉ-REQUIS

- [ ] Migration 0006 appliquée en production (`supabase db push`)
- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` configurée (Vercel/local)
- [ ] Application déployée (Vercel ou serveur local)

---

## 🗄️ ÉTAPE 1: ACTIVER FLAG JETC ADMIN (DB)

### 1.1 Connexion Supabase Dashboard
- [ ] Aller sur [Supabase Dashboard](https://app.supabase.com)
- [ ] Ouvrir votre projet
- [ ] Aller dans "SQL Editor"

### 1.2 Identifier votre compte
Exécuter:
```sql
SELECT email, role, is_jetc_admin FROM profiles;
```

**Attendu**: Liste de tous les comptes, `is_jetc_admin` = `false` partout.

### 1.3 Activer flag JETC admin
**⚠️ REMPLACER** `votre-email@example.com` par votre vrai email:

```sql
UPDATE profiles 
SET is_jetc_admin = true 
WHERE email = 'votre-email@example.com';
```

**Résultat attendu**: `UPDATE 1` (1 ligne modifiée)

### 1.4 Vérifier
```sql
SELECT email, role, is_jetc_admin, status 
FROM profiles 
WHERE is_jetc_admin = true;
```

**Attendu**: 
- 1 ligne
- `is_jetc_admin` = `true`
- `status` = `active`

✅ **VALIDATION**: Flag JETC admin activé

---

## 🔐 ÉTAPE 2: TESTER SÉCURITÉ RLS

### 2.1 Vérifier policies créées
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
  AND policyname LIKE 'jetc%'
ORDER BY policyname;
```

**Attendu**: 3 policies
- `jetc_admin_delete_profiles` | DELETE
- `jetc_admin_insert_profiles` | INSERT
- `jetc_admin_update_profiles` | UPDATE

✅ **VALIDATION**: Policies RLS créées

### 2.2 Vérifier trigger protection
```sql
SELECT tgname, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'protect_jetc_admin_self_elevation';
```

**Attendu**: 1 ligne (trigger existe)

✅ **VALIDATION**: Trigger protection actif

---

## 🖥️ ÉTAPE 3: TESTER INTERFACE

### 3.1 Page d'accueil (bloc JETC Solution)
- [ ] Ouvrir application (`http://localhost:3000` ou URL Vercel)
- [ ] Se connecter avec compte JETC Solution
- [ ] Vérifier page d'accueil `/`
- [ ] **Attendu**: Bloc "🔐 Accès JETC Solution" visible (Card avec icône ShieldCheck)
- [ ] Cliquer "Entrer dans l'espace admin"

✅ **VALIDATION**: Bloc JETC visible et cliquable

### 3.2 Dashboard admin (`/admin`)
- [ ] Vérifier redirection vers `/admin`
- [ ] **Attendu**: 4 cards stats affichées
  - Utilisateurs (nombre)
  - Audits (nombre)
  - Non-Conformités (nombre)
  - Actions Correctives (nombre)
- [ ] Vérifier liens rapides (3 boutons)

✅ **VALIDATION**: Dashboard admin fonctionnel

### 3.3 Liste utilisateurs (`/admin/users`)
- [ ] Cliquer "Gérer les utilisateurs" (dashboard) ou aller sur `/admin/users`
- [ ] **Attendu**: Table utilisateurs affichée
- [ ] Vérifier colonnes: Email, Nom, Rôle (badges colorés), Statut, Date, Actions
- [ ] Vérifier filtres: Recherche, Rôle (dropdown), Statut (dropdown)

✅ **VALIDATION**: Liste utilisateurs fonctionnelle

---

## 🧪 ÉTAPE 4: TESTER CRÉATION UTILISATEUR

### 4.1 Ouvrir modal création
- [ ] Sur `/admin/users`, cliquer "+ Créer un utilisateur"
- [ ] **Attendu**: Modal formulaire s'ouvre

### 4.2 Remplir formulaire test
- [ ] Email: `test-user@example.com`
- [ ] Prénom: `Test`
- [ ] Nom: `User`
- [ ] Rôle: `viewer`
- [ ] Vérifier info: "Mot de passe par défaut: **Test1234!**"

### 4.3 Créer utilisateur
- [ ] Cliquer "Créer"
- [ ] **Attendu**: 
  - Bouton passe à "Création..."
  - Après 2-3 sec: Modal se ferme
  - User test apparaît dans liste

### 4.4 Vérifier DB
```sql
SELECT email, first_name, last_name, role, status
FROM profiles
WHERE email = 'test-user@example.com';
```

**Attendu**: 1 ligne créée

### 4.5 Vérifier Auth
- [ ] Supabase Dashboard → Authentication → Users
- [ ] **Attendu**: User `test-user@example.com` existe
- [ ] Status: Confirmed (email_confirmed_at rempli)

✅ **VALIDATION**: Création utilisateur fonctionnelle

---

## 🔄 ÉTAPE 5: TESTER MODIFICATION STATUT

### 5.1 Désactiver user test
- [ ] Sur `/admin/users`, trouver user `test-user@example.com`
- [ ] Cliquer icône `UserX` (colonne Actions)
- [ ] **Attendu**: Badge statut passe à "Inactif" (gris)

### 5.2 Vérifier blocage connexion
- [ ] Se déconnecter de votre compte JETC
- [ ] Tenter connexion avec `test-user@example.com` / `Test1234!`
- [ ] **Attendu**: Connexion réussie MAIS redirection immédiate logout avec message "Compte désactivé"

✅ **VALIDATION**: Soft delete fonctionnel

### 5.3 Réactiver user test
- [ ] Se reconnecter avec compte JETC
- [ ] Sur `/admin/users`, cliquer icône `UserCheck` sur user test
- [ ] **Attendu**: Badge statut passe à "Actif" (vert)

✅ **VALIDATION**: Réactivation fonctionnelle

---

## 🛡️ ÉTAPE 6: TESTER PROTECTIONS

### 6.1 Protection modification propre profil
- [ ] Sur `/admin/users`, trouver votre propre compte (email JETC)
- [ ] Cliquer icône `UserX`
- [ ] **Attendu**: Bouton désactivé (grisé) avec tooltip "Impossible de modifier son propre statut"

✅ **VALIDATION**: Protection auto-modification OK

### 6.2 Protection accès non-autorisé
- [ ] Se déconnecter
- [ ] Se connecter avec user test (`test-user@example.com` / `Test1234!`)
- [ ] Tenter accès `/admin`
- [ ] **Attendu**: Redirection automatique vers `/dashboard`
- [ ] Vérifier bloc "Accès JETC Solution" **pas visible** sur `/`

✅ **VALIDATION**: Guard layout fonctionnel

### 6.3 Test suppression dernier JETC admin (DB)
```sql
-- Vérifier nombre JETC admins
SELECT COUNT(*) FROM profiles WHERE is_jetc_admin = true;
-- Attendu: 1 (vous)

-- Tenter suppression (doit échouer côté API si 1 seul)
-- Ce test se fait côté UI (désactivé si dernier admin)
```

✅ **VALIDATION**: Protection dernier admin OK

---

## 🧹 ÉTAPE 7: NETTOYAGE

### 7.1 Supprimer user test
- [ ] Sur `/admin/users`, trouver `test-user@example.com`
- [ ] (Si implémenté) Cliquer bouton Supprimer
- [ ] **OU** Via SQL:

```sql
-- Supprimer user test (Auth + Profile cascade)
-- ⚠️ Exécuter dans Supabase Dashboard (SQL Editor)
DELETE FROM auth.users WHERE email = 'test-user@example.com';
```

### 7.2 Vérifier suppression
```sql
SELECT COUNT(*) FROM profiles WHERE email = 'test-user@example.com';
-- Attendu: 0
```

✅ **VALIDATION**: Suppression OK

---

## 📊 RÉSUMÉ VALIDATION

### ✅ Tests réussis
- [ ] Migration 0006 appliquée
- [ ] Flag `is_jetc_admin` activé sur compte JETC
- [ ] Policies RLS créées
- [ ] Trigger protection actif
- [ ] Bloc JETC visible sur accueil (si connecté JETC admin)
- [ ] Dashboard admin stats chargées
- [ ] Liste utilisateurs affichée
- [ ] Création utilisateur fonctionnelle
- [ ] Modification statut fonctionnelle
- [ ] Soft delete fonctionnel (status inactive)
- [ ] Protection auto-modification OK
- [ ] Guard layout redirige non-autorisés
- [ ] User inactif ne peut pas se connecter

### ⚠️ Issues détectées
- [ ] (Aucune si tous tests passent)

---

## 🎯 PROCHAINES ÉTAPES (OPTIONNEL)

### Améliorations futures recommandées
1. **Modification rôle** (modal + API PATCH)
2. **Logs audit** (table audit_logs + trigger)
3. **Invitation email** (Supabase `inviteUserByEmail()`)
4. **Mot de passe aléatoire** (génération + envoi email)
5. **Export CSV** utilisateurs (bouton download)
6. **Pagination** table (si > 100 users)
7. **Recherche avancée** (date création, dernière connexion)

---

## 📝 NOTES

### Commandes utiles

#### Reset DB local (Docker)
```bash
cd /workspaces/QHSE
supabase db reset  # Recrée 0001-0006
```

#### Voir logs Supabase
```bash
supabase logs  # Local Docker
```

#### Déployer Vercel
```bash
vercel --prod
```

### Liens utiles
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Rapport analyse](../RAPPORT_ADMIN_USERS.md)
- [Livraison](../LIVRAISON_ADMIN_USERS.md)

---

**Checklist complétée le**: ___/___/______  
**Par**: _________________________  
**Statut**: ⬜ En cours | ⬜ Validé ✅ | ⬜ Échec ❌
