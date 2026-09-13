import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, QrCode, Smartphone, Sparkles } from 'lucide-react';
import { registerSchema, type RegisterInput } from '../../schemas/auth';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/brand/Logo';

const BENEFITS = [
  { icon: Sparkles, text: 'Compte gratuit, pour toujours' },
  { icon: QrCode, text: 'Billets QR Code reçus immédiatement' },
  { icon: Smartphone, text: 'Paiement MVola, Orange, Airtel' },
];

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      await signUp({
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || undefined,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Inscription impossible.',
      );
    }
  };

  const passwordType = showPasswords ? 'text' : 'password';

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
