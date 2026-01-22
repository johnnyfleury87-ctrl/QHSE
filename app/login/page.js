/**
 * Vue: Login Page
 * Route: /login
 * Source: docs/UI/PLAN_VUES_QHSE.md section B.1
 * SQL: tables auth.users (Supabase Auth), public.profiles
 * RLS: Policy profiles_select_own
 * 
 * Objectif: Connexion Supabase Auth (email/password) pour accès Production
 * Workflow:
 * - Auth OK + profiles.status = 'active' → redirect selon role
 * - Auth OK + profiles.status = 'inactive' → bloquer
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, FormError } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

export default function LoginPage() {
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect to demo if Supabase not configured
  useEffect(() => {
    if (!supabase) {
      router.push('/demo')
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!supabase) {
      setError('Supabase non configuré. Utilisez le mode démo.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      
      // Redirection sera gérée par un middleware ou useEffect dans layout authentifié
      // Pour l'instant, redirection par défaut vers dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      
      if (err.message.includes('désactivé')) {
        setError('Votre compte est désactivé. Contactez un administrateur.')
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect.')
      } else {
        setError('Une erreur est survenue lors de la connexion.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!supabase) {
    return null // Will redirect to demo
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto mt-12">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'accueil
        </Link>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription>
              Entrez vos identifiants pour accéder à l'application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="error">
                  {error}
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" required>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" required>
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                Se connecter
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{' '}
                <Link href="/demo" className="text-primary hover:underline">
                  Essayez le mode démo
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Démo */}
        <Alert variant="info" className="mt-6">
          <p className="text-sm">
            <strong>Mode démo disponible :</strong> Découvrez l'application sans créer de compte
            en utilisant le mode démo avec des données exemples.
          </p>
        </Alert>
      </div>
    </AppShell>
  )
}
