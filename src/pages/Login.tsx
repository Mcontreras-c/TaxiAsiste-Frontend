import { useEffect } from 'react';
import { HOME_POR_ROL, type Rol } from '../config/permisos';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Shield } from 'lucide-react';
import logo from '../assets/logo.jpg';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui';

const schema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, usuario } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (isAuthenticated && usuario) {
      navigate(HOME_POR_ROL[usuario.rol as Rol] ?? '/solicitudes');
    }
  }, [isAuthenticated, usuario, navigate]);

  const onSubmit = async (data: FormData) => {
    await login(data.username, data.password);
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-sidebar relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-transparent to-brand-400/10" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <img src={logo} alt="TaxiAsiste" className="w-56 mb-8 drop-shadow-lg" />
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Gestión integral del sindicato
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Administra socios, móviles, solicitudes y tesorería desde un solo lugar.
          </p>
          <div className="flex items-center gap-2 mt-10 text-sm text-slate-500">
            <Shield className="w-4 h-4 text-brand-400" />
            <span>Acceso seguro por roles</span>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-surface-muted">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="TaxiAsiste" className="w-40 mb-2" />
            <p className="text-slate-500 text-sm">Sistema de gestión del sindicato</p>
          </div>

          <div className="card shadow-elevated p-8">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-slate-800">Iniciar sesión</h2>
              <p className="text-sm text-slate-400 mt-1">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Usuario
                </label>
                <input
                  {...register('username')}
                  type="text"
                  placeholder="admin"
                  className="input-field"
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="input-field"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                <LogIn className="w-4 h-4" />
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            INACAP 2026 · TaxiAsiste v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
