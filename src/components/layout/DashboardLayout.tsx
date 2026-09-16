import { Link, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, LifeBuoy, Receipt, Ticket, User } from 'lucide-react';
import { Footer, Header } from './Header';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../lib/utils';

const links = [
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

export function DashboardLayout() {
  const { user, profile, emailVerified } = useAuth();
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    'Mon compte';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto grid w-full max-w-6xl min-w-0 flex-1 gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 md:py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside aria-label="Menu utilisateur" className="lg:sticky lg:top-24 lg:self-start">
          {/* Carte membre */}
          <div className="mb-3 hidden items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white"
            >
              {initials(displayName, user?.email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
              <p className="truncate text-xs text-zinc-500">{user?.email}</p>
            </div>
          </div>

          <nav
            aria-label="Navigation du compte"
            className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:rounded-xl lg:border lg:border-zinc-200 lg:bg-white lg:p-1.5 lg:shadow-sm"
          >
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-md px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 lg:px-3',
                    isActive
                      ? 'bg-zinc-900 font-medium text-white lg:bg-zinc-100 lg:font-medium lg:text-zinc-900'
                      : 'border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 lg:border-0 lg:bg-transparent',
                  )
                }
              >
                <l.icon className="size-4 shrink-0" aria-hidden />
                {l.label}
              </NavLink>
            ))}
          </nav>

          <Link
            to="/contact"
            className="mt-3 hidden items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 lg:flex"
          >
            <LifeBuoy className="size-4 shrink-0 text-zinc-500" aria-hidden />
            <span>
              <span className="block font-medium">Besoin d’aide ?</span>
              <span className="block text-xs text-zinc-500">Contactez le support</span>
            </span>
          </Link>
        </aside>
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
    </div>
  );
}
