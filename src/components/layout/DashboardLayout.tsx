import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { DashboardSidebar, dashboardSectionLabel } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';
import { useAuth } from '../../features/auth/AuthContext';

/**
 * Coquille du compte (même design que le backoffice) : sidebar sombre fixe,
 * topbar dédiée (menu mobile, repli sidebar, fil d'Ariane, alerte email,
 * compte) et contenu fluide pleine largeur. Le tiroir mobile réutilise la
 * même sidebar.
 */
export function DashboardLayout() {
  const { user, emailVerified } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem('gve-dashboard-sidebar') === 'collapsed',
  );
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      try {
        window.localStorage.setItem('gve-dashboard-sidebar', prev ? 'expanded' : 'collapsed');
      } catch {
        /* stockage indisponible : repli mémoire */
      }
      return !prev;
    });
  };

  // Ferme le tiroir à chaque navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Verrouille le scroll + Escape + focus initial.
  useEffect(() => {
    if (!drawerOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen w-full bg-zinc-100">
      {/* Sidebar desktop fixe (masquable pour pleine largeur) */}
      {!sidebarCollapsed && (
        <aside aria-label="Menu du compte" className="hidden lg:block">
          <div className="fixed inset-y-0 left-0 w-[260px]">
            <DashboardSidebar />
          </div>
        </aside>
      )}

      {/* Colonne contenu */}
      <div className={sidebarCollapsed ? 'min-w-0' : 'min-w-0 lg:pl-[260px]'}>
        <DashboardTopbar
          title={dashboardSectionLabel(pathname)}
          onMenu={() => setDrawerOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
        <main className="w-full min-w-0 px-4 py-4 sm:px-6 sm:py-6">
          {user && !emailVerified && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            >
              Votre adresse email n'est pas encore vérifiée. Certaines
              fonctionnalités (dont la commande) sont bloquées.{' '}
              <Link to="/verify-email" className="font-bold underline">
                Vérifier mon email
              </Link>
            </p>
          )}
          <Outlet />
        </main>
      </div>

      {/* Tiroir latéral mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu du compte">
          <div
            className="overlay-in absolute inset-0 bg-night-950/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="dashboard-drawer"
            className="drawer-in-left absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-hidden rounded-r-2xl shadow-2xl"
          >
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Fermer le menu"
              className="absolute right-3 top-4 z-10 grid size-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
            >
              <X aria-hidden className="size-5" />
            </button>
            <DashboardSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
