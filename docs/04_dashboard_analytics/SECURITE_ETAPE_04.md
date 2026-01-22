# 🔒 RAPPORT SÉCURITÉ – ÉTAPE 04 DASHBOARD
## Correction Faille Sécurité RLS/SECURITY DEFINER

---

## 🚨 PROBLÈME IDENTIFIÉ

**Faille critique initiale** (version 07_migration_finale_dashboard.sql avant correction):

| Problème | Impact | Gravité |
|----------|--------|---------|
| Toutes fonctions en `SECURITY DEFINER` | Bypass potentiel RLS | 🔴 CRITIQUE |
| Pas de `search_path` verrouillé | Injection schema poisoning | 🔴 CRITIQUE |
| Fonctions Top5 globales accessibles à tous | Auditeurs peuvent appeler via RPC → données globales | 🔴 CRITIQUE |
| "Masqué UI" comme sécurité | UI n'est PAS une protection DB | 🔴 CRITIQUE |
| `GRANT EXECUTE TO authenticated` uniforme | Pas de granularité d'accès | 🟠 MAJEUR |

**Vecteur d'attaque**:
```javascript
// Auditeur appelle directement via RPC (contourne UI):
const { data } = await supabase.rpc('get_top5_depots_conformity', { period_days: 30 });
// ❌ AVANT: Retournait données globales (tous dépôts)
// ✅ APRÈS: RAISE EXCEPTION 'Accès refusé: fonction réservée aux administrateurs'
```

---

## ✅ SOLUTION IMPLÉMENTÉE

**OPTION HYBRIDE (meilleure sécurité)**:
- **Fonctions standards** (KPIs personnels, Charts filtrants): `SECURITY INVOKER` → RLS naturelle
- **Fonctions globales** (Top5 dépôts/zones): `SECURITY DEFINER` + contrôle de rôle explicite

---

## 📋 MODIFICATIONS APPLIQUÉES

### 1. Fonctions SECURITY INVOKER (5 fonctions)

| Fonction | Changements | Isolation Auditeurs |
|----------|-------------|---------------------|
| `get_audits_completed()` | `SECURITY DEFINER` → `SECURITY INVOKER` + `STABLE` + `SET search_path = public` | ✅ Propres audits uniquement |
| `calculate_conformity_rate()` | `SECURITY DEFINER` → `SECURITY INVOKER` + `STABLE` + `SET search_path = public` | ✅ Conformité propres audits |
| `get_audits_by_status()` | `SECURITY DEFINER` → `SECURITY INVOKER` + `STABLE` + `SET search_path = public` | ✅ Répartition propres audits |
| `get_nc_by_gravity()` | `SECURITY DEFINER` → `SECURITY INVOKER` + `STABLE` + `SET search_path = public` | ✅ NC propres audits |
| `get_audits_history_6months()` | `SECURITY DEFINER` → `SECURITY INVOKER` + `STABLE` + `SET search_path = public` | ✅ Historique personnel |

**Mécanisme**:
```sql
CREATE OR REPLACE FUNCTION get_audits_completed(period_days INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER    -- ⚠️ RLS appliqué avec droits appelant
STABLE              -- Optimisation: pas d'effet de bord
SET search_path = public  -- Sécurité: verrouille schema
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM audits  -- RLS policy audits_select_auditor appliquée automatiquement
    WHERE statut = 'completed'
      AND completed_at >= NOW() - INTERVAL '1 day' * period_days
  );
END;
$$;
```

**Résultat**: 
- Auditeur A appelle `get_audits_completed(30)` → compte uniquement ses audits (RLS filter `assigned_to = auth.uid()`)
- Manager appelle même fonction → compte tous audits (RLS policy différente)

---

### 2. Fonctions SECURITY DEFINER + Contrôle Rôle (2 fonctions)

| Fonction | Changements | Protection Accès |
|----------|-------------|------------------|
| `get_top5_depots_conformity()` | Ajout `DECLARE user_role`, `SELECT get_current_user_role()`, `IF role NOT IN ('admin_dev','qhse_manager') THEN RAISE EXCEPTION` | ✅ RAISE EXCEPTION si auditeur/viewer |
| `get_top5_zones_critical_nc()` | Ajout `DECLARE user_role`, `SELECT get_current_user_role()`, `IF role NOT IN ('admin_dev','qhse_manager') THEN RAISE EXCEPTION` | ✅ RAISE EXCEPTION si auditeur/viewer |

**Mécanisme**:
```sql
CREATE OR REPLACE FUNCTION get_top5_depots_conformity(period_days INT DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER      -- ⚠️ Requiert bypass RLS (vue globale organisation)
STABLE
SET search_path = public  -- Sécurité: verrouille schema
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 🔒 CONTRÔLE D'ACCÈS EXPLICITE
  SELECT get_current_user_role() INTO user_role;
  
  IF user_role NOT IN ('admin_dev', 'qhse_manager') THEN
    RAISE EXCEPTION 'Accès refusé: fonction réservée aux administrateurs et managers (rôle actuel: %)', user_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Suite fonction (calcul Top 5)...
END;
$$;
```

**Résultat**:
- Auditeur appelle `get_top5_depots_conformity(30)` → **ERREUR** `Accès refusé: fonction réservée aux administrateurs`
- Manager appelle → **SUCCÈS** retourne Top 5 global

---

### 3. Grants Documentés

```sql
-- Fonctions SECURITY INVOKER: tous rôles (RLS filtre automatiquement)
GRANT EXECUTE ON FUNCTION get_audits_completed(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_conformity_rate(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audits_by_status(UUID, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nc_by_gravity(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audits_history_6months() TO authenticated;

-- Fonctions Top5: tous rôles MAIS contrôle dans fonction (RAISE EXCEPTION)
GRANT EXECUTE ON FUNCTION get_top5_depots_conformity(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top5_zones_critical_nc(INT) TO authenticated;
```

**Note**: GRANT large car protection faite DANS la fonction (RAISE EXCEPTION). Alternative: REVOKE pour auditeurs (mais moins flexible).

---

## 🔐 GARANTIES SÉCURITÉ

### Isolation Auditeurs (RLS)

| Scénario | Avant Correction | Après Correction |
|----------|------------------|------------------|
| Auditeur A appelle `get_audits_completed()` | ⚠️ Compte TOUS audits (SECURITY DEFINER) | ✅ Compte propres audits (RLS) |
| Auditeur A appelle `get_audits_by_status()` | ⚠️ Voit TOUS statuts | ✅ Voit propres statuts |
| Auditeur A appelle `get_nc_by_gravity()` | ⚠️ Voit TOUTES NC | ✅ Voit NC propres audits |
| Auditeur A appelle `get_top5_depots_conformity()` | ❌ Retourne Top 5 global | ✅ **RAISE EXCEPTION** (accès refusé) |
| Auditeur A appelle `get_top5_zones_critical_nc()` | ❌ Retourne Top 5 global | ✅ **RAISE EXCEPTION** (accès refusé) |

### Protection Schema Poisoning

Toutes fonctions: `SET search_path = public` → impossible d'injecter fonction malveillante dans autre schema.

---

## 📊 MATRICE FINALE ACCÈS

| Fonction | admin_dev | qhse_manager | qh_auditor | safety_auditor | viewer |
|----------|-----------|--------------|------------|----------------|--------|
| `get_audits_completed()` | ✅ Global | ✅ Global | ✅ Personnel | ✅ Personnel | ✅ Completed seulement |
| `calculate_conformity_rate()` | ✅ Global | ✅ Global | ✅ Personnel | ✅ Personnel | ✅ Completed seulement |
| `get_audits_by_status()` | ✅ Global | ✅ Global | ✅ Personnel | ✅ Personnel | ✅ Completed seulement |
| `get_nc_by_gravity()` | ✅ Global | ✅ Global | ✅ Propres NC | ✅ Propres NC | ✅ NC completed audits |
| `get_audits_history_6months()` | ✅ Global | ✅ Global | ✅ Personnel | ✅ Personnel | ✅ Completed seulement |
| `get_top5_depots_conformity()` | ✅ Global | ✅ Global | ❌ **EXCEPTION** | ❌ **EXCEPTION** | ❌ **EXCEPTION** |
| `get_top5_zones_critical_nc()` | ✅ Global | ✅ Global | ❌ **EXCEPTION** | ❌ **EXCEPTION** | ❌ **EXCEPTION** |

**Légende**:
- ✅ Global: accès toutes données (admin/manager)
- ✅ Personnel: filtre RLS automatique (auditeurs/viewers)
- ❌ EXCEPTION: appel refusé avec erreur SQL (RAISE EXCEPTION)

---

## ✅ TESTS SÉCURITÉ REQUIS

### Test 1: Isolation Auditeur (SECURITY INVOKER)
```sql
-- En tant qu'auditeur A (user_id = '123...'):
SELECT get_audits_completed(30);
-- Attendu: compte uniquement audits assigned_to = '123...'
-- Vérifier: résultat != total global admin
```

### Test 2: Contrôle Rôle Top5 (RAISE EXCEPTION)
```sql
-- En tant qu'auditeur:
SELECT get_top5_depots_conformity(30);
-- Attendu: ERROR: Accès refusé: fonction réservée aux administrateurs et managers
-- Code erreur: insufficient_privilege
```

### Test 3: Admin Accès Global
```sql
-- En tant qu'admin_dev:
SELECT get_top5_depots_conformity(30);
-- Attendu: JSON Top 5 dépôts (tous dépôts organisation)
-- Vérifier: pas d'erreur, données complètes
```

### Test 4: Schema Poisoning (search_path)
```sql
-- Créer schema malveillant:
CREATE SCHEMA malicious;
CREATE FUNCTION malicious.get_current_user_role() RETURNS TEXT AS $$ SELECT 'admin_dev'; $$ LANGUAGE SQL;

-- Tenter appel fonction Top5 (auditeur):
SET search_path = malicious, public;
SELECT get_top5_depots_conformity(30);
-- Attendu: TOUJOURS ERREUR (search_path forcé à public dans fonction)
```

---

## 📝 DÉCISION ARCHITECTURE

**Option choisie**: **HYBRIDE**  
- SECURITY INVOKER pour fonctions filtrées (RLS naturelle, simple)  
- SECURITY DEFINER + contrôle rôle pour fonctions globales (nécessaire, sécurisé)

**Alternatives rejetées**:
1. ❌ SECURITY DEFINER partout + RLS forcé (`SET row_security = on`): complexe, risque erreur config
2. ❌ REVOKE EXECUTE auditeurs sur Top5: moins flexible, maintenance grants complexe
3. ❌ Vue UI uniquement: **JAMAIS une sécurité** (RPC contourne UI)

**Traçabilité**: Décision D4-02 mise à jour (était "SECURITY DEFINER", maintenant "HYBRIDE INVOKER/DEFINER").

---

## ⚠️ ACTIONS POST-MIGRATION

1. **Tester 4 scénarios** ci-dessus après migration appliquée
2. **Monitorer logs** Supabase: chercher erreurs `insufficient_privilege` (auditeurs tentant Top5)
3. **Vérifier EXPLAIN ANALYZE**: `search_path = public` confirmé
4. **Documenter UI**: bandeau "Fonction admin/manager uniquement" si erreur Top5

---

## ✍️ SIGNATURE SÉCURITÉ

**Date correction**: 22 janvier 2026  
**Responsable**: GitHub Copilot (Claude Sonnet 4.5)  
**Fichiers modifiés**:
- `/docs/04_dashboard_analytics/07_migration_finale_dashboard.sql` (7 fonctions + grants + commentaires)
- `/docs/04_dashboard_analytics/SECURITE_ETAPE_04.md` (ce rapport)

**Statut**: ✅ **SÉCURITÉ RENFORCÉE – PRÊTE VALIDATION**  
**Migration SQL**: ⚠️ **NON EXÉCUTÉE** (en attente validation humaine + tests staging)

---

**FIN RAPPORT SÉCURITÉ**
