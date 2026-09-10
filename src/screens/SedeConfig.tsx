import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Branch } from '../types';
import { MapPin, Navigation, Save, Loader2, Building2 } from 'lucide-react';

export function SedeConfig() {
  const { profile } = useAuth();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState(100);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const fetchBranch = async () => {
      if (!profile?.tenantId) return;
      try {
        const q = query(collection(db, 'branches'), where('tenantId', '==', profile.tenantId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const b = { id: snap.docs[0].id, ...snap.docs[0].data() } as Branch;
          setBranch(b);
          setName(b.name);
          setLatitude(b.latitude.toString());
          setLongitude(b.longitude.toString());
          setRadius(b.radius);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, [profile]);

  const handleGetLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        setGettingLocation(false);
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Ubicación obtenida', body: `Precisión: ±${Math.round(pos.coords.accuracy)}m` } }));
      },
      (err) => {
        console.error(err);
        setGettingLocation(false);
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Error', body: 'No se pudo obtener la ubicación. Revisa los permisos.' } }));
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'branches', branch.id), {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: Number(radius)
      });
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Guardado exitoso', body: 'La configuración de la sede ha sido actualizada.' } }));
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Error', body: 'No se pudo guardar la configuración.' } }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-body-md">Cargando configuración...</div>;
  if (!branch) return <div className="p-8 text-center text-on-surface-variant font-body-md">No se encontró una sede para configurar.</div>;

  return (
    <div className="flex flex-col w-full px-4 gap-4 pb-8">
      <div className="flex flex-col gap-1 mt-2">
        <h1 className="font-headline-lg-mobile font-bold text-on-surface">Configuración de Sede</h1>
        <p className="font-body-sm text-on-surface-variant">Establece la geocerca para delimitar el área de fichaje de los empleados.</p>
      </div>

      <div className="bg-surface-container-low p-5 rounded-2xl shadow-sm border border-outline-variant/30 mt-2">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md font-semibold text-on-surface flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              Nombre de la Sede
            </label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md"
              placeholder="Ej. Oficina Principal"
            />
          </div>

          <div className="flex flex-col gap-3 p-4 bg-primary-container/20 rounded-xl border border-primary/20">
            <div className="flex items-center justify-between">
              <label className="font-label-md font-semibold text-on-surface flex items-center gap-2">
                <MapPin size={18} className="text-primary" />
                Coordenadas Centrales
              </label>
            </div>
            
            <button 
              type="button" 
              onClick={handleGetLocation}
              disabled={gettingLocation}
              className="w-full py-2.5 bg-primary text-on-primary font-label-md font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-70"
            >
              {gettingLocation ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
              {gettingLocation ? 'Obteniendo GPS...' : 'Capturar coordenadas de este lugar'}
            </button>
            <span className="font-label-sm text-on-surface-variant text-center leading-tight mt-1">
              Esto solo lee el GPS una vez para no teclear los números a mano. Al guardar, las coordenadas quedan fijas en el servidor central en la nube.
            </span>
            
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-outline">Latitud</label>
                <input 
                  type="number" step="any" required 
                  value={latitude} 
                  onChange={e => setLatitude(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-outline">Longitud</label>
                <input 
                  type="number" step="any" required 
                  value={longitude} 
                  onChange={e => setLongitude(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-label-md font-semibold text-on-surface">Radio Permitido (metros)</label>
              <span className="font-label-md font-bold text-primary">{radius}m</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="500" 
              step="10"
              value={radius} 
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="font-label-sm text-outline">10m (Estricto)</span>
              <span className="font-label-sm text-outline">500m (Flexible)</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full h-14 mt-4 bg-primary text-on-primary font-label-lg font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.98] disabled:opacity-70 shadow-md"
          >
            {saving ? <Loader2 size={22} className="animate-spin" /> : <Save size={22} />}
            {saving ? 'Guardando...' : 'Guardar Geocerca'}
          </button>
        </form>
      </div>
    </div>
  );
}
