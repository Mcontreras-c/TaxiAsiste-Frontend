import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { NAV_ITEMS, type Rol } from '../config/permisos';
import logo from '../assets/logo.jpg';

export default function Layout() {
  const [open, setOpen] = useState(true);
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();

  const rol = usuario?.rol as Rol | undefined;
  const navFiltrado = NAV_ITEMS.filter(item => rol && item.roles.includes(rol));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-gray-900 text-white transition-all duration-300 ${open ? 'w-56' : 'w-16'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-gray-700">
          {open && <img src={logo} alt="TaxiAsiste" className="h-8 object-contain" />}
          <button onClick={() => setOpen(!open)} className="p-1 rounded hover:bg-gray-700 transition ml-auto">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Nav filtrado por rol */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navFiltrado.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {open && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer usuario */}
        <div className="border-t border-gray-700 p-3">
          {open ? (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{usuario?.username}</p>
                <p className="text-xs text-gray-400 truncate">{usuario?.rol}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded hover:bg-gray-700 transition ml-2" title="Cerrar sesión">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center p-1.5 rounded hover:bg-gray-700 transition" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <ChevronRight className="w-4 h-4" />
          <span>TaxiAsiste</span>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
