import { useEffect, useState } from 'react';
import { Car, Plus, Search, RefreshCw, AlertCircle, X } from 'lucide-react';
import { getMoviles, createMovil } from '../api/moviles';
import { getSocios } from '../api/socios';
import type { Movil, Socio } from '../types';

const ESTADO_COLOR: Record<string, string> = {
  DISPONIBLE:  'bg-green-100 text-green-700',
  EN_SERVICIO: 'bg-blue-100 text-blue-700',
  BLOQUEADO:   'bg-red-100 text-red-600',
  INACTIVO:    'bg-gray-100 text-gray-500',
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800">Móviles</h1>
          <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {moviles.length}
          </span>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(EMPTY); setFormError(null); }}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Nuevo móvil
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por patente, socio o marca..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      {/* Error */}
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
                {['Patente', 'Socio', 'Vehículo', 'Año', 'Color', 'Estado', 'Registro'].map(h => (
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
                    No hay móviles registrados.
                  </td>
                </tr>
              ) : filtered.map(m => (
                <tr key={m.id_movil} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-gray-800">{m.patente}</td>
                  <td className="px-4 py-3 text-gray-700">{m.socio_nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{[m.marca, m.modelo].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.anio ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.color ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[m.estado_operativo]}`}>
                      {m.estado_operativo.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(m.fecha_registro).toLocaleDateString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo móvil */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Nuevo móvil</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Socio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Socio *</label>
                <select
                  value={form.id_socio}
                  onChange={e => setForm(f => ({ ...f, id_socio: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
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

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
