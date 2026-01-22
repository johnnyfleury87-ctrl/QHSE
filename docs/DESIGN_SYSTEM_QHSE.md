# DESIGN_SYSTEM_QHSE.md
Version: 1.0
But: Garantir un design moderne, cohérent, lisible et compatible dark mode sur TOUTES les vues.
Règle: Avant de créer/modifier une page, lire ce fichier et appliquer ces standards. Aucune exception.

---

## 1) Identité visuelle

### 1.1 Intentions
- Style: SaaS moderne, pro, sobre (pas enfantin)
- Palette: bleu (accent), gris neutres, blanc
- Look & feel: surfaces en cartes, ombres soft, arrondis modernes, animations discrètes
- Dark mode: support natif, lisibilité parfaite

### 1.2 Principes non négociables
- Tout doit rester lisible en clair ET en sombre
- Pas de couleurs “hardcodées” dans les composants (utiliser tokens/variables)
- Pas de pages “différentes”: même layout, mêmes boutons, mêmes tables
- États obligatoires: loading / empty / error

---

## 2) Thème & tokens (couleurs / surfaces)

### 2.1 Mode sombre
- Tailwind: `darkMode: 'class'`
- Le thème est appliqué via la classe `dark` sur `<html>` ou `<body>`
- Persistance: localStorage + fallback préférence système

### 2.2 Couleurs (guidelines)
- Accent principal: bleu (primary)
- Neutres: gris froids (surfaces, borders, texte muted)
- Fond: clair (blanc/gris très clair) et sombre (charcoal/bleu nuit)

### 2.3 Utilisation des tokens
Tout style doit se baser sur des tokens (CSS variables), ex:
- background: `bg-[hsl(var(--bg))]`
- surface: `bg-[hsl(var(--surface))]`
- texte: `text-[hsl(var(--text))]`
- muted: `text-[hsl(var(--muted))]`
- border: `border-[hsl(var(--border))]`
- primary: `bg-[hsl(var(--primary))]`

Interdits:
- `text-gray-400` “au hasard”
- `bg-blue-500` “au hasard”
Sauf cas exceptionnel documenté.

---

## 3) Typographie & grille

### 3.1 Typo
- Taille base: 14–16px
- Titres: 20–32px selon importance
- Poids: 400/500/600
- Texte secondaire: utiliser `muted`, jamais trop pâle (contraste)

### 3.2 Layout
- Spacing standard: 8/12/16/24/32
- Container: largeur max + marges propres
- Utiliser une grille (cards alignées) plutôt que des éléments flottants

---

## 4) Composants UI officiels (à utiliser partout)

Tous les écrans doivent utiliser ces composants. Si un besoin manque, on ajoute un composant, on ne hack pas une page.

Dossier: `/components/ui/`

### 4.1 Button
Variants obligatoires:
- `primary` (bleu, CTA)
- `secondary` (surface contrastée)
- `outline`
- `ghost`
- `danger`

États obligatoires:
- hover: léger lift + shadow soft
- focus: ring bleu visible
- disabled: opacité + pas de hover
- loading: spinner + texte inchangé

Règle: 1 seul style de bouton CTA sur tout le produit.

### 4.2 Card
- Surface + border + shadow soft
- Header + content
- Hover optionnel: highlight léger

### 4.3 Badge (statuts)
Statuts d’audit:
- `planifie` / `en_cours` / `termine` / `annule` (ou ceux définis dans SQL)
Badges cohérents en dark mode.

### 4.4 Input / Select / Textarea
- Focus ring bleu
- Placeholder muted
- Erreurs: message + border/ring (sans agressivité)

### 4.5 Table
- Header lisible
- Row hover subtil
- Pagination si nécessaire
- Empty state intégré

### 4.6 Modal / Drawer
- Overlay + animation douce
- Fermeture: ESC + clic overlay (si permis)
- Focus trap si possible

### 4.7 Toast
- `success`, `error`, `info`
- Message court + action optionnelle

### 4.8 EmptyState
Toujours fournir:
- titre
- description
- CTA si applicable

---

## 5) Animations & interactions (pro, pas cirque)

### 5.1 Transitions
- hover buttons/cards: 150–220ms
- page transitions: fade/slide très léger
- sidebar: ouverture fluide

### 5.2 Règles motion
- Respect `prefers-reduced-motion`
- Pas d’animations permanentes
- Pas d’effets “bounce”, “shake” en normal

---

## 6) Dark mode: règles d’or

- Vérifier chaque vue en clair ET en sombre avant commit
- Les contrastes doivent être OK:
  - texte principal: très lisible
  - texte secondaire: lisible, pas “gris fantôme”
- Les bordures doivent être visibles sans être agressives
- Les CTA doivent rester identifiables en sombre

Checklist rapide:
- [ ] Texte lisible partout
- [ ] Boutons cohérents
- [ ] Cards distinctes du background
- [ ] Hover/focus visibles
- [ ] Table lisible

---

## 7) Structure d’une vue (standard)

Chaque page doit suivre ce pattern:

1) `PageHeader`
- titre
- breadcrumb optionnel
- actions (boutons)

2) `Content`
- cards / table / filtres
- états:
  - loading skeleton
  - empty state
  - error state (avec retry)

3) `Footer` (optionnel)

---

## 8) Accessibilité (minimum vital)

- Focus visible (ring)
- Navigation clavier sur éléments interactifs
- Labels associés aux inputs
- Boutons: `type="button"` si pas submit
- Couleurs: ne jamais dépendre uniquement de la couleur pour “OK/NOK”

---

## 9) Do / Don’t

### DO ✅
- Utiliser les composants UI existants
- Utiliser tokens
- Tester
