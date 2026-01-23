'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('🚨 ERROR /admin/users:', error)
  }, [error])

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Erreur chargement page utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 p-4 rounded-md">
            <p className="text-sm font-mono text-destructive">
              {error?.message || 'Une erreur inattendue est survenue'}
            </p>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>Causes possibles :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Erreur de connexion à la base de données</li>
              <li>Permissions insuffisantes</li>
              <li>Session expirée</li>
              <li>Erreur de configuration (variables d&apos;environnement)</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => reset()} variant="primary">
              Réessayer
            </Button>
            <Button onClick={() => window.location.href = '/admin'} variant="outline">
              Retour Administration
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Stack trace (dev only)
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-x-auto">
                {error?.stack || 'Aucune stack trace disponible'}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
