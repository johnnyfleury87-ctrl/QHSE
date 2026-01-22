# 📋 SPÉCIFICATIONS MÉTIER – ÉTAPE 02 (Audits & Templates)

## 🎯 CONTEXTE

### Position dans le Projet
**Étape 02 / 06** – Construire sur les fondations (profiles, depots, zones) pour implémenter le cœur métier : la gestion des audits QHSE.

### Prérequis Validés (Étape 01)
✅ Tables foundation : `profiles`, `depots`, `zones`  
✅ RLS activée : 23 policies (5 rôles, 3 tables)  
✅ Auth Supabase : connexion utilisateurs  
✅ Soft delete : status ENUM (active/inactive)  

### Objectifs Étape 02
Permettre aux auditeurs QHSE de :
1. **Créer des modèles d'audit** réutilisables (templates)
2. **Réaliser des audits terrain** sur dépôts/zones
3. **Capturer des réponses** aux questionnaires
4. **Générer des résultats** avec score et non-conformités
5. **Suivre l'historique** des audits par site

---

## 📊 CONCEPTS MÉTIER

### 1. Modèle d'Audit (Audit Template)

**Définition** : Questionnaire type réutilisable pour un domaine QHSE (sécurité, qualité, hygiène, environnement).

**Attributs** :
- **code** : Identifiant unique (ex: `AUD-SEC-2025`)
- **titre** : Nom descriptif (ex: "Audit Sécurité Incendie")
- **domaine** : Catégorie QHSE (sécurité, qualité, hygiène, environnement, global)
- **description** : Objectifs et périmètre de l'audit
- **version** : Numéro de version (gestion évolution templates)
- **statut** : brouillon, actif, archivé
- **créateur** : profile qui a créé le template
- **questions** : Liste de questions associées (relation 1:N)

**Règles Métier** :
- Code template UNIQUE majuscule (format: `[A-Z0-9-]{3,20}`)
- Seuls `admin_dev` et `qhse_manager` peuvent créer templates
- Template archivé = pas de nouvel audit (mais audits existants préservés)
- Version incrémentée à chaque modification majeure

**Cycle de Vie** :
```
brouillon → actif → archivé
   ↓          ↓
 (édition) (utilisation)
```

---

### 2. Question d'Audit

**Définition** : Item du questionnaire, appartient à un template.

**Attributs** :
- **ordre** : Position dans le questionnaire (1, 2, 3...)
- **libellé** : Texte de la question
- **type** : oui_non, choix_multiple, texte_libre, note_1_5
- **obligatoire** : booléen (question requise ou optionnelle)
- **criticité** : faible, moyenne, haute, critique
- **points_max** : Score maximum si réponse conforme
- **aide** : Texte d'aide pour l'auditeur

**Règles Métier** :
- Ordre unique par template (UNIQUE composite: template_id + ordre)
- Type détermine les réponses possibles :
  - `oui_non` : réponse booléenne → points_max si "oui"
  - `choix_multiple` : options prédéfinies → scoring variable
  - `texte_libre` : commentaire libre → pas de scoring auto
  - `note_1_5` : notation 1-5 → calcul proportionnel
- Criticité influence le poids dans le score final
- Suppression question → suppression réponses associées (CASCADE)

---

### 3. Audit (Instance)

**Définition** : Exécution d'un template sur un dépôt ou une zone à une date donnée.

**Attributs** :
- **code** : Identifiant unique audit (ex: `AUD-LYO-2025-001`)
- **template** : Référence au modèle utilisé
- **cible** : Dépôt OU zone audité(e)
- **auditeur** : Profile réalisant l'audit
- **date_planifiee** : Date prévue
- **date_realisee** : Date effective (NULL si pas encore fait)
- **statut** : planifie, en_cours, termine, annule
- **score_obtenu** : Points obtenus (calculé)
- **score_maximum** : Points totaux possibles (calculé)
- **taux_conformite** : % (score_obtenu / score_maximum)
- **nb_non_conformites** : Nombre de NC détectées
- **commentaire_general** : Synthèse de l'auditeur

**Règles Métier** :
- Code audit UNIQUE majuscule
- Audit cible UN dépôt OU UNE zone (XOR, pas les deux)
- Auditeur doit avoir rôle `qh_auditor`, `safety_auditor` ou `qhse_manager`
- Template doit être `actif` au moment de la création audit
- Statut `termine` → date_realisee obligatoire, toutes questions répondues
- Score auto-calculé à partir des réponses (trigger ou fonction)
- Suppression audit possible AVANT statut `termine` uniquement

**Cycle de Vie** :
```
planifie → en_cours → termine
   ↓          ↓
 annule    annule
```

---

### 4. Réponse d'Audit

**Définition** : Réponse d'un auditeur à une question lors d'un audit.

**Attributs** :
- **audit** : Audit parent
- **question** : Question du template
- **valeur** : Réponse brute (JSON flexible)
  - oui_non : `{"reponse": true/false}`
  - choix_multiple : `{"choix": "option_A"}`
  - texte_libre : `{"texte": "Observations..."}`
  - note_1_5 : `{"note": 3}`
- **points_obtenus** : Score pour cette réponse
- **est_conforme** : Booléen (répond-il aux critères ?)
- **commentaire** : Observations terrain
- **photo_url** : Lien Supabase Storage (preuve visuelle)

**Règles Métier** :
- UNIQUE (audit_id, question_id) : une seule réponse par question
- valeur doit matcher le type de question (validation JSON schema)
- points_obtenus ≤ question.points_max
- est_conforme FALSE → compte comme non-conformité
- Photo optionnelle (Supabase Storage : bucket `audit_photos`)

---

## 🔐 PERMISSIONS PAR RÔLE

### admin_dev
- **Templates** : CRUD complet
- **Questions** : CRUD complet
- **Audits** : CRUD complet (peut modifier audits d'autres auditeurs)
- **Réponses** : CRUD complet

### qhse_manager
- **Templates** : CRUD complet (création, modification, archivage)
- **Questions** : CRUD complet
- **Audits** : Lecture tous, Création/Modification/Suppression tous
- **Réponses** : CRUD complet (peut modifier réponses d'autres auditeurs)

### qh_auditor / safety_auditor
- **Templates** : Lecture seule (templates actifs uniquement)
- **Questions** : Lecture seule (questions des templates actifs)
- **Audits** : 
  - Lecture : tous les audits (visibilité complète)
  - Création : audits assignés à eux-mêmes
  - Modification : audits assignés à eux AVANT statut `termine`
  - Suppression : INTERDIT
- **Réponses** : CRUD sur leurs propres audits AVANT statut `termine`

### viewer
- **Templates** : Lecture seule (templates actifs uniquement)
- **Questions** : Lecture seule
- **Audits** : Lecture seule (tous audits terminés)
- **Réponses** : Lecture seule

---

## 📐 RÈGLES DE GESTION

### RG-01 : Code Template Unique
**Énoncé** : Chaque template a un code UNIQUE en majuscules.  
**Format** : `[A-Z0-9-]{3,20}` (ex: `AUD-SEC-2025`)  
**Implémentation** : `UNIQUE`, `CHECK`, trigger uppercase.

### RG-02 : Version Incrémentale
**Énoncé** : La version d'un template est un entier ≥ 1, incrémentée à chaque modification.  
**Implémentation** : `CHECK version >= 1`, DEFAULT 1.

### RG-03 : Question Ordre Unique par Template
**Énoncé** : Dans un template, chaque question a un ordre unique (1, 2, 3...).  
**Implémentation** : `UNIQUE(template_id, ordre)`.

### RG-04 : Audit Cible XOR (Dépôt OU Zone)
**Énoncé** : Un audit cible UN dépôt OU UNE zone, jamais les deux ni aucun.  
**Implémentation** : 
```sql
CHECK (
  (depot_id IS NOT NULL AND zone_id IS NULL) OR
  (depot_id IS NULL AND zone_id IS NOT NULL)
)
```

### RG-05 : Code Audit Unique
**Énoncé** : Chaque audit a un code UNIQUE en majuscules.  
**Format** : `[A-Z0-9-]{5,30}` (ex: `AUD-LYO-2025-001`)  
**Implémentation** : `UNIQUE`, `CHECK`, trigger uppercase.

### RG-06 : Auditeur Rôle Valide
**Énoncé** : L'auditeur d'un audit doit avoir un rôle autorisé.  
**Rôles valides** : `qh_auditor`, `safety_auditor`, `qhse_manager`  
**Implémentation** : Trigger validation ou CHECK via fonction.

### RG-07 : Template Actif pour Nouvel Audit
**Énoncé** : On ne peut créer un audit qu'avec un template `actif`.  
**Implémentation** : Trigger vérifie `template.statut = 'actif'` avant INSERT audit.

### RG-08 : Date Réalisée si Terminé
**Énoncé** : Un audit `termine` doit avoir `date_realisee NOT NULL`.  
**Implémentation** : 
```sql
CHECK (
  (statut = 'termine' AND date_realisee IS NOT NULL) OR
  (statut != 'termine')
)
```

### RG-09 : Réponse Unique par Question
**Énoncé** : Un audit ne peut avoir qu'une seule réponse par question.  
**Implémentation** : `UNIQUE(audit_id, question_id)`.

### RG-10 : Points Obtenus ≤ Points Max
**Énoncé** : Le score d'une réponse ne peut dépasser le score max de la question.  
**Implémentation** : 
```sql
CHECK (points_obtenus <= (SELECT points_max FROM questions WHERE id = question_id))
```
OU validation trigger.

### RG-11 : Suppression Audit Limité
**Énoncé** : Seuls les audits NON terminés peuvent être supprimés.  
**Implémentation** : Trigger BEFORE DELETE vérifie `statut != 'termine'` (sauf admin_dev).

### RG-12 : Soft Delete Templates
**Énoncé** : Les templates ne sont jamais supprimés physiquement (archivage via statut).  
**Implémentation** : Aucune policy DELETE sur `audit_templates` (comme profiles).

---

## 📊 VOLUMÉTRIE ESTIMÉE

| Entité | Volume Année 1 | Volume 5 Ans | Croissance |
|--------|----------------|--------------|------------|
| Templates | 10-20 | 30-50 | Stable (réutilisation) |
| Questions | 200-500 | 500-1000 | Modérée |
| Audits | 500-1000 | 5000-10000 | Linéaire (100-200/an) |
| Réponses | 10k-20k | 100k-200k | Linéaire (20 questions/audit) |

**Conclusion** : Volumétrie modérée, indexes sur FK critiques (audit_id, template_id, question_id).

---

## 🔗 RELATIONS ENTRE ENTITÉS

```
profiles (Étape 01)
   ↓ FK createur_id
audit_templates
   ↓ FK template_id
questions
   ↓ FK question_id (pour réponses)

depots / zones (Étape 01)
   ↓ FK depot_id / zone_id (XOR)
audits
   ↓ FK audit_id
reponses
```

**Relations Clés** :
- `audit_templates.createur_id` → `profiles.id` (ON DELETE RESTRICT)
- `questions.template_id` → `audit_templates.id` (ON DELETE CASCADE)
- `audits.template_id` → `audit_templates.id` (ON DELETE RESTRICT)
- `audits.auditeur_id` → `profiles.id` (ON DELETE RESTRICT)
- `audits.depot_id` → `depots.id` (ON DELETE RESTRICT, optionnel)
- `audits.zone_id` → `zones.id` (ON DELETE RESTRICT, optionnel)
- `reponses.audit_id` → `audits.id` (ON DELETE CASCADE)
- `reponses.question_id` → `questions.id` (ON DELETE RESTRICT)

**Cascade Contrôlé** :
- Suppression template → **INTERDIT** si audits existent (RESTRICT)
- Suppression question → suppression réponses (CASCADE)
- Suppression audit → suppression réponses (CASCADE)
- Suppression profile (auditeur) → **INTERDIT** si audits assignés (RESTRICT)

---

## 🎨 WIREFRAMES (Aperçu)

### Écran 1 : Liste Templates
- Tableau : Code, Titre, Domaine, Version, Statut, Créateur
- Filtres : Domaine, Statut
- Bouton "Nouveau Template" (admin_dev, qhse_manager)

### Écran 2 : Détail Template
- Infos générales (titre, domaine, version, description)
- Liste questions (tableau réordonnable)
- Bouton "Ajouter Question"
- Bouton "Archiver Template" (si actif)

### Écran 3 : Planification Audit
- Formulaire : Template (select), Cible (dépôt ou zone), Auditeur, Date planifiée
- Génération code audit auto
- Validation : template actif, rôle auditeur

### Écran 4 : Réalisation Audit (Terrain)
- Mode mobile-first (tablette terrain)
- Questions en séquence (1/N)
- Champs réponse selon type question
- Upload photo optionnel
- Bouton "Suivant" / "Précédent"
- Sauvegarde brouillon auto

### Écran 5 : Résultats Audit
- Score global (taux conformité %)
- Détail par question (conforme/non-conforme)
- Liste non-conformités
- Export PDF

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Spécifications métier (ce fichier)
2. ⏳ Schéma DB (ENUMs, tables, contraintes, indexes)
3. ⏳ RLS Policies (permissions par rôle)
4. ⏳ Tests validation (scénarios OK/KO)
5. ⏳ Wireframes UI détaillés
6. ⏳ Journal décisions architecturales
7. ⏳ Migration SQL finale
8. ⏳ Rapport de contrôle Étape 02

---

**Date Création** : 22 janvier 2026  
**Auteur** : GitHub Copilot (Claude Sonnet 4.5)  
**Statut** : ✅ COMPLET – Validé pour passage schéma DB
