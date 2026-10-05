// Permite importar .css/.png desde Node para probar los componentes sin navegador.
export async function load(url, context, nextLoad) {
  if (/\.css(\?.*)?$/.test(url)) return { format: "module", source: "export default {}", shortCircuit: true };
  if (/\.(png|jpe?g|svg)(\?.*)?$/.test(url)) return { format: "module", source: 'export default "stub.png"', shortCircuit: true };
  return nextLoad(url, context);
}
