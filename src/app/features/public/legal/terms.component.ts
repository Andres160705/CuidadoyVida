import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL, formatLegalDate } from '../../../core/legal';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main id="contenido" class="legal-page">
      <div class="legal-wrap">
        <p class="legal-back"><a routerLink="/">← Volver al inicio</a></p>
        <h1>Términos y condiciones</h1>
        <p class="legal-meta">Vigentes desde el {{ since }}</p>

        <h2>1. Quiénes somos</h2>
        <p>
          Este sitio es operado por {{ l.ownerName }} ({{ l.ownerId }}), bajo la marca {{ l.brand }}, con domicilio en {{ l.address }}, {{ l.city }}.
          Contacto: <a [href]="'mailto:' + l.email">{{ l.email }}</a> · {{ l.phoneDisplay }}.
        </p>

        <h2>2. Qué ofrece el sitio</h2>
        <p>
          El sitio informa sobre nuestros servicios de salud a domicilio (toma de muestras de laboratorio, turnos de enfermería
          e inyectología) y le permite pedir que le contactemos. <strong>En el sitio no se hacen pagos ni compras.</strong>
        </p>

        <h2>3. Cómo funciona una solicitud</h2>
        <ul>
          <li>Enviar el formulario o escribirnos por WhatsApp es una <strong>solicitud de contacto</strong>, no una reserva confirmada.</li>
          <li>El servicio queda acordado cuando le confirmamos por teléfono o WhatsApp la fecha, el profesional y el precio final.</li>
          <li>Para la aplicación de medicamentos e inyectología es obligatorio presentar la fórmula médica vigente.</li>
        </ul>

        <h2>4. Precios</h2>
        <p>
          Los precios publicados están en pesos colombianos (COP) y son de referencia: el valor final depende del servicio,
          la ubicación y la duración, y se lo informamos antes de confirmar. Los precios pueden cambiar sin afectar servicios ya confirmados.
        </p>

        <h2>5. Cancelaciones y reprogramaciones</h2>
        <p>
          Puede cancelar o reprogramar un servicio confirmado avisándonos por WhatsApp o teléfono con la mayor anticipación posible.
          Las condiciones de cada servicio se le informan al confirmarlo.
        </p>

        <h2>6. No atendemos urgencias</h2>
        <p>
          Nuestros servicios son programados. <strong>Ante una urgencia o emergencia médica llame a la línea 123</strong>
          o acuda al servicio de urgencias más cercano.
        </p>

        <h2>7. Uso del sitio</h2>
        <p>
          Usted se compromete a dar datos verdaderos y a no usar el sitio para fines ilícitos ni para enviar solicitudes falsas.
          El tratamiento de sus datos se rige por nuestra <a routerLink="/privacidad">Política de Tratamiento de Datos Personales</a>.
        </p>

        <h2>8. Propiedad intelectual</h2>
        <p>
          Los textos, el logotipo y el diseño del sitio pertenecen a {{ l.brand }} o se usan con licencia de sus autores.
          No pueden copiarse para fines comerciales sin autorización.
        </p>

        <h2>9. Responsabilidad</h2>
        <p>
          La información del sitio es general y no reemplaza la consulta con su médico. Hacemos lo posible por mantener el sitio
          disponible y actualizado, pero puede haber interrupciones o errores que corregiremos en cuanto los detectemos.
        </p>

        <h2>10. Quejas y ley aplicable</h2>
        <p>
          Puede enviarnos peticiones, quejas o reclamos a los datos de contacto de arriba. Estos términos se rigen por la ley colombiana,
          incluido el Estatuto del Consumidor (Ley 1480 de 2011). Si no resolvemos su queja, puede acudir a la
          Superintendencia de Industria y Comercio (<a href="https://www.sic.gov.co" target="_blank" rel="noopener">www.sic.gov.co</a>).
        </p>
      </div>
    </main>
  `
})
export class TermsComponent {
  readonly l = LEGAL;
  readonly since = formatLegalDate(LEGAL.termsVersion);
}
