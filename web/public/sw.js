/* Tugun service worker.
   - Sahifa (navigatsiya): avval tarmoq, internet bo'lmasa saqlangan nusxa.
   - /assets/* (nomida hash bor, o'zgarmaydi): avval kesh.
   - Shriftlar: avval kesh.
   - Supabase va boshqa API so'rovlari hech qachon keshlanmaydi. */
const CACHE = "tugun-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png"];

/* O'rnatishda sahifa va u ishlatadigan /assets/* fayllari ham keshlanadi: birinchi ochilishdan keyinoq oflayn ishlaydi. */
async function precache() {
  const c = await caches.open(CACHE);
  await c.addAll(SHELL);
  const html = await (await c.match("/")).text();
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]))];
  await c.addAll(assets);
}
self.addEventListener("install", e => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") { const c = await caches.open(CACHE); c.put(req, res.clone()); }
  return res;
}
async function networkFirstPage(req) {
  try {
    const res = await fetch(req);
    if (res.ok) { const c = await caches.open(CACHE); c.put("/", res.clone()); }
    return res;
  } catch (err) {
    return (await caches.match("/", { ignoreVary: true })) || Response.error();
  }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate" && url.origin === self.location.origin) { e.respondWith(networkFirstPage(req)); return; }
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) { e.respondWith(cacheFirst(req)); return; }
  if (FONT_HOSTS.includes(url.hostname)) { e.respondWith(cacheFirst(req)); return; }
});
