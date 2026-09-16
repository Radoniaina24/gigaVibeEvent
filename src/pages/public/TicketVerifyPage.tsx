import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  CalendarDays,
  MapPin,
  ScanLine,
  ShieldCheck,
  Ticket as TicketIcon,
  User,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { lookupTicket, verifyTicket, type LookupResult } from '../../features/tickets/verifyTicket';
import { ticketCodeFromQrValue } from '../../lib/ticketQr';
import { formatDate, formatShortDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

function lookupTone(status: string): 'success' | 'neutral' | 'danger' | 'warning' {
  switch (status) {
    case 'valid':
      return 'success';
    case 'used':
      return 'neutral';
    case 'cancelled':
    case 'expired':
      return 'danger';
    default:
      return 'warning';
  }
}

const LOOKUP_LABEL: Record<string, string> = {
  valid: 'Billet valide',
  used: 'Déjà utilisé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

/**
 * Page publique ouverte par le QR : nom de l'événement + Giga Vibe Event,
 * détails du billet et statut. Le contrôleur connecté peut valider l'entrée.
 * Accepte le format humain `giga-vibe-event.NUMERO.SECRET.event`,
 * les anciens formats (`NUM-BINAIRE24`, URL `.../tickets/verify?code=QR-...`)
 * et les codes `QR-...`.
 */
export function TicketVerifyPage() {
  const [params, setParams] = useSearchParams();
  const { user, profile } = useAuth();
  const raw = params.get('code') ?? '';
  const code = ticketCodeFromQrValue(raw);
  const [manual, setManual] = useState('');

  const [result, setResult] = useState<LookupResult | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [isError, setIsError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsPending(true);
    setIsError(false);
    setResult(null);
    setCheckMsg(null);
    if (!code) {
      setIsPending(false);
      return;
    }
    lookupTicket(code)
      .then((r) => {
        if (!cancelled) {
          setResult(r);
          setIsPending(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsError(true);
          setIsPending(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const staff = user && profile && ['admin', 'controller', 'partner'].includes(profile.role);

  const handleCheckin = async () => {
    setChecking(true);
    setCheckMsg(null);
    try {
      const res = await verifyTicket(code);
      if (res.ok) {
        setCheckMsg({ ok: true, text: `Entrée validée — ${res.holder_name} (${res.ticket_number}).` });
        setResult((prev) =>
          prev && prev.ok ? { ...prev, status: 'used' } : prev,
        );
      } else if (res.reason === 'already_used') {
        setCheckMsg({ ok: false, text: 'Billet déjà utilisé — entrée refusée (photocopie possible).' });
        setResult((prev) =>
          prev && prev.ok ? { ...prev, status: 'used' } : prev,
        );
      } else if (res.reason === 'forbidden') {
        setCheckMsg({ ok: false, text: 'Compte non autorisé pour le contrôle.' });
      } else if (res.reason === 'not_found') {
        setCheckMsg({ ok: false, text: 'Billet introuvable — possible faux billet.' });
      } else {
        setCheckMsg({ ok: false, text: `Billet ${res.reason === 'cancelled' ? 'annulé' : 'expiré'} — entrée refusée.` });
      }
    } catch {
      setCheckMsg({ ok: false, text: 'Vérification impossible — réessayez.' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      {!code ? (
        <div className="space-y-4">
          <EmptyState
            title="Aucun billet à vérifier."
            description="Scannez le QR Code d'un billet Giga Vibe Event — vous verrez giga-vibe-event.NUMERO.SECRET.nom-evenement — puis collez-le ici, ou ouvrez le lien de vérification."
            action={
              <Link to="/events">
                <Button size="sm">Voir les événements</Button>
              </Link>
            }
          />
          <Card className="space-y-2 p-4">
            <label htmlFor="qr-manual" className="text-sm font-semibold">
              Coller le contenu du QR scanné
            </label>
            <p className="font-mono text-[11px] break-all text-zinc-500">
              Ex. giga-vibe-event.GVE-000123.QR-9f2c4a7b1d3e4f5a6b7c8d9e0f1a2b3c.mon-evenement
            </p>
            <div className="flex gap-2">
              <input
                id="qr-manual"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="giga-vibe-event.…"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-brand-500"
              />
              <Button
                size="sm"
                disabled={!manual.trim()}
                onClick={() => setParams({ code: manual.trim() })}
              >
                Vérifier
              </Button>
            </div>
          </Card>
        </div>
      ) : isPending ? (
        <LoadingState label="Vérification du billet…" />
      ) : isError ? (
        <ErrorState description="Vérification impossible." onRetry={() => window.location.reload()} />
      ) : !result || !result.ok ? (
        <EmptyState
          title="Billet introuvable."
          description="Ce QR Code ne correspond à aucun billet — méfiez-vous des faux billets."
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Marque */}
          <div className="hero-glow relative overflow-hidden bg-night-950 px-5 py-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpeg"
                alt="Logo Giga Vibe Event"
                className="size-11 shrink-0 rounded-xl bg-white object-cover ring-1 ring-white/20"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-400">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  Giga Vibe Event · Billetterie officielle
                </p>
                <h1 className="mt-0.5 truncate text-xl font-bold text-white" title={result.event_title ?? 'Événement'}>
                  {result.event_title ?? 'Événement'}
                </h1>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <p className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <TicketIcon className="size-4 text-brand-600" aria-hidden />
                {result.ticket_type ?? 'Billet'}
              </span>
              <Badge tone={lookupTone(result.status)}>
                {LOOKUP_LABEL[result.status] ?? result.status}
              </Badge>
            </p>

            <dl className="grid gap-2 rounded-xl bg-zinc-50 p-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="size-4 shrink-0 text-zinc-400" aria-hidden />
                <span className="font-medium">{result.holder_name}</span>
                {result.buyer_first_name && (
                  <span className="text-xs text-zinc-500">
                    · compte : {result.buyer_first_name}
                  </span>
                )}
              </div>
              {result.starts_at && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-zinc-400" aria-hidden />
                  <span>
                    {formatDate(result.starts_at)}{' '}
                    <span className="tabular-nums text-zinc-500">· {formatShortDateTime(result.starts_at)}</span>
                  </span>
                </div>
              )}
              {(result.venue || result.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-zinc-400" aria-hidden />
                  <span>
                    {[result.venue, result.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ScanLine className="size-4 shrink-0 text-zinc-400" aria-hidden />
                <span className="font-mono text-xs">{result.ticket_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <ScanLine className="size-4 shrink-0 text-zinc-200" aria-hidden />
                <span className="font-mono text-[11px] break-all text-zinc-400" title={code}>
                  {code}
                </span>
              </div>
            </dl>

            {checkMsg && (
              <p
                role={checkMsg.ok ? 'status' : 'alert'}
                className={
                  checkMsg.ok
                    ? 'rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800'
                    : 'rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700'
                }
              >
                {checkMsg.text}
              </p>
            )}

            {staff ? (
              <Button onClick={handleCheckin} loading={checking} className="w-full" size="lg">
                <ShieldCheck className="size-4" aria-hidden /> Valider l’entrée
              </Button>
            ) : (
              <p className="rounded-lg bg-zinc-50 p-3 text-center text-xs text-zinc-500">
                Billet vérifié par Giga Vibe Event. Présentez ce QR à l’entrée —
                seul le contrôle officiel fait foi.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
