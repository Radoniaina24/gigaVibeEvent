-- ============================================================
-- 0021_event_validation.sql — Workflow validation événement (Organisateur/Admin)
-- Exigences :
--   Organisateur : créer (brouillon), modifier tant que non validé
--     (draft/changes_requested/cancelled), soumettre, consulter statut +
--     motifs de rejet, corriger + renvoyer, voir publiés + ventes/billets.
--     Ne doit JAMAIS publier directement.
--   Admin : voir soumis, détails complets, vérifier images/descriptions/
--     dates/lieux/tarifs/catégories/organisateur, accepter/refuser,
--     demander corrections + motif obligatoire, publier après validation,
--     dépublier/suspendre, consulter historique.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Colonnes de modération sur events (motif visible partenaire)
-- ------------------------------------------------------------
alter table public.events
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_events_reviewed_by on public.events(reviewed_by);

-- ------------------------------------------------------------
-- 2. Historique des validations (exigence admin : consulter historique ;
--    exigence organisateur : consulter motifs de rejet)
-- ------------------------------------------------------------
create table if not exists public.event_validation_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  from_status text,
  to_status text not null,
  decision text not null
    check (decision in ('submit', 'approve', 'refuse', 'request_changes', 'suspend', 'reactivate')),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_validation_event on public.event_validation_history(event_id, created_at desc);
create index if not exists idx_event_validation_decision on public.event_validation_history(decision);

alter table public.event_validation_history enable row level security;

-- Admin : tout
drop policy if exists "event_validation_admin_all" on public.event_validation_history;
create policy "event_validation_admin_all" on public.event_validation_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Partenaire : lit l'historique de SES événements (motifs de rejet inclus)
drop policy if exists "event_validation_partner_select" on public.event_validation_history;
create policy "event_validation_partner_select" on public.event_validation_history
  for select to authenticated using (
    exists (
      select 1 from public.events e
      where e.id = event_validation_history.event_id
        and e.partner_id = public.my_partner_id()
    )
  );

-- Partenaire (multi-rôles 0020) : même lecture via my_partner_ids()
drop policy if exists "event_validation_partner_select_multi" on public.event_validation_history;
create policy "event_validation_partner_select_multi" on public.event_validation_history
  for select to authenticated using (
    exists (
      select 1 from public.events e
      where e.id = event_validation_history.event_id
        and e.partner_id in (select public.my_partner_ids())
    )
  );

-- ------------------------------------------------------------
-- 3. Durcissement workflow : le partenaire ne publie JAMAIS directement
--    - INSERT : brouillon uniquement (création -> draft, soumission ensuite)
--    - UPDATE : cible autorisée = draft / pending_review / changes_requested / cancelled
--      (published / suspended / sold_out / completed / ... réservés à l'admin)
--    Ancien bug : changes_requested absent du WITH CHECK -> un événement
--    renvoyé en correction devenait non modifiable côté RLS.
-- ------------------------------------------------------------
drop policy if exists "events_partner_insert" on public.events;
create policy "events_partner_insert" on public.events
  for insert to authenticated with check (
    partner_id = public.my_partner_id()
    and status = 'draft'
  );

drop policy if exists "events_partner_update" on public.events;
create policy "events_partner_update" on public.events
  for update to authenticated
  using (partner_id = public.my_partner_id())
  with check (
    partner_id = public.my_partner_id()
    and status in ('draft', 'pending_review', 'changes_requested', 'cancelled')
  );

drop policy if exists "events_partner_insert_multi" on public.events;
create policy "events_partner_insert_multi" on public.events
  for insert to authenticated with check (
    partner_id in (select public.my_partner_ids())
    and status = 'draft'
  );

drop policy if exists "events_partner_update_multi" on public.events;
create policy "events_partner_update_multi" on public.events
  for update to authenticated
  using (partner_id in (select public.my_partner_ids()))
  with check (partner_id in (select public.my_partner_ids())
    and status in ('draft', 'pending_review', 'changes_requested', 'cancelled'));

-- ------------------------------------------------------------
-- 4. Journal auto : toute validation tracée (audit_sensitive_change existe en 0001)
-- ------------------------------------------------------------
-- (les triggers trg_audit_events couvrent déjà les UPDATE de events ;
--  l'historique fin est porté par event_validation_history ci-dessus)
