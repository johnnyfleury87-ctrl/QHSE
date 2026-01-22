# 🎨 EXEMPLES UI & WIREFRAMES – ÉTAPE 04
## DASHBOARD & ANALYTICS QHSE

---

## 🆔 IDENTITÉ DU DOCUMENT

| Propriété | Valeur |
|-----------|--------|
| **Étape** | 04 – Dashboard & Analytics |
| **Date création** | 22 janvier 2026 |
| **Responsable** | GitHub Copilot (Claude Sonnet 4.5) |
| **Statut** | 📝 Conception complète – En attente validation |
| **Dépendances** | UI Étapes 01, 02, 03 (fondations) |
| **Version** | 1.0 |

---

## 🎯 OBJECTIF DOCUMENT

Fournir wireframes et spécifications UI complètes pour:
- Dashboard Démo (`/demo`)
- Dashboard Prod (`/dashboard`)
- Composants réutilisables (KPI Cards, Charts, Filtres)
- États UI (loading, empty, error)
- Responsive design (mobile, tablet, desktop)

---

## 📱 DASHBOARD DÉMO (`/demo`)

### Layout Global

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎭 MODE DÉMO (données exemple)                  [Changer Rôle ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 Dashboard QHSE                         [📅 30 derniers jours]│
│                                                                   │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│              │              │              │                    │
│  Audits      │  Audits      │  Audits      │  Taux Conformité   │
│  à Faire     │  en Cours    │  Terminés    │                    │
│              │              │              │                    │
│      5       │      3       │      12      │       87%          │
│   [🟡 +2]    │   [🔵 =]     │   [🟢 +4]    │     [🟡 OK]        │
│              │              │              │                    │
│  Voir liste  │  Voir liste  │  Voir liste  │   Détails          │
│                                                                   │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                    │
│  NC Ouvertes │  NC Échues                                        │
│              │                                                    │
│      4       │      1                                            │
│   [🔴 !]     │   [⚠️ !]                                          │
│              │                                                    │
│  Voir liste  │  Voir liste                                       │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📈 Répartition Audits par Statut       📊 NC par Gravité        │
│                                                                   │
│  ┌────────────────────────────────┐    ┌───────────────────────┐│
│  │                                │    │                       ││
│  │    [Donut Chart]               │    │  [Bar Chart Horiz]    ││
│  │                                │    │                       ││
│  │    Assigned:    5  (22%)       │    │  Critique:  1  █████  ││
│  │    In Progress: 3  (13%)       │    │  Haute:     2  ██████ ││
│  │    Completed:   12 (52%)       │    │  Moyenne:   1  ███    ││
│  │    Archived:    3  (13%)       │    │  Faible:    0         ││
│  │                                │    │                       ││
│  └────────────────────────────────┘    └───────────────────────┘│
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📉 Historique Audits Terminés (6 derniers mois)                 │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │    [Line Chart]                                           │  │
│  │                                                           │  │
│  │  12│         ●────●                                       │  │
│  │  10│    ●────●                                            │  │
│  │   8│─●─●                                                  │  │
│  │    ├────┬────┬────┬────┬────┬────                        │  │
│  │     Sep Oct Nov Dec Jan Fév                              │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🔍 Accès Rapides                                                 │
│                                                                   │
│  [📝 Tous les Audits]  [⚠️ Toutes les NC]  [📊 Tous Rapports]   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Composant: KPI Card (Exemple "Audits à Faire")

```
┌──────────────────────────┐
│  🟡 Audits à Faire       │
├──────────────────────────┤
│                          │
│          5               │  ← Valeur principale (grande taille)
│                          │
│      [+2 vs hier]        │  ← Évolution (optionnel démo)
│                          │
├──────────────────────────┤
│  [Voir la liste →]       │  ← Action cliquable
└──────────────────────────┘

Props Composant:
- icon: IconComponent (🟡, 🔵, 🟢, etc.)
- label: string ("Audits à Faire")
- value: number (5)
- evolution: { delta: number, direction: 'up'|'down'|'neutral' }
- onClick: () => void (navigation)
- loading: boolean (skeleton si true)
- testId: string (data-testid)
```

**États**:

```
Loading:
┌──────────────────────────┐
│  ░░░░░░░░░░░░░░          │
├──────────────────────────┤
│      ░░░░░               │
│      ░░░░░░░░            │
└──────────────────────────┘

Empty:
┌──────────────────────────┐
│  🟡 Audits à Faire       │
├──────────────────────────┤
│          0               │
│      [Aucun audit]       │
└──────────────────────────┘

Error:
┌──────────────────────────┐
│  🟡 Audits à Faire       │
├──────────────────────────┤
│          --              │
│      [Erreur chargement] │
│      [Réessayer]         │
└──────────────────────────┘
```

---

### Composant: Chart Donut (Répartition Audits)

```
┌────────────────────────────────────┐
│  📈 Répartition Audits par Statut  │
├────────────────────────────────────┤
│                                    │
│         ╱──────╲                   │
│       ╱    🟡   ╲                  │
│      │    5     │ 🔵               │
│       ╲  22%   ╱  3 (13%)          │
│         ╲────╱                     │
│           🟢 12 (52%)              │
│                                    │
│  Légende:                          │
│  🟡 À faire:    5  (22%) [Clic]    │
│  🔵 En cours:   3  (13%) [Clic]    │
│  🟢 Terminés:   12 (52%) [Clic]    │
│  ⚫ Archivés:   3  (13%) [Clic]    │
│                                    │
└────────────────────────────────────┘

Props:
- data: Array<{ label, count, color }>
- onSegmentClick: (segment) => void
- title: string
- loading: boolean
```

**Interactions**:
- Hover segment → tooltip valeur exacte
- Clic segment → navigation liste filtrée

---

### Composant: Chart Bar Horizontal (NC par Gravité)

```
┌──────────────────────────────────┐
│  📊 Non-Conformités par Gravité  │
├──────────────────────────────────┤
│                                  │
│  Critique  ████████  1           │  ← Rouge #ef4444
│  Haute     ████████████████  2   │  ← Orange #f97316
│  Moyenne   ████████  1           │  ← Jaune #eab308
│  Faible    (vide)    0           │  ← Vert #22c55e
│                                  │
└──────────────────────────────────┘

Props:
- data: Array<{ label, count, color }>
- onBarClick: (bar) => void
- maxValue: number (échelle)
```

---

### Composant: Chart Line (Historique 6 mois)

```
┌─────────────────────────────────────────────┐
│  📉 Audits Terminés (6 derniers mois)       │
├─────────────────────────────────────────────┤
│                                             │
│  12 ┤         ●────●                        │
│  10 ┤    ●────●                             │
│   8 ┤─●─●                                   │
│   6 ┤                                       │
│   4 ┤                                       │
│   2 ┤                                       │
│   0 ├────┬────┬────┬────┬────┬────         │
│      Sep Oct Nov Dec Jan Fév              │
│                                             │
└─────────────────────────────────────────────┘

Props:
- data: Array<{ mois, count }>
- onPointClick: (point) => void
- yAxisLabel: string ("Nombre d'audits")
```

**Interactions**:
- Hover point → tooltip détails (mois, valeur)
- Clic point → liste audits mois sélectionné

---

### Filtre Période (Sélecteur)

```
┌─────────────────────────────┐
│  📅 Période                 │
│  [30 derniers jours ▼]      │  ← Dropdown
└─────────────────────────────┘

Options:
┌─────────────────────────────┐
│  7 derniers jours           │
│  30 derniers jours  ✓       │  ← Sélectionné
│  90 derniers jours          │
│  6 derniers mois            │
│  12 derniers mois           │
│  Personnalisée...           │
└─────────────────────────────┘

Props:
- value: number (jours) ou 'custom'
- onChange: (value) => void
- options: Array<{ label, value }>
```

---

### Bandeau Mode Démo

```
┌─────────────────────────────────────────────────────────┐
│  🎭 MODE DÉMO – Données exemple (pas production)        │
│  [Changer Rôle: Manager ▼]  [Quitter Mode Démo →]      │
└─────────────────────────────────────────────────────────┘

Style:
- Background: #fef3c7 (jaune pâle)
- Border: #eab308 (jaune)
- Position: fixed top (sticky)
- Z-index: 1000
```

---

## 🖥️ DASHBOARD PROD (`/dashboard`)

### Layout Admin/Manager

```
┌─────────────────────────────────────────────────────────────────┐
│ 🛡️ QHSE App                                    [Manager] [Déco] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 Dashboard Pilotage QHSE                                       │
│                                                                   │
│  Filtres:                                                         │
│  [Dépôt: Tous ▼] [Zone: Toutes ▼] [Période: 30j ▼]              │
│                                                                   │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│              │              │              │                    │
│  [KPIs identiques Dashboard Démo]                               │
│  (valeurs globales tous dépôts/zones)                           │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 Top 5 Dépôts (Taux Conformité)                               │
│                                                                   │
│  1. DEP001 (Lyon)        ██████████████████  92%                │
│  2. DEP002 (Paris)       ████████████████    88%                │
│  3. DEP003 (Marseille)   ██████████████      85%                │
│  4. DEP004 (Lille)       ████████████        82%                │
│  5. DEP005 (Toulouse)    ██████████          78%                │
│                                                                   │
│  [Voir tous les dépôts →]                                        │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🚨 Top 5 Zones avec NC Critiques                                │
│                                                                   │
│  1. Zone Froide (DEP001)           🔴 3 NC critiques            │
│  2. Quai Chargement (DEP002)       🔴 2 NC critiques            │
│  3. Entrepôt Sec (DEP001)          🔴 1 NC critique             │
│  4. Bureau Qualité (DEP003)        🔴 1 NC critique             │
│  5. Chambre Froide 2 (DEP002)      🔴 1 NC critique             │
│                                                                   │
│  [Voir toutes les zones →]                                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Layout Auditeur (Vue Personnelle)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🛡️ QHSE App                             [QH Auditor] [Déco]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 Mes Audits                               [📅 30 derniers j]  │
│                                                                   │
├──────────────┬──────────────┬──────────────────────────────────┤
│              │              │                                  │
│  Audits      │  Audits      │  Audits                          │
│  Assignés    │  en Cours    │  Terminés                        │
│              │              │                                  │
│      3       │      1       │      12                          │
│   [🟡]       │   [🔵]       │   [🟢]                           │
│              │              │                                  │
│  Démarrer    │  Continuer   │  Consulter                       │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📈 Mes Audits par Statut                                        │
│                                                                   │
│  [Donut Chart filtré sur propres audits uniquement]             │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📉 Mon Historique (6 mois)                                      │
│                                                                   │
│  [Line Chart: mes audits terminés par mois]                     │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ⚠️ Mes NC en Cours                                              │
│                                                                   │
│  - NC-2026-0042 (Haute) – Zone Froide – Échéance: 3j            │
│  - NC-2026-0038 (Moyenne) – Quai – Échéance: 15j                │
│                                                                   │
│  [Voir toutes mes NC →]                                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Notes**:
- Aucun filtre "Dépôt/Zone" (isolation stricte)
- Pas de charts "Top 5" (vues globales interdites)
- Uniquement statistiques personnelles

---

### Layout Viewer (Lecture Historique)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🛡️ QHSE App                                 [Viewer] [Déco]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 Consultation Historique                  [📅 30 derniers j]  │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Audits Terminés                Taux Conformité                  │
│                                                                   │
│      45                              89%                         │
│   [🟢]                            [🟢 Bon]                       │
│                                                                   │
│  Consulter                       Détails                         │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📉 Historique Audits (6 mois)                                   │
│                                                                   │
│  [Line Chart: audits terminés uniquement]                       │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ℹ️ Information                                                   │
│                                                                   │
│  Votre accès est limité à la consultation de l'historique       │
│  des audits terminés. Pour plus d'informations, contactez       │
│  votre responsable QHSE.                                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Notes**:
- KPI "Assigned/In Progress" masqués (RLS bloque)
- Uniquement données historiques
- Message informatif visible

---

## 📊 COMPOSANTS RÉUTILISABLES (Détails)

### KPICard Component

**Props**:
```typescript
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  evolution?: {
    delta: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string; // Ex: "vs hier", "vs mois dernier"
  };
  color: 'yellow' | 'blue' | 'green' | 'red' | 'gray';
  loading?: boolean;
  error?: string;
  onClick?: () => void;
  testId?: string;
}
```

**Exemple Usage**:
```jsx
<KPICard
  icon={<AlertCircle />}
  label="Audits à Faire"
  value={5}
  evolution={{ delta: 2, direction: 'up', label: 'vs hier' }}
  color="yellow"
  onClick={() => navigate('/audits?status=assigned')}
  testId="kpi-audits-assigned"
/>
```

**CSS Classes** (Tailwind):
```jsx
// Container
className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"

// Icon
className="text-yellow-500 text-3xl mb-2"

// Label
className="text-gray-600 text-sm font-medium mb-2"

// Value
className="text-4xl font-bold text-gray-900"

// Evolution (up)
className="text-green-600 text-sm font-medium mt-2"

// Evolution (down)
className="text-red-600 text-sm font-medium mt-2"
```

---

### ChartDonut Component

**Props**:
```typescript
interface ChartDonutProps {
  title: string;
  data: Array<{
    label: string;
    count: number;
    color: string;
    id: string;
  }>;
  onSegmentClick?: (segment: ChartSegment) => void;
  loading?: boolean;
  height?: number; // Défaut: 300px
}
```

**Exemple Usage**:
```jsx
<ChartDonut
  title="Répartition Audits"
  data={[
    { label: 'À faire', count: 5, color: '#eab308', id: 'assigned' },
    { label: 'En cours', count: 3, color: '#3b82f6', id: 'in_progress' },
    { label: 'Terminés', count: 12, color: '#22c55e', id: 'completed' }
  ]}
  onSegmentClick={(segment) => navigate(`/audits?status=${segment.id}`)}
/>
```

**Bibliothèque Recommandée**: Recharts, Chart.js, ou Victory

---

### ChartBar Component

**Props**:
```typescript
interface ChartBarProps {
  title: string;
  data: Array<{
    label: string;
    count: number;
    color: string;
  }>;
  orientation: 'horizontal' | 'vertical';
  onBarClick?: (bar: ChartBar) => void;
  loading?: boolean;
}
```

---

### FilterBar Component

**Props**:
```typescript
interface FilterBarProps {
  filters: {
    period?: {
      value: number | 'custom';
      onChange: (value) => void;
      options: Array<{ label, value }>;
    };
    depot?: {
      value: string | null;
      onChange: (value) => void;
      options: Array<{ label, value }>;
    };
    zone?: {
      value: string | null;
      onChange: (value) => void;
      options: Array<{ label, value }>;
    };
  };
  layout?: 'horizontal' | 'vertical'; // Responsive
}
```

**Exemple Usage**:
```jsx
<FilterBar
  filters={{
    period: {
      value: 30,
      onChange: setPeriod,
      options: [
        { label: '7 derniers jours', value: 7 },
        { label: '30 derniers jours', value: 30 },
        { label: '90 derniers jours', value: 90 }
      ]
    },
    depot: {
      value: selectedDepot,
      onChange: setSelectedDepot,
      options: depotsList.map(d => ({ label: d.name, value: d.id }))
    }
  }}
/>
```

---

## 📱 RESPONSIVE DESIGN

### Mobile (< 768px)

```
┌───────────────────────┐
│ 🎭 MODE DÉMO          │
│ [Menu ≡]              │
├───────────────────────┤
│ 📊 Dashboard          │
│ [Période: 30j ▼]      │
├───────────────────────┤
│ Audits à Faire        │
│        5              │
│ [Voir →]              │
├───────────────────────┤
│ Audits en Cours       │
│        3              │
│ [Voir →]              │
├───────────────────────┤
│ (Scroll vertical)     │
│ ...                   │
└───────────────────────┘

Layout:
- 1 colonne
- KPIs stacked verticalement
- Charts pleine largeur
- Filtres menu hamburger
```

---

### Tablet (768px - 1024px)

```
┌─────────────────────────────────────┐
│ 🎭 MODE DÉMO           [Période ▼]  │
├─────────────────────────────────────┤
│ 📊 Dashboard                        │
├─────────────┬───────────────────────┤
│ Audits      │ Audits                │
│ à Faire     │ en Cours              │
│    5        │    3                  │
├─────────────┴───────────────────────┤
│ Audits      │ Taux                  │
│ Terminés    │ Conformité            │
│    12       │    87%                │
├─────────────────────────────────────┤
│ Chart Répartition (pleine largeur)  │
├─────────────────────────────────────┤
│ Chart NC (pleine largeur)           │
└─────────────────────────────────────┘

Layout:
- 2 colonnes KPIs
- Charts 1 colonne (pleine largeur)
```

---

### Desktop (> 1024px)

```
┌─────────────────────────────────────────────────────────┐
│ 🎭 MODE DÉMO                            [Filtres →]     │
├─────────────────────────────────────────────────────────┤
│ 📊 Dashboard                                            │
├───────────┬───────────┬───────────┬────────────────────┤
│ KPI 1     │ KPI 2     │ KPI 3     │ KPI 4              │
├───────────┴───────────┴───────────┴────────────────────┤
│ KPI 5     │ KPI 6                                       │
├───────────────────────┬───────────────────────────────┤
│ Chart 1               │ Chart 2                       │
│ (50% width)           │ (50% width)                   │
├───────────────────────────────────────────────────────┤
│ Chart 3 (pleine largeur)                              │
└───────────────────────────────────────────────────────┘

Layout:
- 4 colonnes KPIs (ligne 1)
- 2 colonnes charts (ligne 2)
- 1 colonne chart historique
```

---

## ♿ ACCESSIBILITÉ (a11y)

### ARIA Labels Obligatoires

**KPI Card**:
```jsx
<div
  role="button"
  tabIndex={0}
  aria-label="Audits à faire: 5. Cliquez pour voir la liste."
  onClick={handleClick}
  onKeyPress={handleKeyPress}
>
  {/* Contenu */}
</div>
```

**Chart**:
```jsx
<div
  role="img"
  aria-label="Graphique: Répartition audits par statut. 5 à faire, 3 en cours, 12 terminés, 3 archivés."
>
  <canvas>{/* Chart rendu */}</canvas>
  
  {/* Tableau alternatif (visually hidden) */}
  <table className="sr-only">
    <caption>Répartition Audits</caption>
    <thead>
      <tr>
        <th>Statut</th>
        <th>Nombre</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>À faire</td>
        <td>5</td>
      </tr>
      {/* ... */}
    </tbody>
  </table>
</div>
```

**Filtre Période**:
```jsx
<label htmlFor="filter-period">Période</label>
<select
  id="filter-period"
  aria-label="Sélectionner période dashboard"
  value={period}
  onChange={handleChange}
>
  <option value={7}>7 derniers jours</option>
  <option value={30}>30 derniers jours</option>
</select>
```

---

### Navigation Clavier

**Ordre Tab**:
1. Bandeau démo (sélecteur rôle)
2. Filtre période
3. KPI-01 (Audits à faire)
4. KPI-02 (Audits en cours)
5. KPI-03 (Audits terminés)
6. KPI-04 (Conformité)
7. KPI-05 (NC ouvertes)
8. KPI-06 (NC échues)
9. Chart 1 (segments cliquables)
10. Chart 2
11. Liens accès rapides

**Interactions Clavier**:
- `Tab` → Focus élément suivant
- `Shift+Tab` → Focus élément précédent
- `Enter`/`Space` → Activer bouton/lien
- `Esc` → Fermer modal/dropdown

---

## 🎨 DESIGN TOKENS

### Couleurs

**KPIs**:
- Yellow (À faire): `#eab308` (bg: `#fef3c7`)
- Blue (En cours): `#3b82f6` (bg: `#dbeafe`)
- Green (Terminés): `#22c55e` (bg: `#dcfce7`)
- Red (Critique): `#ef4444` (bg: `#fee2e2`)
- Gray (Neutre): `#6b7280` (bg: `#f3f4f6`)

**Gravités NC**:
- Critique: `#ef4444`
- Haute: `#f97316`
- Moyenne: `#eab308`
- Faible: `#22c55e`

**États**:
- Loading skeleton: `#e5e7eb` (gray-200)
- Error: `#fee2e2` (red-100)
- Success: `#dcfce7` (green-100)

---

### Typographie

**Headings**:
- Dashboard title: `text-3xl font-bold` (32px)
- Section title: `text-xl font-semibold` (20px)
- Card title: `text-sm font-medium` (14px)

**Body**:
- KPI value: `text-4xl font-bold` (36px)
- KPI label: `text-sm text-gray-600` (14px)
- Evolution: `text-xs` (12px)

---

### Spacing

**KPI Cards**:
- Padding: `p-6` (24px)
- Gap (grid): `gap-4` (16px)
- Border radius: `rounded-lg` (8px)

**Charts**:
- Padding: `p-6`
- Height: `h-80` (320px)
- Margin bottom: `mb-8` (32px)

---

## 📋 CHECKLIST UI DASHBOARD

### Composants
- [ ] KPICard (6 variantes: assigned, in_progress, completed, conformité, NC, NC échues)
- [ ] ChartDonut (répartition audits)
- [ ] ChartBar (NC gravité)
- [ ] ChartLine (historique 6 mois)
- [ ] ChartBarTop5 (dépôts conformité)
- [ ] FilterBar (période, dépôt, zone)
- [ ] DemoBanner (bandeau mode démo)

### États UI
- [ ] Loading (skeleton cards/charts)
- [ ] Empty (message + CTA)
- [ ] Error (message + retry)
- [ ] Success (données affichées)

### Responsive
- [ ] Mobile (< 768px): 1 colonne
- [ ] Tablet (768-1024px): 2 colonnes KPIs
- [ ] Desktop (> 1024px): 4 colonnes KPIs

### Accessibilité
- [ ] ARIA labels (KPIs, charts)
- [ ] Navigation clavier complète
- [ ] Tableaux alternatifs charts
- [ ] Contraste couleurs (WCAG AA)
- [ ] Focus visible (outline)

### Interactions
- [ ] Clic KPI → navigation liste
- [ ] Clic segment chart → navigation filtrée
- [ ] Hover KPI → ombre
- [ ] Hover chart → tooltip

---

## 📚 RÉFÉRENCES

- **01_spec_metier_dashboard.md**: KPIs, Charts définitions
- **04_tests_validation_dashboard.md**: Tests UI e2e
- **README.md**: Sections 20-25 (Dashboard specs)

---

## ✍️ SIGNATURE

**Document finalisé**: 22 janvier 2026  
**Prochaine étape**: `06_decisions_log_dashboard.md`

---

**FIN DOCUMENT `05_exemples_ui_dashboard.md`**
