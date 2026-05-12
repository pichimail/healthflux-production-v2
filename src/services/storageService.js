/**
 * Storage Service — Supabase Storage Only
 *
 * Strict per-user isolation enforced at three layers:
 *   1. Path layout: {user_id}/{document_id}/filename → user can't escape their own folder
 *   2. RLS policies (storage.objects) — enforced by Postgres
 *   3. document_acl table — explicit sharing grants
 *
 * No Base44. No localStorage fallback for files. No public buckets except avatars/ads.
 */
import db from '@/lib/db';

const BUCKET_DOCS = 'healthflux-documents';
const BUCKET_AVATARS = 'healthflux-avatars';
const BUCKET_ADS = 'healthflux-ads';

// ─────────────────────────────────────────────────────────────────────────
// CORE UPLOAD — used by aiService.uploadFile and everywhere else
// ─────────────────────────────────────────────────────────────────────────
export async function storageUpload(file, opts = {}) {
  if (!file) throw new Error('No file provided');
  const { kind = 'document', documentId, profileId } = opts;

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Build user-scoped path
  let bucket, path;
  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  switch (kind) {
    case 'avatar':
      bucket = BUCKET_AVATARS;
      path = `${user.id}/${ts}-${safeName}`;
      break;
    case 'ad':
      bucket = BUCKET_ADS;
      path = `${user.id}/${ts}-${safeName}`;
      break;
    default: // 'document', 'insurance', etc.
      bucket = BUCKET_DOCS;
      path = documentId
        ? `${user.id}/${documentId}/${safeName}`
        : `${user.id}/${profileId || 'general'}/${ts}-${safeName}`;
  }

  const { data, error } = await db.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
  if (error) throw error;

  // Return shape compatible with old base44 UploadFile
  const isPublic = bucket !== BUCKET_DOCS;
  const url = isPublic
    ? db.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
    : await getSignedUrl(bucket, data.path, 3600);

  return {
    url,
    file_url: url,
    path: data.path,
    bucket,
    size: file.size,
    name: file.name,
    type: file.type,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// SIGNED URL (private buckets) — short-lived, user-specific
// ─────────────────────────────────────────────────────────────────────────
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data?.signedUrl || null;
}

// Convenience: get a signed URL for a document by its full storage path
export async function getDocumentSignedUrl(storagePath, expiresIn = 3600) {
  return getSignedUrl(BUCKET_DOCS, storagePath, expiresIn);
}

// ─────────────────────────────────────────────────────────────────────────
// DELETE — only the owner can delete (RLS enforces this too)
// ─────────────────────────────────────────────────────────────────────────
export async function storageDelete(bucket, path) {
  const { error } = await db.storage.from(bucket).remove([path]);
  if (error) throw error;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// SHARING — advanced ACL: token, expiry, password, max-views
// ─────────────────────────────────────────────────────────────────────────
export async function createShareLink(documentId, opts = {}) {
  const {
    grantedToEmail,
    grantedToRole = 'family',
    permission = 'view',
    expiresInDays = 7,
    password,
    maxViews,
  } = opts;

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const token = crypto.randomUUID().replace(/-/g, '');
  let passwordHash = null;
  if (password) {
    // Simple hash for now — production should bcrypt server-side
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    passwordHash = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  const { data, error } = await db.from('document_acl').insert({
    document_id: documentId,
    owner_user_id: user.id,
    granted_to_email: grantedToEmail || null,
    granted_to_role: grantedToRole,
    permission,
    share_token: token,
    password_hash: passwordHash,
    max_views: maxViews || null,
    expires_at: expiresAt,
  }).select().single();

  if (error) throw error;
  return {
    token,
    shareUrl: `${window.location.origin}/shared/${token}`,
    expiresAt,
    passwordProtected: !!password,
    aclId: data.id,
  };
}

export async function revokeShareLink(aclId) {
  const { error } = await db.from('document_acl')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', aclId);
  if (error) throw error;
  return true;
}

export async function listShareLinks(documentId) {
  const { data, error } = await db.from('document_acl')
    .select('*')
    .eq('document_id', documentId)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────
// BACKWARD-COMPAT API (matches old base44 storage signatures)
// ─────────────────────────────────────────────────────────────────────────
export async function uploadFile(arg) {
  // Old signature: uploadFile({ file }) OR uploadFile(file)
  const file = arg?.file || arg;
  return storageUpload(file);
}

export default {
  storageUpload, uploadFile, storageDelete,
  getSignedUrl, getDocumentSignedUrl,
  createShareLink, revokeShareLink, listShareLinks,
};
