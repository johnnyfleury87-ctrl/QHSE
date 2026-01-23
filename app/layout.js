/**
 * Layout Racine Next.js
 * Source: docs/DESIGN_SYSTEM_QHSE.md
 * Gère: dark mode, meta tags, providers globaux, auth context
 */

import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthProvider } from '@/lib/auth-context'
import { DemoBanner } from '@/components/ui/demo-banner'
import { logEnvDiagnostic } from '@/lib/env-diagnostic'

// Log diagnostic au boot (server-side)
logEnvDiagnostic('root-layout-server')

export const metadata = {
  title: 'QHSE - Gestion des audits et non-conformités',
  description: 'Application de gestion QHSE: audits, templates, non-conformités, rapports',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DemoBanner />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
