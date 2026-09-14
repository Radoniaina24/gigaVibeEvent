// Partagé : CORS + réponses JSON (Edge Functions Resend/Auth).
//
// Origines autorisées via ALLOWED_ORIGINS (liste séparée par virgules)
// ou APP_URL. Exemples :
//   ALLOWED_ORIGINS=https://giga-vibe-event.vercel.app,http://localhost:5173
//   ALLOWED_ORIGINS=*  (dev uniquement)
// En mode non-production (EMAIL_MODE != "production"), l'origine de la
// requête est renvoyée telle quelle pour permettre le dev sur localhost
// même si APP_URL pointe vers la production.

function allowedOrigin(req: Request): string {
  const origin = (req.headers.get('origin') ?? '').trim();
  const raw = Deno.env.get('ALLOWED_ORIGINS') ??
    Deno.env.get('APP_URL') ??
    '*';
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const isProd = (Deno.env.get('EMAIL_MODE') ?? 'development') === 'production';

  if (list.includes('*') || list.length === 0) return origin || '*';

  const normOrigin = origin.replace(/\/+$/, '');
  if (normOrigin && list.includes(normOrigin)) return origin;
  // Dev : tolère toute origine (localhost, preview Vercel, ...).
  if (!isProd && normOrigin) return origin;
  // Prod + origine inconnue : première origine configurée (le navigateur
  // bloquera lui-même les autres origines).
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
