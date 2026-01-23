/**
 * Module: Rules Engine
 * Source: Plan C1 - Déclencher NC automatiques selon règles métier
 * Objectif: Évaluer les réponses et déclencher NC si non-conforme
 * 
 * Règles supportées:
 * 1. yes_no + criticality=critical/high + value=no → NC
 * 2. score_1_5 + criticality=critical + value≤2 → NC
 * 3. NUMBER avec rule_config.min/max → NC si hors limites
 * 
 * Exemple rule_config:
 * {
 *   "type": "temperature",
 *   "min": -18,
 *   "max": -15,
 *   "unit": "°C"
 * }
 */

/**
 * Évalue une réponse selon les règles définies sur la question
 * @param {Object} question - Question avec { id, label, type, criticality, rule_config }
 * @param {*} value - Valeur de la réponse (yes/no, 1-5, number, text)
 * @returns {Object} { severity, shouldCreateNC, ncPayload }
 */
export function evaluateRule(question, value) {
  // Pas de règle si pas de valeur
  if (value === null || value === undefined || value === '') {
    return {
      severity: 'info',
      shouldCreateNC: false,
      ncPayload: null,
      message: null,
    }
  }

  // TYPE 1: yes_no questions
  if (question.type === 'yes_no') {
    return evaluateYesNoRule(question, value)
  }

  // TYPE 2: score_1_5 questions
  if (question.type === 'score_1_5') {
    return evaluateScoreRule(question, value)
  }

  // TYPE 3: NUMBER avec rule_config (température, etc.)
  if (question.type === 'number' && question.rule_config) {
    return evaluateNumberRule(question, value)
  }

  // TYPE 4: text - pas d'évaluation auto
  return {
    severity: 'info',
    shouldCreateNC: false,
    ncPayload: null,
    message: null,
  }
}

/**
 * Règle yes_no: si réponse = "no" + criticality haute → NC
 */
function evaluateYesNoRule(question, value) {
  if (value !== 'no') {
    // Réponse = yes → OK
    return {
      severity: 'success',
      shouldCreateNC: false,
      ncPayload: null,
      message: '✓ Conforme',
    }
  }

  // Réponse = no → analyser criticality
  const criticality = question.criticality || 'medium'

  if (criticality === 'critical') {
    return {
      severity: 'critical',
      shouldCreateNC: true,
      ncPayload: {
        title: `NC Critique: ${question.label}`,
        description: `Réponse non conforme détectée sur une question critique.\n\nQuestion: ${question.label}\nRéponse: Non\n\nAction requise immédiate.`,
        priority: 'critical',
        deadline: getDeadlineFromCriticality('critical'),
      },
      message: '⚠️ NC critique générée',
    }
  }

  if (criticality === 'high') {
    return {
      severity: 'warning',
      shouldCreateNC: true,
      ncPayload: {
        title: `NC: ${question.label}`,
        description: `Non-conformité détectée.\n\nQuestion: ${question.label}\nRéponse: Non\n\nCorrective action recommandée.`,
        priority: 'high',
        deadline: getDeadlineFromCriticality('high'),
      },
      message: '⚠️ NC haute priorité générée',
    }
  }

  // Criticality = medium/low → warning mais pas de NC auto
  return {
    severity: 'warning',
    shouldCreateNC: false,
    ncPayload: null,
    message: '⚠️ Point d\'attention',
  }
}

/**
 * Règle score_1_5: si score ≤ 2 + criticality critical/high → NC
 */
function evaluateScoreRule(question, value) {
  const score = parseInt(value, 10)

  if (isNaN(score) || score < 1 || score > 5) {
    return {
      severity: 'info',
      shouldCreateNC: false,
      ncPayload: null,
      message: null,
    }
  }

  // Score 4-5 → OK
  if (score >= 4) {
    return {
      severity: 'success',
      shouldCreateNC: false,
      ncPayload: null,
      message: '✓ Bon score',
    }
  }

  // Score 3 → acceptable
  if (score === 3) {
    return {
      severity: 'info',
      shouldCreateNC: false,
      ncPayload: null,
      message: 'ℹ️ Score acceptable',
    }
  }

  // Score ≤ 2 → problème
  const criticality = question.criticality || 'medium'

  if (criticality === 'critical' && score <= 2) {
    return {
      severity: 'critical',
      shouldCreateNC: true,
      ncPayload: {
        title: `NC Critique: ${question.label}`,
        description: `Score insuffisant sur question critique.\n\nQuestion: ${question.label}\nScore: ${score}/5\n\nIntervention urgente requise.`,
        priority: 'critical',
        deadline: getDeadlineFromCriticality('critical'),
      },
      message: '⚠️ NC critique (score faible)',
    }
  }

  if (criticality === 'high' && score <= 2) {
    return {
      severity: 'warning',
      shouldCreateNC: true,
      ncPayload: {
        title: `NC: ${question.label}`,
        description: `Score insuffisant détecté.\n\nQuestion: ${question.label}\nScore: ${score}/5\n\nAmélioration requise.`,
        priority: 'high',
        deadline: getDeadlineFromCriticality('high'),
      },
      message: '⚠️ NC générée (score faible)',
    }
  }

  // Medium/low → warning
  return {
    severity: 'warning',
    shouldCreateNC: false,
    ncPayload: null,
    message: '⚠️ Score faible',
  }
}

/**
 * Règle NUMBER: température, poids, etc. hors limites → NC
 * Exemple rule_config:
 * {
 *   "type": "temperature",
 *   "min": -18,
 *   "max": -15,
 *   "unit": "°C"
 * }
 */
function evaluateNumberRule(question, value) {
  const numValue = parseFloat(value)

  if (isNaN(numValue)) {
    return {
      severity: 'info',
      shouldCreateNC: false,
      ncPayload: null,
      message: null,
    }
  }

  const config = question.rule_config
  const min = config.min !== undefined ? config.min : null
  const max = config.max !== undefined ? config.max : null
  const unit = config.unit || ''

  // Vérifier limites
  let isOutOfRange = false
  let rangeMessage = ''

  if (min !== null && numValue < min) {
    isOutOfRange = true
    rangeMessage = `Valeur ${numValue}${unit} inférieure au minimum (${min}${unit})`
  }

  if (max !== null && numValue > max) {
    isOutOfRange = true
    rangeMessage = `Valeur ${numValue}${unit} supérieure au maximum (${max}${unit})`
  }

  if (!isOutOfRange) {
    // Dans les limites → OK
    return {
      severity: 'success',
      shouldCreateNC: false,
      ncPayload: null,
      message: `✓ Dans les normes (${numValue}${unit})`,
    }
  }

  // Hors limites → NC critique automatique
  return {
    severity: 'critical',
    shouldCreateNC: true,
    ncPayload: {
      title: `NC Critique: ${question.label}`,
      description: `Valeur hors limites détectée.\n\nQuestion: ${question.label}\n${rangeMessage}\n\nLimites: ${min !== null ? min : '?'}${unit} - ${max !== null ? max : '?'}${unit}\n\nIntervention immédiate requise.`,
      priority: 'critical',
      deadline: getDeadlineFromCriticality('critical'),
    },
    message: `⚠️ NC critique: hors limites`,
  }
}

/**
 * Calculer deadline selon criticality
 * critical = 24h, high = 7j, medium = 30j, low = 90j
 */
function getDeadlineFromCriticality(criticality) {
  const now = new Date()
  let daysToAdd = 30 // default medium

  switch (criticality) {
    case 'critical':
      daysToAdd = 1 // 24h
      break
    case 'high':
      daysToAdd = 7
      break
    case 'medium':
      daysToAdd = 30
      break
    case 'low':
      daysToAdd = 90
      break
  }

  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + daysToAdd)
  return deadline.toISOString().split('T')[0] // Format YYYY-MM-DD
}

/**
 * Badge couleur selon severity
 */
export function getSeverityColor(severity) {
  const colors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[severity] || colors.info
}

/**
 * Icône selon severity
 */
export function getSeverityIcon(severity) {
  const icons = {
    success: '✓',
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  }
  return icons[severity] || ''
}
