import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Don't show navigation on auth pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return <Outlet />;
  }

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <main className="ml-64 min-h-screen">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};