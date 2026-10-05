\set ON_ERROR_STOP on
-- ===== Almacenamiento privado =====
do $$ begin
  perform t.check((select count(*) from storage.buckets where public) = 0 and (select count(*) from storage.buckets) = 3, 'Hay 3 buckets y NINGUNO es público');
  -- recursos
  perform t.as_user(t.u(1));
  perform t.check(t.rows('insert into storage.objects(bucket_id,name) values (''recursos'',''todos/1/PRESENTACION/principal/1-p.pptx''), (''recursos'',''maestro/1/GUIA/principal/1-g.pdf''), (''recursos'',''estudiante/1/HOJA_TRABAJO/principal/1-h.pdf'')') = 3, 'Administrador sube recursos');
  perform t.as_user(t.u(2));
  perform t.check(t.rows('insert into storage.objects(bucket_id,name) values (''recursos'',''todos/1/PRESENTACION/principal/2-p.pptx'')') = 1, 'Pastor también agrega/reemplaza recursos');
  perform t.check(t.rows('delete from storage.objects where name = ''todos/1/PRESENTACION/principal/1-p.pptx''') = 1, 'Pastor elimina la versión anterior');
  perform t.as_user(t.u(3));
  perform t.check((select count(*) from storage.objects where bucket_id = 'recursos') = 2 and (select count(*) from storage.objects where name like 'estudiante/%') = 0, 'Maestro lee los recursos para maestros y para todos, no los de estudiantes');
  perform t.check(t.fails('insert into storage.objects(bucket_id,name) values (''recursos'',''todos/1/PDF/principal/x.pdf'')'), 'Maestro NO sube ni reemplaza recursos oficiales');
  perform t.as_user(t.u(5));
  perform t.check((select count(*) from storage.objects where bucket_id = 'recursos') = 2 and (select count(*) from storage.objects where name like 'maestro/%') = 0, 'Estudiante ve los suyos y los generales; NO la guía del maestro');
  perform t.check(t.fails('insert into storage.objects(bucket_id,name) values (''recursos'',''todos/1/PDF/principal/y.pdf'')') and t.rows('delete from storage.objects where bucket_id = ''recursos''') = 0, 'Estudiante NO sube ni borra recursos');
  execute 'set local role anon';
  perform t.check(t.fails('select * from storage.objects'), 'Anónimo: sin acceso a ningún archivo');
end $$;
do $$ begin
  -- entregas (tarea abierta c..a1 de la semana 11; tarea cerrada c..02 de la semana 1)
  perform t.as_user(t.u(5));
  perform t.check(t.rows('insert into storage.objects(bucket_id,name) values (''entregas'',''c0000000-0000-0000-0000-0000000000a1/' || t.u(5) || '/1-tarea.pdf'')') = 1, 'Estudiante sube su entrega dentro de la ventana');
  perform t.check(t.fails('insert into storage.objects(bucket_id,name) values (''entregas'',''c0000000-0000-0000-0000-0000000000a1/' || t.u(6) || '/1-ajena.pdf'')'), 'No sube a la carpeta de otro estudiante');
  perform t.check(t.fails('insert into storage.objects(bucket_id,name) values (''entregas'',''c0000000-0000-0000-0000-000000000002/' || t.u(5) || '/1-tarde.pdf'')'), 'Fuera de la ventana: se bloquea la subida');
  perform t.check(t.rows('update storage.objects set name = name || ''x'' where bucket_id = ''entregas''') = 0 and t.rows('delete from storage.objects where bucket_id = ''entregas''') = 0, 'No edita ni borra lo entregado');
  perform t.as_user(t.u(6)); perform t.check((select count(*) from storage.objects where bucket_id = 'entregas') = 0, 'Otro estudiante no ve la entrega ajena');
  perform t.as_user(t.u(3)); perform t.check((select count(*) from storage.objects where bucket_id = 'entregas') = 1, 'El maestro asignado a la lección ve y descarga la entrega');
  perform t.as_user(t.u(4)); perform t.check((select count(*) from storage.objects where bucket_id = 'entregas') = 0, 'Otro maestro no ve entregas');
  perform t.as_user(t.u(2)); perform t.check((select count(*) from storage.objects where bucket_id = 'entregas') = 1, 'El Pastor ve las entregas');
end $$;
do $$ declare sid uuid; begin
  select id into sid from class_sessions where week = 11;
  perform t.as_user(t.u(3));
  perform t.check(t.rows(format('insert into storage.objects(bucket_id,name) values (''fotos'',''11/%s/foto1.jpg''), (''fotos'',''11/sin-clase/suelta.jpg'')', sid)) = 2, 'El maestro sube fotos');
  perform t.as_user(t.u(5));
  perform t.check((select count(*) from storage.objects where bucket_id = 'fotos') = 1, 'El estudiante del grupo ve solo la foto registrada de su clase');
  perform t.check(t.fails('insert into storage.objects(bucket_id,name) values (''fotos'',''11/sin-clase/mia.jpg'')'), 'El estudiante no sube fotos');
  perform t.as_user(t.u(7));
  perform t.check((select count(*) from storage.objects where bucket_id = 'fotos') = 0, 'Un estudiante de otro grupo no ve fotos de esa clase');
  perform t.as_user(t.u(2));
  perform t.check((select count(*) from storage.objects where bucket_id = 'fotos') = 2 and t.rows('delete from storage.objects where name like ''11/sin-clase/%''') = 1, 'Pastor ve todas las fotos y puede eliminar');
end $$;
