import { ReactNode } from 'react';
import { Navigation } from './Navigation';

import { Outlet } from 'react-router-dom';

export const Layout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 pt-24 sm:pt-28">
        <Outlet />
      </main>
    </div>
  );
};
