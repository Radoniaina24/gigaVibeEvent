import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../features/auth/AuthContext';
import { ToastProvider } from '../../components/ui/Toaster';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { setDisplayCurrency } from '../../lib/currency';
import { createQueryClient } from '../config/query';

/** Devtools chargés uniquement en dev (exclus du bundle prod via lazy + DEV). */
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

/** Synchronise le suffixe monétaire affiché avec le réglage `currency`. */
function CurrencySeeder() {
  const { data } = usePlatformSettings();
  useEffect(() => {
    if (data?.currency) setDisplayCurrency(data.currency);
  }, [data?.currency]);
  return null;
}

/**
 * Providers racine : Query -> Auth.
 * Pas de BrowserRouter ici : le routage est fourni par le RouterProvider
 * (createBrowserRouter) dans AppRouter. Deux routeurs imbriqués = crash
 * "You cannot render a <Router> inside another <Router>".
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencySeeder />
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
