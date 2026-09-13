import { getSupabase } from '../lib/supabase';

const BUCKET = 'event-images';
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload d'image événement (admin uniquement, RLS côté Storage).
 * Validation type + taille côté client (défense en profondeur : RLS + policies).
 */
export async function uploadEventImage(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Format accepté : JPEG, PNG ou WebP.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Image trop lourde (max 5 Mo).');
  }
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
