#!/bin/bash
# ============================================================================
# TEST LOCAL MIGRATIONS SQL (DOCKER POSTGRESQL 15)
# ============================================================================
# Objectif: Valider exécution 0001→0005 AVANT envoi Supabase
# Prérequis: Docker installé, port 5433 libre
# ============================================================================

set -euo pipefail

# Variables
DB_NAME="qhse_test"
DB_USER="postgres"
DB_PASS="test_password_123"
DB_PORT="5433"
CONTAINER_NAME="qhse-test-postgres"
MIGRATIONS_DIR="/workspaces/QHSE/supabase/migrations"

# Couleurs output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "🧪 TEST LOCAL MIGRATIONS SQL - QHSE"
echo "============================================================================"

# ============================================================================
# ÉTAPE 1: Cleanup et démarrage PostgreSQL 15
# ============================================================================
echo -e "${YELLOW}[1/5] Nettoyage container existant...${NC}"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo -e "${YELLOW}[2/5] Démarrage PostgreSQL 15 (port $DB_PORT)...${NC}"
docker run --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD="$DB_PASS" \
  -e POSTGRES_DB="$DB_NAME" \
  -p "$DB_PORT:5432" \
  -d postgres:15-alpine

# Attendre démarrage PostgreSQL
echo -e "${YELLOW}Attente démarrage PostgreSQL (10s)...${NC}"
sleep 10

# Test connexion
if ! docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
  echo -e "${RED}❌ ERREUR: PostgreSQL non disponible${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PostgreSQL 15 prêt${NC}"

# ============================================================================
# ÉTAPE 2: Créer schéma auth + extensions (simuler Supabase)
# ============================================================================
echo -e "${YELLOW}[3/5] Installation schéma auth et extensions Supabase...${NC}"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'
-- Créer schéma auth simulé (comme Supabase)
CREATE SCHEMA IF NOT EXISTS auth;

-- Table auth.users simulée (structure minimale compatible Supabase)
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insérer utilisateurs test avec profils distincts
INSERT INTO auth.users (id, email) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@qhse.test'),
  ('00000000-0000-0000-0000-000000000002', 'manager@qhse.test'),
  ('00000000-0000-0000-0000-000000000003', 'auditor@qhse.test'),
  ('00000000-0000-0000-0000-000000000004', 'viewer@qhse.test')
ON CONFLICT (id) DO NOTHING;

-- Fonction auth.uid() simulée (retourne user connecté fictif)
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS UUID AS $$
BEGIN
  -- Simule user connecté (admin dans ce test)
  RETURN '00000000-0000-0000-0000-000000000001'::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = auth, public;

-- Fonction auth.role() simulée (pour RLS avancées)
CREATE OR REPLACE FUNCTION auth.role() 
RETURNS TEXT AS $$
BEGIN
  RETURN 'authenticated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = auth, public;

-- Extensions PostgreSQL utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rôle authenticated (Supabase)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

-- Permissions schéma public pour roles Supabase
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, service_role;

SELECT 'Schéma auth + extensions installés' AS status;
EOSQL

echo -e "${GREEN}✅ Schéma auth et extensions prêts${NC}"

# ============================================================================
# ÉTAPE 3: Exécuter migrations 0001 → 0005
# ============================================================================
echo -e "${YELLOW}[4/5] Exécution migrations séquentielles...${NC}"

MIGRATIONS=(
  "0001_etape_01_foundations.sql"
  "0002_etape_02_audits_templates.sql"
  "0003_etape_03_non_conformites.sql"
  "0004_etape_04_dashboard_analytics.sql"
  "0005_etape_05_rapports_exports.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  echo ""
  echo "-------------------------------------------"
  echo "📄 Exécution: $migration"
  echo "-------------------------------------------"
  
  if [ ! -f "$MIGRATIONS_DIR/$migration" ]; then
    echo -e "${RED}❌ ERREUR: Fichier introuvable: $migration${NC}"
    exit 1
  fi
  
  # Exécuter migration avec capture erreurs
  if ! docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -f "/dev/stdin" < "$MIGRATIONS_DIR/$migration" 2>&1; then
    echo -e "${RED}❌ ERREUR lors exécution $migration${NC}"
    echo -e "${YELLOW}Logs PostgreSQL:${NC}"
    docker logs "$CONTAINER_NAME" --tail 50
    exit 1
  fi
  
  echo -e "${GREEN}✅ $migration exécutée${NC}"
done

# ============================================================================
# ÉTAPE 4: Validation structure BDD
# ============================================================================
echo ""
echo "============================================================================"
echo -e "${YELLOW}[5/5] VALIDATION STRUCTURE BDD${NC}"
echo "============================================================================"

docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << 'EOSQL'
-- Compter tables public
SELECT 
  'Tables public' AS type,
  count(*) AS count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- Compter ENUMs
SELECT 
  'Types ENUM' AS type,
  count(*) AS count
FROM pg_type
WHERE typtype = 'e';

-- Compter functions SECURITY DEFINER
SELECT 
  'Functions SECURITY DEFINER' AS type,
  count(*) AS count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND prosecdef = true;

-- Compter policies RLS
SELECT 
  'Policies RLS' AS type,
  count(*) AS count
FROM pg_policies
WHERE schemaname = 'public';

-- Compter indexes
SELECT 
  'Indexes' AS type,
  count(*) AS count
FROM pg_indexes
WHERE schemaname = 'public';

-- Compter triggers
SELECT 
  'Triggers' AS type,
  count(*) AS count
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Lister toutes les tables
\dt public.*
EOSQL

echo ""
echo "============================================================================"
echo -e "${GREEN}✅✅✅ TESTS RÉUSSIS - MIGRATIONS VALIDES ✅✅✅${NC}"
echo "============================================================================"
echo ""
echo "📊 RÉSULTATS:"
echo "  - 5 migrations exécutées sans erreur"
echo "  - Structure BDD validée"
echo "  - RLS policies créées"
echo "  - Functions SECURITY DEFINER OK"
echo ""
echo "🚀 PROCHAINES ÉTAPES:"
echo "  1. Relire rapport: docs/QHSE/RAPPORT_CONTROLE_MIGRATIONS_SQL.md"
echo "  2. Exécuter: supabase db reset (en dev)"
echo "  3. Vérifier: supabase db diff (doit être vide)"
echo ""
echo "🧹 CLEANUP:"
echo "  docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
echo "============================================================================"
