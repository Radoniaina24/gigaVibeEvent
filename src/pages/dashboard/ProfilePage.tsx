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
import { useToast } from '../../components/ui/Toaster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { ProfileSkeleton } from '../../components/dashboard/DashboardSkeletons';
import { ErrorState } from '../../components/ui/States';

function initials(first: string, last: string, email: string | undefined): string {
  const a = first.trim()[0] ?? '';
  const b = last.trim()[0] ?? '';
  if (a || b) return `${a}${b}`.toUpperCase();
  return (email?.slice(0, 2) ?? '??').toUpperCase();
}

export function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isPending, isError, refetch } = useProfile();
  const update = useUpdateProfile();

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

  if (isPending) return <ProfileSkeleton />;
  if (isError || !data)
    return (
      <ErrorState
        description="Profil illisible."
        onRetry={() => refetch()}
      />
    );

  const onSubmit = async (values: ProfileInput) => {
    try {
      await update.mutateAsync(values);
      toast.updated('Profil', 'Vos informations ont été enregistrées.');
    } catch {
      toast.error('Mise à jour impossible', 'Réessayez dans un instant.');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
        <p className="text-sm text-zinc-500">
          Gérez vos informations personnelles et votre mot de passe.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white"
          >
            {initials(data.first_name ?? '', data.last_name ?? '', user?.email)}
          </span>
          <div className="min-w-0">
            <CardTitle>
              {[data.first_name, data.last_name].filter(Boolean).join(' ') || 'Mon compte'}
            </CardTitle>
            <CardDescription className="truncate">{user?.email}</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>
            Ces informations servent à personnaliser vos billets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
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
            <Button
              type="submit"
              loading={isSubmitting || update.isPending}
              className="w-full sm:w-auto"
            >
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const { toast } = useToast();
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
    setServerError(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) throw error;
      reset();
      toast.success('Mot de passe mis à jour', 'Utilisez-le lors de votre prochaine connexion.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Changement impossible.';
      setServerError(message);
      toast.error('Changement impossible', message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe</CardTitle>
        <CardDescription>
          Utilisez un mot de passe long et unique.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
          <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
            Changer le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
