import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
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

/** Exige le rôle admin (vérifié via profiles.role, pas seulement le frontend). */
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

/** Exige le rôle partenaire (espace organisateur, étape 2 du CDC v2). */
export function PartnerRoute() {
  const { user, isPartner, isAdmin, isLoading, profile } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Vérification des droits…" />;
  if (!user) {
    return (
      <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    );
  }
  if (!profile || (!isPartner && !isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
