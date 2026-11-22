import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Qué se genera como HTML al compilar (prerender) y qué se arma solo en el navegador.
 * Las páginas públicas salen como HTML real: Google, WhatsApp y Facebook leen su contenido sin ejecutar JavaScript.
 * El panel admin y las URLs desconocidas usan index.csr.html (ver vercel.json).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'privacidad', renderMode: RenderMode.Prerender },
  { path: 'terminos', renderMode: RenderMode.Prerender },
  { path: 'eliminar-datos', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client }
];
