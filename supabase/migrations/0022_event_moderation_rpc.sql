-- ============================================================
-- 0022_event_moderation_rpc.sql — Modération sécurisée (Rôles §1)
-- Organisateur : brouillon, modification tant que non validé
--   (draft / changes_requested / cancelled + pending_review éditable
--   sans publication), soumission, lecture statut + motifs, correction,
--   renvoi, publiés + ventes. Ne publie JAMAIS directement.
-- Admin : file des soumis, détails complets, vérification
--   (images, descriptions, dates, lieux, tarifs, catégories,
--   organisateur), accepter/refuser, corrections + motif obligatoire,
--   publication après validation, dépublication/suspension, historique.
-- Idempotent. À exécuter après 0021 via SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Garde-fou base : le partenaire ne touche ni aux colonnes
--    de modération ni aux statuts réservés à l'admin.
-- ------------------------------------------------------------
create or replace function public.prevent_partner_moderation_bypass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
begin
  if v_is_admin then
    return new;
  end if;

  -- Colonnes de modération réservées à l'admin (motif, date, auteur).
  if (new.review_note is distinct from old.review_note
      or new.reviewed_at is distinct from old.reviewed_at
      or new.reviewed_by is distinct from old.reviewed_by) then
    raise exception 'Motif de modération réservé à Giga Vibe Event.';
  end if;

  -- L'organisateur ne publie / suspend / termine JAMAIS directement.
  if new.status not in ('draft', 'pending_review', 'changes_requested', 'cancelled') then
    raise exception 'Publication directe interdite : soumettez pour validation.';
  end if;

  -- Transitions autorisées côté organisateur.
  if old.status = 'draft' and new.status in ('draft', 'pending_review', 'cancelled') then
    return new;
  end if;
  if old.status = 'changes_requested' and new.status in ('draft', 'pending_review', 'cancelled') then
    return new;
  end if;
  if old.status = 'pending_review' and new.status in ('draft', 'pending_review', 'cancelled') then
    return new;
  end if;
  if old.status = 'cancelled' and new.status in ('draft', 'pending_review', 'cancelled') then
    return new;
  end if;

  raise exception 'Transition de statut non autorisée pour un organisateur.';
end;
$$;

drop trigger if exists trg_events_no_partner_moderation on public.events;
create trigger trg_events_no_partner_moderation
  before update of status, review_note, reviewed_at, reviewed_by on public.events
  for each row execute function public.prevent_partner_moderation_bypass();

-- ------------------------------------------------------------
-- 2. RPC admin : modération atomique
--    (statut + motif + traçabilité + historique en 1 transaction)
-- ------------------------------------------------------------
create or replace function public.moderate_event(
  p_event_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
  v_new text;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_decision not in ('approve', 'refuse', 'request_changes', 'suspend', 'reactivate') then
    return jsonb_build_object('ok', false, 'reason', 'bad_decision');
  end if;

  -- Motif obligatoire pour refus / corrections / suspension (§1 admin).
  if p_decision in ('refuse', 'request_changes', 'suspend') and v_note is null then
    return jsonb_build_object('ok', false, 'reason', 'note_required');
  end if;

  select status into v_old from public.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_new := case p_decision
    when 'approve' then 'published'
    when 'refuse' then 'cancelled'
    when 'request_changes' then 'changes_requested'
    when 'suspend' then 'suspended'
    when 'reactivate' then 'published'
  end;

  update public.events
  set status = v_new,
      review_note = v_note,
      reviewed_at = now(),
      reviewed_by = v_uid,
      updated_at = now()
  where id = p_event_id;

  insert into public.event_validation_history
    (event_id, from_status, to_status, decision, note, created_by)
  values
    (p_event_id, v_old, v_new, p_decision, v_note, v_uid);

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (v_uid, 'event.' || p_decision, 'events', p_event_id,
    jsonb_build_object('from', v_old, 'to', v_new, 'note', v_note));

  return jsonb_build_object('ok', true, 'from', v_old, 'to', v_new);
end;
$$;

revoke all on function public.moderate_event(uuid, text, text) from public, anon;
grant execute on function public.moderate_event(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- 3. Soumission organisateur tracée (submit -> historique)
-- ------------------------------------------------------------
create or replace function public.submit_event_for_review(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
  v_partner uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select status, partner_id into v_old, v_partner
  from public.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_partner is distinct from public.my_partner_id()
     and v_partner not in (select public.my_partner_ids()) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_old not in ('draft', 'changes_requested', 'cancelled') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;

  update public.events
  set status = 'pending_review', updated_at = now()
  where id = p_event_id;

  insert into public.event_validation_history
    (event_id, from_status, to_status, decision, note, created_by)
  values
    (p_event_id, v_old, 'pending_review', 'submit', null, v_uid);

  return jsonb_build_object('ok', true, 'from', v_old, 'to', 'pending_review');
end;
$$;

revoke all on function public.submit_event_for_review(uuid) from public, anon;
grant execute on function public.submit_event_for_review(uuid) to authenticated;
