// localStorage y document simulados para ejecutar la lógica y el renderizado en Node.
export const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};
(globalThis as any).document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
let pass = 0, fail = 0;
export const ok = (c: boolean, m: string) => { if (c) pass++; else fail++; console.log((c ? "  ✅ " : "  ❌ ") + m); };
export const done = () => { console.log(`\nRESULTADO: ${pass} correctas, ${fail} fallidas`); process.exit(fail ? 1 : 0); };
