\set ON_ERROR_STOP on
-- ===== Reemplazo de recursos por otra persona del staff =====
do $$ declare rid uuid; begin
  perform t.as_user(t.u(1));
  insert into resources(week, kind, slot, title, audience) values (7, 'GUIA', 'principal', 'Guía semana 7', 'MAESTRO') returning id into rid;
  insert into resource_versions(resource_id, storage_path, filename) values (rid, 'maestro/7/GUIA/principal/1-a.pdf', 'a.pdf');
  perform t.as_user(t.u(2));
  perform t.check(t.rows(format('insert into resource_versions(resource_id, storage_path, filename) values (%L, ''maestro/7/GUIA/principal/2-b.pdf'', ''b.pdf'')', rid)) = 1, 'El Pastor reemplaza un recurso subido por el Administrador');
  perform t.check((select count(*) from resource_versions where resource_id = rid) = 2 and (select count(*) from resource_versions where resource_id = rid and is_current) = 1, 'Quedan 2 versiones y solo 1 vigente (historial conservado)');
  perform t.check((select filename from resource_versions where resource_id = rid and is_current) = 'b.pdf', 'La vigente es la nueva');
  perform t.check((select uploaded_by from resource_versions where resource_id = rid and is_current) = t.u(2), 'La nueva versión queda a nombre del Pastor');
  perform t.check(t.fails(format('insert into resource_versions(resource_id, storage_path, filename, uploaded_by) values (%L, ''x/y.pdf'', ''y.pdf'', %L)', rid, t.u(1))), 'Nadie sube una versión a nombre de otra persona');
  perform t.as_user(t.u(1));
  perform t.check(t.rows(format('insert into resource_versions(resource_id, storage_path, filename) values (%L, ''maestro/7/GUIA/principal/3-c.pdf'', ''c.pdf'')', rid)) = 1, 'El Administrador reemplaza lo que subió el Pastor');
  perform t.as_user(t.u(3));
  perform t.check(t.fails(format('insert into resource_versions(resource_id, storage_path, filename) values (%L, ''z/z.pdf'', ''z.pdf'')', rid)), 'Un maestro NO reemplaza recursos oficiales');
  perform t.as_user(t.u(5));
  perform t.check(t.fails(format('insert into resource_versions(resource_id, storage_path, filename) values (%L, ''z/z.pdf'', ''z.pdf'')', rid)), 'Un estudiante NO reemplaza recursos');
  perform t.check((select count(*) from resource_versions where resource_id = rid) = 0, 'El estudiante no ve versiones de recursos para maestros');
end $$;
