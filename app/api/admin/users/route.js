/**
 * API Route: Gestion utilisateurs (JETC Admin uniquement)
 * Route: POST /api/admin/users
 * Fonction: Créer un nouvel utilisateur Supabase Auth + Profile
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
 * POST: Créer un nouvel utilisateur
 */
export async function POST(request) {
  try {
    // 0. Vérifier configuration
    if (!supabaseAdmin || !supabase) {
      return Response.json({ 
        error: 'Service non configuré (variables env manquantes)' 
      }, { status: 500 })
    }

    // 1. Vérifier authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Extraire le token
    const token = authHeader.replace('Bearer ', '')
    
    // Vérifier le token et récupérer l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    console.log('🔐 API POST /api/admin/users - Auth:', {
      hasAuthHeader: !!authHeader,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })
    
    if (authError || !user) {
      return Response.json({ error: 'Token invalide' }, { status: 401 })
    }

    // 2. Vérifier que l'utilisateur est JETC admin (MÊME RÈGLE QUE FRONT)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, status, is_jetc_admin')
      .eq('id', user.id)
      .single()

    // 🔍 LOG DIAGNOSTIQUE: Voir profil brut AVANT validation
    console.log('🔍 API POST /api/admin/users - PROFIL RAW:', {
      profile: profile,
      profileError: profileError,
      hasProfile: !!profile,
      profileStatus: profile?.status,
      isJetcAdmin: profile?.is_jetc_admin
    })

    // ❗ Vérification 1: profil existe (409 SEULEMENT si vraiment absent)
    if (!profile) {
      console.error('❌ API POST: Profil ABSENT pour user', user.id)
      return Response.json({ 
        error: 'Profil non initialisé - Contactez un administrateur' 
      }, { status: 409 })
    }

    // Si profileError mais profile existe, log warning mais continue
    if (profileError) {
      console.warn('⚠️ API POST: profileError mais profil existe:', profileError.message)
    }

    // ✅ Vérification 2: statut actif
    if (profile.status !== 'active') {
      console.error('❌ API POST: Compte désactivé:', profile.email, 'status=', profile.status)
      return Response.json({ 
        error: 'Compte désactivé - Contactez un administrateur' 
      }, { status: 403 })
    }

    // ✅ Vérification 3: flag JETC admin
    if (profile.is_jetc_admin !== true) {
      console.error('❌ API POST: Pas JETC admin:', profile.email, 'is_jetc_admin=', profile.is_jetc_admin)
      return Response.json({ 
        error: 'Accès refusé: réservé aux administrateurs JETC Solution' 
      }, { status: 403 })
    }

    console.log('✅ API POST /api/admin/users - Autorisé:', user.email)

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
    // 0. Vérifier configuration
    if (!supabaseAdmin || !supabase) {
      return Response.json({ 
        error: 'Service non configuré (variables env manquantes)' 
      }, { status: 500 })
    }

    // 1. Vérifier authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    console.log('🔐 API GET /api/admin/users - Auth:', {
      hasAuthHeader: !!authHeader,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })
    
    if (authError || !user) {
      return Response.json({ error: 'Token invalide' }, { status: 401 })
    }

    // 2. Vérifier que l'utilisateur est JETC admin (MÊME RÈGLE QUE FRONT)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, status, is_jetc_admin')
      .eq('id', user.id)
      .single()

    // 🔍 LOG DIAGNOSTIQUE: Voir profil brut AVANT validation
    console.log('🔍 API GET /api/admin/users - PROFIL RAW:', {
      profile: profile,
      profileError: profileError,
      hasProfile: !!profile,
      profileStatus: profile?.status,
      isJetcAdmin: profile?.is_jetc_admin
    })

    // ❗ Vérification 1: profil existe (409 SEULEMENT si vraiment absent)
    if (!profile) {
      console.error('❌ API GET: Profil ABSENT pour user', user.id)
      return Response.json({ 
        error: 'Profil non initialisé - Contactez un administrateur' 
      }, { status: 409 })
    }

    // Si profileError mais profile existe, log warning mais continue
    if (profileError) {
      console.warn('⚠️ API GET: profileError mais profil existe:', profileError.message)
    }

    // ✅ Vérification 2: statut actif
    if (profile.status !== 'active') {
      console.error('❌ API GET: Compte désactivé:', profile.email, 'status=', profile.status)
      return Response.json({ 
        error: 'Compte désactivé - Contactez un administrateur' 
      }, { status: 403 })
    }

    // ✅ Vérification 3: flag JETC admin
    if (profile.is_jetc_admin !== true) {
      console.error('❌ API GET: Pas JETC admin:', profile.email, 'is_jetc_admin=', profile.is_jetc_admin)
      return Response.json({ 
        error: 'Accès refusé: réservé aux administrateurs JETC Solution' 
      }, { status: 403 })
    }

    console.log('✅ API GET /api/admin/users - Autorisé:', user.email)

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
