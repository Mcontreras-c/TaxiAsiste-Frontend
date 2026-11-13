import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Alert, CircularProgress, Avatar, Chip } from '@mui/material';
import { ListOrdered, RefreshCw } from 'lucide-react';
import { getFilaBase } from '../api/moviles';
import { getPerfilConductor } from '../api/conductor';
import type { FilaBase } from '../types';
import { colors } from '../theme';

export default function FilaVirtualConductor() {
  const [fila, setFila]           = useState<FilaBase[]>([]);
  const [miPatente, setMiPatente] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [f, perfil] = await Promise.all([getFilaBase(), getPerfilConductor()]);
      setFila(f.sort((a, b) => a.posicion - b.posicion));
      setMiPatente(perfil.movil?.patente ?? null);
    } catch {
      setError('No se pudo cargar la fila virtual.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, color: 'text.secondary' }}>
        <CircularProgress size={22} sx={{ mr: 1.5 }} /> Cargando...
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" action={<IconButton size="small" onClick={load}><RefreshCw size={16} /></IconButton>}>{error}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ListOrdered size={22} color="rgba(255,255,255,.92)" />
          <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 700, color: '#ffffff' }}>Fila Virtual</Typography>
        </Box>
        <IconButton onClick={load} sx={{ color: 'text.secondary' }}><RefreshCw size={16} /></IconButton>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Conductores en espera — Base</Typography>
        </Box>
        {fila.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 5, fontSize: 13 }}>Sin conductores en la fila.</Typography>
        ) : (
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {fila.map(f => {
              const esMio = f.patente === miPatente;
              return (
                <Box
                  key={f.id_fila}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                    borderRadius: 3, border: '1px solid', borderColor: esMio ? colors.accent500 : 'divider',
                    bgcolor: esMio ? 'rgba(255,222,0,.10)' : 'background.paper',
                  }}
                >
                  <Avatar sx={{
                    width: 30, height: 30, fontSize: 13, fontWeight: 700, color: colors.ink,
                    background: `linear-gradient(135deg, ${colors.accent300}, ${colors.accent600})`,
                  }}>
                    {f.posicion}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5, fontFamily: 'Roboto Mono, monospace' }}>{f.patente}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{f.socio_nombre}</Typography>
                  </Box>
                  {esMio && <Chip label="TÚ" size="small" sx={{ bgcolor: colors.accent500, color: colors.ink, fontWeight: 800, fontSize: 10.5 }} />}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
