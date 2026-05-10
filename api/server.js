/**
 * HealthFlux API Server
 * Express backend for Supabase + OpenRouter
 * 
 * Run: node api/server.js
 * Or with Vercel: api/ directory auto-routes via vercel.json
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import aiRouter from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Supabase admin client for server-side operations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Routes ──────────────────────────────────────────────────
app.use('/api/ai', aiRouter);

// Storage upload (to Supabase Storage)
app.post('/api/storage/upload', async (req, res) => {
  try {
    // Handled via Supabase client-side storage SDK
    // This endpoint is a fallback for server-side uploads
    res.json({ message: 'Use Supabase client-side storage for direct uploads' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    provider: process.env.VITE_DB_PROVIDER || 'supabase',
    timestamp: new Date().toISOString() 
  });
});

app.listen(PORT, () => console.log(`HealthFlux API running on port ${PORT}`));

export default app;
