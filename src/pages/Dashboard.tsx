import { useEffect, useState } from 'react';
import { Users, Car, PhoneCall, AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { getDashboard } from '../api/reportes';
import type { Dashboard } from '../types';
import { Alert, Button, LoadingState, PageHeader, StatCard } from '../components/ui';

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

  const fecha = data
    ? new Date(data.fecha).toLocaleDateString('es-CL', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : undefined;

  if (loading) return <LoadingState label="Cargando dashboard..." className="h-64" />;

  if (error || !data) {
    return <Alert message={error ?? 'Error desconocido'} onRetry={load} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={fecha}
        actions={
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        }
      />

      {/* Socios */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Socios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Socios activos"
            value={data.socios.activos}
            icon={<Users className="w-5 h-5 text-emerald-600" />}
            accent="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            title="Socios bloqueados"
            value={data.socios.bloqueados}
            icon={<Users className="w-5 h-5 text-red-500" />}
            accent="text-red-500"
            iconBg="bg-red-50"
          />
        </div>
      </section>

      {/* Móviles */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Móviles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Disponibles"
            value={data.moviles.disponibles}
            icon={<Car className="w-5 h-5 text-blue-600" />}
            accent="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="En servicio"
            value={data.moviles.en_servicio}
            icon={<Car className="w-5 h-5 text-brand-600" />}
            accent="text-brand-600"
            iconBg="bg-brand-50"
          />
        </div>
      </section>

      {/* Solicitudes */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Solicitudes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Hoy"
            value={data.solicitudes.hoy}
            icon={<PhoneCall className="w-5 h-5 text-violet-600" />}
            accent="text-violet-600"
            iconBg="bg-violet-50"
          />
          <StatCard
            title="Pendientes"
            value={data.solicitudes.pendientes}
            icon={<PhoneCall className="w-5 h-5 text-orange-500" />}
            accent="text-orange-500"
            iconBg="bg-orange-50"
          />
          <StatCard
            title="En curso"
            value={data.solicitudes.en_curso}
            icon={<PhoneCall className="w-5 h-5 text-blue-500" />}
            accent="text-blue-500"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="Completadas hoy"
            value={data.solicitudes.completadas_hoy}
            icon={<PhoneCall className="w-5 h-5 text-emerald-600" />}
            accent="text-emerald-600"
            iconBg="bg-emerald-50"
          />
        </div>
      </section>

      {/* Cuotas */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Cuotas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Pendientes de pago"
            value={data.cuotas.pendientes}
            icon={<AlertCircle className="w-5 h-5 text-brand-600" />}
            accent="text-brand-600"
            iconBg="bg-brand-50"
          />
          <StatCard
            title="Vencidas"
            value={data.cuotas.vencidas}
            icon={<AlertCircle className="w-5 h-5 text-red-500" />}
            accent="text-red-500"
            iconBg="bg-red-50"
          />
        </div>
      </section>
    </div>
  );
}
