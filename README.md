# HealthFlux — Production Build
## Base44 → Supabase + OpenRouter Migration Complete

### Quick Start

```bash
# 1. Copy env template
cp .env.example .env

# 2. Fill in your keys in .env:
#    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, OPENROUTER_API_KEY

# 3. Run DB migrations in Supabase SQL Editor:
#    supabase/migrations/001_create_tables.sql
#    supabase/migrations/002_rls_policies.sql
#    supabase/migrations/003_indexes.sql

# 4. Install dependencies
npm install

# 5. Start dev server
npm run dev

# 6. Deploy to Vercel
vercel --prod
```

### Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Database**: Supabase (PostgreSQL) — 39 tables with RLS
- **Auth**: Google OAuth via Supabase Auth
- **AI**: OpenRouter → Claude Sonnet 4 / Gemini 2.5 Pro / Gemini 2.0 Flash
- **API**: Express routes in `/api/` (Vercel serverless compatible)
- **Mobile**: Capacitor ready (iOS/Android native build)

### Key Files Changed from Base44
| File | Change |
|------|--------|
| `src/api/base44Client.js` | Shim → wraps dbClient (backward compat) |
| `src/api/dbClient.js` | NEW — Supabase drop-in for base44.entities |
| `src/lib/db.js` | NEW — dynamic Supabase/Neon DB client |
| `src/lib/AuthContext.jsx` | Google OAuth via Supabase (replaces Base44 auth) |
| `src/lib/healthBridge.js` | NEW — real Apple Health/Google Fit bridge |
| `src/components/utils/aiService.jsx` | All InvokeLLM → /api/ai/* routes |
| `src/components/adapters/AIAdapter.jsx` | OpenRouter-backed |
| `api/lib/openrouter.js` | NEW — unified AI client |
| `api/routes/ai.js` | NEW — 25 AI endpoints |
| `supabase/migrations/` | NEW — 39 tables, RLS, indexes |

### Environment Variables Required
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-v1-...
VITE_DB_PROVIDER=supabase
```

### Pages (65) and Components (163)
All original pages and components preserved. See `src/pages/` and `src/components/`.
