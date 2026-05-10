/**
 * DocumentRepository — MedicalDocument entity operations.
 * MIGRATION: Replace with supabase.from('medical_documents')
 * Storage: supabase.storage.from('medical-documents')
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const DocumentRepository = {
  async listForProfile(profileId, limit = 50) {
    return DatabaseAdapter.filter('MedicalDocument', { profile_id: profileId }, '-created_date', limit);
  },

  async listByType(profileId, documentType, limit = 30) {
    return DatabaseAdapter.filter('MedicalDocument', { profile_id: profileId, document_type: documentType }, '-created_date', limit);
  },

  async getById(id) {
    return DatabaseAdapter.get('MedicalDocument', id);
  },

  async create(data) {
    return DatabaseAdapter.create('MedicalDocument', data);
  },

  async update(id, data) {
    return DatabaseAdapter.update('MedicalDocument', id, data);
  },

  async delete(id) {
    return DatabaseAdapter.delete('MedicalDocument', id);
  },

  async updateStatus(id, status) {
    return DatabaseAdapter.update('MedicalDocument', id, { status });
  },
};

export default DocumentRepository;