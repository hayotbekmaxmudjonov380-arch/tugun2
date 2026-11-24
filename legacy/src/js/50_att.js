/* ----- Davomat ----- */
function viewAtt() {
  if (!S.loaded.org) return loadingBlock();
  const today = todayStr(), date = S.attDate || today, m = monthOf(date);
  const loaded = S.loaded["att:" + m];
  const isMonth = S.attMode === "month";
  const f = S.attF;
  const deptOpts = [`<option value="all">Barcha bo'limlar</option>`].concat(branches().map(b => `<optgroup label="${esc(b.name)}">${depts(b.id).map(d => `<option value="${esc(d.id)}"${f.dept === d.id ? " selected" : ""}>${esc(d.name)}</option>`).join("")}</optgroup>`)).join("");
  return `
  <div class="view-head"><h2>Davomat</h2><p>Xodimlar kirish eshigidagi terminalda PIN bilan belgilanadi. Qo'lda kiritilgan har bir vaqt sababi va muallifi bilan saqlanadi. Bo'lim ish vaqtidan ${settings().grace} daqiqagacha kechikish hisobga olinmaydi.</p></div>
  <div class="toolbar">
    <div class="date-nav"><button type="button" class="btn tiny" data-action="att-shift" data-dir="-1" aria-label="${isMonth ? "Oldingi oy" : "Oldingi kun"}">‹</button><label class="sr" for="att-date">Sana</label><input type="date" id="att-date" value="${esc(date)}" data-change="att-date"><button type="button" class="btn tiny" data-action="att-shift" data-dir="1" aria-label="${isMonth ? "Keyingi oy" : "Keyingi kun"}">›</button>${date !== today ? `<button type="button" class="btn tiny ghost" data-action="att-today">Bugun</button>` : ""}</div>
    <span class="date-label">${isMonth ? esc(fmtMonth(m)) : `${esc(WD_LONG[parseYmd(date).getDay()])}, ${esc(fmtDate(date))} ${parseYmd(date).getFullYear()}`}</span>
    <div class="seg" role="group" aria-label="Ko'rinish"><button type="button" data-action="att-mode" data-v="day" aria-pressed="${!isMonth}">Kunlik</button><button type="button" data-action="att-mode" data-v="month" aria-pressed="${isMonth}">Oylik hisobot</button></div>
    ${can.kiosk() ? `<a class="btn primary tiny" href="#kiosk" style="margin-left:auto">Terminalni ochish</a>` : ""}
  </div>
  <div class="toolbar sub-toolbar">
    <label class="sr" for="att-dept">Bo'lim</label><select id="att-dept" data-change="att-dept">${deptOpts}</select>
    <label class="sr" for="att-q">Xodim qidirish</label><input type="search" id="att-q" value="${esc(f.q)}" placeholder="Xodim ismi">
    ${isMonth ? "" : `<button type="button" class="btn tiny${f.issues ? " primary" : ""}" data-action="att-issues" aria-pressed="${f.issues}">Faqat e'tibor talab qiladiganlar</button>`}
  </div>
  <div id="att-results">${!loaded && S.conn === "live" ? loadingBlock() : isMonth ? attMonthHTML(m) : attDayHTML(date)}</div>`;
}
function attFilterPeople(ppl) {
  const f = S.attF, q = normQ(f.q).trim();
  return ppl.filter(p => !q || normQ(p.name + " " + (p.role || "")).includes(q));
}
function isIssue(a) { return ["late-in", "late", "absent", "noout", "early", "late-early"].includes(a.key) || a.src === "manual" || a.edits.length > 0; }
function attDayHTML(date) {
  const isToday = date === todayStr(), f = S.attF;
  const ds = deptsOrdered().filter(d => f.dept === "all" || d.id === f.dept);
  let came = 0, late = 0, absent = 0, inNow = 0, manual = 0, total = 0;
  const sections = [];
  ds.forEach(d => {
    const ppl = attFilterPeople(staffOf(d.id));
    const rows = [];
    ppl.forEach((p, i) => {
      const a = attInfo(p, date); total++;
      if (a.in) { came++; if (a.late) late++; if (!a.out && isToday) inNow++; } else if (a.key === "absent") absent++;
      if (a.src === "manual" || a.edits.length) manual++;
      if (f.issues && !isIssue(a)) return;
      rows.push(attRow(p, i, date, a, isToday));
    });
    if (!rows.length && (f.issues || f.q)) return;
    const s = deptDay(d, date), b = S.org.branches[d.branch];
    sections.push(`<section class="att-dept">
      <header class="att-head">
        <a class="dept-tab sm" href="#bolim-${esc(d.id)}">${esc(d.name)}</a>${b ? `<span class="branch-tag">${esc(b.name)}</span>` : ""}
        <span class="att-hours">Ish vaqti <b>${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</b></span>
        <span class="att-sum"><span>Keldi <b>${s.came}/${s.total}</b></span><span>Birinchi kelgan <b>${s.first || "—"}</b></span><span>Oxirgi ketgan <b>${s.last || "—"}</b></span>${s.late ? `<span class="warn-t">Kechikkan <b>${s.late}</b></span>` : ""}</span>
      </header>
      ${rows.length ? `<div class="table-scroll"><table class="att"><thead><tr><th scope="col">#</th><th scope="col">Xodim</th><th scope="col">Kelish</th><th scope="col">Ketish</th><th scope="col">Ishlagan</th><th scope="col">Holat</th><th scope="col">Manba</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>` : `<p class="muted" style="padding:12px 18px;margin:0">Bu bo'limda xodim yo'q.</p>`}
    </section>`);
  });
  const summary = `<section class="att-summary">${stat(`${came}/${total}`, "keldi")}${stat(late, "kechikdi", late ? "warn" : "")}${stat(absent, "kelmadi", absent ? "crit" : "")}${isToday ? stat(inNow, "hozir ishda") : ""}${stat(manual, "qo'lda tahrir")}</section>`;
  const note = isWorkday(date) ? "" : `<p class="note">Bu kun ish kuni sifatida belgilanmagan. Ish kunlarini Sozlamalarda o'zgartirish mumkin.</p>`;
  return summary + note + (sections.join("") || `<p class="note">Tanlangan shartlarga mos xodim topilmadi.</p>`);
}
function srcChip(a) {
  if (!a.in && !a.out) return `<span class="muted">—</span>`;
  const last = a.edits[a.edits.length - 1];
  const tip = last ? `${fmtDT(last.t)} · ${actorName(last.by)}: ${last.why}` : "";
  return `${a.src === "manual" ? `<span class="src manual" title="${esc(tip)}">Qo'lda</span>` : `<span class="src term">Terminal</span>`}${a.edits.length ? `<span class="src edited" title="${esc(tip)}">✎ ${a.edits.length}</span>` : ""}`;
}
function attRow(p, i, date, a, isToday) {
  const editable = can.editAtt(p);
  const cell = (field, v) => editable
    ? `<button type="button" class="clock-btn${v ? "" : " empty"}" data-action="att-edit" data-id="${esc(p.id)}" data-date="${esc(date)}" data-preset="${field}" aria-label="${esc(p.name)}: ${field === "in" ? "kelish" : "ketish"} vaqtini tahrirlash">${esc(v || "—")}</button>`
    : `<span class="clock-txt">${esc(v || "—")}</span>`;
  return `<tr>
    <td class="muted">${i + 1}</td>
    <td><button type="button" class="link nm" data-action="open-person" data-id="${esc(p.id)}">${esc(p.name)}</button>${p.role ? `<div class="sub">${esc(p.role)}</div>` : ""}</td>
    <td>${cell("in", a.in)}</td>
    <td>${cell("out", a.out)}</td>
    <td class="mono">${a.worked != null ? `${fmtDur(a.worked)}${a.live ? `<div class="sub">hozirgacha</div>` : ""}` : "—"}</td>
    <td><span class="status t-${a.tone}"><span class="dot dot-${a.dot}"></span>${esc(a.label)}</span></td>
    <td class="src-cell">${srcChip(a)}</td>
  </tr>`;
}
function attMonthHTML(m) {
  const today = todayStr(); const [y, mo] = m.split("-").map(Number); const last = new Date(y, mo, 0).getDate();
  const days = []; for (let d = 1; d <= last; d++) { const ds = `${m}-${pad(d)}`; if (ds > today) break; days.push(ds); }
  if (!days.length) return `<p class="note">Bu oy hali boshlanmagan.</p>`;
  const work = days.filter(isWorkday);
  const avg = arr => arr.length ? fromMin(Math.round(arr.reduce((x, y) => x + y, 0) / arr.length)) : "—";
  const f = S.attF;
  const rowsHTML = [];
  deptsOrdered().filter(d => f.dept === "all" || d.id === f.dept).forEach(d => {
    const ppl = attFilterPeople(staffOf(d.id)); if (!ppl.length) return;
    const stats = ppl.map(p => {
      let present = 0, absent = 0, lateN = 0, total = 0, manual = 0; const ins = [], outs = [];
      days.forEach(ds => {
        const a = attInfo(p, ds); const i = toMin(a.in), o = toMin(a.out);
        if (i != null) { present++; ins.push(i); if (a.late) lateN++; }
        if (a.key === "absent") absent++;
        if (i != null && o != null) { total += Math.max(0, o - i); outs.push(o); }
        if (a.src === "manual" || a.edits.length) manual++;
      });
      return { p, present, absent, lateN, total, manual, ins, outs };
    });
    const sum = k => stats.reduce((x, s) => x + s[k], 0);
    const b = S.org.branches[d.branch];
    rowsHTML.push(`<tr class="grp"><td>${esc(d.name)} ${b ? `<span class="branch-tag" style="margin-left:6px">${esc(b.name)}</span>` : ""} <span class="muted" style="font-weight:500;font-size:12.5px;margin-left:6px">${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</span></td><td class="num">${sum("present")} / ${work.length * ppl.length}</td><td class="num">${sum("absent") || "—"}</td><td class="num">${sum("lateN") || "—"}</td><td class="num">${sum("manual") || "—"}</td><td class="num">${fmtDur(sum("total"))}</td><td class="num">${avg(stats.flatMap(s => s.ins))}</td><td class="num">${avg(stats.flatMap(s => s.outs))}</td></tr>`);
    stats.forEach(s => rowsHTML.push(`<tr><td><button type="button" class="link nm" data-action="open-person" data-id="${esc(s.p.id)}">${esc(s.p.name)}</button>${s.p.role ? `<div class="sub">${esc(s.p.role)}</div>` : ""}</td><td class="num">${s.present} / ${work.length}</td><td class="num">${s.absent || "—"}</td><td class="num">${s.lateN || "—"}</td><td class="num">${s.manual ? `<span class="src manual">${s.manual}</span>` : "—"}</td><td class="num">${fmtDur(s.total)}</td><td class="num">${avg(s.ins)}</td><td class="num">${avg(s.outs)}</td></tr>`));
  });
  return `<p class="muted" style="margin:0 0 10px">${esc(fmtMonth(m))}: ${days.length} kun hisobga olindi, shundan ${work.length} tasi ish kuni. «Qo'lda» ustuni terminaldan emas, qo'lda kiritilgan yoki tuzatilgan kunlar soni.</p>
  <div class="report-wrap" id="report-scroll" data-keep-scroll><table class="report"><thead><tr><th scope="col">Bo'lim / xodim</th><th scope="col" class="num">Kelgan kunlar</th><th scope="col" class="num">Kelmagan</th><th scope="col" class="num">Kechikishlar</th><th scope="col" class="num">Qo'lda</th><th scope="col" class="num">Jami ishlagan</th><th scope="col" class="num">O'rtacha kelish</th><th scope="col" class="num">O'rtacha ketish</th></tr></thead><tbody>${rowsHTML.join("") || `<tr><td colspan="8" class="muted">Xodimlar topilmadi.</td></tr>`}</tbody></table></div>`;
}

/* ----- davomatni qo'lda tahrirlash (sabab majburiy) ----- */
function openAttModal(pid, date, preset) {
  const p = getPerson(pid); if (!p) return;
  if (!can.editAtt(p)) { toast("Bu xodimning davomatini tahrirlash huquqingiz yo'q", "crit"); return; }
  const r = rec(date, pid) || {};
  let inV = r.in || "", outV = r.out || "";
  if (date === todayStr()) { if (preset === "in" && !inV) inV = nowHM(); if (preset === "out" && !outV && inV) outV = nowHM(); }
  const edits = editsOf(r).slice().reverse();
  showModal(`<form class="modal-form" data-form="att" data-id="${esc(pid)}" data-date="${esc(date)}" novalidate>
    ${mHead("Davomatni tahrirlash")}
    <div class="m-body">
      <div class="who-row">${avatar(p)}<span><b>${esc(p.name)}</b><small>${esc(getDept(p.deptId)?.name || "")} · ${esc(WD_LONG[parseYmd(date).getDay()])}, ${esc(fmtDate(date))}</small></span></div>
      <div class="field-row">
        <label class="field"><span>Kelish vaqti (SS:DD)</span><input type="text" id="a-in" class="big-time" inputmode="numeric" maxlength="5" placeholder="--:--" value="${esc(inV)}" autocomplete="off"${preset === "out" ? "" : " autofocus"}></label>
        <label class="field"><span>Ketish vaqti (SS:DD)</span><input type="text" id="a-out" class="big-time" inputmode="numeric" maxlength="5" placeholder="--:--" value="${esc(outV)}" autocomplete="off"${preset === "out" ? " autofocus" : ""}></label>
      </div>
      <label class="field"><span>Sabab (majburiy)</span><select id="a-why">${ATT_REASONS.map(x => `<option>${esc(x)}</option>`).join("")}</select></label>
      <label class="field"><span>Izoh</span><input type="text" id="a-note" maxlength="140" placeholder="Masalan: obyektda edi, 08:10 da yetib kelgan"></label>
      <p class="hint">Qo'lda kiritilgan vaqt jadvalda «Qo'lda» belgisi bilan ko'rinadi. Kim, qachon va nima uchun o'zgartirgani tarixda saqlanadi.</p>
      ${edits.length ? `<div class="edit-log"><h4>O'zgarishlar tarixi</h4><ul>${edits.map(e => `<li><span class="muted">${esc(fmtDT(e.t))}</span> <b>${esc(actorName(e.by))}</b>: ${esc(e.prev?.in || "—")}–${esc(e.prev?.out || "—")} → ${esc(e.next?.in || "—")}–${esc(e.next?.out || "—")} <i>«${esc(e.why || "")}»</i></li>`).join("")}</ul></div>` : ""}
      <p class="m-error" role="alert"></p>
    </div>
    <footer class="m-foot"><span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal">Bekor qilish</button><button type="submit" class="btn primary">Saqlash</button></footer>
  </form>`);
}
async function saveAtt(form) {
  const pid = form.dataset.id, date = form.dataset.date, p = getPerson(pid); if (!p) return;
  const r = rec(date, pid) || {};
  const inV = normTime($("#a-in", dlg).value), outV = normTime($("#a-out", dlg).value);
  if (inV === null || outV === null) return setErr("Vaqtni SS:DD ko'rinishida yozing, masalan 08:45.");
  if (!inV && outV) return setErr("Avval kelish vaqtini kiriting.");
  if (inV && outV && toMin(outV) <= toMin(inV)) return setErr("Ketish vaqti kelish vaqtidan keyin bo'lishi kerak.");
  const reason = $("#a-why", dlg).value, note = $("#a-note", dlg).value.trim();
  if (reason === "Boshqa sabab" && !note) return setErr("«Boshqa sabab» tanlansa, izohni yozing.");
  const prev = { in: r.in || "", out: r.out || "" }, next = { in: inV, out: outV };
  if (prev.in === next.in && prev.out === next.out) { closeModal(); return; }
  const why = note ? `${reason}: ${note}` : reason;
  const f = prev.in !== next.in && prev.out !== next.out ? "both" : prev.in !== next.in ? "in" : "out";
  const ok = await setAttRec(pid, date, { in: next.in, out: next.out, src: "manual", edits: { [uid("e")]: { t: iso(), by: actorId(), f, prev, next, why } } });
  if (!ok) return;
  logEvent({ k: "att", txt: `${p.name} davomatini tuzatdi (${fmtDate(date)}): ${why}`, to: [pid], dept: [p.deptId] });
  closeModal(); toast("Davomat saqlandi, o'zgarish tarixga yozildi");
}

/* ----- Davomat terminali (kiosk) ----- */
const K = { pin: "", fails: 0, lockUntil: 0, msg: null, timer: 0, shake: false, exit: false };
const isManager = id => S.org.staff[id]?.access === "rahbar" || !!idx().headOf[id];
/* Planshetdagi terminaldan faqat rahbar yoki bo'lim boshlig'i PIN'i bilan chiqiladi:
   terminal hisobi «Editor» bo'lgani uchun uni tasodifiy odam ochib qo'ymasligi kerak. */
function kioskExit() {
  const pins = (S.pins && S.pins.pins) || {};
  const mgr = Object.keys(pins).some(id => pins[id] && S.org.staff[id] && isManager(id));
  if (!mgr) { location.hash = "davomat"; return; }
  K.exit = true; K.pin = ""; K.err = ""; K.msg = null; render();
}
function viewKiosk() {
  if (!S.loaded.org) return loadingBlock();
  const now = new Date();
  const top = `<div class="k-top"><span class="k-brand">${brandMark(26)}<b>Tugun</b><span>Davomat terminali</span></span>${K.exit ? "" : `<button type="button" class="btn tiny" data-action="kiosk-exit">Terminaldan chiqish</button>`}</div>`;
  if (!can.kiosk()) return `<div class="kiosk">${top}<div class="k-panel"><h2>Terminal yopiq</h2><p>Terminalni rahbar yoki «Editor» huquqli maxsus hisob ochadi.</p></div></div>`;
  const pins = S.pins;
  if (!pins || !pins.salt || !Object.keys(pins.pins || {}).length) return `<div class="kiosk">${top}<div class="k-panel"><h2>PIN'lar hali o'rnatilmagan</h2><p>Sozlamalarda har bir xodim kartasini ochib, unga PIN kod bering. Keyin terminal ishga tushadi.</p><a class="btn primary" href="#sozlamalar">Sozlamalarga o'tish</a></div></div>`;
  const len = pins.len || settings().pinLen;
  const locked = Date.now() < K.lockUntil;
  let panel;
  if (K.msg) {
    const m = K.msg;
    const icon = { in: "✓", out: "↗", err: "!" }[m.type] || "i";
    panel = `<div class="k-result ${m.type}" role="status"><span class="k-icon" aria-hidden="true">${icon}</span><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p>${m.sub ? `<p class="k-sub ${m.subCls || ""}">${esc(m.sub)}</p>` : ""}</div>`;
  } else {
    const dots = Array.from({ length: len }, (_, i) => `<i class="${i < K.pin.length ? "on" : ""}"></i>`).join("");
    const keys = ["1","2","3","4","5","6","7","8","9","del","0","ok"].map(k => k === "del" ? `<button type="button" class="k-key fn" data-action="k-key" data-k="del" aria-label="O'chirish">⌫</button>` : k === "ok" ? `<button type="button" class="k-key fn ok" data-action="k-key" data-k="ok" aria-label="Tasdiqlash">✓</button>` : `<button type="button" class="k-key" data-action="k-key" data-k="${k}">${k}</button>`).join("");
    panel = `<div class="k-pad${K.shake ? " shake" : ""}${K.busy ? " busy" : ""}${K.exit ? " exit" : ""}"><h2>${locked ? "Biroz kuting" : K.busy ? "Saqlanmoqda…" : K.exit ? "Chiqish uchun rahbar yoki bo'lim boshlig'i PIN'i" : "PIN kodingizni kiriting"}</h2><p class="k-err">${locked ? `Ko'p marta noto'g'ri kiritildi. ${Math.ceil((K.lockUntil - Date.now()) / 1000)} soniyadan keyin qayta urining.` : esc(K.err || "")}</p><div class="k-dots" aria-label="${K.pin.length} ta raqam kiritildi">${dots}</div><div class="k-keys">${keys}</div>${K.exit ? `<button type="button" class="btn ghost k-cancel" data-action="kiosk-exit-cancel">Bekor qilish</button>` : ""}</div>`;
  }
  const demo = pins.demo ? `<p class="k-hint">Namuna rejimi: xodimlar PIN'i 1001 dan boshlab tartib bilan (masalan, ${esc(allStaff()[0]?.name || "birinchi xodim")}: 1001).</p>` : "";
  return `<div class="kiosk">${top}
    <div class="k-clock" id="k-clock">${pad(now.getHours())}:${pad(now.getMinutes())}<span>:${pad(now.getSeconds())}</span></div>
    <div class="k-date">${esc(WD_LONG[now.getDay()])}, ${esc(fmtDate(todayStr()))}</div>
    <div class="k-panel">${panel}</div>${demo}
  </div>`;
}
function kioskKey(k) {
  if (S.view !== "kiosk" || K.msg || K.busy) return;
  if (Date.now() < K.lockUntil) return;
  const len = (S.pins && S.pins.len) || settings().pinLen;
  K.err = ""; K.shake = false;
  clearTimeout(K.idle);
  if (k === "del") K.pin = K.pin.slice(0, -1);
  else if (k === "ok") { if (K.pin.length >= 4) { kioskSubmit(); return; } }
  else if (/^\d$/.test(k) && K.pin.length < len) { K.pin += k; if (K.pin.length === len) { render(); setTimeout(kioskSubmit, 120); return; } }
  // yarim terilgan PIN 15 soniyadan keyin o'chadi, keyingi odam boshidan teradi
  if (K.pin) K.idle = setTimeout(() => { K.pin = ""; if (S.view === "kiosk") render(); }, 15000);
  render();
}
async function kioskSubmit() {
  const pins = S.pins; if (!pins || K.busy) return;
  const h = pinHash(pins.salt, K.pin);
  const pid = Object.keys(pins.pins || {}).find(id => pins.pins[id] === h && S.org.staff[id]);
  K.pin = "";
  clearTimeout(K.timer); clearTimeout(K.idle);
  if (K.exit) {
    if (pid && isManager(pid)) { K.exit = false; K.fails = 0; location.hash = "davomat"; return; }
    K.fails++; K.shake = true; K.err = "Bu PIN bilan terminaldan chiqib bo'lmaydi.";
    if (K.fails >= 5) { K.lockUntil = Date.now() + 30000; K.fails = 0; setTimeout(render, 30200); }
    render(); return;
  }
  if (!pid) {
    K.fails++; K.shake = true; K.err = "PIN noto'g'ri. Qayta urinib ko'ring.";
    if (K.fails >= 5) { K.lockUntil = Date.now() + 30000; K.fails = 0; setTimeout(render, 30200); }
    render(); return;
  }
  K.fails = 0;
  const p = getPerson(pid), today = todayStr(), r = rec(today, pid) || {}, t = nowHM();
  const d = getDept(p.deptId) || {};
  const first = p.name.split(/\s+/)[0];
  let msg, write = null;
  if (!r.in) {
    write = { in: t, src: "kiosk" };
    const late = toMin(t) - (toMin(d.workStart) ?? 540);
    msg = { type: "in", title: `Xush kelibsiz, ${first}!`, text: `Kelish vaqti: ${t}`, sub: late > settings().grace ? `${late < 60 ? late + " daqiqa" : fmtDur(late)} kechikdingiz` : "O'z vaqtida. Yaxshi ish kuni!", subCls: late > settings().grace ? "warn" : "ok" };
  } else if (!r.out) {
    if (toMin(t) - toMin(r.in) < 5) msg = { type: "info", title: `${first}, siz hozirgina keldingiz`, text: `Kelish ${r.in} da belgilangan. Ketishda PIN'ni qayta kiriting.` };
    else {
      write = { out: t };
      msg = { type: "out", title: `Xayr, ${first}!`, text: `Ketish vaqti: ${t}`, sub: `Bugun ${fmtDur(toMin(t) - toMin(r.in))} ishladingiz` };
    }
  } else msg = { type: "info", title: `${first}, bugungi kun yopilgan`, text: `Keldingiz ${r.in}, ketdingiz ${r.out}. Xatolik bo'lsa, bo'lim boshlig'iga ayting.` };
  if (write) {
    K.busy = true; render();
    const ok = await setAttRec(pid, today, write);
    K.busy = false;
    if (!ok) msg = { type: "err", title: "Saqlanmadi", text: "Vaqt yozilmadi. Internetni tekshirib, PIN'ni qayta kiriting yoki bo'lim boshlig'iga ayting." };
  }
  K.msg = msg;
  render();
  K.timer = setTimeout(() => { K.msg = null; render(); }, msg.type === "err" ? 6000 : 4200);
}
