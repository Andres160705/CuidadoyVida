import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

/**
 * Deja entrar al panel solo a usuarios con sesión Y registrados como administradores (tabla admin_users).
 * Es la primera barrera; la que protege los datos de verdad son las políticas RLS de Supabase.
 */
export const authGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // Sesión en memoria, o recuperada de Supabase (soporta recargas con F5).
  const hasSession = !!supabaseService.currentUser() || !!(await supabaseService.getSession());
  if (!hasSession) {
    return router.createUrlTree(['/admin/login']);
  }

  // Con sesión pero sin permisos: se cierra la sesión para no dejarla abierta y se explica el motivo.
  if (!(await supabaseService.isAdmin())) {
    await supabaseService.logout();
    return router.createUrlTree(['/admin/login'], { queryParams: { motivo: 'sin-permiso' } });
  }

  return true;
};
