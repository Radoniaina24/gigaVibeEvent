import type { EventStatus, ValidationDecision } from '../../types/database';

/** Décisions de modération exposées à l'admin (§1 : accepter/refuser/corriger/suspendre). */
export type ModerationDecision = Exclude<ValidationDecision, 'submit'>;

export const DECISION_STATUS: Record<ModerationDecision, EventStatus> = {
  approve: 'published',
  refuse: 'cancelled',
  request_changes: 'changes_requested',
  suspend: 'suspended',
  reactivate: 'published',
};

/** Motif/commentaire obligatoire pour refus, corrections et suspension. */
export function moderationNoteRequired(decision: ModerationDecision): boolean {
  return decision === 'refuse' || decision === 'request_changes' || decision === 'suspend';
}

export function validateModerationNote(
  decision: ModerationDecision,
  note: string | null | undefined,
): string | null {
  if (!moderationNoteRequired(decision)) return null;
  if (!note || note.trim().length < 10) {
    return 'Un motif détaillé (10 caractères minimum) est obligatoire pour informer l’organisateur.';
  }
  return null;
}

/** Transitions admin autorisées (file de modération -> statut cible). */
export function isAdminTransitionAllowed(from: EventStatus, decision: ModerationDecision): boolean {
  switch (decision) {
    case 'approve':
      return from === 'pending_review' || from === 'suspended' || from === 'changes_requested';
    case 'refuse':
      return from === 'pending_review' || from === 'changes_requested';
    case 'request_changes':
      return from === 'pending_review';
    case 'suspend':
      return from === 'published' || from === 'sold_out';
    case 'reactivate':
      return from === 'suspended' || from === 'cancelled';
    default:
      return false;
  }
}

/** Transitions organisateur autorisées (jamais de publication directe). */
export function isPartnerSubmitAllowed(from: EventStatus): boolean {
  return from === 'draft' || from === 'changes_requested' || from === 'cancelled';
}

export const PARTNER_EDITABLE = ['draft', 'pending_review', 'changes_requested', 'cancelled'] as const;
export const PARTNER_SUBMITTABLE = ['draft', 'changes_requested', 'cancelled'] as const;

export function isPartnerEditable(status: EventStatus): boolean {
  return (PARTNER_EDITABLE as readonly string[]).includes(status);
}
