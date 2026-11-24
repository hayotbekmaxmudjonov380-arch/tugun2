/* Tez tekshiruv: build qilingan ilovani `vite preview` orqali ochib, har bir bo'limni, terminalni,
   PWA manifest va service worker'ni (oflayn qayta ochish bilan) tekshiradi.
   Ishga tushirish: npm run build && npm run smoke   (Playwright o'rnatilgan bo'lishi kerak) */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const PORT = 4179, URL = `http://localhost:${PORT}`;
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "pipe" });
let failed = 0;
const check = (label, ok, extra = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra !== "" ? `  [${extra}]` : ""}`); };

async function waitUp() {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(URL)).ok) return; } catch {} await new Promise(r => setTimeout(r, 250)); }
  throw new Error("preview server did not start");
}

try {
  await waitUp();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, timezoneId: "Asia/Tashkent" });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on("pageerror", e => errs.push(`pageerror: ${e.message}`));
  pg.on("console", m => { if (m.type() === "error") errs.push(`console.error: ${m.text()} @ ${m.location().url}`); });

  await pg.goto(URL + "/#tuzilma"); await pg.waitForTimeout(1200);
  check("board renders departments", await pg.locator(".dept-node").count() > 0, await pg.locator(".dept-node").count());
  check("sandbox banner shown", (await pg.textContent("#banner")).includes("Sinov rejimi"));
  for (const v of ["dashboard", "tasklar", "davomat", "nizom", "sozlamalar", "qollanma"]) {
    await pg.goto(URL + "/#" + v); await pg.waitForTimeout(400);
    const len = (await pg.textContent("#view")).trim().length;
    check(`view ${v} renders`, len > 50, len);
  }
  await pg.goto(URL + "/#kiosk"); await pg.waitForTimeout(400);
  check("kiosk hides topbar", !(await pg.isVisible(".topbar")));

  const man = await (await fetch(URL + "/manifest.webmanifest")).json();
  check("manifest has 192/512 icons", ["192x192", "512x512"].every(s => man.icons.some(i => i.sizes === s)));
  const sw = await pg.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  check("service worker active", sw);

  await pg.goto(URL + "/#tuzilma"); await pg.waitForTimeout(800);   // SW endi sahifani nazorat qiladi va keshlaydi
  await ctx.setOffline(true);
  await pg.reload(); await pg.waitForTimeout(1200);
  check("opens offline from cache", await pg.locator(".dept-node").count() > 0);
  await ctx.setOffline(false);

  const real = errs.filter(e => !/fonts\.(googleapis|gstatic)|ERR_INTERNET_DISCONNECTED/.test(e));
  check("no page errors", real.length === 0, real.join(" | "));
  await b.close();
} catch (e) { failed++; console.error(e); }
finally { server.kill(); }
console.log(failed ? `\n${failed} FAIL` : "\nALL PASS");
process.exit(failed ? 1 : 0);
