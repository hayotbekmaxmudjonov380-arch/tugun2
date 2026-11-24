/* ================= actions ================= */
function toast(msg, tone) {
  const el = $("#toast"); if (!el) return;
  el.textContent = msg; el.className = "show" + (tone ? " " + tone : "");
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = ""; }, tone === "crit" ? 4600 : 2800);
}
async function deleteTaskDeep(id, quiet) {
  const t = S.tasks[id];
  // izohlar alohida hujjatlarda: avval ularni o'chiramiz, aks holda bazada yetim qoladi
  try { const qs = await S.db.collection(`tasks/${id}/comments`).get(); for (const d of qs.docs) await S.db.doc(`tasks/${id}/comments/${d.id}`).delete().catch(() => {}); } catch (e) {}
  const ok = await dbDelete(`tasks/${id}`);
  if (!ok) return false;
  if (t && S.assets && !S.sandbox) Object.values(t.files || {}).forEach(f => { if (f && f.id) S.assets.delete(f.id).catch(() => {}); });
  if (S.focusTask === id) S.focusTask = null;
  if (!quiet && t) { logEvent({ k: "delete", txt: `taskni o'chirdi: «${t.title}»`, to: [...new Set([...(t.staffIds || []), t.ownerId])].filter(x => x && x !== myStaffId()), dept: t.deptIds || [] }); toast("Task o'chirildi"); }
  return true;
}
async function clearDemo() {
  const demoStaff = Object.entries(S.org.staff).filter(([, p]) => p && p.demo).map(([id]) => id);
  const set = new Set(demoStaff);
  const demoTasks = tasks().filter(t => t.demo).map(t => t.id);
  toast("Namuna ma'lumotlar o'chirilmoqda…");
  for (const id of demoTasks) await deleteTaskDeep(id, true);
  try {
    const qs = await S.db.collection("att").where("demo", "==", true).get();
    // namuna kunlari + yuklangan oylardagi (masalan, terminal sinovida yaratilgan) kunlar
    const docs = qs.docs.map(d => ({ id: d.id, recs: (d.data() || {}).recs || {} }));
    for (const [day, recs] of Object.entries(S.att)) if (!docs.some(x => x.id === day) && Object.keys(recs || {}).some(k => set.has(k))) docs.push({ id: day, recs });
    for (const d of docs) {
      const recs = d.recs;
      const keys = Object.keys(recs).filter(k => recs[k]);
      if (keys.every(k => set.has(k))) await dbDelete(`att/${d.id}`);
      else await dbUpdate(`att/${d.id}`, { demo: false, recs: Object.fromEntries(keys.filter(k => set.has(k)).map(k => [k, null])) });
    }
  } catch (e) {}
  try { const qs = await S.db.collection("activity").where("demo", "==", true).get(); for (const d of qs.docs) await dbDelete(`activity/${d.id}`); } catch (e) {}
  try { const qs = await S.db.collection("acks").where("demo", "==", true).get(); for (const d of qs.docs) await dbDelete(`acks/${d.id}`); } catch (e) {}
  if (S.pins && demoStaff.length) await dbUpdate(PIN_PATH, { demo: false, pins: Object.fromEntries(demoStaff.map(id => [id, null])) });
  if (demoStaff.length) {
    const heads = {};
    Object.entries(S.org.departments).forEach(([id, d]) => { if (d && set.has(d.headId)) heads[id] = { headId: "" }; });
    await orgUpdate({ staff: Object.fromEntries(demoStaff.map(id => [id, null])), ...(Object.keys(heads).length ? { departments: heads } : {}) });
  }
  S.focusTask = null;
  toast("Namuna ma'lumotlar o'chirildi. Endi o'z xodimlaringizni qo'shing.");
}
function move(kind, id, dir) {
  if (kind === "dept") {
    const d = getDept(id); if (!d) return; const list = depts(d.branch); const i = list.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const patch = { departments: {} }; list.forEach((x, k) => { patch.departments[x.id] = { order: (k === i ? j : k === j ? i : k) + 1 }; });
    orgUpdate(patch);
  } else {
    const p = getPerson(id); if (!p) return; const list = staffOf(p.deptId); const i = list.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const patch = { staff: {} }; list.forEach((x, k) => { patch.staff[x.id] = { order: (k === i ? j : k === j ? i : k) + 1 }; });
    orgUpdate(patch);
  }
}
function randomPin(len) {
  const taken = new Set(Object.values((S.pins && S.pins.pins) || {}).filter(Boolean));
  const salt = (S.pins && S.pins.salt) || "";
  for (let n = 0; n < 200; n++) {
    const a = new Uint32Array(len); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.random() * 1e9; });
    const pin = [...a].map(x => x % 10).join("");
    if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) continue;
    if (salt && taken.has(pinHash(salt, pin))) continue;
    return pin;
  }
  return "";
}
function setTab(tab) {
  if (!modalCtx) return;
  modalCtx.tab = tab;
  $$("[data-panel]", dlg).forEach(p => { p.hidden = p.dataset.panel !== tab; });
  $$('[data-action="task-tab"]', dlg).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === tab)));
  const save = $("#task-save", dlg); if (save) save.hidden = tab !== "main";
  if (tab === "comments") { renderComments(); const ta = $("#cm-text", dlg); if (ta) ta.focus(); }
}
const keepHash = el => { const h = el && el.getAttribute && el.getAttribute("href"); if (h && h.startsWith("#")) location.hash = h.slice(1); };
const actions = {
  "start-sandbox": () => startSandbox(true, false),
  "exit-sandbox": () => exitSandbox(),
  "rail-scroll": el => { const l = document.getElementById("rail-list"); if (l) l.scrollBy({ left: Number(el.dataset.dir) * l.clientWidth * .85, behavior: "smooth" }); },
  "toggle-dept": el => { const id = el.dataset.id; S.openDept = S.openDept === id ? null : id; syncOpenDept(); },
  "dash-branch": el => { S.dash.branch = el.dataset.v; render(); },
  "dash-month": el => { const [y, mo] = S.dash.month.split("-").map(Number); const m = ymd(new Date(y, mo - 1 + Number(el.dataset.dir), 1)).slice(0, 7); if (m > monthOf(todayStr())) return; S.dash.month = m; ensureMonths(); render(); },
  "dismiss-welcome": () => { try { localStorage.setItem("tg-welcome", "1"); } catch (e) {} S.welcomeHidden = true; render(); },
  "go": el => { location.hash = el.dataset.href; },
  "new-task": el => openTaskModal(null, el.dataset.dept ? { deptIds: [el.dataset.dept] } : {}),
  "open-task": el => { if (el.closest("#notif")) toggleNotif(false); openTaskModal(el.dataset.id, {}, el.dataset.tab || "main"); },
  "open-person": el => { if (el.closest("#notif")) toggleNotif(false); openPerson(el.dataset.id); },
  "whoami": () => { const pid = myStaffId(); if (pid) openPerson(pid); else toast(S.sandbox ? "Sinov rejimi: rolni yuqoridagi «Kim sifatida ko'rish» orqali almashtiring" : `Rolingiz: ${ROLE_LABEL[myRole()]}${myRole() === "mehmon" ? ". Rahbar hisobingizni xodim kartangizga bog'lashi kerak" : ""}`); },
  "focus-task": el => { S.focusTask = S.focusTask === el.dataset.id ? null : el.dataset.id; render(); },
  "focus-from-modal": el => { S.focusTask = el.dataset.id; closeModal(); if (S.view !== "tuzilma") location.hash = "tuzilma"; else render(); window.scrollTo({ top: 0, behavior: "smooth" }); },
  "clear-focus": () => { S.focusTask = null; render(); },
  "close-modal": el => { closeModal(); keepHash(el); },
  "task-tab": el => setTab(el.dataset.v),
  "send-comment": () => sendComment(),
  "del-comment": async el => { if (!modalCtx || !modalCtx.id) return; if (await dbDelete(`tasks/${modalCtx.id}/comments/${el.dataset.id}`)) toast("Izoh o'chirildi"); },
  "del-file": el => removeFile(el.dataset.key),
  "tf-status": el => { S.tf.status = el.dataset.v; render(); },
  "tf-mode": el => { S.tf.mode = el.dataset.v; render(); },
  "tf-mine": () => { S.tf.mine = !S.tf.mine; render(); },
  "att-mode": el => { S.attMode = el.dataset.v; render(); },
  "att-today": () => { S.attDate = todayStr(); ensureMonths(); render(); },
  "att-shift": el => {
    const dir = Number(el.dataset.dir), cur = S.attDate || todayStr();
    if (S.attMode === "month") { const d = parseYmd(cur); d.setDate(1); d.setMonth(d.getMonth() + dir); S.attDate = ymd(d); }
    else S.attDate = addDays(cur, dir);
    ensureMonths(); render();
  },
  "att-issues": () => { S.attF.issues = !S.attF.issues; render(); },
  "att-edit": el => openAttModal(el.dataset.id, el.dataset.date || todayStr(), el.dataset.preset || ""),
  "new-staff": el => openStaffModal(null, el.dataset.dept),
  "edit-staff": el => openStaffModal(el.dataset.id),
  "new-dept": el => openDeptModal(null, el.dataset.branch),
  "edit-dept": el => openDeptModal(el.dataset.id),
  "move-dept": el => move("dept", el.dataset.id, Number(el.dataset.dir)),
  "move-staff": el => move("staff", el.dataset.id, Number(el.dataset.dir)),
  "add-branch": () => { const id = uid("br"); const order = branches().reduce((m, b) => Math.max(m, num(b.order)), 0) + 1; orgUpdate({ branches: { [id]: { name: `Tarmoq ${order}`, order } } }); },
  "del-branch": el => { const b = S.org.branches[el.dataset.id]; const id = el.dataset.id; confirmBox("Tarmoqni o'chirish", `«${b?.name || ""}» tarmog'i o'chiriladi.`, "O'chirish", () => orgUpdate({ branches: { [id]: null } })); },
  "make-template": () => orgUpdate(TEMPLATE).then(ok => ok && toast("Tuzilma yaratildi. Endi xodimlarni qo'shing.")),
  "delete-task": el => { const id = el.dataset.id, t = S.tasks[id]; confirmBox("Taskni o'chirish", `«${t?.title || ""}» izohlari va fayllari bilan butunlay o'chiriladi.`, "O'chirish", () => deleteTaskDeep(id)); },
  "delete-staff": el => {
    const id = el.dataset.id, p = getPerson(id);
    const owns = tasks().filter(t => t.status !== "done" && t.ownerId === id).length;
    confirmBox("Xodimni o'chirish", `${p?.name || ""} ro'yxatdan o'chiriladi, PIN kodi bekor qilinadi.${owns ? ` U ${owns} ta faol taskda mas'ul: bu tasklarga yangi mas'ul tayinlashingiz kerak bo'ladi.` : ""}`, "O'chirish", async () => {
      const patch = { staff: { [id]: null } };
      Object.entries(S.org.departments).forEach(([did, d]) => { if (d && d.headId === id) patch.departments = { ...(patch.departments || {}), [did]: { headId: "" } }; });
      if (await orgUpdate(patch)) {
        if (S.pins && S.pins.pins && S.pins.pins[id]) dbUpdate(PIN_PATH, { pins: { [id]: null } });
        toast("Xodim o'chirildi");
      }
    });
  },
  "delete-dept": el => {
    const id = el.dataset.id, d = getDept(id), ppl = staffOf(id);
    confirmBox("Bo'limni o'chirish", `«${d?.name || ""}» bo'limi${ppl.length ? ` va undagi ${ppl.length} ta xodim` : ""} o'chiriladi. Tasklar saqlanadi, lekin bu bo'lim ularda ko'rinmaydi.`, "O'chirish", async () => {
      const ok = await orgUpdate({ departments: { [id]: null }, staff: Object.fromEntries(ppl.map(p => [p.id, null])) });
      if (!ok) return;
      const pins = S.pins && S.pins.pins ? ppl.filter(p => S.pins.pins[p.id]) : [];
      if (pins.length) dbUpdate(PIN_PATH, { pins: Object.fromEntries(pins.map(p => [p.id, null])) });
      toast("Bo'lim o'chirildi"); if (S.view === "bolim" && S.deptId === id) location.hash = "tuzilma";
    });
  },
  "clear-demo": () => confirmBox("Namunalarni o'chirish", "Namuna xodimlar, ularning PIN'lari, namuna tasklar (izohlari bilan), davomati va faoliyat lentasi o'chiriladi. Bo'limlar va siz kiritgan ma'lumotlar qoladi.", "O'chirish", clearDemo),
  "gen-pin": () => {
    const inp = $("#s-pin", dlg); if (!inp) return;
    const pin = randomPin(settings().pinLen); if (!pin) return;
    inp.type = "text"; inp.value = pin; inp.focus();
    const h = $("#pin-hint", dlg); if (h) h.textContent = `Yangi PIN: ${pin}. Uni yozib oling va xodimga shaxsan bering. Saqlangandan keyin u boshqa ko'rsatilmaydi.`;
  },
  "clear-pin": () => {
    const form = dlg.querySelector('form[data-form="staff"]'); const id = form && form.dataset.id; if (!id) return;
    dbUpdate(PIN_PATH, { pins: { [id]: null } }).then(ok => { if (!ok) return; toast("PIN o'chirildi"); const h = $("#pin-hint", dlg); if (h) h.textContent = "PIN o'chirildi. Terminaldan foydalanishi uchun yangisini bering."; const b = dlg.querySelector('[data-action="clear-pin"]'); if (b) b.remove(); const i = $("#s-pin", dlg); if (i) i.placeholder = `${settings().pinLen} ta raqam`; });
  },
  "acct-pick": el => { const id = el.dataset.uid; S.profiles[id] = el.dataset.name || ""; $("#s-uid", dlg).value = id; $("#acct-box", dlg).innerHTML = acctBoxHTML(id); },
  "acct-unlink": () => { $("#s-uid", dlg).value = ""; $("#acct-box", dlg).innerHTML = acctBoxHTML(""); const q = $("#acct-q", dlg); if (q) q.focus(); },
  "kiosk-exit": () => kioskExit(),
  "kiosk-exit-cancel": () => { K.exit = false; K.pin = ""; K.err = ""; K.fails = 0; render(); },
  "k-key": el => kioskKey(el.dataset.k),
  "bell": () => { toggleBgPick(false); toggleNotif(); },
  "bgpick": () => toggleBgPick(),
  "close-bgpick": () => toggleBgPick(false),
  "close-notif": el => { toggleNotif(false); if (el.dataset.nz) S.nz.tab = el.dataset.nz; if (el.getAttribute("href") === "#nizom" && location.hash === "#nizom") render(); keepHash(el); },
  "nz-tab": el => { S.nz.tab = el.dataset.v; render(); },
  "ai-suggest": () => aiSuggest(false),
  "ai-retry": () => aiSuggest(true),
  "ai-local": () => aiLocal(),
  "ai-stop": () => { if (modalCtx && modalCtx.aiCtl) modalCtx.aiCtl.abort(); },
  "ai-close": () => { if (modalCtx) modalCtx.ai = null; aiZone(aiIdleHTML()); },
  "ai-apply": () => aiApply(),
  "ai-undo": () => aiUndo(),
  "ai-show": () => { if (modalCtx && modalCtx.ai) aiZone(aiResultHTML(modalCtx.ai)); },
  "ai-gap-add": () => aiGapAdd(),
  "nz-pos": el => { closeModal(); S.nz.tab = "lavozim"; S.nz.pos = el.dataset.id; if (location.hash === "#nizom") { render(); window.scrollTo({ top: 0, behavior: "smooth" }); } else location.hash = "nizom"; },
  "nz-goto": el => { const t = document.getElementById("nz-" + el.dataset.id); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); },
  "nz-ack": el => nzAck(el.dataset.kind),
  "nz-sec": el => openSecModal(el.dataset.id),
  "nz-pos-edit": el => openPosModal(el.dataset.id),
  "nz-approve": async () => { const ap = nizom()?.status === "Tasdiqlangan"; if (await dbUpdate("docs/nizom", { status: ap ? "Loyiha" : "Tasdiqlangan", approvedAt: ap ? "" : iso() }, docBase)) toast(ap ? "Nizom loyiha holatiga qaytarildi" : "Nizom tasdiqlangan deb belgilandi"); },
  "nz-sec-del": el => { const id = el.dataset.id, s = nizom()?.sections?.[id]; confirmBox("Nizom bo'limini o'chirish", `«${s?.title || ""}» bo'limi o'chiriladi, nizom yangi tahrirga o'tadi.`, "O'chirish", () => dbUpdate("docs/nizom", { sections: { [id]: null }, v: nizomV() + 1, updatedAt: iso(), by: actorId() }, docBase)); },
  "nz-pos-del": el => { const id = el.dataset.id, p = posMap()[id], n = posHolders(id).length; confirmBox("Lavozimni o'chirish", `«${p?.title || ""}» yo'riqnomasi o'chiriladi.${n ? ` ${n} ta xodimda lavozim biriktirilmagan bo'lib qoladi.` : ""}`, "O'chirish", async () => { if (await dbUpdate("docs/lavozimlar", { pos: { [id]: null } }, () => ({ pos: {} }))) { S.nz.pos = null; toast("Lavozim o'chirildi"); } }); },
  "search": () => openSpot(),
  "spot-run": el => spotRun(Number(el.dataset.i))
};
const changes = {
  "tf-dept": el => { S.tf.dept = el.value; render(); },
  "task-status": el => quickStatus(el.dataset.id, el.value),
  "att-date": el => { if (!el.value) return; S.attDate = el.value; ensureMonths(); render(); },
  "att-dept": el => { S.attF.dept = el.value; render(); },
  "sim-role": el => {
    const [role, sid] = String(el.value).split("|");
    S.sim = { role: ROLE_LABEL[role] ? role : "rahbar", staffId: sid || null };
    S.tf.mine = !!sid; bump(); render();
    toast(sid ? `Endi ${personName(sid)} (${ROLE_LABEL[S.sim.role]}) ko'radigan ko'rinish` : "Rahbar ko'rinishi");
  },
  "branch-name": el => { const name = el.value.trim(); if (!name) { render(); return; } orgUpdate({ branches: { [el.dataset.id]: { name } } }); },
  "set-grace": el => { const g = clamp(Math.round(num(el.value)), 0, 120); orgUpdate({ settings: { grace: g } }); },
  "set-wd": () => { const wd = $$('[data-change="set-wd"]:checked').map(i => Number(i.value)); if (!wd.length) { toast("Kamida bitta ish kuni bo'lishi kerak", "crit"); render(); return; } orgUpdate({ settings: { workDays: wd } }); },
  "set-pinlen": el => {
    const n = Number(el.value), existing = Object.entries((S.pins && S.pins.pins) || {}).filter(([k, v]) => v && S.org.staff[k]).map(([k]) => k);
    const apply = async () => { if (await orgUpdate({ settings: { pinLen: n } })) { if (S.pins) await dbUpdate(PIN_PATH, { len: n, pins: Object.fromEntries(Object.keys(S.pins.pins || {}).map(k => [k, null])) }); toast(`PIN uzunligi: ${n} raqam`); } };
    if (!existing.length) { apply(); return; }
    render();
    confirmBox("PIN uzunligini o'zgartirish", `Terminal hamma PIN'lar bir xil uzunlikda bo'lishini talab qiladi. ${existing.length} ta xodimning hozirgi PIN'i bekor qilinadi va har biriga yangi ${n} raqamli PIN berishingiz kerak bo'ladi.`, "O'zgartirish", apply);
  },
  "pick-dept": () => renderStaffPicks(null, null),
  "ai-alt": el => aiPickAlt(el),
  "ai-check": el => aiCheck(el),
  "pick-owner": () => renderStaffPicks(null, null),
  "upload-files": el => uploadFiles(el)
};
const submits = {
  task: saveTask, staff: saveStaff, dept: saveDept, att: saveAtt, "nz-sec": saveSec, "nz-pos": savePos,
  confirm: async () => { const fn = confirmFn; confirmFn = null; closeModal(); if (fn) await fn(); }
};
function syncOpenDept() { $$(".dept-node").forEach(n => { const on = n.dataset.dept === S.openDept; n.classList.toggle("open", on); const b = n.querySelector(".node-toggle"); if (b) b.setAttribute("aria-expanded", String(on)); }); }
function attResults() { const date = S.attDate || todayStr(), m = monthOf(date); return !S.loaded["att:" + m] && S.conn === "live" ? loadingBlock() : S.attMode === "month" ? attMonthHTML(m) : attDayHTML(date); }

document.addEventListener("click", e => {
  if (S.openDept && !e.target.closest(".dept-node.open")) { S.openDept = null; syncOpenDept(); }
  if (notifOpen && !e.target.closest("#notif") && !e.target.closest("#bell")) toggleNotif(false);
  if (bgPickOpen && !e.target.closest("#bgpick") && !e.target.closest("#bg-btn")) toggleBgPick(false);
}, true);
document.addEventListener("click", e => { const el = e.target.closest("[data-action]"); if (!el || el.disabled) return; const fn = actions[el.dataset.action]; if (fn) { e.preventDefault(); fn(el, e); } });
document.addEventListener("change", e => { const el = e.target.closest("[data-change]"); if (!el) return; const fn = changes[el.dataset.change]; if (fn) fn(el, e); });
let acctT = 0;
document.addEventListener("input", e => {
  const id = e.target.id;
  if (id === "tq") { S.tf.q = e.target.value; const box = $("#task-results"); if (box) box.innerHTML = taskResults(); }
  else if (id === "att-q") { S.attF.q = e.target.value; const box = $("#att-results"); if (box) box.innerHTML = attResults(); }
  else if (id === "f-pct") { const o = $("#f-pct-out"); if (o) o.textContent = e.target.value + "%"; }
  else if (id === "spot-q") renderSpot(e.target.value);
  else if (id === "acct-q") { clearTimeout(acctT); const q = e.target.value; acctT = setTimeout(() => acctSearch(q), 120); }
  else if (id === "s-pin") { e.target.value = e.target.value.replace(/\D/g, ""); }
});
document.addEventListener("focusin", e => { if (e.target.id === "acct-q" && !e.target.value) acctSearch(""); });
// biriktirilgan rasm topilmasa (o'chirilgan yoki tashkilotdan tashqarida ochilgan), o'rniga belgi chiqadi
document.addEventListener("error", e => { const t = e.target; if (t && t.tagName === "IMG" && t.closest && t.closest(".thumb")) t.closest(".thumb").classList.add("broken"); }, true);
document.addEventListener("submit", e => { const f = e.target; e.preventDefault(); const fn = submits[f.dataset.form]; if (fn) fn(f); });
document.addEventListener("toggle", e => { if (e.target.id === "done-list") S.doneOpen = e.target.open; }, true);
document.addEventListener("keydown", e => {
  const k = e.key;
  if ((e.metaKey || e.ctrlKey) && (k === "k" || k === "K")) { e.preventDefault(); if (S.view !== "kiosk") { if (spot.open) closeSpot(); else { if (dlg.open) closeModal(); toggleNotif(false); openSpot(); } } return; }
  if (spot.open) {
    if (k === "ArrowDown") { e.preventDefault(); spotMove(1); }
    else if (k === "ArrowUp") { e.preventDefault(); spotMove(-1); }
    else if (k === "Enter") { e.preventDefault(); spotRun(spotIdx); }
    return;
  }
  if (S.view === "kiosk" && !dlg.open) {
    if (/^\d$/.test(k)) { e.preventDefault(); kioskKey(k); }
    else if (k === "Backspace") { e.preventDefault(); kioskKey("del"); }
    else if (k === "Enter") { e.preventDefault(); kioskKey("ok"); }
    return;
  }
  if (k === "Escape" && !dlg.open) {
    if (bgPickOpen) toggleBgPick(false);
    else if (notifOpen) toggleNotif(false);
    else if (S.openDept) { S.openDept = null; syncOpenDept(); }
  }
  if (e.target && e.target.id === "cm-text" && k === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendComment(); return; }
  const go = e.target.closest && e.target.closest('[data-action="go"]');
  if (go && (k === "Enter" || k === " ")) { e.preventDefault(); location.hash = go.dataset.href; }
});

/* ================= routing and boot ================= */
let wakeLock = null;
async function kioskWake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); }
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (h.startsWith("bolim-")) { S.view = "bolim"; S.deptId = h.slice(6); }
  else S.view = VIEWS.includes(h) ? h : "tuzilma";
  if (S.view !== "kiosk") { K.pin = ""; K.msg = null; K.err = ""; K.exit = false; }
  kioskWake(S.view === "kiosk");
  closeSpot();
  if (notifOpen) toggleNotif(false);
  render();
}
function tick() {
  if (S.lastMinute === nowHM()) return;
  if (dlg.open || spot.open) return;
  const ae = document.activeElement;
  if (ae && main().contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;
  ensureMonths();
  render();
}
function start() {
  if (!S.attDate) S.attDate = todayStr();
  if (!S.dash.month) S.dash.month = monthOf(todayStr());
  try { S.seenLocal = localStorage.getItem("tg-seen") || ""; } catch (e) {}
  const kbd = $("#kbd-k"); if (kbd && !/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) kbd.textContent = "Ctrl K";
  try { startWaves(); } catch (e) {}
  try { let lastW = 0; new ResizeObserver(() => { const w = main().clientWidth; if (w === lastW) return; lastW = w; if (S.view === "dashboard") requestAnimationFrame(postRender); }).observe(main()); } catch (e) {}
  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.view === "kiosk") kioskWake(true); });
  route();
  connect();
  setInterval(tick, 20000);
  setInterval(() => {
    if (S.view !== "kiosk") return;
    const el = $("#k-clock"); if (!el) return;
    const d = new Date(); el.innerHTML = `${pad(d.getHours())}:${pad(d.getMinutes())}<span>:${pad(d.getSeconds())}</span>`;
  }, 1000);
}
start();
