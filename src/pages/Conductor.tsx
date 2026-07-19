import { useEffect, useState } from 'react';
import { Car, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, PhoneCall } from 'lucide-react';
import { getPerfilConductor, type PerfilConductor } from '../api/conductor';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:  'bg-orange-100 text-orange-700',
  ASIGNADO:   'bg-blue-100 text-blue-700',
  EN_CURSO:   'bg-purple-100 text-purple-700',
  COMPLETADO: 'bg-green-100 text-green-700',
  CANCELADO:  'bg-gray-100 text-gray-500',
};

const CUOTA_COLOR: Record<string, string> = {
  PAGADO:    'bg-green-100 text-green-700',
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  VENCIDO:   'bg-red-100 text-red-600',
  EXENTO:    'bg-gray-100 text-gray-500',
};

const CUOTA_ICON: Record<string, React.ReactNode> = {
  PAGADO:    <CheckCircle className="w-4 h-4 text-green-600" />,
  PENDIENTE: <Clock className="w-4 h-4 text-yellow-600" />,
  VENCIDO:   <XCircle className="w-4 h-4 text-red-500" />,
  EXENTO:    <CheckCircle className="w-4 h-4 text-gray-400" />,
};

export default function ConductorPage() {
  const [perfil, setPerfil] = useState<PerfilConductor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      setPerfil(await getPerfilConductor());
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo cargar tu perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Cargando...
    </div>
  );

  if (error || !perfil) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 flex items-center gap-3">
      <AlertCircle className="w-5 h-5" /> {error}
    </div>
  );

  const { socio, movil, solicitudes_hoy, cuotas, fecha } = perfil;
  const moroso = cuotas.some(c => c.estado_pago === 'VENCIDO');
  const completadas = solicitudes_hoy.filter(s => s.estado === 'COMPLETADO').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hola, {socio.nombre} 👋
          </h1>
          <p className="text-sm text-gray-400">
            {new Date(fecha).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Alerta moroso */}
      {moroso && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Tienes cuotas vencidas</p>
            <p className="text-sm">Contáctate con el tesorero para regularizar tu situación.</p>
          </div>
        </div>
      )}

      {/* Tarjetas info */}
      <div className="grid grid-cols-2 gap-4">
        {/* Móvil */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Car className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="font-semibold text-gray-700">Mi móvil</h2>
          </div>
          {movil ? (
            <div className="space-y-1 text-sm">
              <p className="text-2xl font-bold text-gray-800 font-mono">{movil.patente}</p>
              <p className="text-gray-500">{[movil.marca, movil.modelo].filter(Boolean).join(' ')} {movil.anio ?? ''}</p>
              <p className="text-gray-400">{movil.color ?? ''}</p>
              <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mt-1 ${
                movil.estado_operativo === 'DISPONIBLE' ? 'bg-green-100 text-green-700' :
                movil.estado_operativo === 'EN_SERVICIO' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-600'
              }`}>
                {movil.estado_operativo.replace('_', ' ')}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No tienes un móvil asignado.</p>
          )}
        </div>

        {/* Resumen del día */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PhoneCall className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="font-semibold text-gray-700">Resumen de hoy</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total carreras</span>
              <span className="font-bold text-gray-800">{solicitudes_hoy.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Completadas</span>
              <span className="font-bold text-green-600">{completadas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">En curso</span>
              <span className="font-bold text-purple-600">
                {solicitudes_hoy.filter(s => s.estado === 'EN_CURSO').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Canceladas</span>
              <span className="font-bold text-gray-400">
                {solicitudes_hoy.filter(s => s.estado === 'CANCELADO').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Solicitudes del día */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Mis carreras de hoy</h2>
          <span className="text-xs text-gray-400">{solicitudes_hoy.length} carreras</span>
        </div>
        {solicitudes_hoy.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Sin carreras asignadas hoy.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Folio', 'Origen → Destino', 'Estado', 'Hora'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {solicitudes_hoy.map(s => (
                <tr key={s.id_solicitud} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.folio}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="truncate">{s.origen}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="truncate">{s.destino}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[s.estado]}`}>
                      {s.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(s.fecha_hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cuotas */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Mis cuotas</h2>
        </div>
        {cuotas.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Sin cuotas registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Período', 'Monto', 'Vencimiento', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cuotas.map(c => (
                <tr key={c.id_cuota} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{c.periodo}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">${Number(c.monto).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(c.fecha_vencimiento).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {CUOTA_ICON[c.estado_pago]}
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${CUOTA_COLOR[c.estado_pago]}`}>
                        {c.estado_pago}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
