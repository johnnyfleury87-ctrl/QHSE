/**
 * Layout Racine Next.js
 * Source: docs/DESIGN_SYSTEM_QHSE.md
 * Gère: dark mode, meta tags, providers globaux
 */

import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'

export const metadata = {
  title: 'QHSE - Gestion des audits et non-conformités',
  description: 'Application de gestion QHSE: audits, templates, non-conformités, rapports',
  viewport: 'width=device-width, initial-scale=1',
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
