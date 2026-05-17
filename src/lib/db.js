/**
 * Database Client - Production Stable Version
 * Provides a reliable singleton Supabase client to avoid multiple GoTrueClient instances.
 */

const DB_PROVIDER = import.meta.env.VITE_DB_PROVIDER || 'supabase';

// ══════════════════════════════════════
// SUPABASE CLIENT (Stable Singleton)
// ══════════════════════════════════════
let supabaseClient = null;
let supabasePromise = null;

export async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!supabasePromise) {
    supabasePromise = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      supabaseClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        }
      );
      return supabaseClient;
    })();
  }

  return supabasePromise;
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
    return {
      getSession: async () => ({ data: { session: null } }),
      getUser: async () => ({ data: { user: null } }),
      signInWithOAuth: async () => {},
      signOut: async () => {},
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

  async insert(data) {
    if (this.provider === 'supabase') {
      const sb = await getSupabaseClient();
      return sb.from(this.table).insert(data).select();
    }
    return neonQuery(this.table, 'insert', { data });
  }

  async update(data) {
    if (this.provider === 'supabase') {
      const sb = await getSupabaseClient();
      let q = sb.from(this.table).update(data);
      for (const f of this._filters) { q = q[f.type](f.col, f.val); }
      return q.select();
    }
    return neonQuery(this.table, 'update', { data, filters: this._filters });
  }

  async delete() {
    if (this.provider === 'supabase') {
      const sb = await getSupabaseClient();
      let q = sb.from(this.table).delete();
      for (const f of this._filters) { q = q[f.type](f.col, f.val); }
      return q;
    }
    return neonQuery(this.table, 'delete', { filters: this._filters });
  }

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