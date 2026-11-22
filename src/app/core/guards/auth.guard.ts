import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // Si hay usuario autenticado en memoria
  if (supabaseService.currentUser()) {
    return true;
  }

  // Verificar sesión directamente en Supabase (soporta recargas de página F5)
  const session = await supabaseService.getSession();
  if (session) {
    return true;
  }

  // Si no hay sesión, redirigir al login
  router.navigate(['/admin/login']);
  return false;
};
