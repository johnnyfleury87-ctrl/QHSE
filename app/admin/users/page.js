/**
 * Vue: Liste des utilisateurs (CRUD)
 * Route: /admin/users
 * Objectif: Gérer les utilisateurs (créer, modifier rôle/statut, désactiver)
 * Sécurité: Layout guard vérifie is_jetc_admin
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/loading-states'
import { PageHeader } from '@/components/layout/page-header'
import { Users, Plus, Search, Edit, UserX, UserCheck } from 'lucide-react'

export default function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // 🔍 LOG DIAGNOSTIQUE
  useEffect(() => {
    console.log('👥 ADMIN USERS PAGE render:', {
      hasUser: !!user,
      loading,
      hasError: !!error,
      usersCount: users.length,
      filteredCount: filteredUsers.length,
      showModal: showCreateModal
    })
  }, [user, loading, error, users, filteredUsers, showCreateModal])

  // ✅ Déclaration AVANT utilisation (évite TDZ)
  const filterUsers = useCallback(() => {
    let filtered = [...users]

    // Filtre par recherche (email, nom, prénom)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.first_name.toLowerCase().includes(query) ||
          u.last_name.toLowerCase().includes(query)
      )
    }

    // Filtre par rôle
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter)
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchQuery, roleFilter, statusFilter])

  // ✅ useEffect APRÈS déclaration de filterUsers
  useEffect(() => {
    filterUsers()
  }, [filterUsers])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!supabase) {
        throw new Error('Supabase non configuré')
      }

      // Récupérer le token pour l'API
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Non authentifié')
      }

      // Appeler l'API pour récupérer les utilisateurs
      console.log('🔍 Fetch /api/admin/users avec credentials...')
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        credentials: 'include', // ⚠️ CRITICAL: Envoie les cookies Supabase
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur récupération utilisateurs')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Erreur chargement users:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin_dev':
        return 'danger'
      case 'qhse_manager':
        return 'primary'
      case 'qh_auditor':
        return 'success'
      case 'safety_auditor':
        return 'warning'
      case 'viewer':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getRoleLabel = (role) => {
    const labels = {
      admin_dev: 'Admin Dev',
      qhse_manager: 'QHSE Manager',
      qh_auditor: 'Auditeur QH',
      safety_auditor: 'Auditeur Sécurité',
      viewer: 'Viewer',
    }
    return labels[role] || role
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Non authentifié')
      }

      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur modification statut')
      }

      // Recharger la liste
      await loadUsers()
    } catch (err) {
      console.error('Erreur toggle status:', err)
      alert(`Erreur: ${err.message}`)
    }
  }

  return (
    <>
      <PageHeader
        title="Gestion des utilisateurs"
        description="Créez et gérez les utilisateurs de la plateforme"
        action={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un utilisateur
          </Button>
        }
      />

      {/* Filtres */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher (email, nom...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtre rôle */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin_dev">Admin Dev</option>
              <option value="qhse_manager">QHSE Manager</option>
              <option value="qh_auditor">Auditeur QH</option>
              <option value="safety_auditor">Auditeur Sécurité</option>
              <option value="viewer">Viewer</option>
            </select>

            {/* Filtre statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* États */}
      {loading && <LoadingState message="Chargement des utilisateurs..." />}

      {error && (
        <ErrorState message={`Erreur: ${error}`} onRetry={loadUsers} />
      )}

      {!loading && !error && filteredUsers.length === 0 && (
        <EmptyState
          icon={Users}
          title="Aucun utilisateur trouvé"
          description="Aucun utilisateur ne correspond à vos critères de recherche."
        />
      )}

      {/* Table utilisateurs */}
      {!loading && !error && filteredUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Nom complet
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Rôle
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Statut
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Date création
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getRoleBadgeVariant(u.role)}>
                          {getRoleLabel(u.role)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={u.status === 'active' ? 'success' : 'secondary'}>
                          {u.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUserStatus(u.id, u.status)}
                          disabled={u.id === user?.id}
                          title={
                            u.id === user?.id
                              ? 'Impossible de modifier son propre statut'
                              : u.status === 'active'
                              ? 'Désactiver'
                              : 'Activer'
                          }
                        >
                          {u.status === 'active' ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal création utilisateur */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadUsers()
          }}
        />
      )}
    </>
  )
}

/**
 * Composant: Modal création utilisateur
 */
function CreateUserModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'viewer',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      // Validation
      if (!formData.email || !formData.first_name || !formData.last_name || !formData.role) {
        throw new Error('Tous les champs sont obligatoires')
      }

      if (!formData.email.includes('@')) {
        throw new Error('Email invalide')
      }

      // Récupérer le token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Non authentifié')
      }

      // Appeler l'API
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur création utilisateur')
      }

      // Succès
      onSuccess()
    } catch (err) {
      console.error('Erreur création user:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Créer un utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            {/* Prénom */}
            <div>
              <label className="block text-sm font-medium mb-1">Prénom *</label>
              <Input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Jean"
                required
              />
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium mb-1">Nom *</label>
              <Input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Dupont"
                required
              />
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-sm font-medium mb-1">Rôle *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                required
              >
                <option value="viewer">Viewer (lecture seule)</option>
                <option value="qh_auditor">Auditeur QH</option>
                <option value="safety_auditor">Auditeur Sécurité</option>
                <option value="qhse_manager">QHSE Manager</option>
                <option value="admin_dev">Admin Dev</option>
              </select>
            </div>

            {/* Info mot de passe */}
            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
              ℹ️ Mot de passe par défaut: <strong>Test1234!</strong>
              <br />
              L&apos;utilisateur pourra le changer à sa première connexion.
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
