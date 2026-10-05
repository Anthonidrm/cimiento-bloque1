import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../auth/AuthContext";
import { useWeekParam } from "../utils/weekParam";
import { listLessons } from "../backend/teaching";
import { startClass, endClass, openSession, listReports, listSessions } from "../backend/classes";
import { listGroups } from "../backend/people";
import { myPrep } from "../backend/prep";
import { PhotosPanel } from "../components/panels/ExtrasPanels";
import { ReportView } from "../components/panels/SessionsReports";
import { Msg, Loading, BackendGate } from "../components/panels/ui";
import { useAsync, useAction, fmtDate } from "../components/panels/hooks";
import { AttendanceList, SessionLog, TasksReview, MandatoryBlock, IntegrationBlock } from "../components/classroom/ClassroomParts";
import { useElapsed, clock, useClassStudents } from "../components/classroom/classroomHooks";
import "./Course.css";

/** Aula: INICIAR / FINALIZAR CLASE (temporizador), pase de lista, tareas, actividades, integración, fotos e informe. */
export default function ClassRoom() {
  const week = useWeekParam();
  const { session, backend } = useAuth();
  const lessons = useAsync(listLessons, [week]);
  const open = useAsync(() => openSession(week), [week]);
  const groups = useAsync(listGroups, []);
  const prep = useAsync(() => myPrep(session!.userId, week), [week]);
  const reports = useAsync(listReports, [week]);
  const sessions = useAsync(listSessions, [week]);
  const [group, setGroup] = useState("");
  const act = useAction();
  const s = open.data;
  const elapsed = useElapsed(s?.started_at);
  const { list: students } = useClassStudents(s?.group_id ?? null);

  if (!session) return null;
  if (!backend) return <div className="container page"><BackendGate what="El aula (iniciar clase, pase de lista, tareas)">{null}</BackendGate></div>;
  if (!Number.isFinite(week) || week < 1 || week > 52) return <Navigate to="/plan-anual" replace />;
  if (lessons.loading || open.loading || lessons.error) return <div className="container page"><Loading state={{ loading: lessons.loading || open.loading, error: lessons.error ?? open.error }} /></div>;

  const lesson = (lessons.data ?? []).find((l) => l.week === week);
  const isStaff = session.role === "ADMINISTRADOR" || session.role === "PASTOR";
  const isMine = lesson?.teacher_id === session.userId;
  const canRun = isMine || isStaff;
  const last = (sessions.data ?? []).filter((x) => x.week === week && x.status === "FINALIZADA")[0];
  const lastReport = last ? (reports.data ?? []).find((r) => r.session_id === last.id) : undefined;
  const p = prep.data;

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Maestros", to: "/maestros" }, { label: `Aula · Semana ${week}` }]} />
      <header className="page-header">
        <p className="page-header__eyebrow">Semana {week} · {lesson?.title ?? "tema pendiente"}</p>
        <h1>Aula</h1>
        <p className="page-header__desc"><strong>MAESTRO ASIGNADO:</strong> {lesson?.teacher_name ?? "Sin asignar"}</p>
      </header>
      <Msg msg={act.msg} />

      {!s && (
        <section className="pn-section">
          <h2>Iniciar clase</h2>
          {!canRun && <p className="pn-msg is-error">Solo el maestro asignado (o el Administrador/Pastor como excepción) puede iniciar esta clase.</p>}
          {isMine && p && (
            <div className="pn-cards">
              <div className="pn-card"><small>Guía del Maestro</small><div className="big">{p.guide_done}/23</div><small>apartados completados</small></div>
              <div className="pn-card"><small>Examen</small><div className="big">{p.exam_completed ? "Hecho" : "Pendiente"}</div></div>
              <div className="pn-card"><small>Preparación</small><div className="big">{Math.round(p.total_pts)} %</div></div>
            </div>
          )}
          {canRun && lesson?.teacher_id && (
            <div className="pn-inline">
              <label>Grupo <select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Todos mis estudiantes</option>{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
              <button type="button" className="pn-btn" disabled={act.busy} onClick={() => act.run(async () => { await startClass(week, group || undefined); open.reload(); }, "Clase iniciada.")}>▶ INICIAR CLASE</button>
            </div>
          )}
          {!lesson?.teacher_id && <p>Esta lección todavía no tiene maestro asignado.</p>}
          <p><small>Antes de iniciar, el servidor verifica la preparación del maestro asignado (guía completa y examen). Si no cumple, el Administrador o el Pastor pueden iniciarla.</small></p>
          {lastReport && <ReportView c={lastReport.content as never} />}
        </section>
      )}

      {s && (
        <>
          <section className="pn-section">
            <h2>Clase en curso</h2>
            <p>Iniciada {fmtDate(s.started_at)} por {s.teacher_name}</p>
            <div className="pn-timer" role="timer" aria-label="Tiempo de clase">{clock(elapsed)}</div>
            <div className="pn-inline" style={{ marginTop: 10 }}>
              <Link className="pn-btn secondary" to={`/plan-anual/semana-${week}/presentacion?sesion=${s.id}`} style={{ textDecoration: "none" }}>Proyectar presentación (se registra en la clase)</Link>
              {canRun && <button type="button" className="pn-btn danger" disabled={act.busy} onClick={() => { if (confirm("¿Finalizar la clase? Se generará el informe.")) act.run(async () => { await endClass(s.id); open.reload(); reports.reload(); sessions.reload(); }, "Clase finalizada. Informe generado."); }}>■ FINALIZAR CLASE</button>}
            </div>
          </section>
          <AttendanceList sessionId={s.id} week={week} groupId={s.group_id} canEdit={canRun} />
          <SessionLog sessionId={s.id} />
          <TasksReview week={week} students={students} />
          <MandatoryBlock week={week} students={students} />
          <IntegrationBlock week={week} students={students} />
          <PhotosPanel canUpload week={week} sessionId={s.id} />
        </>
      )}
    </div>
  );
}
