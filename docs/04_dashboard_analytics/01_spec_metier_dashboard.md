# 📊 SPÉCIFICATIONS MÉTIER – ÉTAPE 04
## DASHBOARD & ANALYTICS QHSE

---

## 🆔 IDENTITÉ DU DOCUMENT

| Propriété | Valeur |
|-----------|--------|
| **Étape** | 04 – Dashboard & Analytics |
| **Date création** | 22 janvier 2026 |
| **Responsable** | GitHub Copilot (Claude Sonnet 4.5) |
| **Statut** | 📝 Brouillon – En attente validation |
| **Dépendances** | Étapes 01 (Foundation) + 02 (Audits) + 03 (NC) VALIDÉES |
| **Version** | 1.0 |

---

## 🎯 OBJECTIF MÉTIER

### Finalité
Fournir aux utilisateurs QHSE des **tableaux de bord** et **indicateurs de suivi** permettant:
- Visualisation synthétique de l'activité QHSE
- Pilotage par KPI (audits, conformité, NC)
- Prise de décision informée
- Identification rapide des zones à risque

### Périmètre Fonctionnel
- **Dashboard Démo**: accessible sans login, données mock stables
- **Dashboard Prod**: accessible après authentification, données réelles filtrées par rôle
- **Indicateurs Clés (KPIs)**: audits, NC, taux conformité
- **Visualisations**: graphiques répartition, historiques temporels
- **Filtres**: dépôt, zone, période, statut

### Exclusions
❌ Exports PDF/Excel (étape future)  
❌ Alertes temps réel (étape future)  
❌ Rapports personnalisables (étape future)  
❌ Prédictions/IA (hors périmètre projet)

---

## 📐 CONCEPTS MÉTIER

### 1. Dashboard (Tableau de Bord)
**Définition**: Page synthèse affichant KPIs et visualisations pour période donnée

**Types**:
- **Dashboard Démo** (`/demo`): démonstration sans login, données mock
- **Dashboard Prod** (`/dashboard`): production après authentification, données réelles

**Composants**:
- **KPI Cards**: cartes numériques (ex: "15 audits à faire")
- **Charts**: graphiques (barres, donuts, lignes)
- **Quick Access**: liens vers listes filtrées (audits, NC)

---

### 2. Indicateurs Clés (KPIs)
**Définition**: Métriques métier calculées sur données QHSE

#### KPI-01: Audits à Faire
- **Calcul**: `COUNT(audits WHERE statut = 'assigned')`
- **Affichage**: Nombre entier + badge 🟡
- **Action**: Clic → liste audits filtrés `status=assigned`

#### KPI-02: Audits en Cours
- **Calcul**: `COUNT(audits WHERE statut = 'in_progress')`
- **Affichage**: Nombre entier + badge 🔵
- **Action**: Clic → liste audits filtrés `status=in_progress`

#### KPI-03: Audits Terminés (30j)
- **Calcul**: `COUNT(audits WHERE statut = 'completed' AND completed_at >= NOW() - 30 days)`
- **Affichage**: Nombre entier + évolution vs période précédente
- **Action**: Clic → liste audits filtrés `status=completed&period=30d`

#### KPI-04: Taux de Conformité Global
- **Calcul**: `(total_questions_conformes / total_questions_repondues) * 100`
- **Affichage**: Pourcentage + jauge colorée
  - 🟢 ≥ 90%: Bon
  - 🟡 70-89%: Acceptable
  - 🔴 < 70%: Critique
- **Action**: Clic → détail conformité par template/zone

#### KPI-05: Non-Conformités Ouvertes
- **Calcul**: `COUNT(non_conformites WHERE statut IN ('ouverte', 'en_traitement'))`
- **Affichage**: Nombre entier + répartition par gravité
  - 🔴 Critiques
  - 🟠 Hautes
  - 🟡 Moyennes
  - 🟢 Faibles
- **Action**: Clic → liste NC filtrées `status=open`

#### KPI-06: NC Échues
- **Calcul**: `COUNT(non_conformites WHERE is_overdue = TRUE AND statut != 'resolue')`
- **Affichage**: Nombre entier + badge ⚠️
- **Action**: Clic → liste NC échues

---

### 3. Visualisations (Charts)

#### CHART-01: Répartition Audits par Statut
- **Type**: Donut Chart / Bar Chart
- **Données**: 
  - Assigned (À faire)
  - In Progress (En cours)
  - Completed (Terminés)
  - Archived (Archivés)
- **Filtres**: dépôt, zone, période
- **Action**: Clic segment → liste audits filtrés

#### CHART-02: Non-Conformités par Gravité
- **Type**: Bar Chart horizontal
- **Données**:
  - Critique (rouge)
  - Haute (orange)
  - Moyenne (jaune)
  - Faible (vert)
- **Filtres**: dépôt, zone, période, statut NC
- **Action**: Clic barre → liste NC filtrées

#### CHART-03: Historique Audits Terminés (6 mois)
- **Type**: Line Chart
- **Données**: Nombre audits terminés par mois (6 derniers mois)
- **Axe X**: Mois (Jan, Fév, Mar...)
- **Axe Y**: Nombre d'audits
- **Action**: Clic point → liste audits mois sélectionné

#### CHART-04: Taux Conformité par Dépôt (Top 5)
- **Type**: Bar Chart
- **Données**: Taux conformité (%) par dépôt
- **Ordre**: Décroissant (meilleurs en premier)
- **Limite**: 5 dépôts
- **Action**: Clic barre → détail dépôt

#### CHART-05: Top 5 Zones avec NC Critiques
- **Type**: Table / Bar Chart
- **Données**: 
  - Nom zone
  - Nombre NC critiques
  - Dépôt parent
- **Ordre**: Décroissant (plus de NC en premier)
- **Action**: Clic zone → détail zone + NC

---

### 4. Filtres Dashboard

#### Filtre Global (Tous Dashboards)
- **Période**: 
  - 7 derniers jours
  - 30 derniers jours (défaut)
  - 90 derniers jours
  - 6 derniers mois
  - 12 derniers mois
  - Personnalisée (date début + fin)

#### Filtres Contextuels (Dashboard Prod)
- **Dépôt**: Liste déroulante (tous dépôts accessibles selon rôle)
- **Zone**: Liste déroulante (zones du dépôt sélectionné)
- **Template**: Liste déroulante (filtrer audits par template)
- **Auditeur**: Liste déroulante (admin/manager uniquement)

---

## 🔐 PERMISSIONS PAR RÔLE

### Dashboard Démo (`/demo`)
| Rôle | Accès | Filtres | Actions |
|------|-------|---------|---------|
| **Tous (sans login)** | ✅ Lecture | ⚠️ Période uniquement | Clic KPI → listes démo |

**Contraintes**:
- Aucun appel Supabase
- Données mock stables (mockData.js)
- Bandeau permanent "🎭 MODE DÉMO"

---

### Dashboard Prod (`/dashboard`)

#### admin_dev
- **Accès**: ✅ Toutes données
- **Filtres**: Tous (dépôt, zone, période, auditeur)
- **KPIs**: Globaux (tous dépôts/zones)
- **Charts**: Toutes visualisations
- **Actions**: Clic → listes complètes (tous audits/NC)

#### qhse_manager
- **Accès**: ✅ Toutes données
- **Filtres**: Tous (dépôt, zone, période, auditeur)
- **KPIs**: Globaux
- **Charts**: Toutes visualisations
- **Actions**: Clic → listes complètes

#### qh_auditor / safety_auditor
- **Accès**: ⚠️ Propres audits uniquement
- **Filtres**: Période uniquement (pas filtre dépôt/zone/auditeur)
- **KPIs**: Personnels (audits assignés, NC propres audits)
- **Charts**: 
  - ✅ CHART-01 (propres audits)
  - ✅ CHART-02 (NC propres audits)
  - ❌ CHART-03, 04, 05 (vues globales interdites)
- **Actions**: Clic → listes filtrées (propres audits/NC uniquement)

#### viewer
- **Accès**: ⚠️ Audits terminés + NC clôturées uniquement (selon RLS)
- **Filtres**: Période uniquement
- **KPIs**: 
  - ✅ KPI-03 (audits terminés accessibles)
  - ❌ KPI-01, 02 (audits en cours interdits)
  - ⚠️ KPI-04 (conformité sur audits accessibles)
  - ⚠️ KPI-05, 06 (NC clôturées uniquement)
- **Charts**: Vues limitées (conformité, historique audits terminés)
- **Actions**: Clic → listes lecture seule

---

## 📋 RÈGLES DE GESTION

### RG-Dashboard-01: Données Dashboard Temps Réel
**Énoncé**: Les KPIs et charts doivent refléter l'état actuel de la base de données (pas de cache long)

**Implémentation**:
- En Démo: données mock stables (pas de recalcul)
- En Prod: requêtes SQL avec calculs agrégés (SUM, COUNT, AVG)

**Validation**:
- Audit terminé → KPI-03 incrémente immédiatement après rafraîchissement page
- NC créée → KPI-05 incrémente immédiatement

---

### RG-Dashboard-02: Valeurs Calculées (pas Hardcodées UI)
**Énoncé**: Aucune valeur KPI/chart ne doit être codée en dur dans composants UI

**Implémentation**:
- Dashboard Démo: `api.stats.getDashboard()` → retourne objet stats calculé depuis mockData
- Dashboard Prod: `api.stats.getDashboard()` → requête SQL agrégée

**Validation**:
- Modification mockData → KPIs dashboard démo changent
- Suppression ligne mockAudits → KPI-01 démo décrémente

---

### RG-Dashboard-03: Filtres Respectent RLS
**Énoncé**: Les filtres ne doivent jamais exposer données interdites par RLS

**Implémentation**:
- Filtre "Auditeur": liste uniquement auditeurs accessibles selon rôle
- Filtre "Dépôt": liste uniquement dépôts avec audits accessibles
- Requêtes SQL: WHERE clauses combinent filtre + RLS policies

**Validation**:
- qh_auditor sélectionne filtre "Auditeur" → voir uniquement son nom
- viewer sélectionne filtre "Statut" → option "assigned" absente

---

### RG-Dashboard-04: Actions KPI Cohérentes
**Énoncé**: Cliquer sur KPI doit naviguer vers liste pré-filtrée cohérente

**Implémentation**:
- KPI-01 (15 audits à faire) → `/audits?status=assigned`
- KPI-05 (8 NC ouvertes) → `/non-conformities?status=open`
- URL filters appliqués immédiatement à la liste

**Validation**:
- Clic KPI-01 → liste affiche exactement 15 audits statut "assigned"
- Retour dashboard → KPI affiche toujours 15

---

### RG-Dashboard-05: États UI Dashboard
**Énoncé**: Dashboard doit gérer états loading/empty/error

**Implémentation**:
- **Loading**: Skeleton cards pendant chargement API
- **Empty**: Message "Aucune donnée pour période sélectionnée" (+ suggestions)
- **Error**: Message erreur + bouton retry

**Validation**:
- Premier chargement → skeletons visibles
- Filtre période "12 mois" sur nouveau projet → message empty + suggestion "Créer premier audit"
- Réseau coupé → message erreur + retry

---

### RG-Dashboard-06: Période par Défaut
**Énoncé**: Période par défaut dashboard = 30 derniers jours

**Implémentation**:
- Première visite `/dashboard` ou `/demo` → filtre période = "30j"
- LocalStorage optionnel: mémoriser dernière période choisie

**Validation**:
- Ouverture dashboard → filtres affichent "30 derniers jours"
- KPIs calculés sur `created_at >= NOW() - 30 days`

---

### RG-Dashboard-07: Graphiques Accessibles (a11y)
**Énoncé**: Charts doivent être accessibles clavier + screen readers

**Implémentation**:
- Attributs ARIA: `role="img"`, `aria-label="Répartition audits par statut"`
- Tableau alternatif (visually hidden) pour valeurs exactes
- Navigation clavier: Tab → segments cliquables

**Validation**:
- Screen reader annonce "Graphique: Répartition audits. 5 audits à faire, 3 en cours..."
- Tab → focus segment → Enter → navigation liste

---

### RG-Dashboard-08: Cohérence Démo/Prod
**Énoncé**: Structure UI Dashboard Démo = Dashboard Prod (seules données changent)

**Implémentation**:
- Mêmes composants React/Vue
- Même layout (KPIs, charts, filtres)
- Différence: bandeau démo + source données (mockData vs Supabase)

**Validation**:
- Composant `<DashboardLayout />` réutilisé Démo + Prod
- Props: `isDemoMode={true/false}`, `data={mockStats / prodStats}`

---

### RG-Dashboard-09: Calcul Taux Conformité
**Énoncé**: Taux conformité = (réponses conformes / total réponses) * 100

**Définition "Réponse Conforme"**:
- Type `yes_no`: value = "yes"
- Type `ok_nok_na`: value = "ok"
- Type `score_1_5`: value >= 3
- Type `text`: toujours conforme (pas de calcul)
- Type `checklist`: toutes cases requises cochées

**Implémentation**:
```sql
-- Exemple calcul SQL (Prod)
SELECT 
  (COUNT(*) FILTER (WHERE is_conforme = TRUE) * 100.0 / NULLIF(COUNT(*), 0))::INT AS taux_conformite
FROM reponses
WHERE audit_id IN (SELECT id FROM audits WHERE completed_at >= NOW() - INTERVAL '30 days')
```

**Validation**:
- 10 réponses, 9 conformes → taux = 90%
- 0 réponses → taux = N/A (pas 0%)

---

### RG-Dashboard-10: Top 5 Limité
**Énoncé**: Classements "Top 5" limités à 5 entrées max (lisibilité)

**Implémentation**:
- CHART-04 (conformité dépôts): `LIMIT 5`
- CHART-05 (zones NC): `LIMIT 5`
- Si > 5 résultats: lien "Voir tous" → liste complète

**Validation**:
- 10 dépôts en DB → chart affiche 5 + lien "Voir les 5 autres"

---

### RG-Dashboard-11: Données Mock Stables (Démo)
**Énoncé**: Dashboard Démo doit afficher données mock stables (pas aléatoires)

**Implémentation**:
- `mockData.js` contient objet `dashboardStats` pré-calculé
- Pas de `Math.random()` dans calculs démo
- Valeurs cohérentes avec mockAudits, mockNonConformities

**Validation**:
- Rafraîchir page démo 10× → KPIs identiques
- KPI-01 démo = `mockAudits.filter(a => a.status === 'assigned').length`

---

### RG-Dashboard-12: Isolation Auditeurs
**Énoncé**: Auditeurs voient uniquement leurs propres KPIs/charts (pas stats globales)

**Implémentation**:
- Dashboard auditeur: `WHERE auditeur_id = auth.uid()`
- KPI-01 (audits à faire): compter uniquement audits assignés à lui
- Charts: filtrer données par `assigned_to = user_id`

**Validation**:
- qh_auditor connecté → KPI-01 affiche 3 (ses audits)
- admin connecté → KPI-01 affiche 15 (tous audits)

---

## 📊 WIREFRAMES & COMPORTEMENTS UI

### Dashboard Démo (`/demo`)

#### Layout
```
╔════════════════════════════════════════════════════════╗
║  🎭 MODE DÉMO (données exemple)              [Rôle ▼] ║
╠════════════════════════════════════════════════════════╣
║  📊 Dashboard QHSE                 [📅 30 derniers j] ║
╠═══════════════╦═══════════════╦═══════════════╦═══════╣
║   Audits      ║   Audits      ║   Audits      ║  Taux ║
║   à Faire     ║   en Cours    ║  Terminés     ║ Conf. ║
║      5        ║      3        ║      12       ║  87%  ║
║    [🟡 +2]    ║    [🔵 -1]    ║   [🟢 +4]     ║ [🟡]  ║
╠═══════════════╩═══════════════╩═══════════════╩═══════╣
║   NC Ouvertes: 4    |    NC Échues: 1                 ║
╠════════════════════════════════════════════════════════╣
║  📈 Répartition Audits          📊 NC par Gravité     ║
║  ┌────────────────────────┐    ┌─────────────────┐   ║
║  │   [Donut Chart]        │    │ Critique:  1    │   ║
║  │                        │    │ Haute:     2    │   ║
║  │   Assigned: 5          │    │ Moyenne:   1    │   ║
║  │   In Progress: 3       │    │ Faible:    0    │   ║
║  │   Completed: 12        │    └─────────────────┘   ║
║  └────────────────────────┘                          ║
╠════════════════════════════════════════════════════════╣
║  📉 Historique Audits Terminés (6 mois)               ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │  [Line Chart: Sep: 8, Oct: 10, Nov: 9...]       │ ║
║  └──────────────────────────────────────────────────┘ ║
╠════════════════════════════════════════════════════════╣
║  🔍 Accès Rapide                                       ║
║  [📝 Tous les Audits]  [⚠️ Toutes les NC]             ║
╚════════════════════════════════════════════════════════╝
```

#### Comportements
1. **Sélecteur Rôle** (optionnel démo):
   - Changer rôle → recalcule KPIs selon permissions
   - Ex: passer de "Manager" à "Auditeur" → KPIs réduits

2. **Clic KPI "Audits à Faire"**:
   - Navigation: `/audits?status=assigned`
   - Mode démo préservé

3. **Clic segment chart "Assigned"**:
   - Navigation: `/audits?status=assigned`

4. **Filtre Période**:
   - Change période → recalcule KPIs/charts
   - Démo: filtrer mockData par dates

---

### Dashboard Prod (`/dashboard`)

#### Layout Admin/Manager
```
╔════════════════════════════════════════════════════════╗
║  🛡️ Mode Production                   [Manager ▼]      ║
╠════════════════════════════════════════════════════════╣
║  📊 Dashboard QHSE Pilotage                            ║
║  [Dépôt ▼] [Zone ▼] [Template ▼] [📅 30 derniers j]  ║
╠═══════════════╦═══════════════╦═══════════════╦═══════╣
║ [KPIs identiques démo + filtres actifs]              ║
╠════════════════════════════════════════════════════════╣
║  📊 Top 5 Dépôts (Conformité)                         ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │  DEP001: 92% ████████████████░░                  │ ║
║  │  DEP002: 88% ██████████████░░░░                  │ ║
║  │  DEP003: 85% ████████████░░░░░                   │ ║
║  └──────────────────────────────────────────────────┘ ║
╠════════════════════════════════════════════════════════╣
║  🚨 Top 5 Zones avec NC Critiques                     ║
║  1. Zone Froide (DEP001): 3 NC critiques              ║
║  2. Quai Chargement (DEP002): 2 NC critiques          ║
║  [Voir détails zones]                                 ║
╚════════════════════════════════════════════════════════╝
```

#### Layout Auditeur
```
╔════════════════════════════════════════════════════════╗
║  🛡️ Mode Production            [QH Auditor ▼]         ║
╠════════════════════════════════════════════════════════╣
║  📊 Mes Audits                      [📅 30 derniers j] ║
╠═══════════════╦═══════════════╦═══════════════════════╣
║   Audits      ║   Audits      ║   Audits              ║
║   Assignés    ║   en Cours    ║  Terminés             ║
║      3        ║      1        ║      8                ║
╠═══════════════╩═══════════════╩═══════════════════════╣
║  📈 Mes Audits par Statut                             ║
║  [Chart limité aux audits propres]                    ║
╠════════════════════════════════════════════════════════╣
║  🔍 Accès Rapide                                       ║
║  [📝 Mes Audits à Faire]  [📊 Mes Audits Terminés]    ║
╚════════════════════════════════════════════════════════╝
```

---

## 🧪 SCÉNARIOS MÉTIER

### Scénario 01: Découverte Dashboard Démo (Sans Login)
**Acteur**: Visiteur anonyme

**Étapes**:
1. Visite `/` (accueil)
2. Clic bouton "Entrer en Mode Démo"
3. Redirection `/demo`
4. Dashboard affiche:
   - Bandeau "🎭 MODE DÉMO"
   - KPIs pré-calculés (5 audits à faire, 3 en cours, etc.)
   - Charts avec données mock
5. Clic KPI "5 Audits à Faire"
6. Navigation `/audits?status=assigned` (mode démo)
7. Liste affiche 5 audits mock statut "assigned"

**Résultat**: Découverte fluide sans login, cohérence KPI ↔ liste

---

### Scénario 02: Manager Filtre Dashboard (Prod)
**Acteur**: qhse_manager (authentifié)

**Étapes**:
1. Login → redirection `/dashboard`
2. Dashboard affiche KPIs globaux (tous dépôts/zones)
3. Sélectionne filtre "Dépôt: DEP001"
4. Dashboard recharge:
   - KPI-01: 8 audits (DEP001 uniquement)
   - Charts filtrés sur DEP001
5. Sélectionne filtre "Zone: Warehouse"
6. KPIs encore réduits:
   - KPI-01: 3 audits (DEP001 + Warehouse)
7. Sélectionne période "7 derniers jours"
8. KPIs recalculés sur 7j

**Résultat**: Filtres cumulatifs cohérents, données restreintes progressivement

---

### Scénario 03: Auditeur Dashboard Personnel (Prod)
**Acteur**: qh_auditor (authentifié)

**Étapes**:
1. Login → redirection `/dashboard`
2. Dashboard affiche:
   - KPI-01: 3 (ses audits assignés)
   - KPI-02: 1 (son audit en cours)
   - KPI-03: 12 (ses audits terminés 30j)
   - Charts limités à ses données
3. Tente filtre "Auditeur" → liste vide (voir uniquement soi-même)
4. Clic KPI-01 "3 Audits Assignés"
5. Navigation `/audits?status=assigned&mine=true`
6. Liste affiche 3 audits (tous assignés à lui)

**Résultat**: Isolation stricte, auditeur ne voit jamais stats globales

---

### Scénario 04: Viewer Dashboard Limité (Prod)
**Acteur**: viewer (authentifié)

**Étapes**:
1. Login → redirection `/dashboard`
2. Dashboard affiche:
   - KPI-01, 02: masqués (audits en cours interdits)
   - KPI-03: 45 (audits terminés accessibles selon RLS)
   - KPI-04: 89% (conformité audits accessibles)
   - KPI-05: 2 (NC clôturées uniquement)
3. Clic KPI-03 "45 Audits Terminés"
4. Navigation `/audits?status=completed`
5. Liste affiche audits terminés (RLS appliqué)

**Résultat**: Viewer accès lecture seule données historiques

---

### Scénario 05: Dashboard Empty (Nouveau Projet)
**Acteur**: admin_dev (authentifié)

**Étapes**:
1. Login projet neuf (aucun audit créé)
2. Dashboard affiche:
   - Tous KPIs = 0
   - Charts vides avec message "Aucune donnée"
   - Suggestion: "Créer votre premier audit"
3. Clic bouton "Créer Audit"
4. Navigation `/admin/audits/new`

**Résultat**: État empty géré proprement, call-to-action visible

---

## 📦 DONNÉES MOCKDATA REQUISES

### Objet `dashboardStats` (à ajouter dans `mockData.js`)
```javascript
export const dashboardStats = {
  // KPIs
  auditsAssigned: 5,
  auditsInProgress: 3,
  auditsCompleted30d: 12,
  tauxConformiteGlobal: 87, // %
  ncOuvertes: 4,
  ncEchues: 1,

  // Charts data
  auditsParStatut: [
    { statut: 'assigned', count: 5, label: 'À faire' },
    { statut: 'in_progress', count: 3, label: 'En cours' },
    { statut: 'completed', count: 12, label: 'Terminés' },
    { statut: 'archived', count: 2, label: 'Archivés' }
  ],

  ncParGravite: [
    { gravite: 'critique', count: 1, color: '#ef4444' },
    { gravite: 'haute', count: 2, color: '#f97316' },
    { gravite: 'moyenne', count: 1, color: '#eab308' },
    { gravite: 'faible', count: 0, color: '#22c55e' }
  ],

  auditsTermines6mois: [
    { mois: 'Sep 2025', count: 8 },
    { mois: 'Oct 2025', count: 10 },
    { mois: 'Nov 2025', count: 9 },
    { mois: 'Dec 2025', count: 11 },
    { mois: 'Jan 2026', count: 12 },
    { mois: 'Fév 2026', count: 0 } // mois en cours
  ],

  top5DepotsConformite: [
    { depotId: 'depot-001', depotCode: 'DEP001', taux: 92 },
    { depotId: 'depot-002', depotCode: 'DEP002', taux: 88 },
    { depotId: 'depot-003', depotCode: 'DEP003', taux: 85 }
  ],

  top5ZonesNC: [
    { 
      zoneId: 'zone-001', 
      zoneName: 'Zone Froide', 
      depotCode: 'DEP001', 
      ncCritiques: 3 
    },
    { 
      zoneId: 'zone-002', 
      zoneName: 'Quai Chargement', 
      depotCode: 'DEP002', 
      ncCritiques: 2 
    }
  ]
};
```

**Contrainte**: Valeurs cohérentes avec `mockAudits`, `mockNonConformities` existants

---

## ✅ CRITÈRES DE VALIDATION

### Validation Fonctionnelle
- [ ] Dashboard Démo accessible sans login (`/demo`)
- [ ] Dashboard Prod accessible après authentification (`/dashboard`)
- [ ] 6 KPIs affichés correctement (valeurs non nulles)
- [ ] 5 charts affichés (données visualisées)
- [ ] Filtres période fonctionnels (recalcul KPIs)
- [ ] Filtres contextuels prod (dépôt, zone) fonctionnels
- [ ] Clic KPI → navigation liste filtrée
- [ ] Clic segment chart → navigation liste filtrée
- [ ] Permissions respectées:
  - Admin/Manager: tout visible
  - Auditeur: données personnelles uniquement
  - Viewer: lecture seule historique
- [ ] États UI gérés (loading, empty, error)

### Validation Technique
- [ ] Aucune valeur hardcodée UI (tout via API)
- [ ] Mode démo: 0 appel Supabase
- [ ] Mode prod: RLS respecté (requêtes filtrées)
- [ ] Calculs stats corrects (vérification SQL manuelle)
- [ ] Données mock cohérentes (dashboardStats ↔ mockAudits)
- [ ] Accessibilité charts (ARIA, clavier)
- [ ] Responsive (mobile, tablet, desktop)

### Validation Métier
- [ ] Taux conformité calculé selon RG-Dashboard-09
- [ ] Auditeurs isolation stricte (RG-Dashboard-12)
- [ ] Top 5 limité à 5 entrées (RG-Dashboard-10)
- [ ] Période défaut 30j (RG-Dashboard-06)
- [ ] Filtres respectent RLS (RG-Dashboard-03)

---

## 🚫 EXCLUSIONS CONFIRMÉES

**Non inclus dans Étape 04**:
- ❌ Exports PDF/Excel
- ❌ Alertes temps réel (webhooks)
- ❌ Rapports personnalisables (templates)
- ❌ Comparaisons période vs période (évolution %)
- ❌ Prédictions/tendances (IA/ML)
- ❌ Graphiques avancés (heatmaps, treemaps)
- ❌ Notifications push (browser/mobile)

**Raison**: Périmètre MVP Dashboard, fonctionnalités avancées = étapes futures

---

## 📝 NOTES IMPLÉMENTATION

### Calculs Stats (Prod)
**Approche**: Requêtes SQL agrégées optimisées (pas calcul côté app)

Exemple:
```sql
-- KPI-01: Audits Assigned
SELECT COUNT(*) 
FROM audits 
WHERE statut = 'assigned' 
  AND deleted_at IS NULL;

-- KPI-04: Taux Conformité
SELECT 
  ROUND(
    (COUNT(*) FILTER (WHERE is_conforme = TRUE) * 100.0) 
    / NULLIF(COUNT(*), 0)
  ) AS taux
FROM reponses
WHERE audit_id IN (
  SELECT id FROM audits 
  WHERE completed_at >= NOW() - INTERVAL '30 days'
);
```

### Calculs Stats (Démo)
**Approche**: Fonction JS `calculateDashboardStats(mockData)` dans `mockData.js`

```javascript
function calculateDashboardStats() {
  return {
    auditsAssigned: mockAudits.filter(a => a.status === 'assigned').length,
    auditsInProgress: mockAudits.filter(a => a.status === 'in_progress').length,
    // ... etc
  };
}

export const dashboardStats = calculateDashboardStats();
```

---

## 🔄 DÉPENDANCES ÉTAPES PRÉCÉDENTES

### Étape 01 (Foundation)
- ✅ Table `profiles` (filtres par rôle)
- ✅ Table `depots` (filtre dépôt, top 5 dépôts)
- ✅ Table `zones` (filtre zone, top 5 zones NC)
- ✅ RLS policies (isolation données)

### Étape 02 (Audits)
- ✅ Table `audits` (KPI-01, 02, 03)
- ✅ Table `reponses` (calcul conformité KPI-04)
- ✅ Champ `audits.completed_at` (filtre temporel)
- ✅ Champ `reponses.is_conforme` (calcul taux)

### Étape 03 (NC)
- ✅ Table `non_conformites` (KPI-05, 06)
- ✅ Champ `non_conformites.gravite` (chart NC par gravité)
- ✅ Champ `non_conformites.is_overdue` (KPI-06 NC échues)
- ✅ Relation `nc.audit_id` (lien audit ↔ NC)

---

## 📚 RÉFÉRENCES

- **README.md**: Sections 20-25 (Dashboard Démo/Prod, KPIs, Charts)
- **Étape 01**: Rôles utilisateurs, RLS foundation
- **Étape 02**: Structure audits, questions, réponses
- **Étape 03**: Non-conformités, gravité, statuts

---

## ✍️ SIGNATURE

**Document finalisé**: 22 janvier 2026  
**Validation requise**: Humaine (avant passage fichier 02)  
**Prochaine étape**: `02_schema_db_dashboard.md` (après validation)

---

**FIN DOCUMENT `01_spec_metier_dashboard.md`**
