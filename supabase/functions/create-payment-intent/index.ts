// Edge Function : create-payment-intent (Phase 5)
// Rôle : créer une intention de paiement Mobile Money SANS exposer les secrets.
// Flow :
//   1. Vérifie le JWT Supabase (utilisateur authentifié).
//   2. Valide order_id + provider + phone (zod côté serveur).
//   3. Vérifie que la commande appartient à l'utilisateur et est `pending`.
//   4. Réserve le stock via rpc `reserve_stock` (atomique).
//   5. Appelle le provider (MVola/Orange/Airtel) avec les secrets serveur.
//   6. Crée la ligne `payments` (status processing) et passe la commande en `processing`.
// Secrets requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, *_API_KEY/SECRET (par opérateur).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve((_req: Request) => {
  return new Response(
    JSON.stringify({
      error: 'Non implémenté — Phase 5 (Mobile Money).',
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
