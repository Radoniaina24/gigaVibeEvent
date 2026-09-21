import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import type { UserRole } from '../../types/database';
import { LoadingState } from '../ui/States';

/** Exige une session. Sinon -> /login?next=... */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Vérification de la session…" />;
  if (!user) {
    return (
      <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    );
  }
  return <Outlet />;
}

/**
 * Exige un email vérifié (flag Resend app_metadata.email_verified).
 * Sans vérification -> /verify-email.
 * Utilisé pour les fonctionnalités sensibles (ex. /checkout).
 */
export function RequireVerifiedEmail() {
  const { user, emailVerified, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Vérification de la session…" />;
  if (!user) {
    return (
      <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    );
  }
  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  return <Outlet />;
}

/** Garde générique multi-rôles (pro) : admin bypass toujours. */
export function RequireRoles({ roles }: { roles: UserRole[] }) {
  const { user, isLoading, profile, roles: myRoles, isAdmin } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Vérification des droits…" />;
  if (!user) {
    return (
      <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    );
  }
  if (!profile) return <Navigate to="/dashboard" replace />;
  if (isAdmin) return <Outlet />;
  const ok = roles.some((r) => myRoles.includes(r) || profile.role === r);
  if (!ok) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Exige le rôle admin (vérifié via user_roles + profiles.role, pas seulement le frontend). */
export function AdminRoute() {
  const { user, isAdmin, isLoading, profile } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Vérification des droits…" />;
  if (!user) {
    return (
      <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    );
  }
  // profile=null => encore en chargement ou compte sans profil (bloquer par défaut)
  if (!profile || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

/** Exige le rôle partenaire (multi-rôles : partner OU admin). */
export function PartnerRoute() {
  const { user, isPartner, isLoading, profile } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Vérification des droits…" />;
  if (!user) {
    return (
      <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    );
  }
  if (!profile || !isPartner) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

/** Exige staff contrôle : controller, partner ou admin (scan billets). */
export function ControllerRoute() {
  const { user, isLoading, profile, hasRole } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Vérification des droits…" />;
  if (!user) {
    return (
      <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    );
  }
  if (!profile || !hasRole(['admin', 'controller', 'partner'])) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
