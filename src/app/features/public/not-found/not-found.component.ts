import { Component, OnDestroy, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

/**
 * Página para URLs que no existen. El hosting responde 200 (es una SPA), así que se marca noindex
 * para que Google no la tome como copia de la página de inicio (soft 404).
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main id="contenido" class="legal-page">
      <div class="legal-wrap">
        <h1>No encontramos esta página</h1>
        <p class="legal-lede">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
        <div class="legal-actions">
          <a class="btn btn-primary" routerLink="/">Ir al inicio</a>
        </div>
      </div>
    </main>
  `
})
export class NotFoundComponent implements OnDestroy {
  private meta = inject(Meta);

  constructor() {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  ngOnDestroy() {
    this.meta.removeTag('name="robots"');
  }
}
