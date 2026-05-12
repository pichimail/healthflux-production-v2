/**
 * ABHA Service — Surepass integration
 *
 * Wires up Surepass.io ABHA endpoints for:
 *   - Aadhaar-based ABHA creation
 *   - Mobile-based ABHA creation
 *   - ABHA login via OTP
 *   - ABHA linkage to existing healthflux profile
 *
 * Configure these env vars:
 *   SUREPASS_API_URL    (default: https://kyc-api.surepass.io)
 *   SUREPASS_TOKEN      (your Bearer token from Surepass dashboard)
 *   SUREPASS_CLIENT_ID  (optional, depends on plan)
 *
 * Docs: https://docs.surepass.io
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const SUREPASS_BASE = process.env.SUREPASS_API_URL || 'https://kyc-api.surepass.io/api/v1';
const SUREPASS_TOKEN = process.env.SUREPASS_TOKEN;

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

async function surepass(path, body = {}, method = 'POST') {
  if (!SUREPASS_TOKEN) {
    throw new Error('SUREPASS_TOKEN env var not set');
  }
  const res = await fetch(`${SUREPASS_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUREPASS_TOKEN}`,
    },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Surepass ${path} failed (${res.status})`);
  }
  return data;
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  req.authToken = token;
  next();
}

async function getCurrentUser(authToken) {
  if (!supabaseAdmin) throw new Error('Server not configured');
  const { data, error } = await supabaseAdmin.auth.getUser(authToken);
  if (error || !data?.user) throw new Error('Invalid session');
  return data.user;
}

router.use(requireAuth);

// ─── 1. Generate OTP using Aadhaar number ──────────────────
router.post('/aadhaar/generate-otp', async (req, res) => {
  try {
    const { aadhaar_number } = req.body;
    if (!aadhaar_number) return res.status(400).json({ error: 'aadhaar_number required' });
    const result = await surepass('/abha/v3/enrollment/request-otp', {
      txnId: '',
      scope: ['abha-enrol'],
      loginHint: 'aadhaar',
      loginId: aadhaar_number,
      otpSystem: 'aadhaar',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. Verify OTP + Create ABHA ──────────────────
router.post('/aadhaar/verify-otp', async (req, res) => {
  try {
    const { txn_id, otp, mobile } = req.body;
    const user = await getCurrentUser(req.authToken);

    const verified = await surepass('/abha/v3/enrollment/enrol-byAadhaar', {
      txnId: txn_id, otp, mobile,
    });

    // Store the ABHA mapping in our DB
    if (verified.tokens?.token) {
      await supabaseAdmin.from('abha_accounts').upsert({
        user_id: user.id,
        abha_number: verified.ABHANumber || verified.healthIdNumber,
        abha_address: verified.preferredAbhaAddress,
        health_id_number: verified.healthIdNumber,
        surepass_token: verified.tokens.token,
        surepass_refresh_token: verified.tokens.refreshToken,
        token_expires_at: new Date(Date.now() + (verified.tokens.expiresIn || 3600) * 1000).toISOString(),
        metadata: verified,
      }, { onConflict: 'user_id' });
    }
    res.json({ success: true, abha: verified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. Mobile-based ABHA OTP ──────────────────
router.post('/mobile/generate-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: 'mobile required' });
    const result = await surepass('/abha/v3/enrollment/request-otp', {
      scope: ['abha-enrol'], loginHint: 'mobile', loginId: mobile, otpSystem: 'abdm',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. Verify Mobile OTP ──────────────────
router.post('/mobile/verify-otp', async (req, res) => {
  try {
    const { txn_id, otp } = req.body;
    const user = await getCurrentUser(req.authToken);
    const verified = await surepass('/abha/v3/enrollment/enrol-byMobile', { txnId: txn_id, otp });

    if (verified.tokens?.token) {
      await supabaseAdmin.from('abha_accounts').upsert({
        user_id: user.id,
        abha_number: verified.ABHANumber || verified.healthIdNumber,
        abha_address: verified.preferredAbhaAddress,
        surepass_token: verified.tokens.token,
        surepass_refresh_token: verified.tokens.refreshToken,
        token_expires_at: new Date(Date.now() + (verified.tokens.expiresIn || 3600) * 1000).toISOString(),
        metadata: verified,
      }, { onConflict: 'user_id' });
    }
    res.json({ success: true, abha: verified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 5. Get current ABHA account ──────────────────
router.get('/account', async (req, res) => {
  try {
    const user = await getCurrentUser(req.authToken);
    const { data } = await supabaseAdmin.from('abha_accounts')
      .select('abha_number, abha_address, health_id_number, linked_at, last_sync_at, is_active')
      .eq('user_id', user.id)
      .maybeSingle();
    res.json({ abha: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 6. Disconnect ABHA ──────────────────
router.delete('/account', async (req, res) => {
  try {
    const user = await getCurrentUser(req.authToken);
    await supabaseAdmin.from('abha_accounts')
      .update({ is_active: false })
      .eq('user_id', user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
