import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailWarning, Send } from 'lucide-react';
import { z } from 'zod';
import { useResendConfirmation, useVerifyEmail } from '../../features/auth/hooks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

const resendSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
});
type ResendInput = z.infer<typeof resendSchema>;

type Status = 'pending' | 'success' | 'error';

const RESEND_COOLDOWN_S = 60;

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = (params.get('token') ?? '').trim();
  const verify = useVerifyEmail();
  const resend = useResendConfirmation();
  const [status, setStatus] = useState<Status>(token ? 'pending' : 'error');
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendInput>({ resolver: zodResolver(resendSchema) });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien manquant. Demandez un nouvel email de confirmation.');
      return;
    }
    let cancelled = false;
    setStatus('pending');
    verify
      .mutateAsync(token)
      .then((res) => {
        if (cancelled) return;
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Lien invalide ou expiré.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onResend = async (values: ResendInput) => {
    try {
      const res = await resend.mutateAsync(values.email);
      setMessage(res.message);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Envoi impossible.');
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Vérification de l'email</h1>

        {status === 'pending' && (
          <p className="mt-4 text-sm text-zinc-600">Vérification en cours…</p>
        )}

        {status === 'success' && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
              <CheckCircle2 className="size-4" aria-hidden />
              Votre adresse email a été confirmée.
            </p>
            <p className="mt-1 text-sm text-green-800">
              {message ?? 'Votre compte est maintenant activé.'}
            </p>
            <Link
              to="/login"
              className="mt-3 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Se connecter
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <MailWarning className="size-4" aria-hidden />
              Ce lien est invalide ou a expiré.
            </p>
            {message && <p className="mt-1 text-sm text-red-700">{message}</p>}
          </div>
        )}

        {status !== 'pending' && (
          <form onSubmit={handleSubmit(onResend)} className="mt-6 space-y-4" noValidate>
            <Input
              label="Email du compte"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.mg"
              error={errors.email?.message}
              {...register('email')}
            />
            {resend.isSuccess && (
              <p className="text-sm text-green-700">
                Si cette adresse correspond à un compte non confirmé, un nouvel email
                a été envoyé.
              </p>
            )}
            {resend.isError && (
              <p role="alert" className="text-sm text-red-600">
                {resend.error instanceof Error
                  ? resend.error.message
                  : 'Envoi impossible.'}
              </p>
            )}
            <Button
              type="submit"
              loading={isSubmitting || resend.isPending}
              disabled={cooldown > 0}
              className="w-full"
            >
              <Send className="size-4" aria-hidden />
              {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : 'Renvoyer un email'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
