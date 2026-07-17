import { useEffect, useState } from 'react';
import { Users, Plus, AlertTriangle } from 'lucide-react';
import { getSocios, createSocio } from '../api/socios';
import type { Socio } from '../types';
import {
  Alert, Badge, Button, DataTable, LoadingState,
  Modal, PageHeader, SearchInput, TableCell, TableRow,
} from '../components/ui';

const ESTADO_COLOR: Record<string, string> = {
  ACTIVO:    'bg-emerald-50 text-emerald-700',
  INACTIVO:  'bg-slate-100 text-slate-500',
  BLOQUEADO: 'bg-red-50 text-red-600',
};

interface FormData {
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
}

const EMPTY: FormData = { rut: '', nombre: '', apellido: '', telefono: '', direccion: '' };

export default function SociosPage() {
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
      setSocios(await getSocios());
    } catch {
      setError('No se pudieron cargar los socios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = socios.filter(s =>
    `${s.nombre} ${s.apellido} ${s.rut}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rut || !form.nombre || !form.apellido) {
      setFormError('RUT, nombre y apellido son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createSocio({
        rut: form.rut,
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono || null,
        direccion: form.direccion || null,
        estado_socio: 'ACTIVO',
      });
      setShowModal(false);
      setForm(EMPTY);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.rut?.[0] ?? 'Error al crear el socio.');
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
        icon={Users}
        title="Socios"
        count={socios.length}
        actions={
          <Button onClick={openModal}>
            <Plus className="w-4 h-4" /> Nuevo socio
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre o RUT..."
      />

      {error && (
        <Alert
          message={error}
          onRetry={load}
          retryLabel="Reintentar"
        />
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <DataTable
          headers={['RUT', 'Nombre', 'Teléfono', 'Dirección', 'Estado', 'Ingreso', 'Cuotas vencidas']}
          isEmpty={filtered.length === 0}
          emptyMessage="No hay socios registrados."
        >
          {filtered.map(s => (
            <TableRow key={s.id_socio}>
              <TableCell className="font-mono text-slate-700">{s.rut}</TableCell>
              <TableCell className="font-medium text-slate-800">{s.nombre_completo}</TableCell>
              <TableCell className="text-slate-500">{s.telefono ?? '—'}</TableCell>
              <TableCell className="text-slate-500 max-w-xs truncate">{s.direccion ?? '—'}</TableCell>
              <TableCell>
                <Badge className={ESTADO_COLOR[s.estado_socio]}>
                  {s.estado_socio}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-400">
                {new Date(s.fecha_ingreso).toLocaleDateString('es-CL')}
              </TableCell>
              <TableCell>
                {(s.cuotas_vencidas ?? 0) > 0 ? (
                  <span className="flex items-center gap-1 text-orange-600 font-semibold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {s.cuotas_vencidas}
                  </span>
                ) : (
                  <span className="text-emerald-600 text-xs font-medium">Al día</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}

      {showModal && (
        <Modal title="Nuevo socio" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'RUT *',      key: 'rut',       placeholder: '12345678-9' },
              { label: 'Nombre *',   key: 'nombre',    placeholder: 'Juan' },
              { label: 'Apellido *', key: 'apellido',  placeholder: 'Pérez' },
              { label: 'Teléfono',   key: 'telefono',  placeholder: '912345678' },
              { label: 'Dirección',  key: 'direccion', placeholder: 'Av. Principal 123' },
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
