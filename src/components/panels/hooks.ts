import { useEffect, useState } from "react";

/** Carga asíncrona sencilla: { data, error, loading, reload }. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    fn()
      .then((d) => live && setState({ data: d, error: null, loading: false }))
      .catch((e: Error) => live && setState({ data: null, error: e.message, loading: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

/** Ejecuta una acción con estado de "ocupado" y mensaje de error/éxito. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(fn: () => Promise<unknown>, okText = "Guardado.") {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, msg, run, clear: () => setMsg(null) };
}

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const fmtDur = (s?: number | null) => (s == null ? "—" : `${Math.floor(s / 60)} min ${s % 60} s`);
