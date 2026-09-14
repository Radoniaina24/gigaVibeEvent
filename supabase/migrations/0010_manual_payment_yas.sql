-- ============================================================
-- 0010_manual_payment_yas.sql — Paiement manuel YAS / Orange / Airtel
--   1. Renomme le provider `mvola` -> `yas` (rebranding Telma -> Yas) :
--      lignes existantes migrées, CHECKs reconstruits (noms explicites).
--   2. Motif de refus obligatoire : payments.rejection_reason +
--      validate_manual_payment(..., p_reason) — refus sans motif rejeté.
--   3. Numéros marchands configurables : platform_settings
--      payment_{yas,orange,airtel}_{enabled,number,name} (lecture publique,
--      écriture admin via RLS existante). Jamais hardcodés côté frontend.
-- À exécuter APRÈS 0009 (SQL Editor ou `supabase db push`).
-- ============================================================

-- ------------------------------------------------------------
-- 1. mvola -> yas (données + contraintes)
-- ------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname AS name,
           format('%I.%I', n.nspname, cl.relname) AS tbl
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%mvola%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.name);
  END LOOP;
END $$;

update public.orders set payment_method = 'yas' where payment_method = 'mvola';
update public.payments set provider = 'yas' where provider = 'mvola';

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('yas', 'orange_money', 'airtel_money', 'card', 'cash'));
alter table public.payments
  add constraint payments_provider_check
  check (provider in ('yas', 'orange_money', 'airtel_money', 'card', 'cash'));

-- create_checkout_order : méthode YAS acceptée
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

  select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), email)
    into v_buyer
  from public.profiles
  where id = v_caller and is_active = true;
  if v_buyer is null then
    raise exception 'Profil introuvable ou désactivé.';
  end if;

  if p_payment_method not in ('yas', 'orange_money', 'airtel_money') then
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

-- ------------------------------------------------------------
-- 2. Motif de refus (traçabilité + affichage utilisateur)
-- ------------------------------------------------------------
alter table public.payments
  add column if not exists rejection_reason text;

-- Nouvelle signature (supprime l'ancienne pour éviter la surcharge).
drop function if exists public.validate_manual_payment(uuid, boolean);

create or replace function public.validate_manual_payment(
  p_order_id uuid,
  p_approved boolean default true,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_mode text;
  v_order public.orders%rowtype;
  v_pay public.payments%rowtype;
  v_event_id uuid;
  v_partner_id uuid;
  v_item public.order_items%rowtype;
  v_buyer text;
  i int;
  v_ticket_no text;
  v_qr text;
  v_tries int;
  v_count int := 0;
  v_reason text;
begin
  if v_caller is null then
    raise exception 'Non authentifié.';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  -- Idempotence : une commande traitée ne peut plus être (re)validée.
  if v_order.payment_status not in ('pending', 'processing') then
    raise exception 'Commande déjà traitée (%).', v_order.payment_status;
  end if;

  if not v_is_admin then
    select value #>> '{}' into v_mode from public.platform_settings where key = 'payment_validation';
    if coalesce(v_mode, 'gve') <> 'partner' then
      raise exception 'Validation réservée à Giga Vibe Event.';
    end if;
    select event_id into v_event_id from public.orders where id = p_order_id;
    select partner_id into v_partner_id from public.events where id = v_event_id;
    if v_partner_id is null or v_partner_id <> public.my_partner_id() then
      raise exception 'Vous ne pouvez valider que vos propres commandes.';
    end if;
  end if;

  select * into v_pay from public.payments
  where order_id = p_order_id order by created_at desc limit 1;
  if not found then
    raise exception 'Paiement introuvable.';
  end if;

  if p_approved then
    update public.payments
    set status = 'paid',
        paid_at = now(),
        validated_by = v_caller,
        validated_at = now(),
        rejection_reason = null,
        updated_at = now()
    where id = v_pay.id;

    update public.orders
    set payment_status = 'paid', paid_at = now(), updated_at = now()
    where id = p_order_id;

    select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), email)
      into v_buyer from public.profiles where id = v_order.user_id;

    -- 1 billet par unité, numérotation GVE-000001 (§19). Exécuté une seule
    -- fois grâce au garde payment_status ci-dessus (pas de double génération).
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

    return jsonb_build_object('status', 'paid', 'tickets', v_count);
  else
    -- Refus : motif OBLIGATOIRE (conservé pour l'historique + l'utilisateur).
    v_reason := nullif(trim(coalesce(p_reason, '')), '');
    if v_reason is null or char_length(v_reason) < 4 then
      raise exception 'Motif du refus requis (min. 4 caractères).';
    end if;
    update public.payments
    set status = 'failed',
        validated_by = v_caller,
        validated_at = now(),
        rejection_reason = v_reason,
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

revoke all on function public.validate_manual_payment(uuid, boolean, text) from public, anon;
grant execute on function public.validate_manual_payment(uuid, boolean, text) to authenticated;

-- ------------------------------------------------------------
-- 3. Numéros marchands configurables (jamais hardcodés en React)
--    enabled : boolean JSON · number/name : string JSON
-- ------------------------------------------------------------
insert into public.platform_settings (key, value) values
  ('payment_yas_enabled', 'true'),
  ('payment_yas_number', '""'),
  ('payment_yas_name', '"Giga Vibe Event"'),
  ('payment_orange_enabled', 'true'),
  ('payment_orange_number', '""'),
  ('payment_orange_name', '"Giga Vibe Event"'),
  ('payment_airtel_enabled', 'true'),
  ('payment_airtel_number', '""'),
  ('payment_airtel_name', '"Giga Vibe Event"')
on conflict (key) do nothing;
