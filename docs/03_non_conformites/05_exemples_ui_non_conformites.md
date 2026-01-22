# 🎨 EXEMPLES UI – ÉTAPE 03 (Non-Conformités & Actions)

## 🎯 OBJECTIF

Ce document décrit **les parcours utilisateurs** pour la gestion des Non-Conformités (NC) et Actions Correctives, en distinguant **Mode Démo** et **Mode Production**.

**Règle fondamentale** :
- Mode Démo : Aucun appel Supabase, données mock, bandeau 🎭 MODE DÉMO visible
- Mode Prod : Authentification obligatoire, RLS appliquée, données réelles

---

## 📋 MOCK DATA REQUIS (Mode Démo)

### Non-Conformités Exemple (mockData.js)

```javascript
const mockNonConformites = [
  {
    id: 'nc-demo-001',
    code: 'NC-2026-0001',
    titre: 'Température frigo hors tolérance',
    description: 'Température relevée à 8°C au lieu de 4-6°C',
    type: 'securite',
    gravite: 'critique',
    statut: 'en_traitement',
    audit_id: 'audit-demo-001',
    question_id: 'q-temp-001',
    depot_id: 'depot-demo-001',
    zone_id: 'zone-demo-001',
    created_by: 'user-demo-auditor',
    assigned_to: 'user-demo-responsable',
    due_date: '2026-01-23',
    is_overdue: true,
    created_at: '2026-01-21T08:30:00Z',
    updated_at: '2026-01-22T10:15:00Z'
  },
  {
    id: 'nc-demo-002',
    code: 'NC-2026-0002',
    titre: 'Plan de nettoyage non respecté',
    description: 'Zone stockage non nettoyée depuis 3 jours',
    type: 'hygiene',
    gravite: 'moyenne',
    statut: 'resolue',
    depot_id: 'depot-demo-002',
    zone_id: null,
    created_by: 'user-demo-auditor',
    assigned_to: 'user-demo-responsable',
    due_date: '2026-02-20',
    is_overdue: false,
    resolved_at: '2026-01-22T14:00:00Z',
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-01-22T14:00:00Z'
  },
  {
    id: 'nc-demo-003',
    code: 'NC-2026-0003',
    titre: 'Extincteur obstrué',
    description: 'Cartons empilés devant extincteur zone B',
    type: 'securite',
    gravite: 'haute',
    statut: 'verifiee',
    depot_id: 'depot-demo-001',
    zone_id: 'zone-demo-002',
    created_by: 'user-demo-auditor',
    assigned_to: 'user-demo-responsable',
    due_date: '2026-01-28',
    is_overdue: false,
    resolved_at: '2026-01-20T16:00:00Z',
    verified_at: '2026-01-21T10:00:00Z',
    created_at: '2026-01-14T11:00:00Z',
    updated_at: '2026-01-21T10:00:00Z'
  },
  {
    id: 'nc-demo-004',
    code: 'NC-2026-0004',
    titre: 'Étiquetage produit incomplet',
    description: 'Allergènes non mentionnés sur étiquette',
    type: 'qualite',
    gravite: 'haute',
    statut: 'cloturee',
    depot_id: 'depot-demo-001',
    zone_id: null,
    created_by: 'user-demo-auditor',
    assigned_to: 'user-demo-responsable',
    due_date: '2026-01-21',
    is_overdue: false,
    resolved_at: '2026-01-19T12:00:00Z',
    verified_at: '2026-01-20T09:00:00Z',
    closed_at: '2026-01-20T15:00:00Z',
    created_at: '2026-01-12T08:00:00Z',
    updated_at: '2026-01-20T15:00:00Z'
  },
  {
    id: 'nc-demo-005',
    code: 'NC-2026-0005',
    titre: 'Absence EPI chantier',
    description: 'Personnel sans casque zone machines',
    type: 'securite',
    gravite: 'critique',
    statut: 'ouverte',
    depot_id: 'depot-demo-002',
    zone_id: 'zone-demo-003',
    created_by: 'user-demo-auditor',
    assigned_to: null,
    due_date: '2026-01-23',
    is_overdue: false,
    created_at: '2026-01-22T14:30:00Z',
    updated_at: '2026-01-22T14:30:00Z'
  }
];
```

### Actions Correctives Exemple

```javascript
const mockActions = [
  {
    id: 'action-demo-001',
    code: 'AC-2026-0001',
    nc_id: 'nc-demo-001',
    type: 'corrective',
    titre: 'Réparer thermostat frigo principal',
    description: 'Faire intervenir technicien pour calibrage thermostat',
    assigned_to: 'user-demo-responsable',
    statut: 'en_cours',
    due_date: '2026-01-23',
    estimated_cost: 350.00,
    actual_cost: null,
    created_by: 'user-demo-auditor',
    created_at: '2026-01-21T09:00:00Z',
    updated_at: '2026-01-22T11:00:00Z'
  },
  {
    id: 'action-demo-002',
    code: 'AC-2026-0002',
    nc_id: 'nc-demo-002',
    type: 'corrective',
    titre: 'Nettoyer zone stockage',
    description: 'Nettoyage complet + désinfection selon protocole',
    assigned_to: 'user-demo-responsable',
    statut: 'terminee',
    due_date: '2026-02-20',
    estimated_cost: 0,
    actual_cost: 0,
    completed_at: '2026-01-22T13:30:00Z',
    created_by: 'user-demo-auditor',
    created_at: '2026-01-15T09:30:00Z',
    updated_at: '2026-01-22T13:30:00Z'
  },
  {
    id: 'action-demo-003',
    code: 'AC-2026-0003',
    nc_id: 'nc-demo-001',
    type: 'preventive',
    titre: 'Mise en place contrôle température automatique',
    description: 'Installer sonde connectée avec alertes SMS',
    assigned_to: 'user-demo-responsable',
    statut: 'a_faire',
    due_date: '2026-01-30',
    estimated_cost: 1200.00,
    actual_cost: null,
    created_by: 'user-demo-manager',
    created_at: '2026-01-21T15:00:00Z',
    updated_at: '2026-01-21T15:00:00Z'
  },
  {
    id: 'action-demo-004',
    code: 'AC-2026-0004',
    nc_id: 'nc-demo-003',
    type: 'corrective',
    titre: 'Dégager accès extincteur',
    description: 'Réorganiser stockage cartons zone B',
    assigned_to: 'user-demo-responsable',
    statut: 'verifiee',
    due_date: '2026-01-28',
    estimated_cost: 0,
    actual_cost: 0,
    completed_at: '2026-01-20T15:30:00Z',
    verified_at: '2026-01-21T10:00:00Z',
    verified_by: 'user-demo-manager',
    created_by: 'user-demo-auditor',
    created_at: '2026-01-14T11:30:00Z',
    updated_at: '2026-01-21T10:00:00Z'
  }
];
```

### Preuves Correction Exemple

```javascript
const mockPreuves = [
  {
    id: 'preuve-demo-001',
    action_id: 'action-demo-002',
    type: 'photo',
    file_url: '/demo/photos/nettoyage_zone_stockage.jpg',
    commentaire: 'Zone nettoyée et désinfectée',
    uploaded_by: 'user-demo-responsable',
    uploaded_at: '2026-01-22T13:45:00Z',
    verified_by: null,
    verified_at: null
  },
  {
    id: 'preuve-demo-002',
    action_id: 'action-demo-004',
    type: 'photo',
    file_url: '/demo/photos/extincteur_degage.jpg',
    commentaire: 'Accès extincteur dégagé, marquage au sol ajouté',
    uploaded_by: 'user-demo-responsable',
    uploaded_at: '2026-01-20T15:45:00Z',
    verified_by: 'user-demo-manager',
    verified_at: '2026-01-21T10:00:00Z'
  },
  {
    id: 'preuve-demo-003',
    action_id: 'action-demo-004',
    type: 'document',
    file_url: '/demo/docs/rapport_reorganisation_stockage.pdf',
    commentaire: 'Plan nouvelle organisation stockage zone B',
    uploaded_by: 'user-demo-responsable',
    uploaded_at: '2026-01-20T16:00:00Z',
    verified_by: 'user-demo-manager',
    verified_at: '2026-01-21T10:00:00Z'
  }
];
```

---

## 🔀 VUE 1 : DASHBOARD DÉMO – ACCUEIL NC

**Route** : `/demo` (section NC)  
**Accès** : Mode Démo uniquement, sans authentification

### Affichage

**Bandeau permanent** : 🎭 MODE DÉMO (données exemple)

**KPIs NC visibles** :
```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ 🔴 NC Critiques         │ ⚠️ NC en Retard         │ ✅ Taux Résolution 30j  │
│ 2 (ouverte + traitement)│ 1 (NC-2026-0001)        │ 75% (3/4 résolues)      │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘

┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ 📋 NC Ouvertes          │ 🔄 NC en Traitement     │ 🔒 NC Clôturées (30j)   │
│ 1                       │ 1                       │ 1                       │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

**Graphique** : Répartition NC par statut (pie chart)
- Ouverte : 1
- En traitement : 1
- Résolue : 1
- Vérifiée : 1
- Clôturée : 1

**Actions rapides** :
- [Voir NC critiques] → `/demo/non-conformites?gravite=critique`
- [Voir NC en retard] → `/demo/non-conformites?overdue=true`
- [Voir toutes NC] → `/demo/non-conformites`

---

## 🔀 VUE 2 : LISTE NON-CONFORMITÉS (DÉMO)

**Route** : `/demo/non-conformites`  
**Accès** : Mode Démo uniquement

### Affichage Tableau

**Filtres disponibles** :
- Statut : Tous / Ouverte / En traitement / Résolue / Vérifiée / Clôturée
- Gravité : Tous / Faible / Moyenne / Haute / Critique
- Type : Tous / Sécurité / Qualité / Hygiène / Environnement
- Dépôt : Tous / Dépôt 1 / Dépôt 2

**Tableau NC** :

| Code | Titre | Type | Gravité | Statut | Assigné à | Échéance | Actions |
|------|-------|------|---------|--------|-----------|----------|---------|
| 🔴 NC-2026-0001 | Température frigo hors tolérance | Sécurité | Critique | En traitement | Resp. 1 | ⚠️ 23 Jan (en retard) | [Voir détail] |
| NC-2026-0005 | Absence EPI chantier | Sécurité | Critique | Ouverte | Non assigné | 23 Jan | [Voir détail] |
| NC-2026-0002 | Plan nettoyage non respecté | Hygiène | Moyenne | Résolue | Resp. 1 | 20 Fév | [Voir détail] |
| NC-2026-0003 | Extincteur obstrué | Sécurité | Haute | Vérifiée | Resp. 1 | 28 Jan | [Voir détail] |
| ✅ NC-2026-0004 | Étiquetage produit incomplet | Qualité | Haute | Clôturée | Resp. 1 | 21 Jan | [Voir détail] |

**Badges visuels** :
- 🔴 NC critique avec retard
- ⚠️ Échéance dépassée
- ✅ NC clôturée

**États UI** :
- ✅ **Données présentes** : Tableau + filtres fonctionnels
- ⚠️ **Aucune NC** : Message "Aucune non-conformité dans cette vue"
- ❌ **Erreur** : Impossible en démo (données mock garanties)

---

## 🔀 VUE 3 : DÉTAIL NON-CONFORMITÉ (DÉMO)

**Route** : `/demo/non-conformites/nc-demo-001`  
**Accès** : Mode Démo uniquement

### Structure Page

#### Section 1 : En-tête NC

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎭 MODE DÉMO                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🔴 NC-2026-0001 – Température frigo hors tolérance                          │
│                                                                             │
│ Statut : 🟡 EN TRAITEMENT      Gravité : 🔴 CRITIQUE                        │
│ Type : Sécurité                Échéance : ⚠️ 23 janvier 2026 (EN RETARD)   │
│                                                                             │
│ Créée le : 21 janv. 2026 08:30 par Auditeur Démo                           │
│ Assignée à : Responsable Démo                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Section 2 : Description

```
📝 Description
Température relevée à 8°C au lieu de 4-6°C selon norme HACCP.

🔗 Origine
Audit : HACCP-2026-001 – Contrôle hygiène quotidien
Question : Q1 – Température frigo principal
Dépôt : Dépôt Central
Zone : Zone Stockage Froid
```

#### Section 3 : Actions Correctives (2)

**Action 1 : AC-2026-0001 (Corrective)**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔧 AC-2026-0001 – Réparer thermostat frigo principal                       │
│                                                                             │
│ Statut : 🟡 EN COURS           Échéance : 23 janvier 2026                   │
│ Assignée à : Responsable Démo                                               │
│ Coût estimé : 350.00 CHF       Coût réel : -                               │
│                                                                             │
│ Description :                                                               │
│ Faire intervenir technicien pour calibrage thermostat                      │
│                                                                             │
│ Preuves : Aucune pour l'instant                                             │
│                                                                             │
│ [📷 Ajouter preuve] [✅ Marquer terminée]                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Action 2 : AC-2026-0003 (Préventive)**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ AC-2026-0003 – Mise en place contrôle température automatique           │
│                                                                             │
│ Statut : ⏳ À FAIRE            Échéance : 30 janvier 2026                   │
│ Assignée à : Responsable Démo                                               │
│ Coût estimé : 1200.00 CHF      Coût réel : -                               │
│                                                                             │
│ Description :                                                               │
│ Installer sonde connectée avec alertes SMS                                  │
│                                                                             │
│ [▶️ Démarrer action]                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Section 4 : Historique

```
📅 Historique
• 22 janv. 2026 10:15 – Statut modifié : ouverte → en_traitement (Responsable Démo)
• 21 janv. 2026 09:00 – Action corrective AC-2026-0001 créée (Auditeur Démo)
• 21 janv. 2026 08:30 – NC créée (Auditeur Démo)
```

**Boutons actions (contextuels)** :
- [✏️ Modifier NC] (si droits)
- [✅ Marquer résolue] (si toutes actions terminées)
- [🗨️ Ajouter commentaire]

---

## 🔀 VUE 4 : UPLOAD PREUVE (DÉMO)

**Route** : `/demo/actions/action-demo-001/preuves/new`  
**Accès** : Mode Démo uniquement

### Formulaire Upload

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎭 MODE DÉMO – Ajouter une preuve de correction                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Action : AC-2026-0001 – Réparer thermostat frigo principal                 │
│                                                                             │
│ Type de preuve *                                                            │
│ ○ Photo  ○ Document  ○ Commentaire                                         │
│                                                                             │
│ Fichier (si photo/document)                                                 │
│ [📁 Choisir fichier...] (simulé en démo)                                    │
│                                                                             │
│ Commentaire *                                                               │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ Ex: Thermostat calibré, température stable à 5°C                     │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ⚠️ En mode démo, aucun fichier n'est réellement uploadé.                   │
│ Une entrée simulée sera ajoutée pour démonstration.                        │
│                                                                             │
│ [✅ Ajouter preuve] [❌ Annuler]                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Comportement clic "Ajouter preuve"** :
- Validation formulaire (type + commentaire obligatoires)
- Ajout preuve en mémoire (mockApi)
- Toast success : "✅ Preuve ajoutée avec succès (Démo)"
- Redirect → `/demo/actions/action-demo-001`

---

## 🔀 VUE 5 : LISTE NC (PRODUCTION)

**Route** : `/non-conformites`  
**Accès** : Authentification obligatoire, RLS appliquée

### Différences Prod vs Démo

**Bandeau** : Aucun (mode normal)

**Données affichées** : Filtrage RLS automatique selon rôle :
- **admin_dev / qhse_manager** : Toutes NC
- **qh_auditor / safety_auditor** : NC de leurs audits uniquement
- **assigned_to = auth.uid()** : NC assignées uniquement
- **viewer** : NC clôturées uniquement

**Tableau NC** : Identique structure démo, mais données réelles Supabase.

**États UI** :
- 🔄 **Loading** : Spinner pendant `api.nonConformites.getAll()`
- ✅ **Données présentes** : Tableau peuplé
- ⚠️ **Aucune NC** : Message "Aucune non-conformité trouvée"
- ❌ **Erreur RLS** : "Vous n'avez pas accès à ces données"
- ❌ **Erreur réseau** : "Impossible de charger les NC. Réessayez."

**Bouton création** :
- [➕ Créer NC] visible uniquement si rôle `admin_dev`, `qhse_manager`, ou auditeurs

---

## 🔀 VUE 6 : DÉTAIL NC (PRODUCTION)

**Route** : `/non-conformites/:id`  
**Accès** : Authentification + RLS

### Logique Accès RLS

**Appel API** : `api.nonConformites.getById(id)`

**Résultats possibles** :
1. ✅ **Accès autorisé** : NC affichée
2. ❌ **Accès refusé RLS** : 403 Forbidden → Message "Vous n'avez pas accès à cette NC"
3. ❌ **NC inexistante** : 404 Not Found → Message "NC introuvable"

### Boutons Contextuels (selon statut + rôle)

**Si statut = 'ouverte' ET (assigned_to = user OU manager)** :
- [▶️ Passer en traitement]

**Si statut = 'en_traitement' ET assigned_to = user** :
- [✅ Marquer résolue] (si ≥1 action terminée)

**Si statut = 'resolue' ET rôle = qhse_manager** :
- [✔️ Vérifier NC]

**Si statut = 'verifiee' ET rôle = qhse_manager** :
- [🔒 Clôturer NC]

**Si statut IN ('verifiee', 'cloturee')** :
- Aucune action (lecture seule)

---

## 🔀 VUE 7 : UPLOAD PREUVE (PRODUCTION)

**Route** : `/actions/:id/preuves/new`  
**Accès** : Authentification + RLS

### Logique Upload Supabase Storage

**Étapes** :
1. Validation formulaire (type + fichier + commentaire)
2. Upload fichier → Supabase Storage bucket `preuves_correction`
   ```javascript
   const { data, error } = await supabase.storage
     .from('preuves_correction')
     .upload(`${action_id}/${Date.now()}_${file.name}`, file);
   ```
3. Récupération URL publique :
   ```javascript
   const file_url = supabase.storage
     .from('preuves_correction')
     .getPublicUrl(data.path).data.publicUrl;
   ```
4. Insertion DB :
   ```javascript
   await supabase
     .from('preuves_correction')
     .insert({
       action_id,
       type,
       file_url,
       commentaire,
       uploaded_by: user.id
     });
   ```

**Gestion erreurs** :
- ❌ **Upload échoué** : Toast "Erreur upload fichier"
- ❌ **RLS refusé** : Toast "Vous ne pouvez pas ajouter de preuve pour cette action"
- ✅ **Success** : Toast "Preuve ajoutée" + redirect

---

## 🔀 VUE 8 : FORMULAIRE CRÉATION NC (PRODUCTION)

**Route** : `/non-conformites/new`  
**Accès** : Rôles `admin_dev`, `qhse_manager`, auditeurs

### Champs Formulaire

**Obligatoires** :
- Titre *
- Description *
- Type * (Sécurité / Qualité / Hygiène / Environnement / Autre)
- Gravité * (Faible / Moyenne / Haute / Critique)

**Origine** (XOR constraint) :
- Option A : Audit + Question
  - Sélecteur Audit (autocomplete)
  - Sélecteur Question liée
- Option B : Observation manuelle
  - Sélecteur Dépôt *
  - Sélecteur Zone (optionnel)

**Assignation** :
- Responsable assigné (optionnel à création, obligatoire avant traitement)

### Validation Frontend

**Règles** :
- Si gravité = 'critique' → échéance calculée = J+1
- Si gravité = 'haute' → échéance = J+7
- XOR audit/dépôt : Au moins un des deux groupes rempli

**Submit** :
```javascript
const { data, error } = await supabase
  .from('non_conformites')
  .insert({
    titre,
    description,
    type,
    gravite,
    audit_id: auditSelected ? audit_id : null,
    question_id: auditSelected ? question_id : null,
    depot_id: !auditSelected ? depot_id : null,
    zone_id: !auditSelected ? zone_id : null,
    assigned_to,
    created_by: user.id
  })
  .select()
  .single();
```

**Trigger automatique** : `calculate_nc_due_date` définit `due_date` selon gravité.

---

## 📊 MATRICE ACCÈS UI PAR RÔLE

| Vue | Public | Démo | Viewer (Prod) | Auditeur (Prod) | Manager (Prod) | Admin (Prod) |
|-----|--------|------|---------------|-----------------|----------------|--------------|
| Dashboard Démo | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Liste NC Démo | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Détail NC Démo | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Liste NC Prod | ❌ | ❌ | ✅ (clôturées) | ✅ (propres audits) | ✅ (toutes) | ✅ (toutes) |
| Détail NC Prod | ❌ | ❌ | ✅ (si clôturée) | ✅ (si propriétaire) | ✅ (toutes) | ✅ (toutes) |
| Créer NC | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Modifier NC | ❌ | ❌ | ❌ | ✅ (si créateur, avant clôture) | ✅ (toutes, avant clôture) | ✅ (toutes) |
| Upload Preuve | ❌ | ✅ (simulé) | ❌ | ✅ (si action liée à NC propre) | ✅ (toutes) | ✅ (toutes) |
| Vérifier NC | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Clôturer NC | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## ✅ CHECKLIST VALIDATION UI

### Mode Démo
- ✅ Bandeau 🎭 MODE DÉMO visible sur toutes pages
- ✅ Dashboard NC affiche KPIs cohérents avec mock data
- ✅ Liste NC affiche 5 exemples (gravités variées)
- ✅ Détail NC cliquable avec actions/preuves
- ✅ Upload preuve simulé (pas d'appel Supabase)
- ✅ Aucune erreur "No data" ou "undefined"
- ✅ Navigation fluide entre vues

### Mode Production
- ✅ Authentification obligatoire (redirect /login si non connecté)
- ✅ RLS appliquée (auditeur voit uniquement ses NC)
- ✅ États UI gérés (loading, empty, error)
- ✅ Upload Supabase Storage fonctionnel
- ✅ Transitions statut contrôlées (buttons contextuels)
- ✅ Validation formulaire création NC (XOR audit/dépôt)
- ✅ Messages erreur clairs (RLS refusé, 404, réseau)

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Exemples UI définis
2. ⏳ **Décisions log** (06_decisions_log_non_conformites.md)
3. ⏳ **Tests validation** (04_tests_validation_non_conformites.md)
4. ⏳ **Migration SQL finale** (07_migration_finale_non_conformites.sql)

---

**Date Création** : 22 janvier 2026  
**Auteur** : GitHub Copilot (Claude Sonnet 4.5)  
**Statut** : ✅ COMPLET – Validé pour passage decisions log
