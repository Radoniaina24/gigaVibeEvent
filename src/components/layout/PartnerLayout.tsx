import { Link, NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, Wallet } from 'lucide-react';
import { Footer, Header } from './Header';
import { useAuth } from '../../features/auth/AuthContext';
import { useMyPartner } from '../../features/partner/hooks';
import { cn } from '../../lib/utils';

const links = [
  { to: '/partner', label: 'Aperçu', icon: LayoutDashboard, end: true },
  { to: '/partner/events', label: 'Mes événements', icon: CalendarDays },
  { to: '/partner/payments', label: 'Paiements reçus', icon: Wallet },
];

/** Shell « Mon espace organisateur » (§3 du CDC v2). */
export function PartnerLayout() {
  const { profile } = useAuth();
  const partner = useMyPartner();
  const partnerName =
    partner.data?.name ??
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ??
    'Mon espace';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto grid w-full max-w-6xl min-w-0 flex-1 gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 md:py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside aria-label="Menu organisateur" className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 hidden items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex">
            {partner.data?.logo_url ? (
              <img
                src={partner.data.logo_url}
                alt={`Logo ${partner.data.name}`}
                className="size-10 shrink-0 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
              >
                {partnerName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{partnerName}</p>
              <p className="text-xs text-zinc-500">Espace organisateur</p>
            </div>
          </div>

          <nav
            aria-label="Navigation organisateur"
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
                      ? 'bg-zinc-900 font-medium text-white lg:bg-zinc-100 lg:text-zinc-900'
                      : 'border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 lg:border-0 lg:bg-transparent',
                  )
                }
              >
                <l.icon className="size-4 shrink-0" aria-hidden />
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 hidden rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm lg:block">
            <p className="font-medium">Billetterie officielle</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Vos événements sont vendus sous identité Giga Vibe Event.
            </p>
          </div>
        </aside>
        <main className="w-full min-w-0">
          <Outlet />
        </main>
      </div>
      <Footer />
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
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">{m.title}</p>
      <p className="mt-0.5 text-sm text-amber-800">{m.text}</p>
      <Link to="/contact" className="mt-2 inline-block text-sm font-semibold text-amber-900 hover:underline">
        Contacter Giga Vibe Event
      </Link>
    </div>
  );
}
