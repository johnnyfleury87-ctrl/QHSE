/**
 * Composant Table
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 4.5
 * Features: header lisible, hover row, empty state intégré
 */

import { EmptyState } from './loading-states'

export function Table({ className = '', children, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className = '', children, ...props }) {
  return (
    <thead
      className={`border-b border-border ${className}`}
      {...props}
    >
      {children}
    </thead>
  )
}

export function TableBody({ className = '', empty = false, emptyMessage, children, ...props }) {
  if (empty) {
    return (
      <tbody>
        <tr>
          <td colSpan={100}>
            <EmptyState
              title="Aucune donnée"
              description={emptyMessage || "La liste est vide"}
            />
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className = '', clickable = false, ...props }) {
  return (
    <tr
      className={`
        border-b border-border transition-colors
        hover:bg-muted/50
        ${clickable ? 'cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    />
  )
}

export function TableHead({ className = '', ...props }) {
  return (
    <th
      className={`
        h-12 px-4 text-left align-middle font-medium
        text-muted-foreground
        ${className}
      `}
      {...props}
    />
  )
}

export function TableCell({ className = '', ...props }) {
  return (
    <td
      className={`p-4 align-middle ${className}`}
      {...props}
    />
  )
}
