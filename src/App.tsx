import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/socios" element={<div className="text-gray-500 text-lg">Socios — próximamente</div>} />
          <Route path="/moviles" element={<div className="text-gray-500 text-lg">Móviles — próximamente</div>} />
          <Route path="/solicitudes" element={<div className="text-gray-500 text-lg">Solicitudes — próximamente</div>} />
          <Route path="/reportes" element={<div className="text-gray-500 text-lg">Reportes — próximamente</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
