import { useState } from 'react';
import { Box, Typography, Button, IconButton, TextField, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { X, Calculator, LocateFixed, Route } from 'lucide-react';
import { cotizarTarifa, type Cotizacion, type OrigenCotizacion } from '../api/mapas';
import { colors } from '../theme';

type ModoOrigen = 'hospital' | 'gps' | 'texto';

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
 * Cotizador de tarifa aproximada: origen por defecto el hospital (o "estoy
 * aqui" con el GPS del navegador, o una direccion), destino escrito. Muestra
 * cada ruta posible con su valor -- el monto depende del camino -- y el mapa
 * (fuera de este componente) dibuja la seleccionada.
 */
export default function CotizadorTarifa({ onCambio, activa, onActiva, cotizacion, onCerrar }: Props) {
  const [modo, setModo] = useState<ModoOrigen>('hospital');
  const [origenTexto, setOrigenTexto] = useState('');
  const [destino, setDestino] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obtenerOrigen = (): Promise<OrigenCotizacion> => {
    if (modo === 'hospital') return Promise.resolve({ tipo: 'hospital' });
    if (modo === 'texto') return Promise.resolve({ tipo: 'texto', texto: origenTexto.trim() });
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Este navegador no permite obtener la ubicación.'));
      navigator.geolocation.getCurrentPosition(
        p => resolve({ tipo: 'gps', lat: p.coords.latitude, lng: p.coords.longitude }),
        () => reject(new Error('No se pudo obtener tu ubicación. Revisa el permiso del navegador.')),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  };

  const calcular = async () => {
    if (!destino.trim()) { setError('Escribe la dirección de destino.'); return; }
    if (modo === 'texto' && !origenTexto.trim()) { setError('Escribe la dirección de origen.'); return; }
    setCalculando(true); setError(null);
    try {
      const origen = await obtenerOrigen();
      const resultado = await cotizarTarifa(origen, destino.trim());
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
        <ToggleButtonGroup
          exclusive fullWidth size="small" value={modo}
          onChange={(_, v: ModoOrigen | null) => { if (v) { setModo(v); limpiar(); } }}
          sx={{
            '& .MuiToggleButton-root': { color: 'rgba(255,255,255,.7)', borderColor: 'rgba(255,255,255,.18)', fontSize: 11.5, textTransform: 'none', py: 0.5 },
            '& .Mui-selected': { bgcolor: `${colors.accent500} !important`, color: `${colors.ink} !important`, fontWeight: 700 },
          }}
        >
          <ToggleButton value="hospital">Hospital</ToggleButton>
          <ToggleButton value="gps"><LocateFixed size={12} style={{ marginRight: 4 }} />Estoy aquí</ToggleButton>
          <ToggleButton value="texto">Otra</ToggleButton>
        </ToggleButtonGroup>
        {modo === 'hospital' && (
          <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', mt: 0.75 }}>Hospital Félix Bulnes, Cerro Navia</Typography>
        )}
        {modo === 'texto' && (
          <TextField
            fullWidth size="small" placeholder="Calle y número de origen" value={origenTexto}
            onChange={e => setOrigenTexto(e.target.value)} sx={{ ...campoSx, mt: 0.75 }}
          />
        )}
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
