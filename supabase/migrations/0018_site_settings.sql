-- ============================================================
-- 0018_site_settings.sql — Réglages site & billetterie
--   - currency : code devise d'affichage (défaut MGA → "Ar").
--   - order_expiry_minutes : durée de réservation d'une commande
--     en attente (défaut 30, borné 5–1440), lue par
--     create_checkout_order() au lieu du « 30 minutes » hardcodé.
--   - checkout_instructions : message libre affiché dans le tunnel
--     d'achat (vide = masqué).
--   - maintenance_mode / maintenance_message : page de maintenance
--     publique (les admins passent toujours, /login reste ouvert).
-- À exécuter APRÈS 0017 (SQL Editor ou `supabase db push`).
-- ============================================================

insert into public.platform_settings (key, value) values
  ('currency', '"MGA"'),
  ('order_expiry_minutes', '30'),
  ('checkout_instructions', '""'),
  ('maintenance_mode', 'false'),
  ('maintenance_message', '"Site en maintenance. Revenez dans quelques instants."')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- create_checkout_order : expiration lue depuis le réglage
-- (copie conforme de 0010, seul `expires_at` devient dynamique).
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
  v_order_id uuid;
  v_order_number text;
  v_lines int := 0;
  v_expiry_min int;
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

  -- Durée de réservation configurable (défaut 30 min, bornée 5–1440).
  select greatest(5, least(1440, coalesce((value #>> '{}')::int, 30)))
    into v_expiry_min
  from public.platform_settings
  where key = 'order_expiry_minutes';
  if v_expiry_min is null then
    v_expiry_min := 30;
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
  values (v_order_number, v_caller, p_event_id, v_subtotal, 0, v_subtotal, p_payment_method, 'pending', now() + (v_expiry_min || ' minutes')::interval)
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
