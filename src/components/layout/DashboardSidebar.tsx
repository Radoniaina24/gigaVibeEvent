import { Link, NavLink } from 'react-router-dom';
import {
  Handshake,
  LayoutDashboard,
  LogOut,
  Receipt,
  ShieldCheck,
  Ticket,
  User,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../lib/utils';
import { ROLE_LABEL } from './AdminSidebar';

export interface DashboardLink {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

export interface DashboardGroup {
  title: string;
  links: DashboardLink[];
}

export const DASHBOARD_GROUPS: DashboardGroup[] = [
  {
    title: 'Mon compte',
    links: [
      { to: '/dashboard', label: 'Aperçu', icon: LayoutDashboard, end: true },
      { to: '/dashboard/orders', label: 'Commandes', icon: Receipt },
      { to: '/dashboard/tickets', label: 'Billets', icon: Ticket },
      { to: '/dashboard/profile', label: 'Profil', icon: User },
    ],
  },
];

const SPACES_LINKS: DashboardLink[] = [
  { to: '/partner', label: 'Espace organisateur', icon: Handshake },
  { to: '/admin', label: 'Administration', icon: ShieldCheck },
];

const ALL_LINKS = [...DASHBOARD_GROUPS.flatMap((g) => g.links), ...SPACES_LINKS];

/** Libellé de la section courante (titre de la topbar). */
export function dashboardSectionLabel(pathname: string): string {
  const exact = ALL_LINKS.find((l) => l.end && pathname === l.to);
  if (exact) return exact.label;
  const match = ALL_LINKS.filter(
    (l) => !l.end && (pathname === l.to || pathname.startsWith(`${l.to}/`)),
  ).sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? 'Mon compte';
}

function initials(name: string, email: string | undefined): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email?.slice(0, 2) ?? '??').toUpperCase();
}

/**
 * Barre latérale sombre du compte (même design que le backoffice) : marque
 * GVE, navigation groupée avec état actif doré, accès espaces (organisateur
 * / admin selon les rôles), carte compte + déconnexion.
 * Réutilisée telle quelle dans le tiroir mobile.
 */
export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, profile, role, isPartner, isAdmin, signOut } = useAuth();
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    'Mon compte';

  const spaces = [
    ...(isPartner ? [SPACES_LINKS[0]] : []),
    ...(isAdmin ? [SPACES_LINKS[1]] : []),
  ];
  const groups: DashboardGroup[] = [
    ...DASHBOARD_GROUPS,
    ...(spaces.length > 0 ? [{ title: 'Espaces', links: spaces }] : []),
  ];

  return (
    <div className="flex h-full flex-col bg-night-950 text-zinc-300">
      {/* Marque */}
      <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
        <img
          src="/logo.jpeg"
          alt="Logo Giga Vibe Event"
          className="size-10 shrink-0 rounded-lg bg-white object-cover ring-1 ring-white/20"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-white">
            Giga Vibe Event
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">
            Mon compte
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Navigation du compte" className="flex-1 space-y-5 overflow-y-auto px-3">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {g.title}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {g.links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400',
                      isActive
                        ? 'bg-white/10 font-medium text-white'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold-400 transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                        )}
                      />
                      <l.icon
                        aria-hidden
                        className={cn('size-4 shrink-0', isActive ? 'text-gold-400' : 'text-zinc-500 group-hover:text-zinc-300')}
                      />
                      {l.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Compte */}
      <div className="space-y-2 border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white"
          >
            {initials(displayName, user?.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium leading-tight text-white">
              {displayName}
            </span>
            <span className="block text-xs text-zinc-500">
              {ROLE_LABEL[role ?? ''] ?? role ?? ''}
            </span>
          </span>
          <User aria-hidden className="size-4 shrink-0 text-gold-400" />
        </div>
        <div className="flex gap-2">
          <Link
            to="/"
            onClick={onNavigate}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            <ExternalLink aria-hidden className="size-3.5" /> Voir le site
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
