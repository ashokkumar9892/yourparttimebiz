// Local preview without the Netlify CLI: serves public/ and runs the two
// functions in this process. Limits and saved submissions are kept in memory.
// Usage: npm run dev   (settings come from .env; see .env.example)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import submit from "../netlify/functions/submit.mjs";
import contact from "../netlify/functions/contact.mjs";

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const api = { "/api/submit": submit, "/api/contact": contact };
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain" };

function staticFile(pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  for (const candidate of [clean || "index.html", `${clean}.html`]) {
    const file = path.join(pub, candidate);
    if (file.startsWith(pub) && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
}

const port = Number(process.env.PORT) || 8888;
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const handler = api[url.pathname];
  if (handler) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const response = await handler(request, { ip: req.socket.remoteAddress });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return response.body ? Readable.fromWeb(response.body).pipe(res) : res.end();
  }
  const file = staticFile(url.pathname);
  if (!file) {
    res.writeHead(404, { "content-type": "text/html" });
    return fs.createReadStream(path.join(pub, "404.html")).pipe(res);
  }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`http://localhost:${port}`));
