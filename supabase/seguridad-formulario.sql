-- ═══════════════════════════════════════════════════════════════════════════
-- Seguridad del formulario público «Solicitar un servicio» (tabla client_requests)
--
-- La validación de la web se puede saltar: cualquiera con la clave pública puede
-- insertar directo en la API de Supabase. Este script hace que la BASE DE DATOS
-- imponga las reglas, sin importar desde dónde llegue la solicitud.
--
-- Cómo aplicarlo: Supabase → SQL Editor → pegar todo → Run.
-- Se puede ejecutar varias veces sin problema (es idempotente).
-- No borra ni modifica las solicitudes que ya existen.
-- ═══════════════════════════════════════════════════════════════════════════


-- 1) Límites de los datos ----------------------------------------------------
--    NOT VALID: se aplican a las filas nuevas sin rechazar las que ya existen.

alter table public.client_requests drop constraint if exists client_name_largo;
alter table public.client_requests add constraint client_name_largo
  check (char_length(btrim(client_name)) between 3 and 100) not valid;

alter table public.client_requests drop constraint if exists client_phone_formato;
alter table public.client_requests add constraint client_phone_formato
  check (
    char_length(client_phone) <= 20
    and client_phone ~ '^[0-9 +().-]+$'
    and char_length(regexp_replace(client_phone, '\D', '', 'g')) in (10, 12)
  ) not valid;

alter table public.client_requests drop constraint if exists service_type_largo;
alter table public.client_requests add constraint service_type_largo
  check (char_length(service_type) between 1 and 120) not valid;

alter table public.client_requests drop constraint if exists privacy_version_largo;
alter table public.client_requests add constraint privacy_version_largo
  check (privacy_policy_version is null or char_length(privacy_policy_version) <= 20) not valid;


-- 2) Valores que el visitante NO puede elegir --------------------------------
--    Toda solicitud nueva entra como Pendiente, sin enfermera ni fecha, y con la
--    hora del SERVIDOR (no la que mande el navegador). Así nadie puede crear
--    solicitudes «ya asignadas», falsificar la fecha de aceptación de la política
--    (prueba del consentimiento, Decreto 1074 de 2015) ni esquivar el límite de abajo.
--
-- 3) Freno contra spam -------------------------------------------------------
--    · Máximo 3 solicitudes por teléfono cada 24 horas.
--    · Máximo 50 solicitudes en total por hora (si alguien inunda el formulario,
--      los clientes reales siguen teniendo el botón de WhatsApp).

create or replace function public.client_requests_antes_de_insertar()
returns trigger
language plpgsql
security definer          -- puede contar filas aunque el visitante anónimo no pueda leerlas
set search_path = public
as $$
declare
  telefono text := right(regexp_replace(new.client_phone, '\D', '', 'g'), 10);
begin
  new.status               := 'Pendiente';
  new.nurse_id             := null;
  new.shift_date           := null;
  new.created_at           := now();
  new.privacy_accepted_at  := now();

  if (select count(*) from public.client_requests
       where right(regexp_replace(client_phone, '\D', '', 'g'), 10) = telefono
         and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Ya recibimos varias solicitudes con este teléfono. Escríbanos por WhatsApp.'
      using errcode = 'P0001';
  end if;

  if (select count(*) from public.client_requests
       where created_at > now() - interval '1 hour') >= 50 then
    raise exception 'Estamos recibiendo muchas solicitudes. Inténtelo más tarde o escríbanos por WhatsApp.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Nadie debe poder llamar la función por su cuenta; solo la usa el trigger.
revoke all on function public.client_requests_antes_de_insertar() from public, anon, authenticated;

drop trigger if exists client_requests_antes_de_insertar on public.client_requests;
create trigger client_requests_antes_de_insertar
  before insert on public.client_requests
  for each row execute function public.client_requests_antes_de_insertar();


-- 4) Comprobación (opcional) --------------------------------------------------
--    Debe listar las 4 restricciones y el trigger.
select conname as regla from pg_constraint
 where conrelid = 'public.client_requests'::regclass
   and conname in ('client_name_largo', 'client_phone_formato', 'service_type_largo', 'privacy_version_largo')
union all
select tgname from pg_trigger
 where tgrelid = 'public.client_requests'::regclass and tgname = 'client_requests_antes_de_insertar';
