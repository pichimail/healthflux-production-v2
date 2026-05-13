import express from 'express';
import { supabaseAdmin } from '../server.js';

const router = express.Router();

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token && process.env.NODE_ENV !== 'development') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
router.use(requireAuth);

router.get('/plans', async (_req, res) => {
  try {
    const plans = [
      { key: 'free', title: 'Free', amount_inr: 0, interval: 'forever' },
      { key: 'pro', title: 'Pro', amount_inr: 499, interval: 'month' },
      { key: 'enterprise', title: 'Enterprise', amount_inr: 1999, interval: 'month' },
    ];
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/subscribe', async (req, res) => {
  try {
    const { user_email, plan_key } = req.body || {};
    if (!user_email || !plan_key) {
      return res.status(400).json({ error: 'user_email and plan_key are required' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Payments backend unavailable' });
    }

    const now = new Date().toISOString();
    const renew = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_email', user_email)
      .in('status', ['active', 'trialing'])
      .limit(1);

    if (existingErr) {
      return res.status(500).json({ error: existingErr.message });
    }

    let result;
    if (existing?.[0]?.id) {
      const { data, error } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_key,
          status: 'active',
          start_at: now,
          renew_at: renew,
          updated_date: now,
        })
        .eq('id', existing[0].id)
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_email,
          plan_key,
          status: 'active',
          start_at: now,
          renew_at: renew,
          created_by: user_email,
        })
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      result = data;
    }

    res.json({ ok: true, subscription: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
