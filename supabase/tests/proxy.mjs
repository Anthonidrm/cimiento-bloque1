// Proxy mínimo: supabase-js llama a {url}/rest/v1/... ; PostgREST sirve en la raíz. Solo para pruebas locales.
import http from "node:http";
const target = Number(process.env.PGRST_PORT || 3000), listen = Number(process.env.PROXY_PORT || 54321);
http.createServer((req, res) => {
  const url = req.url.replace(/^\/rest\/v1/, "") || "/";
  const p = http.request({ host: "127.0.0.1", port: target, path: url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(listen, () => console.log("proxy listo en", listen));
