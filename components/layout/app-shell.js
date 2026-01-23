/**
 * Layout Principal (AppShell)
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 7
 * Structure: Header + Main Content + Footer optionnel
 */

'use client'

import { Header } from './header'

export function AppShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>QHSE © {new Date().getFullYear()} - Gestion des audits et non-conformités</p>
        </div>
      </footer>
    </div>
  )
}
