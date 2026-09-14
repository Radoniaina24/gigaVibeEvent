import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Link2Off,
  ShieldCheck,
} from 'lucide-react';
import {
  resetPasswordWithTokenSchema,
  type ResetPasswordWithTokenInput,
} from '../../schemas/auth';
import { useResetPassword } from '../../features/auth/hooks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Logo } from '../../components/brand/Logo';

/** Barre de robustesse : longueur, minuscule/majuscule, chiffre, symbole. */
function strength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const clamped = Math.min(score, 4);
  const labels = ['Très faible', 'Faible', 'Correct', 'Fort', 'Excellent'];
  return { score: clamped, label: password ? labels[clamped] : '' };
}

const STRENGTH_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-400',
  'bg-green-500',
  'bg-emerald-600',
];

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reset = useResetPassword();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const token = (params.get('token') ?? '').trim();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordWithTokenInput>({
    resolver: zodResolver(resetPasswordWithTokenSchema),
    defaultValues: { token },
  });

  const passwordValue = watch('password') ?? '';
  const { score, label } = strength(passwordValue);
  const passwordType = showPasswords ? 'text' : 'password';

  const onSubmit = async (values: ResetPasswordWithTokenInput) => {
    setServerError(null);
    try {
      // Backend + token Resend à usage unique (30 min). Aucun email Supabase.
      await reset.mutateAsync({
        token: token || values.token,
        password: values.password,
      });
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Réinitialisation impossible.',
      );
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>

        <Card className="overflow-hidden p-0">
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-amber-400 to-amber-500" />
          <div className="p-6 sm:p-8">
            {!token ? (
              /* ---------- Lien invalide ---------- */
              <div className="text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50">
                  <Link2Off className="size-7 text-red-500" aria-hidden />
                </span>
                <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
                  Lien invalide
                </h1>
                <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
                  Ce lien est invalide ou a expiré. Demandez un nouveau lien de
                  réinitialisation.
                </p>
                <Link to="/forgot-password" className="mt-6 block">
                  <Button size="lg" className="w-full">
                    Demander un nouveau lien
                  </Button>
                </Link>
                <Link
                  to="/login"
                  className="mt-3 inline-block text-sm font-semibold text-zinc-600 hover:underline"
                >
                  Retour à la connexion
                </Link>
              </div>
            ) : done ? (
              /* ---------- Succès ---------- */
              <div className="text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-green-50">
                  <CheckCircle2 className="size-7 text-green-600" aria-hidden />
                </span>
                <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
                  Mot de passe réinitialisé
                </h1>
                <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
                  Votre nouveau mot de passe est enregistré. Vous pouvez
                  maintenant vous connecter.
                </p>
                <Button
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Se connecter
                </Button>
              </div>
            ) : (
              /* ---------- Formulaire ---------- */
              <>
                <div className="text-center">
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-950">
                    <KeyRound className="size-7 text-amber-300" aria-hidden />
                  </span>
                  <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
                    Nouveau mot de passe
                  </h1>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
                    <ShieldCheck className="size-4 text-green-600" aria-hidden />
                    Lien à usage unique, expire dans 30 minutes.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-6 space-y-4"
                  noValidate
                >
                  <input type="hidden" {...register('token')} value={token} />
                  <div className="relative">
                    <Input
                      label="Nouveau mot de passe"
                      type={passwordType}
                      autoComplete="new-password"
                      placeholder="8 caractères minimum"
                      error={errors.password?.message}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((v) => !v)}
                      aria-label={showPasswords ? 'Masquer' : 'Afficher'}
                      aria-pressed={showPasswords}
                      className="absolute right-3 top-8 rounded p-0.5 text-zinc-400 transition hover:text-zinc-700"
                    >
                      {showPasswords ? (
                        <EyeOff className="size-5" aria-hidden />
                      ) : (
                        <Eye className="size-5" aria-hidden />
                      )}
                    </button>
                  </div>

                  {passwordValue && (
                    <div aria-live="polite">
                      <div className="flex gap-1.5" aria-hidden>
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${
                              i <= score ? STRENGTH_COLORS[score] : 'bg-zinc-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-zinc-500">
                        Robustesse : {label}
                      </p>
                    </div>
                  )}

                  <Input
                    label="Confirmer le mot de passe"
                    type={passwordType}
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                  />

                  {serverError && (
                    <p
                      role="alert"
                      className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                    >
                      {serverError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    loading={isSubmitting || reset.isPending}
                    className="w-full"
                  >
                    Réinitialiser mon mot de passe
                  </Button>
                </form>

                <p className="mt-5 text-center text-sm text-zinc-500">
                  <Link
                    to="/login"
                    className="font-semibold text-zinc-700 hover:underline"
                  >
                    Retour à la connexion
                  </Link>
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
