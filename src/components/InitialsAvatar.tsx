import { Avatar } from '@mui/material';
import { colors } from '../theme';

// Paleta fija de tintes para variar el avatar segun la persona (no es color semantico,
// solo identidad visual) - se elige de forma deterministica por el nombre.
const TINTS = [
  { bg: '#fdf1dc', fg: colors.accent700 },
  { bg: '#e8ecf9', fg: '#3355a8' },
  { bg: '#e4f3ec', fg: '#2f7d5b' },
  { bg: '#f3e8fd', fg: '#7e22ce' },
  { bg: '#fdece2', fg: '#c2410c' },
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
