import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  Receipt,
  Settings,
  ShieldCheck,
  Tags,
  Ticket,
  Users,
  Wallet,
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
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-zinc-100 font-medium text-zinc-900'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
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
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 md:py-8 lg:grid-cols-[250px_minmax(0,1fr)]">
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

        {/* Nav horizontale (mobile / tablette) */}
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 lg:hidden">
          <nav aria-label="Menu administrateur" className="flex gap-1.5">
            {groups.flatMap((g) => g.links).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors',
                    isActive
                      ? 'border-zinc-900 bg-zinc-900 font-medium text-white'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900',
                  )
                }
              >
                <l.icon className="size-4 shrink-0" aria-hidden />
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
