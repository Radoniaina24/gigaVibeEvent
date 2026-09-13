-- ============================================================
-- Seed de démonstration (Phase 1)
-- À exécuter APRÈS 0001_init.sql, dans un projet de DEV uniquement.
-- Crée : 5 catégories + 10 événements + ticket_types.
-- Les profils/commandes/billets de test seront créés via l'app
-- (handle_new_user) ou en Phase 3.
-- ============================================================

-- Catégories
insert into public.categories (name, slug, description, icon) values
  ('Concert', 'concert', 'Concerts et live music', 'music'),
  ('Sport', 'sport', 'Matchs et compétitions', 'trophy'),
  ('Conférence', 'conference', 'Conférences et talks', 'mic'),
  ('Formation', 'formation', 'Ateliers et formations', 'graduation-cap'),
  ('Festival', 'festival', 'Festivals et grands rassemblements', 'party-popper')
on conflict (slug) do nothing;

-- Événements (dates futures 2026, Antananarivo)
-- On utilise des IDs fixes pour pouvoir lier les ticket_types de façon idempotente.
with cats as (
  select slug, id from public.categories
),
ev as (
  insert into public.events
    (id, title, slug, description, category_id, starts_at, ends_at, venue, address, city, organizer, status, is_featured)
  values
    (gen_random_uuid(), 'Summer Festival 2026', 'summer-festival-2026', 'Le plus grand festival open-air de Tana.', (select id from cats where slug='festival'), '2026-10-12 18:00+03', '2026-10-12 23:00+03', 'Stade Municipal', 'Mahamasina', 'Antananarivo', 'ShowPro MG', 'published', true),
    (gen_random_uuid(), 'Concert Acoustique Nosy', 'concert-acoustique-nosy', 'Soirée acoustique intimiste.', (select id from cats where slug='concert'), '2026-09-20 19:00+03', '2026-09-20 22:00+03', 'Le Glacier', 'Analakely', 'Antananarivo', 'LiveMG', 'published', true),
    (gen_random_uuid(), 'Match Amical CNaPS vs Elgeco', 'match-cnaaps-elgeco', 'Derby de la capitale.', (select id from cats where slug='sport'), '2026-09-28 15:00+03', '2026-09-28 17:00+03', 'Stade Vontovorona', 'Vontovorona', 'Antananarivo', 'FMF', 'published', false),
    (gen_random_uuid(), 'Conférence Tech Tana 2026', 'conference-tech-tana-2026', 'IA, cloud et startups à Madagascar.', (select id from cats where slug='conference'), '2026-11-05 09:00+03', '2026-11-05 17:00+03', 'CCI Ivato', 'Ivato', 'Antananarivo', 'TechMG', 'published', true),
    (gen_random_uuid(), 'Formation React & Supabase', 'formation-react-supabase', '2 jours pour shipper une app SaaS.', (select id from cats where slug='formation'), '2026-10-02 09:00+03', '2026-10-03 17:00+03', 'Hub Andavamamba', 'Andavamamba', 'Antananarivo', 'CodeMG', 'published', false),
    (gen_random_uuid(), 'Jazz Night Antsirabe', 'jazz-night-antsirabe', 'Jazz sous les étoiles.', (select id from cats where slug='concert'), '2026-10-18 20:00+03', '2026-10-18 23:00+03', 'Hôtel des Thermes', 'Centre-ville', 'Antsirabe', 'JazzMG', 'published', false),
    (gen_random_uuid(), 'Festival des Baleines (veille)', 'festival-baleines-veille', 'Conférence + projection nature.', (select id from cats where slug='festival'), '2026-11-20 18:00+03', '2026-11-20 21:00+03', 'IFM', 'Analakely', 'Antananarivo', 'NatureMG', 'draft', false),
    (gen_random_uuid(), 'Semi-marathon de Tana', 'semi-marathon-tana', '21 km dans les collines.', (select id from cats where slug='sport'), '2026-12-06 06:00+03', '2026-12-06 11:00+03', 'Départ Mahamasina', 'Mahamasina', 'Antananarivo', 'RunMG', 'published', true),
    (gen_random_uuid(), 'Formation Mobile Money APIs', 'formation-mvola-apis', 'Intégrer MVola / Orange / Airtel.', (select id from cats where slug='formation'), '2026-09-25 09:00+03', '2026-09-25 16:00+03', 'En ligne', 'Remote', 'Antananarivo', 'PayMG', 'published', false),
    (gen_random_uuid(), 'Gala de fin d''année', 'gala-fin-annee', 'Dîner + concert caritatif.', (select id from cats where slug='concert'), '2026-12-19 19:00+03', '2026-12-19 23:30+03', 'Novotel', 'Ivandry', 'Antananarivo', 'GalaMG', 'published', false)
  on conflict (slug) do update set
    title = excluded.title,
    status = excluded.status
  returning id, slug
)
select count(*) from ev;

-- Types de billets : 3 par événement publié (VIP / STANDARD / EARLY BIRD quand pertinent)
-- Idempotent via suppression/recréation contrôlée sur les slugs seedés uniquement en DEV.
-- (En production, ne jamais exécuter ce bloc.)
insert into public.ticket_types (event_id, name, description, price, quantity, status, sales_start, sales_end)
select e.id, t.name, t.description, t.price, t.quantity, 'active', now() - interval '7 days', e.starts_at
from public.events e
join (values
  ('VIP', 'Accès zone VIP + coupe-file', 150000, 100),
  ('STANDARD', 'Accès standard', 50000, 500),
  ('EARLY BIRD', 'Tarif réduit, quantité limitée', 35000, 200)
) as t(name, description, price, quantity) on true
where e.slug in (
  'summer-festival-2026','concert-acoustique-nosy','match-cnaaps-elgeco',
  'conference-tech-tana-2026','formation-react-supabase','jazz-night-antsirabe',
  'semi-marathon-tana','formation-mvola-apis','gala-fin-annee'
)
and not exists (
  select 1 from public.ticket_types tt
  where tt.event_id = e.id and tt.name = t.name
);
