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

  const totalSocios = data.socios.activos + data.socios.bloqueados;
  const totalMoviles = data.moviles.disponibles + data.moviles.en_servicio;
  const totalCuotas = data.cuotas.pendientes + data.cuotas.vencidas;

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Socios activos"
            value={data.socios.activos}
            icon={<Users className="w-5 h-5 text-white" />}
            accent="text-emerald-600"
            iconBg="bg-emerald-500"
            percent={pct(data.socios.activos, totalSocios)}
            barColor="bg-emerald-500"
            sub={`${pct(data.socios.activos, totalSocios)}% del total`}
          />
          <StatCard
            title="Socios bloqueados"
            value={data.socios.bloqueados}
            icon={<Users className="w-5 h-5 text-white" />}
            accent="text-red-600"
            iconBg="bg-red-500"
            percent={pct(data.socios.bloqueados, totalSocios)}
            barColor="bg-red-500"
            sub={`${pct(data.socios.bloqueados, totalSocios)}% del total`}
          />
        </div>
      </section>

      {/* Móviles */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Móviles</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Disponibles"
            value={data.moviles.disponibles}
            icon={<Car className="w-5 h-5 text-white" />}
            accent="text-blue-600"
            iconBg="bg-blue-500"
            percent={pct(data.moviles.disponibles, totalMoviles)}
            barColor="bg-blue-500"
            sub={`${pct(data.moviles.disponibles, totalMoviles)}% del total`}
          />
          <StatCard
            title="En servicio"
            value={data.moviles.en_servicio}
            icon={<Car className="w-5 h-5 text-white" />}
            accent="text-brand-600"
            iconBg="bg-brand-500"
            percent={pct(data.moviles.en_servicio, totalMoviles)}
            barColor="bg-brand-500"
            sub={`${pct(data.moviles.en_servicio, totalMoviles)}% del total`}
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
            icon={<PhoneCall className="w-5 h-5 text-white" />}
            accent="text-violet-600"
            iconBg="bg-violet-500"
          />
          <StatCard
            title="Pendientes"
            value={data.solicitudes.pendientes}
            icon={<PhoneCall className="w-5 h-5 text-white" />}
            accent="text-orange-600"
            iconBg="bg-orange-500"
          />
          <StatCard
            title="En curso"
            value={data.solicitudes.en_curso}
            icon={<PhoneCall className="w-5 h-5 text-white" />}
            accent="text-blue-600"
            iconBg="bg-blue-500"
          />
          <StatCard
            title="Completadas hoy"
            value={data.solicitudes.completadas_hoy}
            icon={<PhoneCall className="w-5 h-5 text-white" />}
            accent="text-emerald-600"
            iconBg="bg-emerald-500"
          />
        </div>
      </section>

      {/* Cuotas */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Cuotas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pendientes de pago"
            value={data.cuotas.pendientes}
            icon={<AlertCircle className="w-5 h-5 text-white" />}
            accent="text-brand-600"
            iconBg="bg-brand-500"
            percent={pct(data.cuotas.pendientes, totalCuotas)}
            barColor="bg-brand-500"
            sub={`${pct(data.cuotas.pendientes, totalCuotas)}% del total`}
          />
          <StatCard
            title="Vencidas"
            value={data.cuotas.vencidas}
            icon={<AlertCircle className="w-5 h-5 text-white" />}
            accent="text-red-600"
            iconBg="bg-red-500"
            percent={pct(data.cuotas.vencidas, totalCuotas)}
            barColor="bg-red-500"
            sub={`${pct(data.cuotas.vencidas, totalCuotas)}% del total`}
          />
        </div>
      </section>
    </div>
  );
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
