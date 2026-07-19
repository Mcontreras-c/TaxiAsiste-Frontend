import { useEffect, useState } from 'react';
import { PhoneCall, Plus, Search, RefreshCw, AlertCircle, X, ChevronRight } from 'lucide-react';
import { getSolicitudes, createSolicitud, cambiarEstado } from '../api/solicitudes';
import { getMoviles } from '../api/moviles';
import type { Solicitud, EstadoSolicitud, Movil } from '../types';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:  'bg-orange-100 text-orange-700',
  ASIGNADO:   'bg-blue-100 text-blue-700',
  EN_CURSO:   'bg-purple-100 text-purple-700',
  COMPLETADO: 'bg-green-100 text-green-700',
  CANCELADO:  'bg-gray-100 text-gray-500',
};

const TRANSICIONES: Record<string, EstadoSolicitud[]> = {
  PENDIENTE:  ['ASIGNADO', 'CANCELADO'],
  ASIGNADO:   ['EN_CURSO', 'CANCELADO'],
  EN_CURSO:   ['COMPLETADO', 'CANCELADO'],
  COMPLETADO: [],
  CANCELADO:  [],
};

const CANALES = ['TELEFONO', 'APP', 'PRESENCIAL'] as const;

interface FormData {
  origen: string;
  destino: string;
  canal_entrada: string;
  observaciones: string;
}

const EMPTY: FormData = { origen: '', destino: '', canal_entrada: 'TELEFONO', observaciones: '' };

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [moviles, setMoviles]         = useState<Movil[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState<FormData>(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // Estado para cambio de estado
  const [selected, setSelected]       = useState<Solicitud | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<EstadoSolicitud | ''>('');
  const [movilId, setMovilId]         = useState<string>('');
  const [changingEstado, setChangingEstado] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, m] = await Promise.all([getSolicitudes(), getMoviles()]);
      setSolicitudes(s);
      setMoviles(m.filter(m => m.estado_operativo === 'DISPONIBLE'));
    } catch {
      setError('No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = solicitudes.filter(s =>
    `${s.folio} ${s.origen} ${s.destino} ${s.pasajero_nombre ?? ''} ${s.estado}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.origen || !form.destino) {
      setFormError('Origen y destino son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createSolicitud({
        origen: form.origen,
        destino: form.destino,
        canal_entrada: form.canal_entrada as any,
        observaciones: form.observaciones || null,
      });
      setShowModal(false);
      setForm(EMPTY);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? 'Error al crear la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEstado = async () => {
    if (!selected || !nuevoEstado) return;
    setChangingEstado(true);
    try {
      await cambiarEstado(
        selected.id_solicitud,
        nuevoEstado,
        nuevoEstado === 'ASIGNADO' && movilId ? Number(movilId) : undefined
      );
      setSelected(null);
      setNuevoEstado('');
      setMovilId('');
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Error al cambiar estado.');
    } finally {
      setChangingEstado(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PhoneCall className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800">Solicitudes</h1>
          <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {solicitudes.length}
          </span>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(EMPTY); setFormError(null); }}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Nueva solicitud
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por folio, origen, destino o estado..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
          <button onClick={load} className="ml-auto underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Folio', 'Origen → Destino', 'Móvil', 'Canal', 'Estado', 'Fecha', 'Acción'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No hay solicitudes registradas.
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id_solicitud} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.folio}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-700">
                      <span className="truncate max-w-[120px]">{s.origen}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{s.destino}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.movil_patente ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.canal_entrada}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[s.estado]}`}>
                      {s.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(s.fecha_hora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    {TRANSICIONES[s.estado].length > 0 && (
                      <button
                        onClick={() => { setSelected(s); setNuevoEstado(''); setMovilId(''); }}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Cambiar estado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nueva solicitud */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Nueva solicitud</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'Origen *',  key: 'origen',  placeholder: 'Calle Falsa 123' },
                { label: 'Destino *', key: 'destino', placeholder: 'Plaza Italia' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={form[key as keyof FormData]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canal de entrada</label>
                <select
                  value={form.canal_entrada}
                  onChange={e => setForm(f => ({ ...f, canal_entrada: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  placeholder="Opcional..."
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal cambiar estado */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Cambiar estado</h2>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-1">Folio: <span className="font-mono font-semibold text-gray-700">{selected.folio}</span></p>
            <p className="text-sm text-gray-500 mb-4">
              Estado actual: <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[selected.estado]}`}>{selected.estado}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo estado</label>
                <select
                  value={nuevoEstado}
                  onChange={e => setNuevoEstado(e.target.value as EstadoSolicitud)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Seleccionar...</option>
                  {TRANSICIONES[selected.estado].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {nuevoEstado === 'ASIGNADO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Móvil a asignar</label>
                  <select
                    value={movilId}
                    onChange={e => setMovilId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">Seleccionar móvil...</option>
                    {moviles.map(m => (
                      <option key={m.id_movil} value={m.id_movil}>{m.patente} — {m.socio_nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setSelected(null)}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleCambiarEstado} disabled={!nuevoEstado || changingEstado}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60">
                {changingEstado ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
