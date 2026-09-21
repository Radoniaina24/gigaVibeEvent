import { Link, NavLink } from 'react-router-dom';
import {
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useMyPartner } from '../../features/partner/hooks';
import { PartnerStatusBadge } from '../admin/StatusBadges';
import { cn } from '../../lib/utils';

export interface PartnerLink {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

export interface PartnerGroup {
  title: string;
  links: PartnerLink[];
}

export const PARTNER_GROUPS: PartnerGroup[] = [
  {
    title: 'Pilotage',
    links: [{ to: '/partner', label: 'Aperçu', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Activité',
    links: [
      { to: '/partner/events', label: 'Mes événements', icon: CalendarDays },
      { to: '/partner/payments', label: 'Paiements reçus', icon: Wallet },
    ],
  },
];

const ALL_LINKS = PARTNER_GROUPS.flatMap((g) => g.links);

/** Libellé de la section courante (titre de la topbar). */
export function partnerSectionLabel(pathname: string): string {
  if (pathname.startsWith('/partner/events')) return 'Mes événements';
  if (pathname.startsWith('/partner/payments')) return 'Paiements reçus';
  const exact = ALL_LINKS.find((l) => l.end && pathname === l.to);
  if (exact) return exact.label;
  return 'Espace organisateur';
}

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

/**
 * Barre latérale sombre de l'espace organisateur (même style TailAdmin que
 * le backoffice admin) : marque GVE, identité du partenaire, navigation
 * groupée avec état actif doré, carte compte + déconnexion.
 * Réutilisée telle quelle dans le tiroir mobile.
 */
export function PartnerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth();
  const partner = useMyPartner();
  const partnerName =
    partner.data?.name ??
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ??
    'Mon espace';
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.email ||
    'Organisateur';

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
            Espace organisateur
          </p>
        </div>
      </div>

      {/* Identité du partenaire */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
          {partner.data?.logo_url ? (
            <img
              src={partner.data.logo_url}
              alt={`Logo ${partner.data.name}`}
              className="size-9 shrink-0 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-xs font-bold text-night-950"
            >
              {initials(partnerName, profile?.email ?? '??')}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium leading-tight text-white">
              {partnerName}
            </span>
            <span className="mt-0.5 block">
              {partner.data ? (
                <PartnerStatusBadge status={partner.data.status} />
              ) : (
                <span className="text-xs text-zinc-500">Chargement…</span>
              )}
            </span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Menu organisateur" className="flex-1 space-y-5 overflow-y-auto px-3">
        {PARTNER_GROUPS.map((g) => (
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
            className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white"
          >
            {initials(name, profile?.email ?? '??')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium leading-tight text-white">
              {name}
            </span>
            <span className="block text-xs text-zinc-500">Organisateur</span>
          </span>
          <ShieldCheck aria-hidden className="size-4 shrink-0 text-gold-400" />
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
