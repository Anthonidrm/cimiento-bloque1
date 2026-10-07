-- CIMIENTO — semillas (títulos de lecciones, claves del examen del maestro, juegos del versículo). GENERADO (no editar).
-- Uso: ejecutar DESPUÉS de 1_migraciones.sql.

-- >>>>>>>>>> 01_lessons.sql
-- Generado por tools/backend/exportar_semillas.ts. No editar a mano.
update lessons set title = 'Dios me creó', developed = true where week = 1;
update lessons set title = 'Fui creado a imagen de Dios', developed = true where week = 2;
update lessons set title = 'Dios me conoce', developed = true where week = 3;
update lessons set title = 'Mi vida tiene valor', developed = true where week = 4;

-- >>>>>>>>>> 02_exam_questions.sql
-- Generado por tools/backend/exportar_semillas.ts. No editar a mano.
-- Claves de respuesta del examen del maestro (needs_review = pendiente de revisión pastoral).
insert into exam_questions (question_id, week, kind, correct_option, pairs, needs_review) values
  ('s1-q1', 1, 'doctrinal', 'b', null, false),
  ('s1-q2', 1, 'true_false', 'f', null, false),
  ('s1-q3', 1, 'comprehension', 'b', null, false),
  ('s1-q4', 1, 'scenario', 'c', null, false),
  ('s1-q5', 1, 'pedagogical', 'b', null, false),
  ('s1-q6', 1, 'doctrinal', 'f', null, false),
  ('s1-q7', 1, 'comprehension', 'b', null, false),
  ('s1-q8', 1, 'scenario', 'b', null, false),
  ('s1-q9', 1, 'matching', null, '[{"left":"Génesis 1:26 («Hagamos al hombre…»)","right":"La creación del ser humano estuvo precedida por una deliberación divina"},{"left":"Génesis 2:7","right":"Dios formó al hombre del polvo y sopló en él aliento de vida"},{"left":"Lo que el texto afirma","right":"QUIÉN creó y que hubo propósito"},{"left":"Lo que el texto no resuelve","right":"El mecanismo y el tiempo de la creación en términos científicos"}]'::jsonb, true),
  ('s2-q1', 2, 'doctrinal', 'b', null, false),
  ('s2-q2', 2, 'true_false', 'f', null, false),
  ('s2-q3', 2, 'comprehension', 'c', null, false),
  ('s2-q4', 2, 'scenario', 'b', null, false),
  ('s2-q5', 2, 'pedagogical', 'b', null, false),
  ('s2-q6', 2, 'doctrinal', 'f', null, false),
  ('s2-q7', 2, 'comprehension', 'b', null, false),
  ('s2-q8', 2, 'scenario', 'b', null, false),
  ('s2-q9', 2, 'matching', null, '[{"left":"Portar la imagen de Dios significa…","right":"Reflejar —no igualar— ciertos atributos de Dios"},{"left":"Génesis 5:1–2","right":"Confirma que la imagen de Dios es universal"},{"left":"Portar la imagen de Dios es la base de…","right":"La dignidad humana universal, presente en cada persona sin excepción"},{"left":"Error doctrinal a evitar","right":"Confundir «imagen» con «igualdad»"}]'::jsonb, true),
  ('s3-q1', 3, 'comprehension', 'b', null, false),
  ('s3-q2', 3, 'true_false', 'f', null, false),
  ('s3-q3', 3, 'doctrinal', 'b', null, false),
  ('s3-q4', 3, 'scenario', 'b', null, false),
  ('s3-q5', 3, 'comprehension', 'b', null, false),
  ('s3-q6', 3, 'pedagogical', 'b', null, false),
  ('s3-q7', 3, 'doctrinal', 'f', null, false),
  ('s3-q8', 3, 'scenario', 'b', null, false),
  ('s3-q9', 3, 'matching', null, '[{"left":"Salmo 139:13–16","right":"Dios formó a la persona con cuidado y la conocía desde antes de nacer"},{"left":"Carácter del conocimiento de Dios","right":"Específico, individual e íntimo — no genérico ni distante"},{"left":"Tono correcto al enseñar este salmo","right":"Cercanía y adoración, no temor"},{"left":"Error a evitar con este salmo","right":"Convertirlo en una lección de biología prenatal"}]'::jsonb, true),
  ('s4-q1', 4, 'comprehension', 'b', null, false),
  ('s4-q2', 4, 'true_false', 'f', null, false),
  ('s4-q3', 4, 'doctrinal', 'c', null, false),
  ('s4-q4', 4, 'scenario', 'b', null, false),
  ('s4-q5', 4, 'comprehension', 'b', null, false),
  ('s4-q6', 4, 'pedagogical', 'b', null, false),
  ('s4-q7', 4, 'doctrinal', 'f', null, false),
  ('s4-q8', 4, 'scenario', 'b', null, false),
  ('s4-q9', 4, 'matching', null, '[{"left":"Origen del valor de una persona","right":"Lo otorga Dios; no se gana por desempeño, apariencia ni aprobación de otros"},{"left":"Mateo 10:29–31","right":"Jesús confirma en el Nuevo Testamento la dignidad humana enseñada en el Antiguo"},{"left":"Fundamento del valor en este módulo","right":"La creación, no la redención"},{"left":"Error a evitar en esta semana","right":"Introducir la cruz como fundamento del valor en este punto del currículo"}]'::jsonb, true)
on conflict (question_id) do update set correct_option = excluded.correct_option, pairs = excluded.pairs, needs_review = excluded.needs_review;

-- >>>>>>>>>> 03_games.sql
-- Generado por tools/backend/exportar_semillas.ts. No editar a mano.
insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values ('03bc225f-0b7f-49f3-a4b7-3640a4cff0c5', 1, 'ORDENAR_PALABRAS', 'Ordena el versículo (Génesis 1:27)', '{"text":"Y creó Dios al hombre a su imagen, a imagen de Dios lo creó; varón y hembra los creó.","ref":"Génesis 1:27"}'::jsonb, true, false, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;
insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values ('829bd5b3-6205-467d-ab38-a362a2c18935', 1, 'COMPLETAR_VERSICULO', 'Completa el versículo (Génesis 1:27)', '{"text":"Y creó Dios al hombre a su imagen, a imagen de Dios lo creó; varón y hembra los creó.","ref":"Génesis 1:27","blanks":[2,11,14]}'::jsonb, true, true, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;
insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values ('a8c1f839-d004-4843-a3b1-0662de07e959', 2, 'ORDENAR_PALABRAS', 'Ordena el versículo (Génesis 1:26)', '{"text":"Entonces dijo Dios: Hagamos al hombre a nuestra imagen, conforme a nuestra semejanza; y señoree en los peces del mar, en las aves de los cielos, en las bestias, en toda la tierra, y en todo animal que se arrastra sobre la tierra.","ref":"Génesis 1:26"}'::jsonb, true, false, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;
insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values ('8e2d56b5-bf72-4874-aec8-1fecf0df893c', 2, 'COMPLETAR_VERSICULO', 'Completa el versículo (Génesis 1:26)', '{"text":"Entonces dijo Dios: Hagamos al hombre a nuestra imagen, conforme a nuestra semejanza; y señoree en los peces del mar, en las aves de los cielos, en las bestias, en toda la tierra, y en todo animal que se arrastra sobre la tierra.","ref":"Génesis 1:26","blanks":[2,5,8,11]}'::jsonb, true, true, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;
insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values ('5aefebe1-0177-46f9-ac9e-4f19ef65b401', 3, 'ORDENAR_PALABRAS', 'Ordena el versículo (Salmo 139:14)', '{"text":"Te alabaré; porque formidables, maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.","ref":"Salmo 139:14"}'::jsonb, true, false, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;
insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values ('caa42097-11f6-4b9f-af98-c8be2294e717', 3, 'COMPLETAR_VERSICULO', 'Completa el versículo (Salmo 139:14)', '{"text":"Te alabaré; porque formidables, maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.","ref":"Salmo 139:14","blanks":[2,8,14]}'::jsonb, true, true, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;
insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values ('46b76885-c09d-41ec-a9da-b12165020aa4', 4, 'ORDENAR_PALABRAS', 'Ordena el versículo (Mateo 10:31)', '{"text":"Así que, no temáis; más valéis vosotros que muchos pajarillos.","ref":"Mateo 10:31"}'::jsonb, true, false, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;
insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values ('b5d7ed47-f5fb-4a76-a7f5-c77e3bad00e9', 4, 'COMPLETAR_VERSICULO', 'Completa el versículo (Mateo 10:31)', '{"text":"Así que, no temáis; más valéis vosotros que muchos pajarillos.","ref":"Mateo 10:31","blanks":[5,8]}'::jsonb, true, true, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;
