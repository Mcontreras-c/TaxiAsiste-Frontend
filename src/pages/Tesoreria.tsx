import { useEffect, useState } from 'react';
import { DollarSign, Plus, TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight, Landmark, Download } from 'lucide-react';
import {
  getMovimientos, getBalance, createMovimiento, registrarPagoCuota, getCuotas, getResumenMensual,
  type TesoreriaMovimiento, type Balance, type ResumenMensual,
} from '../api/tesoreria';
import type { Cuota } from '../types';
import {
  Alert, Badge, Button, DataTable, LoadingState,
  Modal, PageHeader, StatCard, TableCell, TableRow,
} from '../components/ui';
import { exportarAExcel } from '../utils/exportarExcel';

const TIPO_COLOR: Record<string, string> = {
  INGRESO: 'bg-emerald-50 text-emerald-700',
  EGRESO:  'bg-red-50 text-red-600',
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

function hoyMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesLabel(m: string) {
  const [y, mm] = m.split('-');
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}
function prevMes(m: string) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMes(m: string) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function TesoreriaPage() {
  const [movimientos, setMovimientos] = useState<TesoreriaMovimiento[]>([]);
  const [balance, setBalance]         = useState<Balance | null>(null);
  const [cuotas, setCuotas]           = useState<Cuota[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [modal, setModal]             = useState<ModalTipo>(null);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const [mes, setMes]                 = useState(hoyMes());
  const [resumenMes, setResumenMes]   = useState<ResumenMensual | null>(null);

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

  useEffect(() => {
    getResumenMensual(mes).then(setResumenMes).catch(() => setResumenMes(null));
  }, [mes]);

  const handlePagoCuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuotaSeleccionada) { setFormError('Selecciona una cuota.'); return; }
    setSaving(true); setFormError(null);
    try {
      await registrarPagoCuota(Number(cuotaSeleccionada), observacion || undefined);
      setModal(null); setCuotaSeleccionada(''); setObservacion('');
      await load();
      getResumenMensual(mes).then(setResumenMes).catch(() => {});
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
      getResumenMensual(mes).then(setResumenMes).catch(() => {});
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? 'Error al registrar el movimiento.');
    } finally { setSaving(false); }
  };

  const openModal = (tipo: ModalTipo) => {
    setModal(tipo); setFormError(null);
    setCuotaSeleccionada(''); setObservacion(''); setMovForm(MOV_EMPTY);
  };

  const exportar = () => {
    exportarAExcel('TaxiAsiste_Tesoreria', [{
      nombre: 'Movimientos',
      columnas: [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Categoría', key: 'categoria', width: 18 },
        { header: 'Descripción', key: 'descripcion', width: 36 },
        { header: 'Registrado por', key: 'usuario', width: 18 },
        { header: 'Monto', key: 'monto', width: 14 },
      ],
      filas: movimientos.map(m => ({
        fecha: new Date(m.fecha).toLocaleDateString('es-CL'),
        tipo: m.tipo,
        categoria: CATEGORIA_LABEL[m.categoria] ?? m.categoria,
        descripcion: m.descripcion,
        usuario: m.usuario_nombre ?? '—',
        monto: Number(m.monto),
      })),
    }]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={DollarSign}
        title="Tesorería"
        actions={
          <>
            <Button variant="secondary" onClick={exportar}>
              <Download className="w-4 h-4" /> Exportar
            </Button>
            <Button onClick={() => openModal('pago_cuota')}>
              <Plus className="w-4 h-4" /> Registrar pago cuota
            </Button>
            <Button variant="dark" onClick={() => openModal('movimiento')}>
              <Plus className="w-4 h-4" /> Otro movimiento
            </Button>
          </>
        }
      />

      {error && <Alert message={error} onRetry={load} />}

      {balance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Ingresos"
            value={`$${balance.ingresos.toLocaleString('es-CL')}`}
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            accent="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <StatCard
            title="Egresos"
            value={`$${balance.egresos.toLocaleString('es-CL')}`}
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            accent="text-red-500"
            iconBg="bg-red-50"
          />
          <StatCard
            title="Balance"
            value={`$${balance.balance.toLocaleString('es-CL')}`}
            icon={<Wallet className={`w-5 h-5 ${balance.balance >= 0 ? 'text-blue-600' : 'text-orange-500'}`} />}
            accent={balance.balance >= 0 ? 'text-blue-600' : 'text-orange-500'}
            iconBg={balance.balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}
          />
        </div>
      )}

      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setMes(prevMes(mes))} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-slate-700 capitalize">Resumen de caja — {mesLabel(mes)}</h2>
          <button onClick={() => setMes(nextMes(mes))} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {resumenMes && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Caja mes anterior"
              value={`$${resumenMes.caja_anterior.toLocaleString('es-CL')}`}
              icon={<Landmark className="w-5 h-5 text-slate-500" />}
              accent="text-slate-700"
              iconBg="bg-slate-100"
            />
            <StatCard
              title="Ganancias del mes"
              value={`$${resumenMes.ingresos_mes.toLocaleString('es-CL')}`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
              accent="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Gastos del mes"
              value={`$${resumenMes.egresos_mes.toLocaleString('es-CL')}`}
              icon={<TrendingDown className="w-5 h-5 text-red-500" />}
              accent="text-red-500"
              iconBg="bg-red-50"
            />
            <StatCard
              title="Total caja actual"
              value={`$${resumenMes.total_caja.toLocaleString('es-CL')}`}
              icon={<Wallet className={`w-5 h-5 ${resumenMes.total_caja >= 0 ? 'text-blue-600' : 'text-orange-500'}`} />}
              accent={resumenMes.total_caja >= 0 ? 'text-blue-600' : 'text-orange-500'}
              iconBg={resumenMes.total_caja >= 0 ? 'bg-blue-50' : 'bg-orange-50'}
            />
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Historial de movimientos</h2>
          <DataTable
            headers={['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Registrado por', 'Monto']}
            isEmpty={movimientos.length === 0}
            emptyMessage="No hay movimientos registrados."
          >
            {movimientos.map(m => (
              <TableRow key={m.id_movimiento}>
                <TableCell className="text-slate-500 text-xs">
                  {new Date(m.fecha).toLocaleDateString('es-CL')}
                </TableCell>
                <TableCell>
                  <Badge className={TIPO_COLOR[m.tipo]}>{m.tipo}</Badge>
                </TableCell>
                <TableCell className="text-slate-500">{CATEGORIA_LABEL[m.categoria]}</TableCell>
                <TableCell className="text-slate-700">{m.descripcion}</TableCell>
                <TableCell className="text-slate-500">{m.usuario_nombre ?? '—'}</TableCell>
                <TableCell className={`font-semibold ${m.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {m.tipo === 'EGRESO' ? '-' : '+'}${Number(m.monto).toLocaleString('es-CL')}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </div>
      )}

      {modal === 'pago_cuota' && (
        <Modal title="Registrar pago de cuota" onClose={() => setModal(null)}>
          <form onSubmit={handlePagoCuota} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cuota pendiente *</label>
              <select
                value={cuotaSeleccionada}
                onChange={e => setCuotaSeleccionada(e.target.value)}
                className="input-field"
              >
                <option value="">Seleccionar cuota...</option>
                {cuotas.map(c => (
                  <option key={c.id_cuota} value={c.id_cuota}>
                    Socio #{c.socio} — {c.periodo} — ${Number(c.monto).toLocaleString('es-CL')} ({c.estado_pago})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Observación</label>
              <input
                type="text"
                placeholder="Opcional..."
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                className="input-field"
              />
            </div>
            {formError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Guardando...' : 'Registrar pago'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'movimiento' && (
        <Modal title="Registrar movimiento" onClose={() => setModal(null)}>
          <form onSubmit={handleMovimiento} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo *</label>
              <select
                value={movForm.tipo}
                onChange={e => setMovForm(f => ({ ...f, tipo: e.target.value as any }))}
                className="input-field"
              >
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría *</label>
              <select
                value={movForm.categoria}
                onChange={e => setMovForm(f => ({ ...f, categoria: e.target.value }))}
                className="input-field"
              >
                <option value="MULTA">Multa</option>
                <option value="GASTO_OPERACIONAL">Gasto Operacional</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción *</label>
              <input
                type="text"
                placeholder="Ej: Pago arriendo local"
                value={movForm.descripcion}
                onChange={e => setMovForm(f => ({ ...f, descripcion: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto ($) *</label>
              <input
                type="number"
                min="1"
                placeholder="50000"
                value={movForm.monto}
                onChange={e => setMovForm(f => ({ ...f, monto: e.target.value }))}
                className="input-field"
              />
            </div>
            {formError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="dark" disabled={saving} className="flex-1">
                {saving ? 'Guardando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
