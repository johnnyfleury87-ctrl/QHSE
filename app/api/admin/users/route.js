/**
 * API Route: Gestion utilisateurs (JETC Admin uniquement)
 * Route: POST /api/admin/users
 * Fonction: Créer un nouvel utilisateur Supabase Auth + Profile
 * Sécurité: Vérifie is_jetc_admin côté serveur
 */

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * POST: Créer un nouvel utilisateur
 */
export async function POST(request) {
  try {
    // 1. Créer client Supabase avec cookies (session serveur)
    const supabase = createSupabaseServerClient()
    
    // 2. Récupérer la session utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔐 API POST /api/admin/users - Session:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (authError || !user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 3. Vérifier le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, status, is_jetc_admin')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profil non initialisé' }, { status: 409 })
    }

    if (profile.status !== 'active') {
      return Response.json({ error: 'Compte désactivé' }, { status: 403 })
    }

    if (profile.is_jetc_admin !== true) {
      return Response.json({ error: 'Accès refusé: réservé aux administrateurs JETC Solution' }, { status: 403 })
    }

    console.log('✅ API POST - Autorisé:', user.email)

    // 4. Récupérer les données du formulaire
    const body = await request.json()
    const { email, first_name, last_name, role } = body

    // Validation
    if (!email || !first_name || !last_name || !role) {
      return Response.json({ 
        error: 'Champs obligatoires manquants: email, first_name, last_name, role' 
      }, { status: 400 })
    }

    if (!email.includes('@')) {
      return Response.json({ error: 'Email invalide' }, { status: 400 })
    }

    // Validation rôle
    const validRoles = ['admin_dev', 'qhse_manager', 'qh_auditor', 'safety_auditor', 'viewer']
    if (!validRoles.includes(role)) {
      return Response.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    // 5. Créer l'utilisateur avec client Admin
    const supabaseAdmin = createSupabaseAdminClient()
    
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'Test1234!',
      email_confirm: true,
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

    // 6. Créer le profil
    const { error: createProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        role,
        status: 'active',
        is_jetc_admin: false
      })

    if (createProfileError) {
      console.error('Erreur création profile:', createProfileError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return Response.json({ 
        error: `Erreur création profil: ${createProfileError.message}` 
      }, { status: 400 })
    }

    // 7. Retourner succès
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
    console.log('🚀 API GET /api/admin/users - DÉBUT')
    
    // 1. Créer client Supabase avec cookies (session serveur)
    const supabase = createSupabaseServerClient()
    
    // 2. Récupérer la session utilisateur depuis les cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔐 API GET /api/admin/users - Session:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })
    
    if (authError || !user) {
      console.error('❌ Pas de session valide')
      return Response.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 3. Vérifier le profil de l'utilisateur connecté
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, status, is_jetc_admin')
      .eq('id', user.id)
      .single()

    console.log('🔍 API GET /api/admin/users - PROFIL:', {
      profile: profile,
      profileError: profileError
    })

    // Vérifications
    if (!profile) {
      console.error('❌ Profil ABSENT pour user', user.id)
      return Response.json({ 
        error: 'Profil non initialisé - Contactez un administrateur' 
      }, { status: 409 })
    }

    if (profileError) {
      console.warn('⚠️ profileError mais profil existe:', profileError.message)
    }

    if (profile.status !== 'active') {
      console.error('❌ Compte désactivé:', profile.email)
      return Response.json({ 
        error: 'Compte désactivé - Contactez un administrateur' 
      }, { status: 403 })
    }

    if (profile.is_jetc_admin !== true) {
      console.error('❌ Pas JETC admin:', profile.email)
      return Response.json({ 
        error: 'Accès refusé: réservé aux administrateurs JETC Solution' 
      }, { status: 403 })
    }

    console.log('✅ API GET /api/admin/users - Autorisé:', user.email)

    // 4. Récupérer tous les utilisateurs avec client Admin
    console.log('🔍 Récupération liste users avec service_role...')
    const supabaseAdmin = createSupabaseAdminClient()
    
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, role, status, is_jetc_admin, created_at, updated_at')
      .order('created_at', { ascending: false })

    console.log('🔍 Résultat:', {
      usersCount: users?.length || 0,
      hasError: !!usersError,
      errorMessage: usersError?.message
    })

    if (usersError) {
      console.error('❌ Erreur récupération users:', usersError)
      return Response.json({ 
        error: `Erreur récupération utilisateurs: ${usersError.message}` 
      }, { status: 400 })
    }

    console.log('✅ Liste users récupérée:', users?.length || 0, 'utilisateurs')
    return Response.json({ users: users || [] })

  } catch (error) {
    console.error('Erreur API get users:', error)
    return Response.json({ 
      error: 'Erreur serveur interne' 
    }, { status: 500 })
  }
}
