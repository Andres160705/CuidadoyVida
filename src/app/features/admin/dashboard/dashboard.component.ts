import { Component, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService, Nurse, ClientRequest } from '../../../core/services/supabase.service';

type Tab = 'requests' | 'nurses' | 'shifts' | 'notify';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  activeTab = signal<Tab>('requests');
  nurses = signal<Nurse[]>([]);
  requests = signal<ClientRequest[]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  showCompleted = signal(false);
  /** Sin marcar: pendientes y turnos en curso. Marcado: solo las completadas. */
  visibleRequests = computed(() => this.requests().filter(r => this.showCompleted() ? r.status === 'Completado' : r.status !== 'Completado'));
  completedCount = computed(() => this.requests().filter(r => r.status === 'Completado').length);
  pendingRequests = computed(() => this.requests().filter(r => r.status === 'Pendiente'));
  /** Solicitud con turno aún sin finalizar para esa enfermera (la fuente de verdad de si está ocupada). */
  activeShiftFor(nurseId?: string | null): ClientRequest | undefined {
    return nurseId ? this.requests().find(r => r.status === 'Asignado' && r.nurse_id === nurseId) : undefined;
  }
  availableNurses = computed(() => this.nurses().filter(n => n.status === 'Disponible' && !this.activeShiftFor(n.id)));

  // CRUD enfermeras
  showNurseModal = signal(false);
  currentNurse: Nurse = this.emptyNurse();
  isEditingNurse = false;
  nurseError = signal<string | null>(null);
  isSavingNurse = signal(false);

  // Asignación de turno
  selectedRequest: ClientRequest | null = null;
  selectedNurseId = '';
  shiftDate = '';
  clientNumber = '';
  minDate = '';
  shiftFeedback = signal<{ kind: 'ok' | 'error' | 'info'; text: string } | null>(null);
  isAssigning = signal(false);
  waFallbackUrl = signal<string | null>(null);


  constructor(
    public supabase: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.minDate = `${now.getFullYear()}-${month}-${day}`;
  }

  private emptyNurse(): Nurse {
    return { full_name: '', specialty: '', phone: '', experience_years: 1, status: 'Disponible' };
  }

  async loadData() {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      // Con RLS, un usuario que no está en admin_users recibe listas vacías sin error: se avisa claramente.
      if (!(await this.supabase.isAdmin())) {
        const email = this.supabase.currentUser()?.email ?? 'su correo';
        this.loadError.set(`Su usuario (${email}) no está registrado como administrador, por eso no ve solicitudes. ` +
          `Agréguelo en Supabase ejecutando: insert into public.admin_users (user_id) select id from auth.users where email = '${email}';`);
        this.nurses.set([]);
        this.requests.set([]);
        return;
      }
      const [nursesData, requestsData] = await Promise.all([
        this.supabase.getNurses(),
        this.supabase.getClientRequests()
      ]);
      this.nurses.set(nursesData);
      this.requests.set(requestsData);
    } catch (err: any) {
      this.loadError.set('No se pudieron cargar los datos desde Supabase. ' + (err?.message ?? ''));
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Enfermeras ───────────────────────────────────────────
  openNewNurseModal() {
    this.currentNurse = this.emptyNurse();
    this.isEditingNurse = false;
    this.nurseError.set(null);
    this.showNurseModal.set(true);
  }

  editNurse(nurse: Nurse) {
    this.currentNurse = { ...nurse };
    this.isEditingNurse = true;
    this.nurseError.set(null);
    this.showNurseModal.set(true);
  }

  async saveNurse(event: Event) {
    event.preventDefault();
    const n = this.currentNurse;
    if (n.full_name.trim().length < 3 || !n.specialty.trim() || n.phone.replace(/\D/g, '').length < 10) {
      this.nurseError.set('Complete nombre, especialidad y un teléfono válido de 10 dígitos.');
      return;
    }
    const busy = this.activeShiftFor(n.id);
    if (busy && n.status !== 'Asignada') {
      this.nurseError.set(`${n.full_name} tiene un turno activo con ${busy.client_name}. Finalícelo en Solicitudes antes de cambiar su estado.`);
      return;
    }
    this.isSavingNurse.set(true);
    this.nurseError.set(null);
    try {
      if (this.isEditingNurse && n.id) {
        await this.supabase.updateNurse(n.id, n);
      } else {
        await this.supabase.createNurse(n);
      }
      this.showNurseModal.set(false);
      await this.loadData();
    } catch (err: any) {
      this.nurseError.set('No se pudo guardar el perfil. ' + (err?.message ?? ''));
    } finally {
      this.isSavingNurse.set(false);
    }
  }

  async deleteNurse(nurse: Nurse) {
    if (!nurse.id || !confirm(`¿Eliminar el perfil de ${nurse.full_name}? Esta acción no se puede deshacer.`)) return;
    try {
      await this.supabase.deleteNurse(nurse.id);
      await this.loadData();
    } catch (err: any) {
      this.loadError.set('No se pudo eliminar el registro. ' + (err?.message ?? ''));
    }
  }

  // ── Turnos y recordatorio por WhatsApp ───────────────────
  selectRequestForShift(req: ClientRequest) {
    this.selectedRequest = req;
    this.clientNumber = req.client_phone ?? '';
    this.shiftFeedback.set(null);
    this.activeTab.set('shifts');
  }

  selectRequestForNotify(req: ClientRequest) {
    this.selectedRequest = req;
    this.clientNumber = req.client_phone ?? '';
    this.shiftFeedback.set(null);
    this.activeTab.set('notify');
  }

  /** Al elegir otra solicitud en el select, el número del cliente se rellena solo. */
  onRequestChange(req: ClientRequest | null) {
    this.clientNumber = req?.client_phone ?? '';
  }

  /** Deja solo dígitos y antepone 57 (Colombia) si es un celular de 10 dígitos. */
  private toWhatsappNumber(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return '57' + digits;
    if (digits.length === 12 && digits.startsWith('57')) return digits;
    return null;
  }

  private formatDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(y, m - 1, d));
  }

//Recordatorio WhatsApp
async assignShiftAndNotifyNotification(event: Event) {
     event.preventDefault();
    if (this.isAssigning()) return;

    const request = this.selectedRequest;
   // const nurse = this.nurses().find(n => n.id === this.selectedNurseId);
    const waNumber = this.toWhatsappNumber(this.clientNumber);

    if (!request?.id)  {
      this.shiftFeedback.set({ kind: 'error', text: 'Elija una solicitud' });
      return;
    }
    if (!waNumber) {
      this.shiftFeedback.set({ kind: 'error', text: 'El número del cliente debe tener 10 dígitos (ej. 300 123 4567).' });
      return;
    }
    // Comparación de fechas como texto (YYYY-MM-DD): evita el desfase de zona horaria de new Date('YYYY-MM-DD').
    // if (this.shiftDate < this.minDate) {
    //   this.shiftFeedback.set({ kind: 'error', text: 'La fecha ya pasó. Elija hoy o una fecha futura.' });
    //   return;
    // }

    const shiftDate = this.shiftDate;
    // Se abre la pestaña ahora, dentro del clic, para que el navegador no bloquee el popup tras las esperas.
    const waWindow = window.open('', '_blank');
    this.isAssigning.set(true);
    this.shiftFeedback.set({ kind: 'info', text: 'Guardando el turno…' });

    try {
     /*  await this.supabase.assignRequest(request.id, nurse.id!, shiftDate);
      await this.supabase.updateNurse(nurse.id!, { status: 'Asignada' }); */
    } catch (err: any) {
      waWindow?.close();
      this.shiftFeedback.set({ kind: 'error', text: 'No se pudo guardar el turno en Supabase. ' + (err?.message ?? '') });
      this.isAssigning.set(false);
      return;
    }

    const message = [
      `Hola ${request.client_name}, le confirmamos su servicio con Cuidado & Vida.`,
      '',
      `Servicio: ${request.service_type}`,
      //`Profesional: ${nurse.full_name}`,
      // `Fecha: ${this.formatDate(this.shiftDate)}`,
      '',
      'Este es su recordatorio. Quedamos al pendiente para asignar la fecha, si necesita mas informacion responda a este mensaje.'
    ].join('\n');
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    if (waWindow) waWindow.location.href = url;
    this.waFallbackUrl.set(waWindow ? null : url);

    this.requests.update(rs => rs.map(r => r.id === request.id ? { ...r, status: 'Pendiente', } : r));
    this.shiftFeedback.set({
      kind: 'ok',
      text: waWindow
        ? 'Turno asignado. Se abrió WhatsApp con el recordatorio listo para enviar al cliente.'
        : 'Turno asignado. Su navegador bloqueó la ventana: use el botón de abajo para abrir WhatsApp.'
    });
    this.selectedRequest = null;
    this.selectedNurseId = '';
    this.shiftDate = '';
    this.clientNumber = '';
    this.isAssigning.set(false);
  }

//Asignación de turno y recordatorio por WhatsApp
  async assignShiftAndNotify(event: Event) {
    event.preventDefault();
    if (this.isAssigning()) return;

    const request = this.selectedRequest;
    const nurse = this.nurses().find(n => n.id === this.selectedNurseId);
    const waNumber = this.toWhatsappNumber(this.clientNumber);

    if (!request?.id || !nurse)  {
      this.shiftFeedback.set({ kind: 'error', text: 'Elija la solicitud y la enfermera para el servicio.' });
      return;
    }
    const busy = this.activeShiftFor(nurse.id);
    if (busy) {
      this.shiftFeedback.set({ kind: 'error', text: `${nurse.full_name} ya tiene un turno activo con ${busy.client_name}. Finalícelo antes de asignarle otro.` });
      return;
    }
    if (!waNumber) {
      this.shiftFeedback.set({ kind: 'error', text: 'El número del cliente debe tener 10 dígitos (ej. 300 123 4567).' });
      return;
    }
    // Comparación de fechas como texto (YYYY-MM-DD): evita el desfase de zona horaria de new Date('YYYY-MM-DD').
    // if (this.shiftDate < this.minDate) {
    //   this.shiftFeedback.set({ kind: 'error', text: 'La fecha ya pasó. Elija hoy o una fecha futura.' });
    //   return;
    // }

    const shiftDate = this.shiftDate;
    // Se abre la pestaña ahora, dentro del clic, para que el navegador no bloquee el popup tras las esperas.
    const waWindow = window.open('', '_blank');
    this.isAssigning.set(true);
    this.shiftFeedback.set({ kind: 'info', text: 'Guardando el turno…' });

    try {
      await this.supabase.assignRequest(request.id, nurse.id!, shiftDate);
      await this.supabase.updateNurse(nurse.id!, { status: 'Asignada' });
    } catch (err: any) {
      waWindow?.close();
      this.shiftFeedback.set({ kind: 'error', text: 'No se pudo guardar el turno en Supabase. ' + (err?.message ?? '') });
      this.isAssigning.set(false);
      return;
    }

    const message = [
      `Hola ${request.client_name}, le confirmamos su servicio con Cuidado & Vida.`,
      '',
      `Servicio: ${request.service_type}`,
      `Profesional: ${nurse.full_name}`,
      // `Fecha: ${this.formatDate(this.shiftDate)}`,
      '',
      'Este es su recordatorio. Quedamos al pendiente para asignar la fecha, si necesita mas informacionresponda a este mensaje.'
    ].join('\n');
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    if (waWindow) waWindow.location.href = url;
    this.waFallbackUrl.set(waWindow ? null : url);

    this.requests.update(rs => rs.map(r => r.id === request.id ? { ...r, status: 'Asignado', nurse_id: nurse.id, shift_date: shiftDate || null } : r));
    this.nurses.update(ns => ns.map(n => n.id === nurse.id ? { ...n, status: 'Asignada' } : n));
    this.shiftFeedback.set({
      kind: 'ok',
      text: waWindow
        ? 'Turno asignado. Se abrió WhatsApp con el recordatorio listo para enviar al cliente.'
        : 'Turno asignado. Su navegador bloqueó la ventana: use el botón de abajo para abrir WhatsApp.'
    });
    this.selectedRequest = null;
    this.selectedNurseId = '';
    this.shiftDate = '';
    this.clientNumber = '';
    this.isAssigning.set(false);
  }
  

  // ── Finalizar turno ──────────────────────────────────────
  nurseName(id?: string | null): string {
    return this.nurses().find(n => n.id === id)?.full_name ?? 'Sin asignar';
  }

  /** El día del turno ya pasó (comparación como texto YYYY-MM-DD, sin desfase de zona horaria). */
  isOverdue(req: ClientRequest): boolean {
    return req.status === 'Asignado' && !!req.shift_date && req.shift_date < this.minDate;
  }

  formatShiftDate(iso?: string | null): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
  }

  async deleteCompletedRequests() {
    const n = this.completedCount();
    if (!n || !confirm(`¿Eliminar ${n} solicitud(es) completada(s)? Esta acción no se puede deshacer.`)) return;
    try {
      await this.supabase.deleteCompletedRequests();
      this.requests.update(rs => rs.filter(r => r.status !== 'Completado'));
      this.showCompleted.set(false);
    } catch (err: any) {
      this.loadError.set('No se pudieron eliminar las solicitudes. ' + (err?.message ?? ''));
    }
  }

  async deleteRequest(req: ClientRequest) {
    if (!req.id || req.status === 'Asignado' || !confirm(`¿Eliminar la solicitud de ${req.client_name}? Esta acción no se puede deshacer.`)) return;
    try {
      await this.supabase.deleteClientRequest(req.id);
      this.requests.update(rs => rs.filter(r => r.id !== req.id));
    } catch (err: any) {
      this.loadError.set('No se pudo eliminar la solicitud. ' + (err?.message ?? ''));
    }
  }

  async finishShift(req: ClientRequest) {
    if (!req.id) return;
    try {
      await this.supabase.completeRequest(req.id, req.nurse_id);
      this.requests.update(rs => rs.map(r => r.id === req.id ? { ...r, status: 'Completado' } : r));
      if (req.nurse_id) {
        this.nurses.update(ns => ns.map(n => n.id === req.nurse_id ? { ...n, status: 'Disponible' } : n));
      }
    } catch (err: any) {
      this.loadError.set('No se pudo finalizar el turno. ' + (err?.message ?? ''));
    }
  }

  async logout() {
    await this.supabase.logout();
    this.router.navigate(['/admin/login']);
  }
}
