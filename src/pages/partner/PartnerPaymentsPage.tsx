import { useMemo, useState } from 'react';
import { Check, ReceiptText, X } from 'lucide-react';
import { usePartnerPayments } from '../../features/partner/hooks';
import { useValidatePayment } from '../../features/orders/hooks';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { signReceiptUrl } from '../../services/storage';
import { DataTable } from '../../components/admin/DataTable';
import { Pagination } from '../../components/admin/Pagination';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { PartnerRowsSkeleton } from './PartnerSkeletons';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { formatAr, formatDateTime } from '../../lib/utils';

const PAGE_SIZE = 15;

/** Paiements des clients à vérifier (mode partenaire §17, sinon lecture seule). */
export function PartnerPaymentsPage() {
  const { data, isPending, isError, refetch } = usePartnerPayments();
  const settings = usePlatformSettings();
  const validate = useValidatePayment();
  const [page, setPage] = useState(1);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const canValidate = settings.data?.paymentValidation === 'partner';

  const pending = useMemo(
    () =>
      (data ?? []).filter((p) => p.status === 'pending' || p.status === 'processing'),
    [data],
  );

  const totalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = pending.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleValidate = async (orderId: string, approved: boolean) => {
    setActionError(null);
    setActionSuccess(null);
    setActingId(orderId);
    try {
      const res = await validate.mutateAsync({ order_id: orderId, approved });
      setActionSuccess(
        approved
          ? `Paiement validé — ${res.tickets} billet${res.tickets > 1 ? 's' : ''} généré${res.tickets > 1 ? 's' : ''}.`
          : 'Paiement refusé — stock libéré.',
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Validation impossible.');
    } finally {
      setActingId(null);
    }
  };

  const openReceipt = async (path: string) => {
    setActionError(null);
    try {
      const url = path.startsWith('http') ? path : await signReceiptUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch {
      setActionError('Reçu illisible.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paiements reçus</h1>
        <p className="text-sm text-zinc-500">
          {settings.isPending
            ? 'Chargement du mode de validation…'
            : canValidate
              ? 'Vérifiez chaque transfert (référence, montant, reçu) puis validez : les billets sont générés aussitôt.'
              : 'La validation est effectuée par Giga Vibe Event. Vous pouvez suivre les déclarations ici.'}
        </p>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}
      {actionSuccess && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {actionSuccess}
        </p>
      )}

      {isPending ? (
        <PartnerRowsSkeleton count={5} />
      ) : isError ? (
        <ErrorState description="Impossible de charger les paiements." onRetry={() => refetch()} />
      ) : pending.length === 0 ? (
        <EmptyState
          title="Aucun paiement en attente."
          description="Les déclarations de transfert de vos clients apparaîtront ici."
        />
      ) : (
        <>
          <DataTable
            caption="Paiements en attente de validation"
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
                        onClick={() => openReceipt(p.receipt_url as string)}
                        className="ml-1 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <ReceiptText className="size-4" aria-hidden />
                      </button>
                    )}
                  </span>
                ),
              },
              {
                key: 'event',
                header: 'Événement',
                render: (p) => <span className="text-xs">{p.order?.event?.title ?? '—'}</span>,
              },
              {
                key: 'client',
                header: 'Client',
                render: (p) => <span className="text-xs">{p.user?.email ?? '—'}</span>,
              },
              {
                key: 'amount',
                header: 'Montant',
                render: (p) => (
                  <span className="font-semibold tabular-nums">{formatAr(p.amount)}</span>
                ),
              },
              {
                key: 'phone',
                header: 'N° utilisé',
                render: (p) => <span className="text-xs">{p.phone_number ?? '—'}</span>,
              },
              {
                key: 'date',
                header: 'Déclaré le',
                render: (p) => (
                  <span className="whitespace-nowrap text-xs">{formatDateTime(p.created_at)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (p) => <OrderStatusBadge status={p.status} />,
              },
              ...(canValidate
                ? [
                    {
                      key: 'actions' as const,
                      header: 'Validation',
                      render: (p: (typeof rows)[number]) => (
                        <span className="flex gap-1">
                          <Button
                            size="sm"
                            loading={actingId === p.order_id}
                            onClick={() => handleValidate(p.order_id, true)}
                            title="Valider : génère les billets"
                          >
                            <Check className="size-4" aria-hidden /> Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={actingId === p.order_id}
                            onClick={() => handleValidate(p.order_id, false)}
                            title="Refuser : libère le stock"
                          >
                            <X className="size-4" aria-hidden />
                          </Button>
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} label="Pagination des paiements" />
        </>
      )}
    </div>
  );
}
