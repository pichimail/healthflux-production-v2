/**
 * DatabaseAdapter — thin wrapper over Base44 entity SDK.
 *
 * MIGRATION (Next.js + Supabase):
 *   Replace with Supabase client calls:
 *   import { createClient } from '@supabase/supabase-js'
 *   list(entity, sort, limit) → supabase.from(entity).select('*').order(sort).limit(limit)
 *   filter(entity, query)     → supabase.from(entity).select('*').match(query)
 *   create(entity, data)      → supabase.from(entity).insert(data).select().single()
 *   update(entity, id, data)  → supabase.from(entity).update(data).eq('id', id).select().single()
 *   delete(entity, id)        → supabase.from(entity).delete().eq('id', id)
 *   get(entity, id)           → supabase.from(entity).select('*').eq('id', id).single()
 */
import { base44 } from '@/api/base44Client';

const DatabaseAdapter = {
  entity(name) {
    return base44.entities[name];
  },

  async list(entityName, sort = '-created_date', limit = 50) {
    return base44.entities[entityName].list(sort, limit);
  },

  async filter(entityName, query, sort = '-created_date', limit = 50) {
    return base44.entities[entityName].filter(query, sort, limit);
  },

  async get(entityName, id) {
    const results = await base44.entities[entityName].filter({ id });
    return results[0] || null;
  },

  async create(entityName, data) {
    return base44.entities[entityName].create(data);
  },

  async update(entityName, id, data) {
    return base44.entities[entityName].update(id, data);
  },

  async delete(entityName, id) {
    return base44.entities[entityName].delete(id);
  },

  async bulkCreate(entityName, dataArray) {
    return base44.entities[entityName].bulkCreate(dataArray);
  },

  subscribe(entityName, callback) {
    return base44.entities[entityName].subscribe(callback);
  },
};

export default DatabaseAdapter;