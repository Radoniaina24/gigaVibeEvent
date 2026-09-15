import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import {
  checkoutPaymentSchema,
  type CheckoutPaymentInput,
} from '../../../schemas/orders';
import {
  PAYMENT_METHODS,
  formatPhoneDisplay,
  prefixMismatchWarning,
  type PaymentMethodId,
} from '../../payments/providers';
import { usePlatformSettings } from '../../../hooks/usePlatformSettings';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { OperatorLogo } from '../../../components/orders/OperatorLogo';
import { cn } from '../../../lib/utils';

interface Props {
  defaultPhone: string;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: CheckoutPaymentInput) => void;
  onBack?: () => void;
}

/** Étape 3 : choix Mobile Money + numéro (aucun secret manipulé ici). */
export function PaymentMethodForm({
  defaultPhone,
  isSubmitting,
  serverError,
  onSubmit,
  onBack,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutPaymentInput>({
    resolver: zodResolver(checkoutPaymentSchema),
    defaultValues: { payment_method: 'yas', phone: defaultPhone },
  });
  const selected = watch('payment_method');
  const senderPhone = watch('phone') ?? '';
  // Moyens activés par l'admin (Paramètres → Paiements). En chargement,
  // affiche tout pour ne pas bloquer le tunnel.
  const { data: settings } = usePlatformSettings();
  const configById = new Map(
    (settings?.paymentMethods ?? []).map((m) => [m.id, m] as const),
  );
  const enabledIds = new Set(
    (settings?.paymentMethods ?? []).filter((m) => m.enabled).map((m) => m.id),
  );
  const methods = settings
    ? PAYMENT_METHODS.filter((m) => enabledIds.has(m.id))
    : PAYMENT_METHODS;
  const selectedMeta = methods.find((m) => m.id === selected);
  const mismatch =
    selectedMeta && senderPhone
      ? prefixMismatchWarning(selectedMeta.id as PaymentMethodId, senderPhone)
      : null;

  if (settings && methods.length === 0) {
    return (
      <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Aucun moyen de paiement n'est activé pour le moment. Réessayez plus tard.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div role="radiogroup" aria-label="Moyen de paiement" className="grid gap-3 sm:grid-cols-3">
        {methods.map((m) => {
          const active = selected === m.id;
          return (
            <label
              key={m.id}
              className={cn(
                'relative cursor-pointer rounded-2xl border-2 p-4 text-center transition',
                active
                  ? 'border-zinc-900 bg-zinc-950 text-white shadow-lg'
                  : 'border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md',
              )}
            >
              <input
                type="radio"
                value={m.id}
                {...register('payment_method')}
                className="sr-only"
              />
              <span
                aria-hidden
                className="mx-auto flex h-14 items-center justify-center rounded-2xl bg-white px-3 shadow-inner"
              >
                <OperatorLogo
                  src={m.logo}
                  label={m.label}
                  initial={m.brandInitial}
                  bg={m.brandBg}
                  imgClassName="max-h-10 w-auto max-w-full object-contain"
                  className="size-10 rounded-xl text-lg"
                />
              </span>
              <span className={cn('mt-2 block text-sm font-bold', active ? 'text-white' : 'text-zinc-900')}>
                {m.label}
              </span>
              <span className={cn('mt-0.5 block text-[11px]', active ? 'text-zinc-300' : 'text-zinc-500')}>
                {m.prefixHint}
              </span>
              {/* Numéro marchand configuré dans le backoffice (jamais hardcodé). */}
              <span
                className={cn(
                  'mt-2 block rounded-lg px-2 py-1.5 font-mono text-xs font-bold tabular-nums',
                  active ? 'bg-white/10 text-amber-300' : 'bg-zinc-100 text-zinc-800',
                )}
              >
                {formatPhoneDisplay(configById.get(m.id)?.number ?? '') || 'N° à venir'}
              </span>
              <span className={cn('mt-1 block text-[10px]', active ? 'text-zinc-400' : 'text-zinc-400')}>
                Numéro marchand
              </span>
              {active && (
                <span
                  aria-hidden
                  className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-amber-400 text-zinc-950"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </label>
          );
        })}
      </div>
      <p className="-mt-1 text-center text-xs text-zinc-500">
        {(methods.find((m) => m.id === selected)?.hint ?? '') + ' — transfert manuel depuis votre téléphone.'}
      </p>

      <Input
        label={`Votre numéro ${selectedMeta?.label ?? ''} (expéditeur du transfert) *`}
        type="tel"
        autoComplete="tel"
        placeholder={selectedMeta?.prefixHint ?? '+261 …'}
        hint="Le numéro depuis lequel VOUS envoyez l'argent, depuis votre téléphone."
        error={errors.phone?.message}
        {...register('phone')}
      />
      {mismatch && !errors.phone && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          ⚠️ {mismatch}
        </p>
      )}

      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}

      <div className="flex gap-2">
        {onBack && (
          <Button type="button" variant="secondary" onClick={onBack}>
            Retour
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} className="flex-1">
          Continuer vers le transfert
        </Button>
      </div>
      <p className="text-center text-xs text-zinc-500">
        Paiement 100 % manuel : vous transférez depuis votre téléphone, puis
        envoyez la référence et la capture. Billets générés après vérification
        par notre équipe.
      </p>
    </form>
  );
}
