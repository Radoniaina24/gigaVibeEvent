import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema, type RegisterInput } from '../../schemas/auth';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
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

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Créer un compte</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Achetez vos billets en quelques minutes.
        </p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
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
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {serverError && (
            <p role="alert" className="text-sm text-red-600">
              {serverError}
            </p>
          )}
          <Button type="submit" loading={isSubmitting} className="w-full">
            S'inscrire
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600">
          Déjà un compte ?{' '}
          <Link className="font-medium hover:underline" to="/login">
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  );
}
