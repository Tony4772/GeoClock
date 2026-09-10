import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'empleado' | 'admin'>('empleado');
  const [adminMode, setAdminMode] = useState<'login' | 'register'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loading) return; // Evitar que el useEffect interrumpa un registro en progreso

    if (user && !authLoading) {
      if (profile) {
        if (profile.role === 'admin') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      } else {
        // User logged in but has no profile document (likely interrupted registration)
        auth.signOut();
        setError('Tu perfil está incompleto o corrupto. Por favor, contacta a soporte o intenta registrarte de nuevo.');
      }
    }
  }, [user, profile, authLoading, navigate, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let uid = '';
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        uid = userCred.user.uid;
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          // Si ya existe en Auth (quizás por un registro a medias anterior), iniciamos sesión para obtener el UID y reescribir los documentos.
          const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
          uid = cred.user.uid;
        } else {
          throw err;
        }
      }
      
      const tenantId = `tenant-${uid.substring(0, 8)}`;
      const branchId = `branch-${uid.substring(0, 8)}`;
      
      await setDoc(doc(db, 'tenants', tenantId), { 
        name: companyName || 'Mi Empresa' 
      });
      
      await setDoc(doc(db, 'branches', branchId), {
        tenantId, 
        name: 'Sede Principal', 
        latitude: 19.4326, 
        longitude: -99.1332, 
        radius: 100 
      });
      
      await setDoc(doc(db, 'users', uid), {
        email: email, 
        name: 'Administrador Principal', 
        role: 'admin', 
        tenantId, 
        branchId
      });

      window.location.reload();
    } catch (err: any) {
      setError(err.code === 'auth/invalid-credential' ? 'Credenciales inválidas.' : err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-margin-mobile py-8">
      <div className="w-full max-w-md bg-surface-container-lowest p-space-lg md:p-space-xl rounded-xl shadow-xl flex flex-col gap-space-lg">
        
        <div className="flex flex-col items-center text-center gap-space-xs">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-md">
            <span className="material-symbols-outlined text-[32px]">schedule</span>
          </div>
          <h1 className="font-headline-lg text-primary font-bold mt-space-sm">GeoClock</h1>
          <p className="font-body-md text-on-surface-variant">Control de Asistencia Biométrico</p>
        </div>

        {/* Pestañas (Tabs) */}
        <div className="flex bg-surface-container rounded-lg p-1">
          <button 
            onClick={() => { setTab('empleado'); setError(''); }}
            className={`flex-1 py-2 font-label-md rounded-md transition-all ${tab === 'empleado' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-outline hover:text-on-surface'}`}
          >
            Empleado
          </button>
          <button 
            onClick={() => { setTab('admin'); setError(''); }}
            className={`flex-1 py-2 font-label-md rounded-md transition-all ${tab === 'admin' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-outline hover:text-on-surface'}`}
          >
            Administrador
          </button>
        </div>

        {error && (
          <div className="p-space-sm bg-error-container text-on-error-container rounded-lg font-body-sm font-semibold">
            {error}
          </div>
        )}

        {/* FORMULARIO EMPLEADO */}
        {tab === 'empleado' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-space-md animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-space-xxs">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Correo Asignado</label>
              <input 
                type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu.nombre@empresa.com" 
                className="w-full h-[52px] px-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all" 
              />
            </div>
            
            <div className="flex flex-col gap-space-xxs relative">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" 
                  className="w-full h-[52px] px-space-md pr-12 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-[56px] mt-space-sm bg-primary text-on-primary font-label-lg uppercase tracking-wider font-bold rounded-xl shadow-md hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-70">
              {loading ? 'Accediendo...' : 'Ingresar a mi cuenta'}
            </button>
            <p className="text-center font-body-sm text-outline mt-2">
              Si no tienes cuenta, pídele a tu administrador que te registre en el sistema.
            </p>
          </form>
        )}

        {/* FORMULARIO ADMINISTRADOR */}
        {tab === 'admin' && adminMode === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-space-md animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-space-xxs">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Correo de Administrador</label>
              <input 
                type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@miempresa.com" 
                className="w-full h-[52px] px-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all" 
              />
            </div>
            
            <div className="flex flex-col gap-space-xxs relative">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" 
                  className="w-full h-[52px] px-space-md pr-12 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-[56px] mt-space-sm bg-secondary text-on-secondary font-label-lg uppercase tracking-wider font-bold rounded-xl shadow-md hover:bg-secondary-container hover:text-on-secondary-container active:scale-[0.98] transition-all disabled:opacity-70">
              {loading ? 'Accediendo...' : 'Entrar al Panel de Control'}
            </button>

            <button type="button" onClick={() => setAdminMode('register')} className="mt-2 text-center text-secondary font-label-sm font-bold uppercase tracking-wider py-2">
              ¿No tienes cuenta? Registra tu empresa aquí
            </button>
          </form>
        )}

        {tab === 'admin' && adminMode === 'register' && (
          <form onSubmit={handleAdminRegister} className="flex flex-col gap-space-md animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-space-xxs">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Nombre de tu Empresa</label>
              <input 
                type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Ej: TechLogistics S.A." 
                className="w-full h-[52px] px-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all" 
              />
            </div>

            <div className="flex flex-col gap-space-xxs">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Correo para Administrar</label>
              <input 
                type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@miempresa.com" 
                className="w-full h-[52px] px-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all" 
              />
            </div>
            
            <div className="flex flex-col gap-space-xxs relative">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Contraseña Segura</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" minLength={6}
                  className="w-full h-[52px] px-space-md pr-12 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-[56px] mt-space-sm bg-tertiary-container text-on-tertiary-container font-label-lg uppercase tracking-wider font-bold rounded-xl shadow-md hover:bg-tertiary active:scale-[0.98] transition-all disabled:opacity-70">
              {loading ? 'Creando cuenta...' : 'Crear Cuenta Administrativa'}
            </button>

            <button type="button" onClick={() => setAdminMode('login')} className="mt-2 text-center text-outline font-label-sm font-bold uppercase tracking-wider py-2">
              Volver a Iniciar Sesión
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
