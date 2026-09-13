-- ============================================================
-- 0008_partner_logo_self_update.sql — CDC v2 étape 5 : co-branding
-- Le partenaire met à jour SON logo (partners.logo_url) depuis
-- son dashboard. L'identité GVE reste rendue par la plateforme
-- (composant CoBrand, §9-10) et ne peut être modifiée ici.
-- À exécuter APRÈS 0005_platform_v2.sql, via SQL Editor.
-- ============================================================

-- 1. Le partenaire peut mettre à jour sa propre ligne.
--    La restriction aux seuls champs autorisés (logo_url) est
--    enforced par le trigger ci-dessous (§22).
drop policy if exists "partners_self_update" on public.partners;
create policy "partners_self_update" on public.partners
  for update to authenticated
  using (id = public.my_partner_id())
  with check (id = public.my_partner_id());

-- 2. Garde-fou : hors admin, seul logo_url (+ updated_at auto)
--    peut changer. Nom, statuts, contrat, etc. restent admin-only.
create or replace function public.prevent_partner_restricted_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (public.is_admin()) then
    return new;
  end if;
  if (
    old.id is distinct from new.id
    or old.name is distinct from new.name
    or old.manager_name is distinct from new.manager_name
    or old.phone is distinct from new.phone
    or old.email is distinct from new.email
    or old.address is distinct from new.address
    or old.contract_info is distinct from new.contract_info
    or old.status is distinct from new.status
    or old.created_by is distinct from new.created_by
    or old.created_at is distinct from new.created_at
  ) then
    raise exception 'Seul le logo peut être modifié par le partenaire (statut/nom/contrat réservés à Giga Vibe Event).';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partners_self_update_guard on public.partners;
create trigger trg_partners_self_update_guard
  before update on public.partners
  for each row execute function public.prevent_partner_restricted_update();
