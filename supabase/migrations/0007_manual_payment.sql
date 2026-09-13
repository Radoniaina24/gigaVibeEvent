-- ============================================================
-- 0007_manual_payment.sql — CDC v2 étape 4 : paiement manuel (§16, §17)
--   §16 : le client déclare opérateur + numéro + montant + référence
--         (+ capture du reçu) → paiement EN ATTENTE DE VALIDATION.
--   §17 : validation par GVE (admin) ou le partenaire selon
--         platform_settings.payment_validation ('gve' | 'partner' | 'auto').
--         validate_manual_payment() vérifie l'autorisation en base.
--   La génération des billets reprend le circuit éprouvé de 0002,
--   avec numérotation GVE-000001 (§19, séquence créée en 0005).
-- À exécuter APRÈS 0005_platform_v2.sql, via SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Paiements : reçu + traçabilité du validateur
-- ------------------------------------------------------------
alter table public.payments
  add column if not exists receipt_url text,
  add column if not exists validated_by uuid references public.profiles(id) on delete set null,
  add column if not exists validated_at timestamptz;

-- ------------------------------------------------------------
-- 2. Déclaration manuelle par l'acheteur
--    pending → processing (en attente de validation)
-- ------------------------------------------------------------
create or replace function public.declare_manual_payment(
  p_order_id uuid,
  p_phone text,
  p_amount int,
  p_reference text,
  p_receipt_url text default null
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
begin
  if v_caller is null then
    raise exception 'Non authentifié.';
  end if;
  if p_phone !~ '^\+?[0-9\s-]{8,20}$' then
    raise exception 'Numéro de téléphone invalide.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide.';
  end if;
  if p_reference is null or char_length(trim(p_reference)) < 4 then
    raise exception 'Référence de transaction requise (min. 4 caractères).';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.user_id <> v_caller then
    raise exception 'Commande introuvable.';
  end if;
  if v_order.payment_status <> 'pending' then
    raise exception 'Commande déjà traitée (%).', v_order.payment_status;
  end if;

  select * into v_pay from public.payments
  where order_id = p_order_id order by created_at desc limit 1;
  if not found then
    raise exception 'Paiement introuvable.';
  end if;
  if p_amount <> v_pay.amount then
    raise exception 'Le montant déclaré (%) ne correspond pas au total (%).', p_amount, v_pay.amount;
  end if;

  update public.payments
  set phone_number = p_phone,
      provider_ref = trim(p_reference),
      receipt_url = p_receipt_url,
      status = 'processing',
      updated_at = now()
  where id = v_pay.id;

  update public.orders
  set payment_status = 'processing', updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('status', 'processing', 'order_id', p_order_id);
end;
$$;

-- ------------------------------------------------------------
-- 3. Validation manuelle (GVE ou partenaire selon réglage §17)
-- ------------------------------------------------------------
create or replace function public.validate_manual_payment(
  p_order_id uuid,
  p_approved boolean default true
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
begin
  if v_caller is null then
    raise exception 'Non authentifié.';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  if v_order.payment_status not in ('pending', 'processing') then
    raise exception 'Commande déjà traitée (%).', v_order.payment_status;
  end if;

  -- Autorisation : admin toujours ; partenaire si mode 'partner' + son événement
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

  if p_approved then
    update public.payments
    set status = 'paid',
        paid_at = now(),
        validated_by = v_caller,
        validated_at = now(),
        updated_at = now()
    where id = v_pay.id;

    update public.orders
    set payment_status = 'paid', paid_at = now(), updated_at = now()
    where id = p_order_id;

    select coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), email)
      into v_buyer from public.profiles where id = v_order.user_id;

    -- 1 billet par unité, numérotation GVE-000001 (§19)
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
    -- Refus : libère le stock réservé
    update public.payments
    set status = 'failed',
        validated_by = v_caller,
        validated_at = now(),
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

revoke all on function public.declare_manual_payment(uuid, text, int, text, text) from public, anon;
grant execute on function public.declare_manual_payment(uuid, text, int, text, text) to authenticated;

revoke all on function public.validate_manual_payment(uuid, boolean) from public, anon;
grant execute on function public.validate_manual_payment(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 4. Bucket privé des captures de reçu
--    Chemin : {order_id}/recu-{uuid}.ext
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Dépôt : l'acheteur dans le dossier de SA commande en attente
drop policy if exists "receipts owner insert" on storage.objects;
create policy "receipts owner insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'payment-receipts'
    and exists (
      select 1 from public.orders o
      where o.id::text = (storage.foldername(name))[1]
        and o.user_id = auth.uid()
        and o.payment_status in ('pending', 'processing')
    )
  );

-- Lecture : acheteur + admin + partenaire de l'événement
drop policy if exists "receipts scoped read" on storage.objects;
create policy "receipts scoped read" on storage.objects
  for select to authenticated using (
    bucket_id = 'payment-receipts'
    and (
      public.is_admin()
      or exists (
        select 1 from public.orders o
        where o.id::text = (storage.foldername(name))[1]
          and o.user_id = auth.uid()
      )
      or exists (
        select 1 from public.orders o
        join public.events e on e.id = o.event_id
        where o.id::text = (storage.foldername(name))[1]
          and e.partner_id = public.my_partner_id()
      )
    )
  );

drop policy if exists "receipts admin all" on storage.objects;
create policy "receipts admin all" on storage.objects
  for all to authenticated
  using (bucket_id = 'payment-receipts' and public.is_admin())
  with check (bucket_id = 'payment-receipts' and public.is_admin());
