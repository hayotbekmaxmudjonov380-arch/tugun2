/* ================= modals ================= */
const dlg = document.getElementById("modal");
let modalCtx = null;
function showModal(html, ctx) {
  cleanupModal();
  modalCtx = ctx || null;
  dlg.innerHTML = html;
  if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }
  const f = dlg.querySelector("[autofocus]") || dlg.querySelector("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])");
  if (f) f.focus();
  else { const h = dlg.querySelector("#m-title"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
}
function cleanupModal() {
  if (modalCtx) {
    if (modalCtx.unsub) { try { modalCtx.unsub(); } catch (e) {} }
    if (modalCtx.aiCtl) { try { modalCtx.aiCtl.abort(); } catch (e) {} }
    clearInterval(modalCtx.aiTimer);
  }
  modalCtx = null;
}
function closeModal() { cleanupModal(); if (dlg.open) { try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); } } dlg.innerHTML = ""; }
dlg.addEventListener("close", () => { cleanupModal(); dlg.innerHTML = ""; });
dlg.addEventListener("click", e => { if (e.target === dlg) closeModal(); });
const mHead = (title, sub) => `<header class="m-head"><div><h2 id="m-title">${esc(title)}</h2>${sub ? `<p class="m-sub">${sub}</p>` : ""}</div><button type="button" class="icon-btn" data-action="close-modal" aria-label="Yopish">×</button></header>`;
function setErr(msg) { const el = dlg.querySelector(".m-error"); if (el) el.textContent = msg; return false; }

/* ----- task modal: asosiy / izohlar / fayllar / tarix ----- */
function filesOf(t) { return Object.entries(t.files || {}).filter(([, f]) => f && typeof f === "object").map(([k, f]) => ({ key: k, ...f })).sort((a, b) => String(b.t).localeCompare(String(a.t))); }
function historyOf(t) { return Object.values(t.history || {}).filter(h => h && typeof h === "object").sort((a, b) => String(b.t).localeCompare(String(a.t))); }
function openTaskModal(id, preset = {}, tab = "main") {
  if (!Object.keys(S.org.departments).length) { toast("Avval Sozlamalarda bo'lim qo'shing", "crit"); return; }
  const ex = id ? S.tasks[id] : null;
  if (id && !ex) return;
  if (!id && !can.createTask()) { toast("Task yaratish huquqi rahbar va bo'lim boshliqlarida", "crit"); return; }
  const defDept = preset.deptIds || (myRole() === "boshliq" && myDeptId() ? [myDeptId()] : []);
  const t = ex ? { ...ex, id } : { title: "", desc: "", deptIds: defDept, staffIds: [], ownerId: preset.ownerId || (myRole() === "boshliq" ? myStaffId() || "" : ""), start: todayStr(), due: addDays(todayStr(), 7), status: "new", progress: 0 };
  const full = !id || can.editTask(t), prog = !id || can.progress(t);
  const dis = full ? "" : " disabled", pdis = prog ? "" : " disabled";
  const deptSet = new Set(t.deptIds || []);
  const st = id ? stateOf(t) : "new";
  const nFiles = id ? filesOf(t).length : 0, nHist = id ? historyOf(t).length : 0;
  const tabs = id ? `<div class="m-tabs seg" role="tablist">${[["main", "Asosiy"], ["comments", "Izohlar"], ["files", `Fayllar${nFiles ? ` <span class="n">${nFiles}</span>` : ""}`], ["history", `Tarix${nHist ? ` <span class="n">${nHist}</span>` : ""}`]].map(([k, l]) => `<button type="button" role="tab" data-action="task-tab" data-v="${k}" aria-pressed="${tab === k}" id="tab-${k}">${l}</button>`).join("")}</div>` : "";
  const o = t.ownerId ? getPerson(t.ownerId) : null;
  showModal(`<form class="modal-form wide" data-form="task" data-id="${esc(id || "")}" novalidate>
    ${mHead(id ? t.title : "Yangi task", id ? `<span class="pill s-${st}">${STATE_LABEL[st]}</span> ${o ? `Mas'ul: <b>${esc(o.name)}</b>` : `<b class="warn-t">Mas'ul tayinlanmagan</b>`} · ${tDepts(t).length} ta bo'lim · <span class="due ${dueInfo(t).cls}">${esc(dueInfo(t).text)}</span>` : "Bitta mas'ul, bir yoki bir nechta bo'lim")}
    ${tabs}
    <div class="m-body">
      <div class="tab-panel" data-panel="main"${tab === "main" ? "" : " hidden"}>
        ${!full && id ? `<p class="hint">${prog ? "Siz bu taskda ijrochisiz: holat va bajarilish foizini o'zgartira olasiz." : "Bu taskni faqat ko'rishingiz mumkin."}</p>` : ""}
        <label class="field"><span>Task nomi</span><input type="text" id="f-title" maxlength="140" value="${esc(t.title)}" placeholder="Masalan: 2-obyektga material yetkazish"${dis}${id ? "" : " autofocus"}></label>
        <label class="field"><span>Tavsif</span><textarea id="f-desc" rows="2" maxlength="600" placeholder="Qisqacha nima qilinadi"${dis}>${esc(t.desc || "")}</textarea></label>
        ${full && positions().length ? `<div class="ai-zone" id="ai-zone">${aiIdleHTML()}</div>` : ""}
        <fieldset class="field"><legend>Qaysi bo'limlar bajaradi</legend>
          ${branches().map(b => depts(b.id).length ? `<div class="pick-group"><span class="pg-name">${esc(b.name)}</span><div class="picks">${depts(b.id).map(d => `<label class="pick"><input type="checkbox" name="dept" value="${esc(d.id)}" data-change="pick-dept"${deptSet.has(d.id) ? " checked" : ""}${dis}><span>${esc(d.name)}</span></label>`).join("")}</div></div>` : "").join("")}
        </fieldset>
        <label class="field owner-field"><span>Mas'ul (tugun egasi) <small>javobgar bitta bo'ladi</small></span><select id="f-owner" data-change="pick-owner"${dis}></select></label>
        <fieldset class="field"><legend>Ijrochilar <span style="font-weight:400">(belgilanmasa, butun bo'lim)</span></legend><div id="staff-picks"></div></fieldset>
        <div class="field-row">
          <label class="field"><span>Boshlanish sanasi</span><input type="date" id="f-start" value="${esc(t.start || "")}"${dis}></label>
          <label class="field"><span>Yakunlanish muddati</span><input type="date" id="f-due" value="${esc(t.due || "")}"${dis}></label>
        </div>
        <div class="field-row">
          <label class="field"><span>Holat</span><select id="f-status"${pdis}>${EDIT_STATUSES.map(s => `<option value="${s}"${t.status === s ? " selected" : ""}>${STATE_LABEL[s]}</option>`).join("")}</select></label>
          <div class="field"><span>Bajarilish: <output id="f-pct-out" for="f-pct">${pct(t)}%</output></span><div class="range-row"><input type="range" id="f-pct" min="0" max="100" step="5" value="${pct(t)}" aria-label="Bajarilish foizi"${pdis}></div></div>
        </div>
        <p class="m-error" role="alert"></p>
      </div>
      ${id ? `<div class="tab-panel" data-panel="comments"${tab === "comments" ? "" : " hidden"}>
        <ul class="comments" id="cm-list"><li class="muted">Yuklanmoqda…</li></ul>
        ${can.comment() ? `<div class="composer"><label class="sr" for="cm-text">Izoh</label><textarea id="cm-text" rows="2" maxlength="1000" placeholder="Izoh yozing. Ctrl+Enter bilan yuborish."></textarea><button type="button" class="btn primary" data-action="send-comment">Yuborish</button></div>` : `<p class="hint">Izoh yozish uchun xodimlar ro'yxatiga bog'langan bo'lishingiz kerak.</p>`}
      </div>
      <div class="tab-panel" data-panel="files"${tab === "files" ? "" : " hidden"}><div id="files-box">${filesHTML(t)}</div></div>
      <div class="tab-panel" data-panel="history"${tab === "history" ? "" : " hidden"}><div id="hist-box">${historyHTML(t)}</div></div>` : ""}
    </div>
    <footer class="m-foot">
      ${id && can.deleteTask(t) ? `<button type="button" class="btn danger ghost" data-action="delete-task" data-id="${esc(id)}">O'chirish</button>` : ""}
      ${id ? `<button type="button" class="btn ghost" data-action="focus-from-modal" data-id="${esc(id)}">Sxemada ko'rsatish</button>` : ""}
      <span class="spacer"></span>
      <button type="button" class="btn ghost" data-action="close-modal">${full || prog ? "Bekor qilish" : "Yopish"}</button>
      ${full || prog ? `<button type="submit" class="btn primary" id="task-save">Saqlash</button>` : ""}
    </footer>
  </form>`, { type: "task", id: id || null, tab, comments: null });
  renderStaffPicks(t.staffIds || [], t.ownerId || "");
  if (id) { modalCtx.unsub = subscribeComments(id); if (tab !== "main") setTab(tab); }
}
function renderStaffPicks(initial, ownerInit) {
  const box = dlg.querySelector("#staff-picks"), sel = dlg.querySelector("#f-owner"); if (!box || !sel) return;
  const disabled = sel.disabled;
  const chosen = $$('input[name="dept"]:checked', dlg).map(i => i.value);
  const prev = new Set(initial || $$('input[name="staff"]:checked', box).map(i => i.value));
  const owner = ownerInit != null ? ownerInit : sel.value;
  const ownerOpts = [`<option value="">Mas'ulni tanlang</option>`];
  const groups = chosen.length ? chosen : [];
  groups.forEach(did => { const d = getDept(did); if (!d) return; ownerOpts.push(`<optgroup label="${esc(d.name)} · ${esc(branchName(d.branch))}">${staffOf(did).map(p => `<option value="${esc(p.id)}"${p.id === owner ? " selected" : ""}>${esc(p.name)}${d.headId === p.id ? " (boshliq)" : ""}</option>`).join("")}</optgroup>`); });
  if (owner && S.org.staff[owner] && !groups.includes(S.org.staff[owner].deptId)) ownerOpts.push(`<option value="${esc(owner)}" selected>${esc(personName(owner))}</option>`);
  sel.innerHTML = ownerOpts.join("");
  const dis = disabled ? " disabled" : "";
  if (!chosen.length) { box.innerHTML = `<p class="muted" style="margin:0;font-size:13.5px">Avval bo'limni tanlang.</p>`; return; }
  box.innerHTML = chosen.map(id => { const d = getDept(id); if (!d) return ""; const ppl = staffOf(id);
    return `<div class="pick-group"><span class="pg-name">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></span><div class="picks">${ppl.length ? ppl.map(p => { const isOwner = p.id === sel.value; return `<label class="pick staff${isOwner ? " is-owner" : ""}"><input type="checkbox" name="staff" value="${esc(p.id)}"${prev.has(p.id) || isOwner ? " checked" : ""}${dis || isOwner ? " disabled" : ""}><span>${isOwner ? "★ " : ""}${esc(p.name)}</span></label>`; }).join("") : `<span class="muted" style="font-size:13px">Bu bo'limda xodim yo'q</span>`}</div></div>`; }).join("");
}
function filesHTML(t) {
  const files = filesOf(t);
  const upload = can.files() ? `<label class="dropzone" for="file-in"><input type="file" id="file-in" multiple accept="image/*,application/pdf,text/plain,text/csv,text/markdown,application/json" data-change="upload-files"><b>Fayl biriktirish</b><span>Rasm, PDF, CSV yoki matn fayli, 20 MB gacha</span></label>`
    : `<p class="hint">${S.sandbox ? "Sinov rejimida fayl yuklab bo'lmaydi." : "Fayl biriktirish uchun sahifada tahrirlash huquqi kerak."}</p>`;
  return `${upload}${files.length ? `<ul class="files">${files.map(f => { const url = `/_blob/${encodeURIComponent(f.id || "")}`; const img = /^image\//.test(f.type || ""); return `<li>${img ? `<a class="thumb" href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(f.name)}" loading="lazy"></a>` : `<span class="ficon">${esc(String(f.name || "").split(".").pop().slice(0, 4).toUpperCase() || "FAYL")}</span>`}<span class="fmeta"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(f.name || "fayl")}</a><small>${esc(fmtSize(num(f.size)))} · ${esc(actorName(f.by))} · ${esc(timeAgo(f.t))}</small></span>${can.editTask(t) || f.by === actorId() ? `<button type="button" class="icon-btn sm" data-action="del-file" data-key="${esc(f.key)}" aria-label="Faylni olib tashlash">×</button>` : ""}</li>`; }).join("")}</ul>` : `<p class="muted">Hali fayl biriktirilmagan.</p>`}`;
}
function historyHTML(t) {
  const h = historyOf(t);
  return h.length ? `<ol class="timeline">${h.map(x => `<li><span class="tl-dot"></span><span class="tl-body"><b>${esc(actorName(x.by))}</b> ${esc(x.txt || "")}<small>${esc(fmtDT(x.t))}</small></span></li>`).join("")}</ol>` : `<p class="muted">Tarix bo'sh.</p>`;
}
function refreshTaskModal() {
  if (!modalCtx || modalCtx.type !== "task" || !modalCtx.id) return;
  const t = S.tasks[modalCtx.id]; if (!t) return;
  const tt = { ...t, id: modalCtx.id };
  const fb = dlg.querySelector("#files-box"); if (fb && !fb.querySelector(".uploading")) fb.innerHTML = filesHTML(tt);
  const hb = dlg.querySelector("#hist-box"); if (hb) hb.innerHTML = historyHTML(tt);
  const nF = filesOf(tt).length, nH = historyOf(tt).length;
  const tf = dlg.querySelector("#tab-files"); if (tf) tf.innerHTML = `Fayllar${nF ? ` <span class="n">${nF}</span>` : ""}`;
  const th = dlg.querySelector("#tab-history"); if (th) th.innerHTML = `Tarix${nH ? ` <span class="n">${nH}</span>` : ""}`;
}
function subscribeComments(id) {
  if (!S.db) return null;
  try {
    return S.db.collection(`tasks/${id}/comments`).onSnapshot(qs => {
      if (!modalCtx || modalCtx.id !== id) return;
      modalCtx.comments = qs.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.t).localeCompare(String(b.t)));
      renderComments();
    }, () => { const box = dlg.querySelector("#cm-list"); if (box) box.innerHTML = `<li class="muted">Izohlarni o'qib bo'lmadi.</li>`; });
  } catch (e) { return null; }
}
function renderComments() {
  const box = dlg.querySelector("#cm-list"); if (!box || !modalCtx) return;
  if (modalCtx.comments == null) { box.innerHTML = `<li class="muted">Yuklanmoqda…</li>`; return; }
  const list = modalCtx.comments;
  const tc = dlg.querySelector("#tab-comments"); if (tc) tc.innerHTML = `Izohlar${list.length ? ` <span class="n">${list.length}</span>` : ""}`;
  const me = actorId();
  box.innerHTML = list.length ? list.map(c => {
    const who = c.staffId && S.org.staff[c.staffId] ? getPerson(c.staffId) : null;
    const name = who ? who.name : actorName(c.by || (c.uid ? "u:" + c.uid : ""));
    const mine = (c.by && c.by === me) || (c.staffId && c.staffId === myStaffId());
    return `<li class="comment${mine ? " mine" : ""}">${who ? avatar(who, "sm") : `<span class="av sm sys">${esc(initials(name))}</span>`}<div class="c-body"><div class="c-head"><b>${esc(name)}</b><span>${esc(timeAgo(c.t))}</span>${mine || myRole() === "rahbar" ? `<button type="button" class="link-plain c-del" data-action="del-comment" data-id="${esc(c.id)}">o'chirish</button>` : ""}</div><p>${esc(c.text)}</p></div></li>`;
  }).join("") : `<li class="muted">Hali izoh yo'q. Birinchi bo'lib yozing.</li>`;
  box.scrollTop = box.scrollHeight;
}
async function sendComment() {
  const ta = dlg.querySelector("#cm-text"); if (!ta || !modalCtx || !modalCtx.id) return;
  const text = ta.value.trim(); if (!text) return;
  if (!can.comment()) { toast("Izoh yozish uchun ruxsat yo'q", "crit"); return; }
  const id = modalCtx.id, t = S.tasks[id]; if (!t) return;
  const c = { text, staffId: myStaffId() || "", uid: S.me.id || "", by: actorId(), t: iso() };
  ta.value = ""; ta.disabled = true;
  const ok = await enqueue(`tasks/${id}/comments`, () => withRetry(() => S.db.collection(`tasks/${id}/comments`).doc(uid("c")).set(c)).then(() => true)).catch(e => writeFailed(e, `tasks/${id}`));
  ta.disabled = false; ta.focus();
  if (!ok) { ta.value = text; return; }
  dbUpdate(`tasks/${id}`, { lastCommentAt: c.t });
  const to = [...new Set([...(t.staffIds || []), t.ownerId])].filter(x => x && x !== myStaffId());
  logEvent({ k: "comment", task: id, txt: `izoh qoldirdi: «${t.title}»`, to, dept: t.deptIds || [] });
}
const FILE_TYPES = { csv: "text/csv", md: "text/markdown", markdown: "text/markdown", json: "application/json", txt: "text/plain", pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };
const UPLOAD_ERR = {
  too_large: "fayl juda katta (20 MB gacha)",
  unsupported_type: "bu turdagi fayl qabul qilinmaydi (rasm, PDF, CSV, JSON yoki matn bo'lishi kerak)",
  quota_or_state: "fayllar uchun joy tugagan, eski fayllarni o'chiring",
  rate_limited: "juda tez-tez yuklanmoqda, biroz kutib qayta urining",
  invalid_request: "faylni o'qib bo'lmadi (matn fayli UTF-8 bo'lishi kerak)",
  not_granted: "fayl yuklash huquqingiz yo'q",
  upstream_auth: "sahifani yangilab, qayta kiring"
};
async function uploadFiles(input) {
  if (!can.files() || !modalCtx || !modalCtx.id) return;
  const id = modalCtx.id, t = S.tasks[id]; if (!t) return;
  const files = [...(input.files || [])]; input.value = "";
  const box = dlg.querySelector("#files-box");
  for (const f of files) {
    if (f.size > 20 * 1024 * 1024) { toast(`«${f.name}» 20 MB dan katta`, "crit"); continue; }
    if (box) box.insertAdjacentHTML("afterbegin", `<p class="hint uploading">«${esc(f.name)}» yuklanmoqda…</p>`);
    const ext = String(f.name || "").split(".").pop().toLowerCase();
    const type = FILE_TYPES[ext] || f.type || "";
    try {
      let r;
      try { r = await S.assets.upload(f, type ? { type } : undefined); }
      catch (e) { if (e && e.code === "store_unavailable") { await sleep(800); r = await S.assets.upload(f, type ? { type } : undefined); } else throw e; }
      const key = uid("f");
      const ok = await dbUpdate(`tasks/${id}`, { files: { [key]: { id: r.id, name: f.name, type: r.contentType || type, size: r.sizeBytes || f.size, by: actorId(), t: iso() } }, history: { [uid("h")]: { t: iso(), by: actorId(), k: "file", txt: `fayl biriktirdi: ${f.name}` } }, updatedAt: iso() });
      if (ok) logEvent({ k: "file", task: id, txt: `fayl biriktirdi: «${t.title}»`, to: [...new Set([...(t.staffIds || []), t.ownerId])].filter(x => x && x !== myStaffId()), dept: t.deptIds || [] });
    } catch (e) { toast(`«${f.name}» yuklanmadi: ${UPLOAD_ERR[e && e.code] || "kutilmagan xato, qayta urining"}`, "crit"); }
    const up = dlg.querySelector(".uploading"); if (up) up.remove();
  }
  refreshTaskModal();
}
async function removeFile(key) {
  if (!modalCtx || !modalCtx.id) return;
  const id = modalCtx.id, t = S.tasks[id]; const f = t && t.files && t.files[key]; if (!f) return;
  const ok = await dbUpdate(`tasks/${id}`, { files: { [key]: null }, history: { [uid("h")]: { t: iso(), by: actorId(), k: "file", txt: `faylni olib tashladi: ${f.name}` } }, updatedAt: iso() });
  if (!ok) return;
  // fayl boshqa joyda ishlatilmaydi: saqlash joyini bo'shatamiz (huquq yetmasa, havola baribir o'chdi)
  if (S.assets && f.id) S.assets.delete(f.id).catch(() => {});
  toast("Fayl olib tashlandi");
}
async function saveTask(form) {
  const id = form.dataset.id || uid("t");
  const ex = form.dataset.id ? S.tasks[id] : null;
  const isNew = !ex;
  const full = isNew || can.editTask({ ...ex, id }), prog = isNew || can.progress({ ...ex, id });
  if (!full && !prog) return;
  const status = $("#f-status", dlg).value;
  let progress = num($("#f-pct", dlg).value);
  if (status === "done") progress = 100;
  const now = iso(), me = actorId();
  const hist = {}, events = [];
  let data;
  if (full) {
    const title = $("#f-title", dlg).value.trim(), desc = $("#f-desc", dlg).value.trim();
    const ownerId = $("#f-owner", dlg).value;
    const picked = $$('input[name="staff"]:checked', dlg).map(i => i.value);
    const staffIds = [...new Set([ownerId, ...picked].filter(Boolean))];
    const deptIds = [...new Set($$('input[name="dept"]:checked', dlg).map(i => i.value).concat(staffIds.map(pid => S.org.staff[pid]?.deptId).filter(Boolean)))];
    const start = $("#f-start", dlg).value, due = $("#f-due", dlg).value;
    if (!title) return setErr("Task nomini yozing.");
    if (!deptIds.length) return setErr("Kamida bitta bo'limni tanlang.");
    if (!ownerId) return setErr("Mas'ulni tanlang. Har bir taskning bitta egasi bo'lishi kerak.");
    if (!due) return setErr("Yakunlanish muddatini belgilang.");
    if (start && start > due) return setErr("Boshlanish sanasi muddatdan keyin bo'lishi mumkin emas.");
    data = { title, desc, deptIds, staffIds, ownerId, start: start || due, due, status, progress };
    if (isNew) { hist[uid("h")] = { t: now, by: me, k: "create", txt: "taskni yaratdi" }; events.push({ k: "create", txt: `yangi task yaratdi: «${title}»` }); }
    else {
      if (ex.ownerId !== ownerId) { hist[uid("h")] = { t: now, by: me, k: "owner", txt: `mas'ulni almashtirdi: ${personName(ownerId)}` }; events.push({ k: "owner", txt: `mas'ulni ${personName(ownerId)} qilib tayinladi: «${title}»`, extra: [ownerId] }); }
      if (ex.due !== due) { hist[uid("h")] = { t: now, by: me, k: "due", txt: `muddatni o'zgartirdi: ${fmtDate(ex.due)} → ${fmtDate(due)}` }; events.push({ k: "due", txt: `muddatni ${fmtDate(due)} ga o'zgartirdi: «${title}»` }); }
      const added = staffIds.filter(x => !(ex.staffIds || []).includes(x));
      if (added.length) { hist[uid("h")] = { t: now, by: me, k: "staff", txt: `ijrochi qo'shdi: ${added.map(personName).join(", ")}` }; events.push({ k: "staff", txt: `sizni taskka qo'shdi: «${title}»`, only: added }); }
    }
  } else data = { status, progress };
  const title = data.title || ex.title;
  if (form.dataset.ai === "1") hist[uid("h")] = { t: now, by: me, k: "ai", txt: "mas'ul va ijrochilarni nizom tavsiyasi asosida tanladi" };
  if (!isNew) {
    if (ex.status !== status) { hist[uid("h")] = { t: now, by: me, k: "status", txt: `holatni «${STATE_LABEL[status]}» qildi` }; events.push({ k: "status", txt: `holatni «${STATE_LABEL[status]}» qildi: «${title}»` }); }
    else if (pct(ex) !== progress) { hist[uid("h")] = { t: now, by: me, k: "progress", txt: `bajarilishni ${progress}% ga yetkazdi` }; events.push({ k: "progress", txt: `bajarilishni ${progress}% ga yetkazdi: «${title}»` }); }
  }
  const patch = { ...data, updatedAt: now, doneAt: status === "done" ? (ex?.doneAt || todayStr()) : "", demo: false, history: hist };
  const btn = $("#task-save", dlg); if (btn) btn.disabled = true;
  const ok = isNew ? await dbSet(`tasks/${id}`, { ...patch, createdAt: now, files: {}, history: hist }) : await dbUpdate(`tasks/${id}`, patch);
  if (btn) btn.disabled = false;
  if (!ok) return;
  const staffAll = data.staffIds || ex?.staffIds || [], owner = data.ownerId || ex?.ownerId;
  const to = [...new Set([...staffAll, owner])].filter(x => x && x !== myStaffId());
  events.forEach(e => { const { only, extra, ...rest } = e; logEvent({ ...rest, task: id, to: only || [...new Set(to.concat(extra || []))], dept: data.deptIds || ex?.deptIds || [] }); });
  closeModal(); toast(isNew ? "Yangi task qo'shildi" : "Task saqlandi");
}
async function quickStatus(id, status) {
  const t = S.tasks[id]; if (!t) return;
  const now = iso(), patch = { status, updatedAt: now, demo: false, doneAt: status === "done" ? todayStr() : "", history: { [uid("h")]: { t: now, by: actorId(), k: "status", txt: `holatni «${STATE_LABEL[status]}» qildi` } } };
  if (status === "done") patch.progress = 100;
  if (await dbUpdate(`tasks/${id}`, patch)) {
    logEvent({ k: "status", task: id, txt: `holatni «${STATE_LABEL[status]}» qildi: «${t.title}»`, to: [...new Set([...(t.staffIds || []), t.ownerId])].filter(x => x && x !== myStaffId()), dept: t.deptIds || [] });
    toast(`Holat: ${STATE_LABEL[status]}`);
  }
}

function onProfiles() {
  if (!dlg.open || !modalCtx) return;
  if (modalCtx.type === "staff") { const u = $("#s-uid", dlg), box = $("#acct-box", dlg); if (u && box && u.value && box.querySelector(".acct.linked")) box.innerHTML = acctBoxHTML(u.value); }
  else if (modalCtx.type === "task") { renderComments(); refreshTaskModal(); }
}

/* ----- xodim kartasi (rahbar uchun) ----- */
function openStaffModal(id, deptId) {
  const ex = id ? getPerson(id) : null;
  if (!ex && allStaff().length >= settings().maxStaff) { toast(`Tugun ${settings().maxStaff} xodimgacha mo'ljallangan`, "crit"); return; }
  const p = ex || { name: "", role: "", deptId: deptId || deptsOrdered()[0]?.id, phone: "", access: "xodim" };
  const isHead = ex && S.org.departments[ex.deptId]?.headId === ex.id;
  const hasPin = !!(id && S.pins && S.pins.pins && S.pins.pins[id]);
  const len = settings().pinLen;
  showModal(`<form class="modal-form" data-form="staff" data-id="${esc(id || "")}" novalidate>
    ${mHead(id ? "Xodim kartasi" : "Yangi xodim")}
    <div class="m-body">
      <div class="field-row">
        <label class="field"><span>Ism familiya</span><input type="text" id="s-name" maxlength="60" value="${esc(p.name)}" autofocus></label>
        <label class="field"><span>Lavozim</span><input type="text" id="s-role" maxlength="60" value="${esc(p.role || "")}" placeholder="Masalan: Menejer"></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Bo'lim</span><select id="s-dept">${branches().map(b => `<optgroup label="${esc(b.name)}">${depts(b.id).map(d => `<option value="${esc(d.id)}"${p.deptId === d.id ? " selected" : ""}>${esc(d.name)} (${esc(b.name)})</option>`).join("")}</optgroup>`).join("")}</select></label>
        <label class="field"><span>Telefon (ixtiyoriy)</span><input type="text" id="s-phone" maxlength="30" value="${esc(p.phone || "")}" inputmode="tel"></label>
      </div>
      <label class="field"><span>Lavozim yo'riqnomasi</span><select id="s-pos"><option value="">Biriktirilmagan</option>${deptsOrdered().map(d => { const ps = positions().filter(x => x.deptId === d.id); return ps.length ? `<optgroup label="${esc(d.name)} · ${esc(branchName(d.branch))}">${ps.map(x => `<option value="${esc(x.id)}"${p.posId === x.id ? " selected" : ""}>${esc(x.title)}</option>`).join("")}</optgroup>` : ""; }).join("")}</select></label>
      <fieldset class="field"><legend>Roli</legend><div class="picks">
        <label class="pick"><input type="radio" name="s-access" value="xodim"${p.access !== "rahbar" && !isHead ? " checked" : ""}><span>Xodim</span></label>
        <label class="pick"><input type="radio" name="s-access" value="boshliq"${isHead ? " checked" : ""}><span>Bo'lim boshlig'i</span></label>
        <label class="pick"><input type="radio" name="s-access" value="rahbar"${p.access === "rahbar" ? " checked" : ""}><span>Rahbar</span></label>
      </div></fieldset>
      <div class="field"><span>Terminal PIN kodi</span>
        <div class="pin-row"><input type="password" id="s-pin" inputmode="numeric" maxlength="${len}" autocomplete="new-password" placeholder="${hasPin ? "O'rnatilgan, o'zgartirish uchun yangisini yozing" : `${len} ta raqam`}"><button type="button" class="btn tiny" data-action="gen-pin">Tasodifiy</button>${hasPin ? `<button type="button" class="btn tiny ghost" data-action="clear-pin">PIN'ni o'chirish</button>` : ""}</div>
        <small class="hint" id="pin-hint">${hasPin ? "PIN o'rnatilgan. Xavfsizlik uchun u ko'rsatilmaydi." : "PIN faqat bir marta ko'rinadi. Uni xodimga shaxsan bering."}</small>
      </div>
      <div class="field"><span>Claude hisobi <small>xodim o'z rolini ko'rishi uchun</small></span>
        <div id="acct-box">${acctBoxHTML(p.userId || "")}</div>
        <input type="hidden" id="s-uid" value="${esc(p.userId || "")}">
      </div>
      <p class="m-error" role="alert"></p>
    </div>
    <footer class="m-foot">${id ? `<button type="button" class="btn danger ghost" data-action="delete-staff" data-id="${esc(id)}">O'chirish</button>` : ""}<span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal">Bekor qilish</button><button type="submit" class="btn primary">Saqlash</button></footer>
  </form>`, { type: "staff", id: id || null });
}
function acctBoxHTML(userId) {
  if (userId) { requestProfiles([userId]); return `<div class="acct linked"><span class="av sm sys">✓</span><span>${esc(S.profiles[userId] || "Bog'langan hisob")}</span><button type="button" class="btn tiny ghost" data-action="acct-unlink">Uzish</button></div>`; }
  if (!S.user || typeof S.user.search !== "function") return `<p class="hint">Hisob bog'lash faqat claude.ai ichida ishlaydi.</p>`;
  return `<input type="search" id="acct-q" placeholder="Ism yoki email bo'yicha qidiring" autocomplete="off"><ul class="acct-res" id="acct-res"></ul><small class="hint">Qidiruv tashkilotingiz a'zolari va sahifaga taklif qilingan odamlar orasida ishlaydi.</small>`;
}
async function acctSearch(q) {
  const box = dlg.querySelector("#acct-res"); if (!box || !S.user) return;
  const hits = await S.user.search(q).catch(() => []);
  const taken = new Set(allStaff().map(p => p.userId).filter(Boolean));
  box.innerHTML = hits.length ? hits.map(h => `<li><button type="button" class="acct-hit" data-action="acct-pick" data-uid="${esc(h.id)}" data-name="${esc(h.name)}"${taken.has(h.id) ? " disabled" : ""}><img class="av sm img" src="${esc(h.avatarUrl || "")}" alt=""><span>${esc(h.name)}${taken.has(h.id) ? " <small>(boshqa xodimga bog'langan)</small>" : ""}</span></button></li>`).join("") : (q ? `<li class="muted">Topilmadi</li>` : "");
}
async function saveStaff(form) {
  const id = form.dataset.id || uid("p");
  const ex = form.dataset.id ? getPerson(form.dataset.id) : null;
  const name = $("#s-name", dlg).value.trim(), role = $("#s-role", dlg).value.trim(), deptId = $("#s-dept", dlg).value, phone = $("#s-phone", dlg).value.trim();
  const access = ($('input[name="s-access"]:checked', dlg) || {}).value || "xodim";
  const userId = $("#s-uid", dlg).value || "";
  const pin = $("#s-pin", dlg).value.trim(), len = settings().pinLen;
  if (!name) return setErr("Xodimning ismini yozing.");
  if (!deptId) return setErr("Bo'limni tanlang.");
  if (pin && !new RegExp(`^\\d{${len}}$`).test(pin)) return setErr(`PIN ${len} ta raqamdan iborat bo'lishi kerak.`);
  let pinPatch = null;
  if (pin) {
    const salt = (S.pins && S.pins.salt) || uid("s");
    const h = pinHash(salt, pin);
    const clash = Object.entries((S.pins && S.pins.pins) || {}).find(([k, v]) => v === h && k !== id && S.org.staff[k]);
    if (clash) return setErr("Bu PIN boshqa xodimda bor. Boshqa PIN tanlang.");
    if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) return setErr("PIN juda oddiy. Takrorlanmaydigan raqamlar tanlang.");
    pinPatch = { pins: { [id]: h }, len };
    if (!(S.pins && S.pins.salt)) pinPatch.salt = salt;
  }
  const order = ex && ex.deptId === deptId ? num(ex.order) : staffOf(deptId).reduce((m, x) => Math.max(m, num(x.order)), 0) + 1;
  const posId = ($("#s-pos", dlg) || {}).value || "";
  const patch = { staff: { [id]: { name, role, deptId, phone, order, access: access === "rahbar" ? "rahbar" : "xodim", userId, posId, demo: false } } };
  const curHead = S.org.departments[deptId]?.headId;
  if (access === "boshliq" && curHead !== id) patch.departments = { [deptId]: { headId: id } };
  if (access !== "boshliq" && curHead === id) patch.departments = { [deptId]: { headId: "" } };
  if (ex && ex.deptId !== deptId && S.org.departments[ex.deptId]?.headId === id) patch.departments = { ...(patch.departments || {}), [ex.deptId]: { headId: "" } };
  const ok = await orgUpdate(patch);
  if (!ok) return;
  if (pinPatch) {
    const okPin = await dbUpdate(PIN_PATH, pinPatch, () => ({ salt: pinPatch.salt || uid("s"), len, pins: {} }));
    if (!okPin) return;
  }
  closeModal(); toast(ex ? "Xodim saqlandi" : "Xodim qo'shildi");
}

/* ----- bo'lim ----- */
function openDeptModal(id, branchId) {
  const ex = id ? getDept(id) : null;
  const d = ex || { name: "", branch: branchId || branches()[0]?.id, workStart: "09:00", workEnd: "18:00", headId: "" };
  const n = id ? staffOf(id).length : 0;
  showModal(`<form class="modal-form" data-form="dept" data-id="${esc(id || "")}" novalidate>
    ${mHead(id ? "Bo'limni tahrirlash" : "Yangi bo'lim")}
    <div class="m-body">
      <label class="field"><span>Bo'lim nomi</span><input type="text" id="d-name" maxlength="28" value="${esc(d.name)}" placeholder="Masalan: Sales" autofocus></label>
      <label class="field"><span>Tarmoq</span><select id="d-branch">${branches().map(b => `<option value="${esc(b.id)}"${d.branch === b.id ? " selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label>
      ${id ? `<label class="field"><span>Bo'lim boshlig'i</span><select id="d-head"><option value="">Tayinlanmagan</option>${staffOf(id).map(p => `<option value="${esc(p.id)}"${d.headId === p.id ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>` : ""}
      <div class="field-row">
        <label class="field"><span>Ish boshlanishi (SS:DD)</span><input type="text" inputmode="numeric" maxlength="5" placeholder="09:00" id="d-start" value="${esc(d.workStart || "09:00")}"></label>
        <label class="field"><span>Ish tugashi (SS:DD)</span><input type="text" inputmode="numeric" maxlength="5" placeholder="18:00" id="d-end" value="${esc(d.workEnd || "18:00")}"></label>
      </div>
      <p class="m-error" role="alert"></p>
    </div>
    <footer class="m-foot">${id ? `<button type="button" class="btn danger ghost" data-action="delete-dept" data-id="${esc(id)}" data-n="${n}">O'chirish</button>` : ""}<span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal">Bekor qilish</button><button type="submit" class="btn primary">Saqlash</button></footer>
  </form>`, { type: "dept", id: id || null });
}
async function saveDept(form) {
  const exId = form.dataset.id; const ex = exId ? getDept(exId) : null;
  const name = $("#d-name", dlg).value.trim(), branch = $("#d-branch", dlg).value;
  const workStart = normTime($("#d-start", dlg).value || "09:00"), workEnd = normTime($("#d-end", dlg).value || "18:00");
  const headEl = $("#d-head", dlg);
  if (!name) return setErr("Bo'lim nomini yozing.");
  if (!branch) return setErr("Tarmoqni tanlang.");
  if (!workStart || !workEnd) return setErr("Ish vaqtini SS:DD ko'rinishida yozing, masalan 09:00.");
  if (toMin(workStart) >= toMin(workEnd)) return setErr("Ish tugash vaqti boshlanishidan keyin bo'lishi kerak.");
  let id = exId;
  if (!id) { id = `${slug(branch)}-${slug(name)}`; if (S.org.departments[id]) id = `${id}-${Math.random().toString(36).slice(2, 5)}`; }
  const order = ex && ex.branch === branch ? num(ex.order) : depts(branch).reduce((m, x) => Math.max(m, num(x.order)), 0) + 1;
  const rec_ = { name, branch, workStart, workEnd, order };
  if (headEl) rec_.headId = headEl.value;
  const ok = await orgUpdate({ departments: { [id]: rec_ } });
  if (ok) { closeModal(); toast(ex ? "Bo'lim saqlandi" : "Bo'lim qo'shildi"); }
}

/* ----- xodim profili (ko'rish) ----- */
function openPerson(id) {
  const p = getPerson(id); if (!p) return;
  const d = getDept(p.deptId), today = todayStr(), a = attInfo(p, today);
  const m = monthOf(today), [y, mo] = m.split("-").map(Number), last = new Date(y, mo, 0).getDate();
  let present = 0, lateN = 0, minutes = 0, work = 0, manual = 0;
  for (let i = 1; i <= last; i++) { const ds = `${m}-${pad(i)}`; if (ds > today) break; if (isWorkday(ds)) work++; const x = attInfo(p, ds); if (x.in) { present++; if (x.late) lateN++; if (x.out && x.worked != null) minutes += x.worked; } if (x.src === "manual" || x.edits.length) manual++; }
  const ts = tasksOfStaff(id).filter(t => t.status !== "done").sort(byDue);
  const owns = ts.filter(t => t.ownerId === id), exec = ts.filter(t => t.ownerId !== id);
  const isHead = d && d.headId === id;
  const role = p.access === "rahbar" ? "Rahbar" : isHead ? "Bo'lim boshlig'i" : "Xodim";
  const tl = list => list.length ? `<ul class="mini-tasks">${list.map(t => { const st = stateOf(t), info = dueInfo(t); return `<li><button type="button" class="link" data-action="open-task" data-id="${esc(t.id)}">${esc(t.title)}</button><span class="pill s-${st}">${STATE_LABEL[st]}</span><span class="due ${info.cls}">${esc(info.text)}</span></li>`; }).join("")}</ul>` : `<p class="muted">Yo'q</p>`;
  showModal(`<div class="modal-form">
    <header class="m-head person-head">${avatar(p, "lg")}<div><h2 id="m-title">${esc(p.name)}</h2><p class="m-sub">${esc(p.role || "")} · ${d ? `<a class="chip" href="#bolim-${esc(d.id)}" data-action="close-modal">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></a>` : ""} <span class="tag role">${role}</span></p></div><button type="button" class="icon-btn" data-action="close-modal" aria-label="Yopish">×</button></header>
    <div class="m-body">
      <div class="p-stats">
        <div><span>Bugun</span><b class="status t-${a.tone}"><span class="dot dot-${a.dot}"></span>${esc(a.label)}</b><small>${esc(a.in || "—")} → ${esc(a.out || "—")}</small></div>
        <div><span>Bu oy keldi</span><b>${present} / ${work}</b><small>${lateN} ta kechikish${manual ? `, ${manual} ta qo'lda` : ""}</small></div>
        <div><span>Bu oy ishladi</span><b>${Math.round(minutes / 60)} soat</b><small>${esc(fmtMonth(m))}</small></div>
        <div><span>Faol tasklar</span><b>${ts.length}</b><small>${owns.length ? `${owns.length} tasida mas'ul` : "mas'ul bo'lgan taski yo'q"}</small></div>
      </div>
      ${(() => { const st = ackState(id), pos = p.posId ? posMap()[p.posId] : null; return `<div class="p-nizom"><span>${pos ? `Lavozim: <button type="button" class="link" data-action="nz-pos" data-id="${esc(p.posId)}">${esc(pos.title)}</button>` : "Lavozim yo'riqnomasi biriktirilmagan"}</span><span>Nizom ${ackChip(st.nz, st.a?.nizom?.t)}</span>${pos ? `<span>Yo'riqnoma ${ackChip(st.ps, st.a?.pos?.t)}</span>` : ""}</div>`; })()}
      <h4 class="sec-title">Mas'ul bo'lgan tasklari</h4>${tl(owns)}
      <h4 class="sec-title">Ijrochi bo'lgan tasklari</h4>${tl(exec)}
      ${p.phone ? `<p class="muted">Telefon: ${esc(p.phone)}</p>` : ""}
    </div>
    <footer class="m-foot"><span class="spacer"></span>${can.structure() ? `<button type="button" class="btn" data-action="tg-invite" data-id="${esc(id)}">Telegram havolasi</button>` : ""}${can.editAtt(p) ? `<button type="button" class="btn" data-action="att-edit" data-id="${esc(id)}" data-date="${today}" data-preset="">Bugungi davomatni tuzatish</button>` : ""}${can.structure() ? `<button type="button" class="btn primary" data-action="edit-staff" data-id="${esc(id)}">Tahrirlash</button>` : `<button type="button" class="btn" data-action="close-modal">Yopish</button>`}</footer>
  </div>`, { type: "person", id });
}

/* ----- tasdiqlash ----- */
let confirmFn = null;
function confirmBox(title, text, okLabel, onOk) {
  showModal(`<form class="modal-form" data-form="confirm" novalidate>
    ${mHead(title)}
    <div class="m-body"><p style="margin:0">${esc(text)}</p></div>
    <footer class="m-foot"><span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal" autofocus>Bekor qilish</button><button type="submit" class="btn primary" style="background:var(--crit);color:#fff">${esc(okLabel)}</button></footer>
  </form>`, { type: "confirm" });
  confirmFn = onOk;
}

/* ----- bildirishnomalar ----- */
let notifOpen = false;
function notifData() {
  const role = myRole(), me = myStaffId(), myDept = myDeptId(), seen = seenAt(), today = todayStr(), self = actorId();
  if (S.conn !== "live") return { evs: [], unread: 0, alerts: [] };
  const evs = Object.values(S.activity).filter(e => e.by !== self)
    .filter(e => role === "rahbar" || (me && (e.to || []).includes(me)) || (role === "boshliq" && (e.dept || []).includes(myDept)))
    .sort((a, b) => String(b.t).localeCompare(String(a.t)));
  const unread = evs.filter(e => String(e.t) > seen).length;
  const alerts = [];
  const scope = tasks().filter(t => t.status !== "done" && (role === "rahbar" || (me && (t.ownerId === me || (t.staffIds || []).includes(me))) || (role === "boshliq" && hasDept(t, myDept))));
  scope.filter(t => stateOf(t) === "overdue").sort(byDue).slice(0, 5).forEach(t => alerts.push({ cls: "crit", txt: `Muddati o'tgan: «${t.title}» (${dueInfo(t).text})`, task: t.id }));
  scope.filter(t => t.due === today || t.due === addDays(today, 1)).slice(0, 5).forEach(t => alerts.push({ cls: "warn", txt: `${t.due === today ? "Bugun" : "Ertaga"} muddati tugaydi: «${t.title}»`, task: t.id }));
  if (role === "rahbar" || role === "boshliq") {
    const ds = role === "rahbar" ? deptsOrdered() : deptsOrdered().filter(d => d.id === myDept);
    let late = 0, absent = 0; ds.forEach(d => { const s = deptDay(d, today); late += s.late; absent += s.absent; });
    if (late || absent) alerts.push({ cls: "warn", txt: `Bugun ${role === "boshliq" ? "bo'limingizda " : ""}${late ? `${late} kishi kechikdi` : ""}${late && absent ? ", " : ""}${absent ? `${absent} kishi kelmadi` : ""}`, href: "#davomat" });
  }
  if (me && nizom()) {
    const st = ackState(me);
    if (st.nz === "none" || st.nz === "old") alerts.push({ cls: "warn", txt: st.nz === "old" ? "Nizom yangilandi: qayta o'qib tasdiqlang" : "Kompaniya nizomi bilan tanishing", href: "#nizom", nz: "nizom" });
    if (st.ps === "none" || st.ps === "old") alerts.push({ cls: "warn", txt: st.ps === "old" ? "Lavozim yo'riqnomangiz yangilandi" : "Lavozim yo'riqnomangiz bilan tanishing", href: "#nizom", nz: "lavozim" });
  }
  if ((role === "rahbar" || role === "boshliq") && nizom()) {
    const n = allStaff().filter(p => (role === "rahbar" || p.deptId === myDept) && ackState(p.id).nz !== "ok").length;
    if (n) alerts.push({ cls: "warn", txt: `${n} xodim nizomning oxirgi tahririni tasdiqlamagan`, href: "#nizom", nz: "holat" });
  }
  if (role === "rahbar") { const n = tasks().filter(t => t.status !== "done" && !S.org.staff[t.ownerId]).length; if (n) alerts.push({ cls: "warn", txt: `${n} ta faol taskning mas'uli yo'q`, href: "#tasklar" }); }
  return { evs: evs.slice(0, 30), unread, alerts };
}
function renderNotif() {
  const box = $("#notif"); if (!box) return;
  const { evs, alerts } = notifData(), seen = seenAt();
  box.innerHTML = `<div class="np-head"><h3>Bildirishnomalar</h3><button type="button" class="icon-btn sm" data-action="close-notif" aria-label="Yopish">×</button></div>
    ${alerts.length ? `<div class="np-sec"><h4>Diqqat talab qiladi</h4><ul class="alerts">${alerts.map(a => `<li class="${a.cls}">${a.task ? `<button type="button" class="link-plain" data-action="open-task" data-id="${esc(a.task)}">${esc(a.txt)}</button>` : a.href ? `<a href="${a.href}" data-action="close-notif"${a.nz ? ` data-nz="${a.nz}"` : ""}>${esc(a.txt)}</a>` : esc(a.txt)}</li>`).join("")}</ul></div>` : ""}
    <div class="np-sec"><h4>Yangiliklar</h4>${evs.length ? `<ul class="feed">${evs.map(e => activityItem(e, String(e.t) > seen)).join("")}</ul>` : `<p class="muted">Sizga tegishli yangilik yo'q.</p>`}</div>
    ${myRole() === "mehmon" ? `<p class="hint">Shaxsiy bildirishnomalar uchun rahbar hisobingizni xodim kartangizga bog'lashi kerak.</p>` : ""}`;
}
function toggleNotif(force) {
  notifOpen = force != null ? force : !notifOpen;
  const box = $("#notif"), btn = $("#bell");
  box.hidden = !notifOpen; if (btn) btn.setAttribute("aria-expanded", String(notifOpen));
  if (notifOpen) { renderNotif(); clearTimeout(toggleNotif.t); toggleNotif.t = setTimeout(() => { markSeen(); renderChrome(); }, 1500); }
}

/* ----- tezkor qidiruv (⌘K) ----- */
const spot = document.getElementById("spot");
let spotItems = [], spotIdx = 0;
function openSpot() {
  spot.innerHTML = `<div class="spot-box"><div class="spot-in"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><label class="sr" for="spot-q">Qidirish</label><input type="search" id="spot-q" placeholder="Xodim, bo'lim yoki task qidiring" autocomplete="off"><kbd>Esc</kbd></div><ul class="spot-res" id="spot-res" role="listbox"></ul></div>`;
  if (!spot.open) { try { spot.showModal(); } catch (e) { spot.setAttribute("open", ""); } }
  renderSpot(""); $("#spot-q").focus();
}
function closeSpot() { if (spot.open) { try { spot.close(); } catch (e) { spot.removeAttribute("open"); } } }
spot.addEventListener("click", e => { if (e.target === spot) closeSpot(); });
function renderSpot(q) {
  const nq = normQ(q).trim(), items = [];
  const acts = [["Dashboard", "#dashboard"], ["Davomat", "#davomat"], ["Tasklar", "#tasklar"], ["Nizom", "#nizom"], ["Sozlamalar", "#sozlamalar"]];
  if (!nq) {
    if (can.createTask()) items.push({ kind: "Amal", title: "Yangi task", run: () => openTaskModal(null) });
    if (can.kiosk()) items.push({ kind: "Amal", title: "Davomat terminalini ochish", run: () => { location.hash = "kiosk"; } });
    items.push({ kind: "Amal", title: "Bugun kechikkan va kelmaganlar", run: () => { S.attDate = todayStr(); S.attMode = "day"; S.attF.issues = true; location.hash = "davomat"; render(); } });
    acts.forEach(([t, h]) => items.push({ kind: "Sahifa", title: t, run: () => { location.hash = h.slice(1); } }));
  } else {
    allStaff().filter(p => normQ(`${p.name} ${p.role || ""}`).includes(nq)).slice(0, 8).forEach(p => { const a = attInfo(p, todayStr()); items.push({ kind: "Xodim", title: p.name, sub: `${p.role || ""} · ${getDept(p.deptId)?.name || ""} · ${a.label}`, dot: a.dot, run: () => openPerson(p.id) }); });
    deptsOrdered().filter(d => normQ(d.name).includes(nq)).slice(0, 5).forEach(d => items.push({ kind: "Bo'lim", title: d.name, sub: `${branchName(d.branch)} · ${staffOf(d.id).length} xodim`, run: () => { location.hash = "bolim-" + d.id; } }));
    positions().filter(x => normQ(`${x.title} ${x.summary || ""}`).includes(nq)).slice(0, 5).forEach(x => items.push({ kind: "Lavozim", title: x.title, sub: `${getDept(x.deptId)?.name || ""} · ${posHolders(x.id).length} xodim`, run: () => { S.nz.tab = "lavozim"; S.nz.pos = x.id; if (location.hash === "#nizom") render(); else location.hash = "nizom"; } }));
    tasks().filter(t => normQ(`${t.title} ${t.desc || ""}`).includes(nq)).sort(byDue).slice(0, 8).forEach(t => items.push({ kind: "Task", title: t.title, sub: `${STATE_LABEL[stateOf(t)]} · ${dueInfo(t).text}${t.ownerId ? ` · ${personName(t.ownerId)}` : ""}`, run: () => openTaskModal(t.id) }));
    acts.filter(([t]) => normQ(t).includes(nq)).forEach(([t, h]) => items.push({ kind: "Sahifa", title: t, run: () => { location.hash = h.slice(1); } }));
  }
  spotItems = items; spotIdx = 0;
  const box = $("#spot-res"); if (!box) return;
  box.innerHTML = items.length ? items.map((it, i) => `<li role="option" aria-selected="${i === 0}"><button type="button" class="spot-item${i === 0 ? " on" : ""}" data-action="spot-run" data-i="${i}"><span class="si-kind">${esc(it.kind)}</span><span class="si-main"><span class="si-title">${it.dot ? `<span class="dot dot-${it.dot}"></span>` : ""}<b>${esc(it.title)}</b></span>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span><span class="si-go">↵</span></button></li>`).join("") : `<li class="muted spot-empty">Hech narsa topilmadi</li>`;
}
function spotMove(dir) {
  if (!spotItems.length) return;
  spotIdx = (spotIdx + dir + spotItems.length) % spotItems.length;
  $$(".spot-item", spot).forEach((b, i) => { b.classList.toggle("on", i === spotIdx); b.parentElement.setAttribute("aria-selected", String(i === spotIdx)); if (i === spotIdx) b.scrollIntoView({ block: "nearest" }); });
}
function spotRun(i) { const it = spotItems[i]; if (!it) return; closeSpot(); it.run(); }
