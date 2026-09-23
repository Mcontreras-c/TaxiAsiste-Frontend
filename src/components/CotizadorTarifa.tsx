import { useState } from 'react';
import { Box, Typography, Button, IconButton, TextField, CircularProgress } from '@mui/material';
import { X, Calculator, Route } from 'lucide-react';
import { cotizarTarifa, type Cotizacion } from '../api/mapas';
import { colors } from '../theme';

export interface EstadoCotizacion {
  cotizacion: Cotizacion;
  activa: number;
}

interface Props {
  /** Avisa la cotizacion vigente (o null) para que el mapa dibuje las rutas. */
  onCambio: (estado: EstadoCotizacion | null) => void;
  activa: number;
  onActiva: (indice: number) => void;
  cotizacion: Cotizacion | null;
  onCerrar: () => void;
}

const campoSx = {
  '& .MuiInputBase-root': { color: '#fff', bgcolor: 'rgba(255,255,255,.06)', borderRadius: 2, fontSize: 13 },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.18)' },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,.6)', fontSize: 13 },
};

const formatoMinutos = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;
const formatoKm = (m: number) => `${(m / 1000).toFixed(1)} km`;
const formatoPeso = (n: number) => `$${n.toLocaleString('es-CL')}`;

/**
 * Cotizador de tarifa aproximada: la salida es siempre el hospital (la app
 * mobile ofrece ademas "estoy aqui" y otra direccion), destino escrito. Muestra
 * cada ruta posible con su valor -- el monto depende del camino -- y el mapa
 * (fuera de este componente) dibuja la seleccionada.
 */
export default function CotizadorTarifa({ onCambio, activa, onActiva, cotizacion, onCerrar }: Props) {
  const [destino, setDestino] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calcular = async () => {
    if (!destino.trim()) { setError('Escribe la dirección de destino.'); return; }
    setCalculando(true); setError(null);
    try {
      // Central siempre cotiza desde el hospital (la salida de los pasajeros).
      const resultado = await cotizarTarifa({ tipo: 'hospital' }, destino.trim());
      onActiva(0);
      onCambio({ cotizacion: resultado, activa: 0 });
    } catch (e: unknown) {
      onCambio(null);
      const detalle = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detalle ?? (e instanceof Error ? e.message : 'No se pudo calcular la tarifa.'));
    } finally {
      setCalculando(false);
    }
  };

  const limpiar = () => { onCambio(null); setError(null); };

  return (
    <Box sx={{
      pointerEvents: 'auto', width: 320, maxHeight: '100%', overflowY: 'auto', p: 2,
      bgcolor: 'rgba(15,23,42,.82)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(14px)',
      boxShadow: '0 8px 24px rgba(0,0,0,.35)', borderRadius: 4, color: '#fff',
      display: 'flex', flexDirection: 'column', gap: 1.5,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Calculator size={16} color={colors.accent500} />
        <Typography sx={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Cotizar tarifa</Typography>
        <IconButton size="small" onClick={() => { limpiar(); onCerrar(); }} sx={{ color: 'rgba(255,255,255,.7)' }}>
          <X size={16} />
        </IconButton>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)', mb: 0.5, textTransform: 'uppercase' }}>
          Salida desde
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}>Hospital Félix Bulnes, Cerro Navia</Typography>
      </Box>

      <TextField
        fullWidth size="small" label="Dirección de destino" placeholder="Ej: Av. Pajaritos 3000, Maipú"
        value={destino} onChange={e => setDestino(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') calcular(); }} sx={campoSx}
      />

      <Button
        variant="contained" onClick={calcular} disabled={calculando}
        startIcon={calculando ? <CircularProgress size={14} /> : <Route size={15} />}
        sx={{ color: colors.ink, background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent500})` }}
      >
        {calculando ? 'Calculando...' : 'Calcular'}
      </Button>

      {error && <Typography sx={{ fontSize: 12, color: '#fca5a5' }}>{error}</Typography>}

      {cotizacion && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)' }}>
            Hacia: {cotizacion.destino.direccion}
          </Typography>
          {cotizacion.rutas.map((r, i) => (
            <Box
              key={i} onClick={() => { onActiva(i); onCambio({ cotizacion, activa: i }); }}
              sx={{
                cursor: 'pointer', p: 1.25, borderRadius: 2.5,
                border: '1px solid', borderColor: i === activa ? colors.accent500 : 'rgba(255,255,255,.14)',
                bgcolor: i === activa ? 'rgba(255,222,0,.1)' : 'rgba(255,255,255,.04)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: i === activa ? colors.accent500 : '#fff' }}>
                  {formatoPeso(r.tarifa_estimada)}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
                  {i === 0 ? 'Recomendada' : `Alternativa ${i}`}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>
                {formatoKm(r.distancia_m)} · {formatoMinutos(r.duracion_s)} · vía {r.resumen}
              </Typography>
            </Box>
          ))}
          <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)' }}>
            Valor aproximado según taxímetro (bajada {formatoPeso(cotizacion.bajada_de_bandera)}). Puede variar con el tráfico y la ruta real.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
