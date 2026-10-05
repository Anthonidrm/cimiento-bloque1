-- =====================================================================================
-- CIMIENTO — esquema base propuesto (Supabase / PostgreSQL 15+)
-- PROPUESTA: solo CREA objetos nuevos; no borra ni modifica nada existente.
-- No se ha aplicado a ningún proyecto. Ver docs/BACKEND_PROPUESTA.md.
-- Las contraseñas NUNCA se guardan aquí: viven (con hash) en auth.users de Supabase Auth.
-- =====================================================================================

-- ---------- Tipos ----------
create type app_role          as enum ('ADMINISTRADOR', 'PASTOR', 'MAESTRO', 'ESTUDIANTE');
create type attendance_status as enum ('PRESENTE', 'AUSENTE', 'EXCUSA');
create type session_status    as enum ('EN_CURSO', 'FINALIZADA');
create type resource_kind     as enum ('PRESENTACION', 'HOJA_TRABAJO', 'HOJA_COLOREAR', 'TARJETA_VERSICULO', 'GUIA', 'PDF', 'IMAGEN', 'VIDEO', 'DOCUMENTO', 'OTRO');
create type resource_audience as enum ('MAESTRO', 'ESTUDIANTE', 'TODOS');
create type submission_kind   as enum ('DOCUMENTO', 'IMAGEN', 'ENLACE');
create type game_kind         as enum ('ORDENAR_PALABRAS', 'ORDENAR_EVENTOS', 'COMPLETAR_VERSICULO', 'MEMORIA', 'BLOQUES', 'RELACIONAR', 'SELECCIONAR_RESPUESTA');
create type notif_channel     as enum ('APP', 'CORREO', 'WHATSAPP');   -- solo APP está activo; los demás quedan reservados

-- ---------- Configuración (editable por el Administrador) ----------
create table app_config (
  key        text primary key,
  value      jsonb not null,
  note       text,
  updated_at timestamptz not null default now()
);
insert into app_config (key, value, note) values
  ('prep_weights',            '{"guide":50,"exam":30,"presentation":20,"mandatory_activities":0}', 'Pesos del porcentaje de preparación (suman 100)'),
  ('guide_sections',          '23',      'Apartados de la Guía del Maestro'),
  ('guide_min_seconds',       '30',      'Segundos mínimos por apartado para desbloquear el siguiente'),
  ('presentation_slides',     '9',       'Diapositivas por presentación'),
  ('presentation_min_seconds','5',       'Segundos mínimos por diapositiva para contarla como usada'),
  ('exam_max_attempts',       '2',       'Intentos del examen del maestro'),
  ('exam_scoring',            '"best"',  'first | best | latest'),
  ('assignment_alert_hours',  '4',       'Horas tras el inicio de la lección anterior sin maestro asignado'),
  ('timezone',                '"America/Santo_Domingo"', 'Zona horaria de la iglesia'),
  ('score_points',            '{"attendance":25,"submission":25,"participation":25,"exam":25}', 'Puntos por lección del estudiante'),
  ('start_class_requires',    '{"guide_complete":true,"exam_completed":true}', 'Requisitos para que el maestro asignado inicie la clase');
-- Correos de reporte (Pastor y Administrador): se cargan desde el panel SQL, no se guardan en el repositorio:
--   insert into app_config(key,value) values ('report_recipients','{"pastor":"…","administrador":"…"}');

-- ---------- Usuarios y roles ----------
create table profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  username             text unique not null check (username = lower(username)),
  display_name         text not null,
  role                 app_role not null,
  active               boolean not null default true,       -- activar / desactivar acceso
  must_change_password boolean not null default true,       -- primer acceso del estudiante
  created_at           timestamptz not null default now(),
  created_by           uuid references profiles(id)
);

-- Funciones auxiliares de permisos (SECURITY DEFINER para no depender de las políticas de profiles)
create function app_role() returns app_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;
create function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('ADMINISTRADOR','PASTOR'), false)
$$;

-- ---------- Lecciones y grupos ----------
create table lessons (
  week       int primary key check (week between 1 and 52),
  module_id  int not null check (module_id between 1 and 12),
  title      text,                                   -- NULL = tema aún no cargado (no se inventa)
  developed  boolean not null default false
);
insert into lessons (week, module_id, developed)
select w,
       case when w<=4 then 1 when w<=8 then 2 when w<=12 then 3 when w<=16 then 4 when w<=20 then 5 when w<=24 then 6
            when w<=28 then 7 when w<=32 then 8 when w<=36 then 9 when w<=40 then 10 when w<=44 then 11 else 12 end,
       w <= 4
from generate_series(1,52) w;

create table student_groups (
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique,
  age_range text
);
create table enrollments (
  student_id uuid references profiles(id) on delete cascade,
  group_id   uuid references student_groups(id) on delete cascade,
  primary key (student_id, group_id)
);

-- ---------- Asignación de maestros a lecciones ----------
create table teacher_assignments (
  week        int primary key references lessons(week),          -- un maestro vigente por lección
  teacher_id  uuid not null references profiles(id),
  assigned_by uuid not null references profiles(id),
  assigned_at timestamptz not null default now()
);
create table teacher_assignment_history (                        -- cada cambio o retiro queda registrado
  id          uuid primary key default gen_random_uuid(),
  week        int not null references lessons(week),
  teacher_id  uuid references profiles(id),
  action      text not null check (action in ('ASIGNADO','CAMBIADO','QUITADO')),
  done_by     uuid not null references profiles(id),
  done_at     timestamptz not null default now()
);
create function log_assignment() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into teacher_assignment_history(week, teacher_id, action, done_by) values (new.week, new.teacher_id, 'ASIGNADO', new.assigned_by);
  elsif tg_op = 'UPDATE' then
    insert into teacher_assignment_history(week, teacher_id, action, done_by) values (new.week, new.teacher_id, 'CAMBIADO', coalesce(auth.uid(), new.assigned_by));
  else
    insert into teacher_assignment_history(week, teacher_id, action, done_by) values (old.week, old.teacher_id, 'QUITADO', coalesce(auth.uid(), old.assigned_by));
  end if;
  return null;
end $$;
create trigger trg_log_assignment after insert or update or delete on teacher_assignments for each row execute function log_assignment();

-- ---------- Clases (sesiones) ----------
create table class_sessions (
  id           uuid primary key default gen_random_uuid(),
  week         int not null references lessons(week),
  group_id     uuid references student_groups(id),
  teacher_id   uuid not null references profiles(id),     -- maestro asignado a la lección
  started_by   uuid not null references profiles(id),     -- quien la inició (maestro, pastor o admin)
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  status       session_status not null default 'EN_CURSO',
  duration_seconds int generated always as (case when ended_at is null then null else extract(epoch from (ended_at - started_at))::int end) stored
);
create unique index one_open_session_per_week on class_sessions(week) where status = 'EN_CURSO';
create table class_reports (
  session_id       uuid primary key references class_sessions(id) on delete cascade,
  content          jsonb not null,
  created_at       timestamptz not null default now(),
  sent_to_pastor   timestamptz,           -- NULL hasta que exista un envío real (no se simula)
  sent_to_admin    timestamptz
);

-- ---------- Preparación del maestro ----------
create table guide_progress (                                   -- apartado completado por maestro y lección
  user_id      uuid references profiles(id) on delete cascade,
  week         int references lessons(week),
  section      int not null check (section between 1 and 23),
  seconds      int not null default 0,
  completed_at timestamptz,
  primary key (user_id, week, section)
);
create table guide_visits (                                     -- cada visita: entrada, salida, tiempo
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  week       int not null references lessons(week),
  section    int not null check (section between 1 and 23),
  entered_at timestamptz not null,
  left_at    timestamptz not null,
  seconds    int not null check (seconds >= 0),
  completed  boolean not null
);
create table exam_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  week         int not null references lessons(week),
  attempt_no   int not null check (attempt_no >= 1),
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  score_percent int check (score_percent between 0 and 100),
  unique (user_id, week, attempt_no)
);
create table exam_answers (                                     -- INMUTABLE: la primera respuesta queda
  attempt_id      uuid references exam_attempts(id) on delete cascade,
  question_id     text not null,
  selected_option text,
  pairs           jsonb,                                         -- preguntas de relación
  is_correct      boolean not null,
  answered_at     timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create function forbid_change() returns trigger language plpgsql as $$
begin raise exception 'Este registro no se puede modificar ni borrar (respuesta registrada).'; end $$;
create trigger trg_exam_answers_immutable before update or delete on exam_answers for each row execute function forbid_change();
create table presentation_usage (                               -- uso real, por diapositiva (y por clase cuando exista)
  user_id    uuid references profiles(id) on delete cascade,
  week       int references lessons(week),
  slide      int not null check (slide >= 1),
  session_id uuid references class_sessions(id),
  seconds    int not null default 0,
  primary key (user_id, week, slide)
);

-- ---------- Estudiantes: asistencia, tareas, actividades, coronas ----------
create table attendance (
  session_id  uuid references class_sessions(id) on delete cascade,
  student_id  uuid references profiles(id) on delete cascade,
  status      attendance_status not null,
  recorded_by uuid not null references profiles(id),
  recorded_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
create table assignments (                                      -- tarea de una lección
  id        uuid primary key default gen_random_uuid(),
  week      int not null references lessons(week),
  title     text not null,
  description text,
  opens_at  timestamptz not null,                               -- inicio de la clase
  closes_at timestamptz not null,                               -- inicio de la próxima clase
  created_by uuid not null references profiles(id),
  check (closes_at > opens_at)
);
create table submissions (                                      -- entregas: se conservan todas
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  kind          submission_kind not null,
  storage_path  text,
  url           text,
  submitted_at  timestamptz not null default now(),
  is_late       boolean not null default false,
  teacher_comment text,
  grade         int check (grade between 0 and 25),
  graded_by     uuid references profiles(id),
  graded_at     timestamptz,
  check ((kind = 'ENLACE' and url is not null) or (kind <> 'ENLACE' and storage_path is not null))
);
create table mandatory_activities (
  id          uuid primary key default gen_random_uuid(),
  week        int not null references lessons(week),
  title       text not null,
  description text,
  created_by  uuid not null references profiles(id)
);
create table activity_completions (
  activity_id uuid references mandatory_activities(id) on delete cascade,
  student_id  uuid references profiles(id) on delete cascade,
  teacher_id  uuid not null references profiles(id),
  status      text not null default 'COMPLETADA',
  evidence    text,
  points      int check (points between 0 and 25),
  completed_at timestamptz not null default now(),
  primary key (activity_id, student_id)
);
create table integration_activities (                           -- una por lección
  week         int primary key references lessons(week),
  title        text not null,
  description  text,
  instructions text,
  materials    text,
  points       int not null default 0,
  evidence     text
);
create table integration_participations (
  id            uuid primary key default gen_random_uuid(),
  week          int not null references integration_activities(week),
  student_id    uuid not null references profiles(id) on delete cascade,
  registered_by uuid not null references profiles(id),          -- el maestro de la lección SIGUIENTE
  registered_at timestamptz not null default now(),
  unique (week, student_id)
);
create table crowns (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  week       int not null references lessons(week),
  reason     text not null default 'INTEGRACION',
  awarded_at timestamptz not null default now(),
  unique (student_id, week, reason)
);
create function award_crown() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into crowns(student_id, week, reason) values (new.student_id, new.week, 'INTEGRACION') on conflict do nothing;
  return new;
end $$;
create trigger trg_award_crown after insert on integration_participations for each row execute function award_crown();
create table lesson_scores (                                    -- 4 × 25 = 100 por estudiante y lección
  student_id          uuid references profiles(id) on delete cascade,
  week                int references lessons(week),
  attendance_pts      int not null default 0 check (attendance_pts between 0 and 25),
  submission_pts      int not null default 0 check (submission_pts between 0 and 25),
  participation_pts   int not null default 0 check (participation_pts between 0 and 25),
  exam_pts            int not null default 0 check (exam_pts between 0 and 25),
  total               int generated always as (attendance_pts + submission_pts + participation_pts + exam_pts) stored,
  updated_at          timestamptz not null default now(),
  primary key (student_id, week)
);

-- ---------- Recursos reemplazables (con historial) ----------
create table resources (
  id        uuid primary key default gen_random_uuid(),
  week      int not null references lessons(week),
  kind      resource_kind not null,
  slot      text not null default 'principal',                  -- evita duplicados: un recurso por (lección, tipo, ranura)
  title     text not null,
  audience  resource_audience not null default 'TODOS',
  unique (week, kind, slot)
);
create table resource_versions (                                -- reemplazar = nueva versión; la anterior se conserva
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  storage_path text not null,
  filename    text not null,
  uploaded_by uuid not null references profiles(id),
  uploaded_at timestamptz not null default now(),
  is_current  boolean not null default true
);
create unique index one_current_version on resource_versions(resource_id) where is_current;
create function set_current_version() returns trigger language plpgsql as $$
begin
  update resource_versions set is_current = false where resource_id = new.resource_id and is_current;
  return new;
end $$;
create trigger trg_current_version before insert on resource_versions for each row when (new.is_current) execute function set_current_version();

-- ---------- Fotos, notificaciones, juegos ----------
create table class_photos (
  id          uuid primary key default gen_random_uuid(),
  week        int not null references lessons(week),
  session_id  uuid references class_sessions(id),
  storage_path text not null,
  caption     text,
  uploaded_by uuid not null references profiles(id),
  uploaded_at timestamptz not null default now()
);
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  to_user    uuid not null references profiles(id) on delete cascade,
  kind       text not null,                                       -- ASIGNACION_PENDIENTE, FALTA_MAESTRO, ATRASO, CLASE, ACTIVIDAD, TAREA…
  title      text not null,
  body       text,
  payload    jsonb not null default '{}',
  channel    notif_channel not null default 'APP',
  created_at timestamptz not null default now(),
  sent_at    timestamptz,                                         -- NULL hasta que exista entrega real por el canal (no se simula)
  read_at    timestamptz
);
create index on notifications(to_user, created_at desc);
create table games (
  id      uuid primary key default gen_random_uuid(),
  week    int not null references lessons(week),
  kind    game_kind not null,
  title   text not null,
  config  jsonb not null default '{}',                            -- contenido bíblico de la lección
  active  boolean not null default false
);

-- ---------- Reglas: asignación a tiempo / fuera de tiempo / atrasada ----------
-- Referencia: inicio de la clase de la lección ANTERIOR. A tiempo = asignado el mismo día o antes.
-- Sin maestro y pasadas N horas (app_config.assignment_alert_hours) desde ese inicio = ATRASADA.
create function cfg_text(k text) returns text language sql stable as $$ select value #>> '{}' from app_config where key = k $$;
create view v_assignment_status with (security_invoker = true) as
with ref as (
  select l.week,
         (select min(s.started_at) from class_sessions s where s.week = l.week - 1) as prev_started_at
  from lessons l
), tz as (select coalesce(cfg_text('timezone'), 'UTC') as z), hrs as (select coalesce(cfg_text('assignment_alert_hours'), '4')::int as h)
select r.week, a.teacher_id, a.assigned_at, r.prev_started_at,
  case
    when r.prev_started_at is null then 'SIN_REFERENCIA'
    when a.week is not null and (a.assigned_at at time zone tz.z)::date <= (r.prev_started_at at time zone tz.z)::date then 'A_TIEMPO'
    when a.week is not null then 'FUERA_DE_TIEMPO'
    when now() > r.prev_started_at + make_interval(hours => hrs.h) then 'ATRASADA'
    else 'PENDIENTE'
  end as status,
  case
    when r.prev_started_at is null then null
    when a.week is not null then greatest(0, (a.assigned_at at time zone tz.z)::date - (r.prev_started_at at time zone tz.z)::date)
    when now() > r.prev_started_at + make_interval(hours => hrs.h) then greatest(0, (now() at time zone tz.z)::date - (r.prev_started_at at time zone tz.z)::date)
  end as days_late
from ref r cross join tz cross join hrs left join teacher_assignments a on a.week = r.week;

-- Genera (una sola vez por lección) la alerta para Pastor y Administrador. Se programa con pg_cron o una Edge Function.
create function generate_assignment_alerts() returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; u record;
begin
  for r in select * from v_assignment_status where status = 'ATRASADA' loop
    for u in select id from profiles where role in ('PASTOR','ADMINISTRADOR') and active loop
      if not exists (select 1 from notifications where to_user = u.id and kind = 'FALTA_MAESTRO' and (payload->>'week')::int = r.week) then
        insert into notifications(to_user, kind, title, body, payload)
        values (u.id, 'FALTA_MAESTRO', 'Lección sin maestro asignado', 'La semana ' || r.week || ' sigue sin maestro (atraso de ' || coalesce(r.days_late, 0) || ' día(s)).', jsonb_build_object('week', r.week, 'days_late', r.days_late));
        n := n + 1;
      end if;
    end loop;
  end loop;
  return n;
end $$;

-- ---------- Preparación del maestro: porcentaje (50 guía · 30 examen · 20 presentación) ----------
create function teacher_prep(p_user uuid, p_week int)
returns table (guide_pts numeric, exam_pts numeric, presentation_pts numeric, total_pts numeric, guide_done int, exam_completed boolean)
language plpgsql stable security definer set search_path = public as $$
declare w jsonb; secs int; mins int; slides int; scoring text; sc numeric; gd int; used int;
begin
  select value into w from app_config where key = 'prep_weights';
  secs   := cfg_text('guide_sections')::int;
  mins   := cfg_text('presentation_min_seconds')::int;
  slides := cfg_text('presentation_slides')::int;
  scoring := coalesce(cfg_text('exam_scoring'), 'best');
  select count(*) into gd from guide_progress where user_id = p_user and week = p_week and completed_at is not null;
  select case scoring when 'first'  then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no asc  limit 1)
                      when 'latest' then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no desc limit 1)
                      else (select max(score_percent) from exam_attempts where user_id = p_user and week = p_week and completed_at is not null) end into sc;
  select count(*) into used from presentation_usage where user_id = p_user and week = p_week and seconds >= mins;
  guide_pts := round((gd::numeric / secs) * (w->>'guide')::numeric, 1);
  exam_pts  := round((coalesce(sc, 0) / 100) * (w->>'exam')::numeric, 1);
  presentation_pts := round((least(used, slides)::numeric / slides) * (w->>'presentation')::numeric, 1);
  total_pts := guide_pts + exam_pts + presentation_pts;
  guide_done := gd;
  exam_completed := sc is not null;
  return next;
end $$;

-- ---------- Iniciar / finalizar clase ----------
-- Solo el maestro ASIGNADO inicia la clase, y solo si cumple los requisitos (guía completa y examen realizado).
-- Si no cumple, Administrador o Pastor pueden iniciarla.
create function start_class(p_week int, p_group uuid default null) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r app_role := app_role(); t uuid; prep record; req jsonb; sid uuid;
begin
  if me is null or r is null then raise exception 'Sin sesión activa.'; end if;
  select teacher_id into t from teacher_assignments where week = p_week;
  if t is null then raise exception 'La lección % no tiene maestro asignado.', p_week; end if;
  if r = 'MAESTRO' then
    if me <> t then raise exception 'Solo el maestro asignado puede iniciar esta clase.'; end if;
    select * into prep from teacher_prep(me, p_week);
    req := (select value from app_config where key = 'start_class_requires');
    if coalesce((req->>'guide_complete')::boolean, false) and prep.guide_done < cfg_text('guide_sections')::int then
      raise exception 'Falta completar la Guía del Maestro (% de % apartados).', prep.guide_done, cfg_text('guide_sections');
    end if;
    if coalesce((req->>'exam_completed')::boolean, false) and not prep.exam_completed then
      raise exception 'Falta realizar el examen del maestro.';
    end if;
  elsif r not in ('ADMINISTRADOR','PASTOR') then
    raise exception 'Tu rol no puede iniciar clases.';
  end if;
  insert into class_sessions(week, group_id, teacher_id, started_by) values (p_week, p_group, t, me) returning id into sid;
  return sid;
end $$;

create function end_class(p_session uuid) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r app_role := app_role(); s class_sessions; summary jsonb; u record;
begin
  select * into s from class_sessions where id = p_session and status = 'EN_CURSO';
  if not found then raise exception 'La clase no existe o ya finalizó.'; end if;
  if not (r in ('ADMINISTRADOR','PASTOR') or me = s.teacher_id) then raise exception 'No puedes finalizar esta clase.'; end if;
  update class_sessions set ended_at = now(), status = 'FINALIZADA' where id = p_session;
  select jsonb_build_object(
    'week', s.week, 'teacher_id', s.teacher_id, 'started_at', s.started_at, 'ended_at', now(),
    'attendance', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from attendance where session_id = p_session group by status) x), '{}'::jsonb),
    'presentation_seconds', coalesce((select sum(seconds) from presentation_usage where session_id = p_session), 0)
  ) into summary;
  insert into class_reports(session_id, content) values (p_session, summary);
  for u in select id from profiles where role in ('PASTOR','ADMINISTRADOR') and active loop
    insert into notifications(to_user, kind, title, body, payload) values (u.id, 'CLASE', 'Clase finalizada', 'Se finalizó la clase de la semana ' || s.week, jsonb_build_object('session', p_session, 'week', s.week));
  end loop;
end $$;

-- =====================================================================================
-- SEGURIDAD A NIVEL DE FILA (RLS): cada rol ve y hace solo lo que le corresponde
-- =====================================================================================
alter table app_config                enable row level security;
alter table profiles                  enable row level security;
alter table lessons                   enable row level security;
alter table student_groups            enable row level security;
alter table enrollments               enable row level security;
alter table teacher_assignments       enable row level security;
alter table teacher_assignment_history enable row level security;
alter table class_sessions            enable row level security;
alter table class_reports             enable row level security;
alter table guide_progress            enable row level security;
alter table guide_visits              enable row level security;
alter table exam_attempts             enable row level security;
alter table exam_answers              enable row level security;
alter table presentation_usage        enable row level security;
alter table attendance                enable row level security;
alter table assignments               enable row level security;
alter table submissions               enable row level security;
alter table mandatory_activities      enable row level security;
alter table activity_completions      enable row level security;
alter table integration_activities    enable row level security;
alter table integration_participations enable row level security;
alter table crowns                    enable row level security;
alter table lesson_scores             enable row level security;
alter table resources                 enable row level security;
alter table resource_versions         enable row level security;
alter table class_photos              enable row level security;
alter table notifications             enable row level security;
alter table games                     enable row level security;

create function is_assigned_teacher(p_week int) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from teacher_assignments where week = p_week and teacher_id = auth.uid()) and coalesce(app_role() = 'MAESTRO', false)
$$;

-- Configuración: la lee cualquier usuario activo; solo el Administrador la cambia
create policy cfg_read   on app_config for select to authenticated using (app_role() is not null);
create policy cfg_admin  on app_config for all    to authenticated using (app_role() = 'ADMINISTRADOR') with check (app_role() = 'ADMINISTRADOR');

-- Perfiles: Administrador gestiona todo; Pastor solo LEE (necesita nombres para asignar); el maestro ve estudiantes
create policy prof_select on profiles for select to authenticated using (
  id = auth.uid() or is_staff() or (app_role() = 'MAESTRO' and role = 'ESTUDIANTE'));
create policy prof_admin  on profiles for all    to authenticated using (app_role() = 'ADMINISTRADOR') with check (app_role() = 'ADMINISTRADOR');

create policy lessons_read  on lessons for select to authenticated using (app_role() is not null);
create policy lessons_admin on lessons for all    to authenticated using (app_role() = 'ADMINISTRADOR') with check (app_role() = 'ADMINISTRADOR');
create policy groups_read   on student_groups for select to authenticated using (app_role() is not null);
create policy groups_admin  on student_groups for all    to authenticated using (app_role() = 'ADMINISTRADOR') with check (app_role() = 'ADMINISTRADOR');
create policy enroll_read   on enrollments for select to authenticated using (student_id = auth.uid() or app_role() in ('ADMINISTRADOR','PASTOR','MAESTRO'));
create policy enroll_admin  on enrollments for all    to authenticated using (app_role() = 'ADMINISTRADOR') with check (app_role() = 'ADMINISTRADOR');

-- Asignación de maestros: Administrador y Pastor asignan, cambian y quitan; todos los usuarios activos ven quién es
create policy assign_read  on teacher_assignments for select to authenticated using (app_role() is not null);
create policy assign_staff on teacher_assignments for all    to authenticated using (is_staff()) with check (is_staff());
create policy assignh_read on teacher_assignment_history for select to authenticated using (is_staff());

-- Clases: se crean SOLO con start_class()/end_class() (sin política de escritura directa)
create policy sess_read   on class_sessions for select to authenticated using (is_staff() or teacher_id = auth.uid() or app_role() = 'ESTUDIANTE');
create policy report_read on class_reports  for select to authenticated using (is_staff());

-- Preparación del maestro: cada maestro escribe y lee lo SUYO; Administrador y Pastor leen todo
create policy gp_own   on guide_progress for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and app_role() in ('MAESTRO','PASTOR','ADMINISTRADOR'));
create policy gp_staff on guide_progress for select to authenticated using (is_staff());
create policy gv_own   on guide_visits   for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and app_role() in ('MAESTRO','PASTOR','ADMINISTRADOR'));
create policy gv_staff on guide_visits   for select to authenticated using (is_staff());
create policy ea_own   on exam_attempts  for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and app_role() in ('MAESTRO','PASTOR','ADMINISTRADOR'));
create policy ea_staff on exam_attempts  for select to authenticated using (is_staff());
create policy ans_read   on exam_answers for select to authenticated using (is_staff() or exists (select 1 from exam_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy ans_insert on exam_answers for insert to authenticated with check (exists (select 1 from exam_attempts a where a.id = attempt_id and a.user_id = auth.uid() and a.completed_at is null));
create policy pu_own   on presentation_usage for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and app_role() in ('MAESTRO','PASTOR','ADMINISTRADOR'));
create policy pu_staff on presentation_usage for select to authenticated using (is_staff());

-- Asistencia: la registra el maestro de ESA clase (o staff); el estudiante ve la suya
create policy att_read  on attendance for select to authenticated using (student_id = auth.uid() or is_staff() or exists (select 1 from class_sessions s where s.id = session_id and s.teacher_id = auth.uid()));
create policy att_write on attendance for all    to authenticated
  using      (is_staff() or exists (select 1 from class_sessions s where s.id = session_id and s.teacher_id = auth.uid() and s.status = 'EN_CURSO'))
  with check (is_staff() or exists (select 1 from class_sessions s where s.id = session_id and s.teacher_id = auth.uid() and s.status = 'EN_CURSO'));

-- Tareas: las define el maestro asignado o el staff; el estudiante entrega SOLO dentro de la ventana
-- (desde el inicio de la clase hasta el inicio de la próxima) y no puede borrar ni editar lo entregado.
create policy asg_read  on assignments for select to authenticated using (app_role() is not null);
create policy asg_write on assignments for all    to authenticated using (is_staff() or is_assigned_teacher(week)) with check (is_staff() or is_assigned_teacher(week));
create policy sub_read  on submissions for select to authenticated using (
  student_id = auth.uid() or is_staff() or exists (select 1 from assignments a where a.id = assignment_id and is_assigned_teacher(a.week)));
create policy sub_insert on submissions for insert to authenticated with check (
  student_id = auth.uid() and app_role() = 'ESTUDIANTE'
  and exists (select 1 from assignments a where a.id = assignment_id and now() >= a.opens_at and now() < a.closes_at));
create policy sub_review on submissions for update to authenticated
  using (is_staff() or exists (select 1 from assignments a where a.id = assignment_id and is_assigned_teacher(a.week)))
  with check (is_staff() or exists (select 1 from assignments a where a.id = assignment_id and is_assigned_teacher(a.week)));

create policy ma_read   on mandatory_activities for select to authenticated using (app_role() is not null);
create policy ma_staff  on mandatory_activities for all    to authenticated using (is_staff()) with check (is_staff());
create policy ac_read   on activity_completions for select to authenticated using (student_id = auth.uid() or is_staff() or teacher_id = auth.uid());
create policy ac_write  on activity_completions for all    to authenticated using (is_staff() or teacher_id = auth.uid()) with check (is_staff() or teacher_id = auth.uid());
create policy ia_read   on integration_activities for select to authenticated using (app_role() is not null);
create policy ia_staff  on integration_activities for all    to authenticated using (is_staff()) with check (is_staff());
create policy ip_read   on integration_participations for select to authenticated using (student_id = auth.uid() or is_staff() or app_role() = 'MAESTRO');
create policy ip_write  on integration_participations for insert to authenticated with check (is_staff() or (app_role() = 'MAESTRO' and registered_by = auth.uid() and is_assigned_teacher(week + 1)));
create policy crown_read on crowns for select to authenticated using (student_id = auth.uid() or is_staff() or app_role() = 'MAESTRO');
create policy score_read on lesson_scores for select to authenticated using (student_id = auth.uid() or is_staff() or app_role() = 'MAESTRO');
create policy score_write on lesson_scores for all to authenticated using (is_staff() or app_role() = 'MAESTRO') with check (is_staff() or app_role() = 'MAESTRO');

-- Recursos: Administrador y Pastor agregan, reemplazan y eliminan; el estudiante solo ve lo suyo (no la guía ni la presentación)
create policy res_read  on resources for select to authenticated using (
  is_staff() or app_role() = 'MAESTRO' and audience in ('MAESTRO','TODOS') or app_role() = 'ESTUDIANTE' and audience in ('ESTUDIANTE','TODOS'));
create policy res_staff on resources for all    to authenticated using (is_staff()) with check (is_staff());
create policy rv_read   on resource_versions for select to authenticated using (exists (select 1 from resources r where r.id = resource_id));
create policy rv_staff  on resource_versions for all    to authenticated using (is_staff()) with check (is_staff() and uploaded_by = auth.uid());

create policy photo_read  on class_photos for select to authenticated using (app_role() is not null);
create policy photo_write on class_photos for insert to authenticated with check (uploaded_by = auth.uid() and app_role() in ('MAESTRO','PASTOR','ADMINISTRADOR'));
create policy notif_own   on notifications for select to authenticated using (to_user = auth.uid());
create policy notif_read  on notifications for update to authenticated using (to_user = auth.uid()) with check (to_user = auth.uid());
create policy games_read  on games for select to authenticated using (active or is_staff());
create policy games_staff on games for all    to authenticated using (is_staff()) with check (is_staff());

-- ---------- Privilegios ----------
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function start_class(int, uuid), end_class(uuid), teacher_prep(uuid, int) to authenticated;
revoke execute on function generate_assignment_alerts() from public, authenticated;   -- solo el servidor/programador (service_role)
