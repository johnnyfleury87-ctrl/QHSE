/**
 * Diagnostic variables d'environnement
 * Logs au boot (server + client) pour déboguer la configuration
 */

export function logEnvDiagnostic(context = 'unknown') {
  const diagnostic = {
    context,
    timestamp: new Date().toISOString(),
    env: {
      DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      isServer: typeof window === 'undefined'
    }
  }

  // Affichage visuel
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  const emoji = isDemo ? '🎭' : '🚀'
  const mode = isDemo ? 'DÉMO' : 'PRODUCTION'
  
  console.log(`\n${emoji} ============================================`)
  console.log(`${emoji} QHSE APP - ${mode}`)
  console.log(`${emoji} Context: ${context}`)
  console.log(`${emoji} ============================================`)
  console.log('📊 Configuration:')
  console.log(`   - DEMO_MODE: ${diagnostic.env.DEMO_MODE}`)
  console.log(`   - Supabase URL: ${diagnostic.env.hasSupabaseUrl ? '✅' : '❌'}`)
  console.log(`   - Anon Key: ${diagnostic.env.hasAnonKey ? '✅' : '❌'}`)
  console.log(`   - Service Role: ${diagnostic.env.hasServiceRoleKey ? '✅' : '❌'}`)
  console.log(`   - Environment: ${diagnostic.env.nodeEnv}`)
  console.log(`   - Side: ${diagnostic.env.isServer ? 'SERVER' : 'CLIENT'}`)
  console.log(`${emoji} ============================================\n`)

  return diagnostic
}
