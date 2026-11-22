import express, { NextFunction, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Lee backend/.env tanto con ts-node (backend/) como compilado (backend/dist/), sin importar desde dónde se arranque.
dotenv.config({ path: [path.resolve(__dirname, '.env'), path.resolve(__dirname, '..', '.env')] });

// Las credenciales solo se leen de variables de entorno (backend/.env, ver .env.example). Sin valores por defecto.
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
if (!SMTP_USER || !SMTP_PASS) {
  console.error('Faltan SMTP_USER y/o SMTP_PASS en las variables de entorno. Copie backend/.env.example como backend/.env.');
  process.exit(1);
}
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_PUBLISHABLE_KEY en las variables de entorno.');
  process.exit(1);
}

const app = express();
app.use(express.json());
// Solo el dominio del sitio puede llamar a la API desde un navegador.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

// Configuración de Nodemailer (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

interface ShiftAssignmentPayload {
  clientEmail: string;
  clientName: string;
  serviceType: string;
  nurseName: string;
  shiftDate: string; // ISO string
}

/**
 * Exige un token de sesión de Supabase válido (cabecera "Authorization: Bearer <token>")
 * de un usuario registrado en la tabla admin_users (ver supabase-rls.sql).
 */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ success: false, error: 'Falta el token de sesión.' });
  }
  try {
    // Cliente con la sesión del usuario: Supabase valida el token y aplica RLS como ese usuario.
    const supabase = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return res.status(401).json({ success: false, error: 'Sesión inválida o vencida.' });
    }
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError || isAdmin !== true) {
      return res.status(403).json({ success: false, error: 'No tiene permisos de administrador.' });
    }
    return next();
  } catch (err) {
    console.error('Error verificando la sesión:', err);
    return res.status(500).json({ success: false, error: 'No se pudo verificar la sesión.' });
  }
}

/** Evita que los datos del formulario inyecten HTML en los correos. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/assign-shift', requireAdmin, async (req: Request<{}, {}, ShiftAssignmentPayload>, res: Response) => {
  const body = req.body ?? ({} as ShiftAssignmentPayload);
  const fields = [body.clientEmail, body.clientName, body.serviceType, body.nurseName, body.shiftDate];
  if (fields.some(f => typeof f !== 'string' || !f.trim() || f.length > 200)) {
    return res.status(400).json({ success: false, error: 'Faltan datos requeridos en el payload' });
  }
  if (!EMAIL_RE.test(body.clientEmail) || Number.isNaN(new Date(body.shiftDate).getTime())) {
    return res.status(400).json({ success: false, error: 'Correo o fecha inválidos' });
  }
  const clientEmail = body.clientEmail.trim();
  const shiftDate = body.shiftDate;
  const clientName = escapeHtml(body.clientName.trim());
  const serviceType = escapeHtml(body.serviceType.trim());
  const nurseName = escapeHtml(body.nurseName.trim());

  try {
    // 1. Enviar correo de confirmación inmediata
    await transporter.sendMail({
      from: `"Cuidado & Vida - Notificaciones" <${SMTP_USER}>`,
      to: clientEmail,
      subject: `Confirmación de Turno - ${body.serviceType.trim()}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f2942; border-bottom: 2px solid #059669; padding-bottom: 10px;">Cuidado & Vida - Turno Confirmado</h2>
          <p>Estimado/a <b>${clientName}</b>,</p>
          <p>Nos complace informarle que su servicio de <b>${serviceType}</b> ha sido asignado exitosamente.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>👩‍⚕️ Profesional Asignada:</strong> ${nurseName}</p>
            <p><strong>📅 Fecha y Hora Programada:</strong> ${new Date(shiftDate).toLocaleString()}</p>
          </div>
          <p>Si tiene alguna duda o necesita reprogramar, contáctenos vía WhatsApp.</p>
          <p style="color: #64748b; font-size: 0.85rem; margin-top: 30px;">Atentamente,<br>Equipo de Gestión en Salud - Cuidado & Vida</p>
        </div>
      `
    });

    // 2. Programar recordatorio 24 horas antes
    const shiftTime = new Date(shiftDate).getTime();
    const reminderTime = shiftTime - (24 * 60 * 60 * 1000);
    const delay = reminderTime - Date.now();

    if (delay > 0) {
      setTimeout(async () => {
        try {
          await transporter.sendMail({
            from: `"Cuidado & Vida - Recordatorios" <${SMTP_USER}>`,
            to: clientEmail,
            subject: `Recordatorio: Su servicio médico es mañana`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f2942; border-bottom: 2px solid #0284c7; padding-bottom: 10px;">Recordatorio de Servicio</h2>
                <p>Hola <b>${clientName}</b>,</p>
                <p>Le recordamos que mañana está programado su servicio de <b>${serviceType}</b> con la enfermera <b>${nurseName}</b>.</p>
                <p>Por favor asegúrese de estar disponible en el domicilio indicado.</p>
                <p style="color: #64748b; font-size: 0.85rem; margin-top: 30px;">Cuidado & Vida</p>
              </div>
            `
          });
          console.log(`Recordatorio 24h enviado exitosamente a ${clientEmail}`);
        } catch (reminderErr) {
          console.error('Error al enviar correo recordatorio:', reminderErr);
        }
      }, delay);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Turno asignado, correo de confirmación enviado y recordatorio programado exitosamente.' 
    });

  } catch (error: any) {
    console.error('Error en el servidor de correo:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error interno al enviar notificaciones' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de notificaciones Node.js corriendo en puerto ${PORT}`);
});
