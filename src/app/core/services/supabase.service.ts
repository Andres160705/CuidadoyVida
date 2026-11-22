import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface Nurse {
  id?: string;
  full_name: string;
  specialty: string;
  phone: string;
  experience_years: number;
  status: 'Disponible' | 'Asignada' | 'Descanso';
  created_at?: string;
}

export interface ClientRequest {
  id?: string;
  client_name: string;
  client_phone: string;
  service_type: string;
  status: 'Pendiente' | 'Asignado' | 'Completado';
  shift_date?: string | null; // YYYY-MM-DD
  nurse_id?: string | null;
  privacy_accepted_at?: string;
  privacy_policy_version?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  
  public currentUser = signal<User | null>(null);
  public isLoading = signal<boolean>(false);

  constructor() {
    // Valores públicos (ver src/environments). La seguridad de los datos depende de las políticas RLS en Supabase.
    this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey);
    
    this.supabase.auth.getSession().then(({ data }) => {
      this.currentUser.set(data.session?.user ?? null);
    });

    this.supabase.auth.onAuthStateChange((_, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  // --- AUTENTICACIÓN ---
  async login(email: string, pass: string) {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      return data;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session?.user) {
      this.currentUser.set(data.session.user);
      return data.session;
    }
    return null;
  }

  /** ¿El usuario logueado está en la tabla admin_users? Sin eso, RLS le devuelve listas vacías. */
  async isAdmin(): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('is_admin');
    return !error && data === true;
  }

  /** Token de la sesión actual, para autenticar las llamadas al backend propio (/api). */
  async getAccessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async logout() {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
  }

  // --- CRUD DE ENFERMERAS ---
  async getNurses(): Promise<Nurse[]> {
    const { data, error } = await this.supabase.from('nurses').select('*').order('full_name');
    if (error) throw error;
    return data as Nurse[];
  }

  async createNurse(nurse: Nurse): Promise<Nurse> {
    const { data, error } = await this.supabase.from('nurses').insert([nurse]).select().single();
    if (error) throw error;
    return data as Nurse;
  }

  async updateNurse(id: string, nurse: Partial<Nurse>): Promise<Nurse> {
    const { data, error } = await this.supabase.from('nurses').update(nurse).eq('id', id).select().single();
    if (error) throw error;
    return data as Nurse;
  }

  async deleteNurse(id: string): Promise<void> {
    const { error } = await this.supabase.from('nurses').delete().eq('id', id);
    if (error) throw error;
  }

  // --- SOLICITUDES DE CLIENTES ---
  async getClientRequests(): Promise<ClientRequest[]> {
    const { data, error } = await this.supabase.from('client_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as ClientRequest[];
  }

  /** Los visitantes anónimos suelen poder insertar pero no leer (RLS), por eso no se pide la fila de vuelta. */
  async createClientRequest(request: ClientRequest): Promise<void> {
    const { error } = await this.supabase.from('client_requests').insert([request]);
    if (error) throw error;
  }

  /** Borra definitivamente una solicitud pendiente o completada (también se usa para atender pedidos de supresión de datos). */
  async deleteClientRequest(id: string): Promise<void> {
    const { error } = await this.supabase.from('client_requests').delete().eq('id', id).in('status', ['Pendiente', 'Completado']);
    if (error) throw error;
  }

  /** Borra definitivamente todas las solicitudes completadas. */
  async deleteCompletedRequests(): Promise<void> {
    const { error } = await this.supabase.from('client_requests').delete().eq('status', 'Completado');
    if (error) throw error;
  }

  /** Asigna la solicitud: guarda estado, fecha del turno y enfermera. */
  async assignRequest(id: string, nurseId: string, shiftDate?: string | null): Promise<void> {
    const { error } = await this.supabase.from('client_requests')
      .update({ status: 'Asignado', nurse_id: nurseId, shift_date: shiftDate || null }).eq('id', id);
    if (error) throw error;
  }

  /** Cierra el turno: la solicitud queda Completada y la enfermera vuelve a estar Disponible. */
  async completeRequest(id: string, nurseId?: string | null): Promise<void> {
    const { error } = await this.supabase.from('client_requests').update({ status: 'Completado' }).eq('id', id);
    if (error) throw error;
    if (nurseId) await this.updateNurse(nurseId, { status: 'Disponible' });
  }

}
