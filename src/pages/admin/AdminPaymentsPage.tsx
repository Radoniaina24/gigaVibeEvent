import { useMemo, useState } from 'react';
import {
  Banknote,
  Clock3,
  ReceiptText,
  XCircle,
} from 'lucide-react';
import {
  useAdminPayments,
  type AdminPaymentRow,
} from '../../features/admin/hooks';
import type { PartnerPaymentRow } from '../../features/partner/hooks';
import { PaymentsTable } from '../../features/admin/components/PaymentsTable';
import { KpiCard } from '../../components/admin/StatsCard';
import { useValidatePayment } from '../../features/orders/hooks';
import { signReceiptUrl } from '../../services/storage';
import { useToast } from '../../components/ui/Toaster';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';
import { PaymentsPageSkeleton } from '../../components/admin/AdminSkeletons';
import { PaymentReviewModal } from '../../components/orders/PaymentReviewModal';
import { formatAr } from '../../lib/utils';

export function AdminPaymentsPage() {
  const { data, isPending, isError, error, refetch } = useAdminPayments();
  const { toast } = useToast();
  const validate = useValidatePayment();
  const [actingId, setActingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Union : PaymentsTable est typé AdminPaymentRow | PartnerPaymentRow. */
  const [review, setReview] = useState<AdminPaymentRow | PartnerPaymentRow | null>(null);
  /** Lignes visibles après filtres du tableau (KPI synchronisés). */
  const [visiblePayments, setVisiblePayments] = useState<(AdminPaymentRow | PartnerPaymentRow)[] | null>(null);

  const kpiSource = visiblePayments ?? data ?? [];
  const isFiltered = visiblePayments !== null && visiblePayments.length !== (data?.length ?? 0);

  const kpis = useMemo(() => {
    const rows = kpiSource;
    let paidCount = 0;
    let paidAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let failedCount = 0;
    let totalAmount = 0;
    for (const p of rows) {
      totalAmount += p.amount;
      if (p.status === 'paid') {
        paidCount += 1;
        paidAmount += p.amount;
      } else if (p.status === 'pending' || p.status === 'processing') {
        pendingCount += 1;
        pendingAmount += p.amount;
      } else if (p.status === 'failed') {
        failedCount += 1;
      }
    }
    // Mini-courbe 7 jours des montants validés.
    const spark = Array.from({ length: 7 }, () => 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const p of rows) {
      if (p.status !== 'paid') continue;
      const d = new Date(p.created_at);
      const diff = Math.floor((today.getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
      if (diff >= 0 && diff < 7) spark[6 - diff] += p.amount;
    }
    return { total: rows.length, totalAmount, paidCount, paidAmount, pendingCount, pendingAmount, failedCount, spark };
  }, [kpiSource]);

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

      {isPending ? (
        <PaymentsPageSkeleton />
      ) : isError ? (
        <ErrorState
          description={
            error instanceof Error && error.message
              ? `Impossible de charger les paiements : ${error.message}`
              : 'Impossible de charger les paiements.'
          }
          onRetry={() => refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Aucun paiement trouvé." />
      ) : (
        <>
          {/* KPI pro, responsive — synchronisés avec les filtres du tableau */}
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <KpiCard
              label={isFiltered ? 'Encaissé validé (filtre)' : 'Encaissé validé'}
              value={formatAr(kpis.paidAmount)}
              hint={`${kpis.paidCount} paiement${kpis.paidCount > 1 ? 's' : ''} validé${kpis.paidCount > 1 ? 's' : ''}${isFiltered ? ' · sélection filtrée' : ''}`}
              icon={Banknote}
              tone="success"
              spark={kpis.spark}
            />
            <KpiCard
              label={isFiltered ? 'À vérifier (filtre)' : 'À vérifier'}
              value={String(kpis.pendingCount)}
              hint={kpis.pendingCount > 0 ? `${formatAr(kpis.pendingAmount)} en attente${isFiltered ? ' · sélection filtrée' : ''}` : 'File vide, tout est traité'}
              icon={Clock3}
              tone="warning"
            />
            <KpiCard
              label={isFiltered ? 'Déclarations (filtre)' : 'Déclarations'}
              value={String(kpis.total)}
              hint={`${formatAr(kpis.totalAmount)} déclarés${isFiltered ? ' · sélection filtrée' : ' au total'}`}
              icon={ReceiptText}
              tone="brand"
            />
            <KpiCard
              label={isFiltered ? 'Refusés (filtre)' : 'Refusés'}
              value={String(kpis.failedCount)}
              hint="Stock libéré pour les autres clients"
              icon={XCircle}
              tone="neutral"
            />
          </div>
          <PaymentsTable
            data={data}
            signingId={signingId}
            onOpenReceipt={(paymentId, path) => void openReceipt(paymentId, path)}
            onReview={(row) => setReview(row)}
            onFilteredChange={setVisiblePayments}
          />
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
