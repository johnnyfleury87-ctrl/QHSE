/**
 * Composant PageHeader
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 7
 * Structure standard: titre + description + actions
 */

export function PageHeader({ title, description, actions, breadcrumb, children }) {
  return (
    <div className="mb-8 space-y-4">
      {breadcrumb && (
        <nav className="text-sm text-muted-foreground">
          {breadcrumb}
        </nav>
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
