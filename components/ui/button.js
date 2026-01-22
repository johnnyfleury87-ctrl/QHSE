/**
 * Composant Button
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 4.1
 * Variants: primary, secondary, outline, ghost, danger
 * États: hover, focus, disabled, loading
 */

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const buttonVariants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-transparent hover:bg-muted',
  ghost: 'hover:bg-muted hover:text-foreground',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
}

const buttonSizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 py-2',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
}

export const Button = forwardRef(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-md font-medium
          focus-ring
          disabled:opacity-50 disabled:pointer-events-none
          transition-all duration-200
          ${buttonVariants[variant]}
          ${buttonSizes[size]}
          ${className}
        `}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
