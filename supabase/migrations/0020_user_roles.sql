-- ============================================================
-- 0020_user_roles.sql — Multi-rôles pro (RBAC)
-- Un utilisateur peut avoir plusieurs rôles : user / partner /
-- controller / admin, avec scope partenaire optionnel.
--
-- Avant : profiles.role (1 seul rôle) + profiles.partner_id (1 seul).
-- Après : public.user_roles = source de vérité des droits.
--         profiles.role reste le "rôle principal" (affichage + compat),
--         synchronisé automatiquement (admin > partner > controller > user).
--
-- Appliquer via : SQL Editor ou `supabase db push`. Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table de liaison
-- ------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'partner', 'controller', 'admin')),
  partner_id uuid null references public.partners(id) on delete cascade,
  is_active boolean not null default true,
  expires_at timestamptz null,
  assigned_by uuid null references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  check (expires_at is null or expires_at > assigned_at)
);

create index if not exists idx_user_roles_user on public.user_roles(user_id) where is_active;
create index if not exists idx_user_roles_partner on public.user_roles(partner_id) where partner_id is not null;
-- Unicité : 1 rôle global + N scopes partenaires
create unique index if not exists uniq_user_roles_global
  on public.user_roles(user_id, role) where partner_id is null;
create unique index if not exists uniq_user_roles_scoped
  on public.user_roles(user_id, role, partner_id) where partner_id is not null;

alter table public.user_roles enable row level security;

-- ------------------------------------------------------------
-- 2. Backfill depuis profiles.role (sans casse)
-- ------------------------------------------------------------
insert into public.user_roles (user_id, role, partner_id)
select id, role, partner_id from public.profiles
on conflict do nothing;

-- ------------------------------------------------------------
-- 3. Helpers RLS (SECURITY DEFINER = bypass RLS, anti-récursion)
-- ------------------------------------------------------------

-- Rôles actifs d'un user (source de vérité)
create or replace function public.my_roles()
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(distinct r.role), array['user'])
  from public.user_roles r
  join public.profiles p on p.id = r.user_id
  where r.user_id = auth.uid()
    and r.is_active
    and p.is_active
    and (r.expires_at is null or r.expires_at > now());
$$;

create or replace function public.has_role(_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles r
    join public.profiles p on p.id = r.user_id
    where r.user_id = auth.uid()
      and r.role = _role
      and r.is_active
      and p.is_active
      and (r.expires_at is null or r.expires_at > now())
  );
$$;

create or replace function public.has_any_role(_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles r
    join public.profiles p on p.id = r.user_id
    where r.user_id = auth.uid()
      and r.role = any (_roles)
      and r.is_active
      and p.is_active
      and (r.expires_at is null or r.expires_at > now())
  );
$$;

-- Tous les partner_id accessibles (legacy profiles + scopes user_roles)
create or replace function public.my_partner_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select p.partner_id from public.profiles p
  where p.id = auth.uid() and p.partner_id is not null
  union
  select r.partner_id from public.user_roles r
  join public.profiles p on p.id = r.user_id
  where r.user_id = auth.uid()
    and r.partner_id is not null
    and r.is_active
    and p.is_active
    and r.role in ('partner', 'controller')
    and (r.expires_at is null or r.expires_at > now());
$$;

-- Compat : ancien my_partner_id() mono-valeur -> premier scope dispo
create or replace function public.my_partner_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select p.partner_id from public.profiles p
  where p.id = auth.uid() and p.is_active = true
  union
  select r.partner_id from public.user_roles r
  where r.user_id = auth.uid() and r.is_active and r.partner_id is not null
  limit 1;
$$;

-- is_admin() : double lecture (legacy + user_roles) pour migration sans coupure
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
  ) or exists (
    select 1 from public.user_roles r
    join public.profiles p on p.id = r.user_id
    where r.user_id = auth.uid()
      and r.role = 'admin' and r.is_active
      and p.is_active
      and (r.expires_at is null or r.expires_at > now())
  );
$$;

-- ------------------------------------------------------------
-- 4. RLS sur user_roles
-- ------------------------------------------------------------
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select to authenticated using (
    user_id = auth.uid() or public.is_admin()
  );

drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_write" on public.user_roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Anti-escalade : seul un admin (ou service_role, auth.uid() IS NULL) touche user_roles
create or replace function public.prevent_user_roles_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if not public.is_admin() then
    raise exception 'Gestion des rôles réservée aux administrateurs.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_user_roles_no_escalation on public.user_roles;
create trigger trg_user_roles_no_escalation
  before insert or update or delete on public.user_roles
  for each row execute function public.prevent_user_roles_escalation();

-- Assouplit l'ancien trigger profiles : autorise service_role (sync auto + Edge Functions)
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.role is distinct from new.role
      or old.is_active is distinct from new.is_active
      or old.partner_id is distinct from new.partner_id) then
    if auth.uid() is null then return new; end if;
    if (not public.is_admin()) then
      raise exception 'Changement de rôle/statut/partenaire réservé aux administrateurs.';
    end if;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 5. Sync auto : profiles.role = rôle principal (compat frontend)
-- Priorité : admin > partner > controller > user
-- ------------------------------------------------------------
create or replace function public.sync_profile_primary_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(new.user_id, old.user_id);
  v_best text;
  v_partner uuid;
begin
  select r.role into v_best
  from public.user_roles r
  where r.user_id = v_uid and r.is_active
    and (r.expires_at is null or r.expires_at > now())
  order by case r.role when 'admin' then 4 when 'partner' then 3 when 'controller' then 2 else 1 end desc
  limit 1;

  select r.partner_id into v_partner
  from public.user_roles r
  where r.user_id = v_uid and r.is_active and r.partner_id is not null
    and (r.expires_at is null or r.expires_at > now())
  order by r.assigned_at desc limit 1;

  update public.profiles
  set role = coalesce(v_best, 'user'),
      partner_id = v_partner,
      updated_at = now()
  where id = v_uid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_primary_role on public.user_roles;
create trigger trg_sync_primary_role
  after insert or update or delete on public.user_roles
  for each row execute function public.sync_profile_primary_role();

-- Nouveaux inscrits : rôle 'user' par défaut dans user_roles
create or replace function public.ensure_default_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce(new.role, 'user'))
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_default_user_role on public.profiles;
create trigger trg_default_user_role
  after insert on public.profiles
  for each row execute function public.ensure_default_user_role();

-- ------------------------------------------------------------
-- 6. RLS multi-partenaires (ADDITIF : ne casse pas les policies 0005)
-- Permet à un user d'être partner de PLUSIEURS orgas.
-- ------------------------------------------------------------

-- events
drop policy if exists "events_partner_select_multi" on public.events;
create policy "events_partner_select_multi" on public.events
  for select to authenticated using (partner_id in (select public.my_partner_ids()));
drop policy if exists "events_partner_insert_multi" on public.events;
create policy "events_partner_insert_multi" on public.events
  for insert to authenticated with check (
    partner_id in (select public.my_partner_ids())
    and status in ('draft', 'pending_review')
  );
drop policy if exists "events_partner_update_multi" on public.events;
create policy "events_partner_update_multi" on public.events
  for update to authenticated
  using (partner_id in (select public.my_partner_ids()))
  with check (partner_id in (select public.my_partner_ids())
    and status in ('draft', 'pending_review', 'cancelled'));

-- ticket_types
drop policy if exists "ticket_types_partner_select_multi" on public.ticket_types;
create policy "ticket_types_partner_select_multi" on public.ticket_types
  for select to authenticated using (
    exists (select 1 from public.events e
      where e.id = ticket_types.event_id and e.partner_id in (select public.my_partner_ids()))
  );
drop policy if exists "ticket_types_partner_write_multi" on public.ticket_types;
create policy "ticket_types_partner_write_multi" on public.ticket_types
  for all to authenticated
  using (exists (select 1 from public.events e
    where e.id = ticket_types.event_id and e.partner_id in (select public.my_partner_ids())))
  with check (exists (select 1 from public.events e
    where e.id = ticket_types.event_id and e.partner_id in (select public.my_partner_ids())));

-- orders / order_items / payments / tickets (lecture + check-in multi)
drop policy if exists "orders_partner_select_multi" on public.orders;
create policy "orders_partner_select_multi" on public.orders
  for select to authenticated using (
    exists (select 1 from public.events e
      where e.id = orders.event_id and e.partner_id in (select public.my_partner_ids()))
  );
drop policy if exists "order_items_partner_select_multi" on public.order_items;
create policy "order_items_partner_select_multi" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o join public.events e on e.id = o.event_id
      where o.id = order_items.order_id and e.partner_id in (select public.my_partner_ids()))
  );
drop policy if exists "payments_partner_select_multi" on public.payments;
create policy "payments_partner_select_multi" on public.payments
  for select to authenticated using (
    exists (select 1 from public.orders o join public.events e on e.id = o.event_id
      where o.id = payments.order_id and e.partner_id in (select public.my_partner_ids()))
  );
drop policy if exists "tickets_partner_select_multi" on public.tickets;
create policy "tickets_partner_select_multi" on public.tickets
  for select to authenticated using (
    exists (select 1 from public.events e
      where e.id = tickets.event_id and e.partner_id in (select public.my_partner_ids()))
  );
drop policy if exists "tickets_partner_checkin_multi" on public.tickets;
create policy "tickets_partner_checkin_multi" on public.tickets
  for update to authenticated
  using (exists (select 1 from public.events e
    where e.id = tickets.event_id and e.partner_id in (select public.my_partner_ids())))
  with check (exists (select 1 from public.events e
    where e.id = tickets.event_id and e.partner_id in (select public.my_partner_ids())));

-- partners : membre de SES orgas (multi)
drop policy if exists "partners_member_read_multi" on public.partners;
create policy "partners_member_read_multi" on public.partners
  for select to authenticated using (id in (select public.my_partner_ids()));

-- storage partner-assets : écriture dans TOUS ses dossiers
drop policy if exists "partner-assets partner insert multi" on storage.objects;
create policy "partner-assets partner insert multi" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'partner-assets'
    and (storage.foldername(name))[1] in (select public.my_partner_ids()::text)
  );
drop policy if exists "partner-assets partner update multi" on storage.objects;
create policy "partner-assets partner update multi" on storage.objects
  for update to authenticated
  using (bucket_id = 'partner-assets'
    and (storage.foldername(name))[1] in (select public.my_partner_ids()::text))
  with check (bucket_id = 'partner-assets'
    and (storage.foldername(name))[1] in (select public.my_partner_ids()::text));
drop policy if exists "partner-assets partner delete multi" on storage.objects;
create policy "partner-assets partner delete multi" on storage.objects
  for delete to authenticated using (
    bucket_id = 'partner-assets'
    and (storage.foldername(name))[1] in (select public.my_partner_ids()::text)
  );

-- ------------------------------------------------------------
-- 7. checkin_ticket : compatible multi-rôles
-- admin (global) > controller (global) > partner (scopé à ses events)
-- ------------------------------------------------------------
create or replace function public.checkin_ticket(p_qr text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_active boolean;
  v_is_admin boolean;
  v_has_staff boolean;
  v_t public.tickets%rowtype;
  v_event_title text;
  v_type_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select is_active into v_active from public.profiles where id = v_uid;
  if not coalesce(v_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_is_admin := public.is_admin();
  v_has_staff := v_is_admin
    or public.has_any_role(array['controller', 'partner'])
    or exists (select 1 from public.profiles where id = v_uid and role in ('admin','controller','partner'));
  if not v_has_staff then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_t from public.tickets
  where qr_payload = nullif(trim(coalesce(p_qr, '')), '') for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Partner/controller non-admin : uniquement les billets de SES événements.
  -- Admin : tous les événements (bypass scope).
  if not v_is_admin and public.has_role('partner')
     and not public.has_role('controller') then
    if not exists (
      select 1 from public.events e
      where e.id = v_t.event_id and e.partner_id in (select public.my_partner_ids())
    ) then
      return jsonb_build_object('ok', false, 'reason', 'forbidden');
    end if;
  end if;

  select title into v_event_title from public.events where id = v_t.event_id;
  select name into v_type_name from public.ticket_types where id = v_t.ticket_type_id;

  if v_t.status = 'used' then
    return jsonb_build_object('ok', false, 'reason', 'already_used',
      'ticket_number', v_t.ticket_number, 'holder_name', v_t.holder_name,
      'event_title', v_event_title, 'ticket_type', v_type_name, 'used_at', v_t.used_at);
  end if;
  if v_t.status in ('cancelled', 'expired') then
    return jsonb_build_object('ok', false, 'reason', v_t.status,
      'ticket_number', v_t.ticket_number, 'holder_name', v_t.holder_name,
      'event_title', v_event_title, 'ticket_type', v_type_name);
  end if;
  if v_t.status <> 'valid' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  update public.tickets set status = 'used', used_at = now() where id = v_t.id;
  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (v_uid, 'ticket.checkin', 'tickets', v_t.id,
    jsonb_build_object('ticket_number', v_t.ticket_number, 'event_title', v_event_title));
  return jsonb_build_object('ok', true,
    'ticket_number', v_t.ticket_number, 'holder_name', v_t.holder_name,
    'event_title', v_event_title, 'ticket_type', v_type_name);
end;
$$;

revoke all on function public.checkin_ticket(text) from public, anon;
grant execute on function public.checkin_ticket(text) to authenticated;

-- ------------------------------------------------------------
-- 8. Compte super-admin : TOUS les rôles
-- ------------------------------------------------------------
do $$
declare
  v_user_id uuid;
  v_partner_id uuid;
begin
  select id, partner_id into v_user_id, v_partner_id
  from public.profiles where email = 'andriambolaradoniainamichael@gmail.com';

  if v_user_id is null then
    raise notice '0020: profil andriambolaradoniainamichael@gmail.com introuvable (créez le compte puis ré-exécutez ce bloc).';
    return;
  end if;

  if v_partner_id is null then
    select id into v_partner_id from public.partners
    where status = 'active' order by created_at limit 1;
  end if;

  update public.profiles
  set is_active = true, role = 'admin',
      partner_id = coalesce(partner_id, v_partner_id),
      updated_at = now()
  where id = v_user_id;

  insert into public.user_roles (user_id, role, partner_id, assigned_by)
  values (v_user_id, 'user', null, v_user_id)
  on conflict do nothing;

  insert into public.user_roles (user_id, role, partner_id, assigned_by)
  values (v_user_id, 'admin', null, v_user_id)
  on conflict do nothing;

  insert into public.user_roles (user_id, role, partner_id, assigned_by)
  values (v_user_id, 'controller', null, v_user_id)
  on conflict do nothing;

  if v_partner_id is not null then
    insert into public.user_roles (user_id, role, partner_id, assigned_by)
    values (v_user_id, 'partner', v_partner_id, v_user_id)
    on conflict do nothing;
  else
    -- Aucun partenaire actif : rôle partner global (UI débloquée, scope via admin)
    insert into public.user_roles (user_id, role, partner_id, assigned_by)
    values (v_user_id, 'partner', null, v_user_id)
    on conflict do nothing;
  end if;
end $$;
