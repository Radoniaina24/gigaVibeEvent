import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../features/auth/AuthContext';
import { ToastProvider } from '../../components/ui/Toaster';
import { createQueryClient } from '../config/query';

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
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
