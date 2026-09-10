import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { AdminNotifier } from './AdminNotifier';
import { AppToast } from './AppToast';

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
  const title = routeTitles[location.pathname] || 'GeoClock';

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface font-body-md text-on-surface">
      <AdminNotifier />
      <AppToast />
      <Header title={title} />
      
      <main className="flex-1 flex flex-col relative w-full pt-20 pb-40 overflow-x-hidden">
        <Outlet />
      </main>
      
      <BottomNav />
    </div>
  );
}
