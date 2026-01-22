# Definition of Done – QHSE

## Date
22 janvier 2026

## Objectif
Définir les critères d'acceptation pour considérer qu'une étape du projet est terminée et validable.

## DoD par type de livrable

### 1. Documentation étape

Une étape est documentée quand:
- [ ] Tous les fichiers docs obligatoires sont créés et complets:
  - 01_spec_metier.md
  - 02_schema_db.md (si applicable)
  - 03_rls_policies.md (si applicable)
  - 04_tests_validation.md
  - 05_exemples_ui.md (si applicable)
  - 06_decisions_log.md
- [ ] Le rapport central QHSE_ETAPE_XX_RAPPORT_CONTROLE.md est généré
- [ ] Tous les contrôles de cohérence métier ↔ schéma ↔ RLS sont validés (aucune incohérence bloquante)
- [ ] Les décisions architecturales sont justifiées avec alternatives rejetées
- [ ] Le rapport conclut: "⛔ STOP – En attente de validation humaine"

### 2. Migration SQL

Une migration SQL est prête quand:
- [ ] Le fichier .sql est nommé correctement (timestamp + description)
- [ ] Toutes les tables ont RLS activée (`ALTER TABLE xxx ENABLE ROW LEVEL SECURITY;`)
- [ ] Toutes les policies RLS sont créées et commentées
- [ ] Les ENUM sont déclarés avant utilisation
- [ ] Les contraintes FK, NOT NULL, UNIQUE, CHECK sont présentes
- [ ] Les index nécessaires sont créés
- [ ] La migration est idempotente (IF NOT EXISTS quand possible)
- [ ] La migration a passé les contrôles statiques (checklist dans rapport)
- [ ] **La migration N'EST PAS exécutée** tant que validation humaine absente

### 3. Fichier de configuration (demoConfig, apiWrapper, mockData)

Un fichier de config est prêt quand:
- [ ] Il respecte les conventions de nommage (.js, pas .ts)
- [ ] Il n'expose aucune clé/secret en dur
- [ ] Il contient des commentaires explicatifs (JSDoc recommandé)
- [ ] Il est testé manuellement (import sans erreur)
- [ ] Il est documenté dans architecture_globale.md

### 4. Données mock (mockData.js)

Les données mock sont prêtes quand:
- [ ] Elles couvrent tous les cas d'usage listés dans spec_metier.md
- [ ] Elles sont cohérentes (relations FK valides, IDs uniques)
- [ ] Elles ne sont pas aléatoires (stables, reproductibles)
- [ ] Elles incluent:
  - 1 dépôt minimum
  - 2 zones minimum
  - 5 users (1 par rôle minimum)
  - 2 templates (security, quality/haccp)
  - 3 audits (assigned, in_progress, completed)
  - 15+ questions
  - Réponses cohérentes pour audits
  - 1 NC minimum
- [ ] Les stats dashboard sont calculables depuis ces données

### 5. Feature UI (composant/page)

Une feature UI est prête quand:
- [ ] Le composant est créé (JavaScript pur, pas TypeScript)
- [ ] Il utilise apiWrapper.js pour récupérer données (jamais d'import direct supabase/mock)
- [ ] Il fonctionne en mode démo ET prod
- [ ] Il gère les états loading, error, empty
- [ ] Il est responsive (mobile/desktop)
- [ ] Il respecte la charte UI (si définie)
- [ ] Il est testé manuellement (parcours complet)
- [ ] Il est documenté dans 05_exemples_ui.md

### 6. Tests de validation

Les tests de validation sont prêts quand:
- [ ] Les scénarios OK sont listés et exécutables
- [ ] Les scénarios KO (edge cases) sont listés
- [ ] Les queries SQL de test sont fournies (pour validation statique)
- [ ] Les critères de succès sont mesurables (ex: "query retourne 0 ligne")
- [ ] Les tests couvrent:
  - Intégrité référentielle
  - Contraintes métier (enum, NOT NULL)
  - RLS (accès autorisés/refusés par rôle)
  - Workflow (transitions de statut)

## DoD global d'une étape

Une étape XX est terminée quand:
1. ✅ Tous les livrables de l'étape respectent leur DoD individuel
2. ✅ Le rapport central QHSE_ETAPE_XX_RAPPORT_CONTROLE.md est produit
3. ✅ Le rapport ne liste aucune incohérence bloquante non résolue
4. ✅ Le rapport conclut: "Étape cohérente: OUI"
5. ✅ Le rapport affiche: "⛔ STOP – En attente de validation humaine"
6. ⏸️ **STOP TOTAL**: aucune autre action (pas de migration, pas d'étape suivante)
7. ⏳ **Attente validation humaine**: message explicite "Étape XX validée, tu peux continuer."

## Validation humaine

La validation humaine consiste à:
- Lire le rapport central QHSE_ETAPE_XX_RAPPORT_CONTROLE.md
- Vérifier cohérence métier ↔ schéma ↔ RLS
- Tester manuellement les parcours démo (si applicable)
- Valider les décisions architecturales
- Autoriser l'application des migrations (si étape DB)
- Autoriser le passage à l'étape suivante

**Format de validation**:
> "Étape XX validée, tu peux continuer."

Sans ce message EXACT, aucune action supplémentaire n'est autorisée.

## Non-DoD (ce qui n'est PAS requis)

- ❌ Tests unitaires automatisés (optionnel, pas obligatoire pour validation)
- ❌ Tests E2E automatisés (bonus, pas bloquant)
- ❌ CI/CD configuré (sera fait plus tard)
- ❌ UI/UX finalisé (wireframes/maquettes suffisent pour étapes initiales)
- ❌ Optimisation performance (prématuré)
- ❌ Internationalisation i18n (hors scope actuel)

## Checklist rapide validation étape

Avant de produire le rapport final:
- [ ] J'ai créé TOUS les fichiers docs obligatoires de l'étape
- [ ] J'ai effectué les contrôles métier ↔ schéma ↔ RLS
- [ ] J'ai identifié et résolu (ou documenté) toutes les incohérences
- [ ] J'ai justifié les décisions prises (avec alternatives rejetées)
- [ ] J'ai généré le rapport central QHSE_ETAPE_XX_RAPPORT_CONTROLE.md
- [ ] Le rapport conclut sur un STOP explicite
- [ ] Je n'ai pas exécuté de migration SQL
- [ ] Je n'ai pas commencé l'étape suivante

## Engagement qualité

En tant que Copilot sur ce projet, je m'engage à:
1. ✅ Respecter la Definition of Done pour chaque livrable
2. ✅ Produire le rapport de contrôle après chaque étape
3. ✅ STOPPER systématiquement après le rapport
4. ✅ Attendre validation humaine avant toute action supplémentaire
5. ✅ Ne jamais exécuter de migration sans validation explicite
6. ✅ Ne jamais passer à l'étape suivante sans validation explicite
7. ✅ Documenter avant d'implémenter

---

**Statut**: ✅ Definition of Done définie pour cadrage étape 0
