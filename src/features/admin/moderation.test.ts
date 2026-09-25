import { describe, expect, it } from 'vitest';
import {
  DECISION_STATUS,
  isAdminTransitionAllowed,
  isPartnerEditable,
  isPartnerSubmitAllowed,
  moderationNoteRequired,
  validateModerationNote,
} from './moderation';

describe('workflow validation événement (Rôles §1)', () => {
  it('mappe les décisions admin vers les statuts (publication après validation)', () => {
    expect(DECISION_STATUS.approve).toBe('published');
    expect(DECISION_STATUS.refuse).toBe('cancelled');
    expect(DECISION_STATUS.request_changes).toBe('changes_requested');
    expect(DECISION_STATUS.suspend).toBe('suspended');
    expect(DECISION_STATUS.reactivate).toBe('published');
  });

  it('exige un motif détaillé pour refus / corrections / suspension', () => {
    expect(moderationNoteRequired('refuse')).toBe(true);
    expect(moderationNoteRequired('request_changes')).toBe(true);
    expect(moderationNoteRequired('suspend')).toBe(true);
    expect(moderationNoteRequired('approve')).toBe(false);
    expect(moderationNoteRequired('reactivate')).toBe(false);
    expect(validateModerationNote('refuse', null)).toBeTruthy();
    expect(validateModerationNote('refuse', 'court')).toMatch(/10 caractères/i);
    expect(validateModerationNote('refuse', 'Affiche illisible, ajoutez les horaires SVP')).toBeNull();
  });

  it('autorise l’admin à suspendre un publié et à réactiver un suspendu', () => {
    expect(isAdminTransitionAllowed('published', 'suspend')).toBe(true);
    expect(isAdminTransitionAllowed('suspended', 'reactivate')).toBe(true);
    expect(isAdminTransitionAllowed('pending_review', 'approve')).toBe(true);
    expect(isAdminTransitionAllowed('published', 'approve')).toBe(false);
  });

  it('organisateur : modifiable tant que non validé, jamais publié directement', () => {
    expect(isPartnerEditable('draft')).toBe(true);
    expect(isPartnerEditable('pending_review')).toBe(true);
    expect(isPartnerEditable('changes_requested')).toBe(true);
    expect(isPartnerEditable('cancelled')).toBe(true);
    expect(isPartnerEditable('published')).toBe(false);
    expect(isPartnerEditable('suspended')).toBe(false);
  });

  it('organisateur : soumission brouillon / corrections / refusé corrigé', () => {
    expect(isPartnerSubmitAllowed('draft')).toBe(true);
    expect(isPartnerSubmitAllowed('changes_requested')).toBe(true);
    expect(isPartnerSubmitAllowed('cancelled')).toBe(true);
    expect(isPartnerSubmitAllowed('published')).toBe(false);
    expect(isPartnerSubmitAllowed('pending_review')).toBe(false);
  });
});
