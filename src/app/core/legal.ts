/**
 * Datos del responsable del tratamiento (Ley 1581 de 2012, art. 17 y Decreto 1074 de 2015, art. 2.2.2.25.3.1).
 * Completar los campos marcados con [COMPLETAR] antes de publicar: la política no es válida sin ellos.
 */
export const LEGAL = {
  brand: 'Cuidado & Vida',
  ownerName: '[COMPLETAR: razón social o nombre completo del titular]',
  ownerId: '[COMPLETAR: NIT o cédula]',
  address: '[COMPLETAR: dirección física]',
  city: '[COMPLETAR: ciudad], Colombia',
  email: 'cuidadointegral.saluyvida@gmail.com',
  phoneDisplay: '+57 318 267 4695',
  whatsappNumber: '573182674695',
  /** Fecha de entrada en vigencia de la versión actual. Cambiarla cada vez que se modifique la política. */
  privacyVersion: '2026-11-19',
  termsVersion: '2026-11-19'
};

export function formatLegalDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
}
