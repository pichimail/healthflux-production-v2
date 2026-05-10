/**
 * StorageAdapter — wraps Base44 file upload/storage.
 *
 * MIGRATION (Next.js + Supabase):
 *   uploadFile(file) →
 *     const { data, error } = await supabase.storage.from('medical-documents').upload(path, file)
 *     return { file_url: supabase.storage.from('medical-documents').getPublicUrl(data.path).data.publicUrl }
 *
 *   uploadPrivate(file) →
 *     supabase.storage.from('private-documents').upload(path, file)
 *
 *   getSignedUrl(path) →
 *     supabase.storage.from('private-documents').createSignedUrl(path, 300)
 */
import { base44 } from '@/api/base44Client';

const StorageAdapter = {
  /**
   * Upload a public file (medical documents, images).
   * Returns { file_url: string }
   */
  async uploadFile(file) {
    return base44.integrations.Core.UploadFile({ file });
  },

  /**
   * Upload a private file.
   * Returns { file_uri: string }
   */
  async uploadPrivateFile(file) {
    return base44.integrations.Core.UploadPrivateFile({ file });
  },

  /**
   * Generate a time-limited signed URL for a private file.
   * Returns { signed_url: string }
   */
  async getSignedUrl(fileUri, expiresIn = 300) {
    return base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn });
  },
};

export default StorageAdapter;