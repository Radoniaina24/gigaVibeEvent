-- ============================================================
-- Ticket — Migration 0003 : traçabilité des actions admin (Phase 4)
-- Appliquer via : Supabase Dashboard > SQL Editor, APRÈS 0002_checkout.sql
--
-- Les triggers (orders/payments) auditent déjà les changements sensibles
-- côté serveur. Cette policy permet en plus au frontend admin d'enregistrer
-- explicitement : event.created/updated/deleted, user.updated,
-- ticket.cancelled, category.created/updated/deleted.
-- Rappel : UN ADMIN NE PEUT PAS marquer un paiement "paid" depuis l'UI ;
-- seuls le webhook Phase 5 (service_role) et la simulation DEV le peuvent.
-- ============================================================

drop policy if exists "audit_admin_insert" on public.audit_logs;
create policy "audit_admin_insert" on public.audit_logs
  for insert to authenticated
  with check (
    public.is_admin()
    and user_id = auth.uid()
  );
