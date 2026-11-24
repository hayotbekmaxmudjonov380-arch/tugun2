/* ================= Nizom: kompaniya nizomi, lavozim yo'riqnomalari, «Tanishdim» ================= */
const POS_FIELDS = [
  ["duties", "Asosiy vazifalar"],
  ["daily", "Kunlik tartib"],
  ["kpi", "Natija ko'rsatkichlari"],
  ["rights", "Huquqlari"],
  ["firstWeek", "Birinchi hafta"]
];
const nizom = () => S.docs.nizom || null;
const nizomV = () => num(nizom()?.v);
const nizomSecs = () => Object.entries(nizom()?.sections || {}).filter(([, x]) => x && typeof x === "object").map(([id, x]) => ({ ...x, id })).sort(byOrder);
const posMap = () => cleanMap(S.docs.pos);
const positions = () => Object.entries(posMap()).map(([id, p]) => ({ ...p, id })).sort(byOrder);
const posHolders = pid => allStaff().filter(p => p.posId === pid);
function ackId() { if (S.sandbox) { const s = myStaffId(); return s ? "sim-" + s : null; } return S.me.id || null; }
/* tasdiq faqat o'sha xodimning o'z hisobidan yozilgan bo'lsa haqiqiy hisoblanadi */
function ackOf(sid) {
  const p = S.org.staff[sid]; if (!p) return null;
  for (const [id, a] of Object.entries(S.acks)) {
    if (!a || a.staffId !== sid) continue;
    if (id.startsWith("demo-") ? a.demo : id.startsWith("sim-") ? S.sandbox : (!!p.userId && p.userId === id)) return a;
  }
  return null;
}
function ackState(sid) {
  const a = ackOf(sid), p = getPerson(sid), pos = p && p.posId ? posMap()[p.posId] : null;
  const nz = !nizom() ? "nodoc" : !a || !a.nizom ? "none" : num(a.nizom.v) >= nizomV() ? "ok" : "old";
  const ps = !pos ? "nopos" : !a || !a.pos || a.pos.id !== p.posId ? "none" : num(a.pos.v) >= num(pos.v) ? "ok" : "old";
  return { nz, ps, a };
}
const ACK_LABEL = { ok: "Tanishgan", old: "Yangi tahrir o'qilmagan", none: "Tanishmagan", nopos: "Lavozim biriktirilmagan", nodoc: "—" };
const ackChip = (st, t) => `<span class="ack ${st}" title="${esc(t ? fmtDT(t) : "")}">${st === "ok" ? "✓ " : ""}${ACK_LABEL[st]}</span>`;
can.docs = () => can.write() && myRole() === "rahbar" && (S.sandbox || S.canAdmin);

/* oddiy matn: bo'sh qator xatboshini ajratadi, «- » ro'yxat, «1. » raqamli ro'yxat */
function richText(text) {
  return String(text || "").trim().split(/\n\s*\n/).map(block => {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    let html = "", list = null, buf = [];
    const flushP = () => { if (buf.length) { html += `<p>${buf.map(esc).join("<br>")}</p>`; buf = []; } };
    const flushL = () => { if (list) { html += `<${list.tag}>${list.items.map(i => `<li>${esc(i)}</li>`).join("")}</${list.tag}>`; list = null; } };
    for (const l of lines) {
      const b = l.match(/^[-•]\s+(.*)$/), n = l.match(/^\d+[.)]\s+(.*)$/);
      const tag = b ? "ul" : n ? "ol" : null;
      if (tag) { flushP(); if (!list || list.tag !== tag) { flushL(); list = { tag, items: [] }; } list.items.push((b || n)[1]); }
      else { flushL(); buf.push(l); }
    }
    flushP(); flushL();
    return html;
  }).join("");
}

function viewNizom() {
  if (!S.loaded.org || !S.loaded.nizom) return loadingBlock();
  const role = myRole(), me = myStaffId();
  const tabs = [["nizom", "Kompaniya nizomi"], ["lavozim", "Lavozim yo'riqnomalari"]];
  if (role === "rahbar" || role === "boshliq") tabs.push(["holat", "Tanishuv holati"]);
  if (!tabs.some(t => t[0] === S.nz.tab)) S.nz.tab = "nizom";
  let mine = "";
  if (me) {
    const st = ackState(me), p = getPerson(me), pos = p.posId ? posMap()[p.posId] : null;
    mine = `<section class="nz-mine">
      <div><span class="dc-label">Sizning holatingiz</span><b>${esc(p.name)}</b><small>${pos ? esc(pos.title) : "Lavozim yo'riqnomasi hali biriktirilmagan"}</small></div>
      <div class="nz-mine-row"><span>Nizom</span>${ackChip(st.nz, st.a?.nizom?.t)}${st.nz !== "ok" && st.nz !== "nodoc" ? `<button type="button" class="btn primary tiny" data-action="nz-tab" data-v="nizom">O'qish</button>` : ""}</div>
      <div class="nz-mine-row"><span>Lavozim</span>${ackChip(st.ps, st.a?.pos?.t)}${st.ps === "none" || st.ps === "old" ? `<button type="button" class="btn primary tiny" data-action="nz-pos" data-id="${esc(p.posId)}">O'qish</button>` : ""}</div>
    </section>`;
  }
  const body = S.nz.tab === "lavozim" ? nzPositions() : S.nz.tab === "holat" ? nzStatus() : nzCharter();
  return `
  <div class="view-head"><h2>Nizom</h2><p>Kompaniyaning ichki qoidalari va har bir lavozimda nima qilinishi. Xodim o'qib, «Tanishdim» tugmasini bosadi. Matn o'zgarsa, qayta tasdiq so'raladi.</p></div>
  ${mine}
  <div class="toolbar"><div class="seg" role="group" aria-label="Nizom bo'limlari">${tabs.map(([k, l]) => `<button type="button" data-action="nz-tab" data-v="${k}" aria-pressed="${S.nz.tab === k}">${l}</button>`).join("")}</div></div>
  ${body}`;
}
function nzCharter() {
  const d = nizom(), secs = nizomSecs(), me = myStaffId(), ed = can.docs();
  if (!d || !secs.length) return `<div class="empty-state"><h2>Nizom hali kiritilmagan</h2><p>Bo'limlarni qo'shing: umumiy qoidalar, ish vaqti, javobgarlik va hokazo.</p>${ed ? `<div class="actions"><button type="button" class="btn primary" data-action="nz-sec" data-id="">+ Nizom bo'limi</button></div>` : ""}</div>`;
  const st = me ? ackState(me) : null;
  const approved = d.status === "Tasdiqlangan";
  return `<div class="nz-layout">
    <nav class="nz-toc" aria-label="Nizom mundarijasi">
      <span class="dc-label">Mundarija</span>
      <ol>${secs.map((s, i) => `<li><button type="button" class="link-plain" data-action="nz-goto" data-id="${esc(s.id)}"><span>${i + 1}.</span>${esc(s.title)}</button></li>`).join("")}</ol>
      ${ed ? `<button type="button" class="btn tiny" data-action="nz-sec" data-id="">+ Bo'lim qo'shish</button>` : ""}
    </nav>
    <article class="nz-doc">
      <header class="nz-head">
        <span class="nz-status ${approved ? "ok" : ""}">${approved ? "Tasdiqlangan" : "Loyiha"}</span>
        <h2>${esc(d.title || "Ichki nizom")}</h2>
        <p class="muted">${nizomV()}-tahrir · ${esc(fmtDT(d.updatedAt))}${d.by ? ` · ${esc(actorName(d.by))}` : ""}</p>
        ${ed ? `<div class="nz-tools"><button type="button" class="btn tiny" data-action="nz-approve">${approved ? "Loyihaga qaytarish" : "Tasdiqlangan deb belgilash"}</button></div>` : ""}
      </header>
      ${secs.map((s, i) => `<section class="nz-sec" id="nz-${esc(s.id)}">
        <h3><span class="nz-num">${i + 1}</span>${esc(s.title)}${ed ? `<button type="button" class="icon-btn sm" data-action="nz-sec" data-id="${esc(s.id)}" aria-label="${esc(s.title)}: tahrirlash">✎</button>` : ""}</h3>
        <div class="nz-body">${richText(s.body)}</div>
      </section>`).join("")}
      <footer class="nz-ack">${me ? (st.nz === "ok"
        ? `<span class="ack ok">✓ Siz ${esc(fmtDT(st.a.nizom.t))} da ${nizomV()}-tahrir bilan tanishgansiz</span>`
        : `<p>${st.nz === "old" ? "Nizom yangilandi. Yangi tahrirni o'qib, qayta tasdiqlang." : "Nizomni oxirigacha o'qib chiqdingizmi?"}</p><button type="button" class="btn primary" data-action="nz-ack" data-kind="nizom">Tanishdim, amal qilaman</button>`)
        : `<p class="muted">«Tanishdim» tugmasi xodim kartasiga bog'langan hisobda chiqadi.${S.sandbox ? " Sinov rejimida yuqoridan xodimni tanlang." : ""}</p>`}</footer>
    </article>
  </div>`;
}
function nzPositions() {
  const list = positions(), me = myStaffId(), ed = can.docs();
  const myPos = me ? getPerson(me).posId : null;
  const cur = (S.nz.pos && posMap()[S.nz.pos]) ? S.nz.pos : (myPos && posMap()[myPos]) ? myPos : list[0]?.id || null;
  const groups = deptsOrdered().map(d => ({ d, items: list.filter(p => p.deptId === d.id) })).filter(g => g.items.length);
  const orphan = list.filter(p => !S.org.departments[p.deptId]);
  const item = p => `<li><button type="button" class="pos-item${p.id === cur ? " on" : ""}" data-action="nz-pos" data-id="${esc(p.id)}"><span>${esc(p.title)}${p.id === myPos ? ` <small class="tag role">siz</small>` : ""}</span><small>${posHolders(p.id).length}</small></button></li>`;
  const toc = `<nav class="nz-toc" aria-label="Lavozimlar">
    <span class="dc-label">Lavozimlar · ${list.length}</span>
    ${groups.map(g => `<div class="pos-group"><span class="pg-name">${esc(g.d.name)}<small>${esc(branchName(g.d.branch))}</small></span><ul>${g.items.map(item).join("")}</ul></div>`).join("")}
    ${orphan.length ? `<div class="pos-group"><span class="pg-name">Bo'limsiz</span><ul>${orphan.map(item).join("")}</ul></div>` : ""}
    ${ed ? `<button type="button" class="btn tiny" data-action="nz-pos-edit" data-id="">+ Lavozim qo'shish</button>` : ""}
  </nav>`;
  const p = cur ? { ...posMap()[cur], id: cur } : null;
  if (!p) return `<div class="nz-layout">${toc}<article class="nz-doc"><p class="muted">Hali lavozim yo'riqnomasi yo'q.</p></article></div>`;
  const d = getDept(p.deptId), holders = posHolders(p.id), isMine = p.id === myPos;
  const st = isMine ? ackState(me) : null;
  return `<div class="nz-layout">${toc}
    <article class="nz-doc">
      <header class="nz-head">
        ${d ? `<span class="chip">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></span>` : ""}
        <h2>${esc(p.title)}</h2>
        <p class="nz-lead">${esc(p.summary || "")}</p>
        <p class="muted">${p.reportsTo ? `Bo'ysunadi: <b>${esc(p.reportsTo)}</b> · ` : ""}${num(p.v)}-tahrir · ${esc(fmtDT(p.updatedAt))}</p>
        ${ed ? `<div class="nz-tools"><button type="button" class="btn tiny" data-action="nz-pos-edit" data-id="${esc(p.id)}">Tahrirlash</button></div>` : ""}
      </header>
      <div class="pos-grid">${POS_FIELDS.map(([k, label]) => (p[k] || []).length ? `<section class="pos-block${k === "duties" ? " wide" : ""}${k === "firstWeek" ? " onboard" : ""}"><h4>${label}</h4>${k === "firstWeek" ? `<ol class="checks">${p[k].map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : `<ul>${p[k].map(x => `<li>${esc(x)}</li>`).join("")}</ul>`}</section>` : "").join("")}</div>
      <section class="pos-holders"><h4>Shu lavozimdagi xodimlar · ${holders.length}</h4>
        ${holders.length ? `<ul>${holders.map(h => { const s = ackState(h.id); return `<li><button type="button" class="owner-cell" data-action="open-person" data-id="${esc(h.id)}">${avatar(h, "sm")}<span><b>${esc(h.name)}</b><small>${esc(getDept(h.deptId)?.name || "")}</small></span></button>${ackChip(s.ps, s.a?.pos?.t)}</li>`; }).join("")}</ul>` : `<p class="muted">Hali hech kim biriktirilmagan. Xodim kartasida «Lavozim yo'riqnomasi»ni tanlang.</p>`}
      </section>
      ${isMine ? `<footer class="nz-ack">${st.ps === "ok" ? `<span class="ack ok">✓ Siz ${esc(fmtDT(st.a.pos.t))} da tanishgansiz</span>` : `<p>${st.ps === "old" ? "Yo'riqnomangiz yangilandi. Qayta o'qib tasdiqlang." : "Bu sizning lavozim yo'riqnomangiz."}</p><button type="button" class="btn primary" data-action="nz-ack" data-kind="pos">Tanishdim, bajaraman</button>`}</footer>` : ""}
    </article>
  </div>`;
}
function nzStatus() {
  const role = myRole(), md = myDeptId();
  const ppl = allStaff().filter(p => role === "rahbar" || p.deptId === md);
  const rows = ppl.map(p => ({ p, s: ackState(p.id) }));
  const okN = rows.filter(r => r.s.nz === "ok").length, okP = rows.filter(r => r.s.ps === "ok").length, noPos = rows.filter(r => r.s.ps === "nopos").length;
  const order = { none: 0, old: 1, nopos: 2, ok: 3, nodoc: 4 };
  rows.sort((a, b) => (order[a.s.nz] + order[a.s.ps]) - (order[b.s.nz] + order[b.s.ps]) || String(a.p.name).localeCompare(String(b.p.name)));
  return `<section class="att-summary">${stat(`${okN}/${rows.length}`, "nizom bilan tanishgan")}${stat(`${okP}/${rows.length - noPos}`, "lavozim bilan tanishgan")}${stat(rows.length - okN, "nizomni kutyapti", rows.length - okN ? "warn" : "")}${stat(noPos, "lavozimsiz", noPos ? "warn" : "")}</section>
  <div class="table-wrap"><table class="tasks"><thead><tr><th>Xodim</th><th>Lavozim yo'riqnomasi</th><th>Nizom</th><th>Lavozim</th></tr></thead><tbody>
  ${rows.map(({ p, s }) => { const pos = p.posId ? posMap()[p.posId] : null; return `<tr>
    <td><button type="button" class="owner-cell" data-action="open-person" data-id="${esc(p.id)}">${avatar(p, "sm")}<span><b>${esc(p.name)}</b><small>${esc(getDept(p.deptId)?.name || "")} · ${esc(branchName(getDept(p.deptId)?.branch))}</small></span></button></td>
    <td>${pos ? `<button type="button" class="link" data-action="nz-pos" data-id="${esc(p.posId)}">${esc(pos.title)}</button>` : can.structure() ? `<button type="button" class="btn tiny" data-action="edit-staff" data-id="${esc(p.id)}">Biriktirish</button>` : `<span class="muted">—</span>`}</td>
    <td>${ackChip(s.nz, s.a?.nizom?.t)}</td><td>${ackChip(s.ps, s.a?.pos?.t)}</td></tr>`; }).join("")}
  </tbody></table></div>
  <p class="hint" style="margin-top:12px">Tasdiq faqat xodimning o'z hisobidan qabul qilinadi: boshqa odam uning nomidan «Tanishdim» bosa olmaydi.</p>`;
}

async function nzAck(kind) {
  const sid = myStaffId(), id = ackId(); if (!sid || !id) return;
  const p = getPerson(sid), now = iso(), patch = { staffId: sid };
  if (kind === "nizom") patch.nizom = { v: nizomV(), t: now };
  else { const pos = posMap()[p.posId]; if (!pos) return; patch.pos = { id: p.posId, v: num(pos.v), t: now }; }
  if (await dbUpdate(`acks/${id}`, patch, () => ({ staffId: sid }))) {
    logEvent({ k: "ack", txt: kind === "nizom" ? "nizom bilan tanishganini tasdiqladi" : "lavozim yo'riqnomasi bilan tanishganini tasdiqladi", to: [], dept: [p.deptId] });
    toast("Rahmat, tasdiqlandi");
  }
}
const docBase = () => ({ title: "Ichki nizom", status: "Loyiha", v: 0, sections: {} });
function openSecModal(id) {
  if (!can.docs()) return;
  const s = id ? nizom()?.sections?.[id] : null;
  showModal(`<form class="modal-form wide" data-form="nz-sec" data-id="${esc(id || "")}" novalidate>
    ${mHead(id ? "Nizom bo'limini tahrirlash" : "Yangi nizom bo'limi", "Saqlansa nizom yangi tahrirga o'tadi va xodimlardan qayta tasdiq so'raladi.")}
    <div class="m-body">
      <label class="field"><span>Sarlavha</span><input type="text" id="nz-title" maxlength="80" value="${esc(s?.title || "")}" autofocus></label>
      <label class="field"><span>Matn</span><textarea id="nz-text" rows="14" maxlength="6000">${esc(s?.body || "")}</textarea></label>
      <p class="hint">Bo'sh qator yangi xatboshi. «- » bilan boshlangan qatorlar ro'yxat, «1. » bilan boshlanganlari raqamli ro'yxat bo'ladi.</p>
      <p class="m-error" role="alert"></p>
    </div>
    <footer class="m-foot">${id ? `<button type="button" class="btn danger ghost" data-action="nz-sec-del" data-id="${esc(id)}">O'chirish</button>` : ""}<span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal">Bekor qilish</button><button type="submit" class="btn primary">Saqlash</button></footer>
  </form>`, { type: "nz" });
}
async function saveSec(form) {
  const id = form.dataset.id || uid("s"), title = $("#nz-title", dlg).value.trim(), body = $("#nz-text", dlg).value.trim();
  if (!title) return setErr("Sarlavhani yozing.");
  if (!body) return setErr("Matnni yozing.");
  const old = nizom()?.sections?.[id];
  if (old && old.title === title && old.body === body) { closeModal(); return; }
  const order = old ? num(old.order) : nizomSecs().reduce((m, x) => Math.max(m, num(x.order)), 0) + 1;
  const nv = nizomV() + 1;
  const ok = await dbUpdate("docs/nizom", { sections: { [id]: { title, body, order } }, v: nv, updatedAt: iso(), by: actorId() }, docBase);
  if (ok) { closeModal(); toast(`Nizom ${nv}-tahrirga o'tdi`); logEvent({ k: "nizom", txt: `nizomni yangiladi: «${title}»`, to: allStaff().map(p => p.id), dept: [] }); }
}
function openPosModal(id) {
  if (!can.docs()) return;
  const p = id ? posMap()[id] : null;
  const ta = (k, rows) => `<label class="field"><span>${POS_FIELDS.find(f => f[0] === k)[1]} <small>har bir band alohida qatorda</small></span><textarea id="pf-${k}" rows="${rows}" maxlength="3000">${esc((p?.[k] || []).join("\n"))}</textarea></label>`;
  showModal(`<form class="modal-form wide" data-form="nz-pos" data-id="${esc(id || "")}" novalidate>
    ${mHead(id ? "Lavozim yo'riqnomasini tahrirlash" : "Yangi lavozim yo'riqnomasi", "Saqlansa yo'riqnoma yangi tahrirga o'tadi va shu lavozimdagilardan qayta tasdiq so'raladi.")}
    <div class="m-body">
      <div class="field-row">
        <label class="field"><span>Lavozim nomi</span><input type="text" id="pf-title" maxlength="80" value="${esc(p?.title || "")}" autofocus></label>
        <label class="field"><span>Bo'lim</span><select id="pf-dept">${deptsOrdered().map(d => `<option value="${esc(d.id)}"${p?.deptId === d.id ? " selected" : ""}>${esc(d.name)} (${esc(branchName(d.branch))})</option>`).join("")}</select></label>
      </div>
      <label class="field"><span>Kimga bo'ysunadi</span><input type="text" id="pf-reports" maxlength="80" value="${esc(p?.reportsTo || "")}" placeholder="Masalan: B2B savdo bo'limi boshlig'i"></label>
      <label class="field"><span>Qisqacha mazmuni</span><textarea id="pf-summary" rows="2" maxlength="400">${esc(p?.summary || "")}</textarea></label>
      ${ta("duties", 6)}
      <div class="field-row">${ta("daily", 4)}${ta("kpi", 4)}</div>
      <div class="field-row">${ta("rights", 3)}${ta("firstWeek", 4)}</div>
      <p class="m-error" role="alert"></p>
    </div>
    <footer class="m-foot">${id ? `<button type="button" class="btn danger ghost" data-action="nz-pos-del" data-id="${esc(id)}">O'chirish</button>` : ""}<span class="spacer"></span><button type="button" class="btn ghost" data-action="close-modal">Bekor qilish</button><button type="submit" class="btn primary">Saqlash</button></footer>
  </form>`, { type: "nz" });
}
async function savePos(form) {
  const id = form.dataset.id || uid("p-"), old = form.dataset.id ? posMap()[id] : null;
  const lines = k => $(`#pf-${k}`, dlg).value.split("\n").map(x => x.replace(/^[-•\d.)\s]+/, "").trim()).filter(Boolean);
  const data = { title: $("#pf-title", dlg).value.trim(), deptId: $("#pf-dept", dlg).value, reportsTo: $("#pf-reports", dlg).value.trim(), summary: $("#pf-summary", dlg).value.trim() };
  POS_FIELDS.forEach(([k]) => { data[k] = lines(k); });
  if (!data.title) return setErr("Lavozim nomini yozing.");
  if (!data.duties.length) return setErr("Kamida bitta asosiy vazifani yozing.");
  if (old && JSON.stringify(["title", "deptId", "reportsTo", "summary", ...POS_FIELDS.map(f => f[0])].map(k => old[k] ?? "")) === JSON.stringify(["title", "deptId", "reportsTo", "summary", ...POS_FIELDS.map(f => f[0])].map(k => data[k] ?? ""))) { closeModal(); return; }
  const order = old ? num(old.order) : positions().reduce((m, x) => Math.max(m, num(x.order)), 0) + 1;
  const ok = await dbUpdate("docs/lavozimlar", { pos: { [id]: { ...data, order, v: num(old?.v) + 1, updatedAt: iso() } } }, () => ({ pos: {} }));
  if (ok) { closeModal(); S.nz.pos = id; S.nz.tab = "lavozim"; toast(old ? "Yo'riqnoma yangilandi" : "Lavozim qo'shildi"); if (old) logEvent({ k: "nizom", txt: `lavozim yo'riqnomasini yangiladi: «${data.title}»`, to: posHolders(id).map(p => p.id), dept: [data.deptId] }); schedule(); }
}
