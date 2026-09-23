import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import {
  MapPin, Sun, Cloud, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, CloudFog,
} from 'lucide-react';
import { getClimaSantiago, descripcionClima, type ClimaSantiago } from '../api/clima';

function IconoClima({ codigo, size = 26 }: { codigo: number; size?: number }) {
  if (codigo === 0) return <Sun size={size} color="#f5a623" />;
  if ([1, 2, 3].includes(codigo)) return <Cloud size={size} color="#8a94a6" />;
  if ([45, 48].includes(codigo)) return <CloudFog size={size} color="#9aa3b0" />;
  if ([51, 53, 55, 56, 57].includes(codigo)) return <CloudDrizzle size={size} color="#3355a8" />;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return <CloudRain size={size} color="#3355a8" />;
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) return <CloudSnow size={size} color="#7d95d8" />;
  if ([95, 96, 99].includes(codigo)) return <CloudLightning size={size} color="#7e22ce" />;
  return <Cloud size={size} color="#8a94a6" />;
}

export default function ClimaWidget({ oscuro = false }: { oscuro?: boolean }) {
  const [clima, setClima] = useState<ClimaSantiago | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      getClimaSantiago()
        .then(c => { if (vivo) { setClima(c); setError(false); } })
        .catch(() => { if (vivo) setError(true); });
    };
    cargar();
    // El clima no cambia rapido -- cada 15 min es mas que suficiente y evita
    // gastar cuota de la API sin necesidad.
    const id = setInterval(cargar, 15 * 60 * 1000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  const colorTexto = oscuro ? 'rgba(255,255,255,.6)' : 'text.secondary';
  const colorValor = oscuro ? '#fff' : '#241f16';

  return (
    <Card sx={oscuro ? {
      borderRadius: 4, bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
      backdropFilter: 'blur(14px)', boxShadow: 'none',
    } : { borderRadius: 4 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: colorTexto }}>
          <MapPin size={13} />
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Santiago, CL</Typography>
        </Box>

        {error ? (
          <Typography sx={{ fontSize: 12, color: colorTexto }}>Clima no disponible</Typography>
        ) : !clima ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <CircularProgress size={15} sx={{ color: oscuro ? '#fff' : undefined }} />
            <Typography sx={{ fontSize: 12, color: colorTexto }}>Cargando clima...</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconoClima codigo={clima.codigo} />
              <Box>
                <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: colorValor }}>
                  {clima.temperatura}°C
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: colorTexto }}>
                  {descripcionClima(clima.codigo)}
                </Typography>
              </Box>
            </Box>

            {clima.proximasHoras.length > 0 && (
              <Box sx={{
                display: 'flex', justifyContent: 'space-between', pt: 1.25,
                borderTop: '1px solid', borderColor: oscuro ? 'rgba(255,255,255,.12)' : 'divider',
              }}>
                {clima.proximasHoras.map(h => (
                  <Box key={h.hora} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4 }}>
                    <Typography sx={{ fontSize: 10.5, color: colorTexto }}>{h.hora}</Typography>
                    <IconoClima codigo={h.codigo} size={16} />
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: colorValor }}>{h.temperatura}°</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
