import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { tieneAcceso, HOME_POR_ROL, type Rol } from './config/permisos';
import Layout from './components/Layout';
import { LoadingState } from './components/ui';

// Cada pagina en su propio chunk (import dinamico) — evita que TODO el panel
// (incluido Leaflet, cargado solo por SolicitudesCentral via MapaDespacho)
// termine en el bundle inicial de 1.28MB que Vite marcaba con el warning de
// "chunks are larger than 500 kB". Login no se separa: es la primera
// pantalla que ve cualquiera sin sesion, separarla solo agregaria un
// round-trip extra sin beneficio.
import Login from './pages/Login';
import OlvidePassword from './pages/OlvidePassword';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Socios = lazy(() => import('./pages/Socios'));
const Solicitudes = lazy(() => import('./pages/Solicitudes'));
const SolicitudesCentral = lazy(() => import('./pages/SolicitudesCentral'));
const ReportesCentral = lazy(() => import('./pages/ReportesCentral'));
const ReportesTesorero = lazy(() => import('./pages/ReportesTesorero'));
const Tesoreria = lazy(() => import('./pages/Tesoreria'));
const TesoreriaAdmin = lazy(() => import('./pages/TesoreriaAdmin'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Conductor = lazy(() => import('./pages/Conductor'));
const FilaVirtualConductor = lazy(() => import('./pages/FilaVirtualConductor'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleRoute({ ruta, children }: { ruta: string; children: React.ReactNode }) {
  const { usuario } = useAuthStore(); // eslint-disable-line
  const rol = usuario?.rol as Rol | undefined;

  if (!rol) return <Navigate to="/login" replace />;
  if (!tieneAcceso(rol, ruta)) {
    const home = HOME_POR_ROL[rol];
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

function HomeRedirect() {
  const { usuario } = useAuthStore();
  const rol = usuario?.rol as Rol | undefined;
  const home = rol ? HOME_POR_ROL[rol] : '/login';
  return <Navigate to={home} replace />;
}

function App() {
  const { usuario } = useAuthStore();
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState label="Cargando..." className="py-24" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/olvide-password" element={<OlvidePassword />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard"   element={<RoleRoute ruta="/dashboard">  <Dashboard />   </RoleRoute>} />
          <Route path="/socios" element={<RoleRoute ruta="/socios"><Socios /></RoleRoute>} />
          <Route path="/solicitudes" element={
            <RoleRoute ruta="/solicitudes">
              {usuario?.rol === 'Central' || usuario?.rol === 'Administrador'
                ? <SolicitudesCentral />
                : <Solicitudes />}
            </RoleRoute>
          } />
          <Route path="/reportes" element={
            <RoleRoute ruta="/reportes">
              {usuario?.rol === 'Central' ? <ReportesCentral /> : <ReportesTesorero />}
            </RoleRoute>
          } />
          <Route path="/tesoreria" element={
            <RoleRoute ruta="/tesoreria">
              {usuario?.rol === 'Administrador' ? <TesoreriaAdmin /> : <Tesoreria />}
            </RoleRoute>
          } />
          <Route path="/usuarios"    element={<RoleRoute ruta="/usuarios">   <Usuarios />    </RoleRoute>} />
          <Route path="/agenda"      element={<RoleRoute ruta="/agenda">     <Agenda />      </RoleRoute>} />
          <Route path="/conductor"   element={<RoleRoute ruta="/conductor">  <Conductor />   </RoleRoute>} />
          <Route path="/fila-virtual" element={<RoleRoute ruta="/fila-virtual"><FilaVirtualConductor /></RoleRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
