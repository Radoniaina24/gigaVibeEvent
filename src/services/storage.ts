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
 * Upload d'image événement (admin uniquement, RLS côté Storage).
 * Validation type + taille côté client (défense en profondeur : RLS + policies).
 */
export async function uploadEventImage(file: File): Promise<string> {
  checkFile(file);
  const supabase = getSupabase();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
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
