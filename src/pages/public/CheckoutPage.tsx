import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { env } from '../../app/config/env';
import { useAuth } from '../../features/auth/AuthContext';
import {
  useCancelOrder,
  useCreateOrder,
  useDeclarePayment,
  type CreateOrderResult,
} from '../../features/orders/hooks';
import { useSimulatePayment } from '../../features/orders/hooks';
import { useSendTicketEmail } from '../../features/auth/hooks';
import { PAYMENT_METHODS } from '../../features/payments/providers';
import {
  checkoutStateSchema,
  type CheckoutPaymentInput,
  type CheckoutState,
  type ManualPaymentInput,
} from '../../schemas/orders';
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from '../../features/orders/checkoutDraft';
import { formatAr } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/States';
import { AttendeeForm } from '../../features/orders/components/AttendeeForm';
import { PaymentMethodForm } from '../../features/orders/components/PaymentMethodForm';
import { ManualPaymentForm } from '../../features/orders/components/ManualPaymentForm';

function parseState(value: unknown): CheckoutState | null {
  const r = checkoutStateSchema.safeParse(value);
  return r.success ? r.data : null;
}

const STEPS = ['Récapitulatif', 'Participants', 'Paiement', 'Confirmation'];

export function CheckoutPage() {
  const location = useLocation();
  const { profile } = useAuth();
  // Reprise du brouillon si le navigation state a été perdu (refresh,
  // détour par /login ou /verify-email).
  const fromState = parseState(location.state);
  const [fallback] = useState<CheckoutState | null>(() =>
    fromState ? null : loadCheckoutDraft(),
  );
  const parsed = fromState ?? fallback;

  useEffect(() => {
    if (fromState) saveCheckoutDraft(fromState);
  }, [fromState]);

  const [step, setStep] = useState(0);
  const [names, setNames] = useState<Record<string, string[]>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [attendeesValid, setAttendeesValid] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [order, setOrder] = useState<CreateOrderResult | null>(null);
  const [orderMethod, setOrderMethod] = useState<string>('yas');
  const [paidTickets, setPaidTickets] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [declared, setDeclared] = useState(false);

  const createOrder = useCreateOrder();
  const simulate = useSimulatePayment();
  const cancelOrder = useCancelOrder();
  const declarePayment = useDeclarePayment();
  const ticketEmail = useSendTicketEmail();
  const [ticketEmailState, setTicketEmailState] = useState<'idle' | 'sent' | 'failed'>('idle');

  const onValidityChange = useCallback((valid: boolean) => {
    setAttendeesValid(valid);
  }, []);

  if (!parsed) {
    return (
      <EmptyState
        title="Panier vide."
        description="Sélectionnez d'abord vos billets depuis un événement."
        action={
          <Link to="/events">
            <Button size="sm">Voir les événements</Button>
          </Link>
        }
      />
    );
  }

  const { eventId, eventSlug, eventTitle, items } = parsed;
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const buyerName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.email ||
    '';

  const initNames = () => {
    if (Object.keys(names).length === 0) {
      const next: Record<string, string[]> = {};
      for (const l of items) {
        next[l.ticket_type_id] = Array.from({ length: l.quantity }, () => buyerName);
      }
      setNames(next);
    }
    setShowErrors(false);
    setStep(1);
  };

  const submitAttendees = () => {
    if (!attendeesValid) {
      setShowErrors(true);
      return;
    }
    setStep(2);
  };

  const submitPayment = async (values: CheckoutPaymentInput) => {
    setServerError(null);
    try {
      const result = await createOrder.mutateAsync({
        event_id: eventId,
        payment_method: values.payment_method,
        phone: values.phone,
        items: items.map((l) => ({
          ticket_type_id: l.ticket_type_id,
          quantity: l.quantity,
          holder_names: (names[l.ticket_type_id] ?? []).slice(0, l.quantity),
        })),
      });
      setOrder(result);
      setOrderMethod(values.payment_method);
      setDeclared(false);
      setFailed(false);
      setPaidTickets(null);
      setStep(3);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Création de la commande impossible.',
      );
    }
  };

  const submitDeclaration = async (values: ManualPaymentInput & { amount: number }) => {
    if (!order) return;
    setServerError(null);
    try {
      await declarePayment.mutateAsync({
        order_id: order.order_id,
        phone: values.phone,
        amount: values.amount,
        reference: values.reference,
        receipt_url: values.receipt_url || undefined,
      });
      setDeclared(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Déclaration impossible.');
    }
  };

  const simulateResult = async (success: boolean) => {
    if (!order) return;
    setServerError(null);
    try {
      const res = await simulate.mutateAsync({
        order_id: order.order_id,
        success,
      });
      if (res.status === 'paid') {
        setPaidTickets(res.tickets);
        setFailed(false);
        clearCheckoutDraft();
        // Email billet Resend (non bloquant : la commande reste payée si l'email échoue).
        try {
          await ticketEmail.mutateAsync(order.order_id);
          setTicketEmailState('sent');
        } catch {
          setTicketEmailState('failed');
        }
      } else {
        setFailed(true);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Simulation impossible.');
    }
  };

  const cancelAll = async () => {
    if (!order) return;
    try {
      await cancelOrder.mutateAsync(order.order_id);
      setOrder(null);
      setStep(0);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Annulation impossible.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Link
        to={`/events/${eventSlug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Retour à l'événement
      </Link>
      <h1 className="text-2xl font-bold">Commande — {eventTitle}</h1>

      {/* Étapes */}
      <ol aria-label="Progression" className="flex gap-1">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div
              aria-current={i === step ? 'step' : undefined}
              className={`h-1.5 rounded-full ${i <= step ? 'bg-zinc-900' : 'bg-zinc-200'}`}
            />
            <p
              className={`mt-1 text-[11px] ${i === step ? 'font-semibold' : 'text-zinc-500'}`}
            >
              {label}
            </p>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="w-full p-5">
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.ticket_type_id} className="flex justify-between gap-2">
                <span className="text-zinc-600">
                  {i.name} · {formatAr(i.unit_price)} × {i.quantity}
                </span>
                <strong className="tabular-nums">
                  {formatAr(i.unit_price * i.quantity)}
                </strong>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t border-zinc-100 pt-3 font-bold">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatAr(total)}</span>
          </p>
          <Button onClick={initNames} className="mt-4 w-full" size="lg">
            Continuer
          </Button>
        </Card>
      )}

      {step === 1 && (
        <div className="w-full space-y-4">
          <AttendeeForm
            lines={items}
            names={names}
            showErrors={showErrors}
            onNamesChange={setNames}
            onValidityChange={onValidityChange}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(0)}>
              Retour
            </Button>
            <Button onClick={submitAttendees} className="flex-1">
              Continuer vers le paiement
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card className="w-full p-5 sm:p-8">
          <PaymentMethodForm
            defaultPhone={profile?.phone ?? ''}
            isSubmitting={createOrder.isPending}
            serverError={serverError ?? (createOrder.isError ? 'Commande refusée.' : null)}
            onSubmit={submitPayment}
          />
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setStep(1)}>
            Retour
          </Button>
        </Card>
      )}

      {step === 3 && order && paidTickets === null && !failed && !declared && (
        <div className="grid w-full items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* Récapitulatif sticky */}
          <Card className="p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">Votre commande</h2>
              <Badge tone="warning">En attente de paiement</Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-zinc-500">{order.order_number}</p>
            <p className="mt-1 text-sm font-semibold">{eventTitle}</p>
            <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-sm">
              {items.map((i) => (
                <li key={i.ticket_type_id} className="flex justify-between gap-2">
                  <span className="text-zinc-600">
                    {i.name} × {i.quantity}
                  </span>
                  <strong className="tabular-nums">
                    {formatAr(i.unit_price * i.quantity)}
                  </strong>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-zinc-100 pt-3 font-bold">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatAr(order.total)}</span>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              via {PAYMENT_METHODS.find((m) => m.id === orderMethod)?.label ?? orderMethod}
            </p>
            <Button
              size="sm"
              variant="ghost"
              loading={cancelOrder.isPending}
              onClick={cancelAll}
              className="mt-3 w-full"
            >
              Annuler la commande
            </Button>
          </Card>

          {/* Transfert + preuve */}
          <div className="min-w-0 space-y-4">
            <ManualPaymentForm
              orderId={order.order_id}
              methodId={orderMethod}
              providerLabel={
                PAYMENT_METHODS.find((m) => m.id === orderMethod)?.label ?? orderMethod
              }
              total={order.total}
              defaultPhone={profile?.phone ?? ''}
              isSubmitting={declarePayment.isPending}
              serverError={serverError}
              onSubmit={submitDeclaration}
            />
            {env.enablePaymentSimulation && (
              <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4 text-center">
                <p className="text-xs font-semibold text-amber-800">
                  DEV UNIQUEMENT — simulation de l'opérateur (remplacée par le webhook Phase 5)
                </p>
                <div className="mt-2 flex justify-center gap-2">
                  <Button
                    size="sm"
                    loading={simulate.isPending}
                    onClick={() => simulateResult(true)}
                  >
                    Simuler le succès
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={simulate.isPending}
                    onClick={() => simulateResult(false)}
                  >
                    Simuler l'échec
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && order && (paidTickets !== null || failed || declared) && (
        <div className="space-y-4">
          <Card className="w-full p-5 text-center sm:p-8">
            {paidTickets !== null ? (
              <>
                <CheckCircle2 className="mx-auto size-12 text-green-600" aria-hidden />
                <h2 className="mt-3 text-lg font-bold">Paiement confirmé !</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Commande <span className="font-mono font-semibold">{order.order_number}</span> ·{' '}
                  {paidTickets} billet{paidTickets > 1 ? 's' : ''} généré{paidTickets > 1 ? 's' : ''}.
                </p>
                {ticketEmailState === 'sent' && (
                  <p className="mt-1 text-sm text-green-700">
                    Billet envoyé par email (Resend).
                  </p>
                )}
                {ticketEmailState === 'failed' && (
                  <p className="mt-1 text-sm text-amber-700">
                    Paiement confirmé, mais l'email n'a pas pu être envoyé — retrouvez
                    vos billets ci-dessous.
                  </p>
                )}
                <div className="mt-4 flex justify-center gap-2">
                  <Link to="/dashboard/tickets">
                    <Button>Voir mes billets</Button>
                  </Link>
                  <Link to={`/dashboard/orders/${order.order_id}`}>
                    <Button variant="secondary">Détail commande</Button>
                  </Link>
                </div>
              </>
            ) : failed ? (
              <>
                <XCircle className="mx-auto size-12 text-red-600" aria-hidden />
                <h2 className="mt-3 text-lg font-bold">Paiement échoué</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Commande <span className="font-mono">{order.order_number}</span> — le stock
                  réservé a été libéré. Vous pouvez réessayer.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    Réessayer le paiement
                  </Button>
                  <Link to="/events">
                    <Button variant="ghost">Voir les événements</Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Clock className="mx-auto size-12 text-amber-500" aria-hidden />
                <h2 className="mt-3 text-lg font-bold">Déclaration envoyée !</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
                  Votre transfert est <strong>en attente de validation</strong>.
                  Vos billets seront générés dès vérification du paiement.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link to={`/dashboard/orders/${order.order_id}`}>
                    <Button>Suivre ma commande</Button>
                  </Link>
                  <Link to="/events">
                    <Button variant="secondary">Voir les événements</Button>
                  </Link>
                </div>
              </>
            )}
            {serverError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {serverError}
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
