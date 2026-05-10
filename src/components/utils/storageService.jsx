import { base44 } from '@/api/base44Client';

/**
 * HealthFlux Storage Service Abstraction Layer
 *
 * CURRENT: Uses Base44 UploadFile internally.
 * AFTER EXPORT: Replace with Vercel Blob or Supabase Storage.
 *
 * POST-EXPORT VERCEL BLOB:
 * import { put, del } from '@vercel/blob'
 * uploadFile(file) → const blob = await put(file.name, file, { access:'public' }); return blob.url;
 * deleteFile(url) → await del(url)
 *
 * POST-EXPORT SUPABASE STORAGE:
 * const supabase = createClient(URL, KEY)
 * uploadFile(file) → {
 *   const path = `documents/${Date.now()}_${file.name}`;
 *   await supabase.storage.from('uploads').upload(path, file);
 *   const { data } = supabase.storage.from('uploads').getPublicUrl(path);
 *   return data.publicUrl;
 * }
 * deleteFile(path) → await supabase.storage.from('uploads').remove([path])
 *
 * Upload calls found in the app (3 locations):
 * - src/components/UniversalUpload.jsx → base44.integrations.Core.UploadFile({ file })
 * - src/components/UploadModal.jsx → base44.integrations.Core.UploadFile({ file })
 * - src/components/medications/PrescriptionScanner.jsx → base44.integrations.Core.UploadFile({ file })
 *
 * Email calls (1 location — replace with Resend or SendGrid after export):
 * - src/pages/AdminNotifications.jsx → base44.integrations.Core.SendEmail({...})
 */

export async function uploadFile(file) {
  const result = await base44.integrations.Core.UploadFile({ file });
  return result;
}

export async function sendEmail({ to, subject, body }) {
  return base44.integrations.Core.SendEmail({ to, subject, body });
}