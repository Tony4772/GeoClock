import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function BottomNav() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) return null;

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
      <div className="h-16 px-space-xs flex justify-around items-center">
        
        <NavLink to="/" className={({ isActive }) => cn(
          "flex-1 min-h-[44px] flex flex-col items-center justify-center gap-space-xxs transition-colors",
          isActive ? "text-secondary" : "text-on-surface-variant hover:text-secondary"
        )}>
          <span className="material-symbols-outlined text-[24px]">fmd_good</span>
          <span className="font-label-sm text-label-sm">Fichaje</span>
        </NavLink>

        {isAdmin && (
          <>
            <NavLink to="/en-vivo" className={({ isActive }) => cn(
              "flex-1 min-h-[44px] flex flex-col items-center justify-center gap-space-xxs transition-colors",
              isActive ? "text-secondary" : "text-on-surface-variant hover:text-secondary"
            )}>
              <span className="material-symbols-outlined text-[24px]">radar</span>
              <span className="font-label-sm text-label-sm">En Vivo</span>
            </NavLink>

            <NavLink to="/dashboard" className={({ isActive }) => cn(
              "flex-1 min-h-[44px] flex flex-col items-center justify-center gap-space-xxs transition-colors",
              isActive ? "text-secondary" : "text-on-surface-variant hover:text-secondary"
            )}>
              <span className="material-symbols-outlined text-[24px]">analytics</span>
              <span className="font-label-sm text-label-sm">Dashboard</span>
            </NavLink>

            <NavLink to="/empleados" className={({ isActive }) => cn(
              "flex-1 min-h-[44px] flex flex-col items-center justify-center gap-space-xxs transition-colors",
              isActive ? "text-secondary" : "text-on-surface-variant hover:text-secondary"
            )}>
              <span className="material-symbols-outlined text-[24px]">badge</span>
              <span className="font-label-sm text-label-sm">Empleados</span>
            </NavLink>

            <NavLink to="/reportes" className={({ isActive }) => cn(
              "flex-1 min-h-[44px] flex flex-col items-center justify-center gap-space-xxs transition-colors",
              isActive ? "text-secondary" : "text-on-surface-variant hover:text-secondary"
            )}>
              <span className="material-symbols-outlined text-[24px]">summarize</span>
              <span className="font-label-sm text-label-sm">Reportes</span>
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
