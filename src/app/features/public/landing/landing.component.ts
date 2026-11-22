import { Component, ElementRef, HostListener, Injector, ViewChild, afterNextRender, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CaptchaService } from '../../../core/services/captcha.service';
import { LEGAL } from '../../../core/legal';

type ServiceCategory = 'Exámenes a domicilio' | 'Cuidado del adulto mayor' | 'Enfermería especializada';
type ServiceIcon = 'drop' | 'sun' | 'moon' | 'syringe';

interface ServiceCard {
  title: string;
  category: ServiceCategory;
  icon: ServiceIcon;
  description: string;
  price: string;
  unit: string;
 // warning: string
  features: string[];
  whatsappText: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  service?: string;
  consent?: string;
  captcha?: string;
}

/** El número de contacto vive solo en core/legal.ts: WhatsApp, llamadas, pie de página y páginas legales salen de ahí. */
const WHATSAPP_NUMBER = LEGAL.whatsappNumber;
const PHONE_DISPLAY = LEGAL.phoneDisplay;

/** Mismos límites que las restricciones de la tabla en Supabase (supabase/seguridad-formulario.sql). */
const MAX_NAME = 100;
const MAX_PHONE = 20;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  readonly phoneDisplay = PHONE_DISPLAY;
  readonly phoneHref = `tel:+${WHATSAPP_NUMBER}`;
  readonly year = new Date().getFullYear();

  menuOpen = signal(false);

  // Solicitud en línea
  showRequestModal = signal(false);
  clientName = '';
  clientPhone = '';
  selectedService = '';
  /** Casilla de autorización: siempre empieza sin marcar (Ley 1581 de 2012, autorización previa y expresa). */
  acceptPrivacy = false;
  readonly brand = LEGAL.brand;
  readonly email = LEGAL.email;
  errors = signal<FormErrors>({});
  submitError = signal<string | null>(null);
  submitOk = signal(false);
  isSubmitting = signal(false);
  private lastFocus: HTMLElement | null = null;

  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;

  readonly steps = [
    { n: '1', title: 'Cuéntenos qué necesita', text: 'Escríbanos por WhatsApp o deje sus datos en el formulario. Sin trámites ni esperas.' },
    { n: '2', title: 'Le confirmamos el servicio', text: 'Asignamos al profesional adecuado y le confirmamos por WhatsApp la fecha de la visita.' },
    { n: '3', title: 'Lo atendemos en casa', text: 'El profesional llega con equipos adecuados y, en los turnos, deja un reporte diario a la familia.' }
  ];

  readonly pillars = [
    { icon: 'shield', title: 'Bioseguridad en cada visita', text: 'Tubos, agujas y equipos estériles, con protocolo estricto de principio a fin.' },
    { icon: 'badge', title: 'Personal de enfermería capacitado', text: 'Profesionales calificados y auxiliares empáticos, seleccionados uno por uno.' },
    { icon: 'file', title: 'Reporte y resultados digitales', text: 'Resultados de laboratorio en 24 horas y reporte diario detallado en los turnos.' }
  ];

  readonly services: ServiceCard[] = [
    {
      title: 'Toma de laboratorio clínico',
      category: 'Exámenes a domicilio',
      icon: 'drop',
      description: 'Toma de examenes médicos, perfil lipídico, glicemia, parcial de orina y coprológico, y muchos mas sin salir de casa.',
      price: '$20.000 - 45.000',
      unit: 'desde, COP',
      features: ['Personal de enfermería matriculado', 'Tubos y equipos estériles', 'Resultados en 24 horas'],
      whatsappText: 'Hola, deseo agendar una toma de laboratorio clínico a domicilio.'
    },
    {
      title: 'Turno de enfermería de 12 horas',
      category: 'Cuidado del adulto mayor',
      icon: 'sun',
      description: 'Signos vitales, medicamentos, apoyo en movilidad y aseo personal, de día o de noche.',
      price: '$120.000',
      unit: 'por turno, COP',
      features: ['Enfermera calificada', 'Reporte diario detallado', 'Asistencia humanizada'],
      whatsappText: 'Hola, me interesa contratar un turno de enfermería de 12 horas para un adulto mayor.'
    },
    {
      title: 'Turno de enfermería de 24 horas',
      category: 'Cuidado del adulto mayor',
      icon: 'moon',
      description: 'Cuidado continuo, supervisión nocturna, signos vitales y compañía permanente.',
      price: '$210.000',
      unit: 'por día, COP',
      features: ['Cuidado sin interrupciones', 'Control médico estricto', 'Tranquilidad para su familia'],
      whatsappText: 'Hola, deseo información para contratar un turno de enfermería de 24 horas.'
    },
    {
      title: 'Medicamentos e inyectología',
      category: 'Enfermería especializada',
      icon: 'syringe',
      description: 'Aplicación de medicamentos intramusculares, intravenosos o subcutáneos con fórmula médica.',
      price: '$20.000 - 45.000',
      unit: 'desde, COP',
    //  wanring: '',
      features: ['Procedimiento seguro en casa', 'Verificación de la fórmula médica', 'Disponibilidad inmediata'],
      whatsappText: 'Hola, necesito el servicio de inyectología y aplicación de medicamentos a domicilio.'
    }
  ];

  // Captcha (Cloudflare Turnstile)
  private captchaToken: string | null = null;
  private captchaWidgetId: string | null = null;
  private injector = inject(Injector);

  constructor(private supabase: SupabaseService, readonly captcha: CaptchaService) {
    this.selectedService = this.services[0].title;
  }

  whatsappLink(text: string): string {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  readonly generalWhatsapp = this.whatsappLink('Hola, deseo información sobre sus servicios a domicilio.');
  readonly bookWhatsapp = this.whatsappLink('Hola, quiero agendar un servicio de salud a domicilio.');

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }

  // ── Modal ────────────────────────────────────────────────
  openRequestModal(serviceTitle?: string) {
    this.lastFocus = document.activeElement as HTMLElement | null;
    if (serviceTitle) this.selectedService = serviceTitle;
    this.clientName = '';
    this.clientPhone = '';
    this.acceptPrivacy = false;
    this.errors.set({});
    this.submitError.set(null);
    this.submitOk.set(false);
    this.closeMenu();
    this.showRequestModal.set(true);
    // afterNextRender y no setTimeout: con eventCoalescing el modal se pinta en el siguiente frame,
    // y un setTimeout(0) puede correr antes de que exista (el foco y el captcha fallaban).
    afterNextRender(() => {
      this.dialog?.nativeElement.querySelector<HTMLElement>('#req-name')?.focus();
      this.renderCaptcha();
    }, { injector: this.injector });
  }

  closeRequestModal() {
    this.removeCaptcha();
    this.showRequestModal.set(false);
    this.lastFocus?.focus?.();
  }

  private async renderCaptcha() {
    if (!this.captcha.enabled) return;
    const box = this.dialog?.nativeElement.querySelector<HTMLElement>('#captcha-box');
    if (!box) return;
    this.captchaToken = null;
    try {
      this.captchaWidgetId = await this.captcha.render(box, token => {
        this.captchaToken = token;
        if (token) this.errors.update(e => ({ ...e, captcha: undefined }));
      });
    } catch {
      this.errors.update(e => ({ ...e, captcha: 'No se pudo cargar la verificación de seguridad. Recargue la página o escríbanos por WhatsApp.' }));
    }
  }

  private removeCaptcha() {
    if (this.captchaWidgetId) this.captcha.remove(this.captchaWidgetId);
    this.captchaWidgetId = null;
    this.captchaToken = null;
  }

  /** Con captcha, la solicitud pasa por la función de Vercel (api/solicitud.js), que verifica el token y guarda. */
  private async sendViaApi(body: Record<string, unknown>): Promise<void> {
    const res = await fetch('/api/solicitud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data?.error === 'string' ? data.error : 'No pudimos registrar su solicitud.');
    }
  }



  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (!this.showRequestModal()) {
      if (e.key === 'Escape') this.closeMenu();
      return;
    }
    if (e.key === 'Escape') { this.closeRequestModal(); return; }
    if (e.key !== 'Tab' || !this.dialog) return;
    const focusables = Array.from(this.dialog.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  private validate(): FormErrors {
    const errors: FormErrors = {};
    const name = this.clientName.trim();
    if (name.length < 3) errors.name = 'Escriba su nombre completo.';
    else if (name.length > MAX_NAME) errors.name = `El nombre no puede tener más de ${MAX_NAME} caracteres.`;
    // 10 dígitos (celular o fijo colombiano), o 12 si incluye el indicativo 57.
    const digits = this.clientPhone.replace(/\D/g, '');
    const validPhone = digits.length === 10 || (digits.length === 12 && digits.startsWith('57'));
    if (!validPhone || this.clientPhone.trim().length > MAX_PHONE) errors.phone = 'Escriba un número de 10 dígitos para poder llamarle (ej. 300 123 4567).';
    if (!this.selectedService) errors.service = 'Elija el servicio que necesita.';
    if (!this.acceptPrivacy) errors.consent = 'Para enviar la solicitud debe autorizar el tratamiento de sus datos.';
    if (this.captcha.enabled && !this.captchaToken) errors.captcha = 'Espere a que termine la verificación de seguridad o márquela.';
    return errors;
  }

  async submitClientRequest(event: Event) {
    event.preventDefault();
    if (this.isSubmitting()) return;

    const errors = this.validate();
    this.errors.set(errors);
    this.submitError.set(null);
    const firstInvalid = (['name', 'phone', 'service', 'consent', 'captcha'] as const).find(k => errors[k]);
    if (firstInvalid) {
      const id = { name: 'req-name', phone: 'req-phone', service: 'req-service', consent: 'req-consent', captcha: 'captcha-box' }[firstInvalid];
      this.dialog?.nativeElement.querySelector<HTMLElement>('#' + id)?.focus();
      return;
    }

    this.isSubmitting.set(true);
    try {
      if (this.captcha.enabled) {
        await this.sendViaApi({
          client_name: this.clientName.trim(),
          client_phone: this.clientPhone.trim(),
          service_type: this.selectedService,
          privacy_accepted: true,
          privacy_policy_version: LEGAL.privacyVersion,
          captchaToken: this.captchaToken
        });
        this.removeCaptcha();
      } else {
        // Sin captcha configurado (desarrollo local): inserción directa en Supabase.
        await this.supabase.createClientRequest({
          client_name: this.clientName.trim(),
          client_phone: this.clientPhone.trim(),
          service_type: this.selectedService,
          status: 'Pendiente',
          // Prueba de la autorización (Decreto 1074 de 2015). La fecha definitiva la pone el servidor (supabase/seguridad-formulario.sql).
          privacy_accepted_at: new Date().toISOString(),
          privacy_policy_version: LEGAL.privacyVersion
        });
      }
      this.submitOk.set(true);
    } catch (err) {
      const detail = err instanceof Error && this.captcha.enabled ? err.message + ' ' : 'No pudimos registrar su solicitud. ';
      this.submitError.set(detail + 'Inténtelo de nuevo o escríbanos por WhatsApp.');
      // El token ya se gastó: se pide uno nuevo para el siguiente intento.
      if (this.captchaWidgetId) { this.captchaToken = null; this.captcha.reset(this.captchaWidgetId); }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  get fallbackWhatsapp(): string {
    return this.whatsappLink(`Hola, soy ${this.clientName.trim() || 'un cliente'} y necesito: ${this.selectedService}. Mi teléfono: ${this.clientPhone.trim()}.`);
  }
}
