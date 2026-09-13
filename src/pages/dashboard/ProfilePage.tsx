import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  profileSchema,
  resetPasswordSchema,
  type ProfileInput,
  type ResetPasswordInput,
} from '../../schemas/auth';
import { useAuth } from '../../features/auth/AuthContext';
import { useProfile, useUpdateProfile } from '../../features/auth/useProfile';
import { getSupabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { LoadingState, ErrorState } from '../../components/ui/States';

export function ProfilePage() {
  const { user } = useAuth();
  const { data, isPending, isError, refetch } = useProfile();
  const update = useUpdateProfile();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (data) {
      reset({
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        phone: data.phone ?? '',
      });
    }
  }, [data, reset]);

  if (isPending) return <LoadingState label="Chargement du profil…" />;
  if (isError || !data)
    return (
      <ErrorState
        description="Profil illisible."
        onRetry={() => refetch()}
      />
    );

  const onSubmit = async (values: ProfileInput) => {
    setSaved(false);
    await update.mutateAsync(values);
    setSaved(true);
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      <Card className="p-6">
        <p className="text-sm text-zinc-500">{user?.email}</p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-4 space-y-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              error={errors.first_name?.message}
              {...register('first_name')}
            />
            <Input
              label="Nom"
              error={errors.last_name?.message}
              {...register('last_name')}
            />
          </div>
          <Input
            label="Téléphone"
            error={errors.phone?.message}
            {...register('phone')}
          />
          {update.isError && (
            <p role="alert" className="text-sm text-red-600">
              Mise à jour impossible.
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-green-700">
              Profil enregistré.
            </p>
          )}
          <Button
            type="submit"
            loading={isSubmitting || update.isPending}
            className="w-full"
          >
            Enregistrer
          </Button>
        </form>
      </Card>
      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    setDone(false);
    setServerError(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) throw error;
      reset();
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Changement impossible.',
      );
    }
  };

  return (
    <Card className="p-6">
      <h2 className="font-bold">Mot de passe</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
        <Input
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirmer"
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
        {done && (
          <p role="status" className="text-sm text-green-700">
            Mot de passe mis à jour.
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full">
          Changer le mot de passe
        </Button>
      </form>
    </Card>
  );
}
