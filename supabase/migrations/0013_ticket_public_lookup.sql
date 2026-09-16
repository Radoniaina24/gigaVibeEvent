-- 0013 : Lecture publique limitée d'un billet via son QR (page /tickets/verify).
--
-- Le QR encode une URL de vérification contenant le secret opaque.
-- `lookup_ticket(qr)` SECURITY DEFINER expose UNIQUEMENT l'affichage public :
-- événement, date/lieu, type de billet, participant et statut — jamais
-- user_id, order_id, email ni autre billet. Entropie 128 bits : indescriptible.

create or replace function public.lookup_ticket(p_qr text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_t public.tickets%rowtype;
  v_event_title text;
  v_starts_at timestamptz;
  v_venue text;
  v_city text;
  v_type_name text;
begin
  select * into v_t
    from public.tickets
    where qr_payload = nullif(trim(coalesce(p_qr, '')), '');

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select title, starts_at, venue, city
    into v_event_title, v_starts_at, v_venue, v_city
    from public.events where id = v_t.event_id;

  select name into v_type_name
    from public.ticket_types where id = v_t.ticket_type_id;

  return jsonb_build_object(
    'ok', true,
    'ticket_number', v_t.ticket_number,
    'holder_name', v_t.holder_name,
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
