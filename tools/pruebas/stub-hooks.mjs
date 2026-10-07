// Permite importar .css/.png desde Node y mapear el import de Deno (esm.sh) al paquete local de supabase-js.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("https://esm.sh/@supabase/supabase-js")) return nextResolve("@supabase/supabase-js", context);
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (/\.css(\?.*)?$/.test(url)) return { format: "module", source: "export default {}", shortCircuit: true };
  if (/\.(png|jpe?g|svg)(\?.*)?$/.test(url)) return { format: "module", source: 'export default "stub.png"', shortCircuit: true };
  return nextLoad(url, context);
}
