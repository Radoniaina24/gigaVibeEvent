import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { AdminSidebar, adminSectionLabel } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

/**
 * Coquille du backoffice façon TailAdmin : sidebar sombre fixe, topbar
 * dédiée (menu mobile, fil d'Ariane, cloche paiements, compte) et contenu
 * fluide pleine largeur. Le tiroir mobile réutilise la même sidebar.
 */
export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem('gve-admin-sidebar') === 'collapsed',
  );
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      try {
        window.localStorage.setItem('gve-admin-sidebar', prev ? 'expanded' : 'collapsed');
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
        <aside aria-label="Menu administrateur" className="hidden lg:block">
          <div className="fixed inset-y-0 left-0 w-[260px]">
            <AdminSidebar />
          </div>
        </aside>
      )}

      {/* Colonne contenu */}
      <div className={sidebarCollapsed ? 'min-w-0' : 'min-w-0 lg:pl-[260px]'}>
        <AdminTopbar
          title={adminSectionLabel(pathname)}
          onMenu={() => setDrawerOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
        <main className="w-full min-w-0 px-4 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>

      {/* Tiroir latéral mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu administrateur">
          <div
            className="overlay-in absolute inset-0 bg-night-950/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="admin-drawer"
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
            <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
