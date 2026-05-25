/**
 * HealthFlux API Server — Production Ready
 * Fixed: Strong JWT auth + rate limiting + proper error handling
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

import aiRouter from './routes/ai.js';
import abhaRouter from './routes/abha.js';
import paymentsRouter from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://healthfluxi.com'],
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));

// Rate limiting (prevents abuse on AI endpoints)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 40,                    // 40 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Strong Supabase JWT Auth Middleware
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;           // Available in all routes
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// ─── Supabase Admin Client ─────────────────────────────────────
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null;

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/ai', apiLimiter, requireAuth, aiRouter);
app.use('/api/abha', requireAuth, abhaRouter);           // ABHA needs auth
app.use('/api/payments', requireAuth, paymentsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!supabaseAdmin,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      surepass: !!process.env.SUREPASS_TOKEN,
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 HealthFlux API running on port ${PORT}`);
});

export default app;
