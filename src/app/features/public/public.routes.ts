import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    title: 'Cuidado & Vida · Enfermería y exámenes a domicilio',
    component: LandingComponent
  },
  {
    path: 'privacidad',
    title: 'Política de datos personales · Cuidado & Vida',
    loadComponent: () => import('./legal/privacy.component').then(m => m.PrivacyComponent)
  },
  {
    path: 'terminos',
    title: 'Términos y condiciones · Cuidado & Vida',
    loadComponent: () => import('./legal/terms.component').then(m => m.TermsComponent)
  },
  {
    path: 'eliminar-datos',
    title: 'Eliminar mis datos · Cuidado & Vida',
    loadComponent: () => import('./legal/delete-data.component').then(m => m.DeleteDataComponent)
  }
];
