import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/admin/login/login.component';
import { ADMIN_ROUTES } from './features/admin/admin.routes';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/public/public.routes').then(m => m.PUBLIC_ROUTES)
  },
  {
    path: 'admin/login',
    component: LoginComponent
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => ADMIN_ROUTES)
  },
  { path: '**', redirectTo: '' }
];
