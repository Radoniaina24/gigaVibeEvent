-- 0014 : lookup_ticket expose aussi le prénom du compte acheteur.
-- (Le participant du billet `holder_name` peut différer de l'acheteur.)

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
  v_buyer_first_name text;
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
