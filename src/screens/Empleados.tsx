import React, { useEffect, useState } from 'react';
import { db, secondaryApp } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { UserProfile, Branch } from '../types';
import { UserPlus, MoreVertical, MapPin, X, Loader2, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export function Empleados() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Schedule Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedEmpForSchedule, setSelectedEmpForSchedule] = useState<UserProfile | null>(null);
  const [scheduleStart, setScheduleStart] = useState('09:00');
  const [scheduleEnd, setScheduleEnd] = useState('18:00');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState('');

  const fetchData = async () => {
    if (!profile?.tenantId) return;
    
    // Fetch employees
    const q = query(
      collection(db, 'users'),
      where('tenantId', '==', profile.tenantId),
      where('role', '==', 'employee')
    );
    const snap = await getDocs(q);
    setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));

    // Fetch branches for the selector
    const bQ = query(collection(db, 'branches'), where('tenantId', '==', profile.tenantId));
    const bSnap = await getDocs(bQ);
    const loadedBranches = bSnap.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
    setBranches(loadedBranches);
    if (loadedBranches.length > 0) {
      setBranchId(loadedBranches[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenantId || !branchId) {
      alert(`Error interno: faltan datos. Tenant: ${profile?.tenantId}, Branch: ${branchId}`);
      return;
    }
    setCreating(true);

    try {
      // 1. Create auth user in secondary app to avoid logging out the admin
      const secAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secAuth, email.trim(), password);
      
      // 2. Save document to Firestore using main auth (Admin)
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(),
        email: email.trim(),
        role: 'employee',
        tenantId: profile.tenantId,
        branchId
      });

      // 3. Sign out of secondary app
      await signOut(secAuth);

      // Reset and close
      setShowModal(false);
      setName('');
      setEmail('');
      setPassword('');
      await fetchData();
      
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Empleado Registrado', body: `${name} añadido exitosamente.` } }));
    } catch (error: any) {
      console.error("Error creating employee:", error);
      let errorMsg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = "Este correo electrónico ya está registrado. Intenta con otro o añádele números.";
      } else if (error.code === 'auth/weak-password') {
        errorMsg = "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
      }
      alert("Error al registrar: " + errorMsg); // Fallback visible alert
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Error al Registrar', body: errorMsg } }));
    } finally {
      setCreating(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForSchedule) return;
    setSavingSchedule(true);
    try {
      await updateDoc(doc(db, 'users', selectedEmpForSchedule.id), {
        schedule: {
          start: scheduleStart,
          end: scheduleEnd
        }
      });
      setEmployees(prev => prev.map(emp => 
        emp.id === selectedEmpForSchedule.id 
          ? { ...emp, schedule: { start: scheduleStart, end: scheduleEnd } } 
          : emp
      ));
      setScheduleModalOpen(false);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Horario Actualizado', body: `Horario de ${selectedEmpForSchedule.name} guardado.` } }));
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Error', body: 'No se pudo guardar el horario.' } }));
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="flex flex-col w-full px-4 gap-4 pb-8">
      <div className="bg-primary text-white rounded-xl p-5 shadow-md relative overflow-hidden mt-4">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-secondary/30 pointer-events-none blur-xl"></div>
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse"></span>
              <span className="font-label-sm text-tertiary-fixed tracking-wide uppercase">Plantilla Activa</span>
            </div>
            <span className="font-headline-lg-mobile font-bold">{employees.length} Empleados</span>
            <span className="font-body-sm text-white/80">Sincronización en tiempo real</span>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="min-h-[48px] px-4 py-1 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary transition-all active:scale-95 flex items-center gap-1 shadow-md"
          >
            <UserPlus size={20} />
            <span className="font-label-lg font-bold">Nuevo</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <p className="text-center py-4 font-body-sm text-on-surface-variant">Cargando empleados...</p>
        ) : (
          employees.map(emp => (
            <div key={emp.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-on-tertiary-container border-2 border-surface-container-lowest"></span>
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline-sm font-bold text-on-surface truncate">{emp.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-container/10 text-on-tertiary-container font-label-sm font-bold flex items-center gap-1">
                        Activo
                      </span>
                    </div>
                    <span className="font-body-md text-on-surface-variant truncate">{emp.email}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedEmpForSchedule(emp);
                      setScheduleStart(emp.schedule?.start || '09:00');
                      setScheduleEnd(emp.schedule?.end || '18:00');
                      setScheduleModalOpen(true);
                    }}
                    className="p-2 -mr-1 rounded-full transition-colors flex items-center justify-center text-primary hover:bg-primary-container hover:text-on-primary-container"
                    title="Configurar Horario"
                  >
                    <Clock size={20} />
                  </button>
                  <button 
                    onClick={async () => {
                      if (deletingId === emp.id) {
                        try {
                          await deleteDoc(doc(db, 'users', emp.id));
                          setEmployees(prev => prev.filter(e => e.id !== emp.id));
                          setDeletingId(null);
                        } catch (error) {
                          console.error("Error al eliminar:", error);
                          setDeletingId(null);
                        }
                      } else {
                        setDeletingId(emp.id);
                        setTimeout(() => setDeletingId(null), 3000); // Reset after 3 seconds
                      }
                    }}
                    className={`p-2 -mr-2 rounded-full transition-colors flex items-center justify-center ${
                      deletingId === emp.id 
                      ? 'bg-error text-on-error hover:bg-error/90 animate-pulse' 
                      : 'text-error hover:bg-error-container hover:text-on-error-container'
                    }`}
                    title={deletingId === emp.id ? "Haz clic de nuevo para confirmar" : "Eliminar empleado"}
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-2 flex flex-wrap items-center justify-between gap-2 bg-surface-container-low rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Clock size={16} className="text-secondary" />
                  <span className="font-body-sm font-semibold text-on-surface">
                    {emp.schedule ? `${emp.schedule.start} - ${emp.schedule.end}` : 'Sin horario asignado'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-label-sm text-on-tertiary-container font-semibold">Biometría Enlazada</span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {employees.length === 0 && !loading && (
          <p className="text-center py-4 font-body-sm text-on-surface-variant">No hay empleados registrados</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="font-headline-sm font-bold text-on-surface">Registrar Nuevo Empleado</h2>
              <button onClick={() => setShowModal(false)} className="text-outline hover:text-on-surface p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Nombre Completo</label>
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Correo Electrónico (Acceso)</label>
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Contraseña Temporal</label>
                <input 
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Sede Asignada</label>
                <select 
                  required value={branchId} onChange={e => setBranchId(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" disabled={creating}
                className="w-full h-12 mt-2 bg-primary text-white font-label-lg font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-70"
              >
                {creating ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                {creating ? 'Guardando...' : 'Crear Perfil Biométrico'}
              </button>
            </form>
          </div>
        </div>
      )}

      {scheduleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="font-headline-sm font-bold text-on-surface">Asignar Horario</h2>
              <button onClick={() => setScheduleModalOpen(false)} className="text-outline hover:text-on-surface p-1">
                <X size={20} />
              </button>
            </div>
            <p className="font-body-sm text-on-surface-variant">Configura el horario de entrada y salida para <strong>{selectedEmpForSchedule?.name}</strong>.</p>
            <form onSubmit={handleSaveSchedule} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex flex-col gap-1 w-full">
                  <label className="font-label-sm text-on-surface-variant">Hora de Entrada</label>
                  <input 
                    type="time" required value={scheduleStart} onChange={e => setScheduleStart(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="font-label-sm text-on-surface-variant">Hora de Salida</label>
                  <input 
                    type="time" required value={scheduleEnd} onChange={e => setScheduleEnd(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>
              <button 
                type="submit" disabled={savingSchedule}
                className="w-full h-12 mt-2 bg-primary text-white font-label-lg font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-70"
              >
                {savingSchedule ? <Loader2 size={20} className="animate-spin" /> : <Clock size={20} />}
                {savingSchedule ? 'Guardando...' : 'Guardar Horario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
