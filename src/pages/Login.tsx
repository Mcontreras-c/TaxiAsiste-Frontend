import { useEffect } from 'react';
import { HOME_POR_ROL, type Rol } from '../config/permisos';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Shield, Users, DollarSign } from 'lucide-react';
import logo from '../assets/logo.jpg';
import taxiHero from '../assets/taxiasiste.webp';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui';

const schema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type FormData = z.infer<typeof schema>;

const FEATURES = [
  { icon: Users,      text: 'Socios, móviles y solicitudes en un solo lugar' },
  { icon: DollarSign, text: 'Tesorería y cuotas al día, sin planillas' },
  { icon: Shield,     text: 'Acceso seguro, según el rol de cada usuario' },
];

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Foto de fondo */}
      <img
        src={taxiHero}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/50" />
      {/* Línea de "calle" en el borde inferior */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 opacity-60 z-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #fbbf24 0, #fbbf24 28px, transparent 28px, transparent 52px)',
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navbar */}
        <header className="px-6 lg:px-10 py-5 flex items-center justify-between flex-shrink-0">
          <img src={logo} alt="TaxiAsiste" className="h-9 object-contain rounded-md shadow-lg" />
          <span className="hidden sm:block text-sm text-slate-200/90">
            Sistema de gestión del sindicato
          </span>
        </header>

        {/* Hero */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-10 py-8 lg:py-12 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Tarjeta de login */}
          <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
            <div className="card shadow-elevated w-full max-w-md p-8">
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-800">Iniciar sesión</h1>
              </div>
              <div className="w-14 h-1.5 bg-brand-400 rounded-full mb-6" />
              <p className="text-sm text-slate-400 -mt-3 mb-6">
                Ingresa tus credenciales para continuar
              </p>

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

              <p className="text-center text-xs text-slate-400 mt-6">
                INACAP 2026 · TaxiAsiste v1.0
              </p>
            </div>
          </div>

          {/* Titular */}
          <div className="order-1 lg:order-2 text-white text-center lg:text-left">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5 drop-shadow-lg">
              Tu sindicato de taxis,{' '}
              <span className="text-brand-400">conectado</span>
            </h2>
            <div className="w-16 h-1 bg-white/30 rounded-full mx-auto lg:mx-0 mb-5" />
            <p className="text-slate-200 text-lg leading-relaxed max-w-md mx-auto lg:mx-0 mb-10 drop-shadow">
              Administra socios, móviles, solicitudes y tesorería desde un solo lugar,
              en tiempo real.
            </p>

            <ul className="space-y-4 max-w-md mx-auto lg:mx-0">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 justify-center lg:justify-start">
                  <span className="flex-shrink-0 p-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl">
                    <Icon className="w-4 h-4 text-brand-400" />
                  </span>
                  <span className="text-slate-100 text-sm drop-shadow">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
