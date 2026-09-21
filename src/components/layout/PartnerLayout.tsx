import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { PartnerSidebar, partnerSectionLabel } from './PartnerSidebar';
import { PartnerTopbar } from './PartnerTopbar';

/**
 * Coquille de l'espace organisateur, alignée sur le backoffice admin
 * façon TailAdmin : sidebar sombre fixe, topbar dédiée (menu mobile,
 * fil d'Ariane, cloche paiements, compte) et contenu fluide pleine largeur.
 * Le tiroir mobile réutilise la même sidebar.
 */
export function PartnerLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem('gve-partner-sidebar') === 'collapsed',
  );
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      try {
        window.localStorage.setItem('gve-partner-sidebar', prev ? 'expanded' : 'collapsed');
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
        <aside aria-label="Menu organisateur" className="hidden lg:block">
          <div className="fixed inset-y-0 left-0 w-[260px]">
            <PartnerSidebar />
          </div>
        </aside>
      )}

      {/* Colonne contenu */}
      <div className={sidebarCollapsed ? 'min-w-0' : 'min-w-0 lg:pl-[260px]'}>
        <PartnerTopbar
          title={partnerSectionLabel(pathname)}
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
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu organisateur">
          <div
            className="overlay-in absolute inset-0 bg-night-950/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="partner-drawer"
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
            <PartnerSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Bannière de statut du compte partenaire (en attente / suspendu / désactivé). */
export function PartnerStatusBanner({ status }: { status: string }) {
  if (status === 'active') return null;
  const messages: Record<string, { title: string; text: string }> = {
    pending: {
      title: 'Compte en attente de validation',
      text: 'Giga Vibe Event examine votre dossier. Vous pouvez préparer vos événements, la publication suivra.',
    },
    suspended: {
      title: 'Compte suspendu',
      text: 'Vos ventes sont interrompues. Contactez Giga Vibe Event pour régulariser la situation.',
    },
    disabled: {
      title: 'Compte désactivé',
      text: 'Votre espace est désactivé. Contactez Giga Vibe Event.',
    },
  };
  const m = messages[status] ?? {
    title: 'Compte non actif',
    text: 'Contactez Giga Vibe Event.',
  };
  return (
    <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">{m.title}</p>
      <p className="mt-0.5 text-sm text-amber-800">{m.text}</p>
      <Link to="/contact" className="mt-2 inline-block text-sm font-semibold text-amber-900 hover:underline">
        Contacter Giga Vibe Event
      </Link>
    </div>
  );
}
