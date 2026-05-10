/**
 * Dynamic Database Client
 * Reads DB_PROVIDER from env: "supabase" (default) or "neon"
 * Both expose identical API surface for the app
 * 
 * ENV VARS:
 *   DB_PROVIDER=supabase|neon
 *   --- If supabase ---
 *   VITE_SUPABASE_URL=https://xxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 *   --- If neon ---
 *   DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
 *   VITE_NEON_API_URL=https://your-api.vercel.app  (Next.js API proxy for Neon)
 */

const DB_PROVIDER = import.meta.env.VITE_DB_PROVIDER || 'supabase';

// ══════════════════════════════════════
// SUPABASE CLIENT
// ══════════════════════════════════════
let supabase = null;

async function getSupabaseClient() {
  if (supabase) return supabase;
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  return supabase;
}

// ══════════════════════════════════════
// NEON CLIENT (via API proxy)
// ══════════════════════════════════════
const NEON_API = import.meta.env.VITE_NEON_API_URL || '/api/db';

async function neonQuery(table, method, params = {}) {
  const res = await fetch(`${NEON_API}/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, ...params }),
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  return res.json();
}

// ══════════════════════════════════════
// UNIFIED DB API
// ══════════════════════════════════════
class DBClient {
  constructor(provider) {
    this.provider = provider;
  }

  from(table) {
    return new QueryBuilder(table, this.provider);
  }

  get auth() {
    if (this.provider === 'supabase') {
      return {
        getSession: async () => { const sb = await getSupabaseClient(); return sb.auth.getSession(); },
        getUser: async () => { const sb = await getSupabaseClient(); return sb.auth.getUser(); },
        signInWithOAuth: async (opts) => { const sb = await getSupabaseClient(); return sb.auth.signInWithOAuth(opts); },
        signOut: async () => { const sb = await getSupabaseClient(); return sb.auth.signOut(); },
        onAuthStateChange: async (cb) => { const sb = await getSupabaseClient(); return sb.auth.onAuthStateChange(cb); },
      };
    }
    // Neon uses external auth (e.g., NextAuth, custom JWT)
    return {
      getSession: async () => {
        const res = await fetch('/api/auth/session');
        return { data: { session: await res.json() } };
      },
      getUser: async () => {
        const res = await fetch('/api/auth/me');
        return { data: { user: await res.json() } };
      },
      signInWithOAuth: async (opts) => {
        window.location.href = `/api/auth/google?redirect=${encodeURIComponent(window.location.href)}`;
      },
      signOut: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    };
  }
}

class QueryBuilder {
  constructor(table, provider) {
    this.table = table;
    this.provider = provider;
    this._filters = [];
    this._order = null;
    this._limit = null;
    this._select = '*';
    this._single = false;
  }

  select(cols = '*') { this._select = cols; return this; }
  eq(col, val) { this._filters.push({ type: 'eq', col, val }); return this; }
  neq(col, val) { this._filters.push({ type: 'neq', col, val }); return this; }
  gt(col, val) { this._filters.push({ type: 'gt', col, val }); return this; }
  lt(col, val) { this._filters.push({ type: 'lt', col, val }); return this; }
  gte(col, val) { this._filters.push({ type: 'gte', col, val }); return this; }
  lte(col, val) { this._filters.push({ type: 'lte', col, val }); return this; }
  in(col, vals) { this._filters.push({ type: 'in', col, val: vals }); return this; }
  order(col, opts = {}) { this._order = { col, ascending: opts.ascending ?? false }; return this; }
  limit(n) { this._limit = n; return this; }
  single() { this._single = true; return this; }

  async then(resolve, reject) {
    try {
      const result = await this._execute('select');
      resolve(result);
    } catch (e) { reject(e); }
  }

  async _execute(method) {
    if (this.provider === 'supabase') {
      return this._executeSupabase(method);
    }
    return neonQuery(this.table, method, {
      select: this._select,
      filters: this._filters,
      order: this._order,
      limit: this._limit,
      single: this._single,
    });
  }

  async _executeSupabase(method) {
    const sb = await getSupabaseClient();
    let q = sb.from(this.table).select(this._select);
    for (const f of this._filters) {
      q = q[f.type](f.col, f.val);
    }
    if (this._order) q = q.order(this._order.col, { ascending: this._order.ascending });
    if (this._limit) q = q.limit(this._limit);
    if (this._single) q = q.single();
    const { data, error } = await q;
    if (error) throw error;
    return { data, error: null };
  }

  // INSERT
  async insert(data) {
    if (this.provider === 'supabase') {
      const sb = await getSupabaseClient();
      return sb.from(this.table).insert(data).select();
    }
    return neonQuery(this.table, 'insert', { data });
  }

  // UPDATE
  async update(data) {
    if (this.provider === 'supabase') {
      const sb = await getSupabaseClient();
      let q = sb.from(this.table).update(data);
      for (const f of this._filters) { q = q[f.type](f.col, f.val); }
      return q.select();
    }
    return neonQuery(this.table, 'update', { data, filters: this._filters });
  }

  // DELETE
  async delete() {
    if (this.provider === 'supabase') {
      const sb = await getSupabaseClient();
      let q = sb.from(this.table).delete();
      for (const f of this._filters) { q = q[f.type](f.col, f.val); }
      return q;
    }
    return neonQuery(this.table, 'delete', { filters: this._filters });
  }

  // UPSERT
  async upsert(data, opts = {}) {
    if (this.provider === 'supabase') {
      const sb = await getSupabaseClient();
      return sb.from(this.table).upsert(data, opts).select();
    }
    return neonQuery(this.table, 'upsert', { data, ...opts });
  }
}

export const db = new DBClient(DB_PROVIDER);
export default db;
