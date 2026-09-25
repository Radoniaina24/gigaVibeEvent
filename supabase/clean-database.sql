-- ============================================================
-- clean-database.sql — Vider la base en gardant :
--   - les paramètres (platform_settings)
--   - les catégories (categories)
--   - les utilisateurs (profiles + auth.users + rôles globaux user_roles)
-- Tout le reste (événements, billets, commandes, paiements,
-- partenaires, historique, audit, emails) est supprimé.
--
-- À exécuter dans Supabase > SQL Editor (1 seul passage).
-- Irréversible : vérifiez le projet avant d'exécuter.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Tables transactionnelles : enfants d'abord (FK safe,
--    sans TRUNCATE CASCADE pour ne jamais toucher aux users).
-- ------------------------------------------------------------
delete from public.tickets;
delete from public.payments;
delete from public.order_items;
delete from public.orders;
delete from public.ticket_types;
-- event_validation_history : peut ne pas exister si migration 0021 non appliquée.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='event_validation_history') then
    delete from public.event_validation_history;
  end if;
end $$;
delete from public.events;
delete from public.audit_logs;

-- Emails / invitations / tokens (temporaire, à vider aussi).
delete from public.email_logs;
delete from public.email_verification_tokens;
delete from public.password_reset_tokens;
delete from public.user_invitations;

-- ------------------------------------------------------------
-- 2. Partenaires : à vider aussi (non demandés à garder).
--    - profiles.partner_id passe à NULL (ON DELETE SET NULL)
--    - user_roles scopés (partner_id non null) supprimés en cascade,
--      les rôles globaux (admin, user...) sont conservés.
--    Si vous voulez GARDER les partenaires, commentez ce bloc.
-- ------------------------------------------------------------
delete from public.partners;

-- Sécurité : aucun profil ne doit pointer vers un partenaire supprimé.
update public.profiles set partner_id = null where partner_id is not null;

-- Nettoie les scopes orphelins si la cascade n'a pas tout pris.
delete from public.user_roles where partner_id is not null;

-- ------------------------------------------------------------
-- 3. Compteurs : repartir de zéro (billets GVE-000001, ORDER-...).
-- ------------------------------------------------------------
alter sequence if exists public.ticket_number_seq restart with 1;
alter sequence if exists public.order_seq restart with 1;

commit;

-- ------------------------------------------------------------
-- 4. Vérification : ce qui doit rester > 0, le reste = 0.
-- ------------------------------------------------------------
select 'profiles (gardés)' as table_name, count(*) from public.profiles
union all select 'categories (gardées)', count(*) from public.categories
union all select 'platform_settings (gardés)', count(*) from public.platform_settings
union all select 'user_roles globaux (gardés)', count(*) from public.user_roles where partner_id is null
union all select '--- ci-dessous = 0 attendu ---', 0
union all select 'events', count(*) from public.events
union all select 'ticket_types', count(*) from public.ticket_types
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'payments', count(*) from public.payments
union all select 'tickets', count(*) from public.tickets
union all select 'partners', count(*) from public.partners
union all select 'event_validation_history', count(*) from public.event_validation_history
union all select 'audit_logs', count(*) from public.audit_logs;
