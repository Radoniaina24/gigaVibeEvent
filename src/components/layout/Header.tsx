import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Search,
  ShieldCheck,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../ui/Button';
import { Logo } from '../brand/Logo';
import { cn } from '../../lib/utils';
import { env } from '../../app/config/env';

function NavItem({ to, label, end = false }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative rounded-md px-3 py-2 text-sm font-semibold transition',
          isActive ? 'text-brand-700' : 'text-zinc-600 hover:text-zinc-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          {label}
          <span
            aria-hidden
            className={cn(
              'absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-600 transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
        </>
      )}
    </NavLink>
  );
}

function initials(name: string, email: string | undefined): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email?.slice(0, 2) ?? '??').toUpperCase();
}

export function Header() {
  const { user, profile, isAdmin, isPartner, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    'Mon compte';

  // Ferme le drawer au changement de page + verrouille le scroll
  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

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

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const menuLinks = [
    { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/dashboard/orders', label: 'Mes commandes', icon: Receipt },
    { to: '/dashboard/tickets', label: 'Mes billets', icon: Ticket },
    { to: '/dashboard/profile', label: 'Mon profil', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40">
      {/* Barre d'annonce */}
      <div className="bg-night-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-1.5 text-[11px] font-medium sm:px-6">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-gold-400" aria-hidden />
            Billetterie officielle · Madagascar
          </p>
          <p className="hidden truncate text-zinc-300 sm:block">
            Paiement sécurisé : YAS · Orange Money · Airtel Money
          </p>
        </div>
      </div>

      {/* Barre principale */}
      <div className="border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link to="/" aria-label="Accueil Ticket">
            <Logo size={36} />
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
            <NavItem to="/" label="Accueil" end />
            <NavItem to="/events" label="Événements" />
            <NavItem to="/contact" label="Contact" />
            {user && <NavItem to="/dashboard" label="Dashboard" />}
            {isPartner && <NavItem to="/partner" label="Organisateur" />}
            {isAdmin && <NavItem to="/admin" label="Admin" />}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              to="/events"
              aria-label="Rechercher un événement"
              title="Rechercher"
              className="rounded-full p-2.5 text-zinc-600 transition hover:bg-brand-50 hover:text-brand-700"
            >
              <Search className="size-5" aria-hidden />
            </Link>

            {user ? (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-label={`Menu de ${displayName}`}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2.5 shadow-sm transition hover:border-brand-300 hover:shadow"
                >
                  <span
                    aria-hidden
                    className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white"
                  >
                    {initials(displayName, user.email)}
                  </span>
                  <span className="max-w-28 truncate text-sm font-semibold">
                    {profile?.first_name ?? user.email}
                  </span>
                  <ChevronDown
                    className={cn('size-4 text-zinc-400 transition-transform', menuOpen && 'rotate-180')}
                    aria-hidden
                  />
                </button>

                {menuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Fermer le menu"
                      className="fixed inset-0 z-40 cursor-default bg-transparent"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div
                      role="menu"
                      aria-label="Menu du compte"
                      className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setMenuOpen(false);
                      }}
                    >
                      <div className="border-b border-zinc-100 px-4 py-3">
                        <p className="truncate text-sm font-bold">{displayName}</p>
                        <p className="truncate text-xs text-zinc-500">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        {menuLinks.map((l) => (
                          <Link
                            key={l.to}
                            to={l.to}
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-brand-50 hover:text-brand-700"
                          >
                            <l.icon className="size-4" aria-hidden />
                            {l.label}
                          </Link>
                        ))}
                        {isAdmin && (
                          <Link
                            to="/admin"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                          >
                            <ShieldCheck className="size-4" aria-hidden />
                            Administration
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-zinc-100 p-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <LogOut className="size-4" aria-hidden />
                          Déconnexion
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Connexion
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Créer un compte</Button>
                </Link>
              </div>
            )}

            <button
              type="button"
              className="rounded-lg p-2.5 hover:bg-zinc-100 md:hidden"
              aria-expanded={drawerOpen}
              aria-label="Ouvrir le menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-night-950/60" onClick={() => setDrawerOpen(false)} />
          <div className="drawer-in absolute inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <Logo size={32} />
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-lg p-2 hover:bg-zinc-100"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <nav aria-label="Navigation mobile" className="flex-1 space-y-1 overflow-y-auto p-3">
              {[
                { to: '/', label: 'Accueil' },
                { to: '/events', label: 'Événements' },
                { to: '/contact', label: 'Contact' },
                ...(user ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
                ...(isPartner ? [{ to: '/partner', label: 'Espace organisateur' }] : []),
                ...(isAdmin ? [{ to: '/admin', label: 'Administration' }] : []),
                ...(user
                  ? [
                      { to: '/dashboard/orders', label: 'Mes commandes' },
                      { to: '/dashboard/tickets', label: 'Mes billets' },
                      { to: '/dashboard/profile', label: 'Mon profil' },
                    ]
                  : []),
              ].map((l) => (
                <NavLink
                  key={l.to + l.label}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-xl px-4 py-3 text-sm font-semibold transition',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-zinc-700 hover:bg-zinc-100',
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="space-y-2 border-t border-zinc-100 p-4">
              {user ? (
                <>
                  <p className="truncate px-1 text-xs text-zinc-500">{user.email}</p>
                  <Button variant="secondary" className="w-full" onClick={handleSignOut}>
                    <LogOut className="size-4" aria-hidden /> Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/register" className="block">
                    <Button className="w-full">Créer un compte</Button>
                  </Link>
                  <Link to="/login" className="block">
                    <Button variant="secondary" className="w-full">
                      Connexion
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <Logo size={32} />
          <p className="mt-2 text-sm text-zinc-500">
            Billetterie événementielle à Madagascar. Paiement Mobile Money
            sécurisé.
          </p>
        </div>
        <nav aria-label="Liens">
          <p className="text-sm font-semibold">Explorer</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600">
            <li>
              <Link className="transition hover:text-brand-700 hover:underline" to="/events">
                Événements
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-brand-700 hover:underline" to="/contact">
                Contact
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-brand-700 hover:underline" to="/login">
                Connexion
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-brand-700 hover:underline" to="/register">
                Créer un compte
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold">Paiement</p>
          <p className="mt-2 text-sm text-zinc-500">
            YAS · Orange Money · Airtel Money (via Edge Functions sécurisées).
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-100 py-4 text-center text-xs text-zinc-400">
        © 2026 {env.appName} — Concerts, festivals, sport et conférences à Madagascar.
      </div>
    </footer>
  );
}
