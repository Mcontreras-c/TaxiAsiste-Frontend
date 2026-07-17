import { useEffect, useState } from 'react';
import { Users, Search, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react';
import { getSocios } from '../api/socios';
import type { Socio } from '../types';

const ESTADO_COLOR: Record<string, string> = {
  ACTIVO:   'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-gray-600',
  BLOQUEADO:'bg-red-100 text-red-700',
};

export default function SociosTesorero() {
  const [socios, setSocios]   = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true); setError(null);
    try { setSocios(await getSocios()); }
    catch { setError('No se pudieron cargar los socios.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = socios.filter(s =>
    `${s.nombre_completo} ${s.rut}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalVencidas = socios.reduce((acc, s) => acc + (s.cuotas_vencidas ?? 0), 0);
  const morosos = socios.filter(s => (s.cuotas_vencidas ?? 0) > 0).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Socios</h1>
            <p className="text-sm text-gray-400">{socios.length} registrados</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{socios.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total socios</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{morosos}</p>
          <p className="text-xs text-gray-500 mt-1">Con cuotas vencidas</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{totalVencidas}</p>
          <p className="text-xs text-gray-500 mt-1">Cuotas vencidas totales</p>
        </div>
      </div>

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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
          <button onClick={load} className="ml-auto underline">Reintentar</button>
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
                {['RUT', 'Nombre', 'Teléfono', 'Dirección', 'Estado', 'Ingreso', 'Cuotas vencidas'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">No se encontraron socios.</td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id_socio} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.rut}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.nombre_completo}</td>
                  <td className="px-4 py-3 text-gray-600">{s.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{s.direccion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[s.estado_socio]}`}>
                      {s.estado_socio}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
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
    </div>
  );
}
