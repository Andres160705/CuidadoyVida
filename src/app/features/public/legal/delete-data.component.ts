import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL } from '../../../core/legal';

const SUBJECT = 'Solicitud de supresión de datos personales';
const BODY = [
  'Hola, solicito que eliminen mis datos personales de su base de datos y revoco la autorización para tratarlos.',
  '',
  'Nombre completo: ',
  'Teléfono con el que hice la solicitud: ',
  '',
  'Gracias.'
].join('\n');

@Component({
  selector: 'app-delete-data',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main id="contenido" class="legal-page">
      <div class="legal-wrap">
        <p class="legal-back"><a routerLink="/">← Volver al inicio</a></p>
        <h1>Eliminar mis datos</h1>
        <p class="legal-lede">
          Puede pedir en cualquier momento que borremos sus datos y revocar la autorización que nos dio.
          Es gratis y no necesita explicar el motivo.
        </p>

        <div class="legal-actions">
          <a class="btn btn-primary" [href]="mailtoLink">Pedir por correo</a>
          <a class="btn btn-wa" [href]="whatsappLink" target="_blank" rel="noopener">Pedir por WhatsApp</a>
        </div>
        <p class="legal-note">Los botones abren un mensaje ya escrito. Solo complete su nombre y el teléfono con el que hizo la solicitud.</p>

        <h2>Qué pasa después</h2>
        <ul>
          <li>Podemos pedirle que confirme su identidad, para que nadie más pueda borrar o ver sus datos.</li>
          <li>Le respondemos en un plazo máximo de 15 días hábiles y le confirmamos cuando los datos estén eliminados.</li>
          <li>Si tiene un servicio en curso, primero lo cerramos y después borramos los datos.</li>
          <li>Solo conservaremos lo que una ley nos obligue a guardar, y se lo indicaremos.</li>
        </ul>
        <p>
          También puede escribir directamente a <a [href]="'mailto:' + l.email">{{ l.email }}</a>.
          Más información en la <a routerLink="/privacidad">Política de Tratamiento de Datos Personales</a>.
        </p>
      </div>
    </main>
  `
})
export class DeleteDataComponent {
  readonly l = LEGAL;
  readonly mailtoLink = `mailto:${LEGAL.email}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;
  readonly whatsappLink = `https://wa.me/${LEGAL.whatsappNumber}?text=${encodeURIComponent(BODY)}`;
}
