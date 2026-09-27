-- ============================================================
-- Seed 4 partenaires exemples (complément de seed-partners.sql)
-- À exécuter dans le SQL Editor Supabase, projet de DEV uniquement.
-- Logos : fichiers locaux `public/logos/partners/*.svg`
-- (servis par Vite/Vercel à l'URL `/logos/partners/*.svg`).
-- Idempotent : ré-exécutable sans risque (clé = email).
-- ============================================================

insert into public.partners (name, manager_name, phone, email, address, logo_url, contract_info, status)
select v.name, v.manager_name, v.phone, v.email, v.address, v.logo_url, v.contract_info, v.status
from (values
  (
    'Ndao Events', 'Fanja Ravelo', '+261 34 22 118 90', 'contact@ndao-events.mg',
    'Lot III K 45, Ankorondrano, Antananarivo', '/logos/partners/ndao-events.svg',
    'Mariages et galas — commission 10 %.', 'active'
  ),
  (
    'Hira Live Prod', 'Njaka Randriamora', '+261 33 78 442 10', 'booking@hiralive.mg',
    'Avenue de l''Indépendance, Antsirabe', '/logos/partners/hira-live-prod.svg',
    'Concerts variétés malgaches, contrat annuel.', 'active'
  ),
  (
    'Trail Mada', 'Mamy Andriatsima', '+261 32 60 907 33', 'info@trailmada.mg',
    'Ambatobe, Antananarivo', '/logos/partners/trail-mada.svg',
    'Trails et sport outdoor, saison sèche.', 'active'
  ),
  (
    'Tanora Tech', 'Keven Rakotomalala', '+261 34 90 335 71', 'hello@tanora-tech.mg',
    'Lot II Y 21, Andranomena, Antananarivo', '/logos/partners/tanora-tech.svg',
    'Meetups étudiants et hackathons. Dossier en validation.', 'pending'
  )
) as v(name, manager_name, phone, email, address, logo_url, contract_info, status)
where not exists (
  select 1 from public.partners p where p.email = v.email
);
