/**
 * Composant Navigation Header
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 7
 * Affiche: Logo, Navigation (selon rôle), Dark Mode toggle
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function Header({ user, role }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Navigation selon rôle (source: PLAN_VUES_QHSE.md)
  const getNavLinks = () => {
    if (!user) {
      return [
        { href: '/', label: 'Accueil' },
        { href: '/demo', label: 'Mode Démo' },
        { href: '/login', label: 'Connexion' },
      ]
    }

    const baseLinks = [
      { href: '/dashboard', label: 'Tableau de bord' },
    ]

    // Liens selon rôle
    if (role === 'admin_dev' || role === 'qhse_manager') {
      return [
        ...baseLinks,
        { href: '/depots', label: 'Dépôts' },
        { href: '/templates', label: 'Templates' },
        { href: '/audits', label: 'Audits' },
        { href: '/non-conformites', label: 'Non-conformités' },
        { href: '/rapports', label: 'Rapports' },
        ...(role === 'admin_dev' ? [{ href: '/admin/profiles', label: 'Administration' }] : []),
      ]
    }

    if (role === 'qh_auditor' || role === 'safety_auditor') {
      return [
        ...baseLinks,
        { href: '/audits', label: 'Mes audits' },
        { href: '/non-conformites', label: 'NC' },
      ]
    }

    // viewer: lecture seule dashboard
    return baseLinks
  }

  const navLinks = getNavLinks()

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="flex items-center space-x-2 mr-6">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">Q</span>
          </div>
          <span className="font-semibold text-lg">QHSE</span>
        </Link>

        {/* Navigation Desktop */}
        <nav className="hidden md:flex flex-1 items-center space-x-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`
                px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  isActive(link.href)
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions droite */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Changer le thème"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Profil utilisateur */}
          {user && (
            <Link href="/profil">
              <Button variant="ghost" size="sm">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </Button>
            </Link>
          )}

          {/* Menu mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Navigation Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border">
          <nav className="container mx-auto flex flex-col py-4 px-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    isActive(link.href)
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
