-- ============================================================
-- 0005_platform_v2.sql — Giga Vibe Event : plateforme multi-partenaires
-- Étape 1 du cahier des charges v2.
--   §2  : rôles user / partner / controller / admin (super admin GVE)
--   §7  : table partners + statuts (active/pending/suspended/disabled)
--   §13 : workflow validation (pending_review / changes_requested / suspended)
--   §17 : mode de validation des paiements (settings.payment_validation)
--   §23 : modèle économique configurable (settings.commission_*)
--   §19 : séquence de numérotation billets GVE-000001 (utilisée étape 6)
--   §22 : isolation des données partenaires (RLS)
--   §27 : journal des actions (audit partners + events)
-- À exécuter APRÈS 0004_admin.sql, via SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rôles étendus
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'partner', 'controller', 'admin'));

-- ------------------------------------------------------------
-- 2. Partenaires (§7)
-- ------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manager_name text,
  phone text,
  email text,
  address text,
  logo_url text,
  contract_info text,
  status text not null default 'pending'
    check (status in ('active', 'pending', 'suspended', 'disabled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_touch_partners on public.partners;
create trigger trg_touch_partners before update on public.partners
  for each row execute function public.touch_updated_at();

-- Rattache un profil à son partenaire (NULL = pas partenaire)
alter table public.profiles
  add column if not exists partner_id uuid references public.partners(id) on delete set null;
create index if not exists idx_profiles_partner on public.profiles(partner_id);

-- Anti-escalade étendue : role / is_active / partner_id réservés à l'admin
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
    if (not public.is_admin()) then
      raise exception 'Changement de rôle/statut/partenaire réservé aux administrateurs.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_no_escalation on public.profiles;
create trigger trg_profiles_no_escalation
  before update of role, is_active, partner_id on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

-- ------------------------------------------------------------
-- 3. Événements : partenaire + workflow de validation (§13, §26)
-- ------------------------------------------------------------
alter table public.events
  add column if not exists partner_id uuid references public.partners(id) on delete set null;
create index if not exists idx_events_partner on public.events(partner_id);

alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check
  check (status in (
    'draft', 'pending_review', 'changes_requested',
    'published', 'sold_out', 'suspended', 'cancelled', 'completed'
  ));

-- ------------------------------------------------------------
-- 4. Paramètres plateforme (§17, §23)
-- ------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  -- Qui valide les paiements manuels : 'gve' | 'partner' | 'auto'
  ('payment_validation', '"gve"'),
  -- Modèle économique : 'per_ticket' | 'per_event' | 'service_fee' | 'hybrid'
  ('commission_model', '"per_ticket"'),
  -- Commission par billet en Ariary (modèle per_ticket / hybrid)
  ('commission_per_ticket', '2000'),
  -- Forfait par événement en Ariary (modèle per_event / hybrid)
  ('commission_per_event', '0'),
  -- Frais de service en % (modèle service_fee / hybrid)
  ('service_fee_percent', '0')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 5. Numérotation billets GVE-000001 (§19, utilisée étape 6)
-- ------------------------------------------------------------
create sequence if not exists public.ticket_number_seq start 1;

create or replace function public.next_ticket_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'GVE-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0');
$$;

-- ------------------------------------------------------------
-- 6. Helpers RLS
-- ------------------------------------------------------------
create or replace function public.my_partner_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select p.partner_id from public.profiles p
  where p.id = auth.uid() and p.is_active = true;
$$;

-- ------------------------------------------------------------
-- 7. RLS : isolation partenaires (§22)
-- ------------------------------------------------------------
alter table public.partners enable row level security;
alter table public.platform_settings enable row level security;

-- partners
drop policy if exists "partners_admin_all" on public.partners;
create policy "partners_admin_all" on public.partners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "partners_public_read_active" on public.partners;
create policy "partners_public_read_active" on public.partners
  for select to anon, authenticated using (
    status = 'active'
    or public.is_admin()
    or id = public.my_partner_id()
  );

-- platform_settings : lecture publique (config non sensible), écriture admin
drop policy if exists "settings_public_read" on public.platform_settings;
create policy "settings_public_read" on public.platform_settings
  for select to anon, authenticated using (true);

drop policy if exists "settings_admin_write" on public.platform_settings;
create policy "settings_admin_write" on public.platform_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- events : le partenaire lit/écrit SES événements (sans publication directe §13)
drop policy if exists "events_partner_select" on public.events;
create policy "events_partner_select" on public.events
  for select to authenticated using (partner_id = public.my_partner_id());

drop policy if exists "events_partner_insert" on public.events;
create policy "events_partner_insert" on public.events
  for insert to authenticated with check (
    partner_id = public.my_partner_id()
    and status in ('draft', 'pending_review')
  );

drop policy if exists "events_partner_update" on public.events;
create policy "events_partner_update" on public.events
  for update to authenticated
  using (partner_id = public.my_partner_id())
  with check (
    partner_id = public.my_partner_id()
    and status in ('draft', 'pending_review', 'cancelled')
  );

-- ticket_types : le partenaire gère les types de SES événements
drop policy if exists "ticket_types_partner_select" on public.ticket_types;
create policy "ticket_types_partner_select" on public.ticket_types
  for select to authenticated using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.partner_id = public.my_partner_id()
    )
  );

drop policy if exists "ticket_types_partner_write" on public.ticket_types;
create policy "ticket_types_partner_write" on public.ticket_types
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.partner_id = public.my_partner_id()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.partner_id = public.my_partner_id()
    )
  );

-- orders : le partenaire lit les commandes de SES événements
drop policy if exists "orders_partner_select" on public.orders;
create policy "orders_partner_select" on public.orders
  for select to authenticated using (
    exists (
      select 1 from public.events e
      where e.id = orders.event_id and e.partner_id = public.my_partner_id()
    )
  );

-- order_items : via la commande du partenaire
drop policy if exists "order_items_partner_select" on public.order_items;
create policy "order_items_partner_select" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = order_items.order_id and e.partner_id = public.my_partner_id()
    )
  );

-- payments : via la commande du partenaire
drop policy if exists "payments_partner_select" on public.payments;
create policy "payments_partner_select" on public.payments
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = payments.order_id and e.partner_id = public.my_partner_id()
    )
  );

-- tickets : le partenaire lit + valide l'entrée de SES billets (scan §21)
drop policy if exists "tickets_partner_select" on public.tickets;
create policy "tickets_partner_select" on public.tickets
  for select to authenticated using (
    exists (
      select 1 from public.events e
      where e.id = tickets.event_id and e.partner_id = public.my_partner_id()
    )
  );

drop policy if exists "tickets_partner_checkin" on public.tickets;
create policy "tickets_partner_checkin" on public.tickets
  for update to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = tickets.event_id and e.partner_id = public.my_partner_id()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = tickets.event_id and e.partner_id = public.my_partner_id()
    )
  );

-- ------------------------------------------------------------
-- 8. Journal : partenaires + événements (§27)
-- ------------------------------------------------------------
drop trigger if exists trg_audit_partners on public.partners;
create trigger trg_audit_partners
  after update on public.partners
  for each row execute function public.audit_sensitive_change();

drop trigger if exists trg_audit_events on public.events;
create trigger trg_audit_events
  after update on public.events
  for each row execute function public.audit_sensitive_change();
