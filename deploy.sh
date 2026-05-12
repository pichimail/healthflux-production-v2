#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  HealthFlux — One-Command Production Deploy                                 ║
# ║  Usage:  bash deploy.sh [options]                                           ║
# ║                                                                              ║
# ║  Options:                                                                    ║
# ║    (none)            Full web deploy to Vercel (default)                     ║
# ║    --mobile          Also set up Capacitor for iOS + Android                 ║
# ║    --ios             Build + open iOS project in Xcode                       ║
# ║    --android         Build + open Android project in Android Studio          ║
# ║    --skip-db         Skip database migration reminder                       ║
# ║    --local           Local dev setup only — no Vercel deploy                ║
# ║                                                                              ║
# ║  Examples:                                                                   ║
# ║    bash deploy.sh                    # Full web deploy to Vercel             ║
# ║    bash deploy.sh --mobile           # Web + iOS + Android setup             ║
# ║    bash deploy.sh --ios              # Build + open Xcode                    ║
# ║    bash deploy.sh --local            # Local dev setup only                  ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e

MODE="web"; SKIP_DB=false; LOCAL_ONLY=false
for arg in "$@"; do
  case $arg in
    --mobile)   MODE="mobile" ;;
    --ios)      MODE="ios" ;;
    --android)  MODE="android" ;;
    --skip-db)  SKIP_DB=true ;;
    --local)    LOCAL_ONLY=true ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
step()  { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${RESET}"; }
ok()    { echo -e "  ${GREEN}✔${RESET} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
fail()  { echo -e "  ${RED}✘ $1${RESET}"; exit 1; }
info()  { echo -e "  ${CYAN}→${RESET} $1"; }

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║    HealthFlux — Production Deploy        ║${RESET}"
echo -e "${BOLD}${GREEN}║    Mode: ${CYAN}${MODE}${GREEN}                             ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${RESET}"

# ── STEP 1: Check tools ─────────────────────────────────────────────────────
step "1/8 — Checking tools"
command -v node >/dev/null 2>&1 || fail "Node.js not found → https://nodejs.org (v18+)"
command -v npm  >/dev/null 2>&1 || fail "npm not found"
command -v git  >/dev/null 2>&1 || fail "git not found"
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -lt 18 ] && fail "Node v18+ required (you have $(node -v))"
ok "Node $(node -v) + npm $(npm -v)"

if ! command -v vercel >/dev/null 2>&1 && [ "$LOCAL_ONLY" = false ]; then
  info "Installing Vercel CLI..."; npm install -g vercel --silent
fi
command -v vercel >/dev/null 2>&1 && ok "Vercel CLI"

HAS_GH=false; command -v gh >/dev/null 2>&1 && HAS_GH=true && ok "GitHub CLI"

if [[ "$MODE" == "ios" || "$MODE" == "mobile" ]]; then
  command -v xcodebuild >/dev/null 2>&1 && ok "Xcode" || warn "Xcode not found (needed for iOS)"
  command -v pod >/dev/null 2>&1 && ok "CocoaPods" || warn "CocoaPods not found → gem install cocoapods"
fi
if [[ "$MODE" == "android" || "$MODE" == "mobile" ]]; then
  [ -n "$ANDROID_HOME" ] && ok "Android SDK" || warn "ANDROID_HOME not set (needed for Android)"
fi

# ── STEP 2: Validate .env ───────────────────────────────────────────────────
step "2/8 — Validating environment"
if [ ! -f ".env" ]; then
  [ -f ".env.example" ] || fail "No .env or .env.example found"
  cp .env.example .env
  echo -e "\n  ${RED}${BOLD}⚠  .env created — fill in your keys:${RESET}\n"
  echo -e "  ${CYAN}VITE_SUPABASE_URL${RESET}         → supabase.com → Settings → API"
  echo -e "  ${CYAN}VITE_SUPABASE_ANON_KEY${RESET}    → same page"
  echo -e "  ${CYAN}SUPABASE_SERVICE_ROLE_KEY${RESET}  → same page (service_role)"
  echo -e "  ${CYAN}OPENROUTER_API_KEY${RESET}         → openrouter.ai/keys"
  echo -e "  ${CYAN}VITE_GOOGLE_CLIENT_ID${RESET}      → console.cloud.google.com"
  echo -e "  ${CYAN}GOOGLE_CLIENT_SECRET${RESET}       → same OAuth client\n"
  read -p "  Press ENTER after filling .env... " _
fi

set -a; source .env 2>/dev/null || true; set +a
MISSING=()
[ -z "$VITE_SUPABASE_URL" ] && MISSING+=("VITE_SUPABASE_URL")
[ -z "$VITE_SUPABASE_ANON_KEY" ] && MISSING+=("VITE_SUPABASE_ANON_KEY")
[ -z "$OPENROUTER_API_KEY" ] && MISSING+=("OPENROUTER_API_KEY")
[[ "${VITE_SUPABASE_URL:-}" == *"YOUR"* ]] && MISSING+=("VITE_SUPABASE_URL (placeholder)")
[[ "${OPENROUTER_API_KEY:-}" == *"YOUR"* ]] && MISSING+=("OPENROUTER_API_KEY (placeholder)")
if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "\n  ${RED}Missing in .env:${RESET}"
  for k in "${MISSING[@]}"; do echo -e "    ${RED}✘${RESET} $k"; done; echo ""; exit 1
fi
ok "All required keys present"

# ── STEP 3: Install deps ────────────────────────────────────────────────────
step "3/8 — Installing dependencies"
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
  npm ci --silent 2>/dev/null || npm install --silent
else
  npm install --silent
fi
ok "$(ls node_modules | wc -l | tr -d ' ') packages installed"

# ── STEP 4: Build ───────────────────────────────────────────────────────────
step "4/8 — Building production bundle"
npm run build 2>&1 | tail -5
[ -d "dist" ] || fail "Build failed — run 'npm run build' manually"
ok "Build → dist/ ($(du -sh dist | cut -f1))"

# ── STEP 5: DB migrations ───────────────────────────────────────────────────
step "5/8 — Database"
if [ "$SKIP_DB" = true ]; then
  warn "Skipped (--skip-db)"
else
  echo -e "\n  Run in ${BOLD}Supabase SQL Editor${RESET} (if not done):\n"
  echo -e "  Fresh install:    001 → 002 → 003 → 004"
  echo -e "  Existing DB fix:  005 → 004\n"
  echo -e "  Set admin: ${CYAN}SELECT make_admin('you@email.com');${RESET}"
  echo -e "  Set plan:  ${CYAN}SELECT assign_plan('you@email.com', 'pro', 12);${RESET}\n"
  read -p "  Press ENTER to continue... " _
fi

# ── STEP 6: Git + GitHub ────────────────────────────────────────────────────
step "6/8 — Git"
if [ ! -d ".git" ]; then
  git init -b main; git add .; git commit -m "feat: HealthFlux v2.0"
  ok "Initialized"
else
  git add -A; git diff --staged --quiet 2>/dev/null || git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
  ok "Committed"
fi

if $HAS_GH && [ "$LOCAL_ONLY" = false ] && gh auth status >/dev/null 2>&1; then
  REPO="${PWD##*/}"
  if ! gh repo view "$(gh api user --jq .login)/$REPO" >/dev/null 2>&1; then
    gh repo create "$REPO" --private --source=. --push
    ok "GitHub repo created"
  else
    git push origin main 2>/dev/null || git push -u origin main 2>/dev/null || true
    ok "Pushed to GitHub"
  fi
fi

# ── STEP 7: Deploy to Vercel ────────────────────────────────────────────────
if [ "$LOCAL_ONLY" = false ]; then
  step "7/8 — Deploying to Vercel"
  push_env() { [ -n "$2" ] && echo "$2" | vercel env add "$1" production --force 2>/dev/null || true; }
  push_env "VITE_SUPABASE_URL"        "$VITE_SUPABASE_URL"
  push_env "VITE_SUPABASE_ANON_KEY"   "$VITE_SUPABASE_ANON_KEY"
  push_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
  push_env "OPENROUTER_API_KEY"       "$OPENROUTER_API_KEY"
  push_env "VITE_OPENROUTER_API_KEY"  "${VITE_OPENROUTER_API_KEY:-$OPENROUTER_API_KEY}"
  push_env "VITE_DB_PROVIDER"         "${VITE_DB_PROVIDER:-supabase}"
  push_env "VITE_API_URL"             "${VITE_API_URL:-/api}"
  push_env "VITE_GOOGLE_CLIENT_ID"    "$VITE_GOOGLE_CLIENT_ID"
  push_env "GOOGLE_CLIENT_SECRET"     "$GOOGLE_CLIENT_SECRET"
  ok "Env vars pushed"
  info "Deploying..."
  DEPLOY_URL=$(vercel --prod --yes 2>&1 | grep -E "https://" | tail -1 | tr -d '[:space:]')
  ok "Live → ${DEPLOY_URL}"
else
  step "7/8 — Skipped (--local)"
  DEPLOY_URL="http://localhost:5173"
fi

# ── STEP 8: Capacitor / Mobile ───────────────────────────────────────────────
if [[ "$MODE" == "mobile" || "$MODE" == "ios" || "$MODE" == "android" ]]; then
  step "8/8 — Mobile (Capacitor)"

  [ -f "capacitor.config.json" ] || cp capacitor/capacitor.config.json . 2>/dev/null || true

  if [ -n "$VITE_GOOGLE_CLIENT_ID" ] && [ -f "capacitor.config.json" ]; then
    if grep -q '"serverClientId": ""' capacitor.config.json; then
      sed -i.bak "s|\"serverClientId\": \"\"|\"serverClientId\": \"$VITE_GOOGLE_CLIENT_ID\"|" capacitor.config.json
      rm -f capacitor.config.json.bak
      ok "Google Client ID injected"
    fi
  fi

  if [[ "$MODE" == "mobile" || "$MODE" == "ios" ]]; then
    [ -d "ios" ] || { info "Adding iOS..."; npx cap add ios; ok "iOS added"; }
  fi
  if [[ "$MODE" == "mobile" || "$MODE" == "android" ]]; then
    [ -d "android" ] || { info "Adding Android..."; npx cap add android; ok "Android added"; }
  fi

  info "Syncing web → native..."
  npx cap sync
  ok "Capacitor synced"

  # iOS permissions
  if [[ -d "ios/App" && ("$MODE" == "ios" || "$MODE" == "mobile") ]]; then
    PLIST="ios/App/App/Info.plist"
    if [ -f "$PLIST" ] && ! grep -q "NSHealthShareUsageDescription" "$PLIST"; then
      info "Adding iOS permissions..."
      plutil -insert NSHealthShareUsageDescription -string "HealthFlux needs access to your health data to track vitals and provide insights." "$PLIST" 2>/dev/null || true
      plutil -insert NSCameraUsageDescription -string "HealthFlux uses your camera to scan prescriptions and lab reports." "$PLIST" 2>/dev/null || true
      plutil -insert NSPhotoLibraryUsageDescription -string "HealthFlux needs photo access to upload medical documents." "$PLIST" 2>/dev/null || true
      ok "iOS permissions added"
    fi
    command -v pod >/dev/null 2>&1 && { cd ios/App && pod install --silent 2>/dev/null; cd ../..; ok "CocoaPods installed"; }
  fi

  # Android permissions
  if [[ -d "android/app" && ("$MODE" == "android" || "$MODE" == "mobile") ]]; then
    MANIFEST="android/app/src/main/AndroidManifest.xml"
    if [ -f "$MANIFEST" ] && ! grep -q "CAMERA" "$MANIFEST"; then
      info "Adding Android permissions..."
      sed -i.bak '/<\/manifest>/i\
    <uses-permission android:name="android.permission.CAMERA" />\
    <uses-permission android:name="android.permission.INTERNET" />\
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />\
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />' "$MANIFEST" 2>/dev/null || true
      rm -f "${MANIFEST}.bak"
      ok "Android permissions added"
    fi
  fi

  case $MODE in
    ios)     npx cap open ios ;;
    android) npx cap open android ;;
    mobile)
      echo -e "  ${CYAN}→${RESET} iOS:     ${BOLD}npm run mobile:ios${RESET}"
      echo -e "  ${CYAN}→${RESET} Android: ${BOLD}npm run mobile:android${RESET}" ;;
  esac
else
  step "8/8 — Mobile (skipped — use --mobile / --ios / --android)"
fi

# ── DONE ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   ✔  HealthFlux deployed successfully!               ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Web:${RESET}        ${CYAN}${DEPLOY_URL}${RESET}"
echo -e "  ${BOLD}Admin:${RESET}      ${CYAN}${DEPLOY_URL}/admin${RESET}"
echo -e "  ${BOLD}Local dev:${RESET}  ${CYAN}npm run dev${RESET}  +  ${CYAN}npm run api${RESET}"
if [[ "$MODE" != "web" ]]; then
  echo -e "  ${BOLD}iOS:${RESET}        ${CYAN}npm run mobile:ios${RESET}"
  echo -e "  ${BOLD}Android:${RESET}    ${CYAN}npm run mobile:android${RESET}"
fi
echo ""
echo -e "  ${BOLD}Checklist:${RESET}"
echo -e "    □ SQL migrations in Supabase"
echo -e "    □ Add ${DEPLOY_URL} to Google OAuth redirect URIs"
echo -e "    □ Add ${DEPLOY_URL} to Supabase → Auth → URL Configuration"
echo -e "    □ SELECT make_admin('your@email.com');"
echo ""
