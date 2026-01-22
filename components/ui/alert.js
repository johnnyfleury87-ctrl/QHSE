/**
 * Composant Alert (notifications inline)
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 4.7
 * Variants: success, error, info, warning
 */

import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

const alertVariants = {
  success: {
    container: 'bg-success/10 border-success/20 text-success',
    icon: CheckCircle2,
  },
  error: {
    container: 'bg-danger/10 border-danger/20 text-danger',
    icon: AlertCircle,
  },
  warning: {
    container: 'bg-warning/10 border-warning/20 text-warning',
    icon: AlertTriangle,
  },
  info: {
    container: 'bg-info/10 border-info/20 text-info',
    icon: Info,
  },
}

export function Alert({ variant = 'info', title, children, className = '' }) {
  const config = alertVariants[variant]
  const Icon = config.icon

  return (
    <div
      className={`
        rounded-lg border p-4
        ${config.container}
        ${className}
      `}
      role="alert"
    >
      <div className="flex gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 space-y-1">
          {title && (
            <h5 className="font-medium leading-none tracking-tight">
              {title}
            </h5>
          )}
          <div className="text-sm opacity-90">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
