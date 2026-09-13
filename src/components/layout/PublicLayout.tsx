import { Outlet } from 'react-router-dom';
import { Footer, Header } from './Header';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-2 py-8 md:px-2">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
