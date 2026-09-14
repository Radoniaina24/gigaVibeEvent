import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Inbox,
  Loader2,
  MailCheck,
  MailWarning,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { z } from 'zod';
import { useResendConfirmation, useVerifyEmail } from '../../features/auth/hooks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Logo } from '../../components/brand/Logo';

const resendSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
});
type ResendInput = z.infer<typeof resendSchema>;

type Status = 'pending' | 'success' | 'error';

const RESEND_COOLDOWN_S = 60;

const STEPS = ['Lien reçu', 'Vérification', 'Compte activé'];

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = (params.get('token') ?? '').trim();
  const hasToken = Boolean(token);
  const verify = useVerifyEmail();
  const resend = useResendConfirmation();
  const [status, setStatus] = useState<Status>(token ? 'pending' : 'error');
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [attempt, setAttempt] = useState(0);

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
    setMessage(null);
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
  }, [token, attempt]);

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
    <div className="flex min-h-[70vh] items-center justify-center py-8">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>

        <Card className="overflow-hidden p-0">
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-amber-400 to-amber-500" />
          <div className="p-6 sm:p-10">
            {/* ---------- En cours ---------- */}
            {status === 'pending' && (
              <div className="text-center" role="status" aria-live="polite">
                <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-950">
                  <MailCheck className="size-7 text-amber-300" aria-hidden />
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-white shadow">
                    <Loader2 className="size-3.5 animate-spin text-zinc-900" aria-hidden />
                  </span>
                </span>
                <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
                  Vérification en cours…
                </h1>
                <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
                  Nous confirmons votre adresse email. Cela prend quelques
                  secondes, ne fermez pas cette page.
                </p>

                {/* Étapes */}
                <ol className="mx-auto mt-6 flex max-w-xs items-center justify-between gap-1 text-[11px] font-semibold">
                  {STEPS.map((label, i) => {
                    const active = i === 1;
                    const done = i === 0;
                    return (
                      <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
                        <span
                          className={
                            done
                              ? 'flex size-6 items-center justify-center rounded-full bg-green-600 text-white'
                              : active
                                ? 'flex size-6 items-center justify-center rounded-full bg-zinc-950 text-amber-300'
                                : 'flex size-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-400'
                          }
                        >
                          {done ? (
                            <CheckCircle2 className="size-3.5" aria-hidden />
                          ) : active ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <span className="size-1.5 rounded-full bg-current" aria-hidden />
                          )}
                        </span>
                        <span className={active || done ? 'text-zinc-900' : 'text-zinc-400'}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-red-600 to-amber-400" />
                </div>
              </div>
            )}

            {/* ---------- Succès ---------- */}
            {status === 'success' && (
              <div className="text-center" role="status" aria-live="polite">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-green-50">
                  <CheckCircle2 className="size-7 text-green-600" aria-hidden />
                </span>
                <p className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-700">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  Compte activé
                </p>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
                  Email vérifié !
                </h1>
                <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
                  {message ?? 'Votre adresse email a été confirmée.'} Vous
                  pouvez maintenant vous connecter et profiter de vos billets.
                </p>

                <ol className="mx-auto mt-5 flex max-w-xs items-center justify-between gap-1 text-[11px] font-semibold">
                  {STEPS.map((label) => (
                    <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="flex size-6 items-center justify-center rounded-full bg-green-600 text-white">
                        <CheckCircle2 className="size-3.5" aria-hidden />
                      </span>
                      <span className="text-zinc-900">{label}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-6 space-y-2.5">
                  <Link to="/login" className="block">
                    <Button size="lg" className="w-full">
                      Se connecter
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </Link>
                  <Link to="/events" className="block">
                    <Button size="lg" variant="secondary" className="w-full">
                      Découvrir les événements
                    </Button>
                  </Link>
                </div>

                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                  <ShieldCheck className="size-3.5 text-green-600" aria-hidden />
                  Paiement sécurisé · Billets QR Code instantanés
                </p>
              </div>
            )}

            {/* ---------- Erreur ---------- */}
            {status === 'error' && (
              <div aria-live="polite">
                <div className="text-center">
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50">
                    <MailWarning className="size-7 text-red-500" aria-hidden />
                  </span>
                  <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
                    {!hasToken ? 'Lien manquant' : 'Lien invalide ou expiré'}
                  </h1>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
                    {!hasToken
                      ? 'Aucun jeton de vérification trouvé dans ce lien. Saisissez votre email ci-dessous pour recevoir un nouveau lien.'
                      : 'Ce lien ne fonctionne plus. Demandez un nouveau lien de confirmation pour activer votre compte.'}
                  </p>
                  {message && (
                    <p role="alert" className="mx-auto mt-3 max-w-sm rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {message}
                    </p>
                  )}
                </div>

                {hasToken && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mx-auto mt-3"
                    onClick={() => setAttempt((a) => a + 1)}
                  >
                    <Loader2 className="size-3.5" aria-hidden />
                    Réessayer la vérification
                  </Button>
                )}

                {/* Renvoi */}
                <div className="mt-5 border-t border-dashed border-zinc-200 pt-5">
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <Send className="size-4 text-zinc-900" aria-hidden />
                    Recevoir un nouveau lien
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Saisissez l'adresse utilisée à l'inscription. Valable 60 minutes.
                  </p>
                  <form onSubmit={handleSubmit(onResend)} className="mt-4 space-y-4" noValidate>
                    <Input
                      label="Adresse email"
                      type="email"
                      autoComplete="email"
                      placeholder="vous@exemple.mg"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                    {resend.isSuccess && (
                      <p className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                        <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                        Si cette adresse correspond à un compte non confirmé, un
                        nouvel email vient d'être envoyé.
                      </p>
                    )}
                    {resend.isError && (
                      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                        {resend.error instanceof Error
                          ? resend.error.message
                          : 'Envoi impossible.'}
                      </p>
                    )}
                    <Button
                      type="submit"
                      size="lg"
                      loading={isSubmitting || resend.isPending}
                      disabled={cooldown > 0}
                      className="w-full"
                    >
                      <Send className="size-4" aria-hidden />
                      {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : 'Renvoyer un email'}
                    </Button>
                    {cooldown > 0 && (
                      <div
                        className="h-1 overflow-hidden rounded-full bg-zinc-100"
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-400 transition-all duration-1000"
                          style={{ width: `${(cooldown / RESEND_COOLDOWN_S) * 100}%` }}
                        />
                      </div>
                    )}
                  </form>
                </div>

                <div className="mt-5 flex items-center justify-between text-sm">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 hover:underline"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    Retour à la connexion
                  </Link>
                  <Link to="/register" className="font-semibold text-zinc-700 hover:underline">
                    Créer un compte
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Card>

        <p className="mx-auto mt-4 flex max-w-xl items-start justify-center gap-2 text-center text-xs text-zinc-500">
          <Inbox className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Vous ne recevez rien ? Vérifiez vos spams, patientez 2 minutes, puis
          renvoyez un seul email pour éviter d'invalider le précédent.
        </p>
      </div>
    </div>
  );
}
