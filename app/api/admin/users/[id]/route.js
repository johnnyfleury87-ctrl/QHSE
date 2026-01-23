/**
 * API Route: Gestion utilisateur individuel (JETC Admin uniquement)
 * Route: PATCH/DELETE /api/admin/users/[id]
 * Fonction: Modifier ou supprimer un utilisateur
 * Sécurité: Vérifie is_jetc_admin côté serveur
 */

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * Helper: Vérifier authentification et permissions JETC admin
 */
async function verifyJETCAdmin() {
  const supabase = createSupabaseServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Non authentifié', status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, status, is_jetc_admin')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profil non initialisé', status: 409 }
  }

  if (profile.status !== 'active') {
    return { error: 'Compte désactivé', status: 403 }
  }

  if (profile.is_jetc_admin !== true) {
    return { error: 'Accès refusé: réservé aux administrateurs JETC Solution', status: 403 }
  }

  return { user }
}

/**
 * PATCH: Modifier un utilisateur (rôle, statut, infos)
 */
export async function PATCH(request, { params }) {
  try {
    const auth = await verifyJETCAdmin()
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = params
    const body = await request.json()
    const { role, status, first_name, last_name } = body

    if (!role && !status && !first_name && !last_name) {
      return Response.json({ error: 'Aucune modification spécifiée' }, { status: 400 })
    }

    if (role) {
      const validRoles = ['admin_dev', 'qhse_manager', 'qh_auditor', 'safety_auditor', 'viewer']
      if (!validRoles.includes(role)) {
        return Response.json({ error: 'Rôle invalide' }, { status: 400 })
      }
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return Response.json({ error: 'Statut invalide' }, { status: 400 })
    }

    if (id === auth.user.id) {
      return Response.json({ 
        error: 'Impossible de modifier son propre profil' 
      }, { status: 403 })
    }

    const updates = {}
    if (role) updates.role = role
    if (status) updates.status = status
    if (first_name) updates.first_name = first_name
    if (last_name) updates.last_name = last_name
    updates.updated_at = new Date().toISOString()

    const supabaseAdmin = createSupabaseAdminClient()
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour profile:', error)
      return Response.json({ error: `Erreur mise à jour: ${error.message}` }, { status: 400 })
    }

    return Response.json({ success: true, user: data })

  } catch (error) {
    console.error('Erreur API update user:', error)
    return Response.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await verifyJETCAdmin()
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = params

    // Protection: empêcher suppression de son propre profil
    if (id === auth.user.id) {
      return Response.json({ 
        error: 'Impossible de supprimer son propre profil' 
      }, { status: 403 })
    }

    // Protection: vérifier si c'est le dernier JETC admin
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_jetc_admin')
      .eq('id', id)
      .single()

    if (targetProfile?.is_jetc_admin) {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_jetc_admin', true)

      if (count === 1) {
        return Response.json({ error: 'Impossible de supprimer le dernier administrateur JETC' }, { status: 403 })
      }
    }

    const supabaseAdmin = createSupabaseAdminClient()
    
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authDeleteError) {
      console.error('Erreur suppression auth user:', authDeleteError)
      return Response.json({ error: `Erreur suppression utilisateur: ${authDeleteError.message}` }, { status: 400 })
    }

    await supabaseAdmin.from('profiles').delete().eq('id', id)

    return Response.json({ success: true, message: 'Utilisateur supprimé avec succès' })

  } catch (error) {
    console.error('Erreur API delete user:', error)
    return Response.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}