-- Ejecuta esto UNA VEZ en Supabase → SQL Editor
-- Agrega la columna que guarda el rubro del negocio, sin afectar nada existente.
alter table configuracion
  add column if not exists tipo_negocio text default 'repuestos_vehiculos';
