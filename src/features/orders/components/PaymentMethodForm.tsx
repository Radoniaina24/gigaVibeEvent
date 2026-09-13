import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Smartphone } from 'lucide-react';
import {
  checkoutPaymentSchema,
  type CheckoutPaymentInput,
} from '../../../schemas/orders';
import { PAYMENT_METHODS } from '../../payments/providers';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { cn } from '../../../lib/utils';

interface Props {
  defaultPhone: string;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: CheckoutPaymentInput) => void;
}

/** Étape 3 : choix Mobile Money + numéro (aucun secret manipulé ici). */
export function PaymentMethodForm({
  defaultPhone,
  isSubmitting,
  serverError,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutPaymentInput>({
    resolver: zodResolver(checkoutPaymentSchema),
    defaultValues: { payment_method: 'mvola', phone: defaultPhone },
  });
  const selected = watch('payment_method');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div role="radiogroup" aria-label="Moyen de paiement" className="grid gap-2">
        {PAYMENT_METHODS.map((m) => (
          <label
            key={m.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition',
              selected === m.id
                ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10'
                : 'border-zinc-200 bg-white hover:border-zinc-400',
            )}
          >
            <input
              type="radio"
              value={m.id}
              {...register('payment_method')}
              className="size-4 accent-zinc-900"
            />
            <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Smartphone className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block text-xs text-zinc-500">
                {m.hint} · {m.prefixHint}
              </span>
            </span>
          </label>
        ))}
      </div>

      <Input
        label="Numéro Mobile Money"
        type="tel"
        autoComplete="tel"
        placeholder="+261 …"
        error={errors.phone?.message}
        {...register('phone')}
      />

      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        Payer
      </Button>
      <p className="text-center text-xs text-zinc-500">
        Le paiement n'est validé qu'après confirmation de l'opérateur.
      </p>
    </form>
  );
}
