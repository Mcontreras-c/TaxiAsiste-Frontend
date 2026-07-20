import { useEffect, useState } from 'react';
import { Car, Plus } from 'lucide-react';
import { getMoviles, createMovil } from '../api/moviles';
import { getSocios } from '../api/socios';
import type { Movil, Socio } from '../types';
import {
  Alert, Badge, Button, DataTable, LoadingState,
  Modal, PageHeader, SearchInput, TableCell, TableRow,
} from '../components/ui';

const ESTADO_COLOR: Record<string, string> = {
  DISPONIBLE:  'bg-emerald-50 text-emerald-700',
  EN_SERVICIO: 'bg-blue-50 text-blue-700',
  BLOQUEADO:   'bg-red-50 text-red-600',
  INACTIVO:    'bg-slate-100 text-slate-500',
};

interface FormData {
  id_socio: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
}

const EMPTY: FormData = { id_socio: '', patente: '', marca: '', modelo: '', anio: '', color: '' };

export default function MovilesPage() {
  const [moviles, setMoviles]     = useState<Movil[]>([]);
  const [socios, setSocios]       = useState<Socio[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<FormData>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s] = await Promise.all([getMoviles(), getSocios()]);
      setMoviles(m);
      setSocios(s);
    } catch {
      setError('No se pudieron cargar los móviles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = moviles.filter(m =>
    `${m.patente} ${m.socio_nombre} ${m.marca} ${m.modelo}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_socio || !form.patente) {
      setFormError('Socio y patente son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createMovil({
        socio: Number(form.id_socio),
        patente: form.patente.toUpperCase(),
        marca: form.marca || null,
        modelo: form.modelo || null,
        anio: form.anio ? Number(form.anio) : null,
        color: form.color || null,
        estado_operativo: 'DISPONIBLE',
      });
      setShowModal(false);
      setForm(EMPTY);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.patente?.[0] ?? 'Error al registrar el móvil.');
    } finally {
      setSaving(false);
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
        icon={Car}
        title="Móviles"
        count={moviles.length}
        actions={
          <Button onClick={openModal}>
            <Plus className="w-4 h-4" /> Nuevo móvil
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por patente, socio o marca..."
      />

      {error && <Alert message={error} onRetry={load} />}

      {loading ? (
        <LoadingState />
      ) : (
        <DataTable
          headers={['Patente', 'Socio', 'Vehículo', 'Año', 'Color', 'Estado', 'Registro']}
          isEmpty={filtered.length === 0}
          emptyMessage="No hay móviles registrados."
        >
          {filtered.map(m => (
            <TableRow key={m.id_movil}>
              <TableCell className="font-mono font-bold text-slate-800">{m.patente}</TableCell>
              <TableCell className="text-slate-700">{m.socio_nombre}</TableCell>
              <TableCell className="text-slate-500">{[m.marca, m.modelo].filter(Boolean).join(' ') || '—'}</TableCell>
              <TableCell className="text-slate-500">{m.anio ?? '—'}</TableCell>
              <TableCell className="text-slate-500">{m.color ?? '—'}</TableCell>
              <TableCell>
                <Badge className={ESTADO_COLOR[m.estado_operativo]}>
                  {m.estado_operativo.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-400">
                {new Date(m.fecha_registro).toLocaleDateString('es-CL')}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}

      {showModal && (
        <Modal title="Nuevo móvil" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Socio *</label>
              <select
                value={form.id_socio}
                onChange={e => setForm(f => ({ ...f, id_socio: e.target.value }))}
                className="input-field"
              >
                <option value="">Seleccionar socio...</option>
                {socios.map(s => (
                  <option key={s.id_socio} value={s.id_socio}>
                    {s.nombre_completo} — {s.rut}
                  </option>
                ))}
              </select>
            </div>

            {[
              { label: 'Patente *', key: 'patente', placeholder: 'ABCD12' },
              { label: 'Marca',     key: 'marca',   placeholder: 'Toyota' },
              { label: 'Modelo',    key: 'modelo',  placeholder: 'Corolla' },
              { label: 'Año',       key: 'anio',    placeholder: '2020' },
              { label: 'Color',     key: 'color',   placeholder: 'Blanco' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[key as keyof FormData]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="input-field"
                />
              </div>
            ))}

            {formError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {formError}
              </p>
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
    </div>
  );
}
