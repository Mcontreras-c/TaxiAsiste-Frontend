import { useEffect, useState } from 'react';
import { Users, Plus, Search, RefreshCw, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { getSocios, createSocio } from '../api/socios';
import type { Socio } from '../types';

const ESTADO_COLOR: Record<string, string> = {
  ACTIVO:   'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-gray-500',
  BLOQUEADO:'bg-red-100 text-red-600',
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
  const [socios, setSocios]     = useState<Socio[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState<FormData>(EMPTY);
  const [saving, setSaving]     = useState(false);
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800">Socios</h1>
          <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {socios.length}
          </span>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(EMPTY); setFormError(null); }}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Nuevo socio
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o RUT..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" />
          {error}
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
                {['RUT', 'Nombre', 'Teléfono', 'Dirección', 'Estado', 'Ingreso', 'Cuotas vencidas'].map(h => (
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
                    No hay socios registrados.
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id_socio} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-gray-700">{s.rut}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.nombre_completo}</td>
                  <td className="px-4 py-3 text-gray-500">{s.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{s.direccion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[s.estado_socio]}`}>
                      {s.estado_socio}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(s.fecha_ingreso).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3">
                    {(s.cuotas_vencidas ?? 0) > 0 ? (
                      <span className="flex items-center gap-1 text-orange-600 font-semibold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {s.cuotas_vencidas}
                      </span>
                    ) : (
                      <span className="text-green-600 text-xs font-medium">Al día</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo socio */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Nuevo socio</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'RUT *',      key: 'rut',       placeholder: '12345678-9' },
                { label: 'Nombre *',   key: 'nombre',    placeholder: 'Juan' },
                { label: 'Apellido *', key: 'apellido',  placeholder: 'Pérez' },
                { label: 'Teléfono',   key: 'telefono',  placeholder: '912345678' },
                { label: 'Dirección',  key: 'direccion', placeholder: 'Av. Principal 123' },
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
