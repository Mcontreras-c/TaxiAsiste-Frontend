import { useEffect, useState } from 'react';
import {
  DollarSign, RefreshCw, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, Lock, Car, Settings,
} from 'lucide-react';
import { getResumenTesorero, cerrarPeriodo } from '../api/reportes';
import { pagarMovil } from '../api/tesoreria';
import type { ResumenTesorero, DetalleMovilCuota } from '../types';

const ESTADO_BADGE: Record<string, string> = {
  PAGADO:   'bg-green-100 text-green-700',
  PENDIENTE:'bg-orange-100 text-orange-700',
  VENCIDO:  'bg-red-100 text-red-700',
  EXENTO:   'bg-gray-100 text-gray-500',
  SIN_CUOTA:'bg-gray-100 text-gray-500',
};

const ESTADO_LABEL: Record<string, string> = {
  PAGADO:   'Pagado',
  PENDIENTE:'Pendiente',
  VENCIDO:  'Vencido',
  EXENTO:   'Exento',
  SIN_CUOTA:'Sin cuota',
};

function hoyPeriodo() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodoLabel(p: string) {
  const [y, m] = p.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function prevMes(p: string) {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMes(p: string) {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportesTesorero() {
  const [resumen, setResumen]       = useState<ResumenTesorero | null>(null);
  const [periodo, setPeriodo]       = useState(hoyPeriodo());
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [pagando, setPagando]       = useState<number | null>(null);  // id_socio
  const [cerrando, setCerrando]     = useState(false);
  const [confirmCierre, setConfirmCierre] = useState(false);
  const [tarifa, setTarifa]         = useState<string>('7000');
  const [editTarifa, setEditTarifa] = useState(false);

  const load = async (p = periodo) => {
    setLoading(true); setError(null);
    try { setResumen(await getResumenTesorero(p)); }
    catch { setError('No se pudo cargar el resumen.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(periodo); }, [periodo]);

  const marcarPagado = async (item: DetalleMovilCuota) => {
    if (item.estado_pago === 'PAGADO') return;
    setPagando(item.id_socio);
    try {
      await pagarMovil(item.id_socio, Number(tarifa), periodo);
      await load(periodo);
    } catch {
      alert('Error al registrar el pago. Verifica que el servidor esté activo.');
    } finally { setPagando(null); }
  };

  const ejecutarCierre = async () => {
    setCerrando(true);
    try {
      const r = await cerrarPeriodo();
      setConfirmCierre(false);
      alert(`Cierre ejecutado:\n• ${r.cuotas_vencidas} cuotas marcadas como VENCIDO\n• ${r.socios_bloqueados} socios bloqueados`);
      await load(periodo);
    } catch {
      alert('Error al ejecutar el cierre.');
    } finally { setCerrando(false); }
  };

  const esPeriodoActual = periodo === hoyPeriodo();
  const pendientesSinCuota = resumen?.detalle.filter(
    d => d.estado_pago === 'PENDIENTE' || d.estado_pago === 'SIN_CUOTA'
  ).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reportes — Tesorería</h1>
            <p className="text-sm text-gray-400">Control de recaudación por período</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {esPeriodoActual && pendientesSinCuota > 0 && (
            <button
              onClick={() => setConfirmCierre(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Lock className="w-4 h-4" /> Cierre de período
            </button>
          )}
          <button onClick={() => load(periodo)} className="p-2 text-gray-500 hover:text-gray-700 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navegador de período */}
      <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm px-4 py-3">
        <button onClick={() => setPeriodo(prevMes(periodo))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="flex-1 text-center font-semibold text-gray-700 capitalize text-sm">
          {periodoLabel(periodo)}
        </span>
        <button onClick={() => setPeriodo(nextMes(periodo))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Tarifa configurable */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center gap-3">
        <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-600">Tarifa por móvil:</span>
        {editTarifa ? (
          <input
            type="number"
            value={tarifa}
            onChange={e => setTarifa(e.target.value)}
            onBlur={() => setEditTarifa(false)}
            autoFocus
            className="w-32 border border-yellow-400 rounded-lg px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        ) : (
          <button
            onClick={() => setEditTarifa(true)}
            className="px-3 py-1 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm font-semibold rounded-lg hover:bg-yellow-100 transition"
          >
            ${Number(tarifa).toLocaleString('es-CL')}
          </button>
        )}
        <span className="text-xs text-gray-400">Haz clic para editar</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
          <button onClick={() => load(periodo)} className="ml-auto underline">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : resumen && (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Móviles activos</p>
              <p className="text-2xl font-bold text-gray-800">{resumen.moviles_activos}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Pagados</p>
              <p className="text-2xl font-bold text-green-600">{resumen.pagados}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-orange-500">{resumen.pendientes}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Cobrado</p>
              <p className="text-2xl font-bold text-gray-700">
                ${resumen.cobrado.toLocaleString('es-CL')}
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          {resumen.moviles_activos > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avance de cobranza</span>
                <span className="text-sm font-bold text-gray-800">
                  {resumen.pagados} / {resumen.moviles_activos} móviles
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    resumen.porcentaje >= 80 ? 'bg-green-500'
                    : resumen.porcentaje >= 50 ? 'bg-yellow-400'
                    : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(resumen.porcentaje, 100)}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-400 mt-1">{resumen.porcentaje}%</p>
            </div>
          )}

          {/* Tabla de móviles */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Car className="w-4 h-4 text-gray-500" />
              <h2 className="font-bold text-gray-700 text-sm">
                Detalle por móvil — <span className="capitalize">{periodoLabel(periodo)}</span>
              </h2>
              <span className="ml-auto text-xs text-gray-400">
                {resumen.pagados} / {resumen.moviles_activos} pagados
              </span>
            </div>

            {resumen.detalle.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No hay móviles activos registrados.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Patente', 'Socio / Conductor', 'Tarifa', 'Estado', 'Fecha pago', 'Acción'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resumen.detalle.map(d => (
                    <tr
                      key={d.id_movil}
                      className={`hover:bg-gray-50 transition ${d.estado_pago === 'VENCIDO' ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-gray-800">{d.patente}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700">{d.socio}</p>
                        <p className="text-xs text-gray-400">{d.rut}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        ${(d.estado_pago === 'SIN_CUOTA' ? Number(tarifa) : d.monto).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_BADGE[d.estado_pago]}`}>
                          {ESTADO_LABEL[d.estado_pago]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {d.fecha_pago
                          ? new Date(d.fecha_pago).toLocaleDateString('es-CL')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {d.estado_pago === 'PAGADO' || d.estado_pago === 'EXENTO' ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            {d.estado_pago === 'PAGADO' ? 'Al día' : 'Exento'}
                          </span>
                        ) : (
                          <button
                            onClick={() => marcarPagado(d)}
                            disabled={pagando === d.id_socio}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                          >
                            {pagando === d.id_socio
                              ? <RefreshCw className="w-3 h-3 animate-spin" />
                              : <CheckCircle2 className="w-3 h-3" />
                            }
                            Marcar pagado
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal confirmar cierre */}
      {confirmCierre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-red-600" />
              <h3 className="font-bold text-gray-800 text-lg">Cierre de período</h3>
            </div>
            <p className="text-sm text-gray-600">
              Se marcarán como <strong>VENCIDO</strong> las cuotas pendientes con
              fecha de vencimiento pasada y se bloquearán los socios morosos.
              <br /><br />
              <strong>Esta acción no se puede deshacer.</strong>
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmCierre(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarCierre}
                disabled={cerrando}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                {cerrando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Ejecutar cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
