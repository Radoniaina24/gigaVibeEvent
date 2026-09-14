import { getSupabase } from '../lib/supabase';

const BUCKET = 'event-images';
const PARTNER_BUCKET = 'partner-assets';
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

function checkFile(file: File): void {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Format accepté : JPEG, PNG ou WebP.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Image trop lourde (max 5 Mo).');
  }
}

/**
 * Valide un fichier image côté client (appelée dès la sélection en
 * formulaire, avant tout upload — l'aperçu reste 100 % local).
 */
export function validateImageFile(file: File): void {
  checkFile(file);
}

/**
 * Upload d'image événement (admin uniquement, RLS côté Storage).
 * Validation type + taille côté client (défense en profondeur : RLS + policies).
 * Convention (cf. seed-images.sql) : dossier `events/` du bucket `event-images`.
 */
export async function uploadEventImage(file: File): Promise<string> {
  checkFile(file);
  const supabase = getSupabase();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `events/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload d'asset partenaire (logo ou affiche) dans son dossier isolé
 * `{partnerId}/...` (RLS Storage : 0006_partner_assets.sql).
 */
export async function uploadPartnerAsset(
  file: File,
  partnerId: string,
  subpath: string,
): Promise<string> {
  checkFile(file);
  const supabase = getSupabase();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${partnerId}/${subpath}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PARTNER_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(PARTNER_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const RECEIPTS_BUCKET = 'payment-receipts';
/**
 * Capture du transfert Mobile Money (bucket privé, 0007).
 * Chemin `{orderId}/...` : seul l'acheteur peut déposer (RLS).
 */
export async function uploadPaymentReceipt(file: File, orderId: string): Promise<string> {
  checkFile(file);
  const supabase = getSupabase();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${orderId}/recu-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/** URL signée courte pour visualiser une capture (bucket privé). */
export async function signReceiptUrl(path: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error ?? new Error('URL impossible.');
  return data.signedUrl;
}

/* ---------- Suppression des images d'événement ---------- */

/**
 * Extrait le chemin storage depuis une URL publique (ou renvoie l'entrée
 * telle quelle si c'est déjà un chemin). `null` pour les URL externes.
 */
function storagePathFromUrl(url: string, bucket: string): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx >= 0) return url.slice(idx + marker.length).split('?')[0] || null;
  if (/^https?:\/\//i.test(url)) return null;
  return url;
}

/**
 * `true` si au moins un événement référence encore cette URL
 * (les duplications partagent le même fichier — on ne le supprime pas).
 * En cas de doute (erreur réseau), on conserve le fichier par prudence.
 */
async function eventImageInUse(url: string, excludeEventId?: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    let query = supabase.from('events').select('id').eq('image_url', url).limit(2);
    if (excludeEventId) query = query.neq('id', excludeEventId);
    const { data, error } = await query;
    if (error) return true;
    return (data?.length ?? 0) > 0;
  } catch {
    return true;
  }
}

async function removeIfUnused(
  url: string | null | undefined,
  bucket: string,
  excludeEventId?: string,
): Promise<'deleted' | 'kept' | 'skipped'> {
  if (!url) return 'skipped';
  const path = storagePathFromUrl(url, bucket);
  if (!path) return 'skipped';
  if (await eventImageInUse(url, excludeEventId)) return 'kept';
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
  return 'deleted';
}

/**
 * Supprime une image du bucket `event-images` — uniquement si plus aucun
 * événement ne la référence. À appeler après enregistrement/suppression
 * (best effort : l'appelant affiche un avertissement en cas d'échec).
 */
export function deleteEventImageIfUnused(
  url: string | null | undefined,
  excludeEventId?: string,
): Promise<'deleted' | 'kept' | 'skipped'> {
  return removeIfUnused(url, BUCKET, excludeEventId);
}

/** Idem pour le bucket `partner-assets` (affiches des organisateurs). */
export function deletePartnerAssetIfUnused(
  url: string | null | undefined,
  excludeEventId?: string,
): Promise<'deleted' | 'kept' | 'skipped'> {
  return removeIfUnused(url, PARTNER_BUCKET, excludeEventId);
}
