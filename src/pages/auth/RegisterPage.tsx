import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Mail, QrCode, Smartphone, Sparkles } from 'lucide-react';
import { registerSchema, type RegisterInput } from '../../schemas/auth';
import { useAuth } from '../../features/auth/AuthContext';
import { useResendConfirmation } from '../../features/auth/hooks';
import { useToast } from '../../components/ui/Toaster';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/brand/Logo';

const BENEFITS = [
  { icon: Sparkles, text: 'Compte gratuit, pour toujours' },
  { icon: QrCode, text: 'Billets QR Code reçus immédiatement' },
  { icon: Smartphone, text: 'Paiement YAS, Orange, Airtel' },
];

const RESEND_COOLDOWN_S = 60;

export function RegisterPage() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const resend = useResendConfirmation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      // Backend + Resend (aucun email Supabase).
      const result = await signUp({
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || undefined,
      });
      setCreatedEmail(values.email);
      setEmailSent(result.emailSent);
      setCooldown(RESEND_COOLDOWN_S);
      if (result.emailSent) {
        toast.success(
          'Compte créé — vérifiez votre adresse email',
          `Un lien de confirmation a été envoyé à ${values.email}. Cliquez dessus avant de vous connecter.`,
        );
      } else {
        toast.warning(
          'Compte créé, mais email non envoyé',
          `Aucun email de confirmation n'a pu partir vers ${values.email}. Cliquez sur « Renvoyer l’email » (vérifiez aussi vos spams).`,
        );
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Inscription impossible.',
      );
    }
  };

  const onResend = async () => {
    if (!createdEmail || cooldown > 0) return;
    try {
      await resend.mutateAsync(createdEmail);
      setCooldown(RESEND_COOLDOWN_S);
      toast.success('Email renvoyé', `Vérifiez votre boîte : ${createdEmail}.`);
    } catch (err) {
      toast.error(
        'Envoi impossible',
        err instanceof Error ? err.message : 'Réessayez dans un instant.',
      );
    }
  };

  const passwordType = showPasswords ? 'text' : 'password';

  if (createdEmail) {
    return (
      <div className="mx-auto max-w-md py-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto size-12 text-green-600" aria-hidden />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            Compte créé !
          </h1>
          {!emailSent && (
            <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              L'email de confirmation n'a pas pu être envoyé. Vérifiez vos spams puis
              cliquez sur « Renvoyer l'email ». Si le problème persiste, le service
              email de production est mal configuré (RESEND_API_KEY / domaine vérifié).
            </p>
          )}
          <p className="mt-2 text-sm text-zinc-600">
            {emailSent
              ? 'Nous avons envoyé un email de confirmation à :'
              : 'Votre compte en attente de confirmation :'}
          </p>
          <p className="mt-1 text-sm font-bold">{createdEmail}</p>
          <p className="mt-2 text-sm text-zinc-500">
            Veuillez consulter votre boîte de réception et cliquer sur le lien de
            confirmation (valable 60 minutes).
          </p>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            loading={resend.isPending}
            disabled={cooldown > 0}
            onClick={onResend}
          >
            {cooldown > 0 ? `Renvoyer l'email dans ${cooldown}s` : "Renvoyer l'email"}
          </Button>
          <p className="mt-4 text-sm text-zinc-500">
            Déjà confirmé ?{' '}
            <Link className="font-bold text-zinc-900 hover:underline" to="/login">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl md:grid-cols-[0.9fr_1.1fr]">
        {/* Panneau marque */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-8 md:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(24rem 14rem at 15% 0%, rgb(220 38 38 / 0.5), transparent 60%), radial-gradient(20rem 14rem at 90% 100%, rgb(245 158 11 / 0.25), transparent 60%)',
            }}
          />
          <div className="relative">
            <Logo size={36} />
          </div>
          <div className="relative">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white">
              Rejoignez la fête.
              <br />
              <span className="text-amber-300">C'est gratuit.</span>
            </h2>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b.text} className="flex items-center gap-3 text-sm font-medium text-zinc-100">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <b.icon className="size-4 text-amber-300" aria-hidden />
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs font-medium text-zinc-300">
            Vos billets restent accessibles à tout moment.
          </p>
        </div>

        {/* Formulaire */}
        <div className="p-6 md:p-10">
          <div className="md:hidden">
            <Logo size={32} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight md:mt-0 md:text-3xl">
            Créer un compte
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Achetez vos billets en quelques minutes.
          </p>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <Mail className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
            <p className="text-xs leading-relaxed text-blue-900">
              Après votre inscription, <strong>vérifiez votre adresse email</strong> :
              cliquez sur le lien de confirmation avant de vous connecter.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                autoComplete="given-name"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                label="Nom"
                autoComplete="family-name"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.mg"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Téléphone (optionnel)"
              type="tel"
              autoComplete="tel"
              placeholder="+261 …"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <div className="relative">
              <Input
                label="Mot de passe"
                type={passwordType}
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                aria-label={showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
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
            <Input
              label="Confirmer le mot de passe"
              type={passwordType}
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            {serverError && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {serverError}
              </p>
            )}
            <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
              S'inscrire
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-zinc-500">
            Déjà un compte ?{' '}
            <Link className="font-bold text-zinc-900 hover:underline" to="/login">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
