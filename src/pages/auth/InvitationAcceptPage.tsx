import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { acceptInvitationSchema, type AcceptInvitationInput } from '../../schemas/auth';
import { useAcceptInvitation } from '../../features/auth/hooks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function InvitationAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const accept = useAcceptInvitation();
  const [serverError, setServerError] = useState<string | null>(null);
  const token = (params.get('token') ?? '').trim();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token },
  });

  const onSubmit = async (values: AcceptInvitationInput) => {
    setServerError(null);
    try {
      await accept.mutateAsync({ ...values, token: token || values.token });
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Invitation impossible.');
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-6">
          <h1 className="text-xl font-bold">Invitation invalide</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Lien manquant ou incomplet. Demandez une nouvelle invitation à
            l'administrateur.
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold underline">
            Retour à la connexion
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Accepter l'invitation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Créez votre mot de passe pour rejoindre Giga Vibe Event.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <input type="hidden" {...register('token')} value={token} />
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
            label="Téléphone (optionnel)"
            type="tel"
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
          <Button type="submit" loading={isSubmitting || accept.isPending} className="w-full">
            Accepter l'invitation
          </Button>
        </form>
      </Card>
    </div>
  );
}
