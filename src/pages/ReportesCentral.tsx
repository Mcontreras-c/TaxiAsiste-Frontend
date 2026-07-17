import { useEffect, useState } from 'react';
import { BarChart2, RefreshCw, AlertCircle, PhoneCall } from 'lucide-react';
import { getSolicitudesPorEstado } from '../api/reportes';
import { getSolicitudes } from '../api/solicitudes';
import type { SolicitudPorEstado, Solicitud } from '../types';

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

export default function ReportesCentralPage() {
  const [porEstado, setPorEstado]     = useState<SolicitudPorEstado[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [e, s] = await Promise.all([getSolicitudesPorEstado(), getSolicitudes()]);
      setPorEstado(e);
      setSolicitudes(s);
    } catch {
      setError('No se pudieron cargar los reportes.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const hoy = new Date().toDateString();
  const solicitudesHoy  = solicitudes.filter(s => new Date(s.fecha_hora).toDateString() === hoy);
  const sinContacto     = solicitudes.filter(s => s.observaciones === 'SIN_CONTACTO');
  const totalSolicitudes = porEstado.reduce((acc, e) => acc + e.total, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Cargando...
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 flex items-center gap-3">
      <AlertCircle className="w-5 h-5" /> {error}
      <button onClick={load} className="ml-auto text-sm underline">Reintentar</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
            <p className="text-sm text-gray-400">
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-800">{solicitudesHoy.length}</p>
          <p className="text-sm text-gray-500 mt-1">Solicitudes hoy</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-green-600">
            {solicitudesHoy.filter(s => s.estado === 'COMPLETADO').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Completadas hoy</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-orange-500">{sinContacto.length}</p>
          <p className="text-sm text-gray-500 mt-1">Sin contacto (total)</p>
        </div>
      </div>

      {/* Solicitudes por estado */}
      <section className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <PhoneCall className="w-5 h-5 text-gray-600" />
          <h2 className="text-base font-bold text-gray-700">Solicitudes por estado</h2>
          <span className="ml-auto text-sm text-gray-400">Total: <strong className="text-gray-700">{totalSolicitudes}</strong></span>
        </div>

        {totalSolicitudes > 0 && (
          <div className="flex h-4 rounded-full overflow-hidden mb-4 gap-0.5">
            {porEstado.filter(e => e.total > 0).map(e => (
              <div key={e.estado}
                className={`${ESTADO_COLOR[e.estado]} transition-all`}
                style={{ width: `${(e.total / totalSolicitudes) * 100}%` }}
                title={`${e.estado}: ${e.total}`}
              />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {porEstado.map(e => (
            <div key={e.estado} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${ESTADO_COLOR[e.estado]}`} />
              <span className="text-sm text-gray-600 w-28">{ESTADO_LABEL[e.estado]}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${ESTADO_COLOR[e.estado]}`}
                  style={{ width: totalSolicitudes > 0 ? `${(e.total / totalSolicitudes) * 100}%` : '0%' }} />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-8 text-right">{e.total}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Casos sin contacto */}
      {sinContacto.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-700 mb-4">Sin contacto registrados</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Folio', 'Origen → Destino', 'Fecha'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sinContacto.map(s => (
                <tr key={s.id_solicitud} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{s.folio}</td>
                  <td className="px-4 py-2 text-gray-700">{s.origen} → {s.destino}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">
                    {new Date(s.fecha_hora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
