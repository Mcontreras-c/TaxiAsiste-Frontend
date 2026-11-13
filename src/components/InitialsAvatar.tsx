import { Avatar } from '@mui/material';
import { colors } from '../theme';

// Paleta fija de tintes para variar el avatar segun la persona (no es color semantico,
// solo identidad visual) - se elige de forma deterministica por el nombre.
const TINTS = [
  { bg: 'rgba(255,222,0,.12)', fg: colors.accent700 },
  { bg: 'rgba(96,165,250,.14)', fg: '#60a5fa' },
  { bg: 'rgba(52,211,153,.14)', fg: '#34d399' },
  { bg: 'rgba(192,132,252,.14)', fg: '#c084fc' },
  { bg: 'rgba(251,146,60,.14)', fg: '#fb923c' },
];

// Algunos nombres vienen con "(RUT)" al final (ej: "Juan Perez (12345678-9)") - se descarta,
// tanto para las iniciales como para el hash de color (asi la misma persona se ve igual en toda la app).
function limpiar(nombreCompleto: string): string {
  return nombreCompleto.replace(/\(.*?\)/g, '').trim();
}

function iniciales(nombre: string): string {
  const partes = nombre.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function tintPara(nombre: string) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export function InitialsAvatar({ nombre: nombreCompleto, size = 32 }: { nombre: string; size?: number }) {
  const nombre = limpiar(nombreCompleto);
  const tint = tintPara(nombre);
  return (
    <Avatar sx={{
      width: size, height: size, fontSize: size * 0.38, fontWeight: 700,
      bgcolor: tint.bg, color: tint.fg,
    }}>
      {iniciales(nombre)}
    </Avatar>
  );
}
