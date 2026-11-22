import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="login-wrapper" id="contenido">
      <div class="login-card">
        <div class="login-header">
          <span class="brand-mark" aria-hidden="true">
            <svg class="icon" viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M12 11.5v6M9 14.5h6"/></svg>
          </span>
          <h1>Panel administrativo</h1>
          <p translate="no">Cuidado &amp; Vida · Acceso restringido</p>
        </div>

        @if (errorMessage()) {
          <div class="alert alert-error" role="alert">{{ errorMessage() }}</div>
        }

        <form (submit)="onLogin($event)">
          <div class="field">
            <label for="email">Correo electrónico</label>
            <input id="email" class="control" type="email" name="email" [(ngModel)]="email" required
                   autocomplete="username" spellcheck="false" placeholder="Ej. admin&#64;cuidadoyvida.com…">
          </div>
          <div class="field">
            <label for="password">Contraseña</label>
            <input id="password" class="control" type="password" name="password" [(ngModel)]="password" required
                   autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary full" [disabled]="supabase.isLoading()">
            {{ supabase.isLoading() ? 'Verificando…' : 'Iniciar sesión' }}
          </button>
        </form>

        <p class="back"><a routerLink="/">← Volver al sitio público</a></p>
      </div>
    </main>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100dvh; display: grid; place-items: center; padding: 1.25rem;
      background: radial-gradient(900px 500px at 15% -10%, #11695d 0%, transparent 60%), var(--brand-deep);
    }
    .login-card {
      width: 100%; max-width: 420px; padding: 2.25rem; background: var(--surface);
      border-radius: 24px; box-shadow: 0 30px 70px -25px rgba(0, 0, 0, 0.5);
    }
    .login-header { text-align: center; margin-bottom: 1.75rem; }
    .brand-mark {
      display: inline-grid; place-items: center; width: 52px; height: 52px; margin-bottom: 0.9rem;
      border-radius: 14px; background: var(--brand); color: #fff;
    }
    .brand-mark .icon { width: 28px; height: 28px; }
    h1 { font-family: var(--font-display); font-weight: 600; font-size: 1.7rem; color: var(--brand-deep); margin-bottom: 0.2rem; }
    .login-header p { color: var(--ink-soft); font-size: 0.93rem; }
    .full { width: 100%; margin-top: 0.4rem; }
    .back { text-align: center; margin-top: 1.4rem; font-size: 0.93rem; }
    .back a { color: var(--ink-soft); text-underline-offset: 3px; transition: color 0.15s var(--ease); }
    .back a:hover { color: var(--brand-deep); }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = signal<string | null>(null);

  constructor(public supabase: SupabaseService, private router: Router, route: ActivatedRoute) {
    // El guard del panel redirige aquí con ?motivo=sin-permiso si el usuario no es administrador.
    if (route.snapshot.queryParamMap.get('motivo') === 'sin-permiso') {
      this.errorMessage.set('Su usuario no tiene permisos de administrador. Pida a quien administra el sitio que le dé acceso.');
    }
  }

  async onLogin(event: Event) {
    event.preventDefault();
    this.errorMessage.set(null);
    try {
      await this.supabase.login(this.email.trim(), this.password);
      this.router.navigate(['/admin/dashboard']);
    } catch {
      this.errorMessage.set('Correo o contraseña incorrectos. Revise los datos e inténtelo de nuevo.');
    }
  }
}
