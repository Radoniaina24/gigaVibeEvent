import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck, Check, Copy, ImagePlus, Send } from 'lucide-react';
import {
  manualPaymentSchema,
  type ManualPaymentInput,
} from '../../../schemas/orders';
import { signReceiptUrl, uploadPaymentReceipt } from '../../../services/storage';
import { usePlatformSettings } from '../../../hooks/usePlatformSettings';
import { PAYMENT_METHODS } from '../../payments/providers';
import { formatAr } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { cn } from '../../../lib/utils';

interface Props {
  orderId: string;
  /** Identifiant du moyen (yas | orange_money | airtel_money). */
  methodId: string;
  providerLabel: string;
  total: number;
  defaultPhone: string;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: ManualPaymentInput & { amount: number }) => void;
}

const STEPS = [
  'Effectuez le transfert vers le numéro marchand.',
  'Vérifiez que le montant correspond à votre commande.',
  'Conservez la référence de transaction.',
  'Envoyez la référence + la capture ci-dessous.',
];

/**
 * Instructions marchandes (numéro configurable, jamais hardcodé) :
 * montant hero + numéro copiable + étapes numérotées.
 */
export function PaymentInstructions({
  methodId,
  providerLabel,
  total,
}: {
  methodId: string;
  providerLabel: string;
  total: number;
}) {
  const { data: settings } = usePlatformSettings();
  const [copied, setCopied] = useState(false);
  const config = settings?.paymentMethods.find((m) => m.id === methodId);
  const brand = PAYMENT_METHODS.find((m) => m.id === methodId);
  const number = config?.number || '';

  const copyNumber = async () => {
    if (!number) return;
    try {
      await navigator.clipboard.writeText(number.replace(/[\s-]/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      {/* Montant + marchand */}
      <div className="bg-zinc-950 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Montant à transférer
        </p>
        <p className="mt-1 font-display text-3xl font-black tabular-nums tracking-tight">
          {formatAr(total)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {brand && (
            <span
              aria-hidden
              style={{ backgroundColor: brand.brandBg }}
              className="flex size-7 items-center justify-center rounded-lg text-sm font-black text-white"
            >
              {brand.brandInitial}
            </span>
          )}
          <span className="text-sm font-semibold">{providerLabel}</span>
          {config?.name && (
            <span className="text-xs text-zinc-400">· {config.name}</span>
          )}
        </div>
        {number ? (
          <button
            type="button"
            onClick={copyNumber}
            title="Copier le numéro marchand"
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl bg-white/10 px-4 py-3 font-mono text-lg font-bold tracking-wider transition hover:bg-white/15"
          >
            {number}
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              {copied ? (
                <>
                  <Check className="size-4" aria-hidden /> Copié !
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden /> Copier
                </>
              )}
            </span>
          </button>
        ) : (
          <p className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-sm text-zinc-300">
            Numéro marchand communiqué par l'organisateur après validation de la
            commande.
          </p>
        )}
      </div>
      {/* Étapes */}
      <ol className="space-y-3 bg-white p-5">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-start gap-3 text-sm text-zinc-600">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white"
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Déclaration du transfert Mobile Money (référence + capture obligatoires).
 * 100 % manuel : aucune API opérateur, validation humaine côté backoffice.
 */
export function ManualPaymentForm({
  orderId,
  methodId,
  providerLabel,
  total,
  defaultPhone,
  isSubmitting,
  serverError,
  onSubmit,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ManualPaymentInput>({
    resolver: zodResolver(manualPaymentSchema),
    defaultValues: { phone: defaultPhone, reference: '', receipt_url: '' },
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const path = await uploadPaymentReceipt(file, orderId);
      setValue('receipt_url', path, { shouldValidate: true });
      // Aperçu immédiat (URL signée courte, bucket privé).
      setPreviewUrl(await signReceiptUrl(path));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Envoi impossible.');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit({ ...v, amount: total }))}
      className="space-y-4"
      noValidate
    >
      <PaymentInstructions methodId={methodId} providerLabel={providerLabel} total={total} />

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Send className="size-4" aria-hidden />
          Votre transfert
        </p>

        <div className="mt-4 space-y-4">
          <Input
            label="Votre numéro (émetteur du transfert) *"
            type="tel"
            autoComplete="tel"
            placeholder="+261 …"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Référence de transaction *"
            placeholder="Ex. TXN123456789"
            autoComplete="off"
            className="font-mono uppercase"
            error={errors.reference?.message}
            {...register('reference')}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700">
              Capture du reçu <span className="text-red-600">*</span>
            </p>
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition',
                previewUrl
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100/60',
              )}
            >
              <ImagePlus className="size-8 text-zinc-400" aria-hidden />
              <span className="text-sm font-semibold text-zinc-700">
                {uploading
                  ? 'Envoi en cours…'
                  : previewUrl
                    ? 'Remplacer la capture'
                    : 'Ajouter la capture (JPG, PNG, WebP — max 5 Mo)'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading || isSubmitting}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
            {previewUrl && (
              <figure className="overflow-hidden rounded-2xl border border-green-200">
                <img
                  src={previewUrl}
                  alt="Aperçu de la capture du reçu"
                  className="max-h-72 w-full bg-zinc-950 object-contain"
                />
                <figcaption className="flex items-center gap-1.5 bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
                  <BadgeCheck className="size-4" aria-hidden />
                  Capture jointe — vérifiez que la référence et le montant sont lisibles.
                </figcaption>
              </figure>
            )}
            {uploadError && (
              <p role="alert" className="text-xs text-red-600">
                {uploadError}
              </p>
            )}
          </div>
        </div>
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting || uploading} className="w-full" size="lg">
        J'ai payé — envoyer pour validation
      </Button>
      <p className="text-center text-xs text-zinc-500">
        Preuve obligatoire : sans référence ni capture lisible, la validation est
        impossible. Billets générés après vérification par notre équipe.
      </p>
    </form>
  );
}
