import { useEffect, useState } from "react";
import { listMyStudents } from "../../backend/classes";
import { listEnrollments } from "../../backend/people";
import type { Profile } from "../../backend/types";
import { useAsync } from "../panels/hooks";

/** Segundos transcurridos desde `iso` (temporizador de la clase). */
export function useElapsed(iso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000)) : 0;
}
export const clock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Estudiantes de la clase: los del grupo de la sesión, o los que el maestro puede ver. */
export function useClassStudents(groupId: string | null) {
  const students = useAsync(listMyStudents, []);
  const enr = useAsync(listEnrollments, []);
  const list: Profile[] = (students.data ?? []).filter((s) => !groupId || (enr.data ?? []).some((e) => e.student_id === s.id && e.group_id === groupId));
  return { list, loading: students.loading || enr.loading, error: students.error ?? enr.error };
}
