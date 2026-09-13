import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, QrCode, Receipt, Smartphone } from 'lucide-react';
import { loginSchema, type LoginInput } from '../../schemas/auth';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/brand/Logo';

const BENEFITS = [
  { icon: QrCode, text: 'Billets QR Code conservés et téléchargeables' },
  { icon: Receipt, text: 'Historique complet de vos commandes' },
  { icon: Smartphone, text: 'Paiement Mobile Money en 1 minute' },
];

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await signIn(values);
      navigate(params.get('next') ?? '/dashboard', { replace: true });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Connexion impossible.',
      );
    }
  };

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
            Bon retour.
            <br />
            <span className="text-amber-300">Vos billets</span> vous attendent.
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
          Paiement sécurisé : MVola · Orange Money · Airtel Money
        </p>
      </div>

      {/* Formulaire */}
      <div className="p-6 md:p-10">
        <div className="md:hidden">
          <Logo size={32} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight md:mt-0 md:text-3xl">
          Connexion
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Accédez à vos commandes et billets.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.mg"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="relative">
            <Input
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showPassword}
              className="absolute right-3 top-8 rounded p-0.5 text-zinc-400 transition hover:text-zinc-700"
            >
              {showPassword ? (
                <EyeOff className="size-5" aria-hidden />
              ) : (
                <Eye className="size-5" aria-hidden />
              )}
            </button>
          </div>
          {serverError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {serverError}
            </p>
          )}
          <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
            Se connecter
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link className="font-medium text-brand-700 hover:underline" to="/forgot-password">
            Mot de passe oublié ?
          </Link>
          <p className="text-zinc-500">
            Nouveau ?{' '}
            <Link className="font-bold text-zinc-900 hover:underline" to="/register">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
