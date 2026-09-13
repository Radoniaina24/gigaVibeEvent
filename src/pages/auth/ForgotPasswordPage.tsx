import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '../../schemas/auth';
import { getSupabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
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
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Envoi impossible.',
      );
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Mot de passe oublié</h1>
        {done ? (
          <p className="mt-4 text-sm text-green-700">
            Si un compte existe, un lien de réinitialisation a été envoyé par
            email.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 space-y-4"
            noValidate
          >
            <Input
              label="Email"
              type="email"
              error={errors.email?.message}
              {...register('email')}
            />
            {serverError && (
              <p role="alert" className="text-sm text-red-600">
                {serverError}
              </p>
            )}
            <Button type="submit" loading={isSubmitting} className="w-full">
              Envoyer le lien
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
