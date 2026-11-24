import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const APP_DIR = path.resolve(__dirname, "src/app");
const VIRTUAL = "virtual:tugun-app", RESOLVED = "\0" + VIRTUAL;

/* Supabase URL va publishable key ochiq qiymatlar (ma'lumotni RLS himoya qiladi).
   Ular ../.env.example'dan olinadi; .env.local yoki hosting sozlamasi ularni almashtira oladi. */
const example = path.resolve(__dirname, "../.env.example");
if (fs.existsSync(example)) {
  for (const line of fs.readFileSync(example, "utf8").split("\n")) {
    const m = line.match(/^\s*(VITE_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

/* Eski ilova modullari (src/app/*.js) bitta umumiy scope'da ishlaydi: ular fayl nomi tartibida
   bitta ES modulga qo'shiladi (legacy/build.py bilan bir xil). 10_db.js keyinchalik Supabase bilan almashtiriladi. */
function tugunApp() {
  return {
    name: "tugun-app",
    resolveId(id) { return id === VIRTUAL ? RESOLVED : null; },
    load(id) {
      if (id !== RESOLVED) return null;
      const files = fs.readdirSync(APP_DIR).filter(f => f.endsWith(".js")).sort();
      files.forEach(f => this.addWatchFile(path.join(APP_DIR, f)));
      let js = files.map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(APP_DIR, f), "utf8")).join("\n");
      if (js.split("/*__SEED__*/null").length !== 2) this.error("seed placeholder missing");
      js = js.replace("/*__SEED__*/null", "DEMO_SEED");
      return `import DEMO_SEED from "/src/demo/seed.json";\nimport { sb } from "/src/supabase.js";\n${js}`;
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(APP_DIR)) {
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
        return [];
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), tugunApp()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== "true",
    watch: process.env.DISABLE_HMR === "true" ? null : {},
  },
  build: { target: "es2020", sourcemap: true }
});
