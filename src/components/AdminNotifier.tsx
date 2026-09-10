import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export function AdminNotifier() {
  const { profile } = useAuth();
  
  useEffect(() => {
    // Solicitar permiso para notificaciones OS-level si es posible
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (profile?.role !== 'admin' || !profile.tenantId) return;

    // Escuchar marcajes para el tenant. Se omite orderBy/limit para evitar requerimiento de índice compuesto.
    const q = query(
      collection(db, 'punches'),
      where('tenantId', '==', profile.tenantId)
    );

    let isFirstRun = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isFirstRun) {
        isFirstRun = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const punch = change.doc.data();
          
          // Prevenir que el admin se notifique a sí mismo si hace un marcaje de prueba
          if (punch.employeeId === profile.id) return;
          
          const actionName = punch.type === 'in' ? 'Entrada' : 'Salida';
          let timeString = 'Ahora';
          
          if (punch.timestamp?.toDate) {
            timeString = format(punch.timestamp.toDate(), 'HH:mm');
          }
          
          const empName = punch.employeeName || `Empleado (ID: ${punch.employeeId.slice(0, 4)})`;
          const title = `Nuevo Marcaje de ${actionName}`;
          const body = `${empName} ha registrado su ${actionName.toLowerCase()} a las ${timeString}.`;

          // 1. Intentar lanzar Notificación nativa del Navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/vite.svg', 
            });
          }

          // 2. Siempre lanzar el Toast In-App
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { title, body } }));
        }
      });
    });

    return () => unsubscribe();
  }, [profile]);

  return null;
}
