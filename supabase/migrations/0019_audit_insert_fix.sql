-- ============================================================
-- 0019_audit_insert_fix.sql — Répare l'écriture audit_logs depuis le backoffice
-- Symptôme : POST /rest/v1/audit_logs 403 + code 42501
--   « new row violates row-level security policy for table "audit_logs" »
-- Cause la plus fréquente : la migration 0003_audit.sql (policy
--   "audit_admin_insert") n'a jamais été appliquée sur la base distante,
--   qui ne contient alors que la policy SELECT de 0001_init.sql.
--   Autre cause possible : le profil appelant n'est pas admin actif
--   (role != 'admin' ou is_active != true) → is_admin() = false.
-- Appliquer via : Supabase Dashboard > SQL Editor (coller tout le fichier),
--   ou `supabase db push`. Idempotent : ré-exécutable sans risque.
-- ============================================================

-- La fonction utilisée par les policies (recréée au cas où).
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

-- INSERT audit_logs réservé aux admins (frontend backoffice, user_id = auteur).
drop policy if exists "audit_admin_insert" on public.audit_logs;
create policy "audit_admin_insert" on public.audit_logs
  for insert to authenticated
  with check (
    public.is_admin()
    and user_id = auth.uid()
  );

-- Lecture admin (rappel de 0001, conservée ici pour cohérence).
drop policy if exists "audit_admin_read" on public.audit_logs;
create policy "audit_admin_read" on public.audit_logs
  for select to authenticated using (public.is_admin());
