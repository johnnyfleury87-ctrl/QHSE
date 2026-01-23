/**
 * API Route: Gestion utilisateur individuel (JETC Admin uniquement)
 * Route: PATCH/DELETE /api/admin/users/[id]
 * Fonction: Modifier ou supprimer un utilisateur
 * Sécurité: Vérifie is_jetc_admin côté serveur
 */

import { createClient } from '@supabase/supabase-js'

// ✅ Vérification variables env (évite crash build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Client Supabase avec service_role key (server-side uniquement)
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Client Supabase normal (pour vérification session)
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Helper: Vérifier authentification et permissions JETC admin
 */
async function verifyJETCAdmin(request) {
  // 0. Vérifier configuration
  if (!supabaseAdmin || !supabase) {
    return { error: 'Service non configuré (variables env manquantes)', status: 500 }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'Non authentifié', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return { error: 'Token invalide', status: 401 }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_jetc_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_jetc_admin) {
    return { error: 'Accès refusé: réservé aux administrateurs JETC Solution', status: 403 }
  }

  return { user }
}

/**
 * PATCH: Modifier un utilisateur (rôle, statut, infos)
 */
export async function PATCH(request, { params }) {
  try {
    // 1. Vérifier permissions
    const auth = await verifyJETCAdmin(request)
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = params
    const body = await request.json()
    const { role, status, first_name, last_name } = body

    // Validation: au moins un champ à modifier
    if (!role && !status && !first_name && !last_name) {
      return Response.json({ 
        error: 'Aucune modification spécifiée' 
      }, { status: 400 })
    }

    // Validation rôle si fourni
    if (role) {
      const validRoles = ['admin_dev', 'qhse_manager', 'qh_auditor', 'safety_auditor', 'viewer']
      if (!validRoles.includes(role)) {
        return Response.json({ error: 'Rôle invalide' }, { status: 400 })
      }
    }

    // Validation statut si fourni
    if (status && !['active', 'inactive'].includes(status)) {
      return Response.json({ error: 'Statut invalide (active ou inactive)' }, { status: 400 })
    }

    // Protection: empêcher modification de son propre profil
    if (id === auth.user.id) {
      return Response.json({ 
        error: 'Impossible de modifier son propre profil' 
      }, { status: 403 })
    }

    // 2. Construire l'objet de mise à jour
    const updates = {}
    if (role) updates.role = role
    if (status) updates.status = status
    if (first_name) updates.first_name = first_name
    if (last_name) updates.last_name = last_name
    updates.updated_at = new Date().toISOString()

    // 3. Mettre à jour le profil
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour profile:', error)
      return Response.json({ 
        error: `Erreur mise à jour: ${error.message}` 
      }, { status: 400 })
    }

    return Response.json({ 
      success: true,
      user: data
    })

  } catch (error) {
    console.error('Erreur API update user:', error)
    return Response.json({ 
      error: 'Erreur serveur interne' 
    }, { status: 500 })
  }
}

/**
 * DELETE: Supprimer un utilisateur (hard delete)
 * ⚠️ Recommandation: préférer soft delete (status = 'inactive')
 */
export async function DELETE(request, { params }) {
  try {
    // 1. Vérifier permissions
    const auth = await verifyJETCAdmin(request)
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
        return Response.json({ 
          error: 'Impossible de supprimer le dernier administrateur JETC' 
        }, { status: 403 })
      }
    }

    // 2. Supprimer l'utilisateur Auth (cascade sur profiles via FK)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authDeleteError) {
      console.error('Erreur suppression auth user:', authDeleteError)
      return Response.json({ 
        error: `Erreur suppression utilisateur: ${authDeleteError.message}` 
      }, { status: 400 })
    }

    // 3. Supprimer le profil (normalement cascade, mais on force)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)

    return Response.json({ 
      success: true,
      message: 'Utilisateur supprimé avec succès'
    })

  } catch (error) {
    console.error('Erreur API delete user:', error)
    return Response.json({ 
      error: 'Erreur serveur interne' 
    }, { status: 500 })
  }
}
