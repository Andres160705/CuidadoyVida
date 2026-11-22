import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL, formatLegalDate } from '../../../core/legal';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main id="contenido" class="legal-page">
      <div class="legal-wrap">
        <p class="legal-back"><a routerLink="/">← Volver al inicio</a></p>
        <h1>Política de Tratamiento de Datos Personales</h1>
        <p class="legal-meta">Vigente desde el {{ since }} · Ley 1581 de 2012 y Decreto 1074 de 2015</p>

        <h2>1. Quién es el responsable</h2>
        <p>
          {{ l.ownerName }} ({{ l.ownerId }}), que opera la marca {{ l.brand }}, con domicilio en {{ l.address }}, {{ l.city }}.
          Contacto: <a [href]="'mailto:' + l.email">{{ l.email }}</a> · {{ l.phoneDisplay }}.
        </p>

        <h2>2. Qué datos recogemos</h2>
        <ul>
          <li><strong>Formulario «Solicitar un servicio»:</strong> nombre completo, teléfono o WhatsApp, servicio que necesita y la fecha y hora en que aceptó esta política.</li>
          <li><strong>Si nos escribe por WhatsApp, correo o teléfono:</strong> los datos que usted mismo nos envíe.</li>
          <li><strong>Cuando prestamos el servicio:</strong> la fecha del turno y el profesional asignado.</li>
        </ul>
        <p>
          <strong>Datos sensibles.</strong> El servicio que usted elige puede revelar información sobre su salud o la de un familiar,
          que la ley considera un dato sensible. No está obligado a darnos datos sensibles: si prefiere no hacerlo, puede consultarnos
          por teléfono sin dejar sus datos en la web. Si los entrega, nos autoriza a tratarlos solo para las finalidades de esta política.
          No pedimos diagnósticos ni historia clínica a través del sitio web.
        </p>
        <p>El sitio no está dirigido a menores de edad. Si el servicio es para un menor, la solicitud debe hacerla su representante legal.</p>

        <h2>3. Para qué usamos sus datos</h2>
        <ul>
          <li>Contactarle para confirmar, programar y prestar el servicio que pidió.</li>
          <li>Asignar al profesional de enfermería y enviarle recordatorios del turno por WhatsApp o llamada.</li>
          <li>Atender sus consultas, peticiones, quejas y reclamos.</li>
          <li>Cumplir obligaciones legales, contables y tributarias.</li>
        </ul>
        <p>No vendemos ni cedemos sus datos, y no los usamos para publicidad sin una autorización aparte.</p>

        <h2>4. Con quién compartimos los datos</h2>
        <ul>
          <li><strong>El profesional asignado</strong>, solo lo necesario para atenderle.</li>
          <li><strong>Supabase Inc.</strong>, proveedor que aloja nuestra base de datos. Sus servidores pueden estar fuera de Colombia; actúa como encargado y solo trata los datos según nuestras instrucciones.</li>
          <li><strong>WhatsApp (Meta)</strong>, cuando usted nos escribe o le enviamos recordatorios por ese medio, según las condiciones de WhatsApp.</li>
          <li>Autoridades, cuando una ley u orden judicial lo exija.</li>
        </ul>

        <h2>5. Cuánto tiempo los guardamos</h2>
        <p>
          Mientras gestionamos y prestamos el servicio y hasta 12 meses después de terminado, para atender reclamos.
          Después los eliminamos, salvo que una norma nos obligue a conservarlos por más tiempo.
          Si usted pide la supresión antes, la atendemos según el punto 7.
        </p>

        <h2>6. Sus derechos</h2>
        <p>Como titular de los datos usted puede, de forma gratuita:</p>
        <ul>
          <li>Conocer, actualizar y rectificar sus datos.</li>
          <li>Pedir prueba de la autorización que nos dio.</li>
          <li>Saber qué uso le hemos dado a sus datos.</li>
          <li>Revocar la autorización y pedir que borremos sus datos, cuando no exista un deber legal o contractual de conservarlos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC), después de haber hecho la consulta o el reclamo ante nosotros.</li>
        </ul>

        <h2>7. Cómo ejercer sus derechos o pedir que borremos sus datos</h2>
        <p>
          Escríbanos a <a [href]="'mailto:' + l.email">{{ l.email }}</a> o por WhatsApp al {{ l.phoneDisplay }} indicando su nombre,
          el teléfono con el que hizo la solicitud y qué necesita. En la página
          <a routerLink="/eliminar-datos">Eliminar mis datos</a> tiene el mensaje listo para enviar.
        </p>
        <ul>
          <li><strong>Consultas</strong> (saber qué datos tenemos): respondemos en máximo 10 días hábiles, prorrogables 5 días hábiles más avisándole el motivo.</li>
          <li><strong>Reclamos</strong> (corregir, borrar o revocar): respondemos en máximo 15 días hábiles, prorrogables 8 días hábiles más avisándole el motivo.</li>
        </ul>
        <p>Podemos pedirle que confirme su identidad para evitar que otra persona acceda a sus datos o los borre.</p>
        <p>Área responsable de atender estas solicitudes: administración de {{ l.brand }}, en los mismos datos de contacto.</p>

        <h2>8. Cookies y seguridad</h2>
        <p>
          El sitio público no usa cookies de publicidad ni de analítica (no usamos Google Analytics ni el Pixel de Meta).
          Las tipografías se cargan desde Google Fonts, lo que hace que su navegador se conecte a servidores de Google.
          El panel interno de administración guarda la sesión del personal en el navegador para mantenerla iniciada.
          Protegemos los datos con acceso restringido por usuario y contraseña y conexiones cifradas (HTTPS).
        </p>

        <h2>9. Cambios a esta política</h2>
        <p>
          Si cambiamos esta política se lo informaremos en esta página indicando la nueva fecha de vigencia.
          Si el cambio afecta las finalidades, le pediremos de nuevo su autorización.
        </p>
      </div>
    </main>
  `
})
export class PrivacyComponent {
  readonly l = LEGAL;
  readonly since = formatLegalDate(LEGAL.privacyVersion);
}
