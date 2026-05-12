# HealthFlux — Production

> React 18 + Vite · Supabase · OpenRouter AI · Vercel · Capacitor (iOS + Android)

---

## ⚡ One Command Deploy

```bash
# Web only (Vercel)
bash deploy.sh

# Web + iOS + Android
bash deploy.sh --mobile

# iOS only (opens Xcode)
bash deploy.sh --ios

# Android only (opens Android Studio)
bash deploy.sh --android

# Local dev setup (no deploy)
bash deploy.sh --local
```

The script handles: tool checks → env validation → npm install → build → git → GitHub repo → Vercel env vars → deploy → Capacitor setup → platform permissions → IDE open.

---

## Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| Node.js v18+ | ✅ | https://nodejs.org |
| git | ✅ | https://git-scm.com |
| Vercel CLI | auto-installed | `npm i -g vercel` |
| GitHub CLI | optional | `brew install gh` |
| Xcode | iOS only | Mac App Store |
| CocoaPods | iOS only | `gem install cocoapods` |
| Android Studio | Android only | https://developer.android.com/studio |

---

## Required Keys (get these first)

| Key | Where |
|-----|-------|
| `VITE_SUPABASE_URL` | supabase.com → Project → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Same page → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → service_role key |
| `OPENROUTER_API_KEY` | openrouter.ai/keys → Create → add $10 credits |
| `VITE_GOOGLE_CLIENT_ID` | console.cloud.google.com → Credentials → OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Same OAuth client |

```bash
cp .env.example .env    # then fill in keys
```

---

## Database Setup

In **Supabase SQL Editor**, run in order:

| File | What it does |
|------|-------------|
| `001_create_tables.sql` | 39 tables with all columns |
| `002_rls_policies.sql` | Row Level Security |
| `003_indexes.sql` | Performance indexes |
| `004_seed_and_admin.sql` | Plan seeds, admin views, auto-profile trigger |

Already ran old migrations? Run `005_fix_existing_db.sql` first, then `004`.

### Set yourself as admin:
```sql
SELECT make_admin('your@email.com');
SELECT assign_plan('your@email.com', 'pro', 12);
```

---

## NPM Scripts

### Web Development
```bash
npm run dev              # Vite dev server (localhost:5173)
npm run api              # Express API server (localhost:3001)
npm run dev:full         # Both at once (requires concurrently)
npm run build            # Production build → dist/
npm run deploy           # Same as bash deploy.sh
```

### Mobile (Capacitor)
```bash
npm run mobile:setup     # Build + add iOS + Android + sync
npm run mobile:ios       # Build + sync + open Xcode
npm run mobile:android   # Build + sync + open Android Studio
npm run cap:sync         # Sync web build → native platforms
npm run cap:open:ios     # Open Xcode
npm run cap:open:android # Open Android Studio
npm run cap:run:ios      # Build + run on iOS device/simulator
npm run cap:run:android  # Build + run on Android device/emulator
```

---

## Project Structure

```
healthflux-production/
├── deploy.sh                     # One-command deploy (web + mobile)
├── .env.example                  # All env vars documented
├── capacitor.config.json         # iOS/Android native config
├── vercel.json                   # Vercel routing
├── vite.config.js                # Build config
│
├── src/                          # Frontend (React)
│   ├── pages/                    # 65 pages
│   ├── components/               # 163 components
│   │   ├── utils/aiService.jsx   # AI calls → /api/ai/*
│   │   ├── utils/dbService.jsx   # DB calls → Supabase
│   │   └── adapters/AIAdapter.jsx
│   ├── api/
│   │   ├── base44Client.js       # Backward-compat shim
│   │   └── dbClient.js           # Supabase drop-in
│   └── lib/
│       ├── db.js                 # Supabase/Neon client
│       ├── AuthContext.jsx       # Google OAuth
│       └── healthBridge.js       # Apple Health / Google Fit
│
├── api/                          # Backend (Express)
│   ├── server.js                 # API entry point
│   ├── lib/openrouter.js         # AI router (25 models)
│   └── routes/ai.js              # 25 AI endpoints
│
├── supabase/migrations/          # Database
│   ├── 001_create_tables.sql     # 39 tables
│   ├── 002_rls_policies.sql      # RLS policies
│   ├── 003_indexes.sql           # Performance
│   ├── 004_seed_and_admin.sql    # Plans + admin + triggers
│   └── 005_fix_existing_db.sql   # Delta fix for live DBs
│
└── capacitor/                    # Mobile config
    └── capacitor.config.json     # HealthKit + Google Fit
```

---

## Mobile Build Guide

### iOS (requires Mac + Xcode)
```bash
bash deploy.sh --ios
# OR manually:
npm run build
npx cap sync ios
npx cap open ios          # Opens Xcode
# In Xcode: select your team → plug in iPhone → Run
```

HealthKit permissions, camera, and photo library access are auto-configured.

### Android
```bash
bash deploy.sh --android
# OR manually:
npm run build
npx cap sync android
npx cap open android      # Opens Android Studio
# In AS: plug in phone (USB debugging on) → Run
```

Camera, sensors, and notification permissions are auto-configured.

### Live Reload (development)
```bash
# In capacitor.config.json, add under "server":
# "url": "http://YOUR_LOCAL_IP:5173"
npm run dev
npx cap run ios           # Hot-reloads from your dev server
```

---

## AI Features (25 endpoints)

| Category | Model | Endpoints |
|----------|-------|-----------|
| Medical reasoning | Claude Sonnet 4 | health-chat, symptom-triage, drug-interactions, health-report, document-qa, health-coaching, reconcile-medications, diet-plan, cross-insights, predictive-analysis, provider-report |
| Vision/imaging | Gemini 2.5 Pro | analyze-image (medical/skin/nutrition), ocr-lab-report, extract-medication, multi-snap, enhanced-summary |
| Fast extraction | Gemini 2.0 Flash | document-search, daily-goals, parse-voice, extract-family |

---

## Admin Dashboard

Access: `https://your-app.vercel.app/admin`

| Page | Route |
|------|-------|
| Dashboard | `/admin` |
| Users | `/admin/users` |
| Analytics | `/admin/analytics` |
| AI Operations | `/admin/ai-ops` |
| Feature Flags | `/admin/feature-flags` |
| Subscriptions | `/admin/subscriptions` |
| Ads | `/admin/ads` |
| Notifications | `/admin/notifications` |

Admin SQL functions:
```sql
SELECT make_admin('user@email.com');
SELECT assign_plan('user@email.com', 'pro', 12);
SELECT toggle_ban('spammer@email.com', TRUE, 'Spam');
SELECT * FROM admin_users_view;
SELECT * FROM admin_analytics_view;
```

---

## Subscription Plans

| Plan | Monthly | AI Calls | Profiles | Documents |
|------|---------|----------|----------|-----------|
| Free | ₹0 | 10/mo | 1 | 10 |
| Basic | ₹299 | 100/mo | 3 | 100 |
| Pro | ₹799 | 1,000/mo | 10 | Unlimited |
| Enterprise | ₹2,999 | Unlimited | Unlimited | Unlimited |

---

## Cost Estimate

| Service | Free Tier | Scale |
|---------|-----------|-------|
| Supabase | 500MB DB, 50K users | $25/mo Pro |
| OpenRouter | Pay per token | ~$5-20/mo |
| Vercel | 100GB bandwidth | $20/mo Pro |
| **Total** | **$0** | **~$45/mo** |
