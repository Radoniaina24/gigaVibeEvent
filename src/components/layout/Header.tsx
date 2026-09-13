import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Ticket, User, X } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { env } from '../../app/config/env';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
            : 'text-zinc-600 hover:bg-brand-50 hover:text-brand-700',
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-600/40">
            <Ticket className="size-5" aria-hidden />
          </span>
          {env.appName}
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-1 md:flex"
        >
          <NavItem to="/" label="Accueil" />
          <NavItem to="/events" label="Événements" />
          {user && <NavItem to="/dashboard" label="Dashboard" />}
          {isAdmin && <NavItem to="/admin" label="Admin" />}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link to="/dashboard/profile">
                <Button variant="ghost" size="sm">
                  <User className="size-4" aria-hidden /> Profil
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                <LogOut className="size-4" aria-hidden /> Déconnexion
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Connexion
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Créer un compte</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 hover:bg-zinc-100 md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Navigation mobile"
          className="space-y-1 border-t border-zinc-200 px-4 py-3 md:hidden"
        >
          {[
            { to: '/', label: 'Accueil' },
            { to: '/events', label: 'Événements' },
            ...(user ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
            ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
            ...(user
              ? [{ to: '/dashboard/profile', label: 'Profil' }]
              : [
                  { to: '/login', label: 'Connexion' },
                  { to: '/register', label: 'Créer un compte' },
                ]),
          ].map((l) => (
            <Link
              key={l.to + l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-100"
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Déconnexion
            </button>
          )}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-bold">{env.appName}</p>
          <p className="mt-2 text-sm text-zinc-500">
            Billetterie événementielle à Madagascar. Paiement Mobile Money
            sécurisé.
          </p>
        </div>
        <nav aria-label="Liens">
          <p className="text-sm font-semibold">Explorer</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600">
            <li>
              <Link className="hover:underline" to="/events">
                Événements
              </Link>
            </li>
            <li>
              <Link className="hover:underline" to="/login">
                Connexion
              </Link>
            </li>
            <li>
              <Link className="hover:underline" to="/register">
                Créer un compte
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold">Paiement</p>
          <p className="mt-2 text-sm text-zinc-500">
            MVola · Orange Money · Airtel Money (via Edge Functions sécurisées).
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-100 py-4 text-center text-xs text-zinc-400">
        © 2026 {env.appName} — Phase 1
      </div>
    </footer>
  );
}
