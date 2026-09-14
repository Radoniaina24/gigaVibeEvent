import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabase';
import { apiRegister } from '../../lib/edgeFunctions';
import type { Profile, UserRole } from '../../types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  isController: boolean;
  /** true si l'email a été confirmé (auth.users.email_confirmed_at). */
  emailVerified: boolean;
  signUp: (args: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => Promise<{ confirmationSent: boolean }>;
  signIn: (args: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Email vérifié = flag Resend (app_metadata.email_verified, positionné par
 * le backend), avec fallback sur email_confirmed_at pour les comptes créés
 * avant l'intégration Resend. Les nouveaux comptes sont créés avec
 * email_confirm:true (zéro email Supabase) + flag à false.
 */
export function isEmailVerified(u: User | null): boolean {
  if (!u) return false;
  const flag = (u.app_metadata as Record<string, unknown> | undefined)
    ?.email_verified;
  if (typeof flag === 'boolean') return flag;
  return Boolean(
    (u as User & { email_confirmed_at?: string | null }).email_confirmed_at,
  );
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).then((p) => {
          if (mounted) {
            setProfile(p);
            setIsLoading(false);
          }
        });
      } else {
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.user) {
          fetchProfile(nextSession.user.id).then((p) => {
            if (mounted) setProfile(p);
          });
        } else {
          setProfile(null);
        }
      },
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Inscription via le backend (Edge Function auth-register) :
   * création Auth SANS email Supabase + token hashé + envoi Resend.
   * Ne jamais appeler supabase.auth.signUp ici (déclencherait l'email Supabase).
   */
  const signUp: AuthContextValue['signUp'] = useCallback(async (args) => {
    const res = await apiRegister({
      email: args.email,
      password: args.password,
      first_name: args.first_name,
      last_name: args.last_name,
      phone: args.phone,
    });
    if (!res.email_sent) {
      // Compte créé mais email non parti : le resend reste possible.
      console.warn('[auth] inscription sans email initial, resend requis.');
    }
    return { confirmationSent: true };
  }, []);

  const signIn: AuthContextValue['signIn'] = useCallback(async (args) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword(args);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        throw new Error(
          'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception.',
        );
      }
      throw error;
    }
    // Bloque la connexion tant que l'email n'est pas vérifié via Resend.
    if (data.user && !isEmailVerified(data.user)) {
      await supabase.auth.signOut();
      throw new Error(
        'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception.',
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      role: profile?.role ?? null,
      isLoading,
      isAdmin: profile?.role === 'admin' && profile.is_active,
      isPartner: profile?.role === 'partner' && profile.is_active,
      isController: profile?.role === 'controller' && profile.is_active,
      emailVerified: isEmailVerified(user),
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, isLoading, signUp, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
