import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Handshake,
  Inbox,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  Tags,
  Ticket,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Header } from './Header';
import { cn } from '../../lib/utils';

interface AdminLink {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

interface AdminGroup {
  title: string;
  links: AdminLink[];
}

const groups: AdminGroup[] = [
  {
    title: 'Pilotage',
    links: [
      { to: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboard, end: true },
      { to: '/admin/statistics', label: 'Statistiques', icon: BarChart3 },
    ],
  },
  {
    title: 'Ventes',
    links: [
      { to: '/admin/orders', label: 'Commandes', icon: Receipt },
      { to: '/admin/payments', label: 'Paiements', icon: Wallet },
      { to: '/admin/tickets', label: 'Billets', icon: Ticket },
    ],
  },
  {
    title: 'Partenaires',
    links: [
      { to: '/admin/partners', label: 'Partenaires', icon: Handshake },
      { to: '/admin/validations', label: 'Validations', icon: Inbox },
    ],
  },
  {
    title: 'Catalogue',
    links: [
      { to: '/admin/events', label: 'Événements', icon: CalendarDays },
      { to: '/admin/categories', label: 'Catégories', icon: Tags },
    ],
  },
  {
    title: 'Système',
    links: [
      { to: '/admin/users', label: 'Utilisateurs', icon: Users },
      { to: '/admin/settings', label: 'Paramètres', icon: Settings },
    ],
  },
];

const allLinks = groups.flatMap((g) => g.links);

function currentLabel(pathname: string): string {
  const exact = allLinks.find((l) => l.end && pathname === l.to);
  if (exact) return exact.label;
  const match = allLinks
    .filter((l) => !l.end && (pathname === l.to || pathname.startsWith(`${l.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? 'Backoffice';
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {g.title}
          </p>
          <nav aria-label={g.title} className="mt-1.5 space-y-0.5">
            {g.links.map((l) => (
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
        </div>
      ))}
    </div>
  );
}

export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

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
      <div className="mx-auto grid w-full max-w-7xl min-w-0 flex-1 gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 md:py-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Sidebar desktop */}
        <aside aria-label="Menu administrateur" className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
                <ShieldCheck className="size-4 text-white" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Backoffice</p>
                <p className="text-xs text-zinc-500">Accès administrateur</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
              <AdminNav />
            </div>
            <Link
              to="/"
              className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-3.5 text-sm shadow-sm transition hover:bg-zinc-50"
            >
              <ExternalLink className="size-4 shrink-0 text-zinc-500" aria-hidden />
              <span>
                <span className="block font-medium">Voir le site</span>
                <span className="block text-xs text-zinc-500">Retour à la billetterie</span>
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
              aria-controls="admin-drawer"
              aria-label="Ouvrir le menu administrateur"
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-zinc-900 text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
              <ShieldCheck className="size-4 text-zinc-700" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Backoffice
              </span>
              <span className="block truncate text-sm font-bold leading-tight">
                {currentLabel(pathname)}
              </span>
            </span>
            <Link
              to="/"
              aria-label="Voir le site"
              title="Voir le site"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <main className="w-full min-w-0">
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
            className="drawer-in-left absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
                <ShieldCheck className="size-4 text-white" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold leading-tight">Backoffice</span>
                <span className="block text-xs text-zinc-500">Accès administrateur</span>
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
              <AdminNav onNavigate={() => setDrawerOpen(false)} />
            </div>

            <div className="border-t border-zinc-100 p-3">
              <Link
                to="/"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-zinc-200 px-3.5 py-3 text-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <ExternalLink className="size-4 shrink-0 text-zinc-500" aria-hidden />
                <span className="flex flex-1 items-center justify-between gap-2">
                  <span>
                    <span className="block font-medium">Voir le site</span>
                    <span className="block text-xs text-zinc-500">Retour à la billetterie</span>
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
