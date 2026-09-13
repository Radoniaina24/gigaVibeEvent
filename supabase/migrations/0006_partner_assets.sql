-- ============================================================
-- 0006_partner_assets.sql — CDC v2 étape 2 : assets partenaires
-- Bucket `partner-assets` (logos + affiches) :
--   - lecture publique (co-branding page de vente §10)
--   - écriture isolée : chaque partenaire n'écrit que dans son
--     dossier `{partner_id}/...` (§22)
-- Convention de chemin : {partner_id}/logo.ext
--                        {partner_id}/events/{event_id}/affiche.ext
-- À exécuter APRÈS 0005_platform_v2.sql, via SQL Editor.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('partner-assets', 'partner-assets', true)
on conflict (id) do nothing;

-- Lecture publique
drop policy if exists "partner-assets public read" on storage.objects;
create policy "partner-assets public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'partner-assets');

-- Écriture partenaire : uniquement son propre dossier
drop policy if exists "partner-assets partner insert" on storage.objects;
create policy "partner-assets partner insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'partner-assets'
    and (storage.foldername(name))[1] = public.my_partner_id()::text
  );

drop policy if exists "partner-assets partner update" on storage.objects;
create policy "partner-assets partner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'partner-assets'
    and (storage.foldername(name))[1] = public.my_partner_id()::text
  )
  with check (
    bucket_id = 'partner-assets'
    and (storage.foldername(name))[1] = public.my_partner_id()::text
  );

drop policy if exists "partner-assets partner delete" on storage.objects;
create policy "partner-assets partner delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'partner-assets'
    and (storage.foldername(name))[1] = public.my_partner_id()::text
  );

-- Admin : tout
drop policy if exists "partner-assets admin all" on storage.objects;
create policy "partner-assets admin all" on storage.objects
  for all to authenticated
  using (bucket_id = 'partner-assets' and public.is_admin())
  with check (bucket_id = 'partner-assets' and public.is_admin());
