// Edge Function : payment-webhook (Phase 5)
// Rôle : SEULE source de vérité pour valider un paiement.
// Règles :
//   - Vérifie la signature du provider (PAYMENT_WEBHOOK_SECRET).
//   - Ne fait confiance qu'à une confirmation fiable du fournisseur,
//     jamais au simple fait que "l'utilisateur a cliqué sur payer".
//   - Met à jour payments.status + orders.payment_status (paid/failed).
//   - En cas de succès : génère les tickets (ticket_number, qr_payload).
//   - En cas d'échec : libère le stock via rpc `release_stock`.
//   - Idempotent via provider_ref unique.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve((_req: Request) => {
  return new Response(
    JSON.stringify({
      error: 'Non implémenté — Phase 5 (webhook).',
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
});
