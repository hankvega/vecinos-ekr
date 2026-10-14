-- =====================================================================
--  Restaura los roles originales de la tabla profiles: 'ekr' y 'voluntaria'.
--  Úsalo SOLO si antes cambiaste los roles a 'admin' / 'coordinador' / 'voluntario'.
--  Tus políticas de seguridad (es_ekr(), es_voluntaria()) dependen de esos nombres.
--  Es seguro ejecutarlo más de una vez.
-- =====================================================================
begin;

alter table public.profiles drop constraint if exists profiles_rol_check;

update public.profiles set rol = 'voluntaria' where rol = 'voluntario';
update public.profiles set rol = 'ekr'        where rol in ('coordinador', 'admin');

alter table public.profiles
  add constraint profiles_rol_check check (rol in ('voluntaria', 'ekr'));
alter table public.profiles alter column rol set default 'voluntaria';

commit;

-- Para darle acceso al panel a otra persona del equipo:
--   update public.profiles set rol = 'ekr', activo = true where email = 'persona@ejemplo.cl';
