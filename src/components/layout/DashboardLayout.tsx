import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Receipt, Ticket, User } from 'lucide-react';
import { Footer, Header } from './Header';
import { cn } from '../../lib/utils';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/orders', label: 'Mes commandes', icon: Receipt },
  { to: '/dashboard/tickets', label: 'Mes billets', icon: Ticket },
  { to: '/dashboard/profile', label: 'Mon profil', icon: User },
];

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 md:grid-cols-[220px_1fr]">
        <aside aria-label="Menu utilisateur">
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
      <Footer />
    </div>
  );
}
