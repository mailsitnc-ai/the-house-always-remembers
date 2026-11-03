import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Development server only (`apply: "serve"`, so it is not part of any build): lets the developer-only entity showcase
 * (`?showcase`) save its screenshots into docs/entity-reference/. Accepts a PNG data URL and a plain file name.
 */
const showcaseSave = (): Plugin => ({
  name: "showcase-save",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__showcase/save", (req, res) => {
      const q = new URL(req.url ?? "", "http://x").searchParams;
      const name = q.get("name") ?? "";
      const folder = q.get("dir") ?? "entity-reference-v2";
      if (req.method !== "POST" || !/^[a-z0-9-]+\.png$/.test(name) || !["entity-reference", "entity-reference-v2", "entity-reference-v3", "progressive-horror", "matron-true-form", "matron-transformation", "matron-transformation-verification"].includes(folder)) {
        res.statusCode = 400;
        res.end("bad request");
        return;
      }
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        const m = /^data:image\/png;base64,(.+)$/.exec(body);
        if (!m) {
          res.statusCode = 400;
          res.end("not a png data url");
          return;
        }
        const dir = resolve(__dirname, "docs", folder);
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, name), Buffer.from(m[1], "base64"));
        res.end("saved");
      });
    });
  },
});

/**
 * Development server only: lets the developer-only walkthrough recorder (`?demo&record`) write its video segments, log and status into
 * docs/full-story-demo/video/. Names are restricted to plain files with a video, text or JSON extension.
 */
const demoSave = (): Plugin => ({
  name: "demo-save",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__demo/save", (req, res) => {
      const q = new URL(req.url ?? "", "http://x").searchParams;
      const file = q.get("file") ?? "";
      if (req.method !== "POST" || !/^[a-z0-9-]+\.(webm|txt|json)$/.test(file)) {
        res.statusCode = 400;
        res.end("bad request");
        return;
      }
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const dir = resolve(__dirname, "docs", "full-story-demo", "video");
        mkdirSync(dir, { recursive: true });
        const body = Buffer.concat(chunks);
        if (q.get("mode") === "append") appendFileSync(resolve(dir, file), body);
        else writeFileSync(resolve(dir, file), body);
        res.end("saved");
      });
    });
  },
});

/**
 * Development server only. The Vite client reloads the whole page whenever its HMR WebSocket drops and reconnects ("server connection lost.
 * Polling for restart..."), which destroyed a long recorded walkthrough. For pages opened with `?demo` or `?observer` this removes the
 * `<script src="/@vite/client">` tag Vite injects, so no HMR client runs in that page: no WebSocket, no reconnect logic, no reload-on-change.
 * (The game has no CSS imports and no `import.meta.hot`, so nothing else loads the client; `import.meta.env` is inlined by the server.)
 * Normal pages (without those flags) keep hot reload. The cost for a demo page: edits made while it runs do not refresh it.
 */
const demoNoReload = (): Plugin => ({
  name: "demo-no-reload",
  apply: "serve",
  transformIndexHtml: {
    order: "post",
    handler(html, ctx) {
      if (!/[?&](demo|observer)(=|&|$)/.test(ctx.originalUrl ?? "")) return html;
      return html.replace(/<script\b[^>]*\/@vite\/client[^>]*><\/script>\s*/g, "");
    },
  },
});

// Relative base so the build works from any path, including a GitHub Pages project URL.
export default defineConfig({ base: "./", plugins: [showcaseSave(), demoSave(), demoNoReload()] });
