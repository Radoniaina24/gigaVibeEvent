import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Receipt,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { Footer, Header } from './Header';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../lib/utils';

interface DashboardLink {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const links: DashboardLink[] = [
  { to: '/dashboard', label: 'Aperçu', icon: LayoutDashboard, end: true },
  { to: '/dashboard/orders', label: 'Commandes', icon: Receipt },
  { to: '/dashboard/tickets', label: 'Billets', icon: Ticket },
  { to: '/dashboard/profile', label: 'Profil', icon: User },
];

function initials(name: string, email: string | undefined): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email?.slice(0, 2) ?? '??').toUpperCase();
}

function currentLabel(pathname: string): string {
  const exact = links.find((l) => l.end && pathname === l.to);
  if (exact) return exact.label;
  const match = links
    .filter((l) => !l.end && (pathname === l.to || pathname.startsWith(`${l.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? 'Mon compte';
}

function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navigation du compte" className="space-y-0.5">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900',
              isActive
                ? 'bg-zinc-900 font-medium text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
            )
          }
        >
          <l.icon className="size-4 shrink-0" aria-hidden />
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function DashboardLayout() {
  const { user, profile, emailVerified } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    'Mon compte';

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
    <div className="flex min-h-screen w-full flex-col overflow-x-clip">
      <Header />
      <div className="mx-auto grid w-full max-w-6xl min-w-0 flex-1 gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 md:py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar desktop */}
        <aside aria-label="Menu utilisateur" className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white"
              >
                {initials(displayName, user?.email)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
                <p className="truncate text-xs text-zinc-500">{user?.email}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
              <DashboardNav />
            </div>
            <Link
              to="/contact"
              className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-3.5 text-sm shadow-sm transition hover:bg-zinc-50"
            >
              <LifeBuoy className="size-4 shrink-0 text-zinc-500" aria-hidden />
              <span>
                <span className="block font-medium">Besoin d’aide ?</span>
                <span className="block text-xs text-zinc-500">Contactez le support</span>
              </span>
            </Link>
          </div>
        </aside>

        {/* Barre + tiroir (mobile / tablette) */}
        <div className="lg:hidden">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              aria-controls="dashboard-drawer"
              aria-label="Ouvrir le menu du compte"
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-zinc-900 text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-[11px] font-bold text-white"
            >
              {initials(displayName, user?.email)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight">
                {displayName}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {currentLabel(pathname)}
              </span>
            </span>
            <Link
              to="/contact"
              aria-label="Contacter le support"
              title="Contacter le support"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              <LifeBuoy className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <main className="w-full min-w-0">
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
      <Footer />

      {/* Tiroir latéral mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu du compte">
          <div
            className="overlay-in absolute inset-0 bg-night-950/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="dashboard-drawer"
            className="drawer-in-left absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-[11px] font-bold text-white"
              >
                {initials(displayName, user?.email)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold leading-tight">{displayName}</span>
                <span className="block truncate text-xs text-zinc-500">{user?.email}</span>
              </span>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
                className="grid size-9 shrink-0 place-items-center rounded-lg transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <DashboardNav onNavigate={() => setDrawerOpen(false)} />
            </div>

            <div className="border-t border-zinc-100 p-3">
              <Link
                to="/contact"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-zinc-200 px-3.5 py-3 text-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <LifeBuoy className="size-4 shrink-0 text-zinc-500" aria-hidden />
                <span className="flex flex-1 items-center justify-between gap-2">
                  <span>
                    <span className="block font-medium">Besoin d’aide ?</span>
                    <span className="block text-xs text-zinc-500">Contactez le support</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
