'use client'

/**
 * Theme Provider
 * Gère le dark mode avec persistance localStorage
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 2.1
 */

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => null,
})

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
}) {
  const [theme, setTheme] = useState(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('theme')
    if (stored) {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'

    const resolvedTheme = theme === 'system' ? systemTheme : theme

    if (disableTransitionOnChange) {
      root.style.transition = 'none'
    }

    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    if (disableTransitionOnChange) {
      setTimeout(() => {
        root.style.transition = ''
      }, 0)
    }

    localStorage.setItem('theme', theme)
  }, [theme, mounted, disableTransitionOnChange])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
