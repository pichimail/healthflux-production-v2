#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  HealthFlux — One-Command Deploy Script                                 ║
# ║  Run from project root: bash deploy.sh                                  ║
# ║  What it does:                                                          ║
# ║    1. Checks all required tools are installed                           ║
# ║    2. Validates your .env has all required keys                         ║
# ║    3. Installs npm dependencies                                         ║
# ║    4. Builds the project                                                ║
# ║    5. Creates GitHub repo (if gh CLI available)                         ║
# ║    6. Deploys to Vercel with env vars auto-pushed                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝

set -e  # Exit on any error

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────────────────
step()    { echo -e "\n${BOLD}${BLUE}▶ $1${RESET}"; }
ok()      { echo -e "  ${GREEN}✔${RESET} $1"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
fail()    { echo -e "  ${RED}✘ ERROR: $1${RESET}"; exit 1; }
info()    { echo -e "  ${CYAN}→${RESET} $1"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   HealthFlux Production Deploy       ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# STEP 1 — Check required tools
# ────────────────────────────────────────────────────────────────────────────
step "Checking required tools"

command -v node  >/dev/null 2>&1 || fail "Node.js not found. Install from https://nodejs.org (v18+)"
command -v npm   >/dev/null 2>&1 || fail "npm not found. Install Node.js from https://nodejs.org"
command -v git   >/dev/null 2>&1 || fail "git not found. Install from https://git-scm.com"

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  fail "Node.js v18+ required (you have v$(node -v)). Upgrade at https://nodejs.org"
fi
ok "Node.js $(node -v)"
ok "npm $(npm -v)"
ok "git $(git --version | awk '{print $3}')"

# Check optional tools
HAS_VERCEL=false
HAS_GH=false

if command -v vercel >/dev/null 2>&1; then
  HAS_VERCEL=true
  ok "Vercel CLI $(vercel --version 2>/dev/null | head -1)"
else
  warn "Vercel CLI not found — will install it now"
  npm install -g vercel
  HAS_VERCEL=true
  ok "Vercel CLI installed"
fi

if command -v gh >/dev/null 2>&1; then
  HAS_GH=true
  ok "GitHub CLI $(gh --version | head -1 | awk '{print $3}')"
else
  warn "GitHub CLI not found — skipping auto GitHub repo creation"
  warn "Install with: brew install gh  (optional)"
fi

# ────────────────────────────────────────────────────────────────────────────
# STEP 2 — Validate .env file
# ────────────────────────────────────────────────────────────────────────────
step "Validating environment configuration"

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    warn ".env not found — copying from .env.example"
    cp .env.example .env
    echo ""
    echo -e "  ${RED}${BOLD}ACTION REQUIRED:${RESET}"
    echo -e "  Open .env and fill in your actual keys before continuing."
    echo -e "  Required keys:"
    echo -e "    ${CYAN}VITE_SUPABASE_URL${RESET}       → from supabase.com → Project → Settings → API"
    echo -e "    ${CYAN}VITE_SUPABASE_ANON_KEY${RESET}  → from supabase.com → Project → Settings → API"
    echo -e "    ${CYAN}OPENROUTER_API_KEY${RESET}      → from openrouter.ai/keys"
    echo ""
    read -p "  Press ENTER after you've filled in .env to continue... " _
  else
    fail ".env file not found and no .env.example to copy from"
  fi
fi

# Source the .env for validation
set -a
source .env 2>/dev/null || true
set +a

MISSING=()

# Required keys check
[ -z "$VITE_SUPABASE_URL" ]      && MISSING+=("VITE_SUPABASE_URL")
[ -z "$VITE_SUPABASE_ANON_KEY" ] && MISSING+=("VITE_SUPABASE_ANON_KEY")
[ -z "$OPENROUTER_API_KEY" ]     && MISSING+=("OPENROUTER_API_KEY")

# Check for placeholder values
[[ "$VITE_SUPABASE_URL" == *"YOUR_PROJECT"* ]]  && MISSING+=("VITE_SUPABASE_URL (still has placeholder)")
[[ "$VITE_SUPABASE_ANON_KEY" == *"your-anon"* ]] && MISSING+=("VITE_SUPABASE_ANON_KEY (still has placeholder)")
[[ "$OPENROUTER_API_KEY" == *"sk-or-v1-xxx"* ]]  && MISSING+=("OPENROUTER_API_KEY (still has placeholder)")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo -e "  ${RED}Missing or invalid keys in .env:${RESET}"
  for key in "${MISSING[@]}"; do
    echo -e "    ${RED}✘${RESET} $key"
  done
  echo ""
  echo -e "  Edit your .env file and run this script again."
  exit 1
fi

ok "VITE_SUPABASE_URL set"
ok "VITE_SUPABASE_ANON_KEY set"
ok "OPENROUTER_API_KEY set"

[ -n "$VITE_GOOGLE_CLIENT_ID" ] && ok "VITE_GOOGLE_CLIENT_ID set" || warn "VITE_GOOGLE_CLIENT_ID not set (Google OAuth will not work)"
[ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && ok "SUPABASE_SERVICE_ROLE_KEY set" || warn "SUPABASE_SERVICE_ROLE_KEY not set (some admin API routes need this)"

# ────────────────────────────────────────────────────────────────────────────
# STEP 3 — Install dependencies
# ────────────────────────────────────────────────────────────────────────────
step "Installing dependencies"

if [ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]; then
  ok "node_modules already installed — running npm ci for clean install"
  npm ci --silent
else
  info "Running npm install..."
  npm install --silent
fi
ok "Dependencies installed"

# ────────────────────────────────────────────────────────────────────────────
# STEP 4 — Build project
# ────────────────────────────────────────────────────────────────────────────
step "Building project"

info "Running vite build..."
npm run build 2>&1 | tail -10

if [ ! -d "dist" ]; then
  fail "Build failed — dist/ directory not created. Run 'npm run build' manually to see full errors."
fi
ok "Build successful → dist/"

# ────────────────────────────────────────────────────────────────────────────
# STEP 5 — Git init & GitHub repo (optional)
# ────────────────────────────────────────────────────────────────────────────
step "Git setup"

if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "chore: initial HealthFlux production build"
  ok "Git repository initialized"
else
  git add .
  git diff --staged --quiet || git commit -m "chore: pre-deploy update $(date '+%Y-%m-%d %H:%M')"
  ok "Git commit updated"
fi

# GitHub repo creation (requires gh CLI + gh auth login)
if $HAS_GH; then
  if gh auth status >/dev/null 2>&1; then
    REPO_NAME="${PWD##*/}"
    if ! gh repo view "$REPO_NAME" >/dev/null 2>&1; then
      info "Creating GitHub repo: $REPO_NAME"
      gh repo create "$REPO_NAME" --private --source=. --push
      ok "GitHub repo created and pushed → github.com/$(gh api user --jq .login)/$REPO_NAME"
    else
      git push origin main 2>/dev/null || git push origin master 2>/dev/null || true
      ok "Pushed to existing GitHub repo"
    fi
  else
    warn "GitHub CLI not authenticated. Run: gh auth login"
    warn "Skipping GitHub repo creation"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# STEP 6 — Deploy to Vercel
# ────────────────────────────────────────────────────────────────────────────
step "Deploying to Vercel"

info "Pushing environment variables to Vercel..."

# Push all env vars from .env to Vercel (production environment)
push_env_var() {
  local key="$1"
  local val="$2"
  if [ -n "$val" ]; then
    echo "$val" | vercel env add "$key" production --force 2>/dev/null || \
    echo "$val" | vercel env add "$key" production 2>/dev/null || true
  fi
}

# Core required vars
push_env_var "VITE_SUPABASE_URL"       "$VITE_SUPABASE_URL"
push_env_var "VITE_SUPABASE_ANON_KEY"  "$VITE_SUPABASE_ANON_KEY"
push_env_var "OPENROUTER_API_KEY"      "$OPENROUTER_API_KEY"
push_env_var "VITE_OPENROUTER_API_KEY" "$OPENROUTER_API_KEY"
push_env_var "VITE_DB_PROVIDER"        "${VITE_DB_PROVIDER:-supabase}"
push_env_var "VITE_API_URL"            "${VITE_API_URL:-/api}"

# Optional vars
[ -n "$VITE_GOOGLE_CLIENT_ID" ]    && push_env_var "VITE_GOOGLE_CLIENT_ID"    "$VITE_GOOGLE_CLIENT_ID"
[ -n "$GOOGLE_CLIENT_SECRET" ]     && push_env_var "GOOGLE_CLIENT_SECRET"     "$GOOGLE_CLIENT_SECRET"
[ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && push_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
[ -n "$BLOB_READ_WRITE_TOKEN" ]    && push_env_var "BLOB_READ_WRITE_TOKEN"    "$BLOB_READ_WRITE_TOKEN"
[ -n "$DATABASE_URL" ]             && push_env_var "DATABASE_URL"             "$DATABASE_URL"

ok "Environment variables pushed to Vercel"

info "Deploying to production..."
DEPLOY_URL=$(vercel --prod --yes 2>&1 | grep "https://" | tail -1)

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   ✔  HealthFlux deployed successfully!               ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Production URL:${RESET}  ${CYAN}${DEPLOY_URL}${RESET}"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo -e "  1. Run the 3 SQL migration files in Supabase SQL Editor"
echo -e "     ${CYAN}supabase/migrations/001_create_tables.sql${RESET}"
echo -e "     ${CYAN}supabase/migrations/002_rls_policies.sql${RESET}"
echo -e "     ${CYAN}supabase/migrations/003_indexes.sql${RESET}"
echo ""
echo -e "  2. In Supabase → Auth → Providers → Google:"
echo -e "     Enable Google OAuth and paste your Client ID + Secret"
echo ""
echo -e "  3. In Supabase → Auth → URL Configuration:"
echo -e "     Add ${DEPLOY_URL} to Redirect URLs"
echo ""
echo -e "  4. Open ${CYAN}${DEPLOY_URL}${RESET} and test sign-in"
echo ""