/**
 * HealthFlux API Server — Production
 * Express backend integrating Supabase + OpenRouter + Surepass ABHA.
 */
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import aiRouter from './routes/ai.js';
import abhaRouter from './routes/abha.js';
import paymentsRouter from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://healthfluxi-pro.vercel.app'],
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));

export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null;

app.use('/api/ai', aiRouter);
app.use('/api/abha', abhaRouter);
app.use('/api/payments', paymentsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: 'supabase',
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!supabaseAdmin,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      surepass: !!process.env.SUREPASS_TOKEN,
    },
  });
});

app.listen(PORT, () => console.log(`HealthFlux API running on port ${PORT}`));

export default app;
