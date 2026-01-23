/**
 * API Route: Gestion utilisateurs (JETC Admin uniquement)
 * Route: POST /api/admin/users
 * Fonction: Créer un nouvel utilisateur Supabase Auth + Profile
 * Sécurité: Vérifie is_jetc_admin côté serveur
 */

import { createClient } from '@supabase/supabase-js'

// Client Supabase avec service_role key (server-side uniquement)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Client Supabase normal (pour vérification session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * POST: Créer un nouvel utilisateur
 */
export async function POST(request) {
  try {
    // 1. Vérifier authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Extraire le token
    const token = authHeader.replace('Bearer ', '')
    
    // Vérifier le token et récupérer l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return Response.json({ error: 'Token invalide' }, { status: 401 })
    }

    // 2. Vérifier que l'utilisateur est JETC admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_jetc_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_jetc_admin) {
      return Response.json({ 
        error: 'Accès refusé: réservé aux administrateurs JETC Solution' 
      }, { status: 403 })
    }

    // 3. Récupérer les données du formulaire
    const body = await request.json()
    const { email, first_name, last_name, role } = body

    // Validation
    if (!email || !first_name || !last_name || !role) {
      return Response.json({ 
        error: 'Champs obligatoires manquants: email, first_name, last_name, role' 
      }, { status: 400 })
    }

    // Validation email
    if (!email.includes('@')) {
      return Response.json({ error: 'Email invalide' }, { status: 400 })
    }

    // Validation rôle (doit être dans l'ENUM role_type)
    const validRoles = ['admin_dev', 'qhse_manager', 'qh_auditor', 'safety_auditor', 'viewer']
    if (!validRoles.includes(role)) {
      return Response.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    // 4. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'Test1234!', // Mot de passe par défaut (à changer au premier login)
      email_confirm: true, // Auto-confirme l'email (pas d'email d'invitation)
      user_metadata: {
        first_name,
        last_name
      }
    })

    if (createAuthError) {
      console.error('Erreur création auth user:', createAuthError)
      return Response.json({ 
        error: `Erreur création utilisateur: ${createAuthError.message}` 
      }, { status: 400 })
    }

    // 5. Créer le profil dans la table profiles
    const { error: createProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        role,
        status: 'active',
        is_jetc_admin: false // Par défaut, pas JETC admin
      })

    if (createProfileError) {
      console.error('Erreur création profile:', createProfileError)
      
      // Rollback: supprimer l'utilisateur Auth créé
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return Response.json({ 
        error: `Erreur création profil: ${createProfileError.message}` 
      }, { status: 400 })
    }

    // 6. Retourner succès
    return Response.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        first_name,
        last_name,
        role,
        status: 'active'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur API create user:', error)
    return Response.json({ 
      error: 'Erreur serveur interne' 
    }, { status: 500 })
  }
}

/**
 * GET: Liste tous les utilisateurs (JETC admin uniquement)
 */
export async function GET(request) {
  try {
    // 1. Vérifier authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return Response.json({ error: 'Token invalide' }, { status: 401 })
    }

    // 2. Vérifier que l'utilisateur est JETC admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_jetc_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_jetc_admin) {
      return Response.json({ 
        error: 'Accès refusé: réservé aux administrateurs JETC Solution' 
      }, { status: 403 })
    }

    // 3. Récupérer tous les utilisateurs
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Erreur récupération users:', usersError)
      return Response.json({ 
        error: `Erreur récupération utilisateurs: ${usersError.message}` 
      }, { status: 400 })
    }

    return Response.json({ users })

  } catch (error) {
    console.error('Erreur API get users:', error)
    return Response.json({ 
      error: 'Erreur serveur interne' 
    }, { status: 500 })
  }
}
