import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CalendarDays,
  Check,
  Copy,
  Mail,
  MapPin,
  ReceiptText,
  Ticket as TicketIcon,
  User,
} from 'lucide-react';
import { useAdminTickets } from '../../features/admin/hooks';
import { useAdminSetOrderStatus, useOrderDetail } from '../../features/orders/hooks';
import { useSendTicketEmail } from '../../features/auth/hooks';
import { signReceiptUrl } from '../../services/storage';
import { formatAr, formatDateTime } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toaster';
import {
  EmptyState,
  ErrorState,
} from '../../components/ui/States';
import { OrderDetailSkeleton } from '../../components/admin/AdminSkeletons';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { TicketStatusBadge } from '../../components/admin/StatusBadges';
import { cn } from '../../lib/utils';

const PROVIDER_LABEL: Record<string, string> = {
  yas: 'YAS',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  card: 'Carte',
  cash: 'Espèces',
};

/** Bouton copier avec confirmation visuelle (refs, N° billet, N° commande). */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={`Copier : ${label}`}
      aria-label={`Copier ${label}`}
      onClick={() => {
        try {
          void navigator.clipboard?.writeText(value);
        } catch {
          /* presse-papiers indisponible */
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="grid size-6 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      {copied ? (
        <Check className="size-3.5 text-green-600" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  );
}

/** Étapes de progression d'une commande (visuel pro). */
function OrderStepper({ status, tickets }: { status: string; tickets: number }) {
  const steps = [
    { key: 'created', label: 'Créée', done: true, failed: false },
    {
      key: 'paid',
      label: status === 'paid' ? 'Payée' : 'Paiement',
      done: status === 'paid',
      failed: status === 'failed' || status === 'cancelled' || status === 'expired',
    },
    {
      key: 'tickets',
      label: tickets > 0 ? `${tickets} billet${tickets > 1 ? 's' : ''}` : 'Billets',
      done: tickets > 0,
      failed: false,
    },
  ];
  return (
    <ol className="flex items-center gap-0" aria-label="Progression de la commande">
      {steps.map((s, i) => (
        <li key={s.key} className={i < steps.length - 1 ? 'flex flex-1 items-center' : 'flex items-center'}>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                s.done
                  ? 'bg-green-100 text-green-800'
                  : s.failed
                    ? 'bg-red-100 text-red-700'
                    : 'bg-zinc-100 text-zinc-500',
              )}
            >
              {s.done ? <BadgeCheck className="size-4" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-xs font-medium sm:text-sm',
                s.done ? 'text-zinc-900' : s.failed ? 'text-red-700' : 'text-zinc-500',
              )}
            >
              {s.label}
            </span>
          </span>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'mx-2 h-0.5 min-w-4 flex-1 rounded-full sm:mx-3',
                steps[i + 1].done ? 'bg-green-200' : 'bg-zinc-200',
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

/** Détail commande côté admin : suivi complet + changement de statut audité. */
export function AdminOrderDetailPage() {
  const { id } = useParams();
  const { data: order, isPending, isError, refetch } = useOrderDetail(id);
  const { data: allTickets } = useAdminTickets();
  const setStatus = useAdminSetOrderStatus();
  const resendEmail = useSendTicketEmail();
  const { toast } = useToast();
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'paid' | 'cancelled' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openReceipt = async (path: string) => {
    setReceiptError(null);
    try {
      const url = path.startsWith('http') ? path : await signReceiptUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch {
      setReceiptError('Reçu illisible.');
    }
  };

  if (isPending) return <OrderDetailSkeleton />;
  if (isError)
    return (
      <ErrorState
        description="Impossible de charger cette commande."
        onRetry={() => refetch()}
      />
    );
  if (!order)
    return (
      <EmptyState
        title="Commande introuvable."
        action={
          <Link to="/admin/orders">
            <Button size="sm" variant="secondary">
              Commandes
            </Button>
          </Link>
        }
      />
    );

  const payment = order.payments[0];
  const tickets = (allTickets ?? []).filter((t) => t.order_id === order.id);
  const buyerName =
    [order.buyer?.first_name, order.buyer?.last_name].filter(Boolean).join(' ') || null;
  const canAct = order.payment_status === 'pending' || order.payment_status === 'processing';
  const isPaid = order.payment_status === 'paid';
  const acting = setStatus.isPending;

  const handleSetStatus = async (to: 'paid' | 'cancelled') => {
    setActionError(null);
    try {
      const res = await setStatus.mutateAsync({ order_id: order.id, status: to });
      setConfirm(null);
      if (to === 'paid') {
        if (res.email === 'sent') {
          toast.success(
            'Commande payée',
            `${res.tickets} billet${res.tickets > 1 ? 's' : ''} généré${res.tickets > 1 ? 's' : ''} et envoyé par email au client.`,
          );
        } else {
          toast.warning(
            'Commande payée',
            `${res.tickets} billet${res.tickets > 1 ? 's' : ''} généré${res.tickets > 1 ? 's' : ''}, mais l’email n’a pas pu être envoyé — utilisez « Renvoyer le billet ».`,
          );
        }
      } else {
        toast.success('Commande annulée', 'Stock réservé libéré pour les autres clients.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action impossible.';
      setActionError(message);
      toast.error('Action impossible', message);
    }
  };

  const handleResend = async () => {
    try {
      await resendEmail.mutateAsync(order.id);
      toast.success('Billet envoyé', 'Email renvoyé au client avec succès.');
    } catch (err) {
      toast.error('Envoi impossible', err instanceof Error ? err.message : 'Réessayez.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Commandes
      </Link>

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 font-mono text-xl font-bold">
            <span className="truncate">{order.order_number}</span>
            <CopyButton value={order.order_number} label="le numéro de commande" />
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Créée le {formatDateTime(order.created_at)}
            {order.paid_at ? ` · Payée le ${formatDateTime(order.paid_at)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="text-xl font-bold tabular-nums">{formatAr(order.total)}</p>
          <OrderStatusBadge status={order.payment_status} />
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <Card className="p-4 sm:p-5">
        <OrderStepper status={order.payment_status} tickets={order.ticket_count} />
      </Card>

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          <Card className="p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <TicketIcon className="size-4 text-brand-600" aria-hidden />
              Billets ({tickets.length || order.ticket_count})
            </h2>
            {tickets.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                {isPaid
                  ? 'Chargement des billets…'
                  : 'Les billets seront générés automatiquement au paiement.'}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100">
                {tickets.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-semibold">
                        {t.ticket_number}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {t.holder_name} · {t.ticket_type?.name ?? 'Billet'}
                      </span>
                    </span>
                    <CopyButton value={t.ticket_number} label={`le billet ${t.ticket_number}`} />
                    <TicketStatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="font-bold">Lignes ({order.items.length})</h2>
            <ul className="mt-3 divide-y divide-zinc-100 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="py-2">
                  <div className="flex justify-between gap-2">
                    <span>
                      {item.ticket_type?.name ?? 'Billet'} · {formatAr(item.unit_price)} ×{' '}
                      {item.quantity}
                    </span>
                    <strong className="tabular-nums">{formatAr(item.total_price)}</strong>
                  </div>
                  {item.holder_names && item.holder_names.length > 0 && (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Participants : {item.holder_names.join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-zinc-100 pt-3 font-bold">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatAr(order.total)}</span>
            </p>
          </Card>
        </div>

        {/* Rail latéral */}
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <User className="size-4 text-brand-600" aria-hidden />
              Client & événement
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="shrink-0 text-zinc-500">Acheteur</dt>
                <dd className="truncate text-right font-medium" title={buyerName ?? order.buyer?.email ?? ''}>
                  {buyerName ?? order.buyer?.email ?? '—'}
                </dd>
              </div>
              {buyerName && order.buyer?.email && (
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-zinc-500">Email</dt>
                  <dd className="flex min-w-0 items-center justify-end gap-1">
                    <span className="truncate text-xs" title={order.buyer.email}>
                      {order.buyer.email}
                    </span>
                    <CopyButton value={order.buyer.email} label="l’email de l’acheteur" />
                  </dd>
                </div>
              )}
              {order.buyer?.phone && (
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-zinc-500">Téléphone</dt>
                  <dd className="truncate text-right tabular-nums">{order.buyer.phone}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="shrink-0 text-zinc-500">Événement</dt>
                <dd className="truncate text-right font-medium">
                  {order.event ? (
                    <Link to={`/events/${order.event.slug}`} className="hover:underline">
                      {order.event.title}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              {(order.event?.venue || order.event?.city) && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">
                    {[order.event?.venue, order.event?.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {order.event?.starts_at && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  {formatDateTime(order.event.starts_at)}
                </div>
              )}
            </dl>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="font-bold">Paiement</h2>
            {payment ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Méthode</dt>
                  <dd className="font-medium">
                    {PROVIDER_LABEL[payment.provider] ?? payment.provider}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Montant</dt>
                  <dd className="font-semibold tabular-nums">{formatAr(payment.amount)}</dd>
                </div>
                {payment.phone_number && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Numéro</dt>
                    <dd>{payment.phone_number}</dd>
                  </div>
                )}
                {payment.provider_ref && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Référence</dt>
                    <dd className="flex min-w-0 items-center justify-end gap-1">
                      <span className="truncate font-mono text-xs">{payment.provider_ref}</span>
                      <CopyButton value={payment.provider_ref} label="la référence de paiement" />
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500">Statut</dt>
                  <dd>
                    <OrderStatusBadge status={payment.status} />
                  </dd>
                </div>
                {payment.rejection_reason && (
                  <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                    {payment.rejection_reason}
                  </p>
                )}
                {payment.receipt_url && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => openReceipt(payment.receipt_url as string)}
                  >
                    <ReceiptText className="size-4" aria-hidden /> Voir la capture
                  </Button>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Aucun paiement enregistré.</p>
            )}
            {receiptError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {receiptError}
              </p>
            )}
          </Card>

          <Card className="border-brand-200 bg-brand-50/50 p-4 sm:p-5">
            <h2 className="font-bold">Changer le statut</h2>
            {canAct ? (
              <div className="mt-3 space-y-2">
                {confirm === null ? (
                  <>
                    <Button className="w-full" loading={acting} onClick={() => setConfirm('paid')}>
                      <BadgeCheck className="size-4" aria-hidden /> Marquer comme payée
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={acting}
                      onClick={() => setConfirm('cancelled')}
                    >
                      <Ban className="size-4" aria-hidden /> Annuler la commande
                    </Button>
                    <p className="text-xs text-zinc-500">
                      Payée → billets générés et envoyés par email au client. Annulée →
                      stock libéré. Action auditée, irréversible.
                    </p>
                  </>
                ) : confirm === 'paid' ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
                    <p className="font-semibold text-green-900">
                      Marquer {order.order_number} comme payée ?
                    </p>
                    <p className="mt-1 text-green-800">
                      Les billets seront générés et envoyés automatiquement au client.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button loading={acting} onClick={() => void handleSetStatus('paid')}>
                        Confirmer
                      </Button>
                      <Button variant="ghost" disabled={acting} onClick={() => setConfirm(null)}>
                        Retour
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                    <p className="font-semibold text-red-900">
                      Annuler {order.order_number} ?
                    </p>
                    <p className="mt-1 text-red-800">
                      Le stock réservé sera libéré. Le client devra recommander.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="danger"
                        loading={acting}
                        onClick={() => void handleSetStatus('cancelled')}
                      >
                        Confirmer
                      </Button>
                      <Button variant="ghost" disabled={acting} onClick={() => setConfirm(null)}>
                        Retour
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : isPaid ? (
              <div className="mt-3 space-y-2">
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={resendEmail.isPending}
                  onClick={() => void handleResend()}
                >
                  <Mail className="size-4" aria-hidden /> Renvoyer le billet par email
                </Button>
                <p className="text-xs text-zinc-500">
                  Commande clôturée — seul le renvoi du billet reste possible.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                Commande clôturée (statut final : {order.payment_status}).
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
