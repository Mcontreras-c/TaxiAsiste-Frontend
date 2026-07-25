import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, PanelLeftClose, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { NAV_ITEMS, type Rol } from '../config/permisos';
import logo from '../assets/logo.jpg';

const ROL_LABEL: Record<Rol, string> = {
  Administrador: 'Administrador',
  Central:       'Central telefónica',
  Tesorero:      'Tesorero',
  Conductor:     'Conductor',
};

export default function Layout() {
  const [open, setOpen] = useState(true);
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const rol = usuario?.rol as Rol | undefined;
  const navFiltrado = NAV_ITEMS.filter(item => rol && item.roles.includes(rol));
  const currentPage = navFiltrado.find(item => item.to === location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = usuario?.username
    ? usuario.username.slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="flex h-screen bg-surface-muted overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-surface-sidebar text-white shadow-sidebar transition-all duration-300 ease-in-out ${
          open ? 'w-60' : 'w-[4.5rem]'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          {open ? (
            <img src={logo} alt="TaxiAsiste" className="h-9 object-contain flex-1 min-w-0" />
          ) : (
            <div className="w-9 h-9 mx-auto bg-brand-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold text-xs">TA</span>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition flex-shrink-0"
            title={open ? 'Contraer menú' : 'Expandir menú'}
          >
            {open ? <PanelLeftClose className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {open && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Menú
            </p>
          )}
          {navFiltrado.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={!open ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-400 text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {open && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-3">
          {open ? (
            <div className="flex items-center gap-3 px-1">
              <div className="w-9 h-9 rounded-full bg-brand-400/20 border border-brand-400/30 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-300 text-xs font-bold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white">{usuario?.username}</p>
                <p className="text-xs text-slate-500 truncate">
                  {rol ? ROL_LABEL[rol] : ''}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-surface-border px-6 py-3.5 flex items-center gap-2">
          <span className="text-sm text-slate-400">TaxiAsiste</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-sm font-medium text-slate-700">
            {currentPage?.label ?? 'Inicio'}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
