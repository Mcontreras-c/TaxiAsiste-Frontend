import { describe, expect, it } from 'vitest';
import { HOME_POR_ROL, tieneAcceso, type Rol } from './permisos';

describe('tieneAcceso', () => {
  it('permite el acceso cuando el rol esta en la lista de la ruta', () => {
    expect(tieneAcceso('Administrador', '/dashboard')).toBe(true);
    expect(tieneAcceso('Central', '/solicitudes')).toBe(true);
    expect(tieneAcceso('Tesorero', '/tesoreria')).toBe(true);
  });

  it('deniega el acceso cuando el rol no esta en la lista de la ruta', () => {
    expect(tieneAcceso('Tesorero', '/dashboard')).toBe(false);
    expect(tieneAcceso('Central', '/tesoreria')).toBe(false);
    expect(tieneAcceso('Conductor', '/socios')).toBe(false);
  });

  it('deniega el acceso a una ruta que no existe en NAV_ITEMS', () => {
    expect(tieneAcceso('Administrador', '/ruta-inexistente')).toBe(false);
  });

  it('Conductor solo tiene acceso a /conductor', () => {
    const rol: Rol = 'Conductor';
    expect(tieneAcceso(rol, '/conductor')).toBe(true);
    expect(tieneAcceso(rol, '/dashboard')).toBe(false);
    expect(tieneAcceso(rol, '/solicitudes')).toBe(false);
    expect(tieneAcceso(rol, '/reportes')).toBe(false);
    expect(tieneAcceso(rol, '/tesoreria')).toBe(false);
    expect(tieneAcceso(rol, '/socios')).toBe(false);
  });
});

describe('HOME_POR_ROL', () => {
  it('cada rol tiene una pagina de inicio a la que efectivamente tiene acceso', () => {
    // Evita que HOME_POR_ROL y NAV_ITEMS.roles se desincronicen sin que
    // nadie lo note -- si esto fallara, el login redirigiria a un rol a una
    // pantalla que RoleRoute (App.tsx) le va a rebotar inmediatamente.
    (Object.entries(HOME_POR_ROL) as [Rol, string][]).forEach(([rol, home]) => {
      expect(tieneAcceso(rol, home)).toBe(true);
    });
  });
});
