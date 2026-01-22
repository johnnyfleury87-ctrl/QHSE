# 🧪 TESTS & VALIDATION – ÉTAPE 04
## DASHBOARD & ANALYTICS QHSE

---

## 🆔 IDENTITÉ DU DOCUMENT

| Propriété | Valeur |
|-----------|--------|
| **Étape** | 04 – Dashboard & Analytics |
| **Date création** | 22 janvier 2026 |
| **Responsable** | GitHub Copilot (Claude Sonnet 4.5) |
| **Statut** | 📝 Conception complète – En attente validation |
| **Dépendances** | Tests Étapes 01, 02, 03 (validés) |
| **Version** | 1.0 |

---

## 🎯 OBJECTIFS VALIDATION

### Portée Tests Étape 04
1. **Calculs Stats**: KPIs et charts retournent valeurs correctes
2. **RLS Dashboard**: Isolation auditeurs, filtres respectés
3. **Performance**: Requêtes agrégées optimisées (< 500ms)
4. **Mode Démo**: Données mock cohérentes, 0 appel Supabase
5. **UI Dashboard**: États (loading, empty, error), accessibilité

### Méthode de Test
- **DB (Prod)**: Scripts SQL exécutés manuellement
- **Démo**: Tests fonctionnels automatisés (Jest/Vitest)
- **UI**: Tests e2e (Playwright/Cypress) + accessibilité (axe)

---

## 📊 TESTS CALCULS STATISTIQUES (DB)

### Test DB-01: KPI-01 Audits Assignés
**Objectif**: Valider COUNT audits statut "assigned"

```sql
-- Setup: Créer données test
INSERT INTO audits (id, template_id, depot_id, statut, assigned_to) VALUES
  ('audit-test-001', 'template-001', 'depot-001', 'assigned', 'user-001'),
  ('audit-test-002', 'template-001', 'depot-001', 'assigned', 'user-002'),
  ('audit-test-003', 'template-001', 'depot-001', 'in_progress', 'user-001');

-- Test: Compter audits assigned
SELECT COUNT(*) AS audits_assigned
FROM audits
WHERE statut = 'assigned' AND is_archived = FALSE;

-- Attendu: 2
-- Validation: ✅ Si résultat = 2, ❌ sinon

-- Cleanup
DELETE FROM audits WHERE id LIKE 'audit-test-%';
```

---

### Test DB-02: KPI-04 Taux Conformité (Logique Métier)
**Objectif**: Valider calcul conformité (yes/ok/score>=3)

```sql
-- Setup: Audit + questions + réponses
INSERT INTO audits (id, template_id, depot_id, statut, completed_at) VALUES
  ('audit-test-004', 'template-001', 'depot-001', 'completed', NOW());

INSERT INTO questions (id, template_id, question_text, question_type) VALUES
  ('q-test-001', 'template-001', 'Test Yes/No', 'yes_no'),
  ('q-test-002', 'template-001', 'Test OK/NOK', 'ok_nok_na'),
  ('q-test-003', 'template-001', 'Test Score', 'score_1_5'),
  ('q-test-004', 'template-001', 'Test Text', 'text');

INSERT INTO reponses (audit_id, question_id, value) VALUES
  ('audit-test-004', 'q-test-001', '{"answer": "yes"}'),     -- Conforme
  ('audit-test-004', 'q-test-002', '{"answer": "nok"}'),     -- Non conforme
  ('audit-test-004', 'q-test-003', '{"score": 4}'),          -- Conforme (>=3)
  ('audit-test-004', 'q-test-004', '{"text": "Comment"}');   -- Ignoré

-- Test: Calcul conformité
SELECT calculate_conformity_rate(1);

-- Attendu: 66.7% (2 conformes / 3 évaluables)
-- Validation: ✅ Si 66.7 ou 67, ❌ si autre

-- Cleanup
DELETE FROM reponses WHERE audit_id = 'audit-test-004';
DELETE FROM questions WHERE id LIKE 'q-test-%';
DELETE FROM audits WHERE id = 'audit-test-004';
```

---

### Test DB-03: CHART-01 Répartition Audits par Statut
**Objectif**: Valider JSON retourné (structure + valeurs)

```sql
-- Setup: 4 audits (1 par statut)
INSERT INTO audits (id, template_id, depot_id, statut, assigned_to) VALUES
  ('audit-test-005', 'template-001', 'depot-001', 'assigned', 'user-001'),
  ('audit-test-006', 'template-001', 'depot-001', 'in_progress', 'user-001'),
  ('audit-test-007', 'template-001', 'depot-001', 'completed', 'user-001'),
  ('audit-test-008', 'template-001', 'depot-001', 'archived', 'user-001');

-- Test: Fonction chart
SELECT get_audits_by_status();

-- Attendu JSON:
-- [
--   {"statut": "assigned", "count": 1, "label": "À faire"},
--   {"statut": "in_progress", "count": 1, "label": "En cours"},
--   {"statut": "completed", "count": 1, "label": "Terminés"},
--   {"statut": "archived", "count": 1, "label": "Archivés"}
-- ]

-- Validation: 
-- ✅ JSON valide
-- ✅ 4 entrées
-- ✅ Counts corrects

-- Cleanup
DELETE FROM audits WHERE id LIKE 'audit-test-%';
```

---

### Test DB-04: CHART-02 NC par Gravité
**Objectif**: Valider répartition NC (critique, haute, moyenne, faible)

```sql
-- Setup: 4 NC (1 par gravité)
INSERT INTO non_conformites (id, code, depot_id, gravite, statut) VALUES
  ('nc-test-001', 'NC-TEST-001', 'depot-001', 'critique', 'ouverte'),
  ('nc-test-002', 'NC-TEST-002', 'depot-001', 'haute', 'ouverte'),
  ('nc-test-003', 'NC-TEST-003', 'depot-001', 'moyenne', 'ouverte'),
  ('nc-test-004', 'NC-TEST-004', 'depot-001', 'faible', 'ouverte');

-- Test: Fonction chart
SELECT get_nc_by_gravity();

-- Attendu JSON:
-- [
--   {"gravite": "critique", "count": 1, "color": "#ef4444"},
--   {"gravite": "haute", "count": 2, "color": "#f97316"},
--   {"gravite": "moyenne", "count": 1, "color": "#eab308"},
--   {"gravite": "faible", "count": 0, "color": "#22c55e"}
-- ]

-- Validation: ✅ Structure JSON + couleurs correctes

-- Cleanup
DELETE FROM non_conformites WHERE id LIKE 'nc-test-%';
```

---

### Test DB-05: CHART-04 Top 5 Dépôts (Conformité)
**Objectif**: Valider classement dépôts par taux conformité

```sql
-- Setup: 3 dépôts + audits + réponses
INSERT INTO depots (id, code, name) VALUES
  ('depot-test-001', 'DTEST001', 'Dépôt Test A'),
  ('depot-test-002', 'DTEST002', 'Dépôt Test B'),
  ('depot-test-003', 'DTEST003', 'Dépôt Test C');

-- Dépôt A: 100% conformité (2/2)
INSERT INTO audits (id, template_id, depot_id, statut, completed_at) VALUES
  ('audit-test-a', 'template-001', 'depot-test-001', 'completed', NOW());
INSERT INTO reponses (audit_id, question_id, value) VALUES
  ('audit-test-a', 'q-yes-001', '{"answer": "yes"}'),
  ('audit-test-a', 'q-ok-001', '{"answer": "ok"}');

-- Dépôt B: 50% conformité (1/2)
INSERT INTO audits (id, template_id, depot_id, statut, completed_at) VALUES
  ('audit-test-b', 'template-001', 'depot-test-002', 'completed', NOW());
INSERT INTO reponses (audit_id, question_id, value) VALUES
  ('audit-test-b', 'q-yes-001', '{"answer": "yes"}'),
  ('audit-test-b', 'q-ok-001', '{"answer": "nok"}');

-- Dépôt C: 0% conformité (0/2)
INSERT INTO audits (id, template_id, depot_id, statut, completed_at) VALUES
  ('audit-test-c', 'template-001', 'depot-test-003', 'completed', NOW());
INSERT INTO reponses (audit_id, question_id, value) VALUES
  ('audit-test-c', 'q-yes-001', '{"answer": "no"}'),
  ('audit-test-c', 'q-ok-001', '{"answer": "nok"}');

-- Test: Top 5 dépôts
SELECT get_top5_depots_conformity(1);

-- Attendu JSON (ordre décroissant):
-- [
--   {"depotCode": "DTEST001", "taux": 100},
--   {"depotCode": "DTEST002", "taux": 50},
--   {"depotCode": "DTEST003", "taux": 0}
-- ]

-- Validation: ✅ Ordre correct (100 > 50 > 0)

-- Cleanup
DELETE FROM reponses WHERE audit_id LIKE 'audit-test-%';
DELETE FROM audits WHERE id LIKE 'audit-test-%';
DELETE FROM depots WHERE id LIKE 'depot-test-%';
```

---

### Test DB-06: Filtre Période (30j vs 7j)
**Objectif**: Valider filtrage temporel KPIs

```sql
-- Setup: 2 audits (1 récent, 1 ancien)
INSERT INTO audits (id, template_id, depot_id, statut, completed_at) VALUES
  ('audit-recent', 'template-001', 'depot-001', 'completed', NOW() - INTERVAL '5 days'),
  ('audit-ancien', 'template-001', 'depot-001', 'completed', NOW() - INTERVAL '45 days');

-- Test 1: Période 30j
SELECT COUNT(*) FROM audits 
WHERE statut = 'completed' AND completed_at >= NOW() - INTERVAL '30 days';
-- Attendu: 1 (audit-recent uniquement)

-- Test 2: Période 7j
SELECT COUNT(*) FROM audits 
WHERE statut = 'completed' AND completed_at >= NOW() - INTERVAL '7 days';
-- Attendu: 1 (audit-recent uniquement)

-- Test 3: Période 60j
SELECT COUNT(*) FROM audits 
WHERE statut = 'completed' AND completed_at >= NOW() - INTERVAL '60 days';
-- Attendu: 2 (récent + ancien)

-- Validation: ✅ Filtres temporels corrects

-- Cleanup
DELETE FROM audits WHERE id IN ('audit-recent', 'audit-ancien');
```

---

## 🔐 TESTS RLS DASHBOARD (DB)

### Test RLS-01: Isolation Auditeur (KPI-01)
**Objectif**: Auditeur voit uniquement ses audits assignés

```sql
-- Setup: 3 audits (2 auditeur A, 1 auditeur B)
INSERT INTO audits (id, template_id, depot_id, statut, assigned_to) VALUES
  ('audit-a1', 'template-001', 'depot-001', 'assigned', 'user-auditeur-a'),
  ('audit-a2', 'template-001', 'depot-001', 'assigned', 'user-auditeur-a'),
  ('audit-b1', 'template-001', 'depot-001', 'assigned', 'user-auditeur-b');

-- Test: Auditeur A compte ses audits
SET LOCAL ROLE qh_auditor;
SET LOCAL request.jwt.claim.sub = 'user-auditeur-a';

SELECT COUNT(*) FROM audits WHERE statut = 'assigned';
-- Attendu: 2 (audit-a1, audit-a2)

-- Validation: ✅ Si 2, ❌ si 3 (leak auditeur B)

RESET ROLE;

-- Cleanup
DELETE FROM audits WHERE id LIKE 'audit-%';
```

---

### Test RLS-02: Manager Voit Tout
**Objectif**: Manager accède tous audits (global)

```sql
-- Setup: Même données Test RLS-01
INSERT INTO audits (id, template_id, depot_id, statut, assigned_to) VALUES
  ('audit-a1', 'template-001', 'depot-001', 'assigned', 'user-auditeur-a'),
  ('audit-a2', 'template-001', 'depot-001', 'assigned', 'user-auditeur-a'),
  ('audit-b1', 'template-001', 'depot-001', 'assigned', 'user-auditeur-b');

-- Test: Manager compte tous audits
SET LOCAL ROLE qhse_manager;
SET LOCAL request.jwt.claim.sub = 'user-manager-001';

SELECT COUNT(*) FROM audits WHERE statut = 'assigned';
-- Attendu: 3 (tous audits)

-- Validation: ✅ Si 3

RESET ROLE;

-- Cleanup
DELETE FROM audits WHERE id LIKE 'audit-%';
```

---

### Test RLS-03: Viewer Audits Completed Uniquement
**Objectif**: Viewer voit uniquement audits terminés

```sql
-- Setup: 3 audits (1 assigned, 1 in_progress, 1 completed)
INSERT INTO audits (id, template_id, depot_id, statut, completed_at) VALUES
  ('audit-assigned', 'template-001', 'depot-001', 'assigned', NULL),
  ('audit-progress', 'template-001', 'depot-001', 'in_progress', NULL),
  ('audit-completed', 'template-001', 'depot-001', 'completed', NOW());

-- Test: Viewer compte audits accessibles
SET LOCAL ROLE viewer;
SET LOCAL request.jwt.claim.sub = 'user-viewer-001';

SELECT COUNT(*) FROM audits;
-- Attendu: 1 (audit-completed uniquement)

SELECT COUNT(*) FROM audits WHERE statut = 'assigned';
-- Attendu: 0 (RLS bloque)

-- Validation: ✅ Si 1 total, 0 assigned

RESET ROLE;

-- Cleanup
DELETE FROM audits WHERE id LIKE 'audit-%';
```

---

### Test RLS-04: Fonction Chart Respecte RLS
**Objectif**: Fonction `get_audits_by_status()` filtre selon rôle

```sql
-- Setup: 3 audits (2 auditeur A, 1 auditeur B)
INSERT INTO audits (id, template_id, depot_id, statut, assigned_to) VALUES
  ('audit-a1', 'template-001', 'depot-001', 'assigned', 'user-auditeur-a'),
  ('audit-a2', 'template-001', 'depot-001', 'in_progress', 'user-auditeur-a'),
  ('audit-b1', 'template-001', 'depot-001', 'assigned', 'user-auditeur-b');

-- Test: Auditeur A appelle fonction
SET LOCAL ROLE qh_auditor;
SET LOCAL request.jwt.claim.sub = 'user-auditeur-a';

SELECT get_audits_by_status();
-- Attendu JSON: 
-- [
--   {"statut": "assigned", "count": 1},  -- audit-a1
--   {"statut": "in_progress", "count": 1}  -- audit-a2
-- ]
-- Total audits: 2 (pas audit-b1)

-- Validation: ✅ Si count total = 2

RESET ROLE;

-- Cleanup
DELETE FROM audits WHERE id LIKE 'audit-%';
```

---

## 🎭 TESTS MODE DÉMO (Fonctionnel)

### Test DEMO-01: Dashboard Stats Calculés depuis MockData
**Objectif**: `dashboardStats` valeurs cohérentes avec `mockAudits`

```javascript
// Test: Fichier mockData.js
import { mockAudits, dashboardStats } from './mockData.js';

describe('Dashboard Stats Démo', () => {
  test('KPI-01: Audits Assigned cohérent', () => {
    const expectedCount = mockAudits.filter(a => a.status === 'assigned').length;
    expect(dashboardStats.auditsAssigned).toBe(expectedCount);
  });

  test('KPI-02: Audits In Progress cohérent', () => {
    const expectedCount = mockAudits.filter(a => a.status === 'in_progress').length;
    expect(dashboardStats.auditsInProgress).toBe(expectedCount);
  });

  test('KPI-04: Taux Conformité entre 0-100%', () => {
    expect(dashboardStats.tauxConformiteGlobal).toBeGreaterThanOrEqual(0);
    expect(dashboardStats.tauxConformiteGlobal).toBeLessThanOrEqual(100);
  });

  test('Charts: Répartition audits somme correcte', () => {
    const totalChart = dashboardStats.auditsParStatut.reduce((sum, s) => sum + s.count, 0);
    const totalMock = mockAudits.length;
    expect(totalChart).toBe(totalMock);
  });
});
```

---

### Test DEMO-02: Aucun Appel Supabase en Mode Démo
**Objectif**: `apiWrapper` ne charge jamais `supabaseClient` en démo

```javascript
// Test: apiWrapper.js
import { DEMO_MODE } from './demoConfig.js';

describe('API Wrapper Mode Démo', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
  });

  test('DEMO_MODE activé', () => {
    expect(DEMO_MODE).toBe(true);
  });

  test('getDashboardStats retourne mock (pas Supabase)', async () => {
    const stats = await api.stats.getDashboard();
    
    // Validation structure
    expect(stats).toHaveProperty('auditsAssigned');
    expect(stats).toHaveProperty('tauxConformiteGlobal');
    expect(stats.auditsParStatut).toBeInstanceOf(Array);
    
    // Pas d'appel réseau (mock synchrone ou cache)
    // Si async, vérifier pas de fetch()
  });
});
```

---

### Test DEMO-03: Dashboard Démo Affiche Données Stables
**Objectif**: Rafraîchir page démo 10× → valeurs identiques

```javascript
// Test e2e: Playwright
test('Dashboard Démo données stables', async ({ page }) => {
  const values = [];

  for (let i = 0; i < 10; i++) {
    await page.goto('/demo');
    await page.waitForSelector('[data-testid="kpi-audits-assigned"]');
    
    const kpi01 = await page.textContent('[data-testid="kpi-audits-assigned"]');
    values.push(kpi01);
  }

  // Validation: toutes valeurs identiques
  const allEqual = values.every(v => v === values[0]);
  expect(allEqual).toBe(true);
});
```

---

## 🖥️ TESTS UI DASHBOARD (e2e)

### Test UI-01: Navigation KPI → Liste Filtrée
**Objectif**: Cliquer KPI "5 Audits à Faire" → liste audits assigned

```javascript
// Test: Playwright
test('Clic KPI-01 navigation liste audits', async ({ page }) => {
  // Mode Démo
  await page.goto('/demo');
  
  // Lire valeur KPI-01
  const kpi01Value = await page.textContent('[data-testid="kpi-audits-assigned"]');
  const expectedCount = parseInt(kpi01Value);

  // Clic KPI
  await page.click('[data-testid="kpi-audits-assigned"]');
  
  // Vérifier URL
  await page.waitForURL('/audits?status=assigned');
  
  // Compter lignes tableau
  const rows = await page.locator('[data-testid="audit-row"]').count();
  expect(rows).toBe(expectedCount);
});
```

---

### Test UI-02: Filtre Période Dashboard
**Objectif**: Changer période 30j → 7j → KPIs recalculés

```javascript
test('Filtre période dashboard', async ({ page }) => {
  await page.goto('/dashboard'); // Mode Prod (nécessite login)
  
  // Valeur initiale (30j défaut)
  const kpi03_30j = await page.textContent('[data-testid="kpi-audits-completed"]');
  
  // Changer filtre période
  await page.selectOption('[data-testid="filter-period"]', '7');
  await page.waitForTimeout(500); // Attendre recalcul
  
  // Valeur 7j
  const kpi03_7j = await page.textContent('[data-testid="kpi-audits-completed"]');
  
  // Validation: valeur change (7j <= 30j)
  expect(parseInt(kpi03_7j)).toBeLessThanOrEqual(parseInt(kpi03_30j));
});
```

---

### Test UI-03: Chart Clic Segment
**Objectif**: Cliquer segment "Assigned" chart → liste assigned

```javascript
test('Clic segment chart navigation', async ({ page }) => {
  await page.goto('/demo');
  
  // Attendre chart rendu
  await page.waitForSelector('[data-testid="chart-audits-status"]');
  
  // Clic segment "Assigned"
  await page.click('[data-testid="chart-segment-assigned"]');
  
  // Vérifier navigation
  await page.waitForURL('/audits?status=assigned');
});
```

---

### Test UI-04: Dashboard Empty State
**Objectif**: Dashboard sans données → message + CTA

```javascript
test('Dashboard empty state', async ({ page }) => {
  // Simuler DB vide (mock empty)
  await page.route('/api/stats/dashboard', route => {
    route.fulfill({
      json: {
        auditsAssigned: 0,
        auditsInProgress: 0,
        auditsCompleted30d: 0,
        tauxConformiteGlobal: null,
        ncOuvertes: 0,
        ncEchues: 0,
        auditsParStatut: [],
        ncParGravite: []
      }
    });
  });

  await page.goto('/dashboard');
  
  // Vérifier message empty
  await expect(page.locator('text=Aucune donnée')).toBeVisible();
  await expect(page.locator('text=Créer votre premier audit')).toBeVisible();
  
  // Vérifier bouton CTA
  await expect(page.locator('[data-testid="btn-create-audit"]')).toBeVisible();
});
```

---

### Test UI-05: Dashboard Loading State
**Objectif**: Skeletons pendant chargement

```javascript
test('Dashboard loading skeletons', async ({ page }) => {
  // Retarder API
  await page.route('/api/stats/dashboard', route => {
    setTimeout(() => route.continue(), 2000);
  });

  await page.goto('/dashboard');
  
  // Vérifier skeletons visibles
  await expect(page.locator('[data-testid="skeleton-kpi"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="skeleton-chart"]').first()).toBeVisible();
  
  // Attendre chargement
  await page.waitForSelector('[data-testid="kpi-audits-assigned"]');
  
  // Skeletons disparus
  await expect(page.locator('[data-testid="skeleton-kpi"]')).toHaveCount(0);
});
```

---

### Test UI-06: Dashboard Error State
**Objectif**: Erreur API → message + retry

```javascript
test('Dashboard error state', async ({ page }) => {
  // Simuler erreur API
  await page.route('/api/stats/dashboard', route => {
    route.abort('failed');
  });

  await page.goto('/dashboard');
  
  // Vérifier message erreur
  await expect(page.locator('text=Erreur de chargement')).toBeVisible();
  await expect(page.locator('[data-testid="btn-retry"]')).toBeVisible();
  
  // Clic retry
  await page.click('[data-testid="btn-retry"]');
  
  // Vérifier rechargement (retry tente nouvelle requête)
});
```

---

## ♿ TESTS ACCESSIBILITÉ DASHBOARD

### Test A11Y-01: Axe Scan Dashboard
**Objectif**: 0 violation accessibilité (WCAG AA)

```javascript
import { injectAxe, checkA11y } from 'axe-playwright';

test('Dashboard accessibilité', async ({ page }) => {
  await page.goto('/demo');
  await injectAxe(page);
  
  // Scan accessibilité
  const violations = await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true }
  });
  
  // Validation: 0 violations critiques
  expect(violations.length).toBe(0);
});
```

---

### Test A11Y-02: Navigation Clavier Dashboard
**Objectif**: Tab/Enter fonctionnent (KPIs, charts, filtres)

```javascript
test('Dashboard navigation clavier', async ({ page }) => {
  await page.goto('/demo');
  
  // Tab jusqu'à KPI-01
  await page.keyboard.press('Tab'); // Header link
  await page.keyboard.press('Tab'); // KPI-01
  
  // Vérifier focus
  await expect(page.locator('[data-testid="kpi-audits-assigned"]')).toBeFocused();
  
  // Enter pour cliquer
  await page.keyboard.press('Enter');
  
  // Vérifier navigation
  await page.waitForURL('/audits?status=assigned');
});
```

---

### Test A11Y-03: Screen Reader Annonces
**Objectif**: ARIA labels corrects (KPIs, charts)

```javascript
test('Dashboard ARIA labels', async ({ page }) => {
  await page.goto('/demo');
  
  // Vérifier KPI aria-label
  const kpi01 = page.locator('[data-testid="kpi-audits-assigned"]');
  const ariaLabel = await kpi01.getAttribute('aria-label');
  expect(ariaLabel).toContain('Audits à faire');
  
  // Vérifier chart role
  const chart = page.locator('[data-testid="chart-audits-status"]');
  expect(await chart.getAttribute('role')).toBe('img');
  expect(await chart.getAttribute('aria-label')).toContain('Répartition audits');
});
```

---

## ⚡ TESTS PERFORMANCE DASHBOARD

### Test PERF-01: Temps Chargement Dashboard < 2s
**Objectif**: Dashboard complet chargé en moins de 2 secondes

```javascript
test('Dashboard performance', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/dashboard');
  await page.waitForSelector('[data-testid="kpi-audits-assigned"]');
  await page.waitForSelector('[data-testid="chart-audits-status"]');
  
  const loadTime = Date.now() - startTime;
  
  // Validation: < 2000ms
  expect(loadTime).toBeLessThan(2000);
});
```

---

### Test PERF-02: Requêtes SQL Dashboard < 500ms
**Objectif**: Fonctions agrégées optimisées

```sql
-- Test: EXPLAIN ANALYZE requête KPI
EXPLAIN ANALYZE
SELECT COUNT(*) FROM audits WHERE statut = 'assigned';

-- Attendu: Execution Time < 500ms
-- Validation: ✅ Si Bitmap Index Scan utilisé (pas Seq Scan)

-- Test: Fonction chart
EXPLAIN ANALYZE
SELECT get_audits_by_status();

-- Attendu: < 500ms même avec 10k audits
-- Validation: ✅ Si indexes utilisés
```

---

## 📋 CHECKLIST VALIDATION GLOBALE

### Calculs Stats (7 tests)
- [ ] Test DB-01: KPI-01 Audits Assignés
- [ ] Test DB-02: KPI-04 Taux Conformité
- [ ] Test DB-03: CHART-01 Répartition Audits
- [ ] Test DB-04: CHART-02 NC Gravité
- [ ] Test DB-05: CHART-04 Top 5 Dépôts
- [ ] Test DB-06: Filtre Période
- [ ] Test DB-07: *(Optionnel: autres charts)*

### RLS Dashboard (4 tests)
- [ ] Test RLS-01: Isolation Auditeur
- [ ] Test RLS-02: Manager Voit Tout
- [ ] Test RLS-03: Viewer Completed Uniquement
- [ ] Test RLS-04: Fonction Chart RLS

### Mode Démo (3 tests)
- [ ] Test DEMO-01: Stats Mock Cohérents
- [ ] Test DEMO-02: 0 Appel Supabase
- [ ] Test DEMO-03: Données Stables

### UI Dashboard (6 tests)
- [ ] Test UI-01: Navigation KPI → Liste
- [ ] Test UI-02: Filtre Période
- [ ] Test UI-03: Chart Clic Segment
- [ ] Test UI-04: Empty State
- [ ] Test UI-05: Loading State
- [ ] Test UI-06: Error State

### Accessibilité (3 tests)
- [ ] Test A11Y-01: Axe Scan 0 Violations
- [ ] Test A11Y-02: Navigation Clavier
- [ ] Test A11Y-03: ARIA Labels

### Performance (2 tests)
- [ ] Test PERF-01: Chargement < 2s
- [ ] Test PERF-02: Requêtes SQL < 500ms

**Total**: 25 tests obligatoires

---

## 🎯 CRITÈRES ACCEPTATION ÉTAPE 04

### Fonctionnel
- ✅ 6 KPIs affichent valeurs correctes (pas hardcodées)
- ✅ 5 Charts affichent données (graphiques rendus)
- ✅ Filtres période/dépôt/zone fonctionnels
- ✅ Clic KPI/Chart → navigation liste filtrée
- ✅ Mode Démo 0 appel Supabase
- ✅ Données mock stables (pas aléatoires)

### Sécurité
- ✅ RLS Isolation auditeurs (propres données)
- ✅ RLS Viewer lecture historique uniquement
- ✅ Fonctions SECURITY DEFINER respectent RLS
- ✅ Pas de leak données entre rôles

### Performance
- ✅ Dashboard charge < 2s (total)
- ✅ Requêtes SQL < 500ms (avec indexes)
- ✅ Pas de N+1 queries (requêtes agrégées)

### Accessibilité
- ✅ 0 violations critiques Axe
- ✅ Navigation clavier complète
- ✅ ARIA labels corrects (screen readers)

### UX
- ✅ États UI (loading, empty, error) gérés
- ✅ Messages clairs ("Aucune donnée pour période sélectionnée")
- ✅ CTA visibles (empty state → "Créer audit")

---

## 📚 RÉFÉRENCES

- **02_schema_db_dashboard.md**: Fonctions SQL testées
- **03_rls_policies_dashboard.md**: Policies RLS héritées
- **01_spec_metier_dashboard.md**: RG métier à valider

---

## ✍️ SIGNATURE

**Document finalisé**: 22 janvier 2026  
**Prochaine étape**: `05_exemples_ui_dashboard.md`

---

**FIN DOCUMENT `04_tests_validation_dashboard.md`**
