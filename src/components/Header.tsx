import React from 'react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { profile, logout } = useAuth();
  const initial = profile?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 px-margin-mobile flex flex-col justify-center gap-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[32px] text-primary">schedule</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-primary leading-tight font-bold tracking-tight">GeoClock</span>
              <span className="font-headline-sm text-headline-sm text-on-surface leading-tight font-bold tracking-tight">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <button onClick={logout} className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-outline" title="Cerrar sesión">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
            <button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold font-label-lg">{initial}</div>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button className="min-h-[44px] px-space-sm py-space-xxs rounded-full bg-surface-container flex items-center gap-space-xs text-on-surface hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[16px] text-primary">apartment</span>
            <span className="font-label-sm text-label-sm font-semibold truncate max-w-[140px]">Corporativo Central</span>
            <span className="material-symbols-outlined text-[14px] text-outline">expand_more</span>
          </button>
          <div className="flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-tertiary-container/10">
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-on-tertiary-container font-semibold">Firestore Sync • En línea</span>
          </div>
        </div>
      </div>
    </header>
  );
}
