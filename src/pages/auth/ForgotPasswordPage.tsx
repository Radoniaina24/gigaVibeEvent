import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CheckCircle2, MailQuestion } from 'lucide-react';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '../../schemas/auth';
import { useForgotPassword } from '../../features/auth/hooks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Logo } from '../../components/brand/Logo';

export function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setServerError(null);
    try {
      // Backend + Resend. Message générique (anti-énumération).
      await forgot.mutateAsync(values.email);
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Envoi impossible.',
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
            {done ? (
              /* ---------- Email envoyé ---------- */
              <div className="text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-green-50">
                  <CheckCircle2 className="size-7 text-green-600" aria-hidden />
                </span>
                <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
                  Vérifiez votre boîte email
                </h1>
                <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
                  Si un compte existe avec cette adresse, nous avons envoyé un
                  email contenant les instructions de réinitialisation
                  (valable 30 minutes).
                </p>
                <Link to="/login" className="mt-6 block">
                  <Button size="lg" variant="secondary" className="w-full">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            ) : (
              /* ---------- Formulaire ---------- */
              <>
                <div className="text-center">
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-950">
                    <MailQuestion className="size-7 text-amber-300" aria-hidden />
                  </span>
                  <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
                    Mot de passe oublié ?
                  </h1>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-zinc-500">
                    Saisissez votre adresse email : nous vous enverrons un lien
                    sécurisé pour créer un nouveau mot de passe.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-6 space-y-4"
                  noValidate
                >
                  <Input
                    label="Adresse email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.mg"
                    error={errors.email?.message}
                    {...register('email')}
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
                    loading={isSubmitting || forgot.isPending}
                    className="w-full"
                  >
                    Envoyer le lien
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
