/**
 * Cache du support de l'embed `partner:partners!events_partner_id_fkey(...)`.
 * Contexte : migration 0005 ajoute `events.partner_id`. Tant qu'elle n'est pas
 * appliquée, la requête complète répond 400 PGRST200. Le fallback sans
 * partenaire fonctionne, mais sans ce cache on retente la requête qui échoue
 * à chaque refresh → un 400 dans la console à chaque fois.
 *
 * Stockage : mémoire + sessionStorage (survit au refresh, pas aux onglets
 * fermés). Après avoir appliqué la migration 0005, fermer l'onglet ou appeler
 * `clearPartnerEmbedCache()` pour retenter la requête complète.
 */

const STORAGE_KEY = 'gve:partner-embed-supported:v1';

let mem: boolean | null = null;

function readStorage(): boolean | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* stockage indisponible (SSR/tests) */
  }
  return null;
}

function writeStorage(ok: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, ok ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Faut-il tenter la requête avec l'embed partenaire ? */
export function shouldTryPartnerEmbed(): boolean {
  if (mem !== null) return mem;
  const stored = readStorage();
  if (stored !== null) {
    mem = stored;
    return stored;
  }
  return true; // par défaut : on tente la requête complète
}

/** Mémorise le résultat du probe (succès ou PGRST200). */
export function markPartnerEmbedSupported(ok: boolean): void {
  mem = ok;
  writeStorage(ok);
}

/** À appeler après application de la migration 0005 pour re-tester. */
export function clearPartnerEmbedCache(): void {
  mem = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Détecte l'erreur PostgREST PGRST200 "Could not find a relationship".
 * Cas typique : migration 0005 non appliquée → 400 sur l'embed partenaire.
 */
export function isMissingRelationshipError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  if (e.code === 'PGRST200') return true;
  const haystack = `${e.message ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`.toLowerCase();
  return haystack.includes('could not find a relationship');
}
