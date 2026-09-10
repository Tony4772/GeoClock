/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './screens/Login';
import { Fichaje } from './screens/Fichaje';
import { EnVivo } from './screens/EnVivo';
import { Dashboard } from './screens/Dashboard';
import { Empleados } from './screens/Empleados';
import { Reportes } from './screens/Reportes';
import { AppToast } from './components/AppToast';

import { SedeConfig } from './screens/SedeConfig';

function RequireAuth({ children, requireAdmin }: { children: JSX.Element, requireAdmin?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (requireAdmin && profile.role !== 'admin') return <Navigate to="/" replace />;
  
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppToast />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Fichaje />} />
            <Route path="en-vivo" element={<RequireAuth requireAdmin><EnVivo /></RequireAuth>} />
            <Route path="dashboard" element={<RequireAuth requireAdmin><Dashboard /></RequireAuth>} />
            <Route path="empleados" element={<RequireAuth requireAdmin><Empleados /></RequireAuth>} />
            <Route path="reportes" element={<RequireAuth requireAdmin><Reportes /></RequireAuth>} />
            <Route path="sede" element={<RequireAuth requireAdmin><SedeConfig /></RequireAuth>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

