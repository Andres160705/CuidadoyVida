// Genera src/environments/environment*.ts a partir de .env (o de las variables de entorno del hosting).
// Se ejecuta solo antes de `npm start`, `npm run build`, `npm run watch` y `npm test`.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const env = { ...process.env };
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const required = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];
const missing = required.filter(k => !env[k]);
if (missing.length) {
  console.error(`\n✖ Faltan variables: ${missing.join(', ')}. Copie .env.example como .env y complételo.\n`);
  process.exit(1);
}

// Freno de seguridad: la clave secreta NUNCA debe llegar al navegador.
const key = env.SUPABASE_PUBLISHABLE_KEY;
const isJwtServiceRole = (() => {
  try { return JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()).role === 'service_role'; }
  catch { return false; }
})();
if (key.startsWith('sb_secret_') || isJwtServiceRole) {
  console.error('\n✖ SUPABASE_PUBLISHABLE_KEY contiene una clave SECRETA (sb_secret_ / service_role). Use la "publishable" o "anon".\n');
  process.exit(1);
}

const file = (production, apiUrl) => `// ARCHIVO GENERADO por scripts/set-env.mjs desde .env. No editar ni subir a git.
export const environment = ${JSON.stringify({
  production,
  supabaseUrl: env.SUPABASE_URL,
  supabasePublishableKey: key,
  apiUrl
}, null, 2)};
`;

mkdirSync('src/environments', { recursive: true });
writeFileSync('src/environments/environment.ts', file(true, env.API_URL || '/api'));
writeFileSync('src/environments/environment.development.ts', file(false, env.API_URL_DEV || 'http://localhost:3000/api'));
console.log('✔ src/environments generado desde .env');
