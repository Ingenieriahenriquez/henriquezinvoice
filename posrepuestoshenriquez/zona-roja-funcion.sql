-- Zona Roja: función que borra los datos operativos saltándose RLS,
-- pero SOLO si quien la ejecuta es superadministrador.
-- Pégala en Supabase -> SQL Editor y presiona "Run" una sola vez.

create or replace function public.zona_roja_reiniciar_sistema()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid() and rol = 'superadministrador'
  ) then
    raise exception 'No autorizado: se requiere rol superadministrador';
  end if;

  delete from factura_items;
  delete from abonos;
  delete from facturas;
  delete from clientes;
  delete from productos;
end;
$$;

grant execute on function public.zona_roja_reiniciar_sistema() to authenticated;
