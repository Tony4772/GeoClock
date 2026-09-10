import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { AdminNotifier } from './AdminNotifier';
import { AppToast } from './AppToast';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const routeTitles: Record<string, string> = {
  '/': 'Fichaje',
  '/en-vivo': 'En Vivo',
  '/dashboard': 'Dashboard',
  '/empleados': 'Empleados',
  '/reportes': 'Reportes',
  '/sede': 'Configuración de Sede',
};

export function Layout() {
  const location = useLocation();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const title = routeTitles[location.pathname] || 'GeoClock';

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface font-body-md text-on-surface">
      <AdminNotifier />
      <AppToast />
      <Header title={title} />
      
      <main className={cn(
        "flex-1 flex flex-col relative w-full pt-20 overflow-x-hidden",
        isAdmin ? "pb-24" : "pb-6"
      )}>
        <Outlet />
      </main>
      
      <BottomNav />
    </div>
  );
}
