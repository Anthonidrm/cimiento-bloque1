\set ON_ERROR_STOP on
-- ===== Primer acceso e historial de cambios =====
do $$ begin
  update profiles set must_change_password = true where id in (t.u(5), t.u(3));
  perform t.as_user(t.u(5));
  perform t.check((select must_change_password from profiles where id = t.u(5)), 'El estudiante empieza con "debe definir su contraseña"');
  perform complete_first_access();
  perform t.check(not (select must_change_password from profiles where id = t.u(5)), 'Al completar el primer acceso la marca se limpia');
  perform t.as_user(t.u(3));
  perform t.check((select must_change_password from profiles where id = t.u(3)), 'complete_first_access() solo toca la marca de QUIEN llama (el maestro sigue pendiente)');
  perform t.check(t.fails('select complete_first_access()') = false, 'El maestro puede completar su propio primer acceso');
  perform t.as_user(t.u(5));
  perform t.check(t.rows(format('update profiles set must_change_password = true where id = %L', t.u(5))) = 0, 'Nadie reactiva la marca por su cuenta');
  perform t.check(t.rows(format('update profiles set role = ''ADMINISTRADOR'' where id = %L', t.u(5))) = 0, 'El estudiante NO puede subirse el rol');
end $$;
do $$ begin
  perform t.as_user(t.u(1));
  perform t.check(t.rows(format('update profiles set role = ''MAESTRO'' where id = %L', t.u(6))) = 1, 'Admin cambia un rol');
  perform t.check(t.rows(format('update profiles set role = ''ESTUDIANTE'' where id = %L', t.u(6))) = 1, 'Admin lo restituye');
  perform t.check((select count(*) from change_log where table_name = 'profiles' and action = 'UPDATE' and done_by = t.u(1) and row_key = t.u(6)::text) >= 2, 'Historial: queda quién hizo cada cambio de rol');
  perform t.check((select (old_data ->> 'role') from change_log where table_name = 'profiles' and action = 'UPDATE' and done_by = t.u(1) and row_key = t.u(6)::text order by done_at limit 1) = 'ESTUDIANTE', 'Historial: guarda el valor anterior');
  perform t.as_user(t.u(2));
  perform t.check((select count(*) from change_log) >= 2, 'Pastor puede leer el historial de cambios');
  perform t.check(t.fails('delete from change_log') or t.rows('delete from change_log') = 0, 'Pastor no borra el historial');
  perform t.as_user(t.u(3));
  perform t.check((select count(*) from change_log) = 0, 'Maestro NO ve el historial de cambios');
  perform t.check(t.fails('insert into change_log(table_name, action) values (''x'',''x'')'), 'Nadie escribe en el historial a mano');
  perform t.as_user(t.u(5));
  perform t.check((select count(*) from change_log) = 0, 'Estudiante NO ve el historial de cambios');
end $$;
