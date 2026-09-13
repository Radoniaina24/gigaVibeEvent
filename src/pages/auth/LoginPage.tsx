import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loginSchema, type LoginInput } from '../../schemas/auth';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
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
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Connexion</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Accédez à vos commandes et billets.
        </p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.mg"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {serverError && (
            <p role="alert" className="text-sm text-red-600">
              {serverError}
            </p>
          )}
          <Button type="submit" loading={isSubmitting} className="w-full">
            Se connecter
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link className="text-zinc-600 hover:underline" to="/forgot-password">
            Mot de passe oublié ?
          </Link>
          <Link className="font-medium hover:underline" to="/register">
            Créer un compte
          </Link>
        </div>
      </Card>
    </div>
  );
}
