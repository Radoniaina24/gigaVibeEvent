import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarDays,
  Check,
  ListChecks,
  Phone,
  ReceiptText,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type { AdminPaymentRow } from '../../features/admin/hooks';
import type { PartnerPaymentRow } from '../../features/partner/hooks';
import {
  paymentRejectSchema,
  type PaymentRejectInput,
} from '../../schemas/orders';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { OrderStatusBadge } from './OrderStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';
import { PaymentProof } from './PaymentProof';
import { formatAr, formatDateTime } from '../../lib/utils';

export type ReviewablePayment = AdminPaymentRow | PartnerPaymentRow;

/**
 * Examen d'un paiement : client, commande, preuve (zoom), puis
 * validation (avec confirmation) ou refus (motif obligatoire).
 * Partagée entre le backoffice admin et l'espace organisateur.
 */
export function PaymentReviewModal({
  payment,
  acting,
  onClose,
  onDecide,
}: {
  payment: ReviewablePayment | null;
  acting: boolean;
  onClose: () => void;
  onDecide: (orderId: string, approved: boolean, reason?: string) => void;
}) {
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentRejectInput>({ resolver: zodResolver(paymentRejectSchema) });

  useEffect(() => {
    setMode('view');
    reset({ reason: '' });
  }, [payment, reset]);

  const user = payment?.user ?? null;
  const clientName =
    [user && 'first_name' in user ? user.first_name : null, user && 'last_name' in user ? user.last_name : null]
      .filter(Boolean)
      .join(' ') ||
    user?.email ||
    '—';

  return (
    <Modal
      open={payment !== null}
      onClose={onClose}
      title="Vérification du paiement"
      subtitle={payment ? `Commande ${payment.order?.order_number ?? '—'} · ${payment.order?.event?.title ?? ''}` : undefined}
      icon={<ShieldCheck className="size-5" aria-hidden />}
      size="xl"
    >
      {!payment ? null : (
        <div className="relative space-y-4" aria-busy={acting}>
          {/* Voile de traitement : bloque les doubles clics, feedback pro */}
          {acting && (
            <div
              role="status"
              aria-label="Validation en cours"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/75 backdrop-blur-[2px]"
            >
              <span
                aria-hidden
                className="size-9 animate-spin rounded-full border-[3px] border-zinc-200 border-t-zinc-900"
              />
              <p className="text-sm font-bold text-zinc-800">Traitement en cours…</p>
              <div aria-hidden className="w-48 max-w-full space-y-2">
                <div className="skeleton h-2.5 w-full" />
                <div className="skeleton mx-auto h-2.5 w-2/3" />
              </div>
            </div>
          )}
          {/* Bandeau résumé */}
          <div className="flex flex-col gap-4 rounded-2xl bg-night-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Montant déclaré
              </p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums leading-none sm:text-4xl">
                {formatAr(payment.amount)}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Déclaré le {formatDateTime(payment.created_at)}
                </span>
                {payment.phone_number && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    N° émetteur : {payment.phone_number}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
              <PaymentMethodBadge method={payment.provider} />
              <OrderStatusBadge status={payment.status} />
            </div>
          </div>

          {/* Contenu : preuve + infos */}
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Preuve : référence + photo (zoom intégré) */}
            <section
              aria-label="Référence et preuve de paiement"
              className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
            >
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <ReceiptText className="size-4 text-brand-600" aria-hidden />
                Référence & photo preuve
              </h3>
              <PaymentProof
                key={payment.id}
                providerRef={payment.provider_ref}
                receiptUrl={payment.receipt_url}
                title={`Preuve · ${payment.order?.order_number ?? ''}`}
                className="mt-3"
              />
            </section>

            {/* Colonne infos */}
            <div className="min-w-0 space-y-4">
              <section
                aria-label="Client"
                className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
              >
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <User className="size-4 text-brand-600" aria-hidden />
                  Client
                </h3>
                <p className="mt-2 truncate text-sm font-semibold" title={clientName}>
                  {clientName}
                </p>
                <p className="truncate text-xs text-zinc-500" title={user?.email ?? ''}>
                  {user?.email}
                </p>
                {user && 'phone' in user && user.phone && (
                  <p className="mt-0.5 text-xs tabular-nums text-zinc-500">{user.phone}</p>
                )}
              </section>

              <section
                aria-label="Points de contrôle"
                className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 sm:p-5"
              >
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <ListChecks className="size-4 text-brand-700" aria-hidden />
                  Points de contrôle
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-600">
                  <li className="flex gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-green-600" aria-hidden />
                    Référence lisible, au format de l’opérateur
                  </li>
                  <li className="flex gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-green-600" aria-hidden />
                    Capture nette : montant, date et destinataire visibles
                  </li>
                  <li className="flex gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-green-600" aria-hidden />
                    Montant et N° émetteur cohérents avec la commande
                  </li>
                </ul>
              </section>
            </div>
          </div>

          {mode === 'view' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                loading={acting}
                onClick={() => setMode('approve')}
                className="w-full"
              >
                <Check className="size-4" aria-hidden /> Valider le paiement
              </Button>
              <Button
                variant="secondary"
                loading={acting}
                onClick={() => setMode('reject')}
                className="w-full"
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
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
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
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
