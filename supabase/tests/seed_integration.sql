-- Datos de arranque para la prueba de integración (usuarios de prueba, un grupo y un juego).
insert into auth.users(id, email) values
 ('a0000000-0000-0000-0000-000000000001','admin@t'), ('a0000000-0000-0000-0000-000000000002','pastor@t'),
 ('a0000000-0000-0000-0000-000000000003','lela@t'),  ('a0000000-0000-0000-0000-000000000004','tefa@t'),
 ('a0000000-0000-0000-0000-000000000005','est1@t'),  ('a0000000-0000-0000-0000-000000000006','est2@t');
insert into profiles(id, username, display_name, role) values
 ('a0000000-0000-0000-0000-000000000001','admin','Admin','ADMINISTRADOR'), ('a0000000-0000-0000-0000-000000000002','pastor','Pastor','PASTOR'),
 ('a0000000-0000-0000-0000-000000000003','lela','Lela','MAESTRO'),         ('a0000000-0000-0000-0000-000000000004','tefa','Tefa','MAESTRO'),
 ('a0000000-0000-0000-0000-000000000005','est1','Estudiante 1','ESTUDIANTE'), ('a0000000-0000-0000-0000-000000000006','est2','Estudiante 2','ESTUDIANTE');
insert into student_groups(id, name) values ('d0000000-0000-0000-0000-000000000001', 'Grupo A');
insert into enrollments(student_id, group_id) values ('a0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000001'), ('a0000000-0000-0000-0000-000000000006','d0000000-0000-0000-0000-000000000001');
insert into group_teachers(group_id, teacher_id) values ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003');
insert into games(id, week, kind, title, active, counts_as_exam, max_score) values ('e0000000-0000-0000-0000-000000000001', 1, 'ORDENAR_PALABRAS', 'Prueba de la semana 1', true, true, 100);
