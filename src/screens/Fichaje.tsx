import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Branch, Punch, DaySchedule } from '../types';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getDistance } from 'geolib';
import { cn } from '../lib/utils';
import { CalendarDays } from 'lucide-react';

export function Fichaje() {
  const { profile } = useAuth();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [lastPunch, setLastPunch] = useState<Punch | null>(null);
  const [punching, setPunching] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile) return;
    const fetchBranchAndPunch = async () => {
      if (profile.branchId) {
        const bDoc = await getDoc(doc(db, 'branches', profile.branchId));
        if (bDoc.exists()) setBranch({ id: bDoc.id, ...bDoc.data() } as Branch);
      }
      try {
        // Fetch all punches for this employee and sort in memory to avoid composite index requirements
        const q = query(collection(db, 'punches'), where('employeeId', '==', profile.id));
        const snaps = await getDocs(q);
        if (!snaps.empty) {
          const punches = snaps.docs.map(d => ({ id: d.id, ...d.data() } as Punch));
          punches.sort((a, b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
          });
          setLastPunch(punches[0]);
        }
      } catch (err) {
        console.error("Error fetching last punch:", err);
      }
    };
    fetchBranchAndPunch();
  }, [profile]);

  useEffect(() => {
    if (!branch) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        setLocation({ lat: currentLat, lng: currentLng });
        setAccuracy(pos.coords.accuracy);
        setDistance(getDistance({ latitude: currentLat, longitude: currentLng }, { latitude: branch.latitude, longitude: branch.longitude }));
        setLoadingLoc(false);
      },
      (err) => { console.error(err); setLoadingLoc(false); },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [branch]);

  const handlePunch = async (type: 'in' | 'out' | 'lunch_start' | 'lunch_end') => {
    if (!profile || !branch || distance === null) return;
    if (accuracy !== null && accuracy > 100) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Señal GPS Débil', body: 'La precisión del GPS es muy baja. Acércate a una ventana.' } }));
      return;
    }
    setPunching(true);
    try {
      let todaysSchedule = null;
      if (profile.weeklySchedule) {
        const currentDayStr = new Date().getDay().toString();
        todaysSchedule = profile.weeklySchedule[currentDayStr];
        if (todaysSchedule && !todaysSchedule.isActive) {
          todaysSchedule = null;
        }
      } else if (profile.schedule) {
        todaysSchedule = profile.schedule; // Fallback to legacy
      }

      const newPunch = {
        employeeId: profile.id, employeeName: profile.name, tenantId: profile.tenantId, branchId: profile.branchId,
        type, timestamp: serverTimestamp(), latitude: location!.lat, longitude: location!.lng, distance, status: 'valid',
        scheduleSnapshot: todaysSchedule
      };
      const docRef = await addDoc(collection(db, 'punches'), newPunch);
      setLastPunch({ id: docRef.id, ...newPunch, timestamp: new Date() } as unknown as Punch);
      
      const typeLabels = {
        'in': 'entrada',
        'out': 'salida',
        'lunch_start': 'inicio de almuerzo',
        'lunch_end': 'fin de almuerzo'
      };
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Marcaje Exitoso', body: `Tu ${typeLabels[type]} se registró correctamente.` } }));
    } catch (error) {
      console.error(error);
    } finally {
      setPunching(false);
    }
  };

  const isWithinGeofence = distance !== null && branch && distance <= branch.radius;
  const lastType = lastPunch?.type;

  return (
    <div className="flex flex-col w-full px-margin-mobile gap-space-md mt-space-sm">
      
      {/* Reloj Oficial */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-md shadow-sm flex flex-col items-center justify-center text-center">
        <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-primary/5 pointer-events-none"></div>
        <div className="flex items-center gap-space-xs text-on-surface-variant mb-space-xxs">
          <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
          <span className="font-label-md text-label-md capitalize">{format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
        </div>
        <div className="font-mono-clock text-mono-clock text-primary tracking-tight font-bold my-space-xxs">
          {format(currentTime, 'hh:mm:ss')}
          <span className="font-headline-sm text-headline-sm ml-space-xs text-primary/80">{format(currentTime, 'a')}</span>
        </div>
        <div className="flex items-center gap-space-xs px-space-sm py-space-xxs rounded-full bg-surface-container-highest/60 text-primary">
          <span className="material-symbols-outlined text-[14px]">cloud_sync</span>
          <span className="font-label-sm text-label-sm">Hora oficial del Servidor Central</span>
        </div>
      </div>

      <div className="flex flex-col gap-space-sm">
        {accuracy !== null && accuracy > 100 && (
          <div className="p-space-sm bg-error-container text-on-error-container rounded-xl flex items-start gap-space-sm shadow-sm">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">warning</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold">Baja precisión GPS (±{Math.round(accuracy)}m)</span>
              <span className="font-body-sm text-body-sm">Acércate a una ventana o sal al exterior para mejorar la señal y habilitar el fichaje.</span>
            </div>
          </div>
        )}
        {accuracy !== null && accuracy <= 100 && !isWithinGeofence && (
          <div className="p-space-sm bg-error-container text-on-error-container rounded-xl flex items-start gap-space-sm shadow-sm">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">location_off</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold">Fuera de Sede</span>
              <span className="font-body-sm text-body-sm">Debes estar dentro del perímetro de la sede para poder registrar tu asistencia.</span>
            </div>
          </div>
        )}
        {(!lastType || lastType === 'out') && (
          <PunchButton type="in" title="Registrar Entrada" subtitle="Inicio de jornada" icon="login" onClick={() => handlePunch('in')} disabled={punching || (accuracy !== null && accuracy > 100) || !isWithinGeofence} accuracy={accuracy} />
        )}
        {lastType === 'in' && (
          <div className="flex flex-col gap-3">
            <PunchButton type="lunch_start" title="Iniciar Almuerzo" subtitle="Pausa de comida" icon="restaurant" onClick={() => handlePunch('lunch_start')} disabled={punching || (accuracy !== null && accuracy > 100) || !isWithinGeofence} accuracy={accuracy} variant="secondary" />
            <PunchButton type="out" title="Registrar Salida" subtitle="Fin de jornada" icon="logout" onClick={() => handlePunch('out')} disabled={punching || (accuracy !== null && accuracy > 100) || !isWithinGeofence} accuracy={accuracy} variant="primary" />
          </div>
        )}
        {lastType === 'lunch_start' && (
          <PunchButton type="lunch_end" title="Terminar Almuerzo" subtitle="Regreso de comida" icon="restaurant_menu" onClick={() => handlePunch('lunch_end')} disabled={punching || (accuracy !== null && accuracy > 100) || !isWithinGeofence} accuracy={accuracy} />
        )}
        {lastType === 'lunch_end' && (
          <PunchButton type="out" title="Registrar Salida" subtitle="Fin de jornada" icon="logout" onClick={() => handlePunch('out')} disabled={punching || (accuracy !== null && accuracy > 100) || !isWithinGeofence} accuracy={accuracy} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-space-sm mb-4">
        <div className="bg-surface-container rounded-xl p-space-sm flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-space-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">history</span>
            <span className="font-label-sm text-label-sm">Último Marcaje</span>
          </div>
          <div className="mt-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {lastPunch ? format(lastPunch.timestamp?.toDate ? lastPunch.timestamp.toDate() : new Date(), 'HH:mm') : 'Sin registro'}
            </span>
            <p className="font-body-sm text-body-sm text-outline">
              {lastPunch ? (
                lastPunch.type === 'in' ? 'Entrada' : 
                lastPunch.type === 'lunch_start' ? 'Inicio Almuerzo' :
                lastPunch.type === 'lunch_end' ? 'Fin Almuerzo' : 'Salida'
              ) : 'Jornada no iniciada'}
            </p>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-space-sm flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-space-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
            <span className="font-label-sm text-label-sm">Horario Hoy</span>
          </div>
          <div className="mt-space-xs">
            {(() => {
              const currentDayStr = new Date().getDay().toString();
              const todayData = profile?.weeklySchedule?.[currentDayStr];
              
              if (todayData && todayData.isActive) {
                return (
                  <>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      {todayData.start} - {todayData.end}
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Horario asignado</p>
                  </>
                );
              } else if (profile?.schedule) {
                // Fallback for old schema
                return (
                  <>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      {profile.schedule.start} - {profile.schedule.end}
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Horario asignado (L-V)</p>
                  </>
                );
              } else {
                return (
                  <>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold text-outline">Libre</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Sin turno hoy</p>
                  </>
                );
              }
            })()}
          </div>
        </div>
      </div>

      <div className="bg-surface-container rounded-xl p-space-sm shadow-xs flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-space-xs text-on-surface-variant mb-1">
          <CalendarDays size={16} className="text-secondary" />
          <span className="font-label-md font-bold">Próximos Turnos (7 días)</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map(offset => {
            const date = addDays(new Date(), offset);
            const dayStr = date.getDay().toString();
            const dayData = profile?.weeklySchedule?.[dayStr];
            
            // Si es perfil viejo, simular Lunes-Viernes
            let isWorking = false;
            let start = '';
            let end = '';
            
            if (dayData) {
              isWorking = dayData.isActive;
              start = dayData.start;
              end = dayData.end;
            } else if (profile?.schedule) {
              const d = date.getDay();
              if (d !== 0 && d !== 6) { // Not weekend
                isWorking = true;
                start = profile.schedule.start;
                end = profile.schedule.end;
              }
            }

            return (
              <div key={offset} className={cn(
                "flex items-center justify-between p-2 rounded-lg border",
                offset === 0 ? "bg-primary-container/30 border-primary/30" : "bg-surface-container-low border-transparent",
                !isWorking && "opacity-60"
              )}>
                <div className="flex flex-col">
                  <span className={cn("font-label-sm font-bold capitalize", offset === 0 ? "text-primary" : "text-on-surface")}>
                    {offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : format(date, 'EEEE', { locale: es })}
                  </span>
                  <span className="font-body-xs text-outline">{format(date, 'dd MMM', { locale: es })}</span>
                </div>
                {isWorking ? (
                  <span className="font-mono text-sm font-bold text-on-surface-variant">
                    {start} - {end}
                  </span>
                ) : (
                  <span className="font-label-sm text-outline italic">Descanso</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Visualizador de Geocerca GPS */}
      <div className="relative rounded-xl overflow-hidden bg-surface-container shadow-sm flex flex-col mb-4">
        <div className="p-space-sm flex items-center justify-between z-10 bg-surface-container-high/90 backdrop-blur-sm">
          <div className="flex items-center gap-space-xs min-w-0">
            <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">domain</span>
            <span className="font-label-md text-label-md font-bold text-on-surface truncate">{branch?.name || 'Sede'}</span>
          </div>
          <div className="flex items-center gap-space-xs bg-surface px-space-sm py-space-xxs rounded-full shadow-xs">
            <span className="material-symbols-outlined text-[14px] text-tertiary-container">satellite_alt</span>
            <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">
              Precisión: ±{accuracy ? Math.round(accuracy) : '-'}m
            </span>
          </div>
        </div>

        <div className="relative w-full h-56 bg-surface-container-highest overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-44 h-44 rounded-full bg-tertiary-fixed/20 animate-ping opacity-60"></div>
              <div className="w-40 h-40 rounded-full bg-tertiary-fixed/30 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-tertiary-fixed-dim/40 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-[16px] text-on-primary">apartment</span>
                  </div>
                </div>
              </div>
              
              {!loadingLoc && (
                <div className="absolute flex flex-col items-center transition-all duration-1000" style={{ transform: `translate(${isWithinGeofence ? '20px, -16px' : '60px, -40px'})` }}>
                  <div className="px-space-xs py-0.5 rounded-full bg-surface-container-lowest shadow-sm flex items-center gap-space-xxs mb-space-xxs">
                    <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isWithinGeofence ? "bg-secondary" : "bg-error")}></span>
                    <span className={cn("font-label-sm text-label-sm font-bold", isWithinGeofence ? "text-secondary" : "text-error")}>Tú</span>
                  </div>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-on-secondary shadow-md ring-2 ring-surface", isWithinGeofence ? "bg-secondary-container" : "bg-error")}>
                    <span className="material-symbols-outlined text-[14px]">person_pin_circle</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-space-sm inset-x-space-sm flex justify-center z-10">
            <div className="px-space-sm py-space-xs rounded-full bg-surface-container-lowest shadow-md flex items-center gap-space-xs max-w-full">
              {loadingLoc ? (
                <span className="font-label-sm text-label-sm font-bold text-on-surface">Calculando ubicación...</span>
              ) : isWithinGeofence ? (
                <>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-on-tertiary-container opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-on-tertiary-container"></span>
                  </span>
                  <span className="material-symbols-outlined text-on-tertiary-container text-[16px]">check_circle</span>
                  <span className="font-label-sm text-label-sm font-bold text-on-surface truncate">Dentro de geocerca ({Math.round(distance!)} m)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-error"></span>
                  <span className="font-label-sm text-label-sm font-bold text-error truncate">Fuera de geocerca ({Math.round(distance!)} m)</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-space-sm bg-surface-container-low flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 shrink-0">info</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
            Nota de prototipo: El bloqueo estricto por geovalla ha sido deshabilitado para que puedas probar el botón libremente desde cualquier ubicación.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-surface-container-lowest p-space-sm shadow-xs flex items-center justify-between mb-4">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[18px]">smartphone</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-label-md font-bold text-on-surface truncate">Dispositivo Validado</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-xxs">
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span>
              GPS Activo
            </span>
          </div>
        </div>
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0">verified</span>
      </div>
    </div>
  );
}

const PunchButton = ({ title, subtitle, icon, onClick, disabled, accuracy, variant = 'primary' }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "relative group w-full min-h-[56px] rounded-xl font-label-lg text-label-lg uppercase tracking-wider font-bold shadow-md transition-all flex items-center justify-between px-space-md py-space-sm overflow-hidden",
      (!accuracy || accuracy <= 100)
        ? variant === 'primary' 
            ? "bg-primary text-on-primary hover:shadow-lg active:scale-[0.99] disabled:opacity-70"
            : "bg-tertiary text-on-tertiary hover:shadow-lg active:scale-[0.99] disabled:opacity-70"
        : "bg-surface-container-high text-outline cursor-not-allowed opacity-75"
    )}
  >
    <div className="flex items-center gap-space-sm min-w-0 pr-2">
      <div className="w-9 h-9 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div className="flex flex-col text-left min-w-0">
        <span className="truncate">{title}</span>
        <span className="font-label-sm text-label-sm font-normal text-current/80 capitalize truncate">{subtitle}</span>
      </div>
    </div>
    {(!accuracy || accuracy <= 100) && (
      <div className="flex items-center gap-space-xxs bg-surface-container-lowest/20 px-space-sm py-space-xxs rounded-full shrink-0">
        <span className="material-symbols-outlined text-[16px]">verified_user</span>
        <span className="font-label-sm text-label-sm">Listo</span>
      </div>
    )}
  </button>
);
