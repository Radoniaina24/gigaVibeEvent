// Partagé : tokens cryptographiques (jamais stockés en clair).
// Token brut (64 hex chars, 256 bits) -> SHA-256 hex stocké en base.

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Expiration helper : minutes à partir de maintenant (ISO). */
export function expiresInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function expiresInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 3600_000).toISOString();
}
