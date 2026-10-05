-- =====================================================================================
-- CIMIENTO — migración 0002: backend integral (aditiva sobre 0001). PROPUESTA, no aplicada.
-- Añade: módulos, grupos de maestros, examen y progreso calculados en el SERVIDOR, puntuación 4×25
-- automática, notificaciones con cola de entrega, informe de clase, juegos y actividades.
-- También ENDURECE la 0001: el cliente ya no escribe directamente su progreso, sus notas ni sus calificaciones.
-- =====================================================================================

-- ---------- Módulos ----------
create table modules (id int primary key check (id between 1 and 12), title text not null);
insert into modules(id, title) values
 (1,'Dios me creó'),(2,'Dios merece reverencia'),(3,'Dios me ama'),(4,'El pecado nos separa de Dios'),(5,'Jesús es el Salvador'),
 (6,'La fe en Jesús'),(7,'Obedecer por amor'),(8,'La Palabra de Dios me guía'),(9,'Puedo hablar con Dios'),(10,'Somos parte de la Iglesia'),
 (11,'Puedo mostrar a Jesús'),(12,'Vivo con propósito');
alter table lessons add constraint lessons_module_fk foreign key (module_id) references modules(id);
alter table modules enable row level security;
create policy modules_read  on modules for select to authenticated using (app_role() is not null);
create policy modules_admin on modules for all    to authenticated using (app_role() = 'ADMINISTRADOR') with check (app_role() = 'ADMINISTRADOR');

-- ---------- Configuración nueva ----------
update app_config set value = '1',       note = 'Intentos del examen del maestro: UNO (decisión confirmada)' where key = 'exam_max_attempts';
update app_config set value = '"first"', note = 'Con un solo intento cuenta ese intento'                      where key = 'exam_scoring';
insert into app_config(key, value, note) values
 ('attendance_points', '{"PRESENTE":25,"EXCUSA":0,"AUSENTE":0}', 'Puntos de asistencia por estado (EXCUSA: pendiente de decisión pastoral)'),
 ('tasks_reminder_hours', '24', 'Horas antes del cierre de una tarea para el recordatorio');
-- Correos de reporte: se cargan desde el SQL Editor (no van al repositorio). Ver supabase/seed/report_recipients.sql.example

-- ---------- Examen: UN solo intento, calificado en el servidor ----------
alter table exam_attempts add constraint exam_single_attempt check (attempt_no = 1);
create table exam_questions (                                    -- claves de respuesta: nunca visibles para el maestro
  question_id  text primary key,
  week         int not null references lessons(week),
  kind         text not null,
  correct_option text,
  pairs        jsonb,
  needs_review boolean not null default false                    -- pendiente de revisión pastoral
);
alter table exam_questions enable row level security;
create policy eq_staff on exam_questions for select to authenticated using (is_staff());
create policy eq_admin on exam_questions for all    to authenticated using (app_role() = 'ADMINISTRADOR') with check (app_role() = 'ADMINISTRADOR');

-- Quita la escritura directa del cliente (un maestro podía insertar su propia respuesta como "correcta")
drop policy ans_insert on exam_answers;
drop policy ea_own     on exam_attempts;
create policy ea_read_own on exam_attempts for select to authenticated using (user_id = auth.uid());

create function exam_answer(p_week int, p_question text, p_option text default null, p_pairs jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); q exam_questions; att exam_attempts; ok boolean; total int; answered int; correct int; score int; pr record;
begin
  if me is null or app_role() not in ('MAESTRO','PASTOR','ADMINISTRADOR') then raise exception 'Sin permiso para el examen.'; end if;
  select * into q from exam_questions where question_id = p_question and week = p_week;
  if not found then raise exception 'La pregunta no pertenece a esta lección.'; end if;
  select * into att from exam_attempts where user_id = me and week = p_week and attempt_no = 1;
  if not found then
    insert into exam_attempts(user_id, week, attempt_no) values (me, p_week, 1) returning * into att;
  end if;
  if att.completed_at is not null then raise exception 'El examen ya terminó: tiene un único intento.'; end if;
  if exists (select 1 from exam_answers where attempt_id = att.id and question_id = p_question) then
    raise exception 'Esta pregunta ya fue respondida; la respuesta registrada no se puede cambiar.';
  end if;
  if q.kind = 'matching' then
    ok := p_pairs is not null and not exists (select 1 from jsonb_array_elements(q.pairs) kp where (p_pairs ->> (kp ->> 'left')) is distinct from (kp ->> 'right'));
  else
    if p_option is null then raise exception 'Elige una opción.'; end if;
    ok := p_option = q.correct_option;
  end if;
  insert into exam_answers(attempt_id, question_id, selected_option, pairs, is_correct) values (att.id, p_question, p_option, p_pairs, ok);
  select count(*) into total from exam_questions where week = p_week;
  select count(*), count(*) filter (where is_correct) into answered, correct from exam_answers where attempt_id = att.id;
  if answered >= total then
    score := round(100.0 * correct / total);
    update exam_attempts set completed_at = now(), score_percent = score where id = att.id;
  end if;
  return jsonb_build_object('is_correct', ok, 'correct_option', q.correct_option, 'correct_pairs', case when ok then null else q.pairs end,
                            'answered', answered, 'total', total, 'completed', answered >= total, 'score_percent', score);
end $$;

-- ---------- Guía y presentación: el progreso lo escribe el servidor ----------
alter table guide_progress       add column updated_at timestamptz not null default now();
alter table presentation_usage   add column updated_at timestamptz not null default now();
drop policy gp_own on guide_progress;
drop policy pu_own on presentation_usage;
create policy gp_read_own on guide_progress     for select to authenticated using (user_id = auth.uid());
create policy pu_read_own on presentation_usage for select to authenticated using (user_id = auth.uid());

create function guide_add_seconds(p_week int, p_section int, p_secs int) returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); mins int := cfg_text('guide_min_seconds')::int; total int := cfg_text('guide_sections')::int; prev boolean; g guide_progress; done int;
begin
  if me is null or app_role() not in ('MAESTRO','PASTOR','ADMINISTRADOR') then raise exception 'Sin permiso.'; end if;
  if p_section < 1 or p_section > total then raise exception 'Apartado no válido.'; end if;
  if p_secs < 0 or p_secs > 60 then raise exception 'Tiempo no válido.'; end if;
  if p_section > 1 then
    select completed_at is not null into prev from guide_progress where user_id = me and week = p_week and section = p_section - 1;
    if not coalesce(prev, false) then raise exception 'El apartado anterior todavía no está completado.'; end if;
  end if;
  insert into guide_progress(user_id, week, section, seconds) values (me, p_week, p_section, p_secs)
    on conflict (user_id, week, section) do update set seconds = guide_progress.seconds + excluded.seconds, updated_at = now();
  update guide_progress set completed_at = now() where user_id = me and week = p_week and section = p_section and seconds >= mins and completed_at is null;
  select * into g from guide_progress where user_id = me and week = p_week and section = p_section;
  select count(*) into done from guide_progress where user_id = me and week = p_week and completed_at is not null;
  return jsonb_build_object('seconds', g.seconds, 'completed', g.completed_at is not null, 'sections_done', done, 'sections_total', total);
end $$;

create function presentation_add_seconds(p_week int, p_slide int, p_secs int, p_session uuid default null) returns int language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); total int; s int;
begin
  if me is null or app_role() not in ('MAESTRO','PASTOR','ADMINISTRADOR') then raise exception 'Sin permiso.'; end if;
  total := cfg_text('presentation_slides')::int;
  if p_slide < 1 or p_slide > total or p_secs < 0 or p_secs > 60 then raise exception 'Diapositiva o tiempo no válidos.'; end if;
  if p_session is not null and not exists (select 1 from class_sessions where id = p_session and week = p_week and status = 'EN_CURSO') then raise exception 'La sesión no está en curso.'; end if;
  insert into presentation_usage(user_id, week, slide, session_id, seconds) values (me, p_week, p_slide, p_session, p_secs)
    on conflict (user_id, week, slide) do update set seconds = presentation_usage.seconds + excluded.seconds,
         session_id = coalesce(excluded.session_id, presentation_usage.session_id), updated_at = now()
    returning seconds into s;
  return s;
end $$;

-- ---------- Grupos de maestros: "estudiantes asignados" ----------
create table group_teachers (
  group_id   uuid references student_groups(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete cascade,
  primary key (group_id, teacher_id)
);
alter table group_teachers enable row level security;
create policy gt_read  on group_teachers for select to authenticated using (is_staff() or teacher_id = auth.uid());
create policy gt_staff on group_teachers for all    to authenticated using (is_staff()) with check (is_staff());

create function teaches_student(p_student uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_teachers gt join enrollments e on e.group_id = gt.group_id where gt.teacher_id = auth.uid() and e.student_id = p_student)
$$;
-- El maestro solo ve a SUS estudiantes (la 0001 le dejaba ver a todos)
drop policy prof_select  on profiles;
create policy prof_select on profiles for select to authenticated using (
  id = auth.uid() or is_staff() or (app_role() = 'MAESTRO' and role = 'ESTUDIANTE' and teaches_student(id)));
drop policy enroll_read on enrollments;
create policy enroll_read on enrollments for select to authenticated using (student_id = auth.uid() or is_staff() or (app_role() = 'MAESTRO' and teaches_student(student_id)));
drop policy score_read on lesson_scores;
create policy score_read on lesson_scores for select to authenticated using (student_id = auth.uid() or is_staff() or (app_role() = 'MAESTRO' and teaches_student(student_id)));
drop policy crown_read on crowns;
create policy crown_read on crowns for select to authenticated using (student_id = auth.uid() or is_staff() or (app_role() = 'MAESTRO' and teaches_student(student_id)));
drop policy ip_read on integration_participations;
create policy ip_read on integration_participations for select to authenticated using (student_id = auth.uid() or is_staff() or (app_role() = 'MAESTRO' and teaches_student(student_id)));

-- Asignación de maestros: quién y cuándo lo fija el servidor; solo se asigna a maestros activos
create function stamp_assignment() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = new.teacher_id and role = 'MAESTRO' and active) then raise exception 'Solo se puede asignar un maestro activo.'; end if;
  new.assigned_by := coalesce(auth.uid(), new.assigned_by);
  if tg_op = 'INSERT' or new.teacher_id is distinct from old.teacher_id then new.assigned_at := coalesce(new.assigned_at, now()); end if;
  return new;
end $$;
create trigger trg_stamp_assignment before insert or update on teacher_assignments for each row execute function stamp_assignment();

-- ---------- Sesiones de clase: observaciones y eventos ----------
alter table class_sessions add column observations text;
create table session_events (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  kind       text not null check (kind in ('PRESENTACION','ACTIVIDAD','INTERACCION','NOTA')),
  payload    jsonb not null default '{}',
  at         timestamptz not null default now(),
  by         uuid not null references profiles(id)
);
alter table session_events enable row level security;
create policy se_read on session_events for select to authenticated using (is_staff() or exists (select 1 from class_sessions s where s.id = session_id and s.teacher_id = auth.uid()));

create function session_event(p_session uuid, p_kind text, p_payload jsonb default '{}') returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s class_sessions; new_id uuid;
begin
  select * into s from class_sessions where class_sessions.id = p_session and status = 'EN_CURSO';
  if not found then raise exception 'La clase no está en curso.'; end if;
  if not (is_staff() or s.teacher_id = me) then raise exception 'No puedes registrar eventos en esta clase.'; end if;
  insert into session_events(session_id, kind, payload, by) values (p_session, p_kind, p_payload, me) returning session_events.id into new_id;
  return new_id;
end $$;
create function session_note(p_session uuid, p_text text) returns void language plpgsql security definer set search_path = public as $$
declare s class_sessions;
begin
  select * into s from class_sessions where id = p_session and status = 'EN_CURSO';
  if not found then raise exception 'La clase no está en curso.'; end if;
  if not (is_staff() or s.teacher_id = auth.uid()) then raise exception 'No puedes anotar en esta clase.'; end if;
  update class_sessions set observations = p_text where id = p_session;
end $$;

-- ---------- Actividades obligatorias (más campos) y entrega del estudiante ----------
alter table mandatory_activities add column instructions text, add column materials text, add column points int not null default 0 check (points between 0 and 25),
  add column evidence_required boolean not null default false, add column due_at timestamptz;
create table activity_submissions (                               -- el estudiante marca/entrega la actividad; el maestro la valida
  activity_id uuid references mandatory_activities(id) on delete cascade,
  student_id  uuid references profiles(id) on delete cascade,
  evidence    text,
  submitted_at timestamptz not null default now(),
  primary key (activity_id, student_id)
);
alter table activity_submissions enable row level security;
create policy as_read   on activity_submissions for select to authenticated using (student_id = auth.uid() or is_staff() or (app_role() = 'MAESTRO' and teaches_student(student_id)));
create policy as_insert on activity_submissions for insert to authenticated with check (
  student_id = auth.uid() and app_role() = 'ESTUDIANTE'
  and exists (select 1 from mandatory_activities a where a.id = activity_id and (a.due_at is null or now() < a.due_at)));

-- ---------- Actividad de integración: el maestro asigna estudiantes ----------
create table integration_assignments (
  week        int references integration_activities(week) on delete cascade,
  student_id  uuid references profiles(id) on delete cascade,
  assigned_by uuid not null references profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (week, student_id)
);
alter table integration_assignments enable row level security;
create policy ina_read  on integration_assignments for select to authenticated using (student_id = auth.uid() or is_staff() or app_role() = 'MAESTRO');
create policy ina_write on integration_assignments for all    to authenticated using (is_staff() or is_assigned_teacher(week)) with check ((is_staff() or is_assigned_teacher(week)) and assigned_by = auth.uid());

-- ---------- Juegos y pruebas lúdicas ----------
alter table games add column counts_as_exam boolean not null default false, add column max_score int not null default 100 check (max_score > 0);
create table game_results (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references games(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  score      int not null check (score >= 0),
  max_score  int not null check (max_score > 0),
  details    jsonb not null default '{}',
  played_at  timestamptz not null default now(),
  check (score <= max_score)
);
alter table game_results enable row level security;
create policy gr_read   on game_results for select to authenticated using (student_id = auth.uid() or is_staff() or (app_role() = 'MAESTRO' and teaches_student(student_id)));
create policy gr_insert on game_results for insert to authenticated with check (student_id = auth.uid() and app_role() = 'ESTUDIANTE' and exists (select 1 from games g where g.id = game_id and g.active));

-- ---------- Puntuación del estudiante: se calcula en el servidor ----------
create function recompute_lesson_score(p_student uuid, p_week int) returns void language plpgsql security definer set search_path = public as $$
declare pts jsonb := coalesce((select value from app_config where key = 'attendance_points'), '{"PRESENTE":25,"EXCUSA":0,"AUSENTE":0}'::jsonb); a int; s int; e int;
begin
  select coalesce(max((pts ->> at.status::text)::int), 0) into a from attendance at join class_sessions cs on cs.id = at.session_id where at.student_id = p_student and cs.week = p_week;
  select coalesce(max(sb.grade), 0) into s from submissions sb join assignments asg on asg.id = sb.assignment_id where sb.student_id = p_student and asg.week = p_week and sb.grade is not null;
  select coalesce(max(round(gr.score::numeric / gr.max_score * 25)), 0)::int into e from game_results gr join games g on g.id = gr.game_id where gr.student_id = p_student and g.week = p_week and g.counts_as_exam;
  insert into lesson_scores(student_id, week, attendance_pts, submission_pts, exam_pts) values (p_student, p_week, a, s, e)
    on conflict (student_id, week) do update set attendance_pts = excluded.attendance_pts, submission_pts = excluded.submission_pts, exam_pts = excluded.exam_pts, updated_at = now();
end $$;
create function trg_score_attendance() returns trigger language plpgsql security definer set search_path = public as $$
begin perform recompute_lesson_score(new.student_id, (select week from class_sessions where id = new.session_id)); return new; end $$;
create trigger t_score_attendance after insert or update on attendance for each row execute function trg_score_attendance();
create function trg_score_submission() returns trigger language plpgsql security definer set search_path = public as $$
begin perform recompute_lesson_score(new.student_id, (select week from assignments where id = new.assignment_id)); return new; end $$;
create trigger t_score_submission after insert or update of grade on submissions for each row execute function trg_score_submission();
create function trg_score_game() returns trigger language plpgsql security definer set search_path = public as $$
begin perform recompute_lesson_score(new.student_id, (select week from games where id = new.game_id)); return new; end $$;
create trigger t_score_game after insert on game_results for each row execute function trg_score_game();

-- El cliente ya no escribe notas: participación y calificaciones solo por estas funciones
drop policy score_write on lesson_scores;
drop policy sub_review  on submissions;
create function set_participation(p_student uuid, p_week int, p_pts int) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_pts < 0 or p_pts > 25 then raise exception 'La participación va de 0 a 25.'; end if;
  if not (is_staff() or (app_role() = 'MAESTRO' and is_assigned_teacher(p_week) and teaches_student(p_student))) then raise exception 'No puedes calificar la participación de este estudiante.'; end if;
  perform recompute_lesson_score(p_student, p_week);
  update lesson_scores set participation_pts = p_pts, updated_at = now() where student_id = p_student and week = p_week;
end $$;
create function grade_submission(p_submission uuid, p_grade int, p_comment text default null) returns void language plpgsql security definer set search_path = public as $$
declare sb submissions; wk int;
begin
  select * into sb from submissions where id = p_submission;
  if not found then raise exception 'Entrega no encontrada.'; end if;
  select week into wk from assignments where id = sb.assignment_id;
  if not (is_staff() or is_assigned_teacher(wk)) then raise exception 'No puedes calificar esta entrega.'; end if;
  if p_grade < 0 or p_grade > 25 then raise exception 'La calificación va de 0 a 25.'; end if;
  update submissions set grade = p_grade, teacher_comment = p_comment, graded_by = auth.uid(), graded_at = now() where id = p_submission;
end $$;

-- ---------- Notificaciones: eventos y cola de entrega (sin simular canales externos) ----------
create table notification_deliveries (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  ref_id     uuid,
  channel    notif_channel not null,
  to_address text not null,
  subject    text,
  payload    jsonb not null default '{}',
  status     text not null default 'PENDIENTE' check (status in ('PENDIENTE','ENVIADA','ERROR')),
  attempts   int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz                                           -- solo lo llena el servicio de envío real
);
alter table notification_deliveries enable row level security;
create policy nd_staff on notification_deliveries for select to authenticated using (is_staff());

create function notify(p_to uuid, p_kind text, p_title text, p_body text, p_payload jsonb default '{}') returns void language sql security definer set search_path = public as $$
  insert into notifications(to_user, kind, title, body, payload) values (p_to, p_kind, p_title, p_body, p_payload)
$$;
create function trg_notify_teacher_assignment() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.teacher_id is distinct from old.teacher_id then
    perform notify(new.teacher_id, 'ASIGNACION', 'Se te asignó una lección', 'Eres el maestro de la semana ' || new.week || '.', jsonb_build_object('week', new.week));
  end if;
  return new;
end $$;
create trigger t_notify_teacher_assignment after insert or update on teacher_assignments for each row execute function trg_notify_teacher_assignment();
create function trg_notify_assignment() returns trigger language plpgsql security definer set search_path = public as $$
declare u record;
begin
  for u in select distinct e.student_id from enrollments e join profiles p on p.id = e.student_id where p.active loop
    perform notify(u.student_id, 'TAREA_NUEVA', 'Nueva tarea: ' || new.title, 'Puedes entregarla hasta el inicio de la próxima clase.', jsonb_build_object('assignment', new.id, 'week', new.week));
  end loop;
  return new;
end $$;
create trigger t_notify_assignment after insert on assignments for each row execute function trg_notify_assignment();
create function trg_notify_activity() returns trigger language plpgsql security definer set search_path = public as $$
declare u record;
begin
  for u in select distinct e.student_id from enrollments e join profiles p on p.id = e.student_id where p.active loop
    perform notify(u.student_id, 'NUEVA_ACTIVIDAD', 'Nueva actividad: ' || new.title, null, jsonb_build_object('activity', new.id, 'week', new.week));
  end loop;
  return new;
end $$;
create trigger t_notify_activity after insert on mandatory_activities for each row execute function trg_notify_activity();
create function trg_notify_result() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.grade is not null and new.grade is distinct from old.grade then
    perform notify(new.student_id, 'RESULTADO', 'Tu tarea fue calificada', 'Calificación: ' || new.grade || ' de 25.', jsonb_build_object('submission', new.id));
  end if;
  return new;
end $$;
create trigger t_notify_result after update of grade on submissions for each row execute function trg_notify_result();

-- Recordatorio de tareas por vencer (idempotente). Se programa con pg_cron o una Edge Function (service_role).
create function generate_reminders() returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; hrs int := coalesce(cfg_text('tasks_reminder_hours'), '24')::int;
begin
  for r in select a.id as aid, a.title, e.student_id from assignments a cross join (select distinct student_id from enrollments) e
           where a.closes_at > now() and a.closes_at <= now() + make_interval(hours => hrs) and a.opens_at <= now()
             and not exists (select 1 from submissions s where s.assignment_id = a.id and s.student_id = e.student_id)
             and not exists (select 1 from notifications nt where nt.to_user = e.student_id and nt.kind = 'TAREA_PENDIENTE' and (nt.payload ->> 'assignment')::uuid = a.id) loop
    perform notify(r.student_id, 'TAREA_PENDIENTE', 'Tarea pendiente: ' || r.title, 'Está por cerrarse. ¡No olvides entregarla!', jsonb_build_object('assignment', r.aid));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function generate_reminders() from public, authenticated;

-- ---------- Informe de clase completo + cola de envío por correo ----------
create or replace function end_class(p_session uuid) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r app_role := app_role(); s class_sessions; summary jsonb; u record; rec jsonb; tz text := coalesce(cfg_text('timezone'), 'UTC'); wk_title text;
begin
  select * into s from class_sessions where id = p_session and status = 'EN_CURSO';
  if not found then raise exception 'La clase no existe o ya finalizó.'; end if;
  if not (r in ('ADMINISTRADOR','PASTOR') or me = s.teacher_id) then raise exception 'No puedes finalizar esta clase.'; end if;
  update class_sessions set ended_at = now(), status = 'FINALIZADA' where id = p_session;
  select title into wk_title from lessons where week = s.week;
  summary := jsonb_build_object(
    'lesson', jsonb_build_object('week', s.week, 'title', wk_title),
    'teacher', jsonb_build_object('id', s.teacher_id, 'name', (select display_name from profiles where id = s.teacher_id)),
    'date', (s.started_at at time zone tz)::date, 'started_at', s.started_at, 'ended_at', now(),
    'duration_seconds', extract(epoch from (now() - s.started_at))::int,
    'students', coalesce((select jsonb_agg(jsonb_build_object('id', st.id, 'name', st.display_name, 'attendance', (select a.status from attendance a where a.session_id = p_session and a.student_id = st.id)))
                          from profiles st where st.id in (select e.student_id from enrollments e where s.group_id is null or e.group_id = s.group_id)), '[]'::jsonb),
    'attendance', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from attendance where session_id = p_session group by status) x), '{}'::jsonb),
    'activities', coalesce((select jsonb_agg(payload) from session_events where session_id = p_session and kind = 'ACTIVIDAD'), '[]'::jsonb),
    'interactions', (select count(*) from session_events where session_id = p_session and kind = 'INTERACCION'),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'submissions', (select count(*) from submissions sb where sb.assignment_id = a.id))) from assignments a where a.week = s.week), '[]'::jsonb),
    'presentation', jsonb_build_object('seconds', coalesce((select sum(seconds) from presentation_usage where session_id = p_session), 0), 'slides_used', (select count(*) from presentation_usage where session_id = p_session and seconds > 0)),
    'observations', s.observations,
    'results', jsonb_build_object('students_scored', (select count(*) from lesson_scores where week = s.week), 'average_total', (select round(avg(total)) from lesson_scores where week = s.week))
  );
  insert into class_reports(session_id, content) values (p_session, summary);
  for u in select id from profiles where role in ('PASTOR','ADMINISTRADOR') and active loop
    perform notify(u.id, 'CLASE', 'Clase finalizada', 'Se finalizó la clase de la semana ' || s.week || '. El informe está disponible.', jsonb_build_object('session', p_session, 'week', s.week));
  end loop;
  -- Envío por correo: SOLO se deja en cola (PENDIENTE). Lo envía un servicio real; aquí no se simula nada.
  select value into rec from app_config where key = 'report_recipients';
  if rec is not null then
    for u in select unnest(array['pastor','administrador']) as who loop
      if rec ->> u.who is not null then
        insert into notification_deliveries(kind, ref_id, channel, to_address, subject, payload)
        values ('INFORME_CLASE', p_session, 'CORREO', rec ->> u.who, 'Informe de clase — Semana ' || s.week, summary);
      end if;
    end loop;
  end if;
end $$;

-- ---------- Fotos: el estudiante solo ve las de su grupo ----------
drop policy photo_read on class_photos;
create policy photo_read on class_photos for select to authenticated using (
  is_staff() or app_role() = 'MAESTRO'
  or (app_role() = 'ESTUDIANTE' and (
        (session_id is not null and exists (select 1 from class_sessions s join enrollments e on e.group_id = s.group_id where s.id = session_id and e.student_id = auth.uid()))
     or (session_id is null and exists (select 1 from enrollments e where e.student_id = auth.uid())))));

-- ---------- Vistas de progreso (respetan los permisos de quien consulta) ----------
create view v_teacher_progress with (security_invoker = true) as
select a.week, a.teacher_id, p.display_name as teacher_name,
       tp.guide_pts, tp.exam_pts, tp.presentation_pts, tp.total_pts, tp.guide_done, tp.exam_completed,
       greatest((select max(updated_at) from guide_progress g where g.user_id = a.teacher_id and g.week = a.week),
                (select max(updated_at) from presentation_usage u where u.user_id = a.teacher_id and u.week = a.week),
                (select max(completed_at) from exam_attempts x where x.user_id = a.teacher_id and x.week = a.week)) as last_activity,
       s.status as assignment_status, s.days_late
from teacher_assignments a
join profiles p on p.id = a.teacher_id
cross join lateral teacher_prep(a.teacher_id, a.week) tp
left join v_assignment_status s on s.week = a.week
where is_staff() or a.teacher_id = auth.uid();

create view v_student_progress with (security_invoker = true) as
select ls.student_id, pr.display_name as student_name, ls.week, ls.attendance_pts, ls.submission_pts, ls.participation_pts, ls.exam_pts, ls.total,
       (select count(*) from crowns c where c.student_id = ls.student_id and c.week = ls.week) as crowns, ls.updated_at as last_activity
from lesson_scores ls join profiles pr on pr.id = ls.student_id;

create view v_sessions with (security_invoker = true) as
select cs.id, cs.week, cs.group_id, cs.teacher_id, t.display_name as teacher_name, cs.started_at, cs.ended_at, cs.status, cs.duration_seconds,
       (select count(*) from attendance a where a.session_id = cs.id and a.status = 'PRESENTE') as present,
       (select count(*) from attendance a where a.session_id = cs.id and a.status = 'AUSENTE') as absent,
       (select count(*) from attendance a where a.session_id = cs.id and a.status = 'EXCUSA')  as excused,
       exists (select 1 from class_reports r where r.session_id = cs.id) as has_report
from class_sessions cs join profiles t on t.id = cs.teacher_id;

-- ---------- Privilegios ----------
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
grant execute on function exam_answer(int, text, text, jsonb), guide_add_seconds(int, int, int), presentation_add_seconds(int, int, int, uuid),
  session_event(uuid, text, jsonb), session_note(uuid, text), set_participation(uuid, int, int), grade_submission(uuid, int, text) to authenticated;
