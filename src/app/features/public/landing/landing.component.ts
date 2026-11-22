import { Component, ElementRef, HostListener, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
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
}

/** Único número de contacto del sitio: WhatsApp, llamadas y pie de página salen de aquí. */
export const WHATSAPP_NUMBER = '573182674695';
export const PHONE_DISPLAY = '+57 318 267 4695';

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
  errors = signal<FormErrors>({});
  submitError = signal<string | null>(null);
  submitOk = signal(false);
  isSubmitting = signal(false);
  private lastFocus: HTMLElement | null = null;

  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;

  readonly steps = [
    { n: '1', title: 'Cuéntenos qué necesita', text: 'Escríbanos por WhatsApp o deje sus datos en el formulario. Sin trámites ni esperas.' },
    { n: '2', title: 'Le confirmamos el servicio', text: 'Asignamos al profesional adecuado y se confirmaria por WhatsApp la fecha de la visita.' },
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

  constructor(private supabase: SupabaseService) {
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
    setTimeout(() => this.dialog?.nativeElement.querySelector<HTMLElement>('#req-name')?.focus());
  }

  closeRequestModal() {
    this.showRequestModal.set(false);
    this.lastFocus?.focus?.();
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
    if (this.clientName.trim().length < 3) errors.name = 'Escriba su nombre completo.';
    const digits = this.clientPhone.replace(/\D/g, '');
    if (digits.length < 10) errors.phone = 'Escriba un número de 10 dígitos para poder llamarle.';
    if (!this.selectedService) errors.service = 'Elija el servicio que necesita.';
    if (!this.acceptPrivacy) errors.consent = 'Para enviar la solicitud debe autorizar el tratamiento de sus datos.';
    return errors;
  }

  async submitClientRequest(event: Event) {
    event.preventDefault();
    if (this.isSubmitting()) return;

    const errors = this.validate();
    this.errors.set(errors);
    this.submitError.set(null);
    const firstInvalid = (['name', 'phone', 'service', 'consent'] as const).find(k => errors[k]);
    if (firstInvalid) {
      const id = { name: 'req-name', phone: 'req-phone', service: 'req-service', consent: 'req-consent' }[firstInvalid];
      this.dialog?.nativeElement.querySelector<HTMLElement>('#' + id)?.focus();
      return;
    }

    this.isSubmitting.set(true);
    try {
      await this.supabase.createClientRequest({
        client_name: this.clientName.trim(),
        client_phone: this.clientPhone.trim(),
        service_type: this.selectedService,
        status: 'Pendiente',
        // Prueba de la autorización (Decreto 1074 de 2015, art. 2.2.2.25.2.5). Requiere backend/supabase-consentimiento.sql.
        privacy_accepted_at: new Date().toISOString(),
        privacy_policy_version: LEGAL.privacyVersion
      });
      this.submitOk.set(true);
    } catch {
      this.submitError.set('No pudimos registrar su solicitud. Inténtelo de nuevo o escríbanos por WhatsApp.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  get fallbackWhatsapp(): string {
    return this.whatsappLink(`Hola, soy ${this.clientName.trim() || 'un cliente'} y necesito: ${this.selectedService}. Mi teléfono: ${this.clientPhone.trim()}.`);
  }
}
