// Normaliza a minuscula ascii: quita tildes/dieresis (incluida la ñ, que se
// descompone en "n" + tilde combinante al aplicar NFD) y cualquier caracter
// que no sea a-z0-9, para que sirva como usuario o como parte de un email.
function aAsciiPlano(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Ej: "Juan" + "Soto" -> "jsoto". Vacio si falta nombre o apellido. */
export function sugerirUsername(nombre: string, apellido: string): string {
  const inicial = aAsciiPlano(nombre).slice(0, 1);
  const ape = aAsciiPlano(apellido);
  if (!inicial || !ape) return '';
  return `${inicial}${ape}`;
}

/** Ej: "María" + "Contreras" -> "maria.contreras@example.cl". */
export function sugerirEmail(nombre: string, apellido: string): string {
  const n = aAsciiPlano(nombre);
  const a = aAsciiPlano(apellido);
  if (!n || !a) return '';
  return `${n}.${a}@example.cl`;
}
