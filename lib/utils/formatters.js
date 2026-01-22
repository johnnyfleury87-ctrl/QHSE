/**
 * Utilité: Formatters & Helpers
 * Formatage dates, statuts, badges, etc.
 * Source: docs/UI/PLAN_VUES_QHSE.md (conventions)
 */

// Formatage date FR
export const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Formatage date + heure FR
export const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Labels statuts audits (statut_audit ENUM)
export const auditStatusLabels = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
}

// Labels statuts NC (nc_statut ENUM)
export const ncStatusLabels = {
  ouverte: 'Ouverte',
  en_traitement: 'En traitement',
  resolue: 'Résolue',
  verifiee: 'Vérifiée',
  cloturee: 'Clôturée',
}

// Labels gravité NC (nc_gravite ENUM)
export const ncGravityLabels = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  haute: 'Haute',
  critique: 'Critique',
}

// Labels types NC (nc_type ENUM)
export const ncTypeLabels = {
  securite: 'Sécurité',
  qualite: 'Qualité',
  hygiene: 'Hygiène',
  environnement: 'Environnement',
  autre: 'Autre',
}

// Labels domaines audit (domaine_audit ENUM)
export const domaineLabels = {
  securite: 'Sécurité',
  qualite: 'Qualité',
  hygiene: 'Hygiène',
  environnement: 'Environnement',
  global: 'Global',
}

// Labels statuts templates (statut_template ENUM)
export const templateStatusLabels = {
  brouillon: 'Brouillon',
  actif: 'Actif',
  archive: 'Archivé',
}

// Labels statuts actions (action_statut ENUM)
export const actionStatusLabels = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  terminee: 'Terminée',
  verifiee: 'Vérifiée',
}

// Labels types actions (action_type ENUM)
export const actionTypeLabels = {
  corrective: 'Corrective',
  preventive: 'Préventive',
}

// Labels rôles (role_type ENUM)
export const roleLabels = {
  admin_dev: 'Administrateur Développeur',
  qhse_manager: 'Manager QHSE',
  qh_auditor: 'Auditeur Qualité/Hygiène',
  safety_auditor: 'Auditeur Sécurité',
  viewer: 'Observateur',
}

// Vérifier si NC échue (is_overdue non en DB, calculé côté UI)
export const isNCOverdue = (nc) => {
  if (!nc.due_date || nc.statut === 'cloturee') return false
  return new Date(nc.due_date) < new Date()
}

// Calculer nombre jours restants
export const daysUntilDue = (dueDate) => {
  if (!dueDate) return null
  const today = new Date()
  const due = new Date(dueDate)
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  return diff
}

// Formater taille fichier
export const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

// Calculer taux conformité (reponses.est_conforme)
export const calculateConformityRate = (reponses) => {
  if (!reponses || reponses.length === 0) return 0
  const conformes = reponses.filter((r) => r.est_conforme === true).length
  return Math.round((conformes / reponses.length) * 100)
}
