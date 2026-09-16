import { Link } from 'react-router-dom';
import { Bell, ExternalLink, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAdminPayments } from '../../features/admin/hooks';
import { useAuth } from '../../features/auth/AuthContext';

/**
 * Barre supérieure du backoffice : bouton menu (mobile), repli sidebar
 * (desktop), fil d'Ariane, cloche des paiements à vérifier (pastille),
 * accès site et compte.
 */
export function AdminTopbar({
  title,
  onMenu,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  title: string;
  onMenu: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { profile } = useAuth();
  const payments = useAdminPayments();
  const pendingCount = (payments.data ?? []).filter(
    (p) => p.status === 'pending' || p.status === 'processing',
  ).length;
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.email ||
    '';

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Ouvrir le menu administrateur"
          className="grid size-10 shrink-0 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 lg:hidden"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Afficher le menu' : 'Masquer le menu (pleine largeur)'}
          aria-label={sidebarCollapsed ? 'Afficher le menu' : 'Masquer le menu'}
          aria-expanded={!sidebarCollapsed}
          className="hidden size-10 shrink-0 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 lg:grid"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen aria-hidden className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden className="size-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Backoffice
          </p>
          <h1 className="truncate text-base font-bold leading-tight">{title}</h1>
        </div>

        <Link
          to="/admin/payments"
          title={
            pendingCount > 0
              ? `${pendingCount} paiement${pendingCount > 1 ? 's' : ''} à vérifier`
              : 'Paiements'
          }
          aria-label={
            pendingCount > 0
              ? `${pendingCount} paiements à vérifier`
              : 'Aller aux paiements'
          }
          className="relative grid size-10 shrink-0 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          <Bell aria-hidden className="size-4" />
          {pendingCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold tabular-nums leading-5 text-white">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </Link>

        <Link
          to="/"
          title="Voir le site"
          aria-label="Voir le site"
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          <ExternalLink aria-hidden className="size-4" />
        </Link>

        <span className="hidden min-w-0 items-center gap-2.5 rounded-lg border border-zinc-200 py-1.5 pl-1.5 pr-3 md:flex">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-[11px] font-bold text-white"
          >
            {name.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block max-w-40 truncate text-sm font-medium leading-tight">
              {name}
            </span>
            <span className="block text-[11px] leading-tight text-zinc-500">
              {profile?.role === 'admin' ? 'Administrateur' : (profile?.role ?? '')}
            </span>
          </span>
        </span>
      </div>
    </header>
  );
}
