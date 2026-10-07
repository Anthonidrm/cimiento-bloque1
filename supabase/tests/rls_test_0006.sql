\set ON_ERROR_STOP on
-- ===== Pesos 45/25/15/15 (el significado del 15 % se prueba en rls_test_0007.sql) =====
select t.check((select (value->>'guide')::int || '/' || (value->>'exam')::int || '/' || (value->>'presentation')::int || '/' || (value->>'mandatory_activities')::int from app_config where key = 'prep_weights') = '45/25/15/15', 'Pesos configurados: guía 45, examen 25, presentación 15, actividades obligatorias del maestro 15');
select t.check((select (value->>'guide')::numeric + (value->>'exam')::numeric + (value->>'presentation')::numeric + (value->>'mandatory_activities')::numeric from app_config where key = 'prep_weights') = 100, 'Los pesos suman EXACTAMENTE 100');
select t.check(t.fails($q$update app_config set value = '{"guide":45,"exam":25,"presentation":15,"mandatory_activities":14}' where key = 'prep_weights'$q$), 'La base de datos RECHAZA pesos que suman 99');
select t.check((select value->>'guide' from app_config where key = 'prep_weights') = '45', 'Tras el intento fallido los pesos siguen intactos');
do $$ begin
  perform t.as_user(t.u(1));
  perform t.check(t.rows($q$update app_config set value = '{"guide":40,"exam":30,"presentation":15,"mandatory_activities":15}' where key = 'prep_weights'$q$) = 1, 'El Administrador SÍ puede reajustar los pesos si siguen sumando 100');
  perform t.check(t.fails($q$update app_config set value = '{"guide":40,"exam":30,"presentation":15,"mandatory_activities":10}' where key = 'prep_weights'$q$), '…pero no si no suman 100');
  perform t.check(t.rows($q$update app_config set value = '{"guide":45,"exam":25,"presentation":15,"mandatory_activities":15}' where key = 'prep_weights'$q$) = 1, 'Se restituyen 45/25/15/15');
  perform t.as_user(t.u(3));
  perform t.check(t.rows($q$update app_config set value = '{"guide":0,"exam":0,"presentation":0,"mandatory_activities":100}' where key = 'prep_weights'$q$) = 0, 'Un maestro NO puede cambiar los pesos');
end $$;
