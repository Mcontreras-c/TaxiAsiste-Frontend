import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { tieneAcceso, HOME_POR_ROL, type Rol } from './config/permisos';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Socios from './pages/Socios';
import SociosTesorero from './pages/SociosTesorero';
import Moviles from './pages/Moviles';
import Solicitudes from './pages/Solicitudes';
import SolicitudesCentral from './pages/SolicitudesCentral';
import Reportes from './pages/Reportes';
import ReportesCentral from './pages/ReportesCentral';
import ReportesTesorero from './pages/ReportesTesorero';
import MovilesCentral from './pages/MovilesCentral';
import Tesoreria from './pages/Tesoreria';
import Conductor from './pages/Conductor';

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
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard"   element={<RoleRoute ruta="/dashboard">  <Dashboard />   </RoleRoute>} />
          <Route path="/socios" element={
            <RoleRoute ruta="/socios">
              {usuario?.rol === 'Tesorero' ? <SociosTesorero /> : <Socios />}
            </RoleRoute>
          } />
          <Route path="/moviles"     element={
            <RoleRoute ruta="/moviles">
              {usuario?.rol === 'Central' ? <MovilesCentral /> : <Moviles />}
            </RoleRoute>
          } />
          <Route path="/solicitudes" element={
            <RoleRoute ruta="/solicitudes">
              {usuario?.rol === 'Central' ? <SolicitudesCentral /> : <Solicitudes />}
            </RoleRoute>
          } />
          <Route path="/reportes" element={
            <RoleRoute ruta="/reportes">
              {usuario?.rol === 'Central'
                ? <ReportesCentral />
                : usuario?.rol === 'Tesorero'
                  ? <ReportesTesorero />
                  : <Reportes />}
            </RoleRoute>
          } />
          <Route path="/tesoreria"   element={<RoleRoute ruta="/tesoreria">  <Tesoreria />   </RoleRoute>} />
          <Route path="/conductor"   element={<RoleRoute ruta="/conductor">  <Conductor />   </RoleRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
