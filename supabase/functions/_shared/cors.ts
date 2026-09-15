// Partagé : CORS + réponses JSON (Edge Functions Resend/Auth).
//
// Origines autorisées via ALLOWED_ORIGINS (liste séparée par virgules)
// ET APP_URL (toujours incluse). Exemples :
//   ALLOWED_ORIGINS=https://giga-vibe-event.vercel.app,https://*.vercel.app,http://localhost:5173
//   ALLOWED_ORIGINS=*  (dev uniquement, ouvre tout)
// Les previews Vercel (https://<projet>-<hash>.vercel.app) sont acceptées
// automatiquement dès qu'une origine *.vercel.app est configurée.
// Ces fonctions n'utilisent pas de cookies (apikey + JWT Bearer uniquement),
// donc renvoyer l'origine demandée est sûr et évite les faux blocages CORS.

function normalize(s: string): string {
  return s.trim().replace(/\/+$/, '');
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Supporte les motifs avec `*` (ex. https://*.vercel.app). */
function matchesPattern(origin: string, pattern: string): boolean {
  const o = normalize(origin).toLowerCase();
  const p = normalize(pattern).toLowerCase();
  if (p === '*') return true;
  if (!p.includes('*')) return o === p;
  const re = new RegExp(
    '^' + p.split('*').map(escapeRegExp).join('.*') + '$',
    'i',
  );
  return re.test(o);
}

/**
 * Previews Vercel : https://<slug>-<hash>(-...).vercel.app acceptées dès que
 * la liste contient une origine du même projet (ex. https://mon-projet.vercel.app
 * autorise https://mon-projet-abc123-team.vercel.app).
 */
function isVercelPreviewOf(origin: string, allowed: string): boolean {
  const originHost = hostOf(origin);
  const allowedHost = hostOf(allowed);
  if (!originHost.endsWith('.vercel.app') || !allowedHost.endsWith('.vercel.app')) {
    return false;
  }
  if (originHost === allowedHost) return true;
  const slug = allowedHost.replace(/\.vercel\.app$/, '');
  if (!slug) return false;
  return originHost.startsWith(slug + '-') && originHost.endsWith('.vercel.app');
}

function allowedList(): string[] {
  // Combine les deux sources (avant : ALLOWED_ORIGINS OU APP_URL, ce qui
  // ignorait APP_URL dès que ALLOWED_ORIGINS était défini, même à localhost).
  const rawAllowed = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  const appUrl = Deno.env.get('APP_URL') ?? '';
  const out: string[] = [];
  for (const part of [...rawAllowed.split(','), appUrl]) {
    const v = normalize(part);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function allowedOrigin(req: Request): string {
  const origin = (req.headers.get('origin') ?? '').trim();
  const list = allowedList();
  const isProd = (Deno.env.get('EMAIL_MODE') ?? 'development') === 'production';

  if (list.length === 0 || list.includes('*')) return origin || '*';
  if (!origin) return list[0];

  const normOrigin = normalize(origin);

  // 1. Correspondance exacte ou wildcard explicite.
  for (const pattern of list) {
    if (matchesPattern(normOrigin, pattern)) return origin;
  }

  // 2. Previews Vercel du même projet.
  for (const allowed of list) {
    if (isVercelPreviewOf(normOrigin, allowed)) return origin;
  }

  // 3. Dev : tolère toute origine (localhost, preview, ...).
  if (!isProd) return origin;

  // 4. Prod + origine inconnue : on renvoie quand même l'origine demandée
  // (pas de cookies sur ces fonctions : apikey + JWT Bearer). Bloquer ici
  // avec list[0] cassait toutes les previews Vercel (URL dynamique par
  // déploiement). On log un avertissement pour corriger la config.
  console.warn(
    `[CORS] origin non listée en production: origin=${normOrigin} allowed=${list.join(',')} ` +
      '(ajoutez-la à ALLOWED_ORIGINS ou https://*.vercel.app puis redéployez)',
  );
  if (/^https:\/\//i.test(normOrigin)) return origin;
  return list[0];
}

export function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function json(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function handleOptions(req: Request): Response {
  return new Response('ok', { headers: corsHeaders(req) });
}
