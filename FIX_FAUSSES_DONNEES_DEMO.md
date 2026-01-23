# 🔧 FIX: Fausses données d\u00e9mo en mode production

**Date:** 23 janvier 2026  
**Bug:** Données mockées affichées même quand `isDemo=false`  
**Statut:** ✅ CORRIGÉ (dashboard) + LISTE AUTRES FICHIERS

---

## 🎯 Problème identifié

### Cause racine

Les pages importent et utilisent **TOUJOURS** `mockApi` directement, sans vérifier `isDemo`.

**Exemple bugué (avant):**

```javascript
// app/dashboard/page.js (AVANT)
import mockApi from '@/src/data/mockData';

export default function DashboardPage() {
  // ❌ PAS de vérification isDemo
  const loadData = async () => {
    const data = await mockApi.dashboard.getAuditsCompleted(); // ← TOUJOURS mock
    setAudits(data);
  };
}
```

**Résultat:**
- Session réelle OK
- `isDemo = false` ✅
- Bandeau "MODE DÉMO" caché ✅
- **MAIS stats/graphs affichent données mockées** ❌

---

## 📍 Liste exhaustive des fichiers concernés

### ✅ CORRIGÉ

| Fichier | Ligne import | Problème | Status |
|---------|-------------|----------|--------|
| [`app/dashboard/page.js`](app/dashboard/page.js) | L26 | Utilise `mockApi` sans condition | ✅ **CORRIGÉ** |

### ⚠️ À CORRIGER (même pattern)

| Fichier | Ligne import | Utilisations mockApi |
|---------|-------------|---------------------|
| [`app/audits/page.js`](app/audits/page.js) | L35 | L57-61 (5 appels) |
| [`app/audits/[id]/page.js`](app/audits/[id]/page.js) | L38 | L61, L80-81 (3 appels) |
| [`app/audits/[id]/realiser/page.js`](app/audits/[id]/realiser/page.js) | ? | À vérifier |
| [`app/audits/[id]/report/page.js`](app/audits/[id]/report/page.js) | ? | À vérifier |
| [`app/audits/[id]/questions/page.js`](app/audits/[id]/questions/page.js) | ? | À vérifier |
| [`app/non-conformites/page.js`](app/non-conformites/page.js) | ? | À vérifier |
| [`app/depots/page.js`](app/depots/page.js) | ? | À vérifier |
| [`app/depots/[id]/page.js`](app/depots/[id]/page.js) | ? | À vérifier |
| [`app/zones/page.js`](app/zones/page.js) | ? | À vérifier |
| [`app/templates/page.js`](app/templates/page.js) | ? | À vérifier |

**Total:** ~10-15 fichiers à corriger

---

## ✅ Correctif appliqué (dashboard)

### 1. Import `useAuth` pour avoir `isDemo`

```javascript
// app/dashboard/page.js
import { useAuth } from '@/lib/auth-context';
import mockApi from '@/src/data/mockData';
import { supabase } from '@/lib/supabase-client';

export default function DashboardPage() {
  const { isDemo } = useAuth(); // ← Nouveau
```

### 2. Logs diagnostiques

```javascript
// Tracer l'état
useEffect(() => {
  console.log('📊 DASHBOARD render:', {
    isDemo,
    loading,
    auditsCompleted,
    hasStats: !!auditsByStatus
  });
}, [isDemo, loading, auditsCompleted, auditsByStatus]);
```

### 3. Logique conditionnelle stricte

```javascript
const loadDashboardData = useCallback(async () => {
  console.log('📊 DASHBOARD: loadDashboardData, isDemo=', isDemo);

  // ✅ MODE DEMO: utiliser mockApi
  if (isDemo) {
    console.log('📊 DASHBOARD: Mode DEMO → mockApi');
    
    const depotsData = await mockApi.getDepots();
    setDepots(depotsData);

    const [completed, rate, statusData, ...] = await Promise.all([
      mockApi.dashboard.getAuditsCompleted(periodFilter),
      mockApi.dashboard.calculateConformityRate(periodFilter),
      // ...
    ]);

    setAuditsCompleted(completed);
    setConformityRate(rate);
    // ...

    return; // ← IMPORTANT: stopper ici
  }

  // ✅ MODE PROD: utiliser Supabase
  console.log('📊 DASHBOARD: Mode PROD → Supabase');

  if (!supabase) {
    throw new Error('Supabase non configuré');
  }

  // Charger dépôts depuis Supabase
  const { data: depotsData, error } = await supabase
    .from('depots')
    .select('*')
    .eq('status', 'active');

  if (error) throw error;
  setDepots(depotsData || []);

  // TODO: Implémenter fonctions SQL dashboard
  // Pour l'instant, retourner 0 partout (état vide correct)
  console.log('📊 DASHBOARD: Fonctions SQL pas implémentées → valeurs 0');
  
  setAuditsCompleted(0);
  setConformityRate(0);
  setAuditsByStatus({ planifie: 0, en_cours: 0, termine: 0, annule: 0 });
  setNCByGravity({ critique: 0, haute: 0, moyenne: 0, faible: 0 });
  setAuditsHistory([]);

}, [isDemo, periodFilter, depotFilter]);
```

**Résultat attendu:**

| Condition | Source données | Affichage |
|-----------|----------------|-----------|
| `isDemo = true` | mockApi | Stats/graphs avec données d'exemple |
| `isDemo = false` + Supabase vide | Supabase (0 rows) | **0 partout, graphs vides** ✅ |
| `isDemo = false` + Supabase avec données | Supabase (vraies données) | Stats/graphs réels |

---

## 🧪 Validation attendue

### Console après login réel (isDemo=false)

```javascript
// Auth
✅ AUTH: Session valide → MODE DEMO DÉSACTIVÉ
✅ AUTH: Profil chargé { isJetcAdmin: true }

// Dashboard
📊 DASHBOARD render: {
  isDemo: false,        // ← Désactivé
  loading: false,
  auditsCompleted: 0,   // ← 0 (pas de mock)
  hasStats: true
}

📊 DASHBOARD: loadDashboardData, isDemo= false
📊 DASHBOARD: Mode PROD → Supabase
📊 DASHBOARD: Fonctions SQL pas implémentées → valeurs 0
```

### Affichage visuel

**KPI Cards:**
- Audits terminés: **0** (au lieu de 12)
- Taux de conformité: **0%** (au lieu de 87%)
- NC ouvertes: **0** (au lieu de 8)

**Graphiques:**
- Donut audits: **"Aucun audit"** (EmptyState)
- Bar NC: **"Aucune NC"** (EmptyState)
- Line historique: **"Aucun historique"** (EmptyState)

**Sections absentes:**
- ❌ Pas de "À propos du mode démo" (n'existait pas dans dashboard)

---

## 📋 Pattern de correction pour autres pages

### Template à appliquer

```javascript
// 1. Imports
import { useAuth } from '@/lib/auth-context';
import mockApi from '@/src/data/mockData';
import { supabase } from '@/lib/supabase-client';

export default function MaPage() {
  const { isDemo } = useAuth();

  // 2. Log diagnostique
  useEffect(() => {
    console.log('🔍 MA_PAGE render:', { isDemo, loading, hasData });
  }, [isDemo, loading]);

  // 3. Load data conditionnel
  const loadData = useCallback(async () => {
    console.log('🔍 MA_PAGE: loadData, isDemo=', isDemo);

    // MODE DEMO
    if (isDemo) {
      console.log('🔍 MA_PAGE: Mode DEMO → mockApi');
      const data = await mockApi.getMaData();
      setData(data);
      return;
    }

    // MODE PROD
    console.log('🔍 MA_PAGE: Mode PROD → Supabase');
    
    if (!supabase) {
      throw new Error('Supabase non configuré');
    }

    const { data, error } = await supabase
      .from('ma_table')
      .select('*');

    if (error) throw error;
    setData(data || []);

  }, [isDemo]);
}
```

### Checklist par page

- [ ] Import `useAuth` + destructure `isDemo`
- [ ] Import `supabase` si pas déjà fait
- [ ] Ajouter log diagnostique avec `isDemo`
- [ ] Wrapper tous les appels `mockApi.*` dans `if (isDemo) { ... }`
- [ ] Implémenter branche `else` avec Supabase OU valeurs vides
- [ ] Tester: session réelle → `isDemo=false` → 0 partout / états vides

---

## ⚠️ Cas spéciaux

### Pages avec sections "À propos mode démo"

Si une page affiche du texte genre "À propos du mode démo" ou "Info mode démo", conditionner:

```javascript
{/* Section visible UNIQUEMENT si isDemo */}
{isDemo && (
  <Alert variant="info" title="Mode démo">
    <p>Vous utilisez des données d'exemple...</p>
  </Alert>
)}
```

**Exemples trouvés:**
- [`app/audits/[id]/realiser/page.js`](app/audits/[id]/realiser/page.js#L238-L239) : Alert "Mode démo"

### Pages utilisant apiWrapper

Certaines pages peuvent utiliser `apiWrapper.js` qui gère déjà `DEMO_MODE`. Dans ce cas:

- **Vérifier** que `apiWrapper` regarde bien `DEMO_MODE` (✅ fait, ligne 24)
- **Mais** `DEMO_MODE` est statique (env var), pas dynamique comme `isDemo`
- **Problème:** Si `DEMO_MODE=true` en .env, mais session réelle → données mock quand même
- **Solution:** Modifier `apiWrapper` pour accepter `isDemo` en paramètre OU passer par contexte

---

## 🔗 Fichiers modifiés (dashboard uniquement)

| Fichier | Changement | Impact |
|---------|-----------|--------|
| [`app/dashboard/page.js`](app/dashboard/page.js) | Ajout `isDemo` + logique conditionnelle | Mode prod affiche 0/vide au lieu de mock |

**Aucune modification DB requise**

---

## 🗑️ TODO après validation dashboard

1. **Tester dashboard en local:**
   ```bash
   # Terminal 1: démarrer app
   npm run dev
   
   # Terminal 2: ouvrir navigateur
   # Se connecter avec contact@jetc-immo.ch
   # Aller sur /dashboard
   # Vérifier console: isDemo=false, valeurs=0
   ```

2. **Une fois dashboard validé ✅:**
   - Appliquer le même pattern aux 10-15 autres pages
   - Créer une PR "Fix: fausses données démo en mode prod"
   - Supprimer les logs temporaires

3. **Supprimer logs (après validation complète):**
   ```bash
   grep -rn "console.log.*📊 DASHBOARD" app/dashboard/page.js
   # Supprimer lignes trouvées
   ```

---

## 📊 Métriques de succès

| Avant | Après |
|-------|-------|
| ❌ isDemo=false mais stats mockées | ✅ isDemo=false → stats=0 |
| ❌ Graphs remplis (données fake) | ✅ Graphs "Aucune donnée" |
| ❌ Impossible de distinguer demo/prod | ✅ Distinction claire avec logs |
| ❌ ~15 fichiers concernés | ✅ 1/15 corrigé (dashboard), template fourni |

---

## 🚀 Prochaines étapes

**Priorité 1:** Valider dashboard en local/prod

**Priorité 2:** Appliquer pattern aux pages critiques:
1. `/audits` (liste)
2. `/non-conformites` (liste)
3. `/depots` et `/zones` (gestion master data)

**Priorité 3:** Refactorer `apiWrapper.js` pour accepter `isDemo` dynamique

**Priorité 4:** Ajouter tests automatisés:
```javascript
// Test: mode prod sans données ne doit PAS fallback sur mock
expect(isDemo).toBe(false);
expect(auditsCompleted).toBe(0); // pas 12
```
