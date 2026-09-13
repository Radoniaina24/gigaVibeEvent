import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../app/config/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any> | null = null;

/**
 * Normalise l'URL du projet.
 * Erreur fréquente : `VITE_SUPABASE_URL` renseignée avec le suffixe
 * `/rest/v1` (ex. `https://xyz.supabase.co/rest/v1`), alors que le client
 * l'ajoute lui-même → requêtes en 404 sur `/rest/v1/rest/v1/...`.
 */
function normalizeSupabaseUrl(raw: string): string {
  const cleaned = raw.trim().replace(/\/+$/, '').replace(/(\/rest\/v1)+$/, '');
  if (cleaned !== raw.trim().replace(/\/+$/, '')) {
    console.warn(
      '[config] VITE_SUPABASE_URL ne doit pas contenir `/rest/v1`. Suffixe ignoré automatiquement.',
    );
  }
  return cleaned;
}
/**
 * Singleton Supabase (clé ANON uniquement).
 * Jamais de service_role_key côté frontend.
 *
 * Note : client volontairement non générique (`any` centralisé ici
 * uniquement). Les types stricts seront régénérés via `supabase gen types`
 * quand le projet Supabase sera lié, et ce seul fichier sera retypé.
 * Les appelants castent vers `src/types/database.ts` (source de vérité).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabase(): SupabaseClient<any> {
  if (client) return client;
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Configuration Supabase manquante : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir .env.example).',
    );
  }
  client = createClient(normalizeSupabaseUrl(env.supabaseUrl), env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
