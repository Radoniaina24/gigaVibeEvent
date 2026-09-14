import { checkoutStateSchema, type CheckoutState } from '../../schemas/orders';

const KEY = 'gve:checkout-draft';

/**
 * Brouillon du panier (sessionStorage) : le state de navigation React est
 * perdu lors d'un refresh ou d'un détour par /login ou /verify-email.
 * Les prix sont recalculés côté serveur au moment de la commande, donc
 * rejouer un brouillon légèrement daté reste sûr.
 */
export function saveCheckoutDraft(state: CheckoutState): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible : le tunnel reste utilisable sans reprise */
  }
}

export function loadCheckoutDraft(): CheckoutState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const r = checkoutStateSchema.safeParse(parsed);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
