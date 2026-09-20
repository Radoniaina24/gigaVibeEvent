-- ============================================================
-- Seed partenaires de démonstration (10 organisateurs + logos)
-- À exécuter APRÈS 0005_platform_v2.sql, dans un projet de DEV
-- uniquement, via le SQL Editor Supabase.
-- Logos : fichiers locaux `public/logos/partners/*.svg`
-- (servis par Vite/Vercel à l'URL `/logos/partners/*.svg`).
-- Idempotent : ré-exécutable sans risque (clé = email).
-- ============================================================

insert into public.partners (name, manager_name, phone, email, address, logo_url, contract_info, status)
select v.name, v.manager_name, v.phone, v.email, v.address, v.logo_url, v.contract_info, v.status
from (values
  (
    'ShowPro Madagascar', 'Dina Rakoto', '+261 34 01 234 56', 'contact@showpro.mg',
    'Lot II M 12, Analakely, Antananarivo', '/logos/partners/showpro-madagascar.svg',
    'Contrat annuel concerts — commission 8 %.', 'active'
  ),
  (
    'LiveMG Events', 'Voary Andria', '+261 33 12 345 67', 'hello@livemg.mg',
    'Rue Rainandriamampianina, Antananarivo', '/logos/partners/livemg-events.svg',
    'Partenaire soirées live et DJ sets.', 'active'
  ),
  (
    'TechHub Tana', 'Nirina Randria', '+261 32 98 765 43', 'contact@techhub-tana.mg',
    'Hub Andavamamba, Antananarivo', '/logos/partners/techhub-tana.svg',
    'Conférences tech et formations.', 'active'
  ),
  (
    'RunMad Organisation', 'Hery Rabe', '+261 34 55 667 78', 'info@runmad.mg',
    'Stade Mahamasina, Antananarivo', '/logos/partners/runmad-organisation.svg',
    'Courses et événements sportifs.', 'active'
  ),
  (
    'Jazz & Co', 'Miora Rajaona', '+261 33 44 556 67', 'contact@jazzco.mg',
    'Hôtel des Thermes, Antsirabe', '/logos/partners/jazz-and-co.svg',
    'Jazz nights et concerts intimistes.', 'active'
  ),
  (
    'Festival Vibe', 'Tovo Rakotobe', '+261 32 11 223 34', 'vibe@festival-vibe.mg',
    'Zone ZOMA, Antananarivo', '/logos/partners/festival-vibe.svg',
    'Festivals open-air, contrat saisonnier.', 'active'
  ),
  (
    'SportPro MG', 'Lala Rasoanaivo', '+261 34 77 889 90', 'contact@sportpro.mg',
    'Stade Vontovorona, Antananarivo', '/logos/partners/sportpro-mg.svg',
    'Matchs et compétitions.', 'active'
  ),
  (
    'CultureLive', 'Sahondra Razafy', '+261 33 66 778 89', 'bonjour@culturelive.mg',
    'IFM Analakely, Antananarivo', '/logos/partners/culturelive.svg',
    'Dossier en cours de validation.', 'pending'
  ),
  (
    'EduForm MG', 'Faniry Rakotoarisoa', '+261 32 55 443 32', 'contact@eduform.mg',
    'Lot IV H 8, Ivandry, Antananarivo', '/logos/partners/eduform-mg.svg',
    'Suspendu : pièces contractuelles manquantes.', 'suspended'
  ),
  (
    'Gala Prestige', 'Anja Randrianina', '+261 34 99 112 23', 'events@gala-prestige.mg',
    'Novotel Ivandry, Antananarivo', '/logos/partners/gala-prestige.svg',
    'Ancien partenaire, compte désactivé.', 'disabled'
  )
) as v(name, manager_name, phone, email, address, logo_url, contract_info, status)
where not exists (
  select 1 from public.partners p where p.email = v.email
);
