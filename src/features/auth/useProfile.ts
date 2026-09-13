import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import type { Profile } from '../../types/database';
import type { ProfileInput } from '../../schemas/auth';

export const profileKeys = {
  all: ['profile'] as const,
  me: (userId: string | undefined) => ['profile', 'me', userId] as const,
};

/** Profil de l'utilisateur connecté (RLS : SELECT own profile). */
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: profileKeys.me(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

/** Mise à jour du profil (RLS : UPDATE own profile, rôle non modifiable). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  return useMutation({
    mutationFn: async (input: ProfileInput): Promise<Profile> => {
      if (!user) throw new Error('Non authentifié');
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      await refreshProfile();
    },
  });
}
