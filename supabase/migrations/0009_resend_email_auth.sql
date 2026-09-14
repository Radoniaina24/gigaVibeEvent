-- ============================================================
-- 0009_resend_email_auth.sql — Auth custom 100 % Resend
-- Objectif : AUCUN email Supabase (confirmation / reset / invitation).
-- Supabase = Auth + Database + RLS. Resend = tous les emails.
-- Backend = Supabase Edge Functions (service_role uniquement).
--
-- Tables :
--   email_verification_tokens : confirmation d'inscription (usage unique, hash SHA-256)
--   password_reset_tokens     : mot de passe oublié (usage unique, 30 min)
--   user_invitations          : invitations admin (usage unique, 7 jours)
--   email_logs                : observabilité EMAIL_*_SENT / FAILED + rate limiting
--
-- Sécurité :
--   - Token brut JAMAIS stocké (uniquement token_hash).
--   - RLS activé SANS policy publique : seul le service_role
--     (Edge Functions) peut lire/écrire. Le frontend n'y accède jamais.
--   - Expiration + usage unique (used_at / accepted_at).
-- À exécuter via SQL Editor ou `supabase db push`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tokens de vérification d'email
-- ------------------------------------------------------------
create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_evt_user on public.email_verification_tokens(user_id);
create index if not exists idx_evt_email on public.email_verification_tokens(email);
create index if not exists idx_evt_expires on public.email_verification_tokens(expires_at);

-- ------------------------------------------------------------
-- 2. Tokens de réinitialisation mot de passe
-- ------------------------------------------------------------
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_prt_user on public.password_reset_tokens(user_id);
create index if not exists idx_prt_email on public.password_reset_tokens(email);
create index if not exists idx_prt_expires on public.password_reset_tokens(expires_at);

-- ------------------------------------------------------------
-- 3. Invitations (admin → nouvel utilisateur)
-- ------------------------------------------------------------
create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'user'
    check (role in ('user', 'partner', 'controller', 'admin')),
  token_hash text not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  inviter_name text,
  partner_id uuid references public.partners(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_inv_email on public.user_invitations(email);
create index if not exists idx_inv_expires on public.user_invitations(expires_at);

-- ------------------------------------------------------------
-- 4. Journal d'envois (logs + rate limiting serveur)
-- ------------------------------------------------------------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null
    check (type in ('confirmation', 'password_reset', 'invitation', 'ticket', 'notification')),
  to_email text not null,
  user_id uuid,
  status text not null default 'sent'
    check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_elogs_email_created on public.email_logs(to_email, created_at desc);
create index if not exists idx_elogs_type_created on public.email_logs(type, created_at desc);

-- ------------------------------------------------------------
-- 5. RLS : AUCUN accès client (service_role uniquement)
-- ------------------------------------------------------------
-- Pas de policy = accès refusé pour anon/authenticated.
-- Les Edge Functions utilisent SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
alter table public.email_verification_tokens enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.user_invitations enable row level security;
alter table public.email_logs enable row level security;

-- ------------------------------------------------------------
-- 6. Nettoyage périodique (optionnel, à appeler via cron/pg_cron)
-- ------------------------------------------------------------
create or replace function public.cleanup_expired_email_tokens()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.email_verification_tokens
  where used_at is not null or expires_at < now() - interval '7 days';
  delete from public.password_reset_tokens
  where used_at is not null or expires_at < now() - interval '7 days';
  delete from public.user_invitations
  where accepted_at is not null or expires_at < now() - interval '30 days';
end;
$$;
