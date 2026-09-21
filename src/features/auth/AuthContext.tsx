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
import {
  primaryRole,
  type Profile,
  type UserRole,
  type UserRoleRow,
} from '../../types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** Rôle principal (compat legacy = max priorité de `roles`). */
  role: UserRole | null;
  /** Tous les rôles actifs (source de vérité = user_roles). */
  roles: UserRole[];
  partnerIds: string[];
  isLoading: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  isController: boolean;
  /** true si l'email a été confirmé (auth.users.email_confirmed_at). */
  emailVerified: boolean;
  hasRole: (r: UserRole | UserRole[]) => boolean;
  signUp: (args: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => Promise<{ confirmationSent: boolean; emailSent: boolean; email: string }>;
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

function toRoles(rows: Pick<UserRoleRow, 'role' | 'partner_id' | 'is_active' | 'expires_at'>[] | null | undefined, fallback?: UserRole | null): { roles: UserRole[]; partnerIds: string[] } {
  const active = (rows ?? []).filter(
    (r) => r.is_active && (!r.expires_at || new Date(r.expires_at).getTime() > Date.now()),
  );
  const roles = [...new Set(active.map((r) => r.role))] as UserRole[];
  const partnerIds = [...new Set(active.map((r) => r.partner_id).filter((v): v is string => Boolean(v)))];
  if (roles.length === 0 && fallback) return { roles: [fallback], partnerIds: [] };
  if (roles.length === 0) return { roles: [], partnerIds };
  return { roles, partnerIds };
}

async function fetchProfileAndRoles(
  userId: string,
): Promise<{ profile: Profile | null; roles: UserRole[]; partnerIds: string[] }> {
  const supabase = getSupabase();
  const [{ data: p, error: pErr }, { data: r }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('user_roles').select('role,partner_id,is_active,expires_at').eq('user_id', userId),
  ]);
  if (pErr || !p) return { profile: null, roles: [], partnerIds: [] };
  const profile = p as Profile;
  // Si la table user_roles n'existe pas encore (migration non appliquée),
  // fallback gracieux sur profiles.role.
  const { roles, partnerIds } = toRoles(
    (r ?? null) as Pick<UserRoleRow, 'role' | 'partner_id' | 'is_active' | 'expires_at'>[] | null,
    profile.role,
  );
  const mergedPartnerIds =
    profile.partner_id && !partnerIds.includes(profile.partner_id)
      ? [...partnerIds, profile.partner_id]
      : partnerIds;
  return { profile, roles, partnerIds: mergedPartnerIds };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [partnerIds, setPartnerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfileAndRoles(data.session.user.id).then(({ profile: p, roles: rs, partnerIds: pids }) => {
          if (mounted) {
            setProfile(p);
            setRoles(rs);
            setPartnerIds(pids);
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
          fetchProfileAndRoles(nextSession.user.id).then(({ profile: p, roles: rs, partnerIds: pids }) => {
            if (mounted) {
              setProfile(p);
              setRoles(rs);
              setPartnerIds(pids);
            }
          });
        } else {
          setProfile(null);
          setRoles([]);
          setPartnerIds([]);
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
      // Compte créé mais email non parti (prod mal configurée, Resend 403,
      // quota, rate-limit) : le resend reste possible. Ne jamais masquer
      // cet état au client.
      console.warn('[auth] inscription sans email initial, resend requis.');
    }
    return { confirmationSent: true, emailSent: res.email_sent, email: res.email };
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
    setRoles([]);
    setPartnerIds([]);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { profile: p, roles: rs, partnerIds: pids } = await fetchProfileAndRoles(user.id);
    setProfile(p);
    setRoles(rs);
    setPartnerIds(pids);
  }, [user]);

  const hasRole = useCallback(
    (r: UserRole | UserRole[]) => {
      const want = Array.isArray(r) ? r : [r];
      return want.some((x) => roles.includes(x));
    },
    [roles],
  );

  const value = useMemo<AuthContextValue>(() => {
    const active = profile?.is_active ?? false;
    // Double lecture : user_roles (pro) + fallback profiles.role (compat migration).
    const legacy = profile?.role;
    const isAdmin = active && (roles.includes('admin') || legacy === 'admin');
    const isPartner = active && (roles.includes('partner') || legacy === 'partner' || isAdmin);
    const isController =
      active && (roles.includes('controller') || legacy === 'controller' || isAdmin || roles.includes('partner'));
    return {
      user,
      session,
      profile,
      role: roles.length > 0 ? primaryRole(roles) : (profile?.role ?? null),
      roles,
      partnerIds,
      isLoading,
      isAdmin,
      isPartner,
      isController,
      emailVerified: isEmailVerified(user),
      hasRole,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    };
  }, [user, session, profile, roles, partnerIds, isLoading, hasRole, signUp, signIn, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
