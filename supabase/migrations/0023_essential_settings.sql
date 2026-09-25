-- ============================================================
-- 0023_essential_settings.sql — Paramètres essentiels P0
--   - Tarifs & limites : service_fee_fixed, fees_payer,
--     max_tickets_per_type, max_lines_per_order, max_tickets_per_order
--   - Site & contact : site_name, site_logo_url,
--     contact_email, contact_phone,
--     ticket_number_prefix, order_number_prefix
--   - Uploads & auth : upload_max_size_mb,
--     auth_confirm_expiry_minutes, auth_reset_expiry_minutes,
--     invitation_expiry_days
--   - Fix : create_checkout_order lit currency + expiry + limites +
--     frais depuis platform_settings (fini le 'MGA' / '30 min' en dur).
--   - generate_order_number / next_ticket_number lisent leurs préfixes.
-- Idempotent (INSERT ... ON CONFLICT DO NOTHING).
-- À exécuter APRÈS 0022 (SQL Editor ou `supabase db push`).
-- ============================================================

insert into public.platform_settings (key, value) values
  ('service_fee_fixed', '0'),
  ('fees_payer', '"buyer"'),
  ('max_tickets_per_type', '10'),
  ('max_lines_per_order', '10'),
  ('max_tickets_per_order', '20'),
  ('contact_email', '"contact@ticket.mg"'),
  ('contact_phone', '"+261 34 12 345 67"'),
  ('site_name', '"Giga Vibe Event"'),
  ('site_logo_url', '"/logo.jpeg"'),
  ('ticket_number_prefix', '"GVE-"'),
  ('order_number_prefix', '"ORDER-"'),
  ('upload_max_size_mb', '5'),
  ('auth_confirm_expiry_minutes', '60'),
  ('auth_reset_expiry_minutes', '30'),
  ('invitation_expiry_days', '7')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- Préfixes configurables
-- ------------------------------------------------------------
create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq int;
  prefix text;
begin
  select coalesce(value #>> '{}', 'ORDER-') into prefix
  from public.platform_settings where key = 'order_number_prefix';
  if prefix is null or prefix = '' then prefix := 'ORDER-'; end if;
  seq := nextval('public.order_seq');
  return prefix || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 6, '0');
end;
$$;

create or replace function public.next_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  prefix text;
begin
  select coalesce(value #>> '{}', 'GVE-') into prefix
  from public.platform_settings where key = 'ticket_number_prefix';
  if prefix is null or prefix = '' then prefix := 'GVE-'; end if;
  return prefix || lpad(nextval('public.ticket_number_seq')::text, 6, '0');
end;
$$;

-- ------------------------------------------------------------
-- create_checkout_order : currency + expiry + limites + frais
-- lus depuis platform_settings (copie conforme de 0018, durées
-- et plafonds dynamiques, frais fixes par billet).
-- ------------------------------------------------------------
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
  v_total_qty int := 0;
  v_fees int := 0;
  v_total int := 0;
  v_order_id uuid;
  v_order_number text;
  v_lines int := 0;
  v_expiry_min int;
  v_currency text;
  v_max_per_type int;
  v_max_lines int;
  v_max_total int;
  v_fee_fixed int;
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

  -- Réglages lus depuis platform_settings (avec bornes de sécurité).
  select greatest(5, least(1440, coalesce((value #>> '{}')::int, 30)))
    into v_expiry_min
  from public.platform_settings
  where key = 'order_expiry_minutes';
  if v_expiry_min is null then v_expiry_min := 30; end if;

  select coalesce(nullif(value #>> '{}', ''), 'MGA')
    into v_currency
  from public.platform_settings
  where key = 'currency';
  if v_currency is null or v_currency = '' then v_currency := 'MGA'; end if;
  v_currency := upper(substr(v_currency, 1, 3));

  select greatest(1, least(50, coalesce((value #>> '{}')::int, 10)))
    into v_max_per_type
  from public.platform_settings
  where key = 'max_tickets_per_type';
  if v_max_per_type is null then v_max_per_type := 10; end if;

  select greatest(1, least(50, coalesce((value #>> '{}')::int, 10)))
    into v_max_lines
  from public.platform_settings
  where key = 'max_lines_per_order';
  if v_max_lines is null then v_max_lines := 10; end if;

  select greatest(1, least(200, coalesce((value #>> '{}')::int, 20)))
    into v_max_total
  from public.platform_settings
  where key = 'max_tickets_per_order';
  if v_max_total is null then v_max_total := 20; end if;

  select greatest(0, least(100000, coalesce((value #>> '{}')::int, 0)))
    into v_fee_fixed
  from public.platform_settings
  where key = 'service_fee_fixed';
  if v_fee_fixed is null then v_fee_fixed := 0; end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Panier invalide.';
  end if;
  v_lines := jsonb_array_length(p_items);
  if v_lines < 1 or v_lines > v_max_lines then
    raise exception 'Panier invalide (1 à % lignes).', v_max_lines;
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

    if v_qty is null or v_qty < 1 or v_qty > v_max_per_type then
      raise exception 'Quantité invalide (1 à % par type).', v_max_per_type;
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
        select nullif(trim(value), '')
        from jsonb_array_elements_text(v_item -> 'holder_names') with ordinality as t(value, ord)
        order by ord
      );
      for i in 1..v_qty loop
        if v_names[i] is null then v_names[i] := v_buyer; end if;
      end loop;
    end if;

    insert into tmp_checkout_lines values (v_tt_id, v_qty, v_tt.price, v_names);
    v_subtotal := v_subtotal + v_tt.price * v_qty;
    v_total_qty := v_total_qty + v_qty;
  end loop;

  if v_total_qty > v_max_total then
    raise exception 'Panier invalide (max % billets par commande).', v_max_total;
  end if;

  v_fees := v_fee_fixed * v_total_qty;
  v_total := v_subtotal + v_fees;

  v_order_number := public.generate_order_number();
  insert into public.orders (order_number, user_id, event_id, subtotal, fees, total, payment_method, payment_status, expires_at)
  values (v_order_number, v_caller, p_event_id, v_subtotal, v_fees, v_total, p_payment_method, 'pending', now() + (v_expiry_min || ' minutes')::interval)
  returning id into v_order_id;

  insert into public.order_items (order_id, ticket_type_id, quantity, unit_price, total_price, holder_names)
  select v_order_id, ticket_type_id, quantity, unit_price, unit_price * quantity, holder_names
  from tmp_checkout_lines;

  update public.ticket_types tt
  set sold = sold + l.quantity, updated_at = now()
  from tmp_checkout_lines l
  where tt.id = l.ticket_type_id;

  insert into public.payments (order_id, user_id, provider, amount, currency, status, phone_number)
  values (v_order_id, v_caller, p_payment_method, v_total, v_currency, 'pending', p_phone);

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_total,
    'subtotal', v_subtotal,
    'fees', v_fees,
    'currency', v_currency
  );
end;
$$;
