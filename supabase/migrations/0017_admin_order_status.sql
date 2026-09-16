-- 0017 : L'admin change le statut d'une commande + billet envoyé au client.
--
-- Contexte :
--   1. La page admin /admin/orders/:id était en lecture seule : l'admin ne
--      pouvait pas changer le statut d'une commande (ex. commande bloquée en
--      `pending`/`processing`, commande à annuler manuellement).
--   2. Après validation manuelle (page Paiements), aucun email billet
--      n'était envoyé automatiquement (le client devait attendre ou
--      renvoyer lui-même depuis son espace).
--
-- `admin_set_order_status(p_order_id, p_status, p_reason?)` (admin only) :
--   - 'paid' (depuis pending/processing) : mêmes effets que la validation
--     manuelle approuvée (paiement soldé, commande payée, billets GVE-…
--     générés). Le frontend enchaîne avec `ticket-email` (envoi auto).
--   - 'cancelled' (depuis pending/processing) : commande + paiements
--     annulés, stock réservé libéré. Depuis failed/expired : simple
--     requalification (stock déjà libéré). Refusé si déjà payée
--     (billets émis → rembourser d'abord, hors périmètre).
-- Chaque changement est audité (audit_logs). Idempotent par garde de statut.

create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_old text;
  v_order public.orders%rowtype;
  v_pay public.payments%rowtype;
  v_item public.order_items%rowtype;
  v_buyer text;
  i int;
  v_ticket_no text;
  v_qr text;
  v_tries int;
  v_count int := 0;
begin
  if v_caller is null then
    raise exception 'Non authentifié.';
  end if;
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;
  if p_status not in ('paid', 'cancelled') then
    raise exception 'Statut invalide (payé ou annulé uniquement).';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  v_old := v_order.payment_status;
  if v_old = p_status then
    raise exception 'Commande déjà %.', p_status;
  end if;

  -- ----------------------------------------------------------
  -- Marquer comme payée (+ génération des billets)
  -- ----------------------------------------------------------
  if p_status = 'paid' then
    if v_old not in ('pending', 'processing') then
      raise exception 'Seule une commande en attente peut être marquée payée (%).', v_old;
    end if;

    select * into v_pay from public.payments
    where order_id = p_order_id order by created_at desc limit 1;

    if found then
      update public.payments
      set status = 'paid',
          paid_at = now(),
          validated_by = v_caller,
          validated_at = now(),
          rejection_reason = null,
          updated_at = now()
      where id = v_pay.id;
    else
      -- Cohérence du grand livre : aucune ligne de paiement (cas limite).
      insert into public.payments (order_id, user_id, provider, amount, currency, status, provider_ref, phone_number, paid_at, validated_by, validated_at)
      values (p_order_id, v_order.user_id, 'cash', v_order.total, 'MGA', 'paid',
              'ADMIN-' || v_order.order_number, null, now(), v_caller, now());
    end if;

    update public.orders
    set payment_status = 'paid', paid_at = now(), updated_at = now()
    where id = p_order_id;

    select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), email)
      into v_buyer from public.profiles where id = v_order.user_id;

    -- 1 billet par unité, numérotation GVE-000001 (qr_payload réécrit par
    -- le trigger trg_tickets_qr_secret : secret opaque 128 bits).
    for v_item in select * from public.order_items where order_id = p_order_id loop
      for i in 1..v_item.quantity loop
        v_tries := 0;
        loop
          v_ticket_no := public.next_ticket_number();
          exit when not exists (select 1 from public.tickets where ticket_number = v_ticket_no);
          v_tries := v_tries + 1;
          if v_tries > 5 then raise exception 'Échec génération billet.'; end if;
        end loop;
        v_tries := 0;
        loop
          v_qr := v_ticket_no || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
          exit when not exists (select 1 from public.tickets where qr_payload = v_qr);
          v_tries := v_tries + 1;
          if v_tries > 5 then raise exception 'Échec génération QR.'; end if;
        end loop;

        insert into public.tickets (ticket_number, order_id, order_item_id, user_id, event_id, ticket_type_id, holder_name, qr_payload, status)
        values (
          v_ticket_no, p_order_id, v_item.id, v_order.user_id, v_order.event_id, v_item.ticket_type_id,
          coalesce(v_item.holder_names[i], v_buyer),
          v_qr, 'valid'
        );
        v_count := v_count + 1;
      end loop;
    end loop;

  -- ----------------------------------------------------------
  -- Annuler la commande (stock libéré si encore réservé)
  -- ----------------------------------------------------------
  else
    if v_old = 'paid' then
      raise exception 'Commande déjà payée : billets émis, annulation impossible ici.';
    end if;

    update public.orders
    set payment_status = 'cancelled', updated_at = now()
    where id = p_order_id;

    if v_old in ('pending', 'processing') then
      update public.payments
      set status = 'cancelled', updated_at = now()
      where order_id = p_order_id and status in ('pending', 'processing');
      update public.ticket_types tt
      set sold = greatest(0, sold - oi.quantity), updated_at = now()
      from public.order_items oi
      where oi.order_id = p_order_id and tt.id = oi.ticket_type_id;
    end if;
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    v_caller, 'order.status_changed', 'orders', p_order_id,
    jsonb_build_object(
      'from', v_old, 'to', p_status, 'tickets', v_count,
      'reason', nullif(trim(coalesce(p_reason, '')), '')
    )
  );

  return jsonb_build_object('status', p_status, 'tickets', v_count);
end;
$$;

revoke all on function public.admin_set_order_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated;
