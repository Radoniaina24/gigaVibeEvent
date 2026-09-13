import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReceiptText, Upload } from 'lucide-react';
import {
  manualPaymentSchema,
  type ManualPaymentInput,
} from '../../../schemas/orders';
import { uploadPaymentReceipt } from '../../../services/storage';
import { formatAr } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface Props {
  orderId: string;
  providerLabel: string;
  total: number;
  defaultPhone: string;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: ManualPaymentInput & { amount: number }) => void;
}

/** Déclaration du transfert Mobile Money déjà effectué (§16 CDC v2). */
export function ManualPaymentForm({
  orderId,
  providerLabel,
  total,
  defaultPhone,
  isSubmitting,
  serverError,
  onSubmit,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManualPaymentInput>({
    resolver: zodResolver(manualPaymentSchema),
    defaultValues: { phone: defaultPhone, reference: '', receipt_url: '' },
  });

  const receiptUrl = watch('receipt_url');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const path = await uploadPaymentReceipt(file, orderId);
      setValue('receipt_url', path);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Envoi impossible.');
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
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <ReceiptText className="size-4" aria-hidden />
          1. Effectuez le transfert
        </p>
        <p className="mt-1.5 leading-relaxed text-zinc-600">
          Envoyez <strong className="tabular-nums">{formatAr(total)}</strong> via{' '}
          <strong>{providerLabel}</strong> au numéro marchand communiqué par
          l’organisateur, depuis votre propre numéro.
        </p>
        <p className="mt-2 font-semibold">2. Déclarez la référence ci-dessous</p>
      </div>

      <Input
        label="Numéro utilisé pour le transfert *"
        type="tel"
        autoComplete="tel"
        placeholder="+261 …"
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Input
        label="Référence de transaction *"
        placeholder="Ex. REF123456789"
        autoComplete="off"
        error={errors.reference?.message}
        {...register('reference')}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-700">Capture du reçu (optionnel)</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100">
            <Upload className="size-4" aria-hidden />
            {uploading ? 'Envoi…' : receiptUrl ? 'Remplacer' : 'Joindre une image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading || isSubmitting}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {receiptUrl && <span className="text-xs font-medium text-green-700">Reçu joint ✓</span>}
        </div>
        {uploadError && (
          <p role="alert" className="text-xs text-red-600">
            {uploadError}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting || uploading} className="w-full" size="lg">
        J’ai payé — envoyer pour validation
      </Button>
      <p className="text-center text-xs text-zinc-500">
        Vos billets seront générés après vérification du paiement.
      </p>
    </form>
  );
}
