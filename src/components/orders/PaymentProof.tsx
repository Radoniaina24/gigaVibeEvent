import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Expand,
  ExternalLink,
  Hash,
  Image as ImageIcon,
  ImageOff,
  ReceiptText,
} from 'lucide-react';
import { signReceiptUrl } from '../../services/storage';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/utils';

interface PaymentProofProps {
  providerRef: string | null | undefined;
  receiptUrl: string | null | undefined;
  /** Titre affiché dans la lightbox. */
  title?: string;
  /** Densité compacte pour les rails latéraux admin. */
  compact?: boolean;
  className?: string;
}

/**
 * Bloc pro "Référence + Preuve photo" pour les pages détail commande.
 * - Référence opérateur avec bouton copier + feedback visuel.
 * - Capture du transfert : miniature signée (bucket privé), skeleton de
 *   chargement, état vide pro, zoom en lightbox + ouverture nouvel onglet.
 */
export function PaymentProof({
  providerRef,
  receiptUrl,
  title = 'Preuve de paiement',
  compact = false,
  className,
}: PaymentProofProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    setError(null);
    if (!receiptUrl) return;
    if (receiptUrl.startsWith('http')) {
      setPreviewUrl(receiptUrl);
      return;
    }
    setLoading(true);
    signReceiptUrl(receiptUrl)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Capture illisible. Réessayez dans un instant.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptUrl]);

  const copyRef = async () => {
    if (!providerRef) return;
    try {
      await navigator.clipboard?.writeText(providerRef);
    } catch {
      /* presse-papiers indisponible */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* ---------- Référence opérateur ---------- */}
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          <Hash className="size-3.5" aria-hidden />
          Référence de transaction
        </p>
        {providerRef ? (
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <span
              className="min-w-0 flex-1 truncate font-mono text-sm font-bold tracking-wide text-zinc-900"
              title={providerRef}
            >
              {providerRef}
            </span>
            <button
              type="button"
              onClick={copyRef}
              title="Copier la référence"
              aria-label="Copier la référence de transaction"
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {copied ? (
                <Check className="size-4 text-green-600" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
            </button>
          </div>
        ) : (
          <p className="mt-1.5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-400">
            Référence non renseignée
          </p>
        )}
      </div>

      {/* ---------- Photo preuve ---------- */}
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          <ReceiptText className="size-3.5" aria-hidden />
          Photo preuve
        </p>

        {loading ? (
          <div
            role="status"
            aria-label="Chargement de la capture"
            className={cn(
              'relative mt-1.5 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100',
              compact ? 'h-36' : 'h-48',
            )}
          >
            <div aria-hidden className="skeleton absolute inset-0 rounded-none" />
            <div aria-hidden className="absolute inset-0 grid place-items-center">
              <span className="flex flex-col items-center gap-2 text-zinc-400">
                <ImageIcon className="size-8" aria-hidden />
                <span className="text-xs font-medium">Chargement de la capture…</span>
              </span>
            </div>
          </div>
        ) : error ? (
          <p role="alert" className="mt-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </p>
        ) : previewUrl ? (
          <div className="mt-1.5 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 shadow-sm">
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              title="Agrandir la capture"
              aria-label="Agrandir la capture du reçu de paiement"
              className="group relative block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <img
                src={previewUrl}
                alt="Capture du reçu de paiement"
                loading="lazy"
                className={cn(
                  'w-full object-contain bg-zinc-950 transition duration-300 group-hover:opacity-95',
                  compact ? 'max-h-56' : 'max-h-72',
                )}
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-xs font-semibold text-white">
                <span className="inline-flex items-center gap-1.5">
                  <Expand className="size-3.5" aria-hidden />
                  Cliquer pour agrandir
                </span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">
                  {title}
                </span>
              </span>
            </button>
            <div className="flex items-center gap-2 border-t border-white/10 bg-zinc-900 px-3 py-2">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
              >
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                Ouvrir en grand
              </a>
              <a
                href={previewUrl}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/10 hover:text-white"
              >
                Télécharger
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-zinc-400 shadow-sm">
              <ImageOff className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-700">Aucune capture fournie</p>
              <p className="text-xs text-zinc-500">
                Vérifiez la référence auprès de l’opérateur Mobile Money.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Lightbox zoom ---------- */}
      <Modal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        title={title}
        subtitle={providerRef ? `Réf : ${providerRef}` : undefined}
        size="lg"
      >
        {previewUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
              <img
                src={previewUrl}
                alt="Capture du reçu de paiement en grand"
                className="max-h-[65vh] w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-700"
              >
                <ExternalLink className="size-4" aria-hidden />
                Ouvrir dans un nouvel onglet
              </a>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Capture indisponible.</p>
        )}
      </Modal>
    </div>
  );
}
