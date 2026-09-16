-- 0015 : QR humain `giga-vibe-event.NUMERO-BINAIRE24.nom-evenement`.
--
-- Contexte : le QR encodait une URL technique
-- (`.../tickets/verify?code=QR-...`). Au scan avec l'appareil photo on veut
-- voir : `giga-vibe-event.GVE-000123-101010... .mon-evenement`.
--
-- Format :
--   giga-vibe-event.<ticket_number>-<24 binaire>.<event-slug>
--   Ex. giga-vibe-event.GVE-000123-101010111100110101111000.concert-giga-2026
--   - ticket_number : ex. GVE-000001 (unique, séquentiel)
--   - 24 binaire   : 24 caractères 0/1 = les 6 premiers hex du secret
--                    `qr_payload` (128 bits) convertis en binaire.
--                    Preuve de possession sans exposer tout le secret.
--   - event-slug   : nom d'événement normalisé, affichage uniquement (ignoré).
--
-- Vérification serveur : on extrait (ticket_number, binaire), on retrouve le
-- billet par ticket_number, on compare le binaire attendu
-- (`qr_binary24(qr_payload)`). Anciens QR (URL / `QR-...` brut) toujours
-- acceptés en repli exact sur `qr_payload`. Aucune colonne ajoutée,
-- aucun billet réémis : les anciens comme les nouveaux QR restent valables.

-- ------------------------------------------------------------
-- 1. Binaire attendu depuis le secret (synchro avec
--    `binary24FromQrPayload()` dans src/lib/ticketQr.ts) :
--    6 premiers hex -> 24 bits.
-- ------------------------------------------------------------
create or replace function public.qr_binary24(p_qr_payload text)
returns text
language plpgsql
immutable
as $$
declare
  v_hex text;
  v_out text := '';
  i int;
  c char;
begin
  -- Ne garde que l'hexadécimal (supprime `QR-`, tirets...), 6 premiers.
  v_hex := substr(lower(regexp_replace(coalesce(p_qr_payload, ''), '[^0-9a-f]', '', 'g')), 1, 6);
  if length(v_hex) < 6 then
    return null;
  end if;
  for i in 1..6 loop
    c := substr(v_hex, i, 1);
    case c
      when '0' then v_out := v_out || '0000';
      when '1' then v_out := v_out || '0001';
      when '2' then v_out := v_out || '0010';
      when '3' then v_out := v_out || '0011';
      when '4' then v_out := v_out || '0100';
      when '5' then v_out := v_out || '0101';
      when '6' then v_out := v_out || '0110';
      when '7' then v_out := v_out || '0111';
      when '8' then v_out := v_out || '1000';
      when '9' then v_out := v_out || '1001';
      when 'a' then v_out := v_out || '1010';
      when 'b' then v_out := v_out || '1011';
      when 'c' then v_out := v_out || '1100';
      when 'd' then v_out := v_out || '1101';
      when 'e' then v_out := v_out || '1110';
      when 'f' then v_out := v_out || '1111';
      else return null;
    end case;
  end loop;
  return v_out;
end;
$$;

-- ------------------------------------------------------------
-- 2. Résolution d'un billet depuis n'importe quel format scanné.
--    Retourne l'id du billet, ou NULL si introuvable / faux.
-- ------------------------------------------------------------
create or replace function public.resolve_ticket_id_by_qr(p_input text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_input text := nullif(trim(coalesce(p_input, '')), '');
  v_rest text;
  v_mid text;
  v_ticket_no text;
  v_bin text;
  v_expected text;
  v_id uuid;
begin
  if v_input is null then
    return null;
  end if;

  -- Nouveau format humain (insensible à la casse sur le préfixe).
  if lower(v_input) like 'giga-vibe-event.%' then
    v_rest := substr(v_input, 17); -- après `giga-vibe-event.`
    -- `mid.event-slug` : on coupe au DERNIER point.
    if v_rest like '%.%' then
      v_mid := substr(v_rest, 1, length(v_rest) - position('.' in reverse(v_rest)));
      if length(v_mid) >= 26
         and substr(v_mid, length(v_mid) - 24, 1) = '-'
         and substr(v_mid, length(v_mid) - 23) ~ '^[01]{24}$' then
        v_bin := substr(v_mid, length(v_mid) - 23);
        v_ticket_no := substr(v_mid, 1, length(v_mid) - 25);
        if v_ticket_no <> '' and v_ticket_no not like '%.%' and v_ticket_no not like '% %' then
          select id into v_id from public.tickets where ticket_number = v_ticket_no;
          if found then
            select public.qr_binary24(qr_payload) into v_expected
              from public.tickets where id = v_id;
            if v_expected is not null and v_expected = v_bin then
              return v_id;
            end if;
            -- Binaire incorrect -> faux billet (on ne tombe PAS en repli).
            return null;
          end if;
          return null;
        end if;
      end if;
    end if;
    return null;
  end if;

  -- Repli legacy : secret opaque exact (anciens QR URL / QR-... brut).
  select id into v_id
    from public.tickets
    where qr_payload = v_input;
  if found then
    return v_id;
  end if;
  return null;
end;
$$;

revoke all on function public.qr_binary24(text) from public, anon;
grant execute on function public.qr_binary24(text) to anon, authenticated;
revoke all on function public.resolve_ticket_id_by_qr(text) from public, anon;
grant execute on function public.resolve_ticket_id_by_qr(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3. Lecture publique : accepte les deux formats.
-- ------------------------------------------------------------
create or replace function public.lookup_ticket(p_qr text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_t public.tickets%rowtype;
  v_id uuid;
  v_event_title text;
  v_starts_at timestamptz;
  v_venue text;
  v_city text;
  v_type_name text;
  v_buyer_first_name text;
begin
  v_id := public.resolve_ticket_id_by_qr(p_qr);
  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_t from public.tickets where id = v_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select title, starts_at, venue, city
    into v_event_title, v_starts_at, v_venue, v_city
    from public.events where id = v_t.event_id;

  select name into v_type_name
    from public.ticket_types where id = v_t.ticket_type_id;

  select first_name into v_buyer_first_name
    from public.profiles where id = v_t.user_id;

  return jsonb_build_object(
    'ok', true,
    'ticket_number', v_t.ticket_number,
    'holder_name', v_t.holder_name,
    'buyer_first_name', v_buyer_first_name,
    'event_title', v_event_title,
    'starts_at', v_starts_at,
    'venue', v_venue,
    'city', v_city,
    'ticket_type', v_type_name,
    'status', v_t.status
  );
end;
$$;

revoke all on function public.lookup_ticket(text) from public, anon;
grant execute on function public.lookup_ticket(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4. Check-in atomique : accepte les deux formats.
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
  v_id uuid;
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

  v_id := public.resolve_ticket_id_by_qr(p_qr);

  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_t
    from public.tickets
    where id = v_id
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
