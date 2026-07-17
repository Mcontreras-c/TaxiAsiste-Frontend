import { useEffect, useState } from 'react';
import { DollarSign, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Wallet, Info } from 'lucide-react';
import { getMovimientos, getBalance, type TesoreriaMovimiento, type Balance } from '../api/tesoreria';

const TIPO_COLOR = {
  INGRESO: 'bg-green-100 text-green-700',
  EGRESO:  'bg-red-100 text-red-600',
};

const CATEGORIA_LABEL: Record<string, string> = {
  CUOTA:             'Cuota',
  MULTA:             'Multa',
  GASTO_OPERACIONAL: 'Gasto Operacional',
  OTRO:              'Otro',
};

export default function TesoreriaAdmin() {
  const [movimientos, setMovimientos] = useState<TesoreriaMovimiento[]>([]);
  const [balance, setBalance]         = useState<Balance | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [m, b] = await Promise.all([getMovimientos(), getBalance()]);
      setMovimientos(m);
      setBalance(b);
    } catch {
      setError('No se pudo cargar la tesorería.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800">Tesorería</h1>
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
            Solo consulta
          </span>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Aviso */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Estás viendo la tesorería en modo <strong>solo lectura</strong>.
          Para registrar ingresos, egresos o pagos de cuotas, coordina con el <strong>Tesorero</strong>.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
          <button onClick={load} className="ml-auto underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Reintentar
          </button>
        </div>
      )}

      {/* Balance */}
      {balance && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos</p>
              <p className="text-xl font-bold text-green-600">${balance.ingresos.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Egresos</p>
              <p className="text-xl font-bold text-red-500">${balance.egresos.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${balance.balance >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <Wallet className={`w-5 h-5 ${balance.balance >= 0 ? 'text-blue-600' : 'text-orange-500'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance</p>
              <p className={`text-xl font-bold ${balance.balance >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                ${balance.balance.toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Historial */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600">Historial de movimientos</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Registrado por', 'Monto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No hay movimientos registrados.
                  </td>
                </tr>
              ) : movimientos.map(m => (
                <tr key={m.id_movimiento} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(m.fecha).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${TIPO_COLOR[m.tipo]}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{CATEGORIA_LABEL[m.categoria]}</td>
                  <td className="px-4 py-3 text-gray-700">{m.descripcion}</td>
                  <td className="px-4 py-3 text-gray-500">{m.usuario_nombre ?? '—'}</td>
                  <td className={`px-4 py-3 font-semibold ${m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-500'}`}>
                    {m.tipo === 'EGRESO' ? '-' : '+'}${Number(m.monto).toLocaleString('es-CL')}
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
