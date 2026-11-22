// Se ejecuta solo después de `npm run build`. Usa SITE_URL (de .env o del hosting) para:
//  · poner la URL absoluta de la imagen para compartir (og:image) en index.html,
//  · generar robots.txt y sitemap.xml con el dominio real.
// Sin SITE_URL el build no falla: quita las etiquetas que la necesitan y no genera el sitemap.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'dist/cuidadoy-vida/browser';
const PUBLIC_ROUTES = ['/', '/privacidad', '/terminos', '/eliminar-datos'];

const env = { ...process.env };
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

// En Vercel, si no se define SITE_URL, se usa el dominio de producción que Vercel expone al compilar.
const vercelDomain = env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
let site = (env.SITE_URL || vercelDomain).trim().replace(/\/+$/, '');
if (site && !/^https:\/\/[^/\s]+$/.test(site)) {
  console.error(`\n✖ SITE_URL debe ser solo el dominio con https, por ejemplo https://www.su-dominio.com (recibido: "${site}").\n`);
  process.exit(1);
}

// Todas las páginas: las prerenderizadas (index.html, privacidad/index.html…) y index.csr.html (panel y 404).
const htmlFiles = readdirSync(OUT, { recursive: true }).map(String).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
  const path = `${OUT}/${file}`;
  let html = readFileSync(path, 'utf8');
  html = site
    ? html.replaceAll('__SITE_URL__', site)
    : html.split('\n').filter(l => !l.includes('__SITE_URL__')).join('\n');
  writeFileSync(path, html);
}

const robots = ['User-agent: *', 'Disallow: /admin', ...(site ? ['', `Sitemap: ${site}/sitemap.xml`] : []), ''].join('\n');
writeFileSync(`${OUT}/robots.txt`, robots);

if (site) {
  const urls = PUBLIC_ROUTES.map(p => `  <url><loc>${site}${p === '/' ? '/' : p}</loc></url>`).join('\n');
  writeFileSync(`${OUT}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  console.log(`✔ og:image, robots.txt y sitemap.xml generados para ${site}`);
} else {
  console.warn('⚠ Sin SITE_URL: se generó robots.txt sin sitemap y se omitió og:image. Defina SITE_URL al tener el dominio.');
}
