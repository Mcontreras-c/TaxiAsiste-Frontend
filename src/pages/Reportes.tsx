import { useEffect, useState } from 'react';
import { BarChart2, RefreshCw, AlertCircle, Users, PhoneCall } from 'lucide-react';
import { getDashboard, getSolicitudesPorEstado } from '../api/reportes';
import type { Dashboard, SolicitudPorEstado } from '../types';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:  'bg-orange-400',
  ASIGNADO:   'bg-blue-400',
  EN_CURSO:   'bg-purple-400',
  COMPLETADO: 'bg-green-400',
  CANCELADO:  'bg-gray-400',
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

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Cargando reportes...
    </div>
  );

  if (error || !dashboard) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 flex items-center gap-3">
      <AlertCircle className="w-5 h-5" /> {error}
      <button onClick={load} className="ml-auto text-sm underline">Reintentar</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
            <p className="text-sm text-gray-400">
              {new Date(dashboard.fecha).toLocaleDateString('es-CL', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Resumen socios */}
      <section className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-base font-bold text-gray-700">Socios</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{dashboard.socios.activos}</p>
            <p className="text-sm text-green-700 mt-1">Activos</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{dashboard.socios.bloqueados}</p>
            <p className="text-sm text-red-600 mt-1">Bloqueados</p>
          </div>
        </div>
      </section>

      {/* Solicitudes por estado */}
      <section className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <PhoneCall className="w-5 h-5 text-gray-600" />
          <h2 className="text-base font-bold text-gray-700">Solicitudes por estado</h2>
          <span className="ml-auto text-sm text-gray-400">Total: <strong className="text-gray-700">{totalSolicitudes}</strong></span>
        </div>

        {/* Barra proporcional */}
        {totalSolicitudes > 0 && (
          <div className="flex h-4 rounded-full overflow-hidden mb-4 gap-0.5">
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

        {/* Tabla */}
        <div className="space-y-2">
          {porEstado.map(e => (
            <div key={e.estado} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${ESTADO_COLOR[e.estado]}`} />
              <span className="text-sm text-gray-600 w-28">{ESTADO_LABEL[e.estado]}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${ESTADO_COLOR[e.estado]}`}
                  style={{ width: totalSolicitudes > 0 ? `${(e.total / totalSolicitudes) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-8 text-right">{e.total}</span>
            </div>
          ))}
          {porEstado.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Sin solicitudes registradas.</p>
          )}
        </div>
      </section>

      {/* Cuotas */}
      <section className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-bold text-gray-700 mb-4">Cuotas</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{dashboard.cuotas.pendientes}</p>
            <p className="text-sm text-yellow-700 mt-1">Pendientes de pago</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{dashboard.cuotas.vencidas}</p>
            <p className="text-sm text-red-600 mt-1">Vencidas</p>
          </div>
        </div>
      </section>
    </div>
  );
}
