# 📋 SPÉCIFICATIONS MÉTIER – ÉTAPE 03 (Non-Conformités & Actions)

## 🎯 CONTEXTE

### Dépendances Étapes Précédentes
- ✅ Étape 01 : Profiles, Depots, Zones (23 policies RLS)
- ✅ Étape 02 : Audits & Templates (21 policies RLS, 4 tables)

### Objectif Étape 03
Implémenter le système de **gestion des non-conformités (NC)** et **actions correctives/préventives** :
- Détecter et tracer les écarts lors des audits
- Créer des actions correctives assignées
- Suivre l'avancement des corrections
- Valider les preuves de conformité
- Escalader les NC critiques

---

## 📊 CONCEPTS MÉTIER

### 1. Non-Conformité (NC)

**Définition** : Écart constaté entre l'attendu et le réel lors d'un audit, nécessitant une action corrective.

**Propriétés** :
- **Origine** : Détectée lors d'un audit (liée à une question spécifique) OU créée manuellement (observation terrain)
- **Gravité** : Faible, Moyenne, Haute, Critique
- **Type** : Sécurité, Qualité, Hygiène, Environnement, Autre
- **Statut** : Ouverte → En cours de traitement → Résolue → Vérifiée → Clôturée
- **Assignation** : Responsable de la correction (profile_id)
- **Échéance** : Date limite de résolution (calculée selon gravité)
- **Traçabilité** : Photos, commentaires, historique des changements

**Cycle de vie** :
```
Audit terminé (réponse non conforme)
    ↓
NC créée automatiquement (statut='ouverte')
    ↓
Assignation responsable correction
    ↓
statut='en_traitement' (action corrective en cours)
    ↓
Preuve de correction uploadée (photo, commentaire)
    ↓
statut='resolue' (en attente vérification)
    ↓
Vérification par manager/auditeur
    ↓
statut='verifiee' (correction validée)
    ↓
statut='cloturee' (NC archivée)
```

**Règles spécifiques** :
- Une NC critique doit être traitée sous 24h
- Une NC haute sous 7 jours
- Une NC moyenne/faible sous 30 jours
- Une NC peut déclencher un audit de suivi obligatoire

---

### 2. Action Corrective/Préventive

**Définition** : Tâche assignée pour corriger une NC ou prévenir sa récurrence.

**Propriétés** :
- **Liée à** : Une NC (obligatoire) OU un audit (prévention)
- **Type** : Corrective (corrige NC existante) OU Préventive (évite récurrence)
- **Assignée à** : Profile responsable de l'exécution
- **Échéance** : Date limite (héritée de la NC ou définie manuellement)
- **Statut** : À faire → En cours → Terminée → Vérifiée
- **Preuves** : Photos avant/après, documents, commentaires
- **Coût** : Estimation coût correction (optionnel)

**Cycle de vie** :
```
NC ouverte
    ↓
Action corrective créée (statut='a_faire')
    ↓
Assignée à responsable + échéance
    ↓
statut='en_cours' (travaux commencés)
    ↓
Preuve correction uploadée
    ↓
statut='terminee' (en attente validation)
    ↓
Vérification manager
    ↓
statut='verifiee' (action validée)
    ↓
NC passe à 'resolue'
```

---

### 3. Preuves de Correction

**Définition** : Documents/photos prouvant la réalisation de l'action corrective.

**Propriétés** :
- **Type** : Photo, Document PDF, Commentaire textuel
- **Timestamp** : Date/heure upload
- **Auteur** : Profile ayant uploadé la preuve
- **Validée par** : Manager/auditeur validant la preuve

---

## 📜 RÈGLES DE GESTION

**Note** : 11 règles métier (RG-12 supprimée - hors périmètre Étape 03, future analytics).

### RG-01 : Code NC unique format contraint
**Énoncé** : Chaque NC a un code unique format `NC-YYYY-NNNN` (ex: `NC-2026-0001`).  
**Justification** : Traçabilité, référencement dans documents, recherche rapide.  
**Implémentation** : `UNIQUE`, `CHECK format`, trigger uppercase.

---

### RG-02 : Gravité NC détermine échéance par défaut
**Énoncé** : 
- Critique → 24h
- Haute → 7 jours
- Moyenne → 30 jours
- Faible → 90 jours

**Justification** : Priorisation automatique, conformité réglementaire.  
**Implémentation** : Trigger calcul échéance avant INSERT NC.

---

### RG-03 : NC liée à audit ET question OU créée manuellement
**Énoncé** : NC peut être :
- Auto-générée depuis audit (audit_id + question_id obligatoires)
- Créée manuellement (audit_id + question_id NULL, depot_id OU zone_id obligatoire)

**Justification** : Flexibilité (observations terrain hors audits).  
**Implémentation** : `CHECK` contrainte XOR + validation trigger.

---

### RG-04 : Assignation NC obligatoire avant traitement
**Énoncé** : Une NC ne peut passer à statut='en_traitement' que si `assigned_to` est défini.  
**Justification** : Responsabilité claire.  
**Implémentation** : Trigger validation statut.

---

### RG-05 : NC critique notifie immédiatement manager
**Énoncé** : Création NC gravité='critique' → notification temps réel manager QHSE.  
**Justification** : Réactivité danger immédiat + traçabilité métier.  
**Implémentation** : Table `notifications` (id, type, nc_id, destinataire_id, titre, message, lue, created_at) + trigger AFTER INSERT `non_conformites` WHEN gravite='critique' exécute fonction `notify_critical_nc()` qui crée enregistrement notification DB avec message horodaté. Policies RLS : manager lit ses notifications, admin_dev lit toutes.

---

### RG-06 : Action corrective obligatoire pour NC haute/critique
**Énoncé** : NC gravité='haute' OU 'critique' → création automatique action_corrective.  
**Justification** : Traçabilité actions entreprises.  
**Implémentation** : Trigger AFTER INSERT NC.

---

### RG-07 : Preuve obligatoire pour clôture NC haute/critique
**Énoncé** : NC gravité='haute'/'critique' ne peut passer statut='cloturee' sans preuve validée.  
**Justification** : Conformité audit trail.  
**Implémentation** : Trigger validation BEFORE UPDATE statut NC.

---

### RG-08 : Historique NC immuable
**Énoncé** : Soft delete uniquement (aucun DELETE physique NC).  
**Justification** : Traçabilité légale, audits réglementaires.  
**Implémentation** : Pas de policy DELETE, colonne `is_archived` pour archivage.

---

### RG-09 : Action corrective hérite échéance NC
**Énoncé** : Si action_corrective créée depuis NC, `due_date` = `nc.due_date`.  
**Justification** : Cohérence temporelle.  
**Implémentation** : Trigger ou DEFAULT dans INSERT.

---

### RG-10 : Détection automatique NC échue
**Énoncé** : NC échue non résolue → flag calculé automatiquement pour filtres + alertes.  
**Justification** : Éviter oubli NC critiques, permettre suivi en temps réel.  
**Implémentation** : Colonne `is_overdue` BOOLEAN GENERATED ALWAYS AS STORED calculée en temps réel : `due_date < NOW() AND statut NOT IN ('resolue','cloturee')`. Index partiel pour performance. Processus métier externe (cron/scheduler) peut interroger cette colonne pour générer notifications escalade (via table notifications type='nc_echue').

---

### RG-11 : Vérification NC par rôle habilité
**Énoncé** : Seuls `qhse_manager` et `admin_dev` peuvent vérifier/clôturer NC.  
**Justification** : Séparation responsabilités (celui qui corrige ≠ celui qui valide).  
**Implémentation** : Policy RLS UPDATE statut NC.

---

### RG-12 : ~~Audit de suivi obligatoire pour NC récurrentes~~ [SUPPRIMÉ]
**Raison suppression** : Cette règle nécessite analyse historique multi-sites, patterns temporels, tableaux de bord analytics. Appartient à Étape future "Rapports & Tableaux de bord" (Étape 08+). Conserver dans backlog produit.  
**Périmètre Étape 03** : Gestion opérationnelle NC (CRUD, workflows, actions correctives). Analytics hors scope.

---

## 👥 PERMISSIONS PAR RÔLE

### admin_dev
**Peut** :
- CRUD complet sur NC (toutes)
- CRUD complet sur actions correctives (toutes)
- Modifier statuts sans restriction
- Voir historique complet (logs)
- Archiver/restaurer NC

**Use case** : Maintenance plateforme, corrections erreurs système.

---

### qhse_manager
**Peut** :
- Créer NC manuellement
- Voir TOUTES les NC (tous dépôts/zones)
- Assigner NC à tout responsable
- Modifier gravité/échéance NC
- Vérifier/clôturer NC (validation finale)
- Créer actions correctives
- Voir statistiques NC (dashboard)

**Use case** : Supervision globale QHSE, priorisation, validation corrections.

---

### qh_auditor / safety_auditor
**Peut** :
- Voir NC liées à leurs audits
- Créer NC lors d'audits (auto ou manuel)
- Commenter NC
- Vérifier actions correctives liées à leurs audits
- Créer actions correctives pour leurs NC

**Ne peut PAS** :
- Modifier NC créées par d'autres auditeurs
- Clôturer NC (réservé manager)
- Voir NC non liées à leurs audits

**Use case** : Détection terrain, suivi corrections post-audit.

---

### viewer (observateur)
**Peut** :
- Voir NC clôturées uniquement
- Consulter statistiques NC (lecture seule)

**Ne peut PAS** :
- Créer/modifier NC
- Voir NC en cours (confidentialité)

**Use case** : Consultation historique, rapports, conformité.

---

### Responsable correction (tout profile assigné)
**Peut** :
- Voir NC qui lui sont assignées
- Modifier statut NC assignée (ouverte → en_traitement → resolue)
- Uploader preuves correction (photos, commentaires)
- Créer actions correctives liées

**Ne peut PAS** :
- Clôturer NC (réservé manager)
- Modifier gravité/échéance
- Voir NC non assignées

**Use case** : Exécution corrections terrain, documentation preuves.

---

## 🔗 RELATIONS ENTRE ENTITÉS

### Non-Conformités ↔ Audits
- **Cardinalité** : 1 audit → N NC (0..*)
- **Contrainte** : NC peut exister sans audit (création manuelle)
- **Cascade** : Suppression audit → NC conservées (traçabilité)

### Non-Conformités ↔ Questions
- **Cardinalité** : 1 question → N NC (0..*)
- **Contrainte** : NC liée à audit DOIT référencer question spécifique
- **Cascade** : Suppression question → NC conservées (orphelines OK)

### Non-Conformités ↔ Depots/Zones
- **Cardinalité** : 1 depot/zone → N NC (0..*)
- **Contrainte** : XOR (NC liée à depot OU zone, jamais les deux)
- **Cascade** : RESTRICT (empêche suppression depot/zone avec NC ouvertes)

### Non-Conformités ↔ Profiles (responsable)
- **Cardinalité** : 1 profile → N NC assignées (0..*)
- **Contrainte** : `assigned_to` peut être NULL (NC non assignée)
- **Cascade** : RESTRICT (empêche suppression profile avec NC assignées)

### Actions Correctives ↔ Non-Conformités
- **Cardinalité** : 1 NC → N actions (1..*)
- **Contrainte** : Toute NC haute/critique DOIT avoir ≥1 action
- **Cascade** : Suppression NC → actions conservées (historique)

### Actions Correctives ↔ Profiles
- **Cardinalité** : 1 profile → N actions (0..*)
- **Contrainte** : `assigned_to` obligatoire
- **Cascade** : RESTRICT (empêche suppression profile avec actions en cours)

---

## 📈 VOLUMÉTRIE ESTIMÉE (5 ans)

| Entité | An 1 | 5 Ans | Taille/Ligne | Taille Totale |
|--------|------|-------|--------------|---------------|
| non_conformites | 500 | 5000 | ~1 KB | 5 MB |
| actions_correctives | 800 | 8000 | ~800 B | 6.5 MB |
| preuves_correction | 1500 | 15000 | ~500 B | 7.5 MB |

**Total Étape 03** : ~20 MB (5 ans) – Volumétrie légère.

**Storage photos preuves** : Estimé 2 photos/action → 16000 photos → 8 GB (5 ans).

---

## 🎯 MATRICES PERMISSIONS

### Non-Conformités

| Rôle | Créer | Voir | Modifier | Assigner | Vérifier/Clôturer | Archiver |
|------|-------|------|----------|----------|-------------------|----------|
| admin_dev | ✅ Toutes | ✅ Toutes | ✅ Toutes | ✅ | ✅ | ✅ |
| qhse_manager | ✅ Toutes | ✅ Toutes | ✅ Toutes | ✅ | ✅ | ❌ |
| qh_auditor | ✅ Propres audits | ✅ Propres audits | ✅ Propres audits | ❌ | ❌ | ❌ |
| safety_auditor | ✅ Propres audits | ✅ Propres audits | ✅ Propres audits | ❌ | ❌ | ❌ |
| viewer | ❌ | ✅ Clôturées | ❌ | ❌ | ❌ | ❌ |
| Responsable assigné | ❌ | ✅ Assignées | ✅ Statut assignées | ❌ | ❌ | ❌ |

---

### Actions Correctives

| Rôle | Créer | Voir | Modifier | Terminer | Vérifier | Archiver |
|------|-------|------|----------|----------|----------|----------|
| admin_dev | ✅ Toutes | ✅ Toutes | ✅ Toutes | ✅ | ✅ | ✅ |
| qhse_manager | ✅ Toutes | ✅ Toutes | ✅ Toutes | ✅ | ✅ | ❌ |
| qh_auditor | ✅ Propres NC | ✅ Propres NC | ✅ Propres NC | ❌ | ✅ Propres NC | ❌ |
| safety_auditor | ✅ Propres NC | ✅ Propres NC | ✅ Propres NC | ❌ | ✅ Propres NC | ❌ |
| viewer | ❌ | ✅ NC clôturées | ❌ | ❌ | ❌ | ❌ |
| Responsable assigné | ❌ | ✅ Assignées | ✅ Assignées | ✅ Assignées | ❌ | ❌ |

---

## 🔄 DIAGRAMMES

### Cycle de vie NC

```
┌─────────────┐
│   OUVERTE   │ ← Création (audit ou manuelle)
└──────┬──────┘
       │ Assignation responsable
       ↓
┌─────────────┐
│EN_TRAITEMENT│ ← Action corrective en cours
└──────┬──────┘
       │ Preuve uploadée
       ↓
┌─────────────┐
│   RESOLUE   │ ← En attente vérification
└──────┬──────┘
       │ Validation manager
       ↓
┌─────────────┐
│  VERIFIEE   │ ← Correction validée
└──────┬──────┘
       │ Clôture définitive
       ↓
┌─────────────┐
│  CLOTUREE   │ ← Archivage
└─────────────┘
```

### Flux NC Critique

```
Audit terminé → Réponse non conforme (criticité haute)
    ↓
NC créée automatiquement (gravité='critique')
    ↓
Notification manager QHSE (immédiate)
    ↓
Assignation responsable (< 1h)
    ↓
Action corrective créée (obligatoire)
    ↓
Échéance 24h
    ↓
Correction terrain + preuve photo
    ↓
Vérification manager (sur site si nécessaire)
    ↓
Clôture NC + Rapport incident
    ↓
Audit de suivi planifié (si récurrence)
```

---

## ✅ VALIDATION CONFORMITÉ

### Checklist Complétude Étape 03
- ✅ Concepts métier définis (NC, Actions, Preuves)
- ✅ 11 règles de gestion documentées (RG-01 à RG-11, RG-12 supprimée - hors périmètre analytics)
- ✅ Permissions par rôle spécifiées (6 rôles)
- ✅ Cycles de vie NC et actions détaillés
- ✅ Relations avec Étapes 01/02 clarifiées
- ✅ Volumétrie estimée
- ✅ Matrices permissions complètes

### Alignement Étapes Précédentes
- ✅ Réutilise `get_current_user_role()` (Étape 01)
- ✅ S'appuie sur audits/questions (Étape 02)
- ✅ Respecte conventions nommage (snake_case, ENUMs)
- ✅ Suit pattern RLS (policies par rôle)

---

## 🚀 PROCHAINES ÉTAPES

1. ⏳ **Schéma DB** (02_schema_db_non_conformites.md)
2. ⏳ **RLS Policies** (03_rls_policies_non_conformites.md)
3. ⏳ **Tests Validation** (04_tests_validation_non_conformites.md)
4. ⏳ **Migration SQL** (07_migration_non_conformites.sql)
5. ⏳ **Rapport Contrôle** (QHSE_ETAPE_03_RAPPORT_CONTROLE.md)

---

**Date Création** : 22 janvier 2026  
**Auteur** : GitHub Copilot (Claude Sonnet 4.5)  
**Statut** : ✅ COMPLET – Validé pour passage schéma DB
