// Función de Vercel: POST /api/solicitud
// Recibe el formulario «Solicitar un servicio», verifica el captcha (Cloudflare Turnstile) y recién entonces
// guarda la solicitud en Supabase. Cuando supabase/captcha-solo-servidor.sql está aplicado, esta es la ÚNICA
// forma de crear solicitudes: los visitantes ya no pueden insertar directo con la clave pública.
//
// Variables de entorno (Vercel → Settings → Environment Variables), SECRETAS, nunca en el frontend:
//   TURNSTILE_SECRET_KEY       clave secreta del widget de Turnstile
//   SUPABASE_SERVICE_ROLE_KEY  clave secreta de Supabase (sb_secret_… o service_role)
//   SUPABASE_URL               la misma URL pública que usa el frontend

const MAX_NAME = 100;
const MAX_PHONE = 20;
const MAX_SERVICE = 120;
const MAX_VERSION = 20;

const text = v => (typeof v === 'string' ? v.trim() : '');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const { TURNSTILE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!TURNSTILE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('api/solicitud: faltan TURNSTILE_SECRET_KEY, SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
    return res.status(500).json({ error: 'El formulario no está disponible en este momento.' });
  }

  // ── 1. Validación de datos (mismos límites que la tabla en Supabase) ──
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = text(body.client_name);
  const phone = text(body.client_phone);
  const service = text(body.service_type);
  const version = text(body.privacy_policy_version);
  const token = text(body.captchaToken);
  const digits = phone.replace(/\D/g, '');
  const validPhone = phone.length <= MAX_PHONE && (digits.length === 10 || (digits.length === 12 && digits.startsWith('57')));

  if (name.length < 3 || name.length > MAX_NAME || !validPhone || !service || service.length > MAX_SERVICE
      || !version || version.length > MAX_VERSION || body.privacy_accepted !== true) {
    return res.status(400).json({ error: 'Revise los datos del formulario.' });
  }
  if (!token || token.length > 2048) {
    return res.status(400).json({ error: 'Falta la verificación de seguridad.' });
  }

  // ── 2. Verificación del captcha con Cloudflare ──
  try {
    const form = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (ip) form.set('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const result = await r.json();
    if (result.success !== true) {
      return res.status(403).json({ error: 'No pudimos confirmar la verificación de seguridad.' });
    }
  } catch (err) {
    console.error('api/solicitud: error verificando Turnstile', err);
    return res.status(502).json({ error: 'No pudimos confirmar la verificación de seguridad.' });
  }

  // ── 3. Guardar en Supabase (el trigger de la tabla fuerza estado, fechas y límites antispam) ──
  const key = SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`; // claves antiguas (JWT service_role)

  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/client_requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        client_name: name,
        client_phone: phone,
        service_type: service,
        status: 'Pendiente',
        privacy_accepted_at: new Date().toISOString(),
        privacy_policy_version: version
      })
    });
    if (r.ok) return res.status(201).json({ ok: true });

    const detail = await r.json().catch(() => ({}));
    // P0001 = límite antispam del trigger (supabase/seguridad-formulario.sql): su mensaje está pensado para el cliente.
    if (detail.code === 'P0001' && typeof detail.message === 'string') {
      return res.status(429).json({ error: detail.message });
    }
    console.error('api/solicitud: Supabase respondió', r.status, detail);
    return res.status(500).json({ error: 'No pudimos registrar su solicitud.' });
  } catch (err) {
    console.error('api/solicitud: error guardando en Supabase', err);
    return res.status(500).json({ error: 'No pudimos registrar su solicitud.' });
  }
};
