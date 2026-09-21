import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminStatisticsSkeleton } from '../../components/admin/AdminSkeletons';
import { LoadingState } from '../../components/ui/States';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { AdminRoute, PartnerRoute, ProtectedRoute, RequireVerifiedEmail } from '../../components/layout/Guards';
import { PartnerLayout } from '../../components/layout/PartnerLayout';

/**
 * Code-splitting par page : chaque route est un chunk séparé, chargé à la
 * demande. Les layouts/guards restent synchrones (coquille instantanée).
 */
const pageFallback = <LoadingState label="Chargement de la page…" />;
function paged(node: ReactNode): ReactNode {
  return <Suspense fallback={pageFallback}>{node}</Suspense>;
}

// Public
const HomePage = lazy(() => import('../../pages/public/HomePage').then((m) => ({ default: m.HomePage })));
const EventsPage = lazy(() => import('../../pages/public/EventsPage').then((m) => ({ default: m.EventsPage })));
const EventDetailPage = lazy(() => import('../../pages/public/EventDetailPage').then((m) => ({ default: m.EventDetailPage })));
const NotFoundPage = lazy(() => import('../../pages/public/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const CheckoutPage = lazy(() => import('../../pages/public/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const ContactPage = lazy(() => import('../../pages/public/ContactPage').then((m) => ({ default: m.ContactPage })));
const TicketVerifyPage = lazy(() => import('../../pages/public/TicketVerifyPage').then((m) => ({ default: m.TicketVerifyPage })));
// Auth
const LoginPage = lazy(() => import('../../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../../pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../../pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../../pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('../../pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const InvitationAcceptPage = lazy(() => import('../../pages/auth/InvitationAcceptPage').then((m) => ({ default: m.InvitationAcceptPage })));
// Dashboard client
const UserDashboardPage = lazy(() => import('../../pages/dashboard/UserDashboardPage').then((m) => ({ default: m.UserDashboardPage })));
const UserOrdersPage = lazy(() => import('../../pages/dashboard/UserOrdersPage').then((m) => ({ default: m.UserOrdersPage })));
const OrderDetailPage = lazy(() => import('../../pages/dashboard/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const UserTicketsPage = lazy(() => import('../../pages/dashboard/UserTicketsPage').then((m) => ({ default: m.UserTicketsPage })));
const ProfilePage = lazy(() => import('../../pages/dashboard/ProfilePage').then((m) => ({ default: m.ProfilePage })));
// Admin
const AdminDashboardPage = lazy(() => import('../../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminEventsPage = lazy(() => import('../../pages/admin/AdminEventsPage').then((m) => ({ default: m.AdminEventsPage })));
const AdminEventFormPage = lazy(() => import('../../pages/admin/AdminEventFormPage').then((m) => ({ default: m.AdminEventFormPage })));
const AdminCategoriesPage = lazy(() => import('../../pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })));
const AdminUsersPage = lazy(() => import('../../pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminUserDetailPage = lazy(() => import('../../pages/admin/AdminUserDetailPage').then((m) => ({ default: m.AdminUserDetailPage })));
const AdminOrdersPage = lazy(() => import('../../pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })));
const AdminOrderDetailPage = lazy(() => import('../../pages/admin/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage })));
const AdminPaymentsPage = lazy(() => import('../../pages/admin/AdminPaymentsPage').then((m) => ({ default: m.AdminPaymentsPage })));
const AdminTicketsPage = lazy(() => import('../../pages/admin/AdminTicketsPage').then((m) => ({ default: m.AdminTicketsPage })));
const AdminSettingsPage = lazy(() => import('../../pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));
const AdminPartnersPage = lazy(() => import('../../pages/admin/AdminPartnersPage').then((m) => ({ default: m.AdminPartnersPage })));
const AdminPartnerFormPage = lazy(() => import('../../pages/admin/AdminPartnerFormPage').then((m) => ({ default: m.AdminPartnerFormPage })));
const AdminValidationsPage = lazy(() => import('../../pages/admin/AdminValidationsPage').then((m) => ({ default: m.AdminValidationsPage })));
/** Recharts est chargé uniquement sur /admin/statistics (chunk séparé). */
const AdminStatisticsPage = lazy(() =>
  import('../../pages/admin/AdminStatisticsPage').then((m) => ({ default: m.AdminStatisticsPage })),
);
// Partenaire
const PartnerDashboardPage = lazy(() => import('../../pages/partner/PartnerDashboardPage').then((m) => ({ default: m.PartnerDashboardPage })));
const PartnerEventsPage = lazy(() => import('../../pages/partner/PartnerEventsPage').then((m) => ({ default: m.PartnerEventsPage })));
const PartnerEventFormPage = lazy(() => import('../../pages/partner/PartnerEventFormPage').then((m) => ({ default: m.PartnerEventFormPage })));
const PartnerPaymentsPage = lazy(() => import('../../pages/partner/PartnerPaymentsPage').then((m) => ({ default: m.PartnerPaymentsPage })));

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: paged(<HomePage />) },
      { path: '/events', element: paged(<EventsPage />) },
      { path: '/events/:slug', element: paged(<EventDetailPage />) },
      { path: '/contact', element: paged(<ContactPage />) },
      { path: '/tickets/verify', element: paged(<TicketVerifyPage />) },
      { path: '/login', element: paged(<LoginPage />) },
      { path: '/register', element: paged(<RegisterPage />) },
      { path: '/forgot-password', element: paged(<ForgotPasswordPage />) },
      { path: '/reset-password', element: paged(<ResetPasswordPage />) },
      { path: '/verify-email', element: paged(<VerifyEmailPage />) },
      { path: '/invitation/accept', element: paged(<InvitationAcceptPage />) },
      { path: '*', element: paged(<NotFoundPage />) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RequireVerifiedEmail />,
        children: [
          {
            element: <PublicLayout />,
            children: [{ path: '/checkout', element: paged(<CheckoutPage />) }],
          },
        ],
      },
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: paged(<UserDashboardPage />) },
          { path: '/dashboard/orders', element: paged(<UserOrdersPage />) },
          { path: '/dashboard/orders/:id', element: paged(<OrderDetailPage />) },
          { path: '/dashboard/tickets', element: paged(<UserTicketsPage />) },
          { path: '/dashboard/profile', element: paged(<ProfilePage />) },
        ],
      },
    ],
  },
  {
    element: <PartnerRoute />,
    children: [
      {
        element: <PartnerLayout />,
        children: [
          { path: '/partner', element: paged(<PartnerDashboardPage />) },
          { path: '/partner/events', element: paged(<PartnerEventsPage />) },
          { path: '/partner/events/new', element: paged(<PartnerEventFormPage />) },
          { path: '/partner/events/:id/edit', element: paged(<PartnerEventFormPage />) },
          { path: '/partner/payments', element: paged(<PartnerPaymentsPage />) },
        ],
      },
    ],
  },
  {
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: paged(<AdminDashboardPage />) },
          { path: '/admin/events', element: paged(<AdminEventsPage />) },
          { path: '/admin/events/new', element: paged(<AdminEventFormPage />) },
          { path: '/admin/events/:id/edit', element: paged(<AdminEventFormPage />) },
          { path: '/admin/categories', element: paged(<AdminCategoriesPage />) },
          { path: '/admin/orders', element: paged(<AdminOrdersPage />) },
          { path: '/admin/orders/:id', element: paged(<AdminOrderDetailPage />) },
          { path: '/admin/payments', element: paged(<AdminPaymentsPage />) },
          { path: '/admin/tickets', element: paged(<AdminTicketsPage />) },
          { path: '/admin/users', element: paged(<AdminUsersPage />) },
          { path: '/admin/users/:id', element: paged(<AdminUserDetailPage />) },
          { path: '/admin/partners', element: paged(<AdminPartnersPage />) },
          { path: '/admin/partners/new', element: paged(<AdminPartnerFormPage />) },
          { path: '/admin/partners/:id/edit', element: paged(<AdminPartnerFormPage />) },
          { path: '/admin/validations', element: paged(<AdminValidationsPage />) },
          {
            path: '/admin/statistics',
            element: (
              <Suspense fallback={<AdminStatisticsSkeleton />}>
                <AdminStatisticsPage />
              </Suspense>
            ),
          },
          { path: '/admin/settings', element: paged(<AdminSettingsPage />) },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
