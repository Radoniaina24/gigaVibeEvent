import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Receipt,
  Settings,
  Tags,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { Header } from './Header';
import { cn } from '../../lib/utils';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/events', label: 'Événements', icon: CalendarDays },
  { to: '/admin/categories', label: 'Catégories', icon: Tags },
  { to: '/admin/orders', label: 'Commandes', icon: Receipt },
  { to: '/admin/payments', label: 'Paiements', icon: Wallet },
  { to: '/admin/tickets', label: 'Billets', icon: Ticket },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/statistics', label: 'Statistiques', icon: BarChart3 },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 md:grid-cols-[230px_1fr]">
        <aside aria-label="Menu administrateur">
          <nav className="space-y-1 rounded-xl border border-zinc-200 bg-white p-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100',
                  )
                }
              >
                <l.icon className="size-4" aria-hidden />
                {l.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
