import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Punch, UserProfile } from '../types';
import { format } from 'date-fns';
import { Search, Radio, ScanLine, X, History, UserCheck, Timer, PauseCircle, Fingerprint, ShieldAlert, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export function EnVivo() {
  const { profile } = useAuth();
  const [punches, setPunches] = useState<(Punch & { user?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!profile?.tenantId) return;

    // Listen to all punches for the tenant and sort in memory to avoid composite index error
    const q = query(
      collection(db, 'punches'),
      where('tenantId', '==', profile.tenantId)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const punchData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Punch));
      
      // Sort in memory by timestamp descending
      punchData.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      
      // Limit to 50
      const recentPunches = punchData.slice(0, 50);

      // Enriched
      const enriched = recentPunches.map((p) => ({
        ...p,
        user: {
          id: p.employeeId,
          name: p.employeeName || `Empleado ${p.employeeId.slice(0, 4)}`, // Use real name if exists
          email: '',
          role: 'employee' as const,
          tenantId: p.tenantId,
          branchId: p.branchId
        }
      }));
      setPunches(enriched);
      setLoading(false);
    }, (error) => {
      console.error("Error en EnVivo snapshot:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [profile]);

  const getScheduleStatus = (punch: any) => {
    if (!punch.scheduleSnapshot || !punch.timestamp?.toDate) return null;
    const time = format(punch.timestamp.toDate(), 'HH:mm');
    if (punch.type === 'in' && time > punch.scheduleSnapshot.start) {
      return { isLate: true, text: `Retardo (horario ${punch.scheduleSnapshot.start})` };
    }
    if (punch.type === 'out' && time > punch.scheduleSnapshot.end) {
      return { isOvertime: true, text: `Extra (salida ${punch.scheduleSnapshot.end})` };
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full px-4 gap-4">
      {/* Monitor Header */}
      <div className="bg-surface-container rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center shrink-0 text-on-primary">
              <Radio size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-sm text-on-surface truncate">Monitor de Recepción</h2>
              <p className="font-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-ping"></span>
                Sincronizado vía Firestore
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-lowest px-3 py-1.5 rounded-full shadow-sm shrink-0">
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
            <span className="font-label-sm text-on-surface font-semibold">En tiempo real</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-lg p-3 mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-on-surface-variant flex items-center gap-1">
              <UserCheck size={16} className="text-primary" />
              Ocupación actual en sede
            </span>
            <span className="font-label-lg text-primary font-bold">78 / 95</span>
          </div>
          
          <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden flex">
            <div className="bg-secondary-container h-full rounded-full transition-all duration-500 ease-out" style={{ width: '82%' }}></div>
          </div>
          
          <div className="flex items-center justify-between pt-1">
            <span className="font-label-sm text-on-surface-variant">Capacidad: 82% cubierta</span>
            <div className="flex items-center gap-1 text-on-tertiary-container">
              <History size={14} />
              <span className="font-label-sm font-semibold">Último fichaje hace 45s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time feed */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanLine size={16} className="text-secondary" />
            <span className="font-label-md font-bold text-on-surface uppercase tracking-wide">Actividad Reciente</span>
          </div>
          <span className="font-label-sm text-on-surface-variant">{punches.length} accesos</span>
        </div>

        {punches.length === 0 && !loading && (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <p className="font-body-sm text-on-surface-variant">Sin registros recientes</p>
          </div>
        )}

        {punches.map((punch) => (
          <div key={punch.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold text-lg">
                    {punch.user?.name.charAt(0)}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white shadow-sm",
                    punch.distance > 50 ? "bg-error" : "bg-tertiary-container"
                  )}>
                    {punch.distance > 50 ? <ShieldAlert size={10} /> : <Fingerprint size={10} />}
                  </div>
                </div>
                
                <div className="flex flex-col min-w-0">
                  <h3 className="font-label-lg text-on-surface font-bold truncate">{punch.user?.name}</h3>
                  <p className="font-body-sm text-on-surface-variant truncate">
                    {punch.type === 'in' ? 'Entrada registrada' : 
                     punch.type === 'lunch_start' ? 'Inicio Almuerzo' : 
                     punch.type === 'lunch_end' ? 'Fin Almuerzo' : 'Salida registrada'}
                  </p>
                  
                  <div className="flex items-center gap-1 mt-1 text-on-tertiary-container">
                    <Fingerprint size={14} />
                    <span className="font-label-sm font-semibold">Validado (GPS ±{Math.round(punch.distance)}m)</span>
                  </div>

                  {getScheduleStatus(punch) && (
                    <div className={cn(
                      "flex items-center gap-1 mt-1 font-medium",
                      getScheduleStatus(punch)?.isLate ? "text-error" : "text-secondary"
                    )}>
                      <Clock size={14} />
                      <span className="font-label-sm">{getScheduleStatus(punch)?.text}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end shrink-0 gap-1">
                <div className="px-3 py-1 rounded-full flex items-center gap-1 shadow-sm bg-tertiary-container/15 text-tertiary-container">
                  <span className="font-label-sm font-bold truncate">En Sede</span>
                </div>
                <span className="font-label-sm text-on-surface font-medium">
                  {punch.timestamp?.toDate ? format(punch.timestamp.toDate(), 'hh:mm a') : '...'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
