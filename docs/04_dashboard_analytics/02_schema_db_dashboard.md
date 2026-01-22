# 🗄️ SCHÉMA BASE DE DONNÉES – ÉTAPE 04
## DASHBOARD & ANALYTICS QHSE

---

## 🆔 IDENTITÉ DU DOCUMENT

| Propriété | Valeur |
|-----------|--------|
| **Étape** | 04 – Dashboard & Analytics |
| **Date création** | 22 janvier 2026 |
| **Responsable** | GitHub Copilot (Claude Sonnet 4.5) |
| **Statut** | 📝 Conception complète – En attente validation |
| **Dépendances** | Étapes 01, 02, 03 (tables existantes utilisées) |
| **Version** | 1.0 |

---

## 🎯 DÉCISION ARCHITECTURE MAJEURE

### ⚠️ AUCUNE TABLE NOUVELLE REQUISE

**Constat**: Le Dashboard Étape 04 est une **couche de visualisation** des données existantes.

**Tables utilisées** (déjà créées étapes précédentes):
- `audits` (Étape 02)
- `reponses` (Étape 02)
- `non_conformites` (Étape 03)
- `depots` (Étape 01)
- `zones` (Étape 01)
- `profiles` (Étape 01)

**Implémentation Dashboard**:
- **Démo**: Calculs JavaScript sur `mockData.js`
- **Prod**: Requêtes SQL agrégées (COUNT, AVG, SUM) sur tables existantes

**Conséquence**: 
- ✅ Aucun ENUM à créer
- ✅ Aucune table à créer
- ✅ Aucune contrainte à ajouter
- ✅ Migration SQL sera composée UNIQUEMENT de:
  - Vues matérialisées (optionnel, performance)
  - Fonctions SQL de calcul stats
  - Indexes additionnels (performance requêtes agrégées)

---

## 📊 CALCULS STATISTIQUES REQUIS

### KPI-01: Audits Assignés (À Faire)
**Source**: Table `audits`

```sql
-- Requête SQL (Prod)
SELECT COUNT(*) AS audits_assigned
FROM audits
WHERE statut = 'assigned'
  AND is_archived = FALSE;
```

**Mock (Démo)**:
```javascript
// mockData.js
dashboardStats.auditsAssigned = mockAudits.filter(
  a => a.status === 'assigned'
).length;
```

---

### KPI-02: Audits en Cours
**Source**: Table `audits`

```sql
SELECT COUNT(*) AS audits_in_progress
FROM audits
WHERE statut = 'in_progress'
  AND is_archived = FALSE;
```

---

### KPI-03: Audits Terminés (30 derniers jours)
**Source**: Table `audits`

```sql
SELECT COUNT(*) AS audits_completed_30d
FROM audits
WHERE statut = 'completed'
  AND completed_at >= NOW() - INTERVAL '30 days';
```

**Filtre période dynamique**:
```sql
-- Fonction SQL paramétrée
CREATE OR REPLACE FUNCTION get_audits_completed(days INT)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM audits
    WHERE statut = 'completed'
      AND completed_at >= NOW() - INTERVAL '1 day' * days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### KPI-04: Taux de Conformité Global
**Sources**: Tables `reponses` + `audits`

**Logique**:
- Réponse conforme si:
  - `yes_no`: value = 'yes'
  - `ok_nok_na`: value = 'ok'
  - `score_1_5`: value >= 3
  - `text`: toujours conforme (ignoré calcul)

```sql
-- Fonction calcul conformité
CREATE OR REPLACE FUNCTION calculate_conformity_rate(period_days INT)
RETURNS NUMERIC AS $$
DECLARE
  total_responses INT;
  conformes INT;
BEGIN
  -- Compter réponses conformes
  SELECT 
    COUNT(*) FILTER (
      WHERE 
        (question_type = 'yes_no' AND value->>'answer' = 'yes')
        OR (question_type = 'ok_nok_na' AND value->>'answer' = 'ok')
        OR (question_type = 'score_1_5' AND (value->>'score')::INT >= 3)
    ),
    COUNT(*) FILTER (
      WHERE question_type IN ('yes_no', 'ok_nok_na', 'score_1_5')
    )
  INTO conformes, total_responses
  FROM reponses r
  JOIN audits a ON r.audit_id = a.id
  WHERE a.completed_at >= NOW() - INTERVAL '1 day' * period_days
    AND a.statut = 'completed';

  -- Éviter division par zéro
  IF total_responses = 0 THEN
    RETURN NULL;
  END IF;

  RETURN ROUND((conformes::NUMERIC / total_responses) * 100, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Mock (Démo)**:
```javascript
function calculateConformityRate(responses) {
  const evaluable = responses.filter(r => 
    ['yes_no', 'ok_nok_na', 'score_1_5'].includes(r.type)
  );
  
  if (evaluable.length === 0) return null;
  
  const conformes = evaluable.filter(r => {
    if (r.type === 'yes_no') return r.value === 'yes';
    if (r.type === 'ok_nok_na') return r.value === 'ok';
    if (r.type === 'score_1_5') return r.value >= 3;
    return false;
  });
  
  return Math.round((conformes.length / evaluable.length) * 100);
}
```

---

### KPI-05: Non-Conformités Ouvertes
**Source**: Table `non_conformites`

```sql
SELECT COUNT(*) AS nc_ouvertes
FROM non_conformites
WHERE statut IN ('ouverte', 'en_traitement')
  AND is_archived = FALSE;
```

---

### KPI-06: NC Échues
**Source**: Table `non_conformites` (colonne GENERATED `is_overdue`)

```sql
SELECT COUNT(*) AS nc_echues
FROM non_conformites
WHERE is_overdue = TRUE
  AND statut NOT IN ('resolue', 'validee');
```

---

## 📈 REQUÊTES GRAPHIQUES (CHARTS)

### CHART-01: Répartition Audits par Statut
**Source**: Table `audits`

```sql
-- Fonction retournant JSON
CREATE OR REPLACE FUNCTION get_audits_by_status(
  filter_depot_id UUID DEFAULT NULL,
  filter_zone_id UUID DEFAULT NULL,
  period_days INT DEFAULT 30
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'statut', statut,
        'count', count,
        'label', CASE statut
          WHEN 'assigned' THEN 'À faire'
          WHEN 'in_progress' THEN 'En cours'
          WHEN 'completed' THEN 'Terminés'
          WHEN 'archived' THEN 'Archivés'
        END
      )
    )
    FROM (
      SELECT 
        statut,
        COUNT(*) as count
      FROM audits
      WHERE 
        (filter_depot_id IS NULL OR depot_id = filter_depot_id)
        AND (filter_zone_id IS NULL OR zone_id = filter_zone_id)
        AND created_at >= NOW() - INTERVAL '1 day' * period_days
      GROUP BY statut
      ORDER BY 
        CASE statut
          WHEN 'assigned' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'completed' THEN 3
          WHEN 'archived' THEN 4
        END
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### CHART-02: NC par Gravité
**Source**: Table `non_conformites`

```sql
CREATE OR REPLACE FUNCTION get_nc_by_gravity(
  filter_depot_id UUID DEFAULT NULL,
  period_days INT DEFAULT 30
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'gravite', gravite,
        'count', count,
        'color', CASE gravite
          WHEN 'critique' THEN '#ef4444'
          WHEN 'haute' THEN '#f97316'
          WHEN 'moyenne' THEN '#eab308'
          WHEN 'faible' THEN '#22c55e'
        END
      )
    )
    FROM (
      SELECT 
        gravite,
        COUNT(*) as count
      FROM non_conformites nc
      WHERE 
        (filter_depot_id IS NULL OR depot_id = filter_depot_id)
        AND created_at >= NOW() - INTERVAL '1 day' * period_days
        AND is_archived = FALSE
      GROUP BY gravite
      ORDER BY 
        CASE gravite
          WHEN 'critique' THEN 1
          WHEN 'haute' THEN 2
          WHEN 'moyenne' THEN 3
          WHEN 'faible' THEN 4
        END
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### CHART-03: Historique Audits Terminés (6 mois)
**Source**: Table `audits`

```sql
CREATE OR REPLACE FUNCTION get_audits_history_6months()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'mois', mois,
        'count', count
      ) ORDER BY date
    )
    FROM (
      SELECT 
        TO_CHAR(completed_at, 'Mon YYYY') as mois,
        DATE_TRUNC('month', completed_at) as date,
        COUNT(*) as count
      FROM audits
      WHERE 
        statut = 'completed'
        AND completed_at >= NOW() - INTERVAL '6 months'
      GROUP BY mois, date
      ORDER BY date
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### CHART-04: Top 5 Dépôts (Taux Conformité)
**Sources**: `depots` + `audits` + `reponses`

```sql
CREATE OR REPLACE FUNCTION get_top5_depots_conformity(period_days INT DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'depotId', depot_id,
        'depotCode', depot_code,
        'depotName', depot_name,
        'taux', taux
      ) ORDER BY taux DESC
    )
    FROM (
      SELECT 
        d.id as depot_id,
        d.code as depot_code,
        d.name as depot_name,
        ROUND(
          (COUNT(*) FILTER (
            WHERE 
              (q.question_type = 'yes_no' AND r.value->>'answer' = 'yes')
              OR (q.question_type = 'ok_nok_na' AND r.value->>'answer' = 'ok')
              OR (q.question_type = 'score_1_5' AND (r.value->>'score')::INT >= 3)
          )::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
          1
        ) as taux
      FROM depots d
      JOIN audits a ON a.depot_id = d.id
      JOIN reponses r ON r.audit_id = a.id
      JOIN questions q ON q.id = r.question_id
      WHERE 
        a.statut = 'completed'
        AND a.completed_at >= NOW() - INTERVAL '1 day' * period_days
        AND q.question_type IN ('yes_no', 'ok_nok_na', 'score_1_5')
      GROUP BY d.id, d.code, d.name
      ORDER BY taux DESC
      LIMIT 5
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### CHART-05: Top 5 Zones avec NC Critiques
**Sources**: `zones` + `non_conformites`

```sql
CREATE OR REPLACE FUNCTION get_top5_zones_critical_nc(period_days INT DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'zoneId', zone_id,
        'zoneName', zone_name,
        'depotCode', depot_code,
        'ncCritiques', nc_count
      ) ORDER BY nc_count DESC
    )
    FROM (
      SELECT 
        z.id as zone_id,
        z.name as zone_name,
        d.code as depot_code,
        COUNT(*) as nc_count
      FROM zones z
      JOIN depots d ON d.id = z.depot_id
      JOIN non_conformites nc ON nc.zone_id = z.id
      WHERE 
        nc.gravite = 'critique'
        AND nc.created_at >= NOW() - INTERVAL '1 day' * period_days
        AND nc.is_archived = FALSE
      GROUP BY z.id, z.name, d.code
      ORDER BY nc_count DESC
      LIMIT 5
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🚀 OPTIMISATIONS PERFORMANCE

### Indexes Recommandés (Requêtes Agrégées)

**Étapes précédentes déjà créées**:
- `audits.statut` (index Étape 02)
- `audits.completed_at` (index Étape 02)
- `non_conformites.gravite` (index Étape 03)
- `non_conformites.is_overdue` (index Étape 03)

**Nouveaux indexes Étape 04**:

```sql
-- Index composite audits (statut + période)
CREATE INDEX IF NOT EXISTS idx_audits_status_completed_at
ON audits(statut, completed_at)
WHERE statut = 'completed';

-- Index composite NC (gravité + période)
CREATE INDEX IF NOT EXISTS idx_nc_gravity_created_at
ON non_conformites(gravite, created_at)
WHERE is_archived = FALSE;

-- Index reponses (calcul conformité)
CREATE INDEX IF NOT EXISTS idx_reponses_audit_question
ON reponses(audit_id, question_id);
```

**Justification**:
- Requêtes dashboard fréquentes (chaque visite page)
- Filtres combinés (statut + date)
- Calculs agrégés (COUNT, AVG)

---

## 🔍 VUES MATÉRIALISÉES (OPTIONNEL - PERFORMANCE)

### Vue Matérialisée: Dashboard Stats Cache

**⚠️ DÉCISION**: Vues matérialisées **NON implémentées** Étape 04

**Raison**:
- Complexité refresh (CRON, triggers)
- Données temps réel prioritaires (specs RG-Dashboard-01)
- Optimisation prématurée (volumétrie MVP faible)

**Alternative**:
- Requêtes SQL optimisées avec indexes
- Cache applicatif (Redis) si besoin futur

**Note décisions_log**: D4-05 (vues matérialisées différées)

---

## 🔐 SÉCURITÉ RLS (Filtres Dashboard)

### Pas de Nouvelles Policies RLS

**Constat**: Les policies RLS Étapes 01-03 suffisent.

**Fonctions Dashboard utilisent RLS existants**:
- `audits`: policies Étape 02 (auditeurs voient propres audits)
- `non_conformites`: policies Étape 03 (isolation auditeurs)
- `depots`, `zones`: policies Étape 01 (visibilité selon rôle)

**Fonctions SQL Dashboard**:
- Marquées `SECURITY DEFINER` (exécution avec droits fonction)
- Mais données retournées **FILTRÉES par RLS** au moment SELECT

**Validation**:
```sql
-- Test isolation auditeur
SET LOCAL ROLE qh_auditor_test;
SET LOCAL request.jwt.claim.sub = 'uuid-auditeur-123';

SELECT get_audits_by_status();
-- Retourne UNIQUEMENT audits assignés à uuid-auditeur-123
```

---

## 📦 DONNÉES MOCKDATA (Extension)

### Objet `dashboardStats` à Ajouter

**Fichier**: `src/data/mockData.js`

```javascript
// Calcul dynamique depuis mockAudits, mockNonConformities
function calculateDashboardStats() {
  // KPIs
  const auditsAssigned = mockAudits.filter(a => a.status === 'assigned').length;
  const auditsInProgress = mockAudits.filter(a => a.status === 'in_progress').length;
  const auditsCompleted30d = mockAudits.filter(a => 
    a.status === 'completed' && 
    isWithinDays(a.completed_at, 30)
  ).length;

  // Calcul conformité
  const responses = mockResponses.filter(r => {
    const audit = mockAudits.find(a => a.id === r.audit_id);
    return audit && audit.status === 'completed' && isWithinDays(audit.completed_at, 30);
  });
  
  const evaluableResponses = responses.filter(r => 
    ['yes_no', 'ok_nok_na', 'score_1_5'].includes(r.type)
  );
  
  const conformes = evaluableResponses.filter(r => {
    if (r.type === 'yes_no') return r.value === 'yes';
    if (r.type === 'ok_nok_na') return r.value === 'ok';
    if (r.type === 'score_1_5') return r.value >= 3;
    return false;
  });
  
  const tauxConformite = evaluableResponses.length > 0
    ? Math.round((conformes.length / evaluableResponses.length) * 100)
    : null;

  // NC
  const ncOuvertes = mockNonConformities.filter(nc => 
    ['ouverte', 'en_traitement'].includes(nc.statut)
  ).length;
  
  const ncEchues = mockNonConformities.filter(nc => 
    nc.is_overdue && !['resolue', 'validee'].includes(nc.statut)
  ).length;

  // Charts data
  const auditsParStatut = [
    { statut: 'assigned', count: auditsAssigned, label: 'À faire' },
    { statut: 'in_progress', count: auditsInProgress, label: 'En cours' },
    { statut: 'completed', count: auditsCompleted30d, label: 'Terminés' },
    { statut: 'archived', count: mockAudits.filter(a => a.status === 'archived').length, label: 'Archivés' }
  ];

  const ncParGravite = [
    { gravite: 'critique', count: mockNonConformities.filter(nc => nc.gravite === 'critique').length, color: '#ef4444' },
    { gravite: 'haute', count: mockNonConformities.filter(nc => nc.gravite === 'haute').length, color: '#f97316' },
    { gravite: 'moyenne', count: mockNonConformities.filter(nc => nc.gravite === 'moyenne').length, color: '#eab308' },
    { gravite: 'faible', count: mockNonConformities.filter(nc => nc.gravite === 'faible').length, color: '#22c55e' }
  ];

  // Historique 6 mois (mock simplifié)
  const auditsTermines6mois = [
    { mois: 'Sep 2025', count: 8 },
    { mois: 'Oct 2025', count: 10 },
    { mois: 'Nov 2025', count: 9 },
    { mois: 'Dec 2025', count: 11 },
    { mois: 'Jan 2026', count: 12 },
    { mois: 'Fév 2026', count: 0 }
  ];

  // Top 5 dépôts (mock simplifié, 1 seul dépôt actuellement)
  const top5DepotsConformite = [
    { depotId: 'depot-001', depotCode: 'DEP001', depotName: 'Dépôt Principal Lyon', taux: 87 }
  ];

  // Top 5 zones NC
  const top5ZonesNC = [
    { zoneId: 'zone-001', zoneName: 'Entrepôt Froid', depotCode: 'DEP001', ncCritiques: 1 },
    { zoneId: 'zone-002', zoneName: 'Quai de Chargement', depotCode: 'DEP001', ncCritiques: 0 }
  ];

  return {
    // KPIs
    auditsAssigned,
    auditsInProgress,
    auditsCompleted30d,
    tauxConformiteGlobal: tauxConformite,
    ncOuvertes,
    ncEchues,
    
    // Charts
    auditsParStatut,
    ncParGravite,
    auditsTermines6mois,
    top5DepotsConformite,
    top5ZonesNC
  };
}

// Helper
function isWithinDays(dateString, days) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / (1000 * 60 * 60 * 24);
  return diff <= days;
}

// Export
export const dashboardStats = calculateDashboardStats();
```

---

## 📋 RÉCAPITULATIF TECHNIQUE

### Tables Utilisées (Existantes)
| Table | Étape Création | Usage Dashboard |
|-------|----------------|-----------------|
| `audits` | 02 | KPI-01, 02, 03 + CHART-01, 03, 04 |
| `reponses` | 02 | KPI-04 (conformité) + CHART-04 |
| `non_conformites` | 03 | KPI-05, 06 + CHART-02, 05 |
| `depots` | 01 | Filtres + CHART-04 |
| `zones` | 01 | Filtres + CHART-05 |
| `profiles` | 01 | Filtres auditeur (admin) |
| `questions` | 02 | Calcul conformité (type question) |

### Fonctions SQL Nouvelles (7 fonctions)
1. `get_audits_completed(days INT)` → INT
2. `calculate_conformity_rate(period_days INT)` → NUMERIC
3. `get_audits_by_status(...)` → JSON
4. `get_nc_by_gravity(...)` → JSON
5. `get_audits_history_6months()` → JSON
6. `get_top5_depots_conformity(...)` → JSON
7. `get_top5_zones_critical_nc(...)` → JSON

### Indexes Nouveaux (3 indexes)
1. `idx_audits_status_completed_at` (composite)
2. `idx_nc_gravity_created_at` (composite)
3. `idx_reponses_audit_question` (composite)

### Policies RLS Nouvelles
❌ Aucune (réutilisation Étapes 01-03)

### MockData Extensions
✅ Objet `dashboardStats` calculé dynamiquement

---

## ✅ VALIDATION TECHNIQUE

### Checklist Schéma DB
- [x] Aucune table nouvelle (architecture validée)
- [x] 7 fonctions SQL définies (calculs stats)
- [x] 3 indexes performance (requêtes agrégées)
- [x] RLS existants suffisants (pas nouvelles policies)
- [x] MockData structure définie (`dashboardStats`)
- [x] Calculs conformité documentés (logique métier)
- [x] Filtres période/dépôt/zone gérés (paramètres fonctions)
- [x] Isolation auditeurs préservée (RLS hérité)

### Volumétrie Estimée (5 ans)
| Métrique | Volume | Impact Dashboard |
|----------|--------|------------------|
| Audits | ~10 000 | Requêtes agrégées optimisées (indexes) |
| Réponses | ~200 000 | Calcul conformité (index composite) |
| NC | ~5 000 | Charts gravité (index composite) |
| Requêtes dashboard | ~1000/jour | Cache applicatif futur si besoin |

**Conclusion**: Schéma actuel suffit pour MVP, optimisations futures possibles (vues mat, Redis).

---

## 📚 RÉFÉRENCES

- **Étape 01**: Tables `profiles`, `depots`, `zones`
- **Étape 02**: Tables `audits`, `reponses`, `questions`
- **Étape 03**: Tables `non_conformites`
- **README.md**: Sections 20-25 (Dashboard specs)
- **01_spec_metier_dashboard.md**: KPIs, Charts, RG métier

---

## ✍️ SIGNATURE

**Document finalisé**: 22 janvier 2026  
**Prochaine étape**: `03_rls_policies_dashboard.md`

---

**FIN DOCUMENT `02_schema_db_dashboard.md`**
