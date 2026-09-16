-- 0011 : Billets uniques et infalsifiables (QR opaques + check-in atomique).
--
-- Constat : qr_payload valait `TICKET-XXXXXXX-XXXX` (suffixe de 16 bits,
-- prévisible). Désormais :
--   1. BEFORE INSERT : secret opaque 128 bits (`QR-` + 32 hex), jamais dérivé
--      du N° billet — couvre tous les chemins d'émission (checkout, paiements
--      manuels YAS/Orange/Airtel) sans les réécrire.
--   2. Réémission des anciens QR prévisibles (leurs QR précédents sont invalidés).
--   3. `checkin_ticket(qr)` SECURITY DEFINER : contrôle d'accès (admin /
--      contrôleur / partenaire de l'événement), bascule atomique
--      valid -> used (anti-photocopie : 2e scan = `already_used` + alerte).

-- ------------------------------------------------------------
-- 1. Génération serveur du secret QR
-- ------------------------------------------------------------
create or replace function public.tickets_qr_secret()
returns trigger
language plpgsql
as $$
begin
  -- 128 bits d'entropie (2x uuid v4), hexadécimal, sans extension.
  NEW.qr_payload := 'QR-' || md5(gen_random_uuid()::text || gen_random_uuid()::text);
  return NEW;
end;
$$;

drop trigger if exists trg_tickets_qr_secret on public.tickets;
create trigger trg_tickets_qr_secret
  before insert on public.tickets
  for each row execute function public.tickets_qr_secret();

-- ------------------------------------------------------------
-- 2. Réémission des QR legacy prévisibles
-- ------------------------------------------------------------
update public.tickets
set qr_payload = 'QR-' || md5(gen_random_uuid()::text || gen_random_uuid()::text)
where qr_payload not like 'QR-%';

-- ------------------------------------------------------------
-- 3. Check-in atomique à usage unique (scan Phase 6)
-- ------------------------------------------------------------
create or replace function public.checkin_ticket(p_qr text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_partner uuid;
  v_active boolean;
  v_t public.tickets%rowtype;
  v_event_title text;
  v_type_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select role, partner_id, is_active
    into v_role, v_partner, v_active
    from public.profiles where id = v_uid;

  if v_role is null or not coalesce(v_active, false)
     or v_role not in ('admin', 'controller', 'partner') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_t
    from public.tickets
    where qr_payload = nullif(trim(coalesce(p_qr, '')), '')
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Partenaire : uniquement les billets de SES événements.
  if v_role = 'partner' and not exists (
    select 1 from public.events e
    where e.id = v_t.event_id and e.partner_id = v_partner
  ) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select title into v_event_title from public.events where id = v_t.event_id;
  select name into v_type_name from public.ticket_types where id = v_t.ticket_type_id;

  -- Photocopie / double présentation : déjà consommé.
  if v_t.status = 'used' then
    return jsonb_build_object(
      'ok', false, 'reason', 'already_used',
      'ticket_number', v_t.ticket_number,
      'holder_name', v_t.holder_name,
      'event_title', v_event_title,
      'ticket_type', v_type_name,
      'used_at', v_t.used_at
    );
  end if;

  if v_t.status in ('cancelled', 'expired') then
    return jsonb_build_object(
      'ok', false, 'reason', v_t.status,
      'ticket_number', v_t.ticket_number,
      'holder_name', v_t.holder_name,
      'event_title', v_event_title,
      'ticket_type', v_type_name
    );
  end if;

  if v_t.status <> 'valid' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  -- Bascule atomique (le verrou FOR UPDATE + transaction empêche le double scan).
  update public.tickets
    set status = 'used', used_at = now()
    where id = v_t.id;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    v_uid, 'ticket.checkin', 'tickets', v_t.id,
    jsonb_build_object('ticket_number', v_t.ticket_number, 'event_title', v_event_title)
  );

  return jsonb_build_object(
    'ok', true,
    'ticket_number', v_t.ticket_number,
    'holder_name', v_t.holder_name,
    'event_title', v_event_title,
    'ticket_type', v_type_name
  );
end;
$$;

revoke all on function public.checkin_ticket(text) from public, anon;
grant execute on function public.checkin_ticket(text) to authenticated;
