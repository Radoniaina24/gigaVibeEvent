import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ReceiptText, X } from 'lucide-react';
import {
  useAdminPayments,
  type AdminPaymentRow,
} from '../../features/admin/hooks';
import { useValidatePayment } from '../../features/orders/hooks';
import { signReceiptUrl } from '../../services/storage';
import {
  paymentRejectSchema,
  type PaymentRejectInput,
} from '../../schemas/orders';
import { DataTable } from '../../components/admin/DataTable';
import { Pagination } from '../../components/admin/Pagination';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toaster';
import { Select } from '../../components/ui/Fields';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { formatAr, formatDateTime } from '../../lib/utils';

const PAGE_SIZE = 15;
const STATUSES = ['', 'pending', 'processing', 'paid', 'failed', 'cancelled', 'expired'];

const STATUS_LABEL: Record<string, string> = {
  '': 'Tous',
  pending: 'En attente',
  processing: 'En vérification',
  paid: 'Payé',
  failed: 'Refusé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

const METHOD_LABEL: Record<string, string> = {
  yas: 'YAS',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  card: 'Carte',
  cash: 'Espèces',
};

export function AdminPaymentsPage() {
  const { data, isPending, isError, refetch } = useAdminPayments();
  const { toast } = useToast();
  const validate = useValidatePayment();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [actingId, setActingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [review, setReview] = useState<AdminPaymentRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (status && p.status !== status) return false;
      if (
        q &&
        !`${p.provider_ref ?? ''} ${p.order?.order_number ?? ''} ${p.user?.email ?? ''} ${p.order?.event?.title ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleValidate = async (orderId: string, approved: boolean, reason?: string) => {
    setActionError(null);
    setActingId(orderId);
    try {
      const res = await validate.mutateAsync({ order_id: orderId, approved, reason });
      if (approved) {
        if (res.email === 'sent') {
          toast.success(
            'Paiement validé',
            `${res.tickets} billet${res.tickets > 1 ? 's' : ''} généré${res.tickets > 1 ? 's' : ''} et envoyé par email au client.`,
          );
        } else {
          toast.warning(
            'Paiement validé',
            `${res.tickets} billet${res.tickets > 1 ? 's' : ''} généré${res.tickets > 1 ? 's' : ''}, mais l’email n’a pas pu être envoyé — renvoyez-le depuis le détail de la commande.`,
          );
        }
      } else {
        toast.info('Paiement refusé', 'Stock libéré pour les autres clients.');
      }
      setReview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation impossible.';
      setActionError(message);
      toast.error('Validation impossible', message);
    } finally {
      setActingId(null);
    }
  };

  const openReceipt = async (paymentId: string, path: string) => {
    setActionError(null);
    setSigningId(paymentId);
    try {
      const url = path.startsWith('http') ? path : await signReceiptUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch {
      setActionError('Reçu illisible.');
      toast.error('Reçu illisible', 'Impossible d’ouvrir le justificatif.');
    } finally {
      setSigningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paiements</h1>
        <p className="text-sm text-zinc-500">
          Déclarations manuelles à vérifier : référence opérateur, montant et reçu.
        </p>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Recherche"
          type="search"
          placeholder="Référence, N° commande, email, événement…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Statut"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </Select>
      </div>

      {isPending ? (
        <LoadingState label="Chargement des paiements…" />
      ) : isError ? (
        <ErrorState description="Impossible de charger les paiements." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun paiement trouvé." />
      ) : (
        <>
          <DataTable
            caption="Liste des paiements"
            keyOf={(p) => p.id}
            rows={rows}
            columns={[
              {
                key: 'ref',
                header: 'Référence',
                render: (p) => (
                  <span>
                    <span className="font-mono text-xs">{p.provider_ref ?? '—'}</span>
                    {p.receipt_url && (
                      <button
                        type="button"
                        title="Voir le reçu"
                        disabled={signingId === p.id}
                        onClick={() => openReceipt(p.id, p.receipt_url as string)}
                        className="ml-1 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
                      >
                        <ReceiptText className="size-4" aria-hidden />
                      </button>
                    )}
                  </span>
                ),
              },
              {
                key: 'order',
                header: 'Commande',
                render: (p) => (
                  <span className="font-mono text-xs">{p.order?.order_number ?? '—'}</span>
                ),
              },
              {
                key: 'event',
                header: 'Événement',
                render: (p) => (
                  <span className="text-xs">{p.order?.event?.title ?? '—'}</span>
                ),
              },
              {
                key: 'user',
                header: 'Client',
                render: (p) => (
                  <span className="text-xs">
                    {[p.user?.first_name, p.user?.last_name].filter(Boolean).join(' ') ||
                      p.user?.email ||
                      '—'}
                    {p.user?.email && (p.user.first_name || p.user.last_name) && (
                      <span className="block text-zinc-500">{p.user.email}</span>
                    )}
                  </span>
                ),
              },
              {
                key: 'method',
                header: 'Méthode',
                render: (p) => <span>{METHOD_LABEL[p.provider] ?? p.provider}</span>,
              },
              {
                key: 'amount',
                header: 'Montant',
                render: (p) => (
                  <span className="font-semibold tabular-nums">{formatAr(p.amount)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (p) => <OrderStatusBadge status={p.status} />,
              },
              {
                key: 'date',
                header: 'Date',
                render: (p) => (
                  <span className="whitespace-nowrap text-xs">{formatDateTime(p.created_at)}</span>
                ),
              },
              {
                key: 'actions',
                header: 'Validation',
                render: (p) =>
                  p.status === 'pending' || p.status === 'processing' ? (
                    <Button size="sm" onClick={() => setReview(p)}>
                      Examiner
                    </Button>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  ),
              },
            ]}
          />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
            label="Pagination des paiements"
          />
          <p className="text-center text-xs text-zinc-500">
            Les changements de statut sont tracés automatiquement (triggers + table audit_logs).
          </p>
        </>
      )}

      <PaymentReviewModal
        payment={review}
        acting={actingId === review?.order_id && validate.isPending}
        onClose={() => setReview(null)}
        onDecide={handleValidate}
      />
    </div>
  );
}

/**
 * Examen d'un paiement : client, commande, preuve (zoom), puis
 * validation (avec confirmation) ou refus (motif obligatoire).
 */
function PaymentReviewModal({
  payment,
  acting,
  onClose,
  onDecide,
}: {
  payment: AdminPaymentRow | null;
  acting: boolean;
  onClose: () => void;
  onDecide: (orderId: string, approved: boolean, reason?: string) => void;
}) {
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentRejectInput>({ resolver: zodResolver(paymentRejectSchema) });

  useEffect(() => {
    setMode('view');
    setPreviewUrl(null);
    setPreviewError(null);
    reset({ reason: '' });
    if (!payment?.receipt_url || payment.receipt_url.startsWith('http')) {
      setPreviewUrl(payment?.receipt_url ?? null);
      return;
    }
    let cancelled = false;
    signReceiptUrl(payment.receipt_url)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewError('Capture illisible.');
      });
    return () => {
      cancelled = true;
    };
  }, [payment, reset]);

  const clientName =
    [payment?.user?.first_name, payment?.user?.last_name].filter(Boolean).join(' ') ||
    payment?.user?.email ||
    '—';

  return (
    <Modal
      open={payment !== null}
      onClose={onClose}
      title="Vérification du paiement"
      subtitle={payment ? `Commande ${payment.order?.order_number ?? '—'}` : undefined}
      size="lg"
    >
      {!payment ? null : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Client</p>
              <p className="mt-1 font-medium">{clientName}</p>
              <p className="text-xs text-zinc-500">{payment.user?.email}</p>
              {payment.user?.phone && (
                <p className="text-xs text-zinc-500">{payment.user.phone}</p>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Commande</p>
              <p className="mt-1 font-medium">{payment.order?.event?.title ?? '—'}</p>
              <p className="mt-1 text-xs">
                <span className="tabular-nums font-bold">{formatAr(payment.amount)}</span>
                {' · '}
                {METHOD_LABEL[payment.provider] ?? payment.provider}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-500">
                Réf : {payment.provider_ref ?? '—'}
              </p>
              <p className="text-xs text-zinc-500">
                Déclaré le {formatDateTime(payment.created_at)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-zinc-500">Statut</p>
              <p className="mt-1">
                <OrderStatusBadge status={payment.status} />
              </p>
              {payment.phone_number && (
                <p className="mt-2 text-xs text-zinc-500">
                  N° émetteur : {payment.phone_number}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Preuve de paiement</p>
            {previewError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {previewError}
              </p>
            )}
            {previewUrl ? (
              <a href={previewUrl} target="_blank" rel="noopener" title="Ouvrir en grand">
                <img
                  src={previewUrl}
                  alt="Capture du reçu de paiement (cliquer pour zoomer)"
                  className="mt-2 max-h-96 w-full rounded-xl border border-zinc-200 object-contain bg-zinc-50"
                />
              </a>
            ) : (
              !previewError && (
                <p className="mt-2 text-sm text-zinc-500">
                  Aucune capture fournie — vérifiez la référence auprès de l'opérateur.
                </p>
              )
            )}
          </div>

          {mode === 'view' && (
            <div className="flex flex-wrap gap-2">
              <Button
                loading={acting}
                onClick={() => setMode('approve')}
              >
                <Check className="size-4" aria-hidden /> Valider le paiement
              </Button>
              <Button
                variant="secondary"
                loading={acting}
                onClick={() => setMode('reject')}
              >
                <X className="size-4" aria-hidden /> Refuser
              </Button>
            </div>
          )}

          {mode === 'approve' && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
              <p className="font-semibold text-green-900">
                Voulez-vous vraiment valider ce paiement ?
              </p>
              <p className="mt-1 text-green-800">
                Cette action générera automatiquement le ou les billets associés à
                cette commande. Irréversible.
              </p>
              <div className="mt-3 flex gap-2">
                <Button loading={acting} onClick={() => onDecide(payment.order_id, true)}>
                  Confirmer la validation
                </Button>
                <Button variant="ghost" disabled={acting} onClick={() => setMode('view')}>
                  Retour
                </Button>
              </div>
            </div>
          )}

          {mode === 'reject' && (
            <form
              onSubmit={handleSubmit((v) => onDecide(payment.order_id, false, v.reason))}
              className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"
              noValidate
            >
              <label className="block text-sm">
                <span className="font-semibold text-red-900">
                  Motif du refus (obligatoire)
                </span>
                <textarea
                  rows={3}
                  placeholder="Ex. Montant incorrect, référence invalide, capture illisible…"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  {...register('reason')}
                />
              </label>
              {errors.reason && (
                <p role="alert" className="text-sm text-red-700">
                  {errors.reason.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" variant="danger" loading={acting}>
                  Confirmer le refus
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={acting}
                  onClick={() => setMode('view')}
                >
                  Retour
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
