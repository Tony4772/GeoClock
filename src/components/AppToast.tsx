import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

export function AppToast() {
  const [toast, setToast] = useState<{title: string, body: string} | null>(null);

  useEffect(() => {
    const handleToast = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 5000);
    };
    window.addEventListener('app-toast', handleToast as EventListener);
    return () => window.removeEventListener('app-toast', handleToast as EventListener);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed top-24 left-4 right-4 z-[9999] bg-surface-container-highest text-on-surface p-4 rounded-xl shadow-lg border border-outline-variant flex items-start justify-between animate-in slide-in-from-top-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
          <Bell size={20} />
        </div>
        <div className="flex flex-col">
          <span className="font-label-md font-bold">{toast.title}</span>
          <span className="font-body-sm text-on-surface-variant">{toast.body}</span>
        </div>
      </div>
      <button onClick={() => setToast(null)} className="text-outline hover:text-on-surface">
        <X size={20} />
      </button>
    </div>
  );
}
