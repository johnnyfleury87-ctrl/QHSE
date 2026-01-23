/**
 * Composant Navigation Header
 * Source: docs/DESIGN_SYSTEM_QHSE.md section 7
 * Affiche: Logo, Navigation (selon session), Dark Mode toggle, Déconnexion
 */

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Moon, Sun, Menu, LogOut, User } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, profile, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Logs diagnostiques
  console.log('🔝 HEADER render:', {
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
    pathname
  });

  // Navigation selon session et rôle
  const getNavLinks = () => {
    // ❌ PAS DE SESSION: menu public
    if (!user || !profile) {
      console.log('🔝 HEADER: Menu PUBLIC (pas de session)');
      return [
        { href: '/', label: 'Accueil' },
        { href: '/demo', label: 'Mode Démo' },
        { href: '/login', label: 'Connexion' },
      ]
    }

    // ✅ SESSION ACTIVE: menu authentifié
    console.log('🔝 HEADER: Menu AUTHENTIFIÉ (role:', profile.role, ')');
    
    const baseLinks = [
      { href: '/dashboard', label: 'Tableau de bord' },
    ]

    // Liens selon rôle
    if (profile.role === 'admin_dev' || profile.role === 'qhse_manager') {
      return [
        ...baseLinks,
        { href: '/depots', label: 'Dépôts' },
        { href: '/templates', label: 'Templates' },
        { href: '/audits', label: 'Audits' },
        { href: '/non-conformites', label: 'Non-conformités' },
        ...(profile.is_jetc_admin ? [{ href: '/admin', label: 'Administration' }] : []),
      ]
    }

    if (profile.role === 'qh_auditor' || profile.role === 'safety_auditor') {
      return [
        ...baseLinks,
        { href: '/audits', label: 'Mes audits' },
        { href: '/non-conformites', label: 'NC' },
      ]
    }

    // viewer: lecture seule dashboard
    return baseLinks
  }

  const handleLogout = async () => {
    try {
      console.log('🚪 HEADER: Déconnexion...');
      await signOut();
      console.log('✅ HEADER: Déconnexion OK, redirect /');
      router.push('/');
    } catch (error) {
      console.error('❌ HEADER: Erreur déconnexion:', error);
      alert('Erreur lors de la déconnexion');
    }
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
          {/* Infos utilisateur connecté */}
          {user && profile && (
            <div className="hidden md:flex items-center gap-3 mr-2">
              <div className="text-sm text-right">
                <div className="text-muted-foreground text-xs">Connecté en tant que:</div>
                <div className="font-medium">{user.email}</div>
              </div>
            </div>
          )}

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

          {/* Bouton Profil */}
          {user && profile && (
            <Link href="/profil">
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </Button>
            </Link>
          )}

          {/* Bouton Déconnexion */}
          {user && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
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
            {/* Info utilisateur en mobile */}
            {user && profile && (
              <div className="px-3 py-2 mb-2 border-b border-border">
                <div className="text-xs text-muted-foreground">Connecté:</div>
                <div className="font-medium text-sm">{user.email}</div>
              </div>
            )}

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

            {/* Déconnexion en mobile */}
            {user && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
