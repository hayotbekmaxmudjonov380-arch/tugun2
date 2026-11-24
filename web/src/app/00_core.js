/* ================= constants ================= */
const MONTHS = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
const WD = ["Ya","Du","Se","Ch","Pa","Ju","Sh"];
const WD_LONG = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
const WD_ORDER = [1,2,3,4,5,6,0];
const STATE_LABEL = { new: "Yangi", progress: "Jarayonda", review: "Tekshiruvda", done: "Bajarildi", overdue: "Muddati o'tgan" };
const EDIT_STATUSES = ["new","progress","review","done"];
const VIEWS = ["tuzilma","dashboard","tasklar","davomat","nizom","sozlamalar","qollanma","kiosk"];
const ORG_PATH = "org/structure", PIN_PATH = "secure/pins";
const ROLE_LABEL = { rahbar: "Rahbar", boshliq: "Bo'lim boshlig'i", xodim: "Xodim", mehmon: "Mehmon" };
const ATT_REASONS = ["Terminalda belgilashni unutgan", "Tashqi topshiriqda edi", "Texnik nosozlik", "Rahbar ruxsati bilan", "Boshqa sabab"];
const DEMO_BASE = "2026-11-10";
const DEMO = /*__SEED__*/null;
const TEMPLATE = {
  branches: { b2b: { name: "B2B", order: 1 }, b2c: { name: "B2C", order: 2 } },
  departments: {
    "b2b-sales": { name: "Sales", branch: "b2b", order: 1, workStart: "09:00", workEnd: "18:00" },
    "b2b-supplies": { name: "Supplies", branch: "b2b", order: 2, workStart: "09:00", workEnd: "18:00" },
    "b2b-bluecoll": { name: "Blue coll.", branch: "b2b", order: 3, workStart: "08:00", workEnd: "17:00" },
    "b2b-pr": { name: "PR", branch: "b2b", order: 4, workStart: "09:00", workEnd: "18:00" },
    "b2b-b2g": { name: "B2G", branch: "b2b", order: 5, workStart: "09:00", workEnd: "18:00" },
    "b2c-operators": { name: "operators", branch: "b2c", order: 1, workStart: "09:00", workEnd: "18:00" },
    "b2c-sales": { name: "Sales", branch: "b2c", order: 2, workStart: "09:00", workEnd: "18:00" },
    "b2c-works": { name: "works", branch: "b2c", order: 3, workStart: "08:00", workEnd: "17:00" },
    "b2c-worker": { name: "worker", branch: "b2c", order: 4, workStart: "08:00", workEnd: "17:00" }
  },
  settings: { grace: 5, workDays: [1,2,3,4,5], pinLen: 4, maxStaff: 100 }
};

/* ================= state ================= */
const S = {
  org: { branches: {}, departments: {}, staff: {}, settings: {} },
  tasks: {}, att: {}, activity: {}, pins: null, myState: null, docs: { nizom: null, pos: {} }, acks: {}, nz: { tab: "nizom", pos: null },
  loaded: {}, errors: {},
  db: null, realDb: null, conn: "connecting", slow: false,
  canWrite: true, canAdmin: true, perm: null,
  me: { id: null, isOwner: false, canEdit: false, known: false }, user: null, assets: null,
  sandbox: false, sandboxAuto: false, sim: null,
  view: "tuzilma", deptId: null, focusTask: null,
  tf: { q: "", status: "all", dept: "all", mode: "table", mine: false },
  attDate: null, attMode: "day", attF: { dept: "all", q: "", issues: false },
  dash: { branch: "all", month: null },
  doneOpen: false, openDept: null,
  seenLocal: "", profiles: {}, profReq: new Set(), noUser: false, pruned: false, sample: null, aiOff: false,
  lastMinute: "", gen: 0, actDay: ""
};

/* ================= small utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const parseYmd = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const monthOf = s => String(s).slice(0, 7);
const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const fmtDate = s => { if (!s) return "—"; const d = parseYmd(s); return `${d.getDate()}-${MONTHS[d.getMonth()]}`; };
const fmtMonth = m => { const [y, mm] = m.split("-").map(Number); return `${cap(MONTHS[mm - 1])} ${y}`; };
const toMin = hm => { if (!hm || !/^\d{1,2}:\d{2}/.test(hm)) return null; const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const fromMin = m => m == null ? "" : `${pad(Math.floor(m / 60))}:${pad(Math.round(m % 60))}`;
const fmtDur = min => { if (min == null || min < 0) return "—"; const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} s ${pad(m)} daq` : `${m} daq`; };
const num = v => Number.isFinite(+v) ? +v : 0;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => (w[0] || "").toUpperCase()).join("") || "?";
const shortName = name => { const parts = String(name || "").trim().split(/\s+/); return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : (parts[0] || "?"); };
const normQ = s => String(s || "").toLowerCase().replace(/[ʻʼ‘’`´]/g, "'");
const iso = () => new Date().toISOString();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "bolim";
const clone = o => JSON.parse(JSON.stringify(o));
function normTime(v) {
  v = String(v || "").trim();
  if (!v) return "";
  let m = v.match(/^(\d{1,2})[:.\s-]?(\d{2})$/);
  if (!m && /^\d$/.test(v)) m = [v, v, "00"];
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  if (h > 23 || mi > 59) return null;
  return `${pad(h)}:${pad(mi)}`;
}
function fmtDT(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr); if (isNaN(d)) return "";
  return `${d.getDate()}-${MONTHS[d.getMonth()].slice(0, 3)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function timeAgo(isoStr) {
  const d = new Date(isoStr); if (isNaN(d)) return "";
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "hozirgina";
  if (s < 3600) return `${Math.floor(s / 60)} daqiqa oldin`;
  if (s < 86400 && ymd(d) === todayStr()) return `bugun ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (ymd(d) === addDays(todayStr(), -1)) return `kecha ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return fmtDT(isoStr);
}
const fmtSize = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
/* SHA-256 for PIN hashes (ASCII input). Public-domain algorithm, compact form. */
function sha256(ascii) {
  const rr = (v, a) => (v >>> a) | (v << (32 - a));
  const maxWord = 2 ** 32; let result = ""; const words = []; const bitLen = ascii.length * 8;
  let hash = [], k = [], pc = 0; const comp = {};
  for (let c = 2; pc < 64; c++) { if (!comp[c]) { for (let i = 0; i < 313; i += c) comp[i] = c; hash[pc] = (c ** .5 * maxWord) | 0; k[pc++] = (c ** (1 / 3) * maxWord) | 0; } }
  ascii += "\x80"; while (ascii.length % 64 - 56) ascii += "\x00";
  for (let i = 0; i < ascii.length; i++) { const j = ascii.charCodeAt(i); if (j >> 8) return ""; words[i >> 2] |= j << ((3 - i) % 4) * 8; }
  words[words.length] = (bitLen / maxWord) | 0; words[words.length] = bitLen;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16), old = hash; hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i]
        + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? "0" : "") + b.toString(16); }
  return result;
}
const pinHash = (salt, pin) => sha256(`${salt}:${pin}`);

/* ================= data access (indexed once per data change) ================= */
function cleanMap(m) { const o = {}; if (m && typeof m === "object") for (const [k, v] of Object.entries(m)) if (v && typeof v === "object") o[k] = v; return o; }
function normOrg(d) { d = d || {}; return { branches: cleanMap(d.branches), departments: cleanMap(d.departments), staff: cleanMap(d.staff), settings: (d.settings && typeof d.settings === "object") ? d.settings : {} }; }
const byOrder = (a, b) => (num(a.order) - num(b.order)) || String(a.name || "").localeCompare(String(b.name || ""));
let IDX = null, dataVer = 1, idxVer = 0;
function bump() { dataVer++; }
function idx() {
  if (IDX && idxVer === dataVer) return IDX;
  const br = Object.entries(S.org.branches).map(([id, b]) => ({ ...b, id })).sort(byOrder);
  const dAll = Object.entries(S.org.departments).map(([id, d]) => ({ ...d, id })).sort(byOrder);
  const dByBranch = {}; br.forEach(b => { dByBranch[b.id] = dAll.filter(d => d.branch === b.id); });
  const dOrdered = br.flatMap(b => dByBranch[b.id]).concat(dAll.filter(d => !S.org.branches[d.branch]));
  const sAll = Object.entries(S.org.staff).map(([id, p]) => ({ ...p, id }));
  const sByDept = {}; dAll.forEach(d => { sByDept[d.id] = []; });
  sAll.forEach(p => { (sByDept[p.deptId] = sByDept[p.deptId] || []).push(p); });
  Object.values(sByDept).forEach(a => a.sort(byOrder));
  const sOrdered = dOrdered.flatMap(d => sByDept[d.id] || []);
  const tAll = Object.entries(S.tasks).map(([id, t]) => ({ ...t, id })).filter(t => typeof t.title === "string");
  const tByDept = {}, tByStaff = {};
  tAll.forEach(t => {
    (t.deptIds || []).forEach(d => { (tByDept[d] = tByDept[d] || []).push(t); });
    new Set([...(t.staffIds || []), t.ownerId].filter(Boolean)).forEach(p => { (tByStaff[p] = tByStaff[p] || []).push(t); });
  });
  const headOf = {}; dAll.forEach(d => { if (d.headId && S.org.staff[d.headId]) headOf[d.headId] = d.id; });
  IDX = { br, dAll, dByBranch, dOrdered, sAll, sByDept, sOrdered, tAll, tByDept, tByStaff, headOf }; idxVer = dataVer;
  return IDX;
}
const branches = () => idx().br;
const depts = bid => bid == null ? idx().dAll : (idx().dByBranch[bid] || []);
const deptsOrdered = () => idx().dOrdered;
const staffOf = did => idx().sByDept[did] || [];
const allStaff = () => idx().sOrdered;
const tasks = () => idx().tAll;
const tasksOfDept = did => idx().tByDept[did] || [];
const tasksOfStaff = pid => idx().tByStaff[pid] || [];
function getDept(id) { const d = S.org.departments[id]; return d ? { ...d, id } : null; }
function getPerson(id) { const p = S.org.staff[id]; return p ? { ...p, id } : null; }
function branchName(id) { return S.org.branches[id]?.name || ""; }
function personName(id) { return S.org.staff[id]?.name || ""; }
function tDepts(t) { return (Array.isArray(t.deptIds) ? t.deptIds : []).map(getDept).filter(Boolean); }
function tStaff(t) { return (Array.isArray(t.staffIds) ? t.staffIds : []).map(getPerson).filter(Boolean); }
function hasDept(t, id) { return !!id && Array.isArray(t.deptIds) && t.deptIds.includes(id); }
function stateOf(t) { if (t.status === "done") return "done"; if (t.due && t.due < todayStr()) return "overdue"; return ["new","progress","review"].includes(t.status) ? t.status : "new"; }
function pct(t) { return t.status === "done" ? 100 : clamp(Math.round(num(t.progress)), 0, 100); }
const byDue = (a, b) => ((a.status === "done") - (b.status === "done")) || String(a.due || "9999").localeCompare(String(b.due || "9999")) || String(a.title).localeCompare(String(b.title));
function dueInfo(t) {
  if (t.status === "done") return { text: t.doneAt ? `${fmtDate(t.doneAt)} bajarildi` : "Bajarildi", cls: "ok" };
  if (!t.due) return { text: "Muddat yo'q", cls: "" };
  const d = diffDays(todayStr(), t.due);
  if (d < 0) return { text: `${-d} kun kechikdi`, cls: "crit" };
  if (d === 0) return { text: "Bugun tugaydi", cls: "warn" };
  if (d === 1) return { text: "Ertaga tugaydi", cls: "warn" };
  if (d <= 3) return { text: `${d} kun qoldi`, cls: "warn" };
  return { text: `${d} kun qoldi`, cls: "" };
}
function settings() {
  const s = S.org.settings || {};
  return {
    grace: Number.isFinite(+s.grace) ? clamp(+s.grace, 0, 120) : 5,
    workDays: Array.isArray(s.workDays) && s.workDays.length ? s.workDays.map(Number) : [1,2,3,4,5],
    pinLen: [4, 5, 6].includes(+s.pinLen) ? +s.pinLen : 4,
    maxStaff: Number.isFinite(+s.maxStaff) && +s.maxStaff > 0 ? +s.maxStaff : 100
  };
}

/* ----- attendance ----- */
function rec(date, pid) { const r = S.att[date]?.[pid]; return (r && typeof r === "object") ? r : null; }
function isWorkday(date) { return settings().workDays.includes(parseYmd(date).getDay()); }
function editsOf(r) { return r && r.edits && typeof r.edits === "object" ? Object.values(r.edits).filter(e => e && typeof e === "object").sort((a, b) => String(a.t).localeCompare(String(b.t))) : []; }
function attInfo(p, date) {
  const d = getDept(p.deptId) || {};
  const ws = toMin(d.workStart) ?? 540, we = toMin(d.workEnd) ?? 1080;
  const r = rec(date, p.id); const i = toMin(r?.in), o = toMin(r?.out);
  const today = todayStr(), g = settings().grace;
  const base = { in: i == null ? "" : r.in, out: o == null ? "" : r.out, worked: null, late: 0, early: 0, live: false, src: r?.src || "", edits: editsOf(r) };
  if (i == null) {
    if (date > today) return { ...base, key: "future", dot: "wait", label: "—", tone: "idle" };
    if (!isWorkday(date)) return { ...base, key: "off", dot: "off", label: "Dam olish kuni", tone: "idle" };
    if (date === today && nowMin() <= ws + g) return { ...base, key: "wait", dot: "wait", label: "Hali kelmagan", tone: "idle" };
    return { ...base, key: "absent", dot: "absent", label: "Kelmadi", tone: "crit" };
  }
  const late = i - ws > g ? i - ws : 0;
  if (o == null) {
    if (date === today) {
      const w = Math.max(0, nowMin() - i);
      return late ? { ...base, late, worked: w, live: true, key: "late-in", dot: "late", label: `Ishda, ${late} daq kechikib keldi`, tone: "warn" }
                  : { ...base, worked: w, live: true, key: "in", dot: "in", label: "Ishda", tone: "ok" };
    }
    return { ...base, late, key: "noout", dot: "noout", label: "Ketish belgilanmagan", tone: "warn" };
  }
  const early = we - o > g ? we - o : 0;
  const res = { ...base, late, early, worked: Math.max(0, o - i), dot: "out" };
  if (late && early) return { ...res, key: "late-early", label: `${late} daq kechikdi, ${early} daq erta ketdi`, tone: "warn" };
  if (late) return { ...res, key: "late", label: `${late} daq kechikib keldi`, tone: "warn" };
  if (early) return { ...res, key: "early", label: `${early} daq erta ketdi`, tone: "warn" };
  return { ...res, key: "ok", label: "O'z vaqtida", tone: "ok" };
}
function deptDay(d, date) {
  const ppl = staffOf(d.id); let came = 0, late = 0, inNow = 0, absent = 0, first = null, last = null;
  for (const p of ppl) {
    const a = attInfo(p, date); const i = toMin(a.in), o = toMin(a.out);
    if (i != null) { came++; if (first == null || i < first) first = i; if (a.late) late++; if (o == null) inNow++; }
    else if (a.key === "absent") absent++;
    if (o != null && (last == null || o > last)) last = o;
  }
  return { total: ppl.length, came, late, inNow, absent, first: fromMin(first), last: fromMin(last) };
}

/* ----- identity, roles and permissions ----- */
function myStaffId() {
  if (S.sandbox && S.sim) return S.sim.staffId || null;
  if (!S.me.id) return null;
  const p = allStaff().find(x => x.userId === S.me.id);
  return p ? p.id : null;
}
function myRole() {
  if (S.sandbox && S.sim) return S.sim.role;
  if (S.me.isOwner) return "rahbar";
  const pid = myStaffId();
  if (pid) { const p = S.org.staff[pid]; if (p && p.access === "rahbar") return "rahbar"; if (idx().headOf[pid]) return "boshliq"; return "xodim"; }
  if (S.me.canEdit) return "rahbar";
  if (S.me.known && S.noUser) return S.canWrite ? "rahbar" : "mehmon";
  return "mehmon";
}
function myDeptId() { const pid = myStaffId(); if (!pid) return null; return idx().headOf[pid] || S.org.staff[pid]?.deptId || null; }
const can = {
  live: () => S.conn === "live" && !!S.db,
  write: () => can.live() && S.canWrite,
  structure: () => can.write() && myRole() === "rahbar" && (S.sandbox || S.canAdmin),
  createTask: () => can.write() && ["rahbar", "boshliq"].includes(myRole()),
  editTask: t => can.write() && (myRole() === "rahbar" || (myRole() === "boshliq" && hasDept(t, myDeptId())) || (!!t.ownerId && t.ownerId === myStaffId())),
  progress: t => can.editTask(t) || (can.write() && (t.staffIds || []).includes(myStaffId())),
  comment: () => can.write() && myRole() !== "mehmon",
  deleteTask: t => can.write() && (myRole() === "rahbar" || (myRole() === "boshliq" && S.org.staff[t.ownerId]?.deptId === myDeptId())),
  editAtt: p => can.live() && (S.sandbox || S.canAdmin) && (myRole() === "rahbar" || (myRole() === "boshliq" && p.deptId === myDeptId())),
  kiosk: () => can.live() && myRole() === "rahbar" && (S.sandbox || S.canAdmin),
  files: () => can.write() && !S.sandbox && !!S.assets && myRole() !== "mehmon"
};
function actorId() { return myStaffId() || (S.me.isOwner || myRole() === "rahbar" ? "rahbar" : (S.me.id ? "u:" + S.me.id : "rahbar")); }
function actorName(by) {
  if (!by) return "Kimdir";
  if (by === "rahbar") return "Rahbar";
  if (by === "terminal") return "Terminal";
  if (by.startsWith("u:")) { const id = by.slice(2); requestProfiles([id]); return S.profiles[id] || "Foydalanuvchi"; }
  return personName(by) || "Sobiq xodim";
}
function requestProfiles(ids) {
  if (!S.user || typeof S.user.profiles !== "function") return;
  const need = ids.filter(id => id && !(id in S.profiles) && !S.profReq.has(id));
  if (!need.length) return;
  need.forEach(id => S.profReq.add(id));
  S.user.profiles(need).then(ps => { need.forEach(id => { S.profiles[id] = (ps && ps[id] && ps[id].name) || ""; }); schedule(); onProfiles(); }).catch(() => {});
}
