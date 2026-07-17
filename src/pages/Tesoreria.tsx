import { useEffect, useState } from 'react';
import { DollarSign, Plus, RefreshCw, AlertCircle, X, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import {
  getMovimientos, getBalance, createMovimiento, registrarPagoCuota, getCuotas,
  type TesoreriaMovimiento, type Balance,
} from '../api/tesoreria';
import type { Cuota } from '../types';

const TIPO_COLOR = {
  INGRESO: 'bg-green-100 text-green-700',
  EGRESO:  'bg-red-100 text-red-600',
};

const CATEGORIA_LABEL: Record<string, string> = {
  CUOTA:              'Cuota',
  MULTA:              'Multa',
  GASTO_OPERACIONAL:  'Gasto Operacional',
  OTRO:               'Otro',
};

type ModalTipo = 'pago_cuota' | 'movimiento' | null;

interface MovForm {
  tipo: 'INGRESO' | 'EGRESO';
  categoria: string;
  descripcion: string;
  monto: string;
}

const MOV_EMPTY: MovForm = { tipo: 'INGRESO', categoria: 'OTRO', descripcion: '', monto: '' };

export default function TesoreriaPage() {
  const [movimientos, setMovimientos] = useState<TesoreriaMovimiento[]>([]);
  const [balance, setBalance]         = useState<Balance | null>(null);
  const [cuotas, setCuotas]           = useState<Cuota[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [modal, setModal]             = useState<ModalTipo>(null);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // Pago cuota
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState('');
  const [observacion, setObservacion]             = useState('');

  // Movimiento manual
  const [movForm, setMovForm] = useState<MovForm>(MOV_EMPTY);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, b, c] = await Promise.all([getMovimientos(), getBalance(), getCuotas()]);
      setMovimientos(m);
      setBalance(b);
      setCuotas(c.filter(c => c.estado_pago !== 'PAGADO' && c.estado_pago !== 'EXENTO'));
    } catch {
      setError('No se pudo cargar la tesorería.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePagoCuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuotaSeleccionada) { setFormError('Selecciona una cuota.'); return; }
    setSaving(true); setFormError(null);
    try {
      await registrarPagoCuota(Number(cuotaSeleccionada), observacion || undefined);
      setModal(null); setCuotaSeleccionada(''); setObservacion('');
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? 'Error al registrar el pago.');
    } finally { setSaving(false); }
  };

  const handleMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movForm.descripcion || !movForm.monto) { setFormError('Descripción y monto son obligatorios.'); return; }
    setSaving(true); setFormError(null);
    try {
      await createMovimiento({
        tipo: movForm.tipo,
        categoria: movForm.categoria as any,
        descripcion: movForm.descripcion,
        monto: Number(movForm.monto),
        fecha: new Date().toISOString().split('T')[0],
      });
      setModal(null); setMovForm(MOV_EMPTY);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? 'Error al registrar el movimiento.');
    } finally { setSaving(false); }
  };

  const openModal = (tipo: ModalTipo) => {
    setModal(tipo); setFormError(null);
    setCuotaSeleccionada(''); setObservacion(''); setMovForm(MOV_EMPTY);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800">Tesorería</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal('pago_cuota')}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition">
            <Plus className="w-4 h-4" /> Registrar pago cuota
          </button>
          <button onClick={() => openModal('movimiento')}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition">
            <Plus className="w-4 h-4" /> Otro movimiento
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
          <button onClick={load} className="ml-auto underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reintentar
          </button>
        </div>
      )}

      {/* Balance */}
      {balance && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos</p>
              <p className="text-xl font-bold text-green-600">${balance.ingresos.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Egresos</p>
              <p className="text-xl font-bold text-red-500">${balance.egresos.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${balance.balance >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <Wallet className={`w-5 h-5 ${balance.balance >= 0 ? 'text-blue-600' : 'text-orange-500'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance</p>
              <p className={`text-xl font-bold ${balance.balance >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                ${balance.balance.toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabla movimientos */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600">Historial de movimientos</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Registrado por', 'Monto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">No hay movimientos registrados.</td>
                </tr>
              ) : movimientos.map(m => (
                <tr key={m.id_movimiento} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(m.fecha).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${TIPO_COLOR[m.tipo]}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{CATEGORIA_LABEL[m.categoria]}</td>
                  <td className="px-4 py-3 text-gray-700">{m.descripcion}</td>
                  <td className="px-4 py-3 text-gray-500">{m.usuario_nombre ?? '—'}</td>
                  <td className={`px-4 py-3 font-semibold ${m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-500'}`}>
                    {m.tipo === 'EGRESO' ? '-' : '+'}${Number(m.monto).toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal pago cuota */}
      {modal === 'pago_cuota' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Registrar pago de cuota</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handlePagoCuota} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuota pendiente *</label>
                <select value={cuotaSeleccionada} onChange={e => setCuotaSeleccionada(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  <option value="">Seleccionar cuota...</option>
                  {cuotas.map(c => (
                    <option key={c.id_cuota} value={c.id_cuota}>
                      Socio #{c.socio} — {c.periodo} — ${Number(c.monto).toLocaleString('es-CL')} ({c.estado_pago})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
                <input type="text" placeholder="Opcional..." value={observacion}
                  onChange={e => setObservacion(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal movimiento manual */}
      {modal === 'movimiento' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Registrar movimiento</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleMovimiento} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select value={movForm.tipo} onChange={e => setMovForm(f => ({ ...f, tipo: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  <option value="INGRESO">Ingreso</option>
                  <option value="EGRESO">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select value={movForm.categoria} onChange={e => setMovForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  <option value="MULTA">Multa</option>
                  <option value="GASTO_OPERACIONAL">Gasto Operacional</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <input type="text" placeholder="Ej: Pago arriendo local" value={movForm.descripcion}
                  onChange={e => setMovForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
                <input type="number" min="1" placeholder="50000" value={movForm.monto}
                  onChange={e => setMovForm(f => ({ ...f, monto: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
