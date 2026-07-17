import { useEffect, useState } from 'react';
import { Users, Car, PhoneCall, AlertCircle, RefreshCw } from 'lucide-react';
import { getDashboard } from '../api/reportes';
import type { Dashboard } from '../types';

interface StatCardProps {
  title: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, sub, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboard());
    } catch {
      setError('No se pudo cargar el dashboard. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
        <button onClick={load} className="ml-auto text-sm underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date(data.fecha).toLocaleDateString('es-CL', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Socios */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Socios</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Socios activos"
            value={data.socios.activos}
            icon={<Users className="w-5 h-5 text-green-600" />}
            color="bg-green-100"
          />
          <StatCard
            title="Socios bloqueados"
            value={data.socios.bloqueados}
            icon={<Users className="w-5 h-5 text-red-500" />}
            color="bg-red-100"
          />
        </div>
      </section>

      {/* Móviles */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Móviles</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Disponibles"
            value={data.moviles.disponibles}
            icon={<Car className="w-5 h-5 text-blue-600" />}
            color="bg-blue-100"
          />
          <StatCard
            title="En servicio"
            value={data.moviles.en_servicio}
            icon={<Car className="w-5 h-5 text-yellow-600" />}
            color="bg-yellow-100"
          />
        </div>
      </section>

      {/* Solicitudes */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Solicitudes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Hoy"
            value={data.solicitudes.hoy}
            icon={<PhoneCall className="w-5 h-5 text-purple-600" />}
            color="bg-purple-100"
          />
          <StatCard
            title="Pendientes"
            value={data.solicitudes.pendientes}
            icon={<PhoneCall className="w-5 h-5 text-orange-500" />}
            color="bg-orange-100"
          />
          <StatCard
            title="En curso"
            value={data.solicitudes.en_curso}
            icon={<PhoneCall className="w-5 h-5 text-blue-500" />}
            color="bg-blue-100"
          />
          <StatCard
            title="Completadas hoy"
            value={data.solicitudes.completadas_hoy}
            icon={<PhoneCall className="w-5 h-5 text-green-600" />}
            color="bg-green-100"
          />
        </div>
      </section>

      {/* Cuotas */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cuotas</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Pendientes de pago"
            value={data.cuotas.pendientes}
            icon={<AlertCircle className="w-5 h-5 text-yellow-600" />}
            color="bg-yellow-100"
          />
          <StatCard
            title="Vencidas"
            value={data.cuotas.vencidas}
            icon={<AlertCircle className="w-5 h-5 text-red-500" />}
            color="bg-red-100"
          />
        </div>
      </section>
    </div>
  );
}
