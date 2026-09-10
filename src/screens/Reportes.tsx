import React, { useState } from 'react';
import { FileText, Download, Mail, CheckCircle2, Calendar as CalendarIcon, Filter, Building2, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Punch, UserProfile } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, startOfDay, endOfDay, isWeekend } from 'date-fns';

export function Reportes() {
  const { profile } = useAuth();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [tab, setTab] = useState('semana');

  const getDateRange = () => {
    const today = new Date();
    if (tab === 'semana') {
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    }
    if (tab === 'mes') {
      return { start: startOfMonth(today), end: endOfMonth(today) };
    }
    if (tab === 'quincena') {
      const start = startOfMonth(today);
      if (today.getDate() <= 15) {
        const end = new Date(today.getFullYear(), today.getMonth(), 15);
        return { start, end: endOfDay(end) };
      } else {
        const start16 = new Date(today.getFullYear(), today.getMonth(), 16);
        return { start: startOfDay(start16), end: endOfMonth(today) };
      }
    }
    // Default to current month for custom/others
    return { start: startOfMonth(today), end: endOfMonth(today) };
  };

  const getBusinessDays = (startDate: Date, endDate: Date) => {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    const limit = new Date(Math.min(endDate.getTime(), new Date().getTime()));
    while (curDate <= limit) {
      if (!isWeekend(curDate)) {
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  };

  const fetchConsolidatedData = async () => {
    if (!profile?.tenantId) return [];
    const { start, end } = getDateRange();
    const workingDays = getBusinessDays(start, end);

    // Fetch Employees
    const usersQ = query(collection(db, 'users'), where('tenantId', '==', profile.tenantId), where('role', '==', 'employee'));
    const usersSnap = await getDocs(usersQ);
    const employees = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));

    // Fetch Punches
    const punchesQ = query(collection(db, 'punches'), where('tenantId', '==', profile.tenantId));
    const punchesSnap = await getDocs(punchesQ);
    const punches = punchesSnap.docs.map(d => d.data() as Punch).filter(p => {
      if (!p.timestamp?.toDate) return false;
      const d = p.timestamp.toDate();
      return d >= start && d <= end;
    });

    return employees.map(emp => {
      const empPunches = punches.filter(p => p.employeeId === emp.id);
      
      const uniqueDaysPresent = new Set();
      let tardanzas = 0;
      let extras = 0;

      empPunches.forEach(p => {
        if (!p.timestamp?.toDate) return;
        const dateObj = p.timestamp.toDate();
        const dateStr = format(dateObj, 'yyyy-MM-dd');
        
        if (p.type === 'in') {
          uniqueDaysPresent.add(dateStr);
          const timeStr = format(dateObj, 'HH:mm');
          const scheduleStart = p.scheduleSnapshot?.start || emp.schedule?.start;
          if (scheduleStart && timeStr > scheduleStart) tardanzas++;
        }
        
        if (p.type === 'out') {
          const timeStr = format(dateObj, 'HH:mm');
          const scheduleEnd = p.scheduleSnapshot?.end || emp.schedule?.end;
          if (scheduleEnd && timeStr > scheduleEnd) extras++;
        }
      });

      const asistencias = uniqueDaysPresent.size;
      const ausencias = Math.max(0, workingDays - asistencias);

      return {
        name: emp.name || emp.email || emp.id.slice(0,8),
        asistencias,
        ausencias,
        tardanzas,
        extras
      };
    });
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const reportData = await fetchConsolidatedData();
      const doc = new jsPDF();
      
      const { start, end } = getDateRange();
      const periodStr = `${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`;
      
      // Header / Styling
      doc.setFillColor(0, 35, 111); // bg-primary
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('GeoClock Asistencia', 14, 20);
      doc.setFontSize(12);
      doc.text('Reporte Consolidado de Empleados', 14, 30);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Periodo: ${periodStr}`, 14, 50);
      doc.text(`Fecha de emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 56);
      doc.text(`Tenant ID: ${profile?.tenantId || 'N/A'}`, 14, 62);

      const tableData = reportData.map(r => [
        r.name,
        r.asistencias.toString(),
        r.ausencias.toString(),
        r.tardanzas.toString(),
        r.extras.toString()
      ]);

      autoTable(doc, {
        startY: 70,
        headStyles: { fillColor: [0, 81, 213] },
        head: [['Colaborador', 'Asistencias', 'Ausencias', 'Llegadas Tardes', 'Horas Extras']],
        body: tableData,
      });

      doc.save('GeoClock_Consolidado.pdf');
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Error', body: 'Error generando PDF.' } }));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCSV = async () => {
    setDownloadingCsv(true);
    try {
      const reportData = await fetchConsolidatedData();
      const { start, end } = getDateRange();
      const periodStr = `${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`;
      
      let csvContent = `Periodo: ${periodStr}\n`;
      csvContent += 'Colaborador,Asistencias,Ausencias,Llegadas Tardes,Horas Extras\n';
      
      reportData.forEach(r => {
        csvContent += `"${r.name}",${r.asistencias},${r.ausencias},${r.tardanzas},${r.extras}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'GeoClock_Consolidado.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Error', body: 'Error exportando CSV.' } }));
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleEmail = () => {
    window.location.href = 'mailto:rrhh@empresa.com?subject=Reporte%20Consolidado%20de%20Asistencia%20-%20GeoClock&body=Adjunto%20el%20reporte%20consolidado%20de%20marcajes%20y%20asistencias.';
  };

  return (
    <div className="flex flex-col w-full px-4 gap-4 pb-8">
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-secondary uppercase font-bold tracking-wider">Módulo de Nómina & Auditoría</span>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-tertiary-container/10">
            <CheckCircle2 size={14} className="text-on-tertiary-container" />
            <span className="font-label-sm text-on-tertiary-container font-semibold">Validez Legal</span>
          </div>
        </div>
        <h1 className="font-headline-lg-mobile font-bold text-on-surface">Centro de Reportes</h1>
        <p className="font-body-sm text-on-surface-variant">Generación automatizada de consolidados de nómina y productividad.</p>
      </div>

      <div className="flex flex-col bg-surface-container-low rounded-xl p-4 gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <CalendarIcon size={20} />
            <span className="font-label-lg font-bold text-on-surface">Periodo a Liquidar</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 bg-surface-container p-1 rounded-lg">
          <button onClick={() => setTab('semana')} className={`py-2 px-3 rounded-md font-label-md transition-all ${tab === 'semana' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-on-surface-variant font-semibold'}`}>
            Semana Actual
          </button>
          <button onClick={() => setTab('quincena')} className={`py-2 px-3 rounded-md font-label-md transition-all ${tab === 'quincena' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-on-surface-variant font-semibold'}`}>
            Quincena Actual
          </button>
          <button onClick={() => setTab('mes')} className={`py-2 px-3 rounded-md font-label-md transition-all ${tab === 'mes' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-on-surface-variant font-semibold'}`}>
            Mes Actual
          </button>
        </div>
        
        <div className="bg-surface-container-lowest rounded-lg p-3 mt-1 border border-outline-variant/50">
          <span className="font-label-sm text-on-surface-variant flex items-center gap-2">
            <Filter size={14} />
            {tab === 'semana' ? 'Se mostrarán los datos de la semana en curso (Lunes a Viernes).' :
             tab === 'quincena' ? 'Se mostrarán los datos de la primera o segunda quincena del mes actual.' :
             'Se mostrarán los datos desde el día 1 hasta fin de mes.'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        <button 
          onClick={handleDownloadPDF}
          disabled={downloadingPdf}
          className="w-full min-h-[56px] rounded-xl bg-primary text-white font-label-lg font-bold flex items-center justify-center gap-3 shadow-md hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-70"
        >
          <div className="w-6 h-6 rounded bg-error flex items-center justify-center text-white">
            <FileText size={16} />
          </div>
          <span>{downloadingPdf ? 'Generando PDF...' : 'Descargar Consolidado PDF'}</span>
        </button>
        
        <button 
          onClick={handleDownloadCSV}
          disabled={downloadingCsv}
          className="w-full min-h-[52px] rounded-xl bg-surface-container-lowest text-on-surface font-label-lg font-bold flex items-center justify-center gap-3 shadow-sm hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-70"
        >
          <div className="w-6 h-6 rounded bg-on-tertiary-container flex items-center justify-center text-white">
            <Download size={16} />
          </div>
          <span>{downloadingCsv ? 'Exportar a Excel / CSV' : 'Exportar Consolidado CSV'}</span>
        </button>
        
        <button 
          onClick={handleEmail}
          className="w-full min-h-[48px] rounded-xl bg-secondary/10 text-secondary font-label-md font-bold flex items-center justify-center gap-2 hover:bg-secondary/20 active:scale-[0.98] transition-all"
        >
          <Mail size={18} />
          <span>Enviar Consolidado a RRHH</span>
        </button>
      </div>
    </div>
  );
}
