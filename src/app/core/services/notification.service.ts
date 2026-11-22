import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase.service';

export interface ShiftPayload {
  clientEmail: string;
  clientName: string;
  serviceType: string;
  nurseName: string;
  shiftDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private supabase: SupabaseService) {}

  /** Envía el token de la sesión del administrador; el backend lo valida y comprueba que sea admin. */
  assignShiftAndNotify(payload: ShiftPayload): Observable<any> {
    return from(this.supabase.getAccessToken()).pipe(
      switchMap(token => token
        ? this.http.post(`${this.apiUrl}/assign-shift`, payload, {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
          })
        : throwError(() => new Error('No hay una sesión de administrador activa.')))
    );
  }
}
