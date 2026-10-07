-- CIMIENTO — TODAS las migraciones en un solo archivo. GENERADO por tools/backend/empaquetar_sql.sh (no editar a mano).
-- Uso: Supabase → SQL Editor → pegar COMPLETO y ejecutar UNA sola vez, en un proyecto NUEVO.
-- Corre en una sola transacción: si algo falla, no queda nada a medias.

-- >>>>>>>>>> 0001_cimiento_base.sql
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

-- >>>>>>>>>> 0002_cimiento_integral.sql
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

-- ---------- Ayudas para la aplicación ----------
create function my_profile() returns setof profiles language sql stable security definer set search_path = public as $$
  select * from profiles where id = auth.uid() and active
$$;
-- Lecciones con su maestro asignado: visible para TODOS los usuarios activos (el estudiante ve quién es su maestro)
create view v_lessons as
select l.week, l.title, l.module_id, m.title as module_title, l.developed,
       a.teacher_id, p.display_name as teacher_name, a.assigned_at, s.status as assignment_status, s.days_late
from lessons l
join modules m on m.id = l.module_id
left join teacher_assignments a on a.week = l.week
left join profiles p on p.id = a.teacher_id
left join v_assignment_status s on s.week = l.week
where app_role() is not null;

-- Quién lo hizo lo pone el servidor (no se confía en lo que envíe el navegador)
alter table attendance               alter column recorded_by   set default auth.uid();
alter table assignments              alter column created_by    set default auth.uid();
alter table mandatory_activities     alter column created_by    set default auth.uid();
alter table class_photos             alter column uploaded_by   set default auth.uid();
alter table resource_versions        alter column uploaded_by   set default auth.uid();
alter table integration_assignments  alter column assigned_by   set default auth.uid();
alter table integration_participations alter column registered_by set default auth.uid();
alter table activity_completions     alter column teacher_id    set default auth.uid();
alter table submissions              alter column student_id    set default auth.uid();
alter table game_results             alter column student_id    set default auth.uid();
alter table activity_submissions     alter column student_id    set default auth.uid();

-- ---------- Privilegios ----------
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
grant execute on function my_profile(), exam_answer(int, text, text, jsonb), guide_add_seconds(int, int, int), presentation_add_seconds(int, int, int, uuid),
  session_event(uuid, text, jsonb), session_note(uuid, text), set_participation(uuid, int, int), grade_submission(uuid, int, text) to authenticated;

-- >>>>>>>>>> 0003_cimiento_storage.sql
-- =====================================================================================
-- CIMIENTO — migración 0003: almacenamiento PRIVADO (Supabase Storage). PROPUESTA, no aplicada.
-- Reemplaza el uso de public/ para contenido privado (guías, presentaciones, hojas, entregas, fotos).
-- Requiere el esquema `storage` de Supabase. Los buckets son privados: se leen con URL firmadas.
--
-- Convención de rutas (la usan las políticas; no cambiarla sin cambiar la política):
--   recursos : {audiencia}/{semana}/{tipo}/{ranura}/{marca-de-tiempo}-{archivo}      audiencia = maestro | estudiante | todos
--   entregas : {id-de-tarea}/{id-del-estudiante}/{marca-de-tiempo}-{archivo}
--   fotos    : {semana}/{id-de-sesión | sin-clase}/{marca-de-tiempo}-{archivo}
-- =====================================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('recursos', 'recursos', false, 52428800, array['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp','video/mp4']),
  ('entregas', 'entregas', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp']),
  ('fotos',    'fotos',    false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- ---------- recursos: Administrador y Pastor escriben; cada audiencia lee lo suyo ----------
create policy rec_read on storage.objects for select to authenticated using (
  bucket_id = 'recursos' and (
    is_staff()
    or (app_role() = 'MAESTRO'    and (storage.foldername(name))[1] in ('maestro', 'todos'))
    or (app_role() = 'ESTUDIANTE' and (storage.foldername(name))[1] in ('estudiante', 'todos'))));
create policy rec_write  on storage.objects for insert to authenticated with check (bucket_id = 'recursos' and is_staff());
create policy rec_update on storage.objects for update to authenticated using (bucket_id = 'recursos' and is_staff()) with check (bucket_id = 'recursos' and is_staff());
create policy rec_delete on storage.objects for delete to authenticated using (bucket_id = 'recursos' and is_staff());

-- ---------- entregas: el estudiante sube SOLO a su carpeta y SOLO dentro de la ventana; no edita ni borra ----------
create policy ent_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'entregas' and app_role() = 'ESTUDIANTE' and (storage.foldername(name))[2] = auth.uid()::text
  and exists (select 1 from assignments a where a.id::text = (storage.foldername(name))[1] and now() >= a.opens_at and now() < a.closes_at));
create policy ent_read on storage.objects for select to authenticated using (
  bucket_id = 'entregas' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or is_staff()
    or exists (select 1 from assignments a where a.id::text = (storage.foldername(name))[1] and is_assigned_teacher(a.week))));

-- ---------- fotos: sube el maestro, el Pastor o el Administrador; el estudiante ve solo las de su grupo ----------
create policy fot_insert on storage.objects for insert to authenticated with check (bucket_id = 'fotos' and app_role() in ('MAESTRO','PASTOR','ADMINISTRADOR'));
create policy fot_read   on storage.objects for select to authenticated using (
  bucket_id = 'fotos' and (
    is_staff() or app_role() = 'MAESTRO'
    or (app_role() = 'ESTUDIANTE' and exists (select 1 from class_photos p where p.storage_path = name))));   -- class_photos ya filtra por grupo
create policy fot_delete on storage.objects for delete to authenticated using (bucket_id = 'fotos' and is_staff());

-- >>>>>>>>>> 0004_cimiento_acceso_y_auditoria.sql
-- =====================================================================================
-- CIMIENTO — migración 0004: primer acceso, historial de cambios y tareas programadas. PROPUESTA, no aplicada.
-- Solo CREA objetos nuevos.
-- =====================================================================================

-- ---------- Primer acceso: el usuario define su contraseña (Supabase Auth) y marca que ya lo hizo ----------
-- El cliente cambia la contraseña con supabase.auth.updateUser({ password }) y llama a esta función.
-- Solo puede tocar SU propia marca; no puede cambiar rol ni estado.
create function complete_first_access() returns void language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid() and active
$$;
revoke execute on function complete_first_access() from public, anon;
grant  execute on function complete_first_access() to authenticated;

-- ---------- Historial de cambios (quién cambió qué y cuándo) ----------
create table change_log (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_key    text,
  action     text not null,                 -- INSERT | UPDATE | DELETE | ADMIN_USERS_*
  old_data   jsonb,
  new_data   jsonb,
  done_by    uuid,                          -- NULL cuando lo hace un proceso del servidor
  done_at    timestamptz not null default now()
);
create index on change_log(table_name, done_at desc);
alter table change_log enable row level security;
create policy changelog_read on change_log for select to authenticated using (is_staff());   -- Admin y Pastor leen; nadie escribe a mano
grant select on change_log to authenticated;

create function log_change() returns trigger language plpgsql security definer set search_path = public as $$
declare o jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end; n jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
begin
  insert into change_log(table_name, row_key, action, old_data, new_data, done_by)
  values (tg_table_name, coalesce(n ->> 'id', n ->> 'week', o ->> 'id', o ->> 'week'), tg_op, o, n, auth.uid());
  return null;
end $$;
create trigger log_profiles            after insert or update or delete on profiles             for each row execute function log_change();
create trigger log_resources           after insert or update or delete on resources            for each row execute function log_change();
create trigger log_resource_versions   after insert or update or delete on resource_versions    for each row execute function log_change();
create trigger log_assignments         after insert or update or delete on assignments          for each row execute function log_change();
create trigger log_mandatory           after insert or update or delete on mandatory_activities for each row execute function log_change();
create trigger log_integration         after insert or update or delete on integration_activities for each row execute function log_change();
create trigger log_app_config          after insert or update or delete on app_config           for each row execute function log_change();

-- ---------- Tareas programadas (alertas de asignación y recordatorios) ----------
-- En Supabase real se activan con la extensión pg_cron (Database → Extensions). Se deja comentado porque en una base
-- sin pg_cron fallaría; ejecutar manualmente en el SQL Editor cuando exista el proyecto:
--   select cron.schedule('cimiento-alertas-asignacion', '*/30 * * * *', $$ select generate_assignment_alerts() $$);
--   select cron.schedule('cimiento-recordatorios',      '0 13 * * *',   $$ select generate_reminders() $$);

-- >>>>>>>>>> 0005_cimiento_reemplazo_recursos.sql
-- =====================================================================================
-- CIMIENTO — migración 0005: el Pastor (y cualquier staff) puede reemplazar recursos subidos por otro. PROPUESTA, no aplicada.
-- Defecto corregido: al insertar una versión nueva, el disparador set_current_version() marcaba la anterior como no vigente
-- con UPDATE bajo RLS; la política rv_staff exige `uploaded_by = auth.uid()`, así que si la versión anterior la subió otra
-- persona (p. ej. el Administrador), el UPDATE del Pastor fallaba y se rechazaba el reemplazo completo.
-- Solución: el disparador se ejecuta con los privilegios del dueño (SECURITY DEFINER, search_path fijo). La política de
-- INSERT sigue exigiendo staff y que la versión nueva quede a nombre de quien la sube.
-- =====================================================================================
create or replace function set_current_version() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update resource_versions set is_current = false where resource_id = new.resource_id and is_current;
  return new;
end $$;

-- >>>>>>>>>> 0006_cimiento_pesos_preparacion.sql
-- =====================================================================================
-- CIMIENTO — migración 0006: nuevos pesos de la preparación del maestro. PROPUESTA, no aplicada.
--   Guía 45 % · Examen 25 % · Presentación 15 % · Actividades obligatorias 15 %  (suman EXACTAMENTE 100 %).
-- Antes: 50 / 30 / 20 / 0. Las actividades obligatorias dejan de pesar 0 y contribuyen al porcentaje final.
--
-- ⚠ SUPERADO por la migración 0007 en esta parte: las actividades obligatorias DEL MAESTRO son inicio y finalización de clase + pase
-- de lista (no las "actividades de la lección"). Esta migración conserva los pesos 45/25/15/15 y la regla de que sumen 100.
-- (Texto histórico:) Actividades obligatorias del maestro en una lección:
--   puntos = (actividades de la lección que el maestro registró en clase / actividades obligatorias de la lección) × 15
--   · "registró" = tiene al menos un cumplimiento (activity_completions) a su nombre para esa actividad.
--   · Si la lección NO tiene actividades obligatorias definidas, no hay nada que exigir: el componente se otorga completo (15).
--     (Decisión a confirmar: la alternativa sería 0, que limitaría la preparación a 85 % en esas lecciones.)
-- Iniciar clase sigue exigiendo solo guía completa y examen (start_class no cambia): las actividades se realizan DURANTE la clase.
-- =====================================================================================

-- ---------- Los pesos deben sumar exactamente 100 (lo exige la base de datos) ----------
create function check_prep_weights() returns trigger language plpgsql as $$
declare total numeric;
begin
  if new.key = 'prep_weights' then
    total := coalesce((new.value ->> 'guide')::numeric, 0) + coalesce((new.value ->> 'exam')::numeric, 0)
           + coalesce((new.value ->> 'presentation')::numeric, 0) + coalesce((new.value ->> 'mandatory_activities')::numeric, 0);
    if total <> 100 then raise exception 'Los pesos de preparación deben sumar exactamente 100 (suman %).', total; end if;
  end if;
  return new;
end $$;
create trigger trg_check_prep_weights before insert or update on app_config for each row execute function check_prep_weights();

update app_config
   set value = '{"guide":45,"exam":25,"presentation":15,"mandatory_activities":15}'::jsonb, updated_at = now()
 where key = 'prep_weights';

-- ---------- teacher_prep con el cuarto componente (cambia el tipo de resultado: se recrea la función y la vista que la usa) ----------
drop view v_teacher_progress;
drop function teacher_prep(uuid, int);

create function teacher_prep(p_user uuid, p_week int)
returns table (guide_pts numeric, exam_pts numeric, presentation_pts numeric, mandatory_pts numeric, total_pts numeric,
               guide_done int, exam_completed boolean, mandatory_done int, mandatory_total int)
language plpgsql stable security definer set search_path = public as $$
declare w jsonb; secs int; mins int; slides int; scoring text; sc numeric; gd int; used int; mt int; md int;
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
  select count(*) into mt from mandatory_activities where week = p_week;
  select count(distinct c.activity_id) into md from activity_completions c join mandatory_activities m on m.id = c.activity_id
   where m.week = p_week and c.teacher_id = p_user;

  guide_pts        := round((gd::numeric / secs) * (w->>'guide')::numeric, 1);
  exam_pts         := round((coalesce(sc, 0) / 100) * (w->>'exam')::numeric, 1);
  presentation_pts := round((least(used, slides)::numeric / slides) * (w->>'presentation')::numeric, 1);
  mandatory_pts    := case when mt = 0 then (w->>'mandatory_activities')::numeric
                           else round((least(md, mt)::numeric / mt) * (w->>'mandatory_activities')::numeric, 1) end;
  total_pts := guide_pts + exam_pts + presentation_pts + mandatory_pts;
  guide_done := gd;
  exam_completed := sc is not null;
  mandatory_done := least(md, mt);
  mandatory_total := mt;
  return next;
end $$;
grant execute on function teacher_prep(uuid, int) to authenticated;

create view v_teacher_progress with (security_invoker = true) as
select a.week, a.teacher_id, p.display_name as teacher_name,
       tp.guide_pts, tp.exam_pts, tp.presentation_pts, tp.mandatory_pts, tp.total_pts, tp.guide_done, tp.exam_completed,
       tp.mandatory_done, tp.mandatory_total,
       greatest((select max(updated_at) from guide_progress g where g.user_id = a.teacher_id and g.week = a.week),
                (select max(updated_at) from presentation_usage u where u.user_id = a.teacher_id and u.week = a.week),
                (select max(completed_at) from exam_attempts x where x.user_id = a.teacher_id and x.week = a.week),
                (select max(completed_at) from activity_completions c join mandatory_activities m on m.id = c.activity_id where c.teacher_id = a.teacher_id and m.week = a.week)) as last_activity,
       s.status as assignment_status, s.days_late
from teacher_assignments a
join profiles p on p.id = a.teacher_id
cross join lateral teacher_prep(a.teacher_id, a.week) tp
left join v_assignment_status s on s.week = a.week
where is_staff() or a.teacher_id = auth.uid();
grant select on v_teacher_progress to authenticated;

-- >>>>>>>>>> 0007_cimiento_actividades_obligatorias_maestro.sql
-- =====================================================================================
-- CIMIENTO — migración 0007: actividades obligatorias DEL MAESTRO (15 % de su preparación). PROPUESTA, no aplicada.
-- CORRIGE el criterio de la 0006. Las actividades obligatorias del maestro son DOS (definidas por el propietario):
--     1. INICIO Y FINALIZACIÓN DE CLASE
--     2. PASE DE LISTA
-- Peso total 15 %, repartido por defecto 7,5 + 7,5 (app_config.prep_mandatory_split, suma 100).
-- NO forman parte de este 15 % las actividades de los estudiantes: ni las "actividades de la lección"
-- (mandatory_activities / activity_completions) ni las ACTIVIDADES DE INTEGRACIÓN (integration_*, coronas), que siguen siendo
-- módulos independientes y no se modifican.
--
-- Criterios (decisiones a confirmar):
--  · Inicio y finalización de clase: cuenta en una lección cuando el MAESTRO ASIGNADO inició la clase él mismo (started_by) y la
--    finalizó él mismo (ended_by, nuevo). Si la inicia o finaliza el Administrador/Pastor como excepción, el maestro no recibe el crédito.
--  · Pase de lista: cuenta cuando el maestro registró asistencia (Presente / Ausente / Excusa) de TODOS los estudiantes de la
--    lista de esa clase (los del grupo de la sesión; sin grupo, los de los grupos que él enseña). Una lista vacía no se puede evidenciar: no cuenta.
-- =====================================================================================

-- ---------- Quién finalizó la clase (sin tocar end_class: lo estampa un disparador) ----------
alter table class_sessions add column ended_by uuid references profiles(id);
create function stamp_session_end() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.ended_at is null and new.ended_at is not null and new.ended_by is null then new.ended_by := auth.uid(); end if;
  return new;
end $$;
create trigger trg_stamp_session_end before update on class_sessions for each row execute function stamp_session_end();

-- ---------- Reparto entre las dos actividades (debe sumar 100) ----------
insert into app_config(key, value, note) values ('prep_mandatory_split', '{"class":50,"attendance":50}', 'Reparto del peso de las actividades obligatorias del maestro: inicio y finalización de clase / pase de lista (suma 100)')
on conflict (key) do nothing;

create or replace function check_prep_weights() returns trigger language plpgsql as $$
declare total numeric;
begin
  if new.key = 'prep_weights' then
    total := coalesce((new.value ->> 'guide')::numeric, 0) + coalesce((new.value ->> 'exam')::numeric, 0)
           + coalesce((new.value ->> 'presentation')::numeric, 0) + coalesce((new.value ->> 'mandatory_activities')::numeric, 0);
    if total <> 100 then raise exception 'Los pesos de preparación deben sumar exactamente 100 (suman %).', total; end if;
  elsif new.key = 'prep_mandatory_split' then
    total := coalesce((new.value ->> 'class')::numeric, 0) + coalesce((new.value ->> 'attendance')::numeric, 0);
    if total <> 100 then raise exception 'El reparto de las actividades obligatorias debe sumar 100 (suma %).', total; end if;
  end if;
  return new;
end $$;

-- ---------- teacher_prep: el cuarto componente ahora es inicio/fin de clase + pase de lista ----------
drop view v_teacher_progress;
drop function teacher_prep(uuid, int);

create function teacher_prep(p_user uuid, p_week int)
returns table (guide_pts numeric, exam_pts numeric, presentation_pts numeric, class_pts numeric, attendance_pts numeric, mandatory_pts numeric, total_pts numeric,
               guide_done int, exam_completed boolean, class_done boolean, attendance_done boolean, mandatory_done int, mandatory_total int)
language plpgsql stable security definer set search_path = public as $$
declare w jsonb; sp jsonb; secs int; mins int; slides int; scoring text; sc numeric; gd int; used int; ses record; roster int; marked int;
begin
  select value into w  from app_config where key = 'prep_weights';
  select value into sp from app_config where key = 'prep_mandatory_split';
  secs   := cfg_text('guide_sections')::int;
  mins   := cfg_text('presentation_min_seconds')::int;
  slides := cfg_text('presentation_slides')::int;
  scoring := coalesce(cfg_text('exam_scoring'), 'best');
  select count(*) into gd from guide_progress where user_id = p_user and week = p_week and completed_at is not null;
  select case scoring when 'first'  then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no asc  limit 1)
                      when 'latest' then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no desc limit 1)
                      else (select max(score_percent) from exam_attempts where user_id = p_user and week = p_week and completed_at is not null) end into sc;
  select count(*) into used from presentation_usage where user_id = p_user and week = p_week and seconds >= mins;

  -- Actividad obligatoria 1: inicio y finalización de clase hechos por el propio maestro
  class_done := exists (select 1 from class_sessions s where s.week = p_week and s.teacher_id = p_user
                         and s.started_by = p_user and s.ended_by = p_user and s.status = 'FINALIZADA');

  -- Actividad obligatoria 2: pase de lista completo (todos los de la lista de la clase, registrado por el maestro)
  attendance_done := false;
  for ses in select id, group_id from class_sessions where week = p_week and teacher_id = p_user loop
    with r as (select distinct e.student_id from enrollments e
                where (ses.group_id is not null and e.group_id = ses.group_id)
                   or (ses.group_id is null and e.group_id in (select gt.group_id from group_teachers gt where gt.teacher_id = p_user)))
    select (select count(*) from r),
           (select count(distinct a.student_id) from attendance a where a.session_id = ses.id and a.recorded_by = p_user and a.student_id in (select student_id from r))
      into roster, marked;
    if roster > 0 and marked >= roster then attendance_done := true; exit; end if;
  end loop;

  guide_pts        := round((gd::numeric / secs) * (w->>'guide')::numeric, 1);
  exam_pts         := round((coalesce(sc, 0) / 100) * (w->>'exam')::numeric, 1);
  presentation_pts := round((least(used, slides)::numeric / slides) * (w->>'presentation')::numeric, 1);
  class_pts        := case when class_done      then round((w->>'mandatory_activities')::numeric * (sp->>'class')::numeric      / 100, 1) else 0 end;
  attendance_pts   := case when attendance_done then round((w->>'mandatory_activities')::numeric * (sp->>'attendance')::numeric / 100, 1) else 0 end;
  mandatory_pts    := class_pts + attendance_pts;
  total_pts        := guide_pts + exam_pts + presentation_pts + mandatory_pts;
  guide_done := gd;
  exam_completed := sc is not null;
  mandatory_done  := (class_done::int) + (attendance_done::int);
  mandatory_total := 2;
  return next;
end $$;
grant execute on function teacher_prep(uuid, int) to authenticated;

create view v_teacher_progress with (security_invoker = true) as
select a.week, a.teacher_id, p.display_name as teacher_name,
       tp.guide_pts, tp.exam_pts, tp.presentation_pts, tp.class_pts, tp.attendance_pts, tp.mandatory_pts, tp.total_pts,
       tp.guide_done, tp.exam_completed, tp.class_done, tp.attendance_done, tp.mandatory_done, tp.mandatory_total,
       greatest((select max(updated_at) from guide_progress g where g.user_id = a.teacher_id and g.week = a.week),
                (select max(updated_at) from presentation_usage u where u.user_id = a.teacher_id and u.week = a.week),
                (select max(completed_at) from exam_attempts x where x.user_id = a.teacher_id and x.week = a.week),
                (select max(coalesce(ended_at, started_at)) from class_sessions c where c.teacher_id = a.teacher_id and c.week = a.week)) as last_activity,
       s.status as assignment_status, s.days_late
from teacher_assignments a
join profiles p on p.id = a.teacher_id
cross join lateral teacher_prep(a.teacher_id, a.week) tp
left join v_assignment_status s on s.week = a.week
where is_staff() or a.teacher_id = auth.uid();
grant select on v_teacher_progress to authenticated;

-- >>>>>>>>>> 0008_cimiento_endurecimiento_y_diagnostico.sql
-- =====================================================================================
-- CIMIENTO — migración 0008: endurecimiento de permisos y diagnóstico. PROPUESTA, no aplicada.
-- En Supabase real, todo objeto nuevo de `public` recibe permisos automáticos para anon y authenticated, y las funciones son
-- ejecutables por PUBLIC. Esta migración cierra lo que no debe quedar abierto:
--  1. `anon` (visitante sin sesión) no accede a NADA de public: ni tablas, ni vistas, ni funciones, ni secuencias (tampoco a futuro).
--  2. Funciones INTERNAS solo para el servidor (disparadores, cron, otras funciones): notify, recompute_lesson_score,
--     generate_assignment_alerts, generate_reminders. Ningún usuario las ejecuta por RPC (antes cualquiera podía mandar
--     notificaciones a cualquier usuario o recalcular puntuaciones).
--  3. teacher_prep(usuario, semana): un usuario solo ve SU preparación (antes cualquiera veía la de cualquier maestro).
--  4. cimiento_health(): diagnóstico para el Administrador (esquema, permisos, semillas, almacenamiento, usuarios).
-- =====================================================================================

-- ---------- 1. anon: sin acceso a public ----------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
-- PUBLIC recibe EXECUTE por defecto en toda función nueva; solo la orden SIN `in schema` lo revoca para el rol que crea los objetos.
alter default privileges for role postgres revoke execute on functions from public;

-- ---------- 2. funciones internas: solo el servidor ----------
revoke execute on function notify(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function recompute_lesson_score(uuid, int)     from public, anon, authenticated;
revoke execute on function generate_assignment_alerts()          from public, anon, authenticated;
revoke execute on function generate_reminders()                  from public, anon, authenticated;

-- ---------- 3. teacher_prep con control de quién consulta ----------
create or replace function teacher_prep(p_user uuid, p_week int)
returns table (guide_pts numeric, exam_pts numeric, presentation_pts numeric, class_pts numeric, attendance_pts numeric, mandatory_pts numeric, total_pts numeric,
               guide_done int, exam_completed boolean, class_done boolean, attendance_done boolean, mandatory_done int, mandatory_total int)
language plpgsql stable security definer set search_path = public as $$
declare w jsonb; sp jsonb; secs int; mins int; slides int; scoring text; sc numeric; gd int; used int; ses record; roster int; marked int;
begin
  -- Un usuario solo puede consultar su propia preparación; el Administrador y el Pastor, la de cualquiera.
  -- (auth.uid() es nulo solo en contextos del servidor: service_role, cron, migraciones; anon ya no tiene EXECUTE.)
  if auth.uid() is not null and p_user is distinct from auth.uid() and not is_staff() then return; end if;
  select value into w  from app_config where key = 'prep_weights';
  select value into sp from app_config where key = 'prep_mandatory_split';
  secs   := cfg_text('guide_sections')::int;
  mins   := cfg_text('presentation_min_seconds')::int;
  slides := cfg_text('presentation_slides')::int;
  scoring := coalesce(cfg_text('exam_scoring'), 'best');
  select count(*) into gd from guide_progress where user_id = p_user and week = p_week and completed_at is not null;
  select case scoring when 'first'  then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no asc  limit 1)
                      when 'latest' then (select score_percent from exam_attempts where user_id = p_user and week = p_week and completed_at is not null order by attempt_no desc limit 1)
                      else (select max(score_percent) from exam_attempts where user_id = p_user and week = p_week and completed_at is not null) end into sc;
  select count(*) into used from presentation_usage where user_id = p_user and week = p_week and seconds >= mins;

  -- Actividad obligatoria 1: inicio y finalización de clase hechos por el propio maestro
  class_done := exists (select 1 from class_sessions s where s.week = p_week and s.teacher_id = p_user
                         and s.started_by = p_user and s.ended_by = p_user and s.status = 'FINALIZADA');

  -- Actividad obligatoria 2: pase de lista completo (todos los de la lista de la clase, registrado por el maestro)
  attendance_done := false;
  for ses in select id, group_id from class_sessions where week = p_week and teacher_id = p_user loop
    with r as (select distinct e.student_id from enrollments e
                where (ses.group_id is not null and e.group_id = ses.group_id)
                   or (ses.group_id is null and e.group_id in (select gt.group_id from group_teachers gt where gt.teacher_id = p_user)))
    select (select count(*) from r),
           (select count(distinct a.student_id) from attendance a where a.session_id = ses.id and a.recorded_by = p_user and a.student_id in (select student_id from r))
      into roster, marked;
    if roster > 0 and marked >= roster then attendance_done := true; exit; end if;
  end loop;

  guide_pts        := round((gd::numeric / secs) * (w->>'guide')::numeric, 1);
  exam_pts         := round((coalesce(sc, 0) / 100) * (w->>'exam')::numeric, 1);
  presentation_pts := round((least(used, slides)::numeric / slides) * (w->>'presentation')::numeric, 1);
  class_pts        := case when class_done      then round((w->>'mandatory_activities')::numeric * (sp->>'class')::numeric      / 100, 1) else 0 end;
  attendance_pts   := case when attendance_done then round((w->>'mandatory_activities')::numeric * (sp->>'attendance')::numeric / 100, 1) else 0 end;
  mandatory_pts    := class_pts + attendance_pts;
  total_pts        := guide_pts + exam_pts + presentation_pts + mandatory_pts;
  guide_done := gd;
  exam_completed := sc is not null;
  mandatory_done  := (class_done::int) + (attendance_done::int);
  mandatory_total := 2;
  return next;
end $$;

-- ---------- 4. Diagnóstico para el Administrador ----------
create function cimiento_health() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb := '[]'::jsonb; n int := 0; m int := 0; w jsonb; sp jsonb; sum_w numeric; sum_s numeric; has_cron boolean; ok_all boolean;
begin
  if app_role() is distinct from 'ADMINISTRADOR' then raise exception 'Solo el Administrador puede ver el diagnóstico.'; end if;

  select count(*) into n from pg_tables where schemaname = 'public' and not rowsecurity;
  r := r || jsonb_build_object('name', 'Permisos por fila (RLS) activos en todas las tablas', 'required', true, 'ok', n = 0, 'detail', case when n = 0 then 'todas protegidas' else n || ' tabla(s) sin RLS' end);

  r := r || jsonb_build_object('name', 'Migraciones 0001–0002: tablas base', 'required', true,
    'ok', to_regclass('public.profiles') is not null and to_regclass('public.class_sessions') is not null and to_regclass('public.attendance') is not null
          and to_regclass('public.exam_questions') is not null and to_regclass('public.group_teachers') is not null and to_regclass('public.notification_deliveries') is not null,
    'detail', 'perfiles, clases, asistencia, preguntas de examen, grupos, cola de correo');

  select count(*) into n from storage.buckets where id in ('recursos', 'entregas', 'fotos') and not public;
  r := r || jsonb_build_object('name', 'Migración 0003: almacenamiento privado (recursos, entregas, fotos)', 'required', true, 'ok', n = 3, 'detail', n || ' de 3 buckets privados');

  r := r || jsonb_build_object('name', 'Migración 0004: historial de cambios y primer acceso', 'required', true,
    'ok', to_regclass('public.change_log') is not null and exists (select 1 from pg_proc where proname = 'complete_first_access'), 'detail', 'change_log y complete_first_access');

  select value into w from app_config where key = 'prep_weights';
  select value into sp from app_config where key = 'prep_mandatory_split';
  sum_w := coalesce((w->>'guide')::numeric, 0) + coalesce((w->>'exam')::numeric, 0) + coalesce((w->>'presentation')::numeric, 0) + coalesce((w->>'mandatory_activities')::numeric, 0);
  sum_s := coalesce((sp->>'class')::numeric, 0) + coalesce((sp->>'attendance')::numeric, 0);
  r := r || jsonb_build_object('name', 'Migraciones 0006–0007: evaluación del maestro suma 100 %', 'required', true,
    'ok', sum_w = 100 and sum_s = 100 and exists (select 1 from information_schema.columns where table_name = 'class_sessions' and column_name = 'ended_by'),
    'detail', 'guía ' || coalesce(w->>'guide', '?') || ' · examen ' || coalesce(w->>'exam', '?') || ' · presentación ' || coalesce(w->>'presentation', '?') || ' · actividades ' || coalesce(w->>'mandatory_activities', '?') || ' (suma ' || sum_w || '); clase/lista ' || coalesce(sp->>'class', '?') || '/' || coalesce(sp->>'attendance', '?'));

  select count(*) into n from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public';
  select count(*) into m from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute');
  r := r || jsonb_build_object('name', 'Migración 0008: visitantes sin sesión (anon) sin acceso', 'required', true, 'ok', n = 0 and m = 0, 'detail', n || ' permisos de tabla y ' || m || ' funciones expuestas a anon');

  select count(*) into n from lessons; select count(*) into m from lessons where developed;
  r := r || jsonb_build_object('name', 'Semillas: 52 lecciones', 'required', true, 'ok', n = 52 and m >= 1, 'detail', n || ' lecciones, ' || m || ' desarrolladas');
  select count(*) into n from exam_questions;
  r := r || jsonb_build_object('name', 'Semillas: claves del examen del maestro', 'required', true, 'ok', n >= 1, 'detail', n || ' preguntas con su clave en el servidor');
  select count(*) into n from games;
  r := r || jsonb_build_object('name', 'Semillas: juegos del versículo', 'required', false, 'ok', n >= 1, 'detail', n || ' juegos');

  select count(*) into n from profiles where role = 'ADMINISTRADOR' and active;
  r := r || jsonb_build_object('name', 'Hay al menos un Administrador activo', 'required', true, 'ok', n >= 1, 'detail', n || ' administrador(es)');
  r := r || jsonb_build_object('name', 'Usuarios por rol', 'required', false, 'ok', true,
    'detail', coalesce((select string_agg(role || ': ' || c, ' · ' order by role) from (select role::text, count(*) c from profiles where active group by role) x), 'ninguno'));

  r := r || jsonb_build_object('name', 'Destinos de los informes de clase configurados', 'required', false, 'ok', exists (select 1 from app_config where key = 'report_recipients'),
    'detail', case when exists (select 1 from app_config where key = 'report_recipients') then 'configurados (el envío real además requiere proveedor de correo y la función send-deliveries)' else 'sin configurar: los informes quedan en cola (no se envían)' end);
  select count(*) into n from notification_deliveries where status = 'PENDIENTE';
  r := r || jsonb_build_object('name', 'Correos en cola sin enviar', 'required', false, 'ok', true, 'detail', n || ' pendiente(s)');

  has_cron := to_regclass('cron.job') is not null;
  n := 0;
  if has_cron then execute 'select count(*) from cron.job where jobname like ''cimiento-%''' into n; end if;
  r := r || jsonb_build_object('name', 'Tareas programadas (pg_cron) de alertas y recordatorios', 'required', false, 'ok', has_cron and n >= 1,
    'detail', case when not has_cron then 'pg_cron no está activado' when n = 0 then 'pg_cron activo pero sin las tareas de CIMIENTO' else n || ' tarea(s)' end);

  select coalesce(bool_and((c ->> 'ok')::boolean) filter (where (c ->> 'required')::boolean), true) into ok_all from jsonb_array_elements(r) c;
  return jsonb_build_object('ok', ok_all, 'checks', r, 'at', now());
end $$;
revoke execute on function cimiento_health() from public, anon;
grant  execute on function cimiento_health() to authenticated;
