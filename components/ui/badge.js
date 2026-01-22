/**
 * Composant Badge (Statuts)
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 4.3 + PLAN_VUES_QHSE.md
 * Gère les statuts: audits, NC, templates, actions, etc.
 */

const badgeVariants = {
  // Statuts audits (statut_audit ENUM)
  planifie: 'bg-warning/10 text-warning border-warning/20',
  en_cours: 'bg-info/10 text-info border-info/20',
  termine: 'bg-success/10 text-success border-success/20',
  annule: 'bg-muted text-muted-foreground border-border',

  // Statuts NC (nc_statut ENUM)
  ouverte: 'bg-danger/10 text-danger border-danger/20',
  en_traitement: 'bg-info/10 text-info border-info/20',
  resolue: 'bg-warning/10 text-warning border-warning/20',
  verifiee: 'bg-success/10 text-success border-success/20',
  cloturee: 'bg-muted text-muted-foreground border-border',

  // Gravité NC (nc_gravite ENUM)
  faible: 'bg-success/10 text-success border-success/20',
  moyenne: 'bg-warning/10 text-warning border-warning/20',
  haute: 'bg-danger/10 text-danger border-danger/20',
  critique: 'bg-danger text-white border-danger',

  // Statuts templates
  brouillon: 'bg-muted text-muted-foreground border-border',
  actif: 'bg-success/10 text-success border-success/20',
  archive: 'bg-muted text-muted-foreground border-border',

  // Statuts actions
  a_faire: 'bg-muted text-muted-foreground border-border',
  terminee: 'bg-success/10 text-success border-success/20',

  // Génériques
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  default: 'bg-muted text-foreground border-border',
}

export function Badge({ variant = 'default', className = '', children, ...props }) {
  return (
    <span
      className={`
        inline-flex items-center rounded-md border px-2.5 py-0.5
        text-xs font-semibold
        transition-colors
        ${badgeVariants[variant] || badgeVariants.default}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}
