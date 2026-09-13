-- ============================================================
-- Ticket — Migration 0002 : tunnel d'achat (Phase 3)
-- Appliquer via : Supabase Dashboard > SQL Editor, APRÈS 0001_init.sql
--
-- Contenu :
--   1. order_items.holder_names (1 nom de participant par billet)
--   2. create_checkout_order() : création atomique commande + lignes +
--      paiement (pending) + décrément stock. Prix lus en base, jamais
--      depuis le client. Verrou FOR UPDATE anti-concurrence.
--   3. confirm_order_payment_dev() : SIMULATION de confirmation
--      fournisseur, DEV UNIQUEMENT (gate côté app via
--      VITE_ENABLE_PAYMENT_SIMULATION). Même effets que le futur
--      webhook Phase 5 : payment paid, order paid, génération billets.
--   4. cancel_pending_order() : annulation par l'acheteur (libère stock).
--   5. Durcissement : reserve_stock/release_stock réservées au serveur.
-- ============================================================

-- 1. Noms des participants (un par billet acheté)
alter table public.order_items
  add column if not exists holder_names text[];

-- 2. Création atomique d'une commande
create or replace function public.create_checkout_order(
  p_event_id uuid,
  p_payment_method text,
  p_phone text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_buyer text;
  v_event public.events%rowtype;
  v_item jsonb;
  v_tt_id uuid;
  v_qty int;
  v_names text[];
  v_tt public.ticket_types%rowtype;
  v_subtotal int := 0;
  v_order_id uuid;
  v_order_number text;
  v_lines int := 0;
  i int;
begin
  if v_caller is null then
    raise exception 'Non authentifié.';
  end if;

  -- Acheteur actif
  select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), email)
    into v_buyer
  from public.profiles
  where id = v_caller and is_active = true;
  if v_buyer is null then
    raise exception 'Profil introuvable ou désactivé.';
  end if;

  if p_payment_method not in ('mvola', 'orange_money', 'airtel_money') then
    raise exception 'Moyen de paiement invalide.';
  end if;
  if p_phone !~ '^\+?[0-9\s-]{8,20}$' then
    raise exception 'Numéro de téléphone invalide.';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Panier invalide.';
  end if;
  v_lines := jsonb_array_length(p_items);
  if v_lines < 1 or v_lines > 10 then
    raise exception 'Panier invalide (1 à 10 lignes).';
  end if;

  select * into v_event from public.events
  where id = p_event_id and status = 'published';
  if not found then
    raise exception 'Événement indisponible.';
  end if;

  -- Lignes temporaires validées (prix issus de la base)
  create temporary table tmp_checkout_lines (
    ticket_type_id uuid,
    quantity int,
    unit_price int,
    holder_names text[]
  ) on commit drop;

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_tt_id := (v_item ->> 'ticket_type_id')::uuid;
      v_qty := (v_item ->> 'quantity')::int;
    exception when others then
      raise exception 'Ligne de panier invalide.';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 10 then
      raise exception 'Quantité invalide (1 à 10 par type).';
    end if;

    -- Verrou ligne : sérialise les achats concurrents sur ce type
    select * into v_tt from public.ticket_types
    where id = v_tt_id and event_id = p_event_id
    for update;
    if not found then
      raise exception 'Type de billet introuvable pour cet événement.';
    end if;
    if v_tt.status <> 'active' then
      raise exception 'Billet "%" indisponible.', v_tt.name;
    end if;
    if v_tt.sales_start is not null and v_tt.sales_start > now() then
      raise exception 'Vente "%" pas encore ouverte.', v_tt.name;
    end if;
    if v_tt.sales_end is not null and v_tt.sales_end < now() then
      raise exception 'Vente "%" terminée.', v_tt.name;
    end if;
    if (v_tt.quantity - v_tt.sold) < v_qty then
      raise exception 'Stock insuffisant pour "%" (reste %).', v_tt.name, (v_tt.quantity - v_tt.sold);
    end if;

    -- Noms des participants (défaut : nom de l'acheteur)
    v_names := array_fill(v_buyer, array[v_qty]);
    if v_item ? 'holder_names' and jsonb_typeof(v_item -> 'holder_names') = 'array' then
      if jsonb_array_length(v_item -> 'holder_names') <> v_qty then
        raise exception 'Noms des participants incomplets pour "%".', v_tt.name;
      end if;
      v_names := array(
        select nullif(trim(value #>> '{}'), '')
        from jsonb_array_elements_text(v_item -> 'holder_names') with ordinality as t(value, ord)
        order by ord
      );
      for i in 1..v_qty loop
        if v_names[i] is null then v_names[i] := v_buyer; end if;
      end loop;
    end if;

    insert into tmp_checkout_lines values (v_tt_id, v_qty, v_tt.price, v_names);
    v_subtotal := v_subtotal + v_tt.price * v_qty;
  end loop;

  -- Commande + lignes + paiement pending + décrément stock (1 transaction)
  v_order_number := public.generate_order_number();
  insert into public.orders (order_number, user_id, event_id, subtotal, fees, total, payment_method, payment_status, expires_at)
  values (v_order_number, v_caller, p_event_id, v_subtotal, 0, v_subtotal, p_payment_method, 'pending', now() + interval '30 minutes')
  returning id into v_order_id;

  insert into public.order_items (order_id, ticket_type_id, quantity, unit_price, total_price, holder_names)
  select v_order_id, ticket_type_id, quantity, unit_price, unit_price * quantity, holder_names
  from tmp_checkout_lines;

  update public.ticket_types tt
  set sold = sold + l.quantity, updated_at = now()
  from tmp_checkout_lines l
  where tt.id = l.ticket_type_id;

  insert into public.payments (order_id, user_id, provider, amount, currency, status, phone_number)
  values (v_order_id, v_caller, p_payment_method, v_subtotal, 'MGA', 'pending', p_phone);

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_subtotal
  );
end;
$$;

-- 3. Simulation DEV de confirmation fournisseur (À REMPLACER par le webhook Phase 5)
create or replace function public.confirm_order_payment_dev(
  p_order_id uuid,
  p_success boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
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

  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.user_id <> v_caller then
    raise exception 'Commande introuvable.';
  end if;
  if v_order.payment_status not in ('pending', 'processing') then
    raise exception 'Commande déjà traitée (%).', v_order.payment_status;
  end if;

  select * into v_pay from public.payments
  where order_id = p_order_id order by created_at desc limit 1;

  if p_success then
    update public.payments
    set status = 'paid',
        provider_ref = 'SIM-' || upper(substr(md5(gen_random_uuid()::text), 1, 10)),
        provider_payload = jsonb_build_object('simulated', true, 'note', 'DEV ONLY — remplacer par webhook Phase 5'),
        paid_at = now(), updated_at = now()
    where id = v_pay.id;

    update public.orders
    set payment_status = 'paid', paid_at = now(), updated_at = now()
    where id = p_order_id;

    select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), email)
      into v_buyer from public.profiles where id = v_caller;

    -- 1 billet par unité achetée
    for v_item in select * from public.order_items where order_id = p_order_id loop
      for i in 1..v_item.quantity loop
        v_tries := 0;
        loop
          v_ticket_no := 'TICKET-' || upper(substr(md5(gen_random_uuid()::text), 1, 7));
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
          v_ticket_no, p_order_id, v_item.id, v_caller, v_order.event_id, v_item.ticket_type_id,
          coalesce(v_item.holder_names[i], v_buyer),
          v_qr, 'valid'
        );
        v_count := v_count + 1;
      end loop;
    end loop;

    return jsonb_build_object('status', 'paid', 'tickets', v_count);
  else
    -- Échec simulé : libère le stock réservé
    update public.payments
    set status = 'failed', provider_payload = jsonb_build_object('simulated', true, 'success', false),
        updated_at = now()
    where id = v_pay.id;
    update public.orders
    set payment_status = 'failed', updated_at = now()
    where id = p_order_id;
    update public.ticket_types tt
    set sold = greatest(0, sold - oi.quantity), updated_at = now()
    from public.order_items oi
    where oi.order_id = p_order_id and tt.id = oi.ticket_type_id;
    return jsonb_build_object('status', 'failed', 'tickets', 0);
  end if;
end;
$$;

-- 4. Annulation par l'acheteur (commande non payée uniquement)
create or replace function public.cancel_pending_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_caller is null then
    raise exception 'Non authentifié.';
  end if;
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.user_id <> v_caller then
    raise exception 'Commande introuvable.';
  end if;
  if v_order.payment_status not in ('pending', 'processing') then
    raise exception 'Seule une commande en attente peut être annulée.';
  end if;

  update public.orders set payment_status = 'cancelled', updated_at = now() where id = p_order_id;
  update public.payments set status = 'cancelled', updated_at = now() where order_id = p_order_id and status in ('pending', 'processing');
  update public.ticket_types tt
  set sold = greatest(0, sold - oi.quantity), updated_at = now()
  from public.order_items oi
  where oi.order_id = p_order_id and tt.id = oi.ticket_type_id;
  return true;
end;
$$;

-- 5. Privilèges : RPC checkout pour les authentifiés, stock réservé au serveur
revoke all on function public.create_checkout_order(uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_checkout_order(uuid, text, text, jsonb) to authenticated;

revoke all on function public.confirm_order_payment_dev(uuid, boolean) from public, anon;
grant execute on function public.confirm_order_payment_dev(uuid, boolean) to authenticated;

revoke all on function public.cancel_pending_order(uuid) from public, anon;
grant execute on function public.cancel_pending_order(uuid) to authenticated;

revoke all on function public.reserve_stock(uuid, int) from public, anon, authenticated;
revoke all on function public.release_stock(uuid, int) from public, anon, authenticated;
