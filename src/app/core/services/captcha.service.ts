import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/** API mínima de Cloudflare Turnstile que usamos (https://developers.cloudflare.com/turnstile/). */
interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window { turnstile?: TurnstileApi; }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Captcha del formulario público. Solo se activa si TURNSTILE_SITE_KEY está definida al compilar.
 * El token se verifica en el servidor (api/solicitud.js); en el navegador solo se obtiene.
 */
@Injectable({ providedIn: 'root' })
export class CaptchaService {
  readonly siteKey = environment.turnstileSiteKey;
  private loading?: Promise<TurnstileApi>;

  get enabled(): boolean { return !!this.siteKey; }

  /** Carga el script de Turnstile una sola vez, la primera vez que se abre el formulario. */
  private load(): Promise<TurnstileApi> {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    this.loading ??= new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile no se inicializó.'));
      script.onerror = () => { this.loading = undefined; reject(new Error('No se pudo cargar la verificación de seguridad.')); };
      document.head.appendChild(script);
    });
    return this.loading;
  }

  /** Dibuja el widget en `el`. `onToken` recibe el token, o null cuando vence o falla. Devuelve el id del widget. */
  async render(el: HTMLElement, onToken: (token: string | null) => void): Promise<string> {
    const turnstile = await this.load();
    return turnstile.render(el, {
      sitekey: this.siteKey,
      action: 'solicitud',
      language: 'es',
      theme: 'light',
      callback: (token: string) => onToken(token),
      'expired-callback': () => onToken(null),
      'error-callback': () => onToken(null)
    });
  }

  /** Cada token sirve una sola vez: tras un envío fallido hay que pedir uno nuevo. */
  reset(widgetId: string) { window.turnstile?.reset(widgetId); }

  remove(widgetId: string) { window.turnstile?.remove(widgetId); }
}
