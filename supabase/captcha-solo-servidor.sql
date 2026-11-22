-- ═══════════════════════════════════════════════════════════════════════════
-- Cerrar la puerta directa: las solicitudes solo entran por /api/solicitud (con captcha).
--
-- ⚠ EJECUTAR SOLO CUANDO el captcha ya funcione en producción:
--   1. Las variables TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY y SUPABASE_SERVICE_ROLE_KEY están en Vercel.
--   2. Se publicó el sitio y se envió una solicitud de prueba con éxito desde https://cuidadoy-vida.vercel.app.
-- Si se ejecuta antes, el formulario deja de funcionar.
--
-- Cómo aplicarlo: Supabase → SQL Editor → pegar → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Los visitantes anónimos (clave pública) ya no pueden insertar. La función de Vercel usa la clave
-- secreta (service_role), que sí puede, y el trigger de seguridad-formulario.sql sigue aplicando.
revoke insert on public.client_requests from anon;

-- Comprobación: debe devolver false.
select has_table_privilege('anon', 'public.client_requests', 'INSERT') as anon_puede_insertar;

-- Para deshacerlo (volver a permitir el formulario sin captcha):
--   grant insert on public.client_requests to anon;
