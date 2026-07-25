# TaxiAsiste Frontend — Contexto del proyecto

Panel web para los roles **Administrador, Central y Tesorero** del sindicato TaxiAsiste.
El rol **Conductor** y **Paletero** NO tienen pantallas aca — esos van solo en la app mobile
(repo `TaxiAsiste-Mobile`).

## Stack
- React 19 + Vite + TypeScript + Tailwind CSS
- Zustand con `persist` para el auth store
- React Router v7 con rutas protegidas y por rol
- Servidor: `npm run dev` (necesita el backend Django corriendo en `http://localhost:8000`)

## Estructura
- `src/api/` — un archivo por dominio (auth, moviles, socios, solicitudes, tesoreria, reportes),
  todos usan `apiClient` (axios) de `src/api/client.ts`
- `src/pages/` — una pantalla por rol/funcion (ej: `SolicitudesCentral.tsx`, `TesoreriaAdmin.tsx`)
- `src/types/index.ts` — tipos TS que reflejan los serializers del backend
- `config/permisos.ts` y `NAV_ITEMS` — controlan que ve cada rol en el menu

## Roles y logins de prueba
| Usuario    | Password     | Rol           |
|------------|--------------|---------------|
| admin      | admin123     | Administrador |
| central    | central123   | Central       |
| tesorero   | tesorero123  | Tesorero      |

(`conductor` y `paletero` existen en la BD pero NO tienen acceso a este frontend — son solo
para la app mobile)

## Flujo de negocio relevante (ver tambien CONTEXTO.md del repo Backend)
- Las solicitudes PENDIENTES son visibles para todos los conductores en la app mobile;
  el primero que las acepta se las asigna el sistema (no requiere que la Central intervenga)
- Si nadie las toma desde la ruta, la Central puede asignarlas manualmente a un movil
  puntual desde la pantalla de Solicitudes (modal "Avanzar estado" -> selecciona movil)
- La pantalla de Solicitudes (Central) tiene una columna "Fila Virtual (Base)" de solo
  lectura que muestra los moviles esperando en base (ordenados por posicion), para que la
  Central sepa a quien ofrecerle un viaje puntual si es necesario
- Los estados reales de una solicitud: PENDIENTE -> ASIGNADO -> EN_CURSO -> COMPLETADO
  (o CANCELADO en cualquier punto antes de COMPLETADO)

## Notas
- El backend debe correr con `python manage.py runserver 0.0.0.0:8000` (ver detalles
  y gotchas de entorno en `CONTEXTO.md` del repo `TaxiAsiste-Backend`)
- CORS solo permite `localhost:3000` y `localhost:5173` en `settings.py` del backend —
  si cambias el puerto del dev server hay que agregarlo ahi
