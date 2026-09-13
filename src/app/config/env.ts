export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as
    | string
    | undefined,
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Giga Vibe Event',
  appUrl:
    (import.meta.env.VITE_APP_URL as string | undefined) ??
    'http://localhost:5173',
  /** Simulation de confirmation Mobile Money (DEV uniquement, Phase 3). */
  enablePaymentSimulation:
    (import.meta.env.VITE_ENABLE_PAYMENT_SIMULATION as string | undefined) ===
    'true',
} as const;

export function assertEnv(): void {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    // Message volontairement explicite en dev (Phase 1).
    // En production, l'app affiche un ErrorState propre via SupabaseProvider.
    console.warn(
      '[config] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants. Copiez .env.example vers .env',
    );
  }
}
