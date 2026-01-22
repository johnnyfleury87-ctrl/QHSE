# Exemples UI – Rapports & Exports QHSE

## Date
22 janvier 2026

## Vue d'ensemble
Documentation wireframes, composants UI et parcours utilisateurs pour module Rapports & Exports. Couvre Mode Démo et Production.

---

## 🎨 WIREFRAMES PAR VUE

### Vue 1: Liste Rapports `/rapports`

**Layout Desktop**:
```
┌────────────────────────────────────────────────────┐
│ Header QHSE                    [Mode Démo 🎭]      │
├────────────────────────────────────────────────────┤
│ Rapports & Exports                                 │
│                                                    │
│ [Filtres]  Type: [Tous ▼]  Statut: [Disponible ▼] │
│           Période: [30 derniers jours ▼]           │
│                                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ Code          │ Type        │ Audit  │ Actions │ │
│ ├───────────────┼─────────────┼────────┼─────────┤ │
│ │ RAP202601-001 │ Audit PDF   │ A-0123 │ 📥 Voir │ │
│ │ RAP202601-002 │ Audit MD    │ A-0123 │ 📥 Voir │ │
│ │ RAP202601-003 │ Synthèse NC │ -      │ 📥 Voir │ │
│ │ RAP202601-004 │ Export NC   │ -      │ 📥 Téléch│ │
│ │ RAP202601-005 │ Audit PDF   │ A-0123 │ 📥 Voir │ │
│ │               │ (v2)        │        │ ⟲ Regén │ │
│ └────────────────────────────────────────────────┘ │
│ Page 1/3  [< Préc] [Suiv >]                        │
└────────────────────────────────────────────────────┘
```

**Composants**:
- `RapportTable`: Tableau réactif (tri, pagination)
- `RapportFilters`: Filtres collapsibles (type, statut, période)
- `RapportActions`: Boutons (télécharger, voir, regénérer)

---

### Vue 2: Détail Rapport `/rapports/:code`

**Layout**:
```
┌────────────────────────────────────────────────────┐
│ ← Retour Rapports                                  │
│                                                    │
│ Rapport RAP202601-001                              │
│ ─────────────────────────────────────────────────  │
│ Type: Rapport Audit Complet (PDF)                 │
│ Audit: AUDIT-2026-0123 "HACCP - Hygiène"          │
│ Généré le: 15/01/2026 14:30                       │
│ Par: Sophie Müller (Safety Auditor)               │
│ Statut: ✅ Disponible                             │
│                                                    │
│ [📥 Télécharger PDF]  [⟲ Regénérer]  [🗂️ Versions]│
│                                                    │
│ ┌─ Métadonnées ──────────────────────────────────┐ │
│ │ Dépôt: Genève Centre                           │ │
│ │ Zone: Entrepôt Froid                           │ │
│ │ Template: Template Audit Standard v1.0         │ │
│ │ Taille fichier: 512 KB                         │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ┌─ Historique Consultations ────────────────────┐  │
│ │ 22/01 08:05 - Manager téléchargement          │  │
│ │ 15/01 14:35 - Auditeur vue                    │  │
│ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

**Composants**:
- `RapportHeader`: Métadonnées + statut badge
- `RapportActions`: Boutons contextuels (télécharger, regénérer)
- `ConsultationHistory`: Timeline consultations

---

### Vue 3: Génération Rapport Audit `/audits/:id` (bouton)

**Intégration Page Détail Audit**:
```
┌────────────────────────────────────────────────────┐
│ Audit AUDIT-2026-0123 [Complété ✅]                │
│ ...métadonnées audit...                            │
│                                                    │
│ ┌─ Rapports ──────────────────────────────────────┐│
│ │ [📄 Générer Rapport PDF]  [📝 Générer Markdown] ││
│ │                                                  ││
│ │ Rapports existants:                             ││
│ │ • RAP202601-001 (v1) - 15/01 14:30  [📥 PDF]    ││
│ │ • RAP202601-005 (v2) - 22/01 08:00  [📥 PDF]    ││
│ │                                     [📥 MD]      ││
│ └──────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

**Workflow Génération**:
1. Clic "Générer Rapport PDF"
2. Toast: "⏳ Génération en cours..."
3. Génération backend (5s)
4. Toast: "✅ Rapport disponible"
5. Apparition lien téléchargement

---

### Vue 4: Export NC `/non-conformites/exports`

**Layout**:
```
┌────────────────────────────────────────────────────┐
│ Exports Non-Conformités                            │
│                                                    │
│ ┌─ Filtres Export ──────────────────────────────┐  │
│ │ Période: [●] 30j  [ ] 90j  [ ] Personnalisée  │  │
│ │ Gravité: ☑ Critique  ☐ Haute  ☐ Moyenne       │  │
│ │ Statut:  ☑ Ouverte   ☑ En traitement          │  │
│ │ Dépôt:   [Tous ▼]                              │  │
│ │                                                 │  │
│ │ Aperçu: 42 NC correspondent aux filtres        │  │
│ │                                                 │  │
│ │ [📊 Exporter Excel]                             │  │
│ └──────────────────────────────────────────────────┘│
│                                                    │
│ ⚠️ Note: Exports limités à 10 000 lignes (RG-11)  │
│                                                    │
│ Exports récents:                                   │
│ • Export NC Critiques - 21/01 10:30  [📥 Excel]   │
│ • Export NC Janvier - 20/01 09:00    [📥 Excel]   │
└────────────────────────────────────────────────────┘
```

**Composants**:
- `ExportFilters`: Formulaire filtres (checkboxes, selects)
- `ExportPreview`: Compteur résultats + avertissement limite
- `RecentExports`: Liste exports précédents

---

### Vue 5: Synthèse NC (Manager) `/rapports/synthese-nc/new`

**Layout**:
```
┌────────────────────────────────────────────────────┐
│ Générer Synthèse Non-Conformités                   │
│                                                    │
│ Période:                                           │
│  Début: [01/01/2026 📅]  Fin: [31/01/2026 📅]     │
│                                                    │
│ Filtres optionnels:                                │
│  Dépôt: [Tous ▼]                                   │
│  Zone:  [Toutes ▼]                                 │
│                                                    │
│ Sections incluses:                                 │
│  ☑ KPIs NC                                         │
│  ☑ Top 5 Zones à Risque                           │
│  ☑ Liste NC Détaillée                             │
│  ☑ Actions Correctives en Cours                   │
│                                                    │
│ [🔄 Générer Rapport PDF]                           │
└────────────────────────────────────────────────────┘
```

---

### Vue 6: Historique Versions `/rapports/:code/versions`

**Layout**:
```
┌────────────────────────────────────────────────────┐
│ Versions Rapport RAP202601-001                     │
│                                                    │
│ ┌─ Version 2 (Actuelle) ────────────────────────┐  │
│ │ Générée le: 22/01/2026 08:00                   │  │
│ │ Par: Jean Dupont (Manager)                     │  │
│ │ Taille: 520 KB                                 │  │
│ │ [📥 Télécharger v2]                             │  │
│ └──────────────────────────────────────────────────┘│
│                                                    │
│ ┌─ Version 1 ───────────────────────────────────┐  │
│ │ Générée le: 15/01/2026 14:30                   │  │
│ │ Par: Sophie Müller (Auditor)                   │  │
│ │ Taille: 512 KB                                 │  │
│ │ [📥 Télécharger v1]                             │  │
│ └──────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

---

## 🧩 COMPOSANTS RÉUTILISABLES

### Composant: RapportCard

**Props**:
```javascript
{
  codeRapport: 'RAP202601-001',
  typeRapport: 'audit_complet',
  format: 'pdf',
  auditCode: 'AUDIT-2026-0123',
  generatedAt: '2026-01-15T14:30:00Z',
  generatedBy: 'Sophie Müller',
  statut: 'disponible',
  onDownload: () => {},
  onView: () => {},
  onRegenerate: () => {}
}
```

**Rendu**:
```jsx
<div className="border rounded-lg p-4 shadow-sm">
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold">{codeRapport}</h3>
      <p className="text-sm text-gray-600">{typeRapport} ({format})</p>
      {auditCode && <p className="text-xs">Audit: {auditCode}</p>}
    </div>
    <span className={`badge ${statutColor}`}>{statut}</span>
  </div>
  <div className="mt-3 flex gap-2">
    <button onClick={onDownload}>📥 Télécharger</button>
    <button onClick={onView}>👁️ Voir</button>
    {canRegenerate && <button onClick={onRegenerate}>⟲ Regénérer</button>}
  </div>
</div>
```

---

### Composant: ExportButton

**Props**:
```javascript
{
  type: 'nc' | 'audits' | 'conformite',
  filters: { periode, gravite, statut, depot },
  resultCount: 42,
  maxResults: 10000,
  onExport: (filters) => {}
}
```

**Validation**:
```javascript
const isDisabled = resultCount > maxResults;
const buttonText = isDisabled 
  ? '⚠️ Trop de résultats (affiner filtres)'
  : `📊 Exporter ${resultCount} ${type}`;
```

---

### Composant: GenerationProgress

**États**:
- `idle`: Prêt
- `generating`: En cours (spinner + %)
- `success`: ✅ Disponible
- `error`: ❌ Erreur (afficher message)

**Rendu**:
```jsx
{statut === 'generating' && (
  <div className="flex items-center gap-2">
    <Spinner />
    <span>Génération en cours... {progress}%</span>
  </div>
)}
{statut === 'success' && (
  <div className="text-green-600">
    ✅ Rapport disponible
    <button onClick={onDownload}>Télécharger</button>
  </div>
)}
{statut === 'error' && (
  <div className="text-red-600">
    ❌ Erreur: {errorMessage}
    <button onClick={onRetry}>Réessayer</button>
  </div>
)}
```

---

## 📱 RESPONSIVE DESIGN

### Breakpoints
- **Mobile** (< 768px): 1 colonne, actions empilées
- **Tablet** (768-1024px): 2 colonnes tableaux
- **Desktop** (> 1024px): Layout complet

### Adaptations Mobile
- Tableau rapports → Cards empilées
- Filtres → Drawer collapsible
- Actions → Menu contextuel (...)

---

## 🎭 MODE DÉMO

### Bandeau Mode Démo (Permanent)
```
┌────────────────────────────────────────────────────┐
│ 🎭 MODE DÉMO - Données d'exemple (aucun fichier réel)
└────────────────────────────────────────────────────┘
```

### Comportement Téléchargement Démo
**Option 1** (Recommandé):
- Clic "Télécharger PDF" → Toast: "🎭 Démo: téléchargement simulé"
- Pas de fichier réel téléchargé

**Option 2** (Avancé):
- Générer PDF mock statique (1 page "Rapport Démo QHSE")
- Télécharger fichier mock

### Mock Data Rapports (5 rapports)
Voir `mockRapportsGeneres` dans `02_schema_db_rapports.md`.

---

## ♿ ACCESSIBILITÉ

### ARIA Labels
```jsx
<button 
  aria-label="Télécharger rapport RAP202601-001 format PDF"
  onClick={onDownload}
>
  📥 Télécharger
</button>

<table aria-label="Liste des rapports générés">
  <thead>...</thead>
</table>
```

### Navigation Clavier
- Tab: Navigation boutons/liens
- Enter: Activer action (télécharger, voir)
- Esc: Fermer modals filtres

### Screen Readers
- États génération annoncés ("Génération terminée")
- Erreurs lues automatiquement

---

## 🎨 DESIGN TOKENS

### Couleurs Statuts Rapports
```css
.badge-disponible   { bg-green-100  text-green-800 }
.badge-generation   { bg-blue-100   text-blue-800 }
.badge-erreur       { bg-red-100    text-red-800 }
.badge-archive      { bg-gray-100   text-gray-600 }
```

### Icônes Actions
- 📥 Télécharger
- 👁️ Voir/Prévisualiser
- ⟲ Regénérer
- 🗂️ Versions
- 📊 Exporter

---

## ✅ CHECKLIST UI

### Pages Implémentées
- [ ] Liste rapports (`/rapports`)
- [ ] Détail rapport (`/rapports/:code`)
- [ ] Génération rapport audit (intégré `/audits/:id`)
- [ ] Export NC (`/non-conformites/exports`)
- [ ] Synthèse NC (`/rapports/synthese-nc/new`)
- [ ] Historique versions (`/rapports/:code/versions`)

### Composants Créés
- [ ] RapportCard
- [ ] RapportTable
- [ ] RapportFilters
- [ ] ExportButton
- [ ] GenerationProgress
- [ ] ConsultationHistory

### États UI Gérés
- [ ] Loading (génération en cours)
- [ ] Empty (aucun rapport)
- [ ] Error (échec génération)
- [ ] Success (rapport disponible)

### Responsive
- [ ] Mobile < 768px
- [ ] Tablet 768-1024px
- [ ] Desktop > 1024px

### Accessibilité
- [ ] ARIA labels complets
- [ ] Navigation clavier
- [ ] Screen readers

### Mode Démo
- [ ] Bandeau permanent
- [ ] 5 rapports mock affichés
- [ ] Téléchargement simulé ou fichier mock

---

**Document prêt pour validation décisions techniques.**
