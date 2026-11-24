// Mock of the claude.ai runtime (db, user, assets) for local browser tests.
(() => {
  const seed = __SEED__;
  const cfg = Object.assign({ me: { id: "u-owner", isOwner: true, canEdit: true, name: "Rahbar Test" }, canWrite: true, noClaude: false, people: {} }, __CFG__);
  if (cfg.noClaude) return;
  const clone = o => JSON.parse(JSON.stringify(o));
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, clone(v)]));
  const listeners = new Set();
  const meta = { fromCache: false, hasPendingWrites: false };
  function deepMerge(a, b) { const o = { ...a }; for (const [k, v] of Object.entries(b)) { if (v && typeof v === "object" && !Array.isArray(v) && o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) o[k] = deepMerge(o[k], v); else o[k] = v; } return o; }
  const snapDoc = path => { const d = store.get(path); const frozen = d ? Object.freeze(clone(d)) : undefined; return { id: path.split("/").pop(), exists: !!d, data: () => frozen, metadata: meta }; };
  const notify = () => setTimeout(() => { for (const l of [...listeners]) l(); }, 0);
  const test = (v, op, x) => op === "==" ? v === x : op === ">=" ? v >= x : op === "<=" ? v <= x : op === ">" ? v > x : op === "<" ? v < x : op === "!=" ? v !== x : true;
  const err = (code, message) => Object.assign(new Error(message), { code });
  const denied = path => {
    if (!cfg.canWrite) return true;
    if (!cfg.me.canEdit && /^(org|secure|att)\//.test(path)) return true;
    return false;
  };
  window.__writes = [];
  function docRef(path) {
    if (path.split("/").length % 2) throw new TypeError("doc path needs even segments: " + path);
    return {
      id: path.split("/").pop(), path,
      get: async () => (!cfg.me.canEdit && path.startsWith("secure/")) ? { id: path.split("/").pop(), exists: false, data: () => undefined, metadata: meta } : snapDoc(path),
      set: async data => { if (denied(path)) throw err("invalid_argument", "denied"); window.__writes.push(["set", path]); store.set(path, clone(data)); notify(); },
      update: async data => { if (denied(path)) throw err("invalid_argument", "denied"); if (!store.has(path)) throw err("invalid_argument", "missing"); window.__writes.push(["update", path, JSON.stringify(data).slice(0, 240)]); store.set(path, deepMerge(store.get(path), clone(data))); notify(); },
      delete: async () => { if (denied(path)) throw err("invalid_argument", "denied"); window.__writes.push(["delete", path]); store.delete(path); notify(); },
      onSnapshot(next) {
        const hide = !cfg.me.canEdit && path.startsWith("secure/");
        const l = () => next(hide ? { id: path.split("/").pop(), exists: false, data: () => undefined, metadata: meta } : snapDoc(path));
        listeners.add(l); setTimeout(l, 20); return () => listeners.delete(l);
      },
      collection: p => colRef(path + "/" + p)
    };
  }
  function qsnap(path, filters, lim) {
    const n = path.split("/").length + 1;
    let docs = [...store.keys()].filter(k => k.startsWith(path + "/") && k.split("/").length === n)
      .filter(k => filters.every(([f, op, x]) => test((store.get(k) || {})[f], op, x))).sort().map(snapDoc);
    if (lim) docs = docs.slice(0, lim);
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
  }
  function colRef(path, filters = [], lim = 0) {
    if (path.split("/").length % 2 === 0) throw new TypeError("collection path needs odd segments: " + path);
    const q = {
      path, doc: id => docRef(path + "/" + (id || Math.random().toString(36).slice(2))),
      add: async data => { const r = docRef(path + "/" + Math.random().toString(36).slice(2)); await r.set(data); return r; },
      get: async () => qsnap(path, filters, lim),
      onSnapshot(next) { const l = () => next(qsnap(path, filters, lim)); listeners.add(l); setTimeout(l, 20); return () => listeners.delete(l); },
      where(f, op, x) { return colRef(path, filters.concat([[f, op, x]]), lim); }, orderBy() { return q; }, limit(n) { return colRef(path, filters, n); }
    };
    return q;
  }
  const db = { doc: docRef, collection: colRef };
  const people = Object.assign({ "u-owner": "Rahbar Test", "u-aziz": "Aziz Karimov", "u-new": "Yangi Hamkasb", "u-kiosk": "Kirish planshet" }, cfg.people);
  const prof = id => ({ id, name: people[id] || "", avatarUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10' fill='%23888'/></svg>", color: "#5E5CE6", email: null, isMe: id === cfg.me.id, guest: false });
  const user = {
    isOwner: async () => !!cfg.me.isOwner, canEdit: async () => !!cfg.me.canEdit,
    can: async n => n === "data.write" ? !!cfg.canWrite : !!cfg.me.canEdit,
    id: async () => cfg.me.id, me: async () => ({ id: cfg.me.id, name: cfg.me.name || "", avatarUrl: "", color: "#888", email: null, isOwner: !!cfg.me.isOwner, canEdit: !!cfg.me.canEdit }),
    profiles: async ids => Object.fromEntries([].concat(ids).map(id => [id, prof(id)])),
    search: async q => Object.keys(people).filter(id => !q || people[id].toLowerCase().includes(String(q).toLowerCase())).slice(0, 8).map(prof)
  };
  window.__assets = [];
  const assets = {
    upload: async (blob, opt) => { const id = Math.random().toString(36).slice(2).padEnd(32, "x").slice(0, 32); window.__assets.push([id, blob.name, (opt && opt.type) || blob.type]); return { id, url: "/_blob/" + id, sizeBytes: blob.size, contentType: (opt && opt.type) || blob.type }; },
    delete: async id => { window.__assets = window.__assets.filter(a => a[0] !== id); return { deleted: true }; },
    list: async () => ({ assets: [], usage: {} })
  };
  const defAns = { understanding: "12 kub taxtani obyektga yetkazish, ortish va hujjatlash kerak.", owner: { pos: "p-logist", duty: 1, why: "Yetkazib berishni rejalashtirish logist zimmasida" }, helpers: [{ pos: "p-omborchi", duty: 3, why: "Taxtani hujjat asosida ombordan beradi" }, { pos: "p-usta", duty: 1, why: "Yukni mashinaga ortadi" }, { pos: "p-nope", duty: 1, why: "x" }], gap: { text: "Mijozdan topshirish dalolatnomasini olish", pos: "p-logist" }, confidence: "high" };
  const sampleFn = async () => ({ text: JSON.stringify(defAns), truncated: false });
  sampleFn.json = (input, opts = {}) => new Promise((res, rej) => {
    window.__samplePrompt = input; window.__sampleCalls = (window.__sampleCalls || 0) + 1;
    const t = setTimeout(() => cfg.sample === "deny" ? rej({ code: "not_granted", message: "no" }) : res(cfg.sampleAnswer || defAns), cfg.sampleDelay || 500);
    if (opts.signal) opts.signal.addEventListener("abort", () => { clearTimeout(t); rej({ code: "cancelled", message: "stop" }); });
  });
  window.__store = store;
  window.claude = { use: async name => name === "db" ? db : name === "user" ? user : name === "assets" ? (cfg.me.canEdit || cfg.assetsForAll ? assets : null) : name === "sample" ? (cfg.sample === "none" ? null : sampleFn) : null };
})();
