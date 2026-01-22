# Exemples UI – Foundations (Étape 01)

## Date
22 janvier 2026

## Objectif
Définir les wireframes/parcours UI pour gestion dépôts, zones, users

---

## 1. PAGE: LOGIN

### 1.1 Layout

```
┌────────────────────────────────────────┐
│                                        │
│         QHSE AUDIT MANAGER             │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Email                           │ │
│  │  [_________________________]     │ │
│  │                                  │ │
│  │  Mot de passe                    │ │
│  │  [_________________________]     │ │
│  │                                  │ │
│  │     [SE CONNECTER]               │ │
│  │                                  │ │
│  │  Mot de passe oublié ?           │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [MODE DÉMO] (lien vers /demo)        │
│                                        │
└────────────────────────────────────────┘
```

### 1.2 Fonctionnalités
- Input email (validation format @)
- Input password (masqué)
- Bouton connexion (appel demoAuth.login en démo, Supabase Auth en prod)
- Lien "Mode Démo" (navigation vers /demo avec auto-login user démo)
- Message erreur si credentials invalides

### 1.3 Parcours démo
1. Clic "Mode Démo"
2. Redirection `/demo`
3. Auto-login en tant que `qhse_manager` (par défaut)
4. Redirection `/dashboard`

---

## 2. PAGE: DASHBOARD (après login)

### 2.1 Layout

```
┌────────────────────────────────────────────────────────────┐
│ ☰ MENU  |  QHSE AUDIT MANAGER      |  👤 Sophie Durand ▼  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  TABLEAU DE BORD                                           │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  AUDITS     │  │  NON-CONF.  │  │  CONFORMITÉ │       │
│  │     3       │  │      1      │  │   92.5%     │       │
│  │  ──────────  │  │  ──────────  │  │  ──────────  │       │
│  │  Assigned:1 │  │  Open: 1    │  │  ▓▓▓▓▓░░░   │       │
│  │  Progress:1 │  │  Critical:1 │  │             │       │
│  │  Done: 1    │  │             │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                            │
│  DÉPÔTS & ZONES                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  📍 Entrepôt Paris Nord (DEP001)                     │ │
│  │      └ Zone stockage principal (warehouse)           │ │
│  │      └ Quai de chargement A (loading)                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2.2 Fonctionnalités
- KPI cards (audits, NC, conformité) - chiffres depuis mockData ou Supabase
- Liste dépôts avec zones (lecture, pas de modification sur dashboard)
- Menu latéral (☰): Navigation vers Dépôts, Audits, NC, Users (si admin/manager)

---

## 3. PAGE: LISTE DÉPÔTS

### 3.1 Layout (qhse_manager, lecture + écriture)

```
┌────────────────────────────────────────────────────────────┐
│ ☰ MENU  |  Dépôts                  |  👤 Sophie Durand ▼  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  DÉPÔTS                                     [+ NOUVEAU]    │
│                                                            │
│  Recherche: [_____________]  🔍                            │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Code     │ Nom                │ Ville   │ Zones      │ │
│  ├──────────┼────────────────────┼─────────┼───────────┤ │
│  │ DEP001   │ Entrepôt Paris Nord│ Paris   │ 2 zones   │ │
│  │          │                    │         │ [VOIR]    │ │
│  ├──────────┼────────────────────┼─────────┼───────────┤ │
│  │ (vide si aucun autre dépôt)                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Fonctionnalités
- Bouton "+ NOUVEAU" (si qhse_manager ou admin_dev) → ouvre modal/page création
- Recherche par code, nom, ville (filtrage client-side en démo, server-side en prod)
- Tableau dépôts avec actions:
  - **VOIR**: Détail dépôt + liste zones
  - **MODIFIER**: Modal édition (si droits)
  - **SUPPRIMER**: Confirmation puis suppression (admin_dev uniquement)

### 3.3 Parcours: Créer dépôt (qhse_manager)

1. Clic "+ NOUVEAU"
2. Modal/page formulaire:
   - Code (input, 3-10 caractères, alphanumérique)
   - Nom (input)
   - Ville (input)
   - Adresse (textarea)
   - Contact nom (input, optionnel)
   - Contact email (input, validation @, optionnel)
   - Contact téléphone (input, optionnel)
3. Bouton "CRÉER"
4. Validation formulaire (côté client)
5. Appel `api.createDepot()` (apiWrapper.js)
6. Succès: Message toast + retour liste dépôts
7. Erreur: Message erreur (code dupliqué, format invalide)

---

## 4. PAGE: DÉTAIL DÉPÔT + ZONES

### 4.1 Layout

```
┌────────────────────────────────────────────────────────────┐
│ ☰ MENU  |  Dépôt DEP001            |  👤 Sophie Durand ▼  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ← RETOUR                                                  │
│                                                            │
│  ENTREPÔT PARIS NORD (DEP001)              [MODIFIER]     │
│                                                            │
│  📍 Localisation                                           │
│     Paris, 123 rue de la République, 75018 Paris          │
│                                                            │
│  📞 Contact                                                │
│     Jean Dupont                                            │
│     jean.dupont@depot-paris.com                            │
│     +33612345678                                           │
│                                                            │
│  ───────────────────────────────────────────────────────  │
│                                                            │
│  ZONES                                      [+ NOUVELLE]   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Code     │ Nom                │ Type     │ Statut    │ │
│  ├──────────┼────────────────────┼─────────┼───────────┤ │
│  │ Z01      │ Zone stockage      │ Entrepôt│ Active    │ │
│  │          │ principal          │         │ [MODIFIER]│ │
│  ├──────────┼────────────────────┼─────────┼───────────┤ │
│  │ QUAI-A   │ Quai de chargement │ Quai    │ Active    │ │
│  │          │                    │         │ [MODIFIER]│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Fonctionnalités
- Affichage infos dépôt (lecture seule, sauf bouton MODIFIER)
- Bouton "MODIFIER" dépôt (si droits qhse_manager/admin)
- Section zones:
  - Bouton "+ NOUVELLE" (créer zone dans ce dépôt)
  - Tableau zones avec bouton MODIFIER par ligne
  - Pas de suppression zone (cascade lors suppression dépôt uniquement)

### 4.3 Parcours: Créer zone (qhse_manager)

1. Clic "+ NOUVELLE ZONE"
2. Modal formulaire:
   - Code (input, 2-20 caractères, unique dans ce dépôt)
   - Nom (input)
   - Type (select: warehouse, loading, office, production, cold_storage)
   - Statut (radio: active/inactive, défaut active)
3. Bouton "CRÉER"
4. Validation formulaire
5. Appel `api.createZone({ depotId, code, name, type })` (depot_id auto-rempli)
6. Succès: Zone ajoutée à la liste + message toast
7. Erreur: Message (code dupliqué dans ce dépôt)

---

## 5. PAGE: LISTE UTILISATEURS (admin_dev uniquement)

### 5.1 Layout

```
┌────────────────────────────────────────────────────────────┐
│ ☰ MENU  |  Utilisateurs            |  👤 Admin System ▼   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  UTILISATEURS                               [+ INVITER]    │
│                                                            │
│  Recherche: [_____________]  🔍   Filtre: [Tous rôles ▼]  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Nom              │ Email         │ Rôle      │ Statut│ │
│  ├──────────────────┼───────────────┼──────────┼───────┤ │
│  │ Admin System     │ admin@...     │ admin_dev│ Active│ │
│  │                  │               │          │[EDIT] │ │
│  ├──────────────────┼───────────────┼──────────┼───────┤ │
│  │ Sophie Durand    │ manager@...   │ qhse_mgr │ Active│ │
│  │                  │               │          │[EDIT] │ │
│  ├──────────────────┼───────────────┼──────────┼───────┤ │
│  │ Marie Martin     │ qh.auditor@...│ qh_audit │ Active│ │
│  │                  │               │          │[EDIT] │ │
│  ├──────────────────┼───────────────┼──────────┼───────┤ │
│  │ Pierre Dubois    │ safety@...    │ safety_a │ Active│ │
│  │                  │               │          │[EDIT] │ │
│  ├──────────────────┼───────────────┼──────────┼───────┤ │
│  │ Luc Bernard      │ viewer@...    │ viewer   │ Active│ │
│  │                  │               │          │[EDIT] │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Fonctionnalités
- Bouton "+ INVITER" (admin_dev) → formulaire invitation
- Filtre par rôle (dropdown)
- Recherche par nom/email
- Bouton EDIT par ligne:
  - Modifier rôle (admin_dev uniquement)
  - Modifier statut (activer/désactiver user)
  - Pas de suppression physique (désactivation préférée)

### 5.3 Parcours: Inviter utilisateur (admin_dev)

**Mode Prod** (Supabase Auth):
1. Clic "+ INVITER"
2. Modal formulaire:
   - Email (input, validation @)
   - Prénom (input)
   - Nom (input)
   - Rôle (select: admin_dev, qhse_manager, qh_auditor, safety_auditor, viewer)
3. Bouton "INVITER"
4. Appel Supabase `auth.admin.inviteUserByEmail()` + création row `users`
5. Email invitation envoyé (Supabase)
6. User clique lien, définit mot de passe
7. User actif

**Mode Démo**:
1. Simulation: User ajouté à mockData (localStorage)
2. Message: "User invité (démo)" + ajouté à la liste

---

## 6. COMPOSANTS RÉUTILISABLES

### 6.1 Component: UserRoleBadge

```jsx
// Badge coloré selon rôle
<UserRoleBadge role="qhse_manager" />

// Rendu:
// [QHSE Manager] (badge bleu)
// [QH Auditor] (badge vert)
// [Safety Auditor] (badge orange)
// [Viewer] (badge gris)
// [Admin Dev] (badge rouge)
```

### 6.2 Component: StatusBadge

```jsx
<StatusBadge status="active" />
// Rendu: [Actif] (badge vert)

<StatusBadge status="inactive" />
// Rendu: [Inactif] (badge gris)
```

### 6.3 Component: DataTable

```jsx
<DataTable
  columns={[
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Nom', sortable: true },
    { key: 'city', label: 'Ville' },
    { key: 'actions', label: '', render: (row) => <Actions row={row} /> }
  ]}
  data={depots}
  onRowClick={(depot) => navigate(`/depots/${depot.id}`)}
/>
```

### 6.4 Component: FormModal

```jsx
<FormModal
  title="Créer un dépôt"
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSubmit={handleCreateDepot}
>
  <Input label="Code" name="code" required />
  <Input label="Nom" name="name" required />
  <Input label="Ville" name="city" required />
  <Textarea label="Adresse" name="address" required />
</FormModal>
```

---

## 7. NAVIGATION (MENU LATÉRAL)

### 7.1 Menu admin_dev / qhse_manager

```
☰ MENU
├── 🏠 Dashboard
├── 📍 Dépôts
├── 📋 Audits (étape 03)
├── ⚠️ Non-Conformités (étape 04)
├── 👥 Utilisateurs (admin_dev uniquement)
└── 🚪 Déconnexion
```

### 7.2 Menu qh_auditor / safety_auditor

```
☰ MENU
├── 🏠 Dashboard
├── 📍 Dépôts (lecture seule)
├── 📋 Mes Audits (étape 03)
├── ⚠️ Non-Conformités (étape 04)
└── 🚪 Déconnexion
```

### 7.3 Menu viewer

```
☰ MENU
├── 🏠 Dashboard
├── 📍 Dépôts (lecture seule)
├── 📋 Audits (lecture seule, étape 03)
├── ⚠️ Non-Conformités (lecture seule, étape 04)
└── 🚪 Déconnexion
```

---

## 8. RESPONSIVE (MOBILE)

### 8.1 Adaptations mobile
- Menu latéral → Hamburger menu (collapse)
- Tableaux → Cards verticales (scroll horizontal désactivé)
- Formulaires → Full width, inputs stacked

### 8.2 Breakpoints
- **Desktop**: >= 1024px (layout tableau)
- **Tablet**: 768-1023px (layout mixte)
- **Mobile**: < 768px (layout cards)

---

## 9. ÉTATS UI

### 9.1 Loading
- Skeleton loaders (cartes KPI, tableaux)
- Spinner sur boutons (pendant API call)

### 9.2 Empty state
- Aucun dépôt:
  ```
  📦 Aucun dépôt
  Créez votre premier dépôt pour commencer.
  [+ CRÉER UN DÉPÔT]
  ```

### 9.3 Error state
- Message toast (erreur réseau, validation)
- Page 404 (route inconnue)
- Page 403 (accès refusé RLS)

---

## 10. DÉCISIONS UI/UX

### DU1-01: Pas de suppression directe dépôts/zones en UI (qhse_manager)
**Raison**: Éviter suppressions accidentelles (seul admin_dev peut supprimer via admin panel).

**Alternative rejetée**: Bouton DELETE avec confirmation → risque erreur humaine.

### DU1-02: Modification rôle user via modal (pas inline edit)
**Raison**: Opération sensible, nécessite confirmation.

**Alternative rejetée**: Dropdown inline → risque clic accidentel.

### DU1-03: Code dépôt auto-uppercase côté DB (pas côté UI)
**Raison**: Simplification UX (user tape lowercase, DB convertit).

**Alternative rejetée**: Forcer uppercase input → moins user-friendly.

### DU1-04: Badge rôles colorés
**Raison**: Identification visuelle rapide (scan liste profiles).

**Alternative rejetée**: Texte seul → moins visible.

---

**Statut**: ✅ Wireframes et parcours UI définis pour étape 01
