#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC}  $1"; }
warn() { echo -e "${YELLOW}WARN${NC}  $1"; }
fail() { echo -e "${RED}FAIL${NC}  $1"; }

FAILED=0

echo "== HealthFlux Predeploy Check =="

if [[ ! -f .env ]]; then
  fail ".env not found"
  FAILED=1
else
  pass ".env found"
fi

required_vars=(
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "OPENROUTER_API_KEY"
  "VITE_DB_PROVIDER"
  "VITE_API_URL"
)

for key in "${required_vars[@]}"; do
  if grep -qE "^${key}=" .env; then
    value="$(grep -E "^${key}=" .env | tail -n1 | cut -d'=' -f2-)"
    if [[ -z "$value" || "$value" == *"YOUR_"* || "$value" == *"xxx"* || "$value" == *"example.com"* ]]; then
      fail "$key is placeholder/empty"
      FAILED=1
    else
      pass "$key set"
    fi
  else
    fail "$key missing"
    FAILED=1
  fi
done

if grep -qE "^VITE_SUPABASE_STORAGE_BUCKET=" .env; then
  pass "VITE_SUPABASE_STORAGE_BUCKET set"
else
  warn "VITE_SUPABASE_STORAGE_BUCKET not set (fallback buckets uploads/documents will be used)"
fi

if [[ -f "supabase/migrations/007_fix_recursive_rls_policies.sql" ]]; then
  warn "Migration 007 exists. Ensure it is applied in Supabase SQL editor before go-live."
else
  warn "Migration 007 file not found (skip if already applied manually)."
fi

echo "== Static Checks =="

if npm run lint >/dev/null 2>&1; then
  pass "lint"
else
  fail "lint"
  FAILED=1
fi

if npm run typecheck >/dev/null 2>&1; then
  pass "typecheck"
else
  fail "typecheck"
  FAILED=1
fi

if npm run build >/dev/null 2>&1; then
  pass "build"
else
  fail "build"
  FAILED=1
fi

echo "== Result =="
if [[ "$FAILED" -eq 0 ]]; then
  pass "Predeploy checks passed"
  exit 0
fi

fail "Predeploy checks failed"
exit 1
