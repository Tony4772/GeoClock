import React, { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Timer, ShieldAlert, BarChart3, ChevronDown, CheckCircle2, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { Punch } from '../types';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    presentToday: 0,
    tardanzas: 0,
    ausentes: 0,
    outOfRange: 0
  });
  const [chartData, setChartData] = useState<{time: string, punches: number}[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!profile?.tenantId) return;

      const usersQ = query(collection(db, 'users'), where('tenantId', '==', profile.tenantId), where('role', '==', 'employee'));
      const usersSnap = await getDocs(usersQ);
      const employees = usersSnap.docs.map(d => ({id: d.id, ...d.data() as any}));
      const totalEmp = employees.length;

      const punchesQ = query(collection(db, 'punches'), where('tenantId', '==', profile.tenantId));
      const punchesSnap = await getDocs(punchesQ);
      const allPunches = punchesSnap.docs.map(d => d.data() as Punch);

      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const todayPunches = allPunches.filter(p => {
        if (!p.timestamp?.toDate) return false;
        const d = p.timestamp.toDate();
        return d >= todayStart && d <= todayEnd;
      });

      const { format } = await import('date-fns');
      const currentTime = format(new Date(), 'HH:mm');

      let presentes = 0;
      let ausentes = 0;
      let tardanzas = 0;

      employees.forEach(emp => {
        const empPunches = todayPunches.filter(p => p.employeeId === emp.id);
        const firstIn = empPunches.find(p => p.type === 'in');

        if (firstIn) {
          presentes++;
          const scheduleStart = firstIn.scheduleSnapshot?.start || emp.schedule?.start;
          if (scheduleStart) {
            const punchTime = format(firstIn.timestamp.toDate(), 'HH:mm');
            if (punchTime > scheduleStart) {
              tardanzas++;
            }
          }
        } else {
          const scheduleStart = emp.schedule?.start;
          if (scheduleStart) {
            if (currentTime > scheduleStart) {
              ausentes++;
            }
          } else {
            ausentes++;
          }
        }
      });
      
      setMetrics({
        totalEmployees: totalEmp,
        presentToday: presentes,
        tardanzas,
        ausentes
      });

      // Chart Data (Group by hour for today)
      const hourCounts: Record<string, number> = {
        '07:00': 0, '08:00': 0, '09:00': 0, '10:00': 0, '11:00': 0, '12:00': 0,
        '13:00': 0, '14:00': 0, '15:00': 0, '16:00': 0, '17:00': 0, '18:00': 0
      };

      todayPunches.forEach(p => {
        if(!p.timestamp?.toDate) return;
        const hour = p.timestamp.toDate().getHours();
        const key = `${hour.toString().padStart(2, '0')}:00`;
        if (hourCounts[key] !== undefined) {
          hourCounts[key]++;
        }
      });

      setChartData(Object.entries(hourCounts).map(([time, count]) => ({ time, punches: count })).filter(d => parseInt(d.time) >= 7 && parseInt(d.time) <= 18));
      setLoading(false);
    };
    
    fetchMetrics();
  }, [profile]);

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-body-md">Calculando métricas...</div>;

  return (
    <div className="flex flex-col w-full px-4 gap-4 pb-8">
      {/* Selector */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary">
              <Building2Icon />
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-outline uppercase tracking-wider">Tenant Corporativo</span>
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-on-surface font-bold">Organización Principal</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed">
              <CheckCircle2 size={14} />
              <span className="font-label-sm uppercase font-bold tracking-wider">Activo</span>
            </div>
            <button 
              onClick={() => navigate('/sede')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high text-primary hover:bg-primary-container transition-colors"
            >
              <Settings size={14} />
              <span className="font-label-sm font-bold">Conf. Sede</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-label-lg text-on-surface font-bold uppercase tracking-wider">Métricas en Vivo del Día</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between gap-3 border-l-4 border-error">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-lg bg-error-container flex items-center justify-center text-on-error-container">
              <Timer size={20} />
            </div>
            <span className="px-2 py-1 rounded-full bg-error-container/50 text-on-surface font-label-sm font-semibold">
              Hoy
            </span>
          </div>
          <div>
            <span className="font-display-lg text-4xl leading-none font-bold text-on-surface">{metrics.tardanzas}</span>
            <span className="block font-label-sm text-outline mt-1">llegadas tardes</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between gap-3 border-l-4 border-error">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-lg bg-error-container flex items-center justify-center text-on-error-container">
              <Users size={20} />
            </div>
            <span className="px-2 py-1 rounded-full bg-error-container/50 text-on-surface font-label-sm font-semibold">
              Hoy
            </span>
          </div>
          <div>
            <span className="font-display-lg text-4xl leading-none font-bold text-on-surface">{metrics.ausentes}</span>
            <span className="block font-label-sm text-outline mt-1">ausencias</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-headline-sm text-on-surface font-bold">Flujo Horario de Marcajes</span>
            <span className="font-body-sm text-outline">Distribución de actividad</span>
          </div>
        </div>
        
        <div className="w-full h-44 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPunches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0051d5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0051d5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#757682' }} />
              <Tooltip />
              <Area type="monotone" dataKey="punches" stroke="#0051d5" strokeWidth={3} fillOpacity={1} fill="url(#colorPunches)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Building2Icon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
      <path d="M9 22v-4h6v4"/>
      <path d="M8 6h.01"/>
      <path d="M16 6h.01"/>
      <path d="M12 6h.01"/>
      <path d="M12 10h.01"/>
      <path d="M12 14h.01"/>
      <path d="M16 10h.01"/>
      <path d="M16 14h.01"/>
      <path d="M8 10h.01"/>
      <path d="M8 14h.01"/>
    </svg>
  );
}
