import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  Copy,
  Images,
  ImagePlus,
  Send,
  Smartphone,
} from 'lucide-react';
import {
  manualPaymentSchema,
  type ManualPaymentInput,
} from '../../../schemas/orders';
import { signReceiptUrl, uploadPaymentReceipt } from '../../../services/storage';
import { usePlatformSettings } from '../../../hooks/usePlatformSettings';
import { PAYMENT_METHODS, formatPhoneDisplay } from '../../payments/providers';
import { formatAr } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { OperatorLogo } from '../../../components/orders/OperatorLogo';
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
  'Sur VOTRE téléphone, envoyez le montant exact au numéro marchand (application opérateur ou code USSD).',
  'Notez la référence de transaction affichée par l’opérateur.',
  'Faites une capture d’écran du message de confirmation.',
  'Revenez ici et envoyez la référence + la capture.',
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
              className="flex h-7 items-center rounded-lg bg-white px-2"
            >
              <OperatorLogo
                src={brand.logo}
                label={brand.label}
                initial={brand.brandInitial}
                bg={brand.brandBg}
                imgClassName="h-5 w-auto max-w-20 object-contain"
                className="size-5 rounded text-[10px]"
              />
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
            {formatPhoneDisplay(number)}
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
 * Paiement 100 % manuel en 2 temps :
 *   1. « Je paie » — l'utilisateur transfère DEPUIS SON TÉLÉPHONE
 *      (hors du site, via son opérateur), avec le numéro copiable.
 *   2. « Je déclare » — de retour sur le site (souvent le même téléphone),
 *      il envoie la référence + la capture d'écran du SMS/reçu opérateur.
 * Aucune API opérateur : validation humaine côté backoffice.
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
  // Phase : l'utilisateur a-t-il déjà effectué le transfert sur son téléphone ?
  const [transferDone, setTransferDone] = useState(false);
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

  // ---------- Temps 1 : payer depuis son téléphone ----------
  if (!transferDone) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-blue-700" aria-hidden />
          <p className="text-sm leading-relaxed text-blue-900">
            <strong>Payez d'abord depuis VOTRE téléphone</strong>, en dehors de ce
            site : ouvrez l'application {providerLabel} (ou le code USSD de votre
            opérateur) et transférez le montant exact ci-dessous.
          </p>
        </div>

        <PaymentInstructions methodId={methodId} providerLabel={providerLabel} total={total} />

        <Button size="lg" className="w-full" onClick={() => setTransferDone(true)}>
          J'ai effectué le transfert — déclarer mon paiement
        </Button>
        <p className="text-center text-xs text-zinc-500">
          Cliquez uniquement après avoir reçu la confirmation de l'opérateur sur
          votre téléphone.
        </p>
      </div>
    );
  }

  // ---------- Temps 2 : déclarer (référence + capture) ----------
  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit({ ...v, amount: total }))}
      className="space-y-4"
      noValidate
    >
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-white">
        <p className="text-sm">
          <span className="text-zinc-400">À payer :</span>{' '}
          <strong className="tabular-nums">{formatAr(total)}</strong>
          <span className="text-zinc-400"> · {providerLabel}</span>
        </p>
        <button
          type="button"
          onClick={() => setTransferDone(false)}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-300 hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Revoir le numéro
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Send className="size-4" aria-hidden />
          Déclarez votre transfert
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Recopiez les informations affichées sur VOTRE téléphone après le transfert.
        </p>

        <div className="mt-4 space-y-4">
          <Input
            label="Votre numéro (celui qui a envoyé l'argent) *"
            type="tel"
            autoComplete="tel"
            placeholder="+261 …"
            className="text-base sm:text-sm"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Référence de transaction *"
            placeholder="Ex. TXN123456789"
            autoComplete="off"
            className="font-mono uppercase"
            error={errors.reference?.message}
            hint="Retrouvez-la dans le SMS de confirmation de l'opérateur."
            {...register('reference')}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700">
              Capture d'écran du SMS/reçu <span className="text-red-600">*</span>
            </p>
            <div
              className={cn(
                'rounded-2xl border-2 border-dashed px-4 py-6 text-center transition',
                previewUrl
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-zinc-300 bg-zinc-50',
              )}
            >
              <ImagePlus className="mx-auto size-8 text-zinc-400" aria-hidden />
              <p className="mt-1 text-sm font-semibold text-zinc-700">
                {uploading
                  ? 'Envoi en cours…'
                  : previewUrl
                    ? 'Remplacer la capture'
                    : 'Ajouter la capture du SMS / reçu'}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                JPG, PNG ou WebP — max 5 Mo
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label
                  className={cn(
                    'cursor-pointer rounded-xl bg-zinc-950 px-3 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800',
                    (uploading || isSubmitting) && 'pointer-events-none opacity-50',
                  )}
                >
                  <Camera className="mx-auto size-5" aria-hidden />
                  <span className="mt-1 block text-xs">Prendre une photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    disabled={uploading || isSubmitting}
                    onChange={(e) => {
                      handleFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
                <label
                  className={cn(
                    'cursor-pointer rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-semibold transition hover:bg-zinc-100',
                    (uploading || isSubmitting) && 'pointer-events-none opacity-50',
                  )}
                >
                  <Images className="mx-auto size-5 text-zinc-600" aria-hidden />
                  <span className="mt-1 block text-xs text-zinc-700">Galerie</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploading || isSubmitting}
                    onChange={(e) => {
                      handleFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
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
        Envoyer pour validation
      </Button>
      <p className="text-center text-xs text-zinc-500">
        Sans référence ni capture lisible, la validation est impossible. Vos billets
        seront générés après vérification par notre équipe.
      </p>
    </form>
  );
}
