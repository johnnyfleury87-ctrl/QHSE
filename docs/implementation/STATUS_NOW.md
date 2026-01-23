# 🔍 ÉTAT ACTUEL DU CODE – AUDIT DE REPRISE

**Date audit**: 23 janvier 2026  
**Source de vérité**: README.md, docs/implementation.md, migrations 0001-0005

---

## 📊 RÉSUMÉ EXÉCUTIF

| Indicateur | État |
|-----------|------|
| **Mode Démo fonctionnel** | 🟡 Partiellement |
| **Parcours cliquable complet** | 🔴 Non |
| **Cohérence statuts FR/EN** | 🔴 Incohérent |
| **API Wrapper complet** | 🟡 Partiel |
| **Composants critiques manquants** | 🔴 Oui |

**Verdict**: Le projet est à ~60% de "démo cliquable". Beaucoup de pages existent mais avec des incohérences statuts et des trous fonctionnels.

---

## 1️⃣ PAGES EXISTANTES ET LEUR ÉTAT

### ✅ Pages OK (fonctionnelles en démo)

| Route | Fichier | État | Note |
|-------|---------|------|------|
| `/` | `app/page.js` | ✅ OK | Landing page avec CTA démo/login |
| `/demo` | `app/demo/page.js` | ✅ OK | Dashboard démo avec KPIs, appelle mockApi.getDashboardStats() |
| `/login` | `app/login/page.js` | ✅ OK | Page login (non testée mais existe) |
| `/dashboard` | `app/dashboard/page.js` | ✅ OK | Dashboard prod avec stats depuis mockApi.dashboard.* |
| `/audits` | `app/audits/page.js` | ✅ OK | Liste audits, filtres status, mais **statuts EN** |
| `/audits/[id]` | `app/audits/[id]/page.js` | ✅ OK | Détail audit avec contexte, mais **statuts EN** |
| `/audits/[id]/realiser` | `app/audits/[id]/realiser/page.js` | 🟡 STUB | Questions affichées mais **lecture seule, pas d'édition** |
| `/depots` | `app/depots/page.js` | ✅ OK | Liste dépôts |
| `/depots/[id]` | `app/depots/[id]/page.js` | ✅ OK | Détail dépôt avec audits liés |
| `/zones` | `app/zones/page.js` | ✅ OK | Liste zones |
| `/zones/[id]` | `app/zones/[id]/page.js` | ✅ OK | Détail zone |
| `/templates` | `app/templates/page.js` | ✅ OK | Liste templates, mais **statuts EN** |
| `/non-conformites` | `app/non-conformites/page.js` | ✅ OK | Liste NC avec filtres |

### 🔴 Pages MANQUANTES (critiques pour parcours démo)

| Route | Manquant | Impact |
|-------|----------|--------|
| `/audits/[id]/report` | ❌ | **BLOQUANT** - pas de vue rapport généré |
| `/audits/[id]/questions` | ❌ | **BLOQUANT** - pas de vue questions interactives |
| `/non-conformites/[id]` | ❌ | Détail NC manquant |
| `/templates/[id]` | ❌ | Détail template + questions manquant |
| `/admin/dashboard` | ❌ | Routes admin inexistantes |
| `/admin/templates` | ❌ | CRUD templates inexistant |
| `/admin/audits` | ❌ | Création audit inexistante |
| `/admin/audits/new` | ❌ | Formulaire création audit manquant |

**Priorité MAXIMALE**: 
- `/audits/[id]/questions` (vue questions interactive)
- `/audits/[id]/report` (vue rapport)
- Les 2 permettent de compléter le parcours "audit détail → questions → rapport"

---

## 2️⃣ FONCTIONS API WRAPPER

### ✅ Fonctions IMPLÉMENTÉES (démo)

| Fonction | État | Note |
|----------|------|------|
| `getUsers()` | ✅ | Retourne mockUsers |
| `getDepots()` | ✅ | Retourne mockDepots |
| `getZones()` | ✅ | Retourne mockZones |
| `getTemplates()` | ✅ | Retourne mockTemplates |
| `getQuestionsByTemplate(id)` | ✅ | Retourne questions filtrées |
| `getAudits()` | ✅ | Retourne mockAudits |
| `getAuditById(id)` | ✅ | Retourne audit unique |
| `getResponsesByAudit(id)` | ✅ | Retourne réponses audit |
| `getNonConformities()` | ✅ | Retourne mockNonConformities |
| `getDashboardStats()` | ✅ | Retourne stats calculées |
| `mockApi.dashboard.*` | ✅ | 7 fonctions KPI dashboard (conforme étape 04) |

### 🔴 Fonctions MANQUANTES (critiques pour démo cliquable)

| Fonction manquante | Besoin | Impact |
|-------------------|--------|--------|
| `api.audits.start(id)` | ❌ | **BLOQUANT** - impossible de passer audit à "en_cours" |
| `api.audits.complete(id)` | ❌ | **BLOQUANT** - impossible de terminer audit |
| `api.answers.upsert()` | ❌ | **BLOQUANT** - impossible de répondre aux questions |
| `api.answers.getProgress(id)` | ❌ | Calcul answered/total manquant |
| `api.reports.getByAuditId(id)` | ❌ | **BLOQUANT** - pas de rapport accessible |
| `api.nonConformities.createFromRule()` | ❌ | NC auto impossible |
| `api.stats.getDashboard()` | ❌ | Stats dashboard pas dans apiWrapper (seulement mockApi) |

### 🟡 Fonctions PARTIELLES (throw en prod)

Toutes les fonctions CRUD (create/update/delete) pour:
- depots
- zones
- templates
- audits
- NC

→ **throw "non implémenté en prod"** mais log en démo

**État**: Acceptable pour démo, à implémenter pour prod (étape E).

---

## 3️⃣ COMPOSANTS UI MANQUANTS

### 🔴 Composants CRITIQUES absents

| Composant | Chemin attendu | Usage |
|-----------|---------------|-------|
| `audit-questions-form.js` | `components/audits/` | Formulaire réponses questions (types: yes_no, score, text) |
| `audit-report-viewer.js` | `components/audits/` | Affichage rapport généré |
| `rule-engine-evaluator.js` | `lib/` | Moteur évaluation règles HACCP/Sécurité |
| `nc-form.js` | `components/non-conformites/` | Formulaire création NC |
| `template-questions-editor.js` | `components/templates/` | CRUD questions dans template |

### ✅ Composants existants

| Composant | Fichier | État |
|-----------|---------|------|
| `depot-form.js` | `components/depots/` | ✅ OK |
| `zone-form.js` | `components/zones/` | ✅ OK |
| `template-form.js` | `components/templates/` | 🟡 Partiel (pas gestion questions) |
| `app-shell.js` | `components/layout/` | ✅ OK |
| `demo-banner.js` | `components/ui/` | ✅ OK |
| `loading-states.js` | `components/ui/` | ✅ OK |
| `card/button/badge/table` | `components/ui/` | ✅ OK |

---

## 4️⃣ INCOHÉRENCE STATUTS FR/EN (CRITIQUE)

### ❌ PROBLÈME DÉTECTÉ

**Source de vérité SQL** (`docs/implementation.md`, migrations):
```sql
CREATE TYPE statut_audit AS ENUM (
  'planifie',   -- À faire
  'en_cours',   -- En cours
  'termine',    -- Terminé
  'annule'      -- Annulé
);
```

**Mais le code utilise ANGLAIS**:

#### 📂 `src/data/mockData.js`
```javascript
// ❌ FAUX
status: 'assigned'      // ligne 302
status: 'in_progress'   // ligne 317
status: 'completed'     // ligne 332
```

#### 📂 `app/audits/page.js`
```javascript
// ❌ FAUX
const variants = {
  assigned: 'audit-assigned',
  in_progress: 'audit-in-progress',
  completed: 'audit-completed',
}

// Filtres
audits.filter(a => a.status === 'assigned')
```

#### 📂 Toutes les pages audits
- `/audits/page.js`
- `/audits/[id]/page.js`
- `/demo/page.js`
- `/dashboard/page.js`
- `/depots/[id]/page.js`

**Impact**: 
- ✅ Le code "marche" en démo (cohérence interne EN)
- ❌ **Mais sera CASSÉ en prod** car la DB attend FR
- ❌ **Violation règle README**: "Code = FR, DB = FR. Point."

### ✅ CORRECTION REQUISE (A2)

**Remplacer partout**:
```javascript
// OLD (EN) → NEW (FR)
'assigned'    → 'planifie'
'in_progress' → 'en_cours'
'completed'   → 'termine'
'draft'       → 'brouillon' (si existe)
'canceled'    → 'annule'
```

**Fichiers à corriger** (liste exhaustive après grep):
1. `src/data/mockData.js` (audits mockés, stats)
2. `app/audits/page.js` (filtres, badges)
3. `app/audits/[id]/page.js` (badges, conditions)
4. `app/audits/[id]/realiser/page.js`
5. `app/demo/page.js` (stats)
6. `app/dashboard/page.js` (KPIs)
7. `app/depots/[id]/page.js`
8. Toute référence future dans composants

---

## 5️⃣ TROUS FONCTIONNELS (EMPÊCHENT PARCOURS DÉMO)

### 🔴 Trou #1: Pas de vue questions interactive

**État actuel**: `/audits/[id]/realiser` affiche questions en lecture seule.

**Manque**:
- Champs de saisie selon `question.type`:
  - `yes_no` → radio buttons Oui/Non
  - `score_1_5` → input number ou slider
  - `text` → textarea
- Bouton "Enregistrer réponse" → `api.answers.upsert()`
- Calcul progress en temps réel
- Évaluation règles (si `has_rule=true`)
- Déclenchement NC auto si règle violée

**Impact**: Impossible de "jouer" une démo réaliste.

### 🔴 Trou #2: Pas de vue rapport

**État actuel**: `/audits/[id]/report` n'existe pas.

**Manque**:
- Vue rapport avec:
  - Résumé: score conformité, dates, auditeur
  - Tableau réponses par question
  - Liste NC liées
  - Bouton export (optionnel démo)

**Impact**: Impossible de voir le résultat d'un audit terminé.

### 🔴 Trou #3: Pas de moteur de règles

**État actuel**: Aucun fichier `lib/rulesEngine.js`.

**Manque**:
- Fonction `evaluateRule(question, value)`
- Retour: `{ severity, shouldCreateNC, ncPayload }`
- Cas supportés:
  - Température hors min/max
  - NOK → warning/critical
  - Photo obligatoire si critical

**Impact**: Pas de démo HACCP/Sécurité réaliste.

### 🟡 Trou #4: Pas d'UI admin

**État actuel**: Aucune route `/admin/*`.

**Manque**:
- Dashboard admin
- CRUD templates
- Création audit + assignation
- Gestion dépôts/zones (existe déjà mais pas centralisé)

**Impact**: Moyen (démo peut se concentrer côté auditeur).

---

## 6️⃣ DONNÉES MOCK – COHÉRENCE

### ✅ Points forts

- **5 users** avec rôles distincts ✅
- **1 dépôt, 2 zones** ✅
- **2 templates** (sécurité, qualité) ✅
- **~12 questions** réparties sur templates ✅
- **3 audits** (1 assigned, 1 in_progress, 1 completed) ✅
- **Réponses mockées** pour audits 002 et 003 ✅
- **1 NC** liée à audit-003 ✅
- **Stats dashboard** calculées depuis données ✅

### 🟡 Points à améliorer

- **Statuts EN au lieu de FR** 🔴 (vu section 4)
- **Pas de règles HACCP** dans questions (champ `rule_config` manquant)
- **Pas de rapport "snapshot"** stocké (calculé à la volée OK pour démo)
- **NC pas assez variées** (1 seule, manque exemples open/in_progress/closed)

**Actions**:
- Ajouter 2-3 NC supplémentaires avec statuts variés
- Ajouter `rule_config` sur au moins 2 questions (température, DLC)

---

## 7️⃣ PRIORITÉS POUR "DÉMO CLIQUABLE"

### 🔥 PRIORITÉ MAX (BLOQUANTS)

1. **Corriger statuts FR** (toutes occurrences EN → FR)
2. **Créer `/audits/[id]/questions`** (vue questions interactive)
3. **Implémenter `api.answers.upsert()`** (sauvegarde réponses en mémoire démo)
4. **Créer `/audits/[id]/report`** (vue rapport calculé)
5. **Implémenter `api.audits.start()` et `api.audits.complete()`**

### 🟡 PRIORITÉ HAUTE (AMÉLIORE DÉMO)

6. **Créer `lib/rulesEngine.js`** (moteur règles HACCP/Sécurité)
7. **Brancher règles dans questions** (évaluation + NC auto)
8. **Ajouter NC mockées variées** (statuts + gravités)

### 🟢 PRIORITÉ BASSE (OPTIONNEL DÉMO)

9. Routes admin (`/admin/*`)
10. CRUD templates complet
11. Formulaire création audit

---

## 8️⃣ ESTIMATION TEMPS (SI FOCUS DÉMO)

| Tâche | Temps estimé |
|-------|-------------|
| **A2 - Corriger statuts FR** | 30 min |
| **B1 - Compléter apiWrapper (start/complete/upsert/report)** | 1h |
| **B2 - Page `/audits/[id]/questions`** | 2h |
| **B2 - Page `/audits/[id]/report`** | 1h |
| **C1 - Rule engine** | 1h30 |
| **C1 - Brancher règles** | 30 min |
| **Total DÉMO CLIQUABLE** | **~6-7h** |

---

## 9️⃣ CHECKLIST DE VALIDATION "DÉMO OK"

### ✅ Parcours utilisateur complet

- [ ] Accueil `/` → clic "Mode Démo" → `/demo`
- [ ] Dashboard affiche KPIs cohérents (calculés depuis mock)
- [ ] Clic "Audits à faire" → `/audits?status=planifie`
- [ ] Clic sur audit-001 → `/audits/audit-001`
- [ ] Détail audit affiche contexte (template, dépôt, zone, auditeur, dates)
- [ ] Bouton "Voir questions" → `/audits/audit-001/questions`
- [ ] Questions affichées par catégorie, avec champs saisie
- [ ] Répondre à une question → sauvegarde en mémoire (mockApi state)
- [ ] Si règle violée (ex: température 7°C) → NC auto créée
- [ ] Progress mis à jour (3/6 réponses)
- [ ] Bouton "Terminer audit" → audit passe à `termine`
- [ ] Bouton "Voir rapport" → `/audits/audit-001/report`
- [ ] Rapport affiche résumé + réponses + NC liées
- [ ] Menu NC → `/non-conformites` → liste affichée
- [ ] Clic NC → `/non-conformites/nc-001` → détail (si créé)

### ✅ Aucune régression

- [ ] Aucune page n'affiche "undefined" ou "No data"
- [ ] Aucune console error
- [ ] Bandeau "MODE DÉMO" visible partout
- [ ] Statuts FR partout (UI + code)

---

## 🎯 DÉCISION SUIVANTE

**Recommandation**: Suivre ordre imposé dans plan d'implémentation.

**Prochaine étape**: **A2 - Corriger statuts FR/EN** (30 min, impact large).

Après A2 → **B1** (apiWrapper) → **B2** (pages questions/report) → **C1** (rule engine).

---

**FIN RAPPORT STATUS_NOW**
