\set ON_ERROR_STOP on
-- ===== Endurecimiento: anon sin acceso, funciones internas cerradas, teacher_prep protegida, diagnóstico =====
select t.check((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v','m','S') and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert'))) = 0, 'anon no tiene acceso a NINGUNA tabla, vista ni secuencia de public');
select t.check((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')) = 0, 'anon no puede ejecutar NINGUNA función de public');
select t.check((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('notify','recompute_lesson_score','generate_assignment_alerts','generate_reminders') and has_function_privilege('authenticated', p.oid, 'execute')) = 0, 'Los usuarios NO pueden ejecutar las funciones internas (notify, recompute_lesson_score, alertas, recordatorios)');
select t.check((select count(*) from unnest(array['my_profile()','exam_answer(int,text,text,jsonb)','guide_add_seconds(int,int,int)','presentation_add_seconds(int,int,int,uuid)','teacher_prep(uuid,int)','start_class(int,uuid)','end_class(uuid)','session_event(uuid,text,jsonb)','session_note(uuid,text)','set_participation(uuid,int,int)','grade_submission(uuid,int,text)','complete_first_access()','cimiento_health()']) f where has_function_privilege('authenticated', f::regprocedure, 'execute')) = 13, 'Las 13 funciones que SÍ usa la app siguen ejecutables por los usuarios con sesión');
select t.check((select count(*) from unnest(array['my_profile()','exam_answer(int,text,text,jsonb)','start_class(int,uuid)','teacher_prep(uuid,int)','cimiento_health()','complete_first_access()']) f where has_function_privilege('anon', f::regprocedure, 'execute')) = 0, 'Ninguna de ellas es ejecutable sin sesión');

-- Objetos creados DESPUÉS también quedan cerrados para anon (privilegios por defecto)
create table public.zz_prueba_futura(id int);
create function public.zz_funcion_futura() returns int language sql as $$ select 1 $$;
select t.check(not has_table_privilege('anon', 'public.zz_prueba_futura', 'select') and not has_function_privilege('anon', 'public.zz_funcion_futura()', 'execute'), 'Una tabla/función creada en el futuro tampoco queda abierta para anon');
drop function public.zz_funcion_futura(); drop table public.zz_prueba_futura;

do $$ begin
  -- Un visitante sin sesión no puede llamar nada
  execute 'set local role anon';
  perform t.check(t.fails('select my_profile()') and t.fails('select teacher_prep(null, 1)') and t.fails('select cimiento_health()'), 'Sin sesión (anon): ni my_profile, ni teacher_prep, ni el diagnóstico');
  execute 'reset role';
  -- Funciones internas cerradas para usuarios reales
  perform t.as_user(t.u(5));
  perform t.check(t.fails(format('select notify(%L, ''SPAM'', ''x'', ''x'', ''{}'')', t.u(3))), 'Un estudiante NO puede mandar notificaciones falsas a otros');
  perform t.check(t.fails(format('select recompute_lesson_score(%L, 1)', t.u(5))), 'Un estudiante NO puede recalcular puntuaciones');
  perform t.check(t.fails('select generate_assignment_alerts()') and t.fails('select generate_reminders()'), 'Nadie dispara a mano las alertas ni recordatorios');
  -- teacher_prep: solo la propia, o cualquiera si es staff
  perform t.check((select count(*) from teacher_prep(t.u(3), 1)) = 0, 'Un estudiante NO ve la preparación de un maestro');
  perform t.check((select count(*) from teacher_prep(t.u(5), 1)) = 1, '…solo la propia');
  perform t.as_user(t.u(4));
  perform t.check((select count(*) from teacher_prep(t.u(3), 1)) = 0 and (select count(*) from teacher_prep(t.u(4), 1)) = 1, 'Un maestro NO ve la preparación de otro maestro; sí la suya');
  perform t.as_user(t.u(3));
  perform t.check((select count(*) from teacher_prep(t.u(3), 1)) = 1, 'El maestro ve la suya');
  perform t.as_user(t.u(2));
  perform t.check((select count(*) from teacher_prep(t.u(3), 1)) = 1, 'El Pastor ve la de cualquier maestro');
  perform t.as_user(t.u(1));
  perform t.check((select count(*) from teacher_prep(t.u(3), 1)) = 1, 'El Administrador ve la de cualquier maestro');
end $$;

-- Diagnóstico: solo el Administrador
delete from exam_questions;   -- (último archivo de pruebas) para comprobar que el diagnóstico detecta semillas ausentes
do $$ declare h jsonb; begin
  perform t.as_user(t.u(2));
  perform t.check(t.fails('select cimiento_health()'), 'El Pastor NO puede ver el diagnóstico');
  perform t.as_user(t.u(3));
  perform t.check(t.fails('select cimiento_health()'), 'El maestro NO puede ver el diagnóstico');
  perform t.as_user(t.u(1));
  h := cimiento_health();
  perform t.check(jsonb_typeof(h->'checks') = 'array' and jsonb_array_length(h->'checks') >= 12, 'El Administrador recibe la lista de comprobaciones');
  perform t.check((select (c->>'ok')::boolean from jsonb_array_elements(h->'checks') c where c->>'name' like 'Permisos por fila%'), 'Diagnóstico: RLS activo en todas las tablas');
  perform t.check((select (c->>'ok')::boolean from jsonb_array_elements(h->'checks') c where c->>'name' like 'Migración 0003%'), 'Diagnóstico: los 3 buckets privados existen');
  perform t.check((select (c->>'ok')::boolean from jsonb_array_elements(h->'checks') c where c->>'name' like 'Migraciones 0006%'), 'Diagnóstico: la evaluación suma 100 y existe ended_by');
  perform t.check((select (c->>'ok')::boolean from jsonb_array_elements(h->'checks') c where c->>'name' like 'Migración 0008%'), 'Diagnóstico: anon sin acceso');
  perform t.check((select (c->>'ok')::boolean from jsonb_array_elements(h->'checks') c where c->>'name' like 'Hay al menos un Administrador%'), 'Diagnóstico: hay Administrador');
  perform t.check(not (select (c->>'ok')::boolean from jsonb_array_elements(h->'checks') c where c->>'name' like 'Semillas: claves del examen%'), 'Diagnóstico: detecta que faltan las claves del examen en el servidor');
  perform t.check((h->>'ok')::boolean = false, 'Con una comprobación obligatoria fallida el resultado global es NO');
end $$;
