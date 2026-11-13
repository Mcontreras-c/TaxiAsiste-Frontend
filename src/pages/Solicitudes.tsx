import { useEffect, useState } from 'react';
import { PhoneCall, Plus, ChevronRight } from 'lucide-react';
import { getSolicitudes, createSolicitud, cambiarEstado } from '../api/solicitudes';
import { getMoviles } from '../api/moviles';
import type { Solicitud, EstadoSolicitud, Movil } from '../types';
import {
  Alert, Badge, Button, DataTable, LoadingState,
  Modal, PageHeader, SearchInput, TableCell, TableRow,
} from '../components/ui';

import { formatoFechaHora } from '../utils/formatoFecha';
const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:  'bg-orange-500/15 text-orange-400',
  ASIGNADO:   'bg-blue-500/15 text-blue-400',
  EN_CURSO:   'bg-violet-500/15 text-violet-300',
  COMPLETADO: 'bg-emerald-500/15 text-emerald-400',
  CANCELADO:  'bg-white/[0.06]/10 text-white/60',
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

  const openModal = () => {
    setShowModal(true);
    setForm(EMPTY);
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={PhoneCall}
        title="Solicitudes"
        count={solicitudes.length}
        actions={
          <Button onClick={openModal}>
            <Plus className="w-4 h-4" /> Nueva solicitud
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por folio, origen, destino o estado..."
      />

      {error && <Alert message={error} onRetry={load} />}

      {loading ? (
        <LoadingState />
      ) : (
        <DataTable
          headers={['Folio', 'Origen → Destino', 'Móvil', 'Canal', 'Estado', 'Fecha', 'Acción']}
          isEmpty={filtered.length === 0}
          emptyMessage="No hay solicitudes registradas."
        >
          {filtered.map(s => (
            <TableRow key={s.id_solicitud}>
              <TableCell className="font-mono text-xs text-white/70">{s.folio}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-white/80">
                  <span className="truncate max-w-[120px]">{s.origen}</span>
                  <ChevronRight className="w-3 h-3 text-white/45 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{s.destino}</span>
                </div>
              </TableCell>
              <TableCell className="text-white/60">{s.movil_patente ?? '—'}</TableCell>
              <TableCell className="text-white/60">{s.canal_entrada}</TableCell>
              <TableCell>
                <Badge className={ESTADO_COLOR[s.estado]}>{s.estado}</Badge>
              </TableCell>
              <TableCell className="text-white/45 text-xs">
                {formatoFechaHora(s.fecha_hora)}
              </TableCell>
              <TableCell>
                {TRANSICIONES[s.estado].length > 0 && (
                  <button
                    onClick={() => { setSelected(s); setNuevoEstado(''); setMovilId(''); }}
                    className="text-xs text-brand-300 hover:underline font-semibold"
                  >
                    Cambiar estado
                  </button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}

      {showModal && (
        <Modal title="Nueva solicitud" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {[
              { label: 'Origen *',  key: 'origen',  placeholder: 'Calle Falsa 123' },
              { label: 'Destino *', key: 'destino', placeholder: 'Plaza Italia' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[key as keyof FormData]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="input-field"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Canal de entrada</label>
              <select
                value={form.canal_entrada}
                onChange={e => setForm(f => ({ ...f, canal_entrada: e.target.value }))}
                className="input-field"
              >
                {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Observaciones</label>
              <textarea
                placeholder="Opcional..."
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                rows={2}
                className="input-field resize-none"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-400 bg-red-500/15 border border-red-400/30 rounded-xl px-3 py-2">{formError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal title="Cambiar estado" onClose={() => setSelected(null)} maxWidth="max-w-sm">
          <p className="text-sm text-white/60 mb-1">
            Folio: <span className="font-mono font-semibold text-white/80">{selected.folio}</span>
          </p>
          <p className="text-sm text-white/60 mb-4 flex items-center gap-2">
            Estado actual: <Badge className={ESTADO_COLOR[selected.estado]}>{selected.estado}</Badge>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Nuevo estado</label>
              <select
                value={nuevoEstado}
                onChange={e => setNuevoEstado(e.target.value as EstadoSolicitud)}
                className="input-field"
              >
                <option value="">Seleccionar...</option>
                {TRANSICIONES[selected.estado].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {nuevoEstado === 'ASIGNADO' && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">Móvil a asignar</label>
                <select
                  value={movilId}
                  onChange={e => setMovilId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccionar móvil...</option>
                  {moviles.map(m => (
                    <option key={m.id_movil} value={m.id_movil}>{m.patente} — {m.socio_nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!nuevoEstado || changingEstado}
              onClick={handleCambiarEstado}
            >
              {changingEstado ? 'Guardando...' : 'Confirmar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
