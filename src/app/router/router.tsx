import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { AdminRoute, ProtectedRoute } from '../../components/layout/Guards';
import { HomePage } from '../../pages/public/HomePage';
import { EventsPage } from '../../pages/public/EventsPage';
import { EventDetailPage } from '../../pages/public/EventDetailPage';
import { NotFoundPage } from '../../pages/public/NotFoundPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { RegisterPage } from '../../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../pages/auth/ResetPasswordPage';
import { UserDashboardPage } from '../../pages/dashboard/UserDashboardPage';
import { UserOrdersPage } from '../../pages/dashboard/UserOrdersPage';
import { OrderDetailPage } from '../../pages/dashboard/OrderDetailPage';
import { UserTicketsPage } from '../../pages/dashboard/UserTicketsPage';
import { ProfilePage } from '../../pages/dashboard/ProfilePage';
import { CheckoutPage } from '../../pages/public/CheckoutPage';
import { ContactPage } from '../../pages/public/ContactPage';
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
import { AdminStatisticsPage } from '../../pages/admin/AdminStatisticsPage';
import { AdminSettingsPage } from '../../pages/admin/AdminSettingsPage';

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/events', element: <EventsPage /> },
      { path: '/events/:slug', element: <EventDetailPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <PublicLayout />,
        children: [{ path: '/checkout', element: <CheckoutPage /> }],
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
          { path: '/admin/statistics', element: <AdminStatisticsPage /> },
          { path: '/admin/settings', element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
