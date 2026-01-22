# Architecture Globale – QHSE

## Date
22 janvier 2026

## Vue d'ensemble

Application web QHSE utilisant:
- **Frontend**: Next.js (JavaScript pur, pas TypeScript)
- **Backend Prod**: Supabase (Auth, Database PostgreSQL, Storage)
- **Backend Démo**: mockData.js + apiWrapper.js (aucun appel réseau)
- **Déploiement Prod**: Vercel
- **Déploiement Démo**: Vercel (même build, mode déterminé par variable env)

## Modes d'exécution

### Mode Démo (DEMO_MODE=true)
**Objectif**: Permettre navigation complète sans Supabase

**Caractéristiques**:
- ZÉRO appel réseau
- ZÉRO import supabaseClient.js
- Données mockées stables (mockData.js)
- Auth démo (demoAuth.js + localStorage)
- Parcours cliquables complets (dashboard → audits → détails → NC)

**Configuration**:
```javascript
// demoConfig.js
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
```

**Variables d'environnement**:
```
NEXT_PUBLIC_DEMO_MODE=true
```

### Mode Production (DEMO_MODE=false)
**Objectif**: Application connectée Supabase

**Caractéristiques**:
- Auth Supabase (OAuth, Email/Password)
- Database PostgreSQL avec RLS
- Storage Supabase (photos audits/NC)
- Données réelles multi-utilisateurs

**Variables d'environnement**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... (optionnel, server-side)
NEXT_PUBLIC_DEMO_MODE=false
```

## Architecture technique

### Structure des dossiers

```
/workspaces/QHSE/
│
├── docs/                          # Documentation
│   ├── 00_cadrage/               # Spécifications globales
│   ├── 01_foundations/           # Fondations DB + Auth
│   ├── 02_templates/             # Templates d'audit
│   ├── 03_audits/                # Module audits
│   ├── 04_non_conformities/      # Module NC
│   ├── 05_dashboard/             # Tableau de bord
│   └── QHSE/                     # Rapports de contrôle centralisés
│       └── QHSE_ETAPE_XX_RAPPORT_CONTROLE.md
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.js
│   │   ├── page.js               # Landing page
│   │   ├── demo/                 # Mode démo
│   │   ├── dashboard/            # KPI
│   │   ├── audits/               # Audits CRUD
│   │   ├── non-conformities/     # NC CRUD
│   │   ├── templates/            # Templates CRUD
│   │   ├── depots/               # Dépôts/zones CRUD
│   │   └── login/                # Auth
│   │
│   ├── components/               # Composants réutilisables
│   │   ├── ui/                   # Boutons, inputs, modals...
│   │   ├── layout/               # Header, Sidebar, Footer
│   │   └── audit/                # AuditCard, QuestionForm...
│   │
│   ├── config/
│   │   └── demoConfig.js         # DEMO_MODE source de vérité
│   │
│   ├── data/
│   │   └── mockData.js           # Données mock stables
│   │
│   ├── lib/
│   │   ├── apiWrapper.js         # Routeur démo/prod (API unique)
│   │   ├── demoAuth.js           # Auth démo (localStorage)
│   │   └── supabaseClient.js     # Client Supabase (PROD ONLY)
│   │
│   └── utils/
│       ├── validators.js         # Validation formulaires
│       └── formatters.js         # Formatage dates, nombres...
│
├── supabase/
│   ├── config.toml               # Config Supabase locale
│   └── migrations/               # Migrations SQL numérotées
│       ├── 00000000000000_init.sql
│       └── 00000000000001_foundations.sql
│
├── public/                       # Assets statiques
│   ├── images/
│   └── icons/
│
├── .env.example                  # Template variables env
├── .env.local                    # Variables locales (gitignored)
├── .gitignore                    # Git ignore
├── next.config.js                # Config Next.js
├── package.json                  # Dépendances
└── README.md                     # Documentation projet
```

### Garde-fous démo/prod

#### 1. demoConfig.js
Source de vérité pour détecter le mode:
```javascript
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
export const APP_NAME = 'QHSE Audit Manager';
export const VERSION = '1.0.0';
```

#### 2. apiWrapper.js
Point d'entrée unique pour toutes les requêtes données:
```javascript
import { DEMO_MODE } from '@/config/demoConfig';
import mockApi from '@/data/mockData';
// supabaseClient importé conditionnellement UNIQUEMENT si !DEMO_MODE

export const api = {
  async getAudits() {
    if (DEMO_MODE) {
      return mockApi.getAudits();
    }
    // Appel Supabase
  },
  // ... autres méthodes
};
```

**Principe**: Aucun composant n'importe directement supabaseClient ou mockData.
Tous passent par `api.*`.

#### 3. demoAuth.js
Gestion authentification démo (simulation session):
```javascript
// Stockage localStorage
export const demoAuth = {
  login(username, password) {
    // Validation contre mockData.users
    // Stocke session dans localStorage
  },
  logout() { /* clear localStorage */ },
  getSession() { /* retourne user depuis localStorage */ },
  getCurrentUser() { /* retourne user courant */ }
};
```

#### 4. mockData.js
Données mock stables, cohérentes, représentatives:
```javascript
export const mockDepots = [ /* 1 dépôt */ ];
export const mockZones = [ /* 2 zones */ ];
export const mockUsers = [ /* 5 users, 1 par rôle */ ];
export const mockTemplates = [ /* 2 templates */ ];
export const mockAudits = [ /* 3 audits */ ];
export const mockQuestions = [ /* ~15 questions */ ];
export const mockResponses = [ /* réponses pour audits */ ];
export const mockNonConformities = [ /* 1 NC */ ];

export default {
  getAudits: () => mockAudits,
  getAuditById: (id) => mockAudits.find(a => a.id === id),
  // ... autres méthodes CRUD
};
```

**Contrainte**: Données non aléatoires (pas de faker), IDs cohérents, relations valides.

## Flow de données

### Mode Démo
```
Composant UI → api.getAudits() → apiWrapper (détecte DEMO_MODE=true)
  → mockData.getAudits() → retour données mock → UI
```

### Mode Prod
```
Composant UI → api.getAudits() → apiWrapper (détecte DEMO_MODE=false)
  → supabaseClient.from('audits').select() → DB Supabase (RLS appliquée)
  → retour données → UI
```

## Gestion des clés et secrets

### Développement local
Fichier `.env.local` (gitignored):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (optionnel)
NEXT_PUBLIC_DEMO_MODE=false
```

### Production Vercel
Variables d'environnement Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optionnel)
- `NEXT_PUBLIC_DEMO_MODE` (false pour prod réelle, true pour démo publique)

### Démo publique Vercel
Variables d'environnement Vercel (déploiement séparé ou branche):
- `NEXT_PUBLIC_DEMO_MODE=true`
- Pas de clés Supabase nécessaires

### .env.example (commité dans Git)
```
# Supabase Configuration (Production uniquement)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Demo Mode (true pour démo sans backend, false pour prod)
NEXT_PUBLIC_DEMO_MODE=true
```

### .gitignore
```
.env.local
.env*.local
node_modules/
.next/
```

## Sécurité

### Row Level Security (RLS) – Production
- RLS activée sur TOUTES les tables sensibles dès création
- Policies par rôle (admin_dev, qhse_manager, qh_auditor, safety_auditor, viewer)
- Principe du moindre privilège

**Exemple policy audits**:
```sql
-- qhse_manager: SELECT sur tous audits
CREATE POLICY qhse_manager_select_all ON audits
  FOR SELECT USING (auth.jwt() ->> 'role' = 'qhse_manager');

-- qh_auditor: SELECT uniquement audits qualité qui lui sont assignés
CREATE POLICY qh_auditor_select_assigned ON audits
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'qh_auditor' 
    AND assigned_to = auth.uid()
    AND template_type IN ('quality', 'haccp')
  );
```

### Auth démo
- Pas de token JWT réel
- Session stockée dans localStorage (user_id, role, username)
- Validation côté client uniquement (pas de requêtes serveur)

### Auth production
- Supabase Auth (OAuth Google, Email/Password)
- JWT dans cookies sécurisés
- RLS valide le rôle via JWT claims

## Performance

### Mode Démo
- Aucune latence réseau
- Chargement instantané (données en mémoire)

### Mode Prod
- Indexation DB (foreign keys, colonnes fréquemment filtrées)
- Pagination API (limit/offset)
- Caching côté client (React Query ou SWR)

## Tests et validation

### Tests unitaires
- Utils (validators, formatters)
- mockData (cohérence relations)

### Tests d'intégration
- apiWrapper (switch démo/prod)
- demoAuth (login/logout)

### Tests E2E (Playwright/Cypress)
- Parcours complets mode démo
- Parcours auth mode prod (CI avec DB test)

### Validation statique SQL
- Checklist avant application migration (voir 04_tests_validation.md étapes suivantes)

## Déploiement

### Vercel Production
1. Push branche `main`
2. Build Next.js
3. Variables env Vercel configurées (DEMO_MODE=false)
4. Déploiement automatique

### Vercel Démo
1. Push branche `demo` (ou même branche avec env différentes)
2. Variables env Vercel configurées (DEMO_MODE=true)
3. Déploiement automatique sur URL démo

### Base de données Supabase
- Projet Supabase séparé (dev, prod)
- Migrations appliquées via Supabase CLI après validation humaine
- Backups automatiques activés

## Décisions architecturales

### DA1: Pourquoi JavaScript pur (pas TypeScript)?
- Simplification setup
- Réduction complexité build
- Prototypage rapide

**Alternatives rejetées**: TypeScript (overhead, transpilation)

### DA2: Pourquoi apiWrapper.js plutôt que feature flags?
- Isolation totale démo/prod au niveau API
- Facilite tests (mock API indépendante)
- Évite mélange logique démo/prod dans composants

**Alternatives rejetées**: if (DEMO_MODE) dans chaque composant (code spaghetti)

### DA3: Pourquoi Next.js App Router?
- SSR pour SEO (si besoin)
- Routing moderne
- API Routes pour middleware (optionnel)

**Alternatives rejetées**: React SPA (pas de SSR), Remix (moins mature écosystème)

### DA4: Pourquoi Supabase?
- Auth + DB + Storage intégrés
- RLS natif PostgreSQL
- Pricing généreux (gratuit jusqu'à 500 MB)
- SDK JavaScript officiel

**Alternatives rejetées**: Firebase (NoSQL moins adapté relations), Backend custom Node.js (overhead maintenance)

## Évolutions futures potentielles

- Étape 07+: Plans d'actions correctives (CAPA)
- Étape 08+: Notifications email/SMS (via Supabase Edge Functions + Resend)
- Étape 09+: Export PDF avancé (rapports avec graphs)
- Étape 10+: Mobile app (React Native + même backend)

---

**Statut**: ✅ Architecture globale définie pour cadrage étape 0
