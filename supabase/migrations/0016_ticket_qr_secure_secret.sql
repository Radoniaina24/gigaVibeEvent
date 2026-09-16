-- 0016 : QR sécurisé `giga-vibe-event.NUMERO.SECRET.nom-evenement`.
--
-- Contexte : le format `...NUMERO-24binaire...` (0015) n'offrait que 24 bits
-- (~16 millions de combinaisons, devinable par force brute). Le nouveau
-- format embarque le secret COMPLET `qr_payload` (128 bits, indescriptible) :
--   giga-vibe-event.GVE-000123.QR-9f2c...b3c.concert-giga-2026
--   = giga-vibe-event.<ticket_number>.<qr_payload>.<event-slug>
--   - ticket_number : ex. GVE-000001 (vérifié, anti-échange de N°)
--   - qr_payload    : `QR-` + 32 hex = 128 bits, comparé en exact
--   - event-slug    : affichage uniquement (ignoré par la vérification)
--
-- Compatibilité : les anciens formats restent acceptés (QR 24-binaire déjà
-- imprimés, URL `.../tickets/verify?code=QR-...`, code `QR-...` brut).
-- Aucune colonne ajoutée, aucun billet réémis.

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
  v_parts text[];
  v_ticket_no text;
  v_secret text;
  v_bin text;
  v_expected text;
  v_db_ticket_no text;
  v_id uuid;
begin
  if v_input is null then
    return null;
  end if;

  -- Format humain (insensible à la casse sur le préfixe).
  if lower(v_input) like 'giga-vibe-event.%' then
    v_rest := substr(v_input, 17); -- après `giga-vibe-event.`
    v_parts := string_to_array(v_rest, '.');

    -- Nouveau format sécurisé : NUMERO.SECRET.event-slug (128 bits).
    if array_length(v_parts, 1) = 3 then
      v_ticket_no := nullif(trim(v_parts[1]), '');
      v_secret := nullif(trim(v_parts[2]), '');
      -- v_parts[3] = slug événement, affichage uniquement.
      if v_ticket_no is not null
         and v_ticket_no not like '%.%' and v_ticket_no not like '% %'
         and v_secret ~ '^QR-[0-9a-fA-F]{32}$' then
        select id, ticket_number into v_id, v_db_ticket_no
          from public.tickets where qr_payload = v_secret;
        if found and v_db_ticket_no = v_ticket_no then
          return v_id;
        end if;
      end if;
      -- Secret inconnu ou N° ne correspondant pas -> faux (pas de repli).
      return null;
    end if;

    -- Ancien format 24-binaire (compat) : NUMERO-BINAIRE24.event-slug.
    if array_length(v_parts, 1) = 2
       and length(v_parts[1]) >= 26
       and substr(v_parts[1], length(v_parts[1]) - 24, 1) = '-'
       and substr(v_parts[1], length(v_parts[1]) - 23) ~ '^[01]{24}$' then
      v_bin := substr(v_parts[1], length(v_parts[1]) - 23);
      v_ticket_no := substr(v_parts[1], 1, length(v_parts[1]) - 25);
      if v_ticket_no <> '' and v_ticket_no not like '%.%' and v_ticket_no not like '% %' then
        select id into v_id from public.tickets where ticket_number = v_ticket_no;
        if found then
          select public.qr_binary24(qr_payload) into v_expected
            from public.tickets where id = v_id;
          if v_expected is not null and v_expected = v_bin then
            return v_id;
          end if;
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

revoke all on function public.resolve_ticket_id_by_qr(text) from public, anon;
grant execute on function public.resolve_ticket_id_by_qr(text) to anon, authenticated;
