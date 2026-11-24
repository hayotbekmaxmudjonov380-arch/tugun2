/* ================= database ================= */
const queues = {};
function enqueue(path, fn) { const p = (queues[path] || Promise.resolve()).catch(() => {}).then(fn); queues[path] = p; return p; }
function stripNulls(o) { if (Array.isArray(o)) return o; if (!o || typeof o !== "object") return o; const out = {}; for (const [k, v] of Object.entries(o)) { if (v === null) continue; out[k] = (v && typeof v === "object") ? stripNulls(v) : v; } return out; }
function merge(a, b) { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b || {})) { o[k] = (v && typeof v === "object" && !Array.isArray(v) && o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) ? merge(o[k], v) : v; } return o; }
function noDb() { toast("Baza ulanmagan, o'zgarish saqlanmadi", "crit"); return Promise.resolve(false); }
function writeFailed(e, path) {
  const code = e && e.code;
  if (code === "invalid_argument" || code === "not_granted" || code === "revoked") {
    if (path.startsWith("att/") || path.startsWith("secure/")) toast("Saqlanmadi: davomat va PIN'larni o'zgartirish uchun rahbar sizga «Editor» huquqini berishi kerak", "crit");
    else if (path.startsWith("org/")) { S.canAdmin = false; toast("Saqlanmadi: tuzilmani faqat rahbar o'zgartira oladi", "crit"); }
    else { S.canWrite = false; toast("Saqlanmadi: bu amal uchun sizda ruxsat yo'q", "crit"); }
  } else if (code === "quota_exceeded") toast("Saqlanmadi: ma'lumotlar bazasi to'lgan. Eski tasklarni o'chiring.", "crit");
  else if (code === "resource_exhausted") toast("Juda ko'p so'rov. Biroz kutib, qayta urinib ko'ring.", "crit");
  else toast("Saqlab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.", "crit");
  schedule();
  return false;
}
async function withRetry(fn) { try { return await fn(); } catch (e) { if (e && e.code === "unavailable") { await sleep(400 + Math.random() * 700); return await fn(); } throw e; } }
function dbUpdate(path, patch, base) {
  if (!S.db) return noDb();
  return enqueue(path, async () => {
    const ref = S.db.doc(path);
    try { await withRetry(() => ref.update(patch)); }
    catch (e) {
      if (e && e.code === "invalid_argument" && base) {
        const snap = await ref.get().catch(() => null);
        if (snap && !snap.exists) { await withRetry(() => ref.set(stripNulls(merge(base(), patch)))); return true; }
      }
      throw e;
    }
    return true;
  }).catch(e => writeFailed(e, path));
}
function dbSet(path, data) { if (!S.db) return noDb(); return enqueue(path, () => withRetry(() => S.db.doc(path).set(data)).then(() => true)).catch(e => writeFailed(e, path)); }
function dbDelete(path) { if (!S.db) return noDb(); return enqueue(path, () => withRetry(() => S.db.doc(path).delete()).then(() => true)).catch(e => writeFailed(e, path)); }
const orgBase = () => ({ branches: {}, departments: {}, staff: {}, settings: {} });
const orgUpdate = patch => dbUpdate(ORG_PATH, patch, orgBase);
function setAttRec(pid, date, patch) { return dbUpdate(`att/${date}`, { recs: { [pid]: patch } }, () => ({ day: date, month: monthOf(date), recs: {} })); }
/* Faoliyat lentasi: kun 4 bo'lakka bo'lingan hujjatlarda (har biri 256 KB chegarasidan ancha kichik).
   Lenta yordamchi ma'lumot: yozib bo'lmasa, asosiy amal baribir saqlangan, shuning uchun xato jim o'tadi. */
function logEvent(ev) {
  if (!S.db) return;
  const day = todayStr(), path = `activity/${day}-${Math.floor(new Date().getHours() / 6)}`;
  const id = uid("e"), body = { t: iso(), by: actorId(), ...ev };
  enqueue(path, async () => {
    const ref = S.db.doc(path);
    try { await withRetry(() => ref.update({ events: { [id]: body } })); }
    catch (e) {
      if (!(e && e.code === "invalid_argument")) throw e;
      const snap = await ref.get().catch(() => null);
      if (snap && !snap.exists) await ref.set({ day, events: { [id]: body } }); else throw e;
    }
  }).catch(() => {});
}
/* 45 kundan eski lenta hujjatlarini rahbar sahifani ochganda tozalaydi (bir sessiyada bir marta). */
async function pruneActivity() {
  if (S.pruned || S.sandbox || !S.db || !S.canWrite || myRole() !== "rahbar") return;
  S.pruned = true;
  try {
    const qs = await S.db.collection("activity").where("day", "<", addDays(todayStr(), -45)).limit(40).get();
    for (const d of qs.docs) { await S.db.doc(`activity/${d.id}`).delete().catch(() => {}); await sleep(150); }
  } catch (e) {}
}

async function waitForClaude(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (window.claude && typeof window.claude.use === "function") return window.claude; await sleep(100); } return null; }
let slowTimer = null;
function allLoaded() { return S.loaded.org && S.loaded.tasks && S.loaded["att:" + monthOf(todayStr())]; }
function checkLoaded() { if (allLoaded()) { S.slow = false; clearTimeout(slowTimer); } }
let subs = [];
const monthSubs = {};
let actSub = null, pinSub = null, stateSub = null;
function attach(db) {
  subs.forEach(u => { try { u(); } catch (e) {} }); subs = [];
  for (const [m, un] of Object.entries(monthSubs)) { try { un(); } catch (e) {} delete monthSubs[m]; }
  [actSub, pinSub, stateSub].forEach(u => { try { u && u(); } catch (e) {} }); actSub = pinSub = stateSub = null;
  S.att = {}; S.activity = {}; S.pins = null; S.loaded = {}; S.errors = {}; S.actDay = ""; S.docs = { nizom: null, pos: {} }; S.acks = {};
  const g = S.gen = (S.gen || 0) + 1;
  S.db = db;
  clearTimeout(slowTimer); S.slow = false;
  slowTimer = setTimeout(() => { if (g === S.gen && !allLoaded()) { S.slow = true; schedule(); } }, 10000);
  subs.push(db.doc(ORG_PATH).onSnapshot(snap => {
    if (g !== S.gen) return;
    S.org = normOrg(snap.exists ? snap.data() : null); bump(); S.loaded.org = true; delete S.errors.org; checkLoaded(); schedule();
  }, err => { if (g !== S.gen) return; S.errors.org = err; S.loaded.org = true; checkLoaded(); schedule(); }));
  subs.push(db.collection("tasks").onSnapshot(qs => {
    if (g !== S.gen) return;
    const next = {}; qs.docs.forEach(d => { if (d.exists) next[d.id] = d.data(); });
    S.tasks = next; bump(); S.loaded.tasks = true; delete S.errors.tasks; checkLoaded(); schedule();
  }, err => { if (g !== S.gen) return; S.errors.tasks = err; S.loaded.tasks = true; checkLoaded(); schedule(); }));
  subs.push(db.doc("docs/nizom").onSnapshot(s => { if (g !== S.gen) return; S.docs.nizom = s.exists ? s.data() : null; S.loaded.nizom = true; schedule(); }, () => { S.loaded.nizom = true; schedule(); }));
  subs.push(db.doc("docs/lavozimlar").onSnapshot(s => { if (g !== S.gen) return; S.docs.pos = s.exists ? (s.data().pos || {}) : {}; schedule(); }, () => {}));
  subs.push(db.collection("acks").onSnapshot(qs => { if (g !== S.gen) return; const m = {}; qs.docs.forEach(d => { if (d.exists) m[d.id] = d.data(); }); S.acks = m; schedule(); }, () => {}));
  pinSub = db.doc(PIN_PATH).onSnapshot(snap => { if (g !== S.gen) return; S.pins = snap.exists ? snap.data() : null; schedule(); }, () => {});
  ensureMonths();
  subscribeMyState();
}
function ensureMonths() {
  if (!S.db) return;
  const g = S.gen, today = todayStr();
  const keep = new Set([monthOf(today), monthOf(S.attDate || today), S.dash.month || monthOf(today)]);
  for (const m of keep) {
    if (monthSubs[m]) continue;
    monthSubs[m] = S.db.collection("att").where("month", "==", m).onSnapshot(qs => {
      if (g !== S.gen) return;
      for (const k of Object.keys(S.att)) if (k.startsWith(m)) delete S.att[k];
      qs.docs.forEach(d => { if (!d.exists) return; const v = d.data(); if (v && v.recs) S.att[v.day || d.id] = v.recs; });
      S.loaded["att:" + m] = true; delete S.errors["att:" + m]; checkLoaded(); schedule();
    }, err => { if (g !== S.gen) return; S.errors["att:" + m] = err; S.loaded["att:" + m] = true; checkLoaded(); schedule(); });
  }
  for (const [m, un] of Object.entries(monthSubs)) {
    if (!keep.has(m)) { try { un(); } catch (e) {} delete monthSubs[m]; for (const k of Object.keys(S.att)) if (k.startsWith(m)) delete S.att[k]; delete S.loaded["att:" + m]; }
  }
  if (S.actDay !== today) {
    S.actDay = today;
    try { actSub && actSub(); } catch (e) {}
    actSub = S.db.collection("activity").where("day", ">=", addDays(today, -6)).onSnapshot(qs => {
      if (g !== S.gen) return;
      const next = {};
      qs.docs.forEach(d => { if (!d.exists) return; const v = d.data(); for (const [k, e] of Object.entries(v.events || {})) if (e && typeof e === "object") next[`${v.day || d.id}:${k}`] = { ...e, id: `${v.day || d.id}:${k}` }; });
      S.activity = next; schedule();
    }, () => {});
  }
}
function subscribeMyState() {
  try { stateSub && stateSub(); } catch (e) {} stateSub = null;
  if (!S.db || !S.me.id || S.sandbox) return;
  const g = S.gen;
  try { stateSub = S.db.doc(`data/users/${S.me.id}/state`).onSnapshot(s => { if (g !== S.gen) return; S.myState = s.exists ? s.data() : {}; schedule(); }, () => {}); } catch (e) {}
}
function seenAt() { return (S.myState && S.myState.seenAt) || S.seenLocal || ""; }
function markSeen() {
  const t = iso(); S.seenLocal = t;
  try { localStorage.setItem("tg-seen", t); } catch (e) {}
  if (S.db && S.me.id && !S.sandbox) { try { S.db.doc(`data/users/${S.me.id}/state`).set({ seenAt: t }).catch(() => {}); } catch (e) {} }
}
async function connect() {
  S.conn = "connecting"; render();
  const c = await waitForClaude(3000);
  let db = null;
  if (c) { try { db = await c.use("db"); } catch (e) { db = null; } }
  if (!db) { S.conn = "live"; startSandbox(false, true); return; }
  S.realDb = db; S.conn = "live";
  attach(db);
  const userDone = u => {
    S.me.known = true; S.noUser = !u;
    if (!S.sandbox) { S.canWrite = S.perm.canWrite; S.canAdmin = S.perm.canAdmin; subscribeMyState(); }
    bump(); schedule();
    setTimeout(pruneActivity, 4000);
  };
  S.perm = { canWrite: true, canAdmin: true };
  c.use("user").then(async u => {
    S.user = u || null;
    if (u) {
      try { const me = await u.me(); S.me = { id: me.id || null, isOwner: !!me.isOwner, canEdit: !!me.canEdit, known: false }; } catch (e) {}
      try { const w = await Promise.resolve(u.can("data.write")); if (w === false) { S.perm.canWrite = false; S.perm.canAdmin = false; } } catch (e) {}
      try { const a = await Promise.resolve(u.canEdit()); if (a === false) S.perm.canAdmin = false; } catch (e) {}
    }
    userDone(u);
  }).catch(() => userDone(null));
  c.use("assets").then(a => { S.assets = a || null; schedule(); }).catch(() => {});
  c.use("sample").then(s => { S.sample = s || null; }).catch(() => {});
}

/* ----- sinab ko'rish rejimi: shu oynaning xotirasidagi baza ----- */
function localDb(seed) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, clone(v)]));
  const listeners = new Set();
  const meta = { fromCache: false, hasPendingWrites: false };
  const snapDoc = path => { const d = store.get(path); const data = d ? clone(d) : undefined; return { id: path.split("/").pop(), exists: !!d, data: () => data, metadata: meta }; };
  const test = (v, op, x) => op === "==" ? v === x : op === ">=" ? v >= x : op === "<=" ? v <= x : op === ">" ? v > x : op === "<" ? v < x : true;
  const qsnap = (path, filters) => {
    const n = path.split("/").length + 1;
    const docs = [...store.keys()].filter(k => k.startsWith(path + "/") && k.split("/").length === n)
      .filter(k => filters.every(([f, op, x]) => test((store.get(k) || {})[f], op, x))).sort().map(snapDoc);
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
  };
  const notify = () => setTimeout(() => [...listeners].forEach(l => l()), 0);
  const fail = msg => Object.assign(new Error(msg), { code: "invalid_argument" });
  const doc = path => ({
    id: path.split("/").pop(), path,
    get: async () => snapDoc(path),
    set: async data => { store.set(path, clone(data)); notify(); },
    update: async data => { if (!store.has(path)) throw fail("missing"); store.set(path, merge(store.get(path), clone(data))); notify(); },
    delete: async () => { store.delete(path); notify(); },
    onSnapshot(next) { const l = () => next(snapDoc(path)); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
    collection: p => col(path + "/" + p)
  });
  const col = (path, filters = []) => {
    const q = {
      path, doc: id => doc(path + "/" + (id || uid("x"))),
      add: async data => { const r = doc(path + "/" + uid("x")); await r.set(data); return r; },
      get: async () => qsnap(path, filters),
      onSnapshot(next) { const l = () => next(qsnap(path, filters)); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
      where(f, op, x) { return col(path, filters.concat([[f, op, x]])); }, orderBy() { return q; }, limit() { return q; }
    };
    return q;
  };
  return { doc, collection: col };
}
function shiftISO(s, off) { if (!s || typeof s !== "string") return s; if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return addDays(s, off); const d = new Date(s); if (isNaN(d)) return s; d.setDate(d.getDate() + off); return d.toISOString(); }
function demoSeed() {
  const off = Math.floor(diffDays(DEMO_BASE, todayStr()) / 7) * 7;
  const out = {};
  for (const [k, v0] of Object.entries(clone(DEMO || {}))) {
    const v = v0;
    if (k.startsWith("tasks/") && k.split("/").length === 2) {
      ["start", "due", "doneAt", "createdAt", "updatedAt", "lastCommentAt"].forEach(f => { if (v[f]) v[f] = shiftISO(v[f], off); });
      for (const h of Object.values(v.history || {})) h.t = shiftISO(h.t, off);
      out[k] = v;
    } else if (k.startsWith("tasks/")) { v.t = shiftISO(v.t, off); out[k] = v; }
    else if (k.startsWith("att/")) { const day = addDays(v.day, off); for (const r of Object.values(v.recs || {})) for (const e of Object.values(r.edits || {})) e.t = shiftISO(e.t, off); out[`att/${day}`] = { ...v, day, month: monthOf(day) }; }
    else if (k.startsWith("activity/")) { const day = addDays(v.day, off); for (const e of Object.values(v.events || {})) e.t = shiftISO(e.t, off); out[`activity/${day}`] = { ...v, day }; }
    else out[k] = v;
  }
  return out;
}
function sandboxPins(staffIds) {
  const salt = "tugun-sinov"; const pins = {};
  staffIds.forEach((id, i) => { pins[id] = pinHash(salt, String(1001 + i)); });
  return { salt, len: 4, pins, demo: true };
}
function startSandbox(fromCurrent, auto) {
  let seed;
  if (fromCurrent && Object.keys(S.org.branches).length) {
    seed = { [ORG_PATH]: clone(S.org) };
    for (const [id, t] of Object.entries(S.tasks)) seed["tasks/" + id] = clone(t);
    for (const [day, recs] of Object.entries(S.att)) seed["att/" + day] = { day, month: monthOf(day), recs: clone(recs) };
    const byDay = {};
    for (const e of Object.values(S.activity)) { const [day, k] = e.id.split(":"); (byDay[day] = byDay[day] || { day, events: {} }).events[k] = clone(e); }
    for (const [day, d] of Object.entries(byDay)) seed["activity/" + day] = d;
    seed[PIN_PATH] = S.pins ? clone(S.pins) : sandboxPins(allStaff().map(p => p.id));
    if (S.docs.nizom) seed["docs/nizom"] = clone(S.docs.nizom);
    seed["docs/lavozimlar"] = { pos: clone(S.docs.pos || {}) };
    for (const [id, a] of Object.entries(S.acks)) seed["acks/" + id] = clone(a);
  } else seed = demoSeed();
  S.sandbox = true; S.sandboxAuto = !!auto; S.canWrite = true; S.canAdmin = true;
  if (!S.sim) S.sim = { role: "rahbar", staffId: null };
  attach(localDb(seed));
  if (!auto) toast("Sinov rejimi yoqildi");
  schedule();
}
function exitSandbox() {
  if (!S.realDb) return;
  S.sandbox = false; S.sim = null;
  S.canWrite = S.perm ? S.perm.canWrite : true; S.canAdmin = S.perm ? S.perm.canAdmin : true;
  attach(S.realDb); toast("Haqiqiy ma'lumotlarga qaytildi"); schedule();
}
