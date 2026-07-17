import { useEffect, useState } from 'react';
import {
  DollarSign, RefreshCw, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, Lock, Car, Settings,
  AlertTriangle, ShieldOff, X,
} from 'lucide-react';
import { getResumenTesorero, cerrarPeriodo } from '../api/reportes';
import { pagarMovil, pagarAtrasos } from '../api/tesoreria';
import type { ResumenTesorero, DetalleMovilCuota } from '../types';

// ── Constantes de estilo ──────────────────────────────────────────────────────
const PAGO_BADGE: Record<string, string> = {
  PAGADO:   'bg-green-100 text-green-700',
  PENDIENTE:'bg-orange-100 text-orange-700',
  VENCIDO:  'bg-red-100 text-red-700',
  EXENTO:   'bg-gray-100 text-gray-500',
  SIN_CUOTA:'bg-gray-100 text-gray-400',
};
const PAGO_LABEL: Record<string, string> = {
  PAGADO:   'Pagado',
  PENDIENTE:'Pendiente',
  VENCIDO:  'Vencido',
  EXENTO:   'Exento',
  SIN_CUOTA:'Sin cuota',
};

// ── Helpers de período ────────────────────────────────────────────────────────
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

// ── Modal pagar atrasos ───────────────────────────────────────────────────────
function ModalAtrasos({
  item,
  onClose,
  onPagado,
}: {
  item: DetalleMovilCuota;
  onClose: () => void;
  onPagado: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const confirmar = async () => {
    setLoading(true);
    try {
      const r = await pagarAtrasos(item.id_socio);
      alert(`${r.message}\nTotal ingresado: $${r.total_pagado.toLocaleString('es-CL')}`);
      onPagado();
    } catch {
      alert('Error al procesar el pago. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ShieldOff className="w-6 h-6 text-orange-500" />
            <h3 className="font-bold text-gray-800 text-lg">Saldar atrasos</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1">
          <p className="font-semibold text-gray-800">{item.socio}</p>
          <p className="text-xs text-gray-500">Patente: <span className="font-mono font-bold">{item.patente}</span></p>
          <p className="text-sm text-orange-700 font-medium mt-2">
            {item.cuotas_vencidas} cuota{item.cuotas_vencidas !== 1 ? 's' : ''} vencida{item.cuotas_vencidas !== 1 ? 's' : ''}
          </p>
        </div>

        <p className="text-sm text-gray-600">
          Se registrará el ingreso de <strong>cada cuota vencida</strong> en tesorería
          y el socio quedará <strong className="text-green-700">ACTIVO</strong> automáticamente.
        </p>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={loading}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />}
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ReportesTesorero() {
  const [resumen, setResumen]           = useState<ResumenTesorero | null>(null);
  const [periodo, setPeriodo]           = useState(hoyPeriodo());
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [pagando, setPagando]           = useState<number | null>(null);
  const [cerrando, setCerrando]         = useState(false);
  const [confirmCierre, setConfirmCierre] = useState(false);
  const [tarifa, setTarifa]             = useState<string>('7000');
  const [editTarifa, setEditTarifa]     = useState(false);
  const [modalAtrasos, setModalAtrasos] = useState<DetalleMovilCuota | null>(null);

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
      alert('Error al registrar el pago.');
    } finally { setPagando(null); }
  };

  const ejecutarCierre = async () => {
    setCerrando(true);
    try {
      const r = await cerrarPeriodo();
      setConfirmCierre(false);
      alert(`Cierre ejecutado:\n• ${r.cuotas_vencidas} cuotas → VENCIDO\n• ${r.socios_bloqueados} socios bloqueados`);
      await load(periodo);
    } catch {
      alert('Error al ejecutar el cierre.');
    } finally { setCerrando(false); }
  };

  const esPeriodoActual = periodo === hoyPeriodo();
  const hayPendientes   = (resumen?.pendientes ?? 0) > 0;

  // Separar lista: bloqueados primero, luego por estado de pago
  const detalle = resumen?.detalle.slice().sort((a, b) => {
    if (a.estado_socio === 'BLOQUEADO' && b.estado_socio !== 'BLOQUEADO') return -1;
    if (a.estado_socio !== 'BLOQUEADO' && b.estado_socio === 'BLOQUEADO') return 1;
    return 0;
  }) ?? [];

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
          {esPeriodoActual && hayPendientes && (
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
      <div className="bg-white rounded-xl shadow-sm px-5 py-3.5 flex items-center gap-3">
        <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-600">Tarifa semanal por móvil:</span>
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
        <span className="text-xs text-gray-400 hidden sm:block">Haz clic para editar</span>
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
              <p className="text-xs text-gray-500 mb-1">Total móviles</p>
              <p className="text-2xl font-bold text-gray-800">{resumen.total_moviles}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Pagados</p>
              <p className="text-2xl font-bold text-green-600">{resumen.pagados}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Sin pagar</p>
              <p className="text-2xl font-bold text-orange-500">{resumen.pendientes}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Cobrado período</p>
              <p className="text-2xl font-bold text-gray-700">
                ${resumen.cobrado.toLocaleString('es-CL')}
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          {resumen.total_moviles > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avance de cobranza</span>
                <span className="text-sm font-bold text-gray-800">
                  {resumen.pagados} / {resumen.total_moviles} móviles
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

          {/* Tabla de todos los móviles */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Car className="w-4 h-4 text-gray-500" />
              <h2 className="font-bold text-gray-700 text-sm">
                Todos los móviles — <span className="capitalize">{periodoLabel(periodo)}</span>
              </h2>
              <span className="ml-auto text-xs text-gray-400">
                {resumen.pagados} / {resumen.total_moviles} pagados
              </span>
            </div>

            {detalle.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No hay móviles registrados.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Patente', 'Socio / Conductor', 'Atrasos', 'Cuota actual', 'Estado', 'Acción'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detalle.map(d => {
                    const bloqueado = d.estado_socio === 'BLOQUEADO';
                    const yaAtraso  = d.cuotas_vencidas > 0;

                    return (
                      <tr
                        key={d.id_movil}
                        className={`transition ${bloqueado ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-gray-800">{d.patente}</span>
                          {d.estado_movil === 'BLOQUEADO' && (
                            <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                              BLOQUEADO
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-700">{d.socio}</p>
                          <p className="text-xs text-gray-400">{d.rut}</p>
                        </td>
                        <td className="px-4 py-3">
                          {yaAtraso ? (
                            <span className="flex items-center gap-1 text-red-600 font-semibold text-xs">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {d.cuotas_vencidas} cuota{d.cuotas_vencidas !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PAGO_BADGE[d.estado_pago]}`}>
                            {PAGO_LABEL[d.estado_pago]}
                          </span>
                          {d.fecha_pago && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(d.fecha_pago).toLocaleDateString('es-CL')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {bloqueado ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                              <Lock className="w-3.5 h-3.5" /> BLOQUEADO
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            {/* Pagar cuota del período actual */}
                            {d.estado_pago !== 'PAGADO' && d.estado_pago !== 'EXENTO' && (
                              <button
                                onClick={() => marcarPagado(d)}
                                disabled={pagando === d.id_socio}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                              >
                                {pagando === d.id_socio
                                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                                  : <CheckCircle2 className="w-3 h-3" />}
                                Pagar período
                              </button>
                            )}
                            {/* Saldar atrasos (cuotas vencidas de períodos anteriores) */}
                            {yaAtraso && (
                              <button
                                onClick={() => setModalAtrasos(d)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition"
                              >
                                <ShieldOff className="w-3 h-3" />
                                Saldar atrasos
                              </button>
                            )}
                            {d.estado_pago === 'PAGADO' && !yaAtraso && (
                              <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                <CheckCircle2 className="w-4 h-4" /> Al día
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal: saldar atrasos */}
      {modalAtrasos && (
        <ModalAtrasos
          item={modalAtrasos}
          onClose={() => setModalAtrasos(null)}
          onPagado={() => { setModalAtrasos(null); load(periodo); }}
        />
      )}

      {/* Modal: cierre de período */}
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
            <div className="flex gap-3 pt-1">
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
