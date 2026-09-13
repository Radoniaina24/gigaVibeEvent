-- ============================================================
-- Ticket — Migration 0001 : schéma initial + RLS + Storage
-- Phase 1 : Supabase + données + RLS + Auth
-- Appliquer via : Supabase Dashboard > SQL Editor, ou `supabase db push`
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 0. Helpers sans dépendance aux tables
-- ------------------------------------------------------------
-- Note : is_admin() est défini après la section 1 (Tables) car les
-- fonctions LANGUAGE SQL sont validées à la création et référencent profiles.

-- updated_at automatique
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------

-- Profils (1 profil = 1 auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Catégories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

-- Événements
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text not null,
  address text,
  city text not null default 'Antananarivo',
  latitude double precision,
  longitude double precision,
  organizer text,
  status text not null default 'draft'
    check (status in ('draft','published','sold_out','cancelled','completed')),
  is_featured boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists idx_events_status_starts on public.events(status, starts_at);
create index if not exists idx_events_category on public.events(category_id);
create index if not exists idx_events_slug on public.events(slug);

-- Types de billets
create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  quantity integer not null check (quantity > 0),
  sold integer not null default 0 check (sold >= 0),
  sales_start timestamptz,
  sales_end timestamptz,
  status text not null default 'active'
    check (status in ('active','inactive','sold_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sales_end is null or sales_start is null or sales_end > sales_start)
);
create index if not exists idx_ticket_types_event on public.ticket_types(event_id);

-- Séquence numéros de commande
create sequence if not exists public.order_seq;

-- Commandes
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  subtotal integer not null check (subtotal >= 0),
  fees integer not null default 0 check (fees >= 0),
  total integer not null check (total >= 0),
  payment_method text check (payment_method in ('mvola','orange_money','airtel_money','card','cash')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','processing','paid','failed','cancelled','expired')),
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_orders_event on public.orders(event_id);
create index if not exists idx_orders_number on public.orders(order_number);

-- Lignes de commande
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  quantity integer not null check (quantity > 0 and quantity <= 10),
  unit_price integer not null check (unit_price >= 0),
  total_price integer not null check (total_price >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- Paiements
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null
    check (provider in ('mvola','orange_money','airtel_money','card','cash')),
  amount integer not null check (amount >= 0),
  currency text not null default 'MGA',
  status text not null default 'pending'
    check (status in ('pending','processing','paid','failed','cancelled','expired')),
  provider_ref text unique,
  provider_payload jsonb,
  phone_number text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_payments_user on public.payments(user_id);

-- Billets
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  holder_name text not null,
  qr_payload text not null unique,
  status text not null default 'valid'
    check (status in ('valid','used','cancelled','expired')),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_tickets_user on public.tickets(user_id);
create index if not exists idx_tickets_order on public.tickets(order_id);
create index if not exists idx_tickets_qr on public.tickets(qr_payload);

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on public.audit_logs(entity_type, entity_id);

-- is_admin() : après les tables (fonction SQL validée à la création).
-- Utilisée par les policies RLS et les triggers ci-dessous.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  );
$$;

-- ------------------------------------------------------------
-- 2. Triggers métier
-- ------------------------------------------------------------

-- Création auto du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name', null),
    coalesce(new.raw_user_meta_data ->> 'phone', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Empêche l'escalade de rôle côté client :
-- seul un admin peut changer role / is_active d'un profil.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.role is distinct from new.role or old.is_active is distinct from new.is_active) then
    if (not public.is_admin() and auth.uid() <> '00000000-0000-0000-0000-000000000000') then
      -- Autorise uniquement si l'appelant est admin (service_role bypass RLS de toute façon)
      if (not public.is_admin()) then
        raise exception 'Changement de rôle/statut réservé aux administrateurs.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_no_escalation on public.profiles;
create trigger trg_profiles_no_escalation
  before update of role, is_active on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

-- Empêche sold > quantity (concurrence : la décrément atomique passe par reserve_stock)
create or replace function public.check_ticket_stock()
returns trigger
language plpgsql
as $$
begin
  if (new.sold > new.quantity) then
    raise exception 'Stock insuffisant pour % (sold=% > quantity=%)', new.id, new.sold, new.quantity;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ticket_stock on public.ticket_types;
create trigger trg_ticket_stock
  before insert or update of sold, quantity on public.ticket_types
  for each row execute function public.check_ticket_stock();

-- Numéros auto
create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  seq int;
begin
  seq := nextval('public.order_seq');
  return 'ORDER-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 6, '0');
end;
$$;

-- Réservation atomique de stock (à appeler depuis Edge Function, pas depuis le frontend anon)
create or replace function public.reserve_stock(p_ticket_type_id uuid, p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  if (p_qty <= 0 or p_qty > 10) then
    raise exception 'Quantité invalide.';
  end if;
  update public.ticket_types
  set sold = sold + p_qty, updated_at = now()
  where id = p_ticket_type_id
    and status = 'active'
    and (quantity - sold) >= p_qty
    and (sales_start is null or sales_start <= now())
    and (sales_end is null or sales_end >= now());
  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;

create or replace function public.release_stock(p_ticket_type_id uuid, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ticket_types
  set sold = greatest(0, sold - p_qty), updated_at = now()
  where id = p_ticket_type_id;
end;
$$;

-- Audit auto des changements sensibles (commandes/paiements/billets/événements)
create or replace function public.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    tg_op || '.' || tg_table_name,
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id')),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_orders on public.orders;
create trigger trg_audit_orders
  after update on public.orders
  for each row execute function public.audit_sensitive_change();

drop trigger if exists trg_audit_payments on public.payments;
create trigger trg_audit_payments
  after update on public.payments
  for each row execute function public.audit_sensitive_change();

-- touch updated_at
drop trigger if exists trg_touch_profiles on public.profiles;
create trigger trg_touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_events on public.events;
create trigger trg_touch_events before update on public.events
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_ticket_types on public.ticket_types;
create trigger trg_touch_ticket_types before update on public.ticket_types
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_orders on public.orders;
create trigger trg_touch_orders before update on public.orders
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_payments on public.payments;
create trigger trg_touch_payments before update on public.payments
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.tickets enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- pas d'INSERT client (créé par trigger handle_new_user) ; pas de DELETE client.

-- categories : lecture publique, écriture admin
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (true);
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- events : public ne voit que published ; admin tout
drop policy if exists "events_public_read_published" on public.events;
create policy "events_public_read_published" on public.events
  for select to anon, authenticated using (status = 'published' or public.is_admin());
drop policy if exists "events_admin_write" on public.events;
create policy "events_admin_write" on public.events
  for insert to authenticated with check (public.is_admin());
drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update" on public.events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "events_admin_delete" on public.events;
create policy "events_admin_delete" on public.events
  for delete to authenticated using (public.is_admin());

-- ticket_types : public voit ceux des events published ; admin tout
drop policy if exists "ticket_types_public_read" on public.ticket_types;
create policy "ticket_types_public_read" on public.ticket_types
  for select to anon, authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.status = 'published'
    )
  );
drop policy if exists "ticket_types_admin_write" on public.ticket_types;
create policy "ticket_types_admin_write" on public.ticket_types
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- orders : user = own SELECT/INSERT, pas d'UPDATE/DELETE ; admin tout (traçé par audit)
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders
  for delete to authenticated using (public.is_admin());

-- order_items : via commande possédée
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );
drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own" on public.order_items
  for insert to authenticated with check (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- payments : user SELECT own, INSERT own ; jamais UPDATE/DELETE côté user
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update" on public.payments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- tickets : user SELECT own ; création/vérification côté serveur (service_role) ; admin SELECT+UPDATE
drop policy if exists "tickets_select_own" on public.tickets;
create policy "tickets_select_own" on public.tickets
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "tickets_admin_update" on public.tickets;
create policy "tickets_admin_update" on public.tickets
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- audit_logs : lecture admin uniquement ; écriture via triggers/functions (service_role bypass)
drop policy if exists "audit_admin_read" on public.audit_logs;
create policy "audit_admin_read" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------
-- 4. Storage : bucket event-images
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Lecture publique des images
drop policy if exists "event-images public read" on storage.objects;
create policy "event-images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'event-images');

-- Écriture réservée aux admins (upload/replace/delete)
drop policy if exists "event-images admin insert" on storage.objects;
create policy "event-images admin insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'event-images' and public.is_admin()
  );
drop policy if exists "event-images admin update" on storage.objects;
create policy "event-images admin update" on storage.objects
  for update to authenticated using (
    bucket_id = 'event-images' and public.is_admin()
  ) with check (
    bucket_id = 'event-images' and public.is_admin()
  );
drop policy if exists "event-images admin delete" on storage.objects;
create policy "event-images admin delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'event-images' and public.is_admin()
  );
