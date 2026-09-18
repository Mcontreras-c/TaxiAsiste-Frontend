import axios from 'axios';

// Open-Meteo: sin API key, sin costo, sin cuenta -- ideal para este widget que
// solo necesita el clima de Santiago para la central. No pasa por apiClient
// (ese apunta al backend propio); esta es una llamada directa al servicio publico.
const LAT = -33.4489;
const LNG = -70.6693;

export interface HoraClima {
  hora: string;
  temperatura: number;
  codigo: number;
}

export interface ClimaSantiago {
  temperatura: number;
  codigo: number;
  proximasHoras: HoraClima[];
}

export async function getClimaSantiago(): Promise<ClimaSantiago> {
  const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: LAT,
      longitude: LNG,
      current: 'temperature_2m,weather_code',
      hourly: 'temperature_2m,weather_code',
      timezone: 'America/Santiago',
      forecast_days: 1,
    },
  });

  const idxActual = (data.hourly.time as string[]).indexOf(data.current.time);
  const proximasHoras: HoraClima[] = [];
  if (idxActual >= 0) {
    for (let i = 1; i <= 3 && idxActual + i < data.hourly.time.length; i++) {
      proximasHoras.push({
        hora: (data.hourly.time[idxActual + i] as string).slice(11, 16),
        temperatura: Math.round(data.hourly.temperature_2m[idxActual + i]),
        codigo: data.hourly.weather_code[idxActual + i],
      });
    }
  }

  return {
    temperatura: Math.round(data.current.temperature_2m),
    codigo: data.current.weather_code,
    proximasHoras,
  };
}

// Codigos WMO (https://open-meteo.com/en/docs) agrupados a descripciones simples.
export function descripcionClima(codigo: number): string {
  if (codigo === 0) return 'Despejado';
  if ([1, 2, 3].includes(codigo)) return 'Parcialmente nublado';
  if ([45, 48].includes(codigo)) return 'Neblina';
  if ([51, 53, 55, 56, 57].includes(codigo)) return 'Llovizna';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return 'Lluvia';
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) return 'Nieve';
  if ([95, 96, 99].includes(codigo)) return 'Tormenta eléctrica';
  return 'Sin datos';
}
