/**
 * Composants Input / Textarea / Select
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 4.4
 * Focus ring, placeholder muted, gestion erreurs
 */

import { forwardRef } from 'react'

export const Input = forwardRef(
  ({ className = '', error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          flex h-10 w-full rounded-md border border-border
          bg-background px-3 py-2
          text-sm
          placeholder:text-muted-foreground
          focus-ring
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-danger focus:ring-danger' : ''}
          ${className}
        `}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export const Textarea = forwardRef(
  ({ className = '', error = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          flex min-h-[80px] w-full rounded-md border border-border
          bg-background px-3 py-2
          text-sm
          placeholder:text-muted-foreground
          focus-ring
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-danger focus:ring-danger' : ''}
          ${className}
        `}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

export const Select = forwardRef(
  ({ className = '', error = false, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`
          flex h-10 w-full rounded-md border border-border
          bg-background px-3 py-2
          text-sm
          focus-ring
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-danger focus:ring-danger' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'

export function Label({ className = '', required = false, children, ...props }) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-danger ml-1">*</span>}
    </label>
  )
}

export function FormError({ children }) {
  if (!children) return null
  return (
    <p className="text-sm text-danger mt-1">{children}</p>
  )
}
