-- ============================================================
-- 0004_admin.sql — Promotion du compte administrateur (DEV)
-- À exécuter APRÈS 0001_init.sql (et après création du compte auth,
-- voir étapes ci-dessous).
--
-- IMPORTANT : un mot de passe ne peut PAS être créé via une migration
-- (Supabase Auth hache les mots de passe côté serveur). Étapes :
--   1. Dashboard Supabase → Authentication → Users → « Add user » →
--      « Create new user » : email andriambolaradoniainamichael@gmail.com
--      + mot de passe choisi, en cochant « Auto Confirm User »
--      (la confirmation email est active).
--      (Alternative : s'inscrire via /register puis confirmer par email.)
--   2. Le trigger handle_new_user crée alors le profil automatiquement.
--   3. Exécuter CE fichier dans le SQL Editor : il passe le profil en admin.
-- Ne commitez JAMAIS un mot de passe en clair dans ce dépôt.
-- ============================================================

update public.profiles
set role = 'admin', updated_at = now()
where email = 'andriambolaradoniainamichael@gmail.com';
