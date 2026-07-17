import { useEffect, useState } from 'react';
import { Car, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { getMoviles } from '../api/moviles';
import type { Movil } from '../types';

const ESTADO_COLOR: Record<string, string> = {
  DISPONIBLE:  'bg-green-100 text-green-700',
  EN_SERVICIO: 'bg-blue-100 text-blue-700',
};

export default function MovilesCentralPage() {
  const [moviles, setMoviles] = useState<Movil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const all = await getMoviles();
      setMoviles(all.filter(m => m.estado_operativo === 'DISPONIBLE' || m.estado_operativo === 'EN_SERVICIO'));
    } catch {
      setError('No se pudieron cargar los móviles.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = moviles.filter(m =>
    `${m.patente} ${m.socio_nombre} ${m.marca} ${m.modelo}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800">Móviles</h1>
          <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {moviles.length} operativos
          </span>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por nombre, patente o marca..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
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
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Patente', 'Socio / Conductor', 'Teléfono', 'Vehículo', 'Año', 'Color', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">No hay móviles operativos.</td>
                </tr>
              ) : filtered.map(m => (
                <tr key={m.id_movil} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-gray-800">{m.patente}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{m.socio_nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{m.socio_telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{[m.marca, m.modelo].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.anio ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.color ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[m.estado_operativo]}`}>
                      {m.estado_operativo.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
