import { useEffect, useState } from 'react';
import { BarChart2, Users, PhoneCall, RefreshCw, AlertCircle } from 'lucide-react';
import { getDashboard, getSolicitudesPorEstado } from '../api/reportes';
import type { Dashboard, SolicitudPorEstado } from '../types';
import { Alert, Button, LoadingState, PageHeader, StatCard } from '../components/ui';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:  'bg-orange-400',
  ASIGNADO:   'bg-blue-400',
  EN_CURSO:   'bg-violet-400',
  COMPLETADO: 'bg-emerald-400',
  CANCELADO:  'bg-slate-300',
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:  'Pendiente',
  ASIGNADO:   'Asignado',
  EN_CURSO:   'En curso',
  COMPLETADO: 'Completado',
  CANCELADO:  'Cancelado',
};

export default function ReportesPage() {
  const [dashboard, setDashboard]   = useState<Dashboard | null>(null);
  const [porEstado, setPorEstado]   = useState<SolicitudPorEstado[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, e] = await Promise.all([getDashboard(), getSolicitudesPorEstado()]);
      setDashboard(d);
      setPorEstado(e);
    } catch {
      setError('No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalSolicitudes = porEstado.reduce((acc, e) => acc + e.total, 0);

  if (loading) return <LoadingState label="Cargando reportes..." className="h-64" />;

  if (error || !dashboard) {
    return <Alert message={error ?? 'Error desconocido'} onRetry={load} />;
  }

  const fecha = new Date(dashboard.fecha).toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={BarChart2}
        title="Reportes"
        subtitle={fecha}
        actions={
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        }
      />

      {/* Resumen socios */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> Socios
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Activos"
            value={dashboard.socios.activos}
            icon={<Users className="w-5 h-5 text-emerald-600" />}
            accent="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            title="Bloqueados"
            value={dashboard.socios.bloqueados}
            icon={<Users className="w-5 h-5 text-red-500" />}
            accent="text-red-500"
            iconBg="bg-red-50"
          />
        </div>
      </section>

      {/* Solicitudes por estado */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <PhoneCall className="w-3.5 h-3.5" /> Solicitudes por estado
          </h2>
          <span className="ml-auto text-sm text-slate-400">
            Total: <strong className="text-slate-700">{totalSolicitudes}</strong>
          </span>
        </div>

        <div className="card p-5">
          {totalSolicitudes > 0 && (
            <div className="flex h-2.5 rounded-full overflow-hidden mb-5 gap-0.5 bg-slate-50">
              {porEstado.filter(e => e.total > 0).map(e => (
                <div
                  key={e.estado}
                  className={`${ESTADO_COLOR[e.estado]} transition-all`}
                  style={{ width: `${(e.total / totalSolicitudes) * 100}%` }}
                  title={`${e.estado}: ${e.total}`}
                />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {porEstado.map(e => (
              <div key={e.estado} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ESTADO_COLOR[e.estado]}`} />
                <span className="text-sm text-slate-600 w-24">{ESTADO_LABEL[e.estado]}</span>
                <div className="flex-1 bg-slate-50 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ESTADO_COLOR[e.estado]}`}
                    style={{ width: totalSolicitudes > 0 ? `${(e.total / totalSolicitudes) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-8 text-right">{e.total}</span>
              </div>
            ))}
            {porEstado.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Sin solicitudes registradas.</p>
            )}
          </div>
        </div>
      </section>

      {/* Cuotas */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Cuotas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Pendientes de pago"
            value={dashboard.cuotas.pendientes}
            icon={<AlertCircle className="w-5 h-5 text-brand-600" />}
            accent="text-brand-600"
            iconBg="bg-brand-50"
          />
          <StatCard
            title="Vencidas"
            value={dashboard.cuotas.vencidas}
            icon={<AlertCircle className="w-5 h-5 text-red-500" />}
            accent="text-red-500"
            iconBg="bg-red-50"
          />
        </div>
      </section>
    </div>
  );
}
