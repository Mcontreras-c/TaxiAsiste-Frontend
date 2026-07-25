import { useEffect, useState, useCallback } from 'react';
import {
  PhoneCall, Plus, RefreshCw, AlertCircle, X, ChevronRight,
  Clock, Car, CheckCircle, XCircle, History, PhoneMissed, MapPin,
} from 'lucide-react';
import {
  getResumenCentral, getSolicitudes, createSolicitud,
  cambiarEstado, buscarPasajeroPorRut, type ResumenCentral,
} from '../api/solicitudes';
import { getMoviles, getFilaBase } from '../api/moviles';
import type { Solicitud, EstadoSolicitud, Movil, Pasajero, FilaBase } from '../types';

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:  'bg-orange-100 text-orange-700 border-orange-200',
  ASIGNADO:   'bg-blue-100 text-blue-700 border-blue-200',
  EN_CURSO:   'bg-purple-100 text-purple-700 border-purple-200',
  COMPLETADO: 'bg-green-100 text-green-700 border-green-200',
  CANCELADO:  'bg-gray-100 text-gray-500 border-gray-200',
};

const CANALES = ['TELEFONO', 'APP', 'PRESENCIAL'] as const;

interface FormData {
  rut: string;
  origen: string;
  destino: string;
  canal_entrada: string;
  observaciones: string;
  pasajero_id: number | null;
  pasajero_nombre: string;
}

const EMPTY_FORM: FormData = {
  rut: '', origen: '', destino: '', canal_entrada: 'TELEFONO',
  observaciones: '', pasajero_id: null, pasajero_nombre: '',
};

interface AccionModal {
  solicitud: Solicitud;
  tipo: 'cambiar' | 'cancelar' | 'sin_contacto';
}

function SolicitudCard({
  sol, onAccion,
}: { sol: Solicitud; onAccion: (a: AccionModal) => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 text-sm shadow-sm space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-gray-400">{sol.folio}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ESTADO_COLOR[sol.estado]}`}>
          {sol.estado}
        </span>
      </div>
      <div className="flex items-center gap-1 text-gray-700 font-medium">
        <span className="truncate">{sol.origen}</span>
        <ChevronRight className="w-3 h-3 flex-shrink-0 text-gray-400" />
        <span className="truncate">{sol.destino}</span>
      </div>
      {sol.movil_patente && (
        <p className="text-xs text-gray-500">Móvil: <strong>{sol.movil_patente}</strong></p>
      )}
      {sol.pasajero_nombre && (
        <p className="text-xs text-gray-500">Pasajero: {sol.pasajero_nombre}</p>
      )}
      <p className="text-xs text-gray-400">
        {new Date(sol.fecha_hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <div className="flex gap-1 pt-1">
        {sol.estado !== 'COMPLETADO' && sol.estado !== 'CANCELADO' && (
          <>
            <button onClick={() => onAccion({ solicitud: sol, tipo: 'cambiar' })}
              className="flex-1 text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-1 rounded transition">
              Avanzar
            </button>
            <button onClick={() => onAccion({ solicitud: sol, tipo: 'sin_contacto' })}
              title="Sin contacto"
              className="p-1 text-orange-500 hover:bg-orange-50 rounded transition">
              <PhoneMissed className="w-4 h-4" />
            </button>
            <button onClick={() => onAccion({ solicitud: sol, tipo: 'cancelar' })}
              title="Cancelar"
              className="p-1 text-red-500 hover:bg-red-50 rounded transition">
              <XCircle className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SolicitudesCentralPage() {
  const [resumen, setResumen]       = useState<ResumenCentral | null>(null);
  const [historial, setHistorial]   = useState<Solicitud[]>([]);
  const [moviles, setMoviles]       = useState<Movil[]>([]);
  const [filaBase, setFilaBase]     = useState<FilaBase[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [accion, setAccion]         = useState<AccionModal | null>(null);
  const [movilId, setMovilId]       = useState('');
  const [buscandoRut, setBuscandoRut] = useState(false);
  const [pasajeroEncontrado, setPasajeroEncontrado] = useState<Pasajero | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [r, m, f] = await Promise.all([getResumenCentral(), getMoviles(), getFilaBase()]);
      setResumen(r);
      setMoviles(m.filter(m => m.estado_operativo === 'DISPONIBLE'));
      setFilaBase(f.sort((a, b) => a.posicion - b.posicion));
    } catch {
      setError('No se pudo cargar las solicitudes.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadHistorial = async () => {
    const all = await getSolicitudes();
    setHistorial(all);
    setShowHistorial(true);
  };

  const handleRutBlur = async () => {
    if (!form.rut) return;
    setBuscandoRut(true);
    try {
      const res = await buscarPasajeroPorRut(form.rut);
      if (res.length > 0) {
        setPasajeroEncontrado(res[0]);
        setForm(f => ({
          ...f,
          pasajero_id: res[0].id_pasajero,
          pasajero_nombre: `${res[0].nombre} ${res[0].apellido}`,
        }));
      } else {
        setPasajeroEncontrado(null);
        setForm(f => ({ ...f, pasajero_id: null, pasajero_nombre: '' }));
      }
    } finally { setBuscandoRut(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.origen || !form.destino) { setFormError('Origen y destino son obligatorios.'); return; }
    setSaving(true); setFormError(null);
    try {
      await createSolicitud({
        origen: form.origen,
        destino: form.destino,
        canal_entrada: form.canal_entrada as any,
        observaciones: form.observaciones || null,
        pasajero: form.pasajero_id ?? null,
      });
      setForm(EMPTY_FORM); setPasajeroEncontrado(null);
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? 'Error al crear la solicitud.');
    } finally { setSaving(false); }
  };

  const handleAccion = async () => {
    if (!accion) return;
    setSaving(true);
    try {
      if (accion.tipo === 'sin_contacto') {
        await cambiarEstado(accion.solicitud.id_solicitud, 'CANCELADO', undefined, 'SIN_CONTACTO');
      } else if (accion.tipo === 'cancelar') {
        await cambiarEstado(accion.solicitud.id_solicitud, 'CANCELADO');
      } else {
        const sig = { PENDIENTE: 'ASIGNADO', ASIGNADO: 'EN_CURSO', EN_CURSO: 'COMPLETADO' } as Record<string, EstadoSolicitud>;
        const nuevoEstado = sig[accion.solicitud.estado];
        if (!nuevoEstado) return;
        await cambiarEstado(accion.solicitud.id_solicitud, nuevoEstado,
          nuevoEstado === 'ASIGNADO' && movilId ? Number(movilId) : undefined);
      }
      setAccion(null); setMovilId('');
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? 'Error al cambiar estado.');
    } finally { setSaving(false); }
  };

  const SIG_ESTADO: Record<string, string> = {
    PENDIENTE: 'ASIGNADO', ASIGNADO: 'EN_CURSO', EN_CURSO: 'COMPLETADO',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PhoneCall className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800">Solicitudes</h1>
          {resumen && (
            <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {resumen.pendientes.length + resumen.en_curso.length} activas
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => loadHistorial()}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition">
            <History className="w-4 h-4" /> Historial
          </button>
          <button onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setPasajeroEncontrado(null); setFormError(null); }}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition">
            <Plus className="w-4 h-4" /> Nueva solicitud
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : resumen && (
        <div className="grid grid-cols-4 gap-4">
          {/* Fila virtual (base) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-bold text-gray-700">Fila Virtual (Base)</h2>
              <span className="ml-auto bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                {filaBase.length}
              </span>
            </div>
            <div className="space-y-2">
              {filaBase.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">Sin moviles en base</p>
                : filaBase.map(f => (
                    <div key={f.id_fila} className="bg-white rounded-lg border border-gray-200 p-3 text-sm shadow-sm flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 text-white text-xs font-bold flex items-center justify-center">
                        {f.posicion}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-700 truncate">{f.patente}</p>
                        <p className="text-xs text-gray-400 truncate">{f.socio_nombre}</p>
                      </div>
                      <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        f.estado === 'LLAMADO' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {f.estado}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Pendientes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-gray-700">Pendientes</h2>
              <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {resumen.pendientes.length}
              </span>
            </div>
            <div className="space-y-2">
              {resumen.pendientes.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">Sin pendientes</p>
                : resumen.pendientes.slice(0, 4).map(s => (
                    <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} />
                  ))
              }
            </div>
          </div>

          {/* En curso */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-gray-700">En curso</h2>
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {resumen.en_curso.length}
              </span>
            </div>
            <div className="space-y-2">
              {resumen.en_curso.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">Sin viajes en curso</p>
                : resumen.en_curso.slice(0, 4).map(s => (
                    <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} />
                  ))
              }
            </div>
          </div>

          {/* Finalizadas recientes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <h2 className="text-sm font-bold text-gray-700">Recientes</h2>
              <button onClick={() => loadHistorial()}
                className="ml-auto text-xs text-blue-500 hover:underline">
                ver todo
              </button>
            </div>
            <div className="space-y-2">
              {resumen.finalizadas.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">Sin finalizadas</p>
                : resumen.finalizadas.map(s => (
                    <SolicitudCard key={s.id_solicitud} sol={s} onAccion={setAccion} />
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva solicitud */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Nueva solicitud</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {/* RUT con autocompletado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT pasajero</label>
                <input type="text" placeholder="12345678-9"
                  value={form.rut}
                  onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
                  onBlur={handleRutBlur}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                {buscandoRut && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
                {pasajeroEncontrado && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    ✓ {pasajeroEncontrado.nombre} {pasajeroEncontrado.apellido} — {pasajeroEncontrado.telefono ?? 'sin teléfono'}
                  </p>
                )}
                {!buscandoRut && form.rut && !pasajeroEncontrado && (
                  <p className="text-xs text-gray-400 mt-1">Pasajero no registrado — se creará la solicitud sin vincularlo.</p>
                )}
              </div>

              {[
                { label: 'Origen *',  key: 'origen',  placeholder: 'Calle Falsa 123' },
                { label: 'Destino *', key: 'destino', placeholder: 'Plaza Italia' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="text" placeholder={placeholder}
                    value={form[key as keyof FormData] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
                <select value={form.canal_entrada}
                  onChange={e => setForm(f => ({ ...f, canal_entrada: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea placeholder="Opcional..." rows={2} value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
              </div>

              {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal acción (avanzar / cancelar / sin contacto) */}
      {accion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {accion.tipo === 'cancelar' ? 'Cancelar solicitud'
                  : accion.tipo === 'sin_contacto' ? 'Sin contacto'
                  : 'Avanzar estado'}
              </h2>
              <button onClick={() => setAccion(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-1">
              Folio: <span className="font-mono font-semibold text-gray-700">{accion.solicitud.folio}</span>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {accion.solicitud.origen} → {accion.solicitud.destino}
            </p>

            {accion.tipo === 'sin_contacto' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700 mb-4">
                <PhoneMissed className="w-4 h-4 inline mr-1" />
                Se cancelará la solicitud con motivo <strong>SIN_CONTACTO</strong>. Esto queda registrado para seguimiento.
              </div>
            )}

            {accion.tipo === 'cancelar' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 mb-4">
                <XCircle className="w-4 h-4 inline mr-1" />
                Se cancelará la solicitud. Esta acción no se puede deshacer.
              </div>
            )}

            {accion.tipo === 'cambiar' && accion.solicitud.estado === 'PENDIENTE' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignar móvil *
                </label>
                <select value={movilId} onChange={e => setMovilId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  <option value="">Seleccionar móvil disponible...</option>
                  {moviles.map(m => (
                    <option key={m.id_movil} value={m.id_movil}>
                      {m.patente} — {m.socio_nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {accion.tipo === 'cambiar' && accion.solicitud.estado !== 'PENDIENTE' && (
              <p className="text-sm text-gray-600 mb-4">
                Nuevo estado: <strong>{SIG_ESTADO[accion.solicitud.estado]}</strong>
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setAccion(null)}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Volver
              </button>
              <button onClick={handleAccion} disabled={saving || (accion.tipo === 'cambiar' && accion.solicitud.estado === 'PENDIENTE' && !movilId)}
                className={`flex-1 font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60 ${
                  accion.tipo === 'cancelar' || accion.tipo === 'sin_contacto'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'
                }`}>
                {saving ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial completo */}
      {showHistorial && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Historial completo</h2>
              <button onClick={() => setShowHistorial(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {['Folio', 'Origen → Destino', 'Móvil', 'Estado', 'Obs.', 'Fecha'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historial.map(s => (
                    <tr key={s.id_solicitud} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.folio}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                        <span className="truncate block">{s.origen} → {s.destino}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{s.movil_patente ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ESTADO_COLOR[s.estado]}`}>
                          {s.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400 max-w-[100px] truncate">
                        {s.observaciones ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {new Date(s.fecha_hora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
