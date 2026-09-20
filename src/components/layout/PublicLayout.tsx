import { Outlet, useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Footer, Header } from './Header';
import { useAuth } from '../../features/auth/AuthContext';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { Button } from '../ui/Button';

/**
 * Écran affiché quand `maintenance_mode` est actif (non-admin uniquement).
 * `/login` reste ouvert pour que les admins puissent se connecter.
 */
function MaintenanceScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <span
        aria-hidden
        className="grid size-16 place-items-center rounded-3xl bg-zinc-900 text-white shadow-lg"
      >
        <Wrench className="size-8" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">Maintenance en cours</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{message}</p>
      <Button size="sm" variant="secondary" className="mt-5" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();
  const { isAdmin, isLoading } = useAuth();
  const settings = usePlatformSettings();

  const underMaintenance =
    !isLoading && settings.data?.maintenanceMode === true && !isAdmin && pathname !== '/login';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 md:px-2">
        {underMaintenance ? (
          <MaintenanceScreen
            message={settings.data?.maintenanceMessage ?? 'Site en maintenance.'}
            onRetry={() => settings.refetch()}
          />
        ) : (
          <Outlet />
        )}
      </main>
      <Footer />
    </div>
  );
}
