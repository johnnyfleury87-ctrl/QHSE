# QHSE - Application Web

Application de gestion QHSE (Qualité, Hygiène, Sécurité, Environnement) avec Next.js 14, Supabase et Tailwind CSS.

## Démarrage rapide

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration

Copier `.env.example` vers `.env.local` et configurer les variables:

```bash
cp .env.example .env.local
```

**Mode Démo** (sans Supabase):
```env
NEXT_PUBLIC_DEMO_MODE=true
```

**Mode Production** (avec Supabase):
```env
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
```

### 3. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Structure du projet

```
/workspaces/QHSE/
├── app/                    # Next.js App Router (pages)
│   ├── layout.js          # Layout racine
│   ├── page.js            # Landing page (/)
│   ├── login/page.js      # Login (/login)
│   └── profil/page.js     # Profil (/profil)
├── components/
│   ├── layout/            # AppShell, Header, PageHeader
│   ├── providers/         # ThemeProvider (dark mode)
│   └── ui/                # Composants UI réutilisables
│       ├── button.js
│       ├── card.js
│       ├── badge.js
│       ├── input.js
│       ├── table.js
│       ├── alert.js
│       └── loading-states.js
├── lib/
│   ├── auth-context.js    # Hook useAuth
│   ├── supabase-client.js # Client Supabase
│   └── utils/
│       └── formatters.js  # Utilitaires formatage
├── docs/
│   ├── UI/
│   │   └── PLAN_VUES_QHSE.md        # ✅ SOURCE DE VÉRITÉ UI
│   └── DESIGN_SYSTEM_QHSE.md        # ✅ SOURCE DE VÉRITÉ DESIGN
├── supabase/
│   └── migrations/        # Migrations SQL (0001-0005)
└── tailwind.config.js     # Configuration Tailwind + tokens
```

## Sources de vérité

Avant toute implémentation UI, lire OBLIGATOIREMENT:

1. **[docs/UI/PLAN_VUES_QHSE.md](docs/UI/PLAN_VUES_QHSE.md)** - Plan complet des vues (31 vues, mapping SQL exact)
2. **[docs/DESIGN_SYSTEM_QHSE.md](docs/DESIGN_SYSTEM_QHSE.md)** - Design system (composants, tokens, dark mode)
3. **supabase/migrations/*.sql** - Noms exacts tables/colonnes/fonctions/ENUMs

## Composants UI disponibles

- `Button` (variants: primary, secondary, outline, ghost, danger)
- `Card` (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- `Badge` (statuts audits, NC, templates, actions)
- `Input`, `Textarea`, `Select`, `Label`, `FormError`
- `Table` (TableHeader, TableBody, TableRow, TableHead, TableCell)
- `Alert` (success, error, warning, info)
- `LoadingState`, `EmptyState`, `ErrorState`, `Skeleton`

## Design Tokens (Dark Mode)

Palette: Bleu (accent) + Gris neutres + Blanc/Dark

Variables CSS (HSL):
- `--background`, `--foreground`
- `--surface`, `--border`
- `--muted`, `--muted-foreground`
- `--primary`, `--primary-foreground`
- `--success`, `--warning`, `--danger`, `--info`

## Pages implémentées (Étape UI-01 & UI-02)

✅ **Landing Page** (`/`) - A.1  
✅ **Login** (`/login`) - B.1  
✅ **Profil** (`/profil`) - B.2  

## À venir

- Mode Démo (`/demo`) - C.1
- Dashboard Production (`/dashboard`) - D.1
- CRUD Dépôts/Zones - E.1-E.4
- Templates d'audit - F.1-F.3
- Audits - G.1-G.4
- Non-conformités - H.1-H.5
- Rapports & Exports - I.1-I.4
- Administration - J.1-J.2

## Scripts

```bash
npm run dev      # Dev server
npm run build    # Build production
npm run start    # Start production server
npm run lint     # Lint code
```

## Règles strictes

❌ **Interdictions:**
- Inventer des tables/colonnes non documentées
- Styles custom hors design system
- Hardcoder des couleurs (utiliser tokens)
- Oublier les états loading/empty/error

✅ **Obligations:**
- Respecter le mapping SQL exact (migrations)
- Appliquer le design system
- Implémenter les 3 états (loading/empty/error)
- Documenter chaque vue (source + SQL + RLS)
- Tester dark mode

## Liens utiles

- [Documentation Next.js](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
