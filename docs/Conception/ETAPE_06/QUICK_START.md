# ⚡ QUICK START – ADMIN USERS (JETC SOLUTION)

**Implémentation**: ✅ Terminée  
**Temps**: 8h (estimation 12h)  
**Date**: 23 janvier 2026

---

## 🚀 EN 3 ÉTAPES

### 1️⃣ Appliquer migration DB (2 min)

```bash
# Local (Docker)
cd /workspaces/QHSE
supabase db reset

# Production (Supabase Cloud)
supabase db push
```

**OU** via Supabase Dashboard → SQL Editor:
- Copier contenu de `/supabase/migrations/0006_etape_06_admin_users.sql`
- Exécuter

---

### 2️⃣ Activer flag JETC admin (1 min)

**Supabase Dashboard → SQL Editor**:
```sql
UPDATE profiles 
SET is_jetc_admin = true 
WHERE email = 'votre-email-jetc@example.com';
```

**Vérifier**:
```sql
SELECT email, is_jetc_admin FROM profiles WHERE is_jetc_admin = true;
```

---

### 3️⃣ Configurer variable env (1 min)

**Local** (`.env.local`):
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Production** (Vercel Dashboard):
- Settings → Environment Variables
- Ajouter `SUPABASE_SERVICE_ROLE_KEY` (Production)
- Valeur: votre service_role key (Supabase → Settings → API)

---

## ✅ TESTER (5 min)

1. ✅ Se connecter avec compte JETC
2. ✅ Page `/` → Bloc "Accès JETC Solution" visible
3. ✅ Cliquer "Entrer" → `/admin` (dashboard stats)
4. ✅ `/admin/users` → Créer utilisateur test
5. ✅ Toggle statut actif ↔ inactif

---

## 📦 CE QUI A ÉTÉ CRÉÉ

### DB
- ✅ Migration `0006_etape_06_admin_users.sql`
- ✅ Colonne `is_jetc_admin` (profiles)
- ✅ RLS policies DELETE/INSERT/UPDATE (JETC admin uniquement)

### API
- ✅ `POST /api/admin/users` (créer user)
- ✅ `GET /api/admin/users` (liste users)
- ✅ `PATCH /api/admin/users/:id` (modifier user)
- ✅ `DELETE /api/admin/users/:id` (supprimer user)

### UI
- ✅ Bloc "Accès JETC Solution" (page d'accueil)
- ✅ Dashboard admin (`/admin`) + stats
- ✅ CRUD utilisateurs (`/admin/users`)
- ✅ Guards sécurité (layout + front)

---

## 📚 DOCUMENTATION

| Document | Contenu |
|----------|---------|
| [RAPPORT_ADMIN_USERS.md](./RAPPORT_ADMIN_USERS.md) | Analyse complète (117 pages) |
| [LIVRAISON_ADMIN_USERS.md](./LIVRAISON_ADMIN_USERS.md) | Détails implémentation |
| [CHECKLIST_POST_DEPLOIEMENT.md](./CHECKLIST_POST_DEPLOIEMENT.md) | Tests validation |

---

## 🔥 POINTS CRITIQUES

### ⚠️ SÉCURITÉ
- `SUPABASE_SERVICE_ROLE_KEY` = **NE JAMAIS exposer côté client**
- Utilisée UNIQUEMENT dans API Routes (server-side)
- Bypass toutes RLS policies → danger si mal utilisée

### ⚠️ FLAG JETC ADMIN
- À activer **immédiatement** après migration 0006
- Sinon: impossible de créer/modifier utilisateurs
- Commande: `UPDATE profiles SET is_jetc_admin = true WHERE email = '...'`

### ⚠️ BREAKING CHANGE
- **Avant**: Tous `admin_dev` pouvaient créer users
- **Après**: Seul JETC admin peut créer users
- Impact: Autres `admin_dev` perdent accès (voulu)

---

## 🎯 FONCTIONNALITÉS

### Dashboard Admin
- Compteurs: Users, Audits, NC, Actions
- Liens rapides: Users, Templates, Dépôts

### CRUD Utilisateurs
- **Créer**: Email, Prénom, Nom, Rôle (pwd fixe: `Test1234!`)
- **Modifier**: Statut (actif ↔ inactif)
- **Supprimer**: Hard delete (ou soft via status)
- **Filtres**: Recherche, Rôle, Statut

### Protections
- ❌ Modifier son propre profil (bouton désactivé)
- ❌ Supprimer dernier JETC admin (API refuse)
- ❌ Auto-attribution `is_jetc_admin` (trigger DB bloque)
- ❌ Accès `/admin` si pas JETC admin (guard redirige)

---

## 🐛 TROUBLESHOOTING

### "Non authentifié" (API)
➡️ Token JWT manquant ou invalide
```javascript
// Vérifier headers dans appel fetch
headers: {
  'Authorization': `Bearer ${session.access_token}`
}
```

### "Accès refusé" (API)
➡️ Flag `is_jetc_admin` pas activé
```sql
-- Vérifier
SELECT email, is_jetc_admin FROM profiles WHERE id = auth.uid();
```

### "Erreur création utilisateur"
➡️ `SUPABASE_SERVICE_ROLE_KEY` manquante ou invalide
```bash
# Vérifier .env.local ou Vercel env vars
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Stats dashboard à 0
➡️ Pas de données en DB
```sql
-- Vérifier
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM audits;
```

---

## 📞 SUPPORT

- 📖 Documentation complète: [/docs/Conception/ETAPE_06/](.)
- 🗄️ DB Source of Truth: [/docs/implementation.md](../../implementation.md)
- 🎨 Design System: [/docs/DESIGN_SYSTEM_QHSE.md](../../DESIGN_SYSTEM_QHSE.md)

---

**Implémentation réussie ✅**  
**Prêt pour production 🚀**
