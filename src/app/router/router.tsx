import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoadingState } from '../../components/ui/States';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { AdminRoute, PartnerRoute, ProtectedRoute, RequireVerifiedEmail } from '../../components/layout/Guards';
import { HomePage } from '../../pages/public/HomePage';
import { EventsPage } from '../../pages/public/EventsPage';
import { EventDetailPage } from '../../pages/public/EventDetailPage';
import { NotFoundPage } from '../../pages/public/NotFoundPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { RegisterPage } from '../../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../../pages/auth/VerifyEmailPage';
import { InvitationAcceptPage } from '../../pages/auth/InvitationAcceptPage';
import { UserDashboardPage } from '../../pages/dashboard/UserDashboardPage';
import { UserOrdersPage } from '../../pages/dashboard/UserOrdersPage';
import { OrderDetailPage } from '../../pages/dashboard/OrderDetailPage';
import { UserTicketsPage } from '../../pages/dashboard/UserTicketsPage';
import { ProfilePage } from '../../pages/dashboard/ProfilePage';
import { CheckoutPage } from '../../pages/public/CheckoutPage';
import { ContactPage } from '../../pages/public/ContactPage';
import { TicketVerifyPage } from '../../pages/public/TicketVerifyPage';
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage';
import { AdminEventsPage } from '../../pages/admin/AdminEventsPage';
import { AdminEventFormPage } from '../../pages/admin/AdminEventFormPage';
import { AdminCategoriesPage } from '../../pages/admin/AdminCategoriesPage';
import { AdminUsersPage } from '../../pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from '../../pages/admin/AdminUserDetailPage';
import { AdminOrdersPage } from '../../pages/admin/AdminOrdersPage';
import { AdminOrderDetailPage } from '../../pages/admin/AdminOrderDetailPage';
import { AdminPaymentsPage } from '../../pages/admin/AdminPaymentsPage';
import { AdminTicketsPage } from '../../pages/admin/AdminTicketsPage';
import { AdminSettingsPage } from '../../pages/admin/AdminSettingsPage';

/** Recharts est chargé uniquement sur /admin/statistics (chunk séparé). */
const AdminStatisticsPage = lazy(() =>
  import('../../pages/admin/AdminStatisticsPage').then((m) => ({ default: m.AdminStatisticsPage })),
);
import { AdminPartnersPage } from '../../pages/admin/AdminPartnersPage';
import { AdminValidationsPage } from '../../pages/admin/AdminValidationsPage';
import { PartnerLayout } from '../../components/layout/PartnerLayout';
import { PartnerDashboardPage } from '../../pages/partner/PartnerDashboardPage';
import { PartnerEventsPage } from '../../pages/partner/PartnerEventsPage';
import { PartnerEventFormPage } from '../../pages/partner/PartnerEventFormPage';
import { PartnerPaymentsPage } from '../../pages/partner/PartnerPaymentsPage';

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/events', element: <EventsPage /> },
      { path: '/events/:slug', element: <EventDetailPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/tickets/verify', element: <TicketVerifyPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/invitation/accept', element: <InvitationAcceptPage /> },
      { path: '*', element: <NotFoundPage /> },
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
            children: [{ path: '/checkout', element: <CheckoutPage /> }],
          },
        ],
      },
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <UserDashboardPage /> },
          { path: '/dashboard/orders', element: <UserOrdersPage /> },
          { path: '/dashboard/orders/:id', element: <OrderDetailPage /> },
          { path: '/dashboard/tickets', element: <UserTicketsPage /> },
          { path: '/dashboard/profile', element: <ProfilePage /> },
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
          { path: '/partner', element: <PartnerDashboardPage /> },
          { path: '/partner/events', element: <PartnerEventsPage /> },
          { path: '/partner/events/new', element: <PartnerEventFormPage /> },
          { path: '/partner/events/:id/edit', element: <PartnerEventFormPage /> },
          { path: '/partner/payments', element: <PartnerPaymentsPage /> },
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
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/events', element: <AdminEventsPage /> },
          { path: '/admin/events/new', element: <AdminEventFormPage /> },
          { path: '/admin/events/:id/edit', element: <AdminEventFormPage /> },
          { path: '/admin/categories', element: <AdminCategoriesPage /> },
          { path: '/admin/orders', element: <AdminOrdersPage /> },
          { path: '/admin/orders/:id', element: <AdminOrderDetailPage /> },
          { path: '/admin/payments', element: <AdminPaymentsPage /> },
          { path: '/admin/tickets', element: <AdminTicketsPage /> },
          { path: '/admin/users', element: <AdminUsersPage /> },
          { path: '/admin/users/:id', element: <AdminUserDetailPage /> },
          { path: '/admin/partners', element: <AdminPartnersPage /> },
          { path: '/admin/validations', element: <AdminValidationsPage /> },
          {
            path: '/admin/statistics',
            element: (
              <Suspense fallback={<LoadingState label="Chargement des statistiques…" />}>
                <AdminStatisticsPage />
              </Suspense>
            ),
          },
          { path: '/admin/settings', element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
