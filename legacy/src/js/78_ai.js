/* ================= Nizom bo'yicha ijrochi tavsiyasi =================
   Ikki qatlam:
   1) Ma'no: Claude task matnini lavozim yo'riqnomalari bilan solishtiradi va LAVOZIMLARNI tanlaydi
      (mas'ul lavozim, yordamchi lavozimlar, qaysi band asos, yo'riqnomalardagi bo'shliq).
   2) Odam: dastur o'zi har bir lavozimdan aniq XODIMNI tanlaydi: yuklama, muddati o'tgan tasklar,
      bugungi davomat va ketma-ket kelmaslik hisobga olinadi. Shaxsiy ma'lumot Claude'ga yuborilmaydi.
   Claude mavjud bo'lmasa, kalit so'zlar bo'yicha zaxira moslik ishlaydi. */
const LOAD_MAX = 5;
const AI_STEPS = ["Vazifa mazmuni tahlil qilinmoqda…", "Lavozim yo'riqnomalari bilan solishtirilmoqda…", "Yuklama va davomat tekshirilmoqda…", "Eng mos odamlar tanlanmoqda…"];
const AI_ERR = {
  rate_limited: "Juda ko'p so'rov yuborildi. Bir daqiqadan keyin qayta urining.",
  session_expired: "Claude seansi tugagan. Sahifani yangilab, qayta kiring.",
  invalid_json: "Claude javobini o'qib bo'lmadi. Qayta tahlil qiling.",
  empty_completion: "Claude javob bermadi. Tavsifni aniqroq yozib, qayta urining.",
  refused: "Claude bu matnni tahlil qilmadi. Tavsifni o'zgartirib ko'ring.",
  prompt_too_large: "Yo'riqnomalar juda katta. Ularni qisqartiring."
};
const AI_OFF_CODES = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];

/* ----- xodim signallari: yuklama, davomat, uzoq kelmaslik ----- */
function recordedDay(d) {
  // davomat o'sha kuni umuman yuritilganmi (bayram yoki terminal ishlatilmagan kunlar hisobga olinmaydi)
  const ppl = allStaff(); if (!ppl.length) return false;
  const came = ppl.filter(p => rec(d, p.id)?.in).length;
  return came / ppl.length >= 0.2;
}
function candInfo(pid, start) {
  const p = getPerson(pid), today = todayStr();
  const act = tasksOfStaff(pid).filter(t => t.status !== "done");
  const own = act.filter(t => t.ownerId === pid).length, exec = act.length - own;
  const overdue = act.filter(t => t.ownerId === pid && stateOf(t) === "overdue").length;
  const a = attInfo(p, today);
  let streak = 0;
  for (let i = 0, d = today; i < 12; i++, d = addDays(d, -1)) {
    if (!isWorkday(d) || !recordedDay(d)) continue;
    const x = attInfo(p, d);
    if (x.key === "absent") streak++; else if (x.key === "wait" || x.key === "future") continue; else break;
  }
  const startsNow = !start || start <= today;
  const absentNow = startsNow && a.key === "absent" && recordedDay(today);
  const away = streak >= 2;
  const over = act.length >= LOAD_MAX;
  const score = own * 1.5 + exec + overdue * 2 + (absentNow ? 6 : 0) + (away ? 14 : 0) + (over ? 4 : 0);
  return { p, own, exec, total: act.length, overdue, a, absentNow, away, streak, over, score };
}
function pickFor(posId, start, taken) {
  const holders = posHolders(posId);
  let pool = holders.filter(h => !taken.has(h.id)).map(h => candInfo(h.id, start)).sort((x, y) => x.score - y.score || String(x.p.name).localeCompare(String(y.p.name)));
  let fallback = null;
  if (!pool.length) {
    const d = getDept(posMap()[posId]?.deptId);
    if (d && d.headId && S.org.staff[d.headId] && !taken.has(d.headId)) { pool = [candInfo(d.headId, start)]; fallback = holders.length ? "taken" : "head"; }
  }
  return { pool, holders: holders.length, fallback };
}

/* ----- 1-qatlam: Claude ----- */
function aiPrompt(task) {
  const cat = positions().map(p => {
    const d = getDept(p.deptId), n = posHolders(p.id).length;
    return `[${p.id}] ${p.title} — ${d ? `${d.name} (${branchName(d.branch)})` : "bo'limsiz"}, ${n} xodim${p.reportsTo ? `. Bo'ysunadi: ${p.reportsTo}` : ""}${p.summary ? `. Mazmuni: ${p.summary}` : ""}\n${(p.duties || []).map((x, i) => `  ${i + 1}. ${x}`).join("\n")}`;
  }).join("\n");
  return `You assign work in a company using its job descriptions (lavozim yo'riqnomalari). Read the task and the catalog of positions, then decide which positions should do it.

Rules:
- Choose positions ONLY by their id from the catalog.
- "owner": exactly one position accountable for the RESULT of this task: its duties make it responsible for the outcome, not merely involved.
- "helpers": 0 to 4 other positions whose listed duties are genuinely needed to complete this task. Do not add a position just because it is loosely related. Order by importance.
- For every pick give "duty": the number of the single duty line in that position's list that best justifies the pick, and "why": a reason in Uzbek (Latin script), at most 14 words, tied to this task.
- If some part of the task is covered by NO duty line, set "gap" to {"text": a new duty line in Uzbek (Latin script), written like the others, at most 10 words, "pos": the id of the position it should be added to}. Otherwise "gap" is null.
- "understanding": one Uzbek sentence (at most 20 words) saying what the task actually requires.
- "confidence": "high" if the duties clearly cover the task, "medium" if partly, "low" if you are guessing.
- A position with 0 xodim has nobody in it; choose it anyway if it is the right fit.

Reply with only JSON in exactly this shape:
{"understanding":"...","owner":{"pos":"p-...","duty":1,"why":"..."},"helpers":[{"pos":"p-...","duty":2,"why":"..."}],"gap":null,"confidence":"high"}

TASK
Nomi: ${task.title}
Tavsif: ${task.desc || "(yo'q)"}
Muddat: ${task.start || "?"} → ${task.due || "?"}

POSITIONS
${cat}`;
}
function cleanAi(r) {
  const pm = posMap(), clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const one = x => {
    if (!x || typeof x !== "object" || !pm[x.pos]) return null;
    const duties = pm[x.pos].duties || [], d = Math.round(Number(x.duty));
    return { pos: x.pos, duty: d >= 1 && d <= duties.length ? d : 0, why: clip(x.why, 140) };
  };
  const owner = one(r && r.owner); if (!owner) return null;
  const seen = new Set([owner.pos]);
  const helpers = (Array.isArray(r.helpers) ? r.helpers : []).map(one).filter(h => h && !seen.has(h.pos) && seen.add(h.pos)).slice(0, 4);
  const gap = r.gap && typeof r.gap === "object" && clip(r.gap.text, 120) ? { text: clip(r.gap.text, 120), pos: pm[r.gap.pos] ? r.gap.pos : null } : null;
  return { owner, helpers, gap, understanding: clip(r.understanding, 220), confidence: ["high", "medium", "low"].includes(r.confidence) ? r.confidence : "medium", src: "claude" };
}

/* ----- zaxira: kalit so'zlar bo'yicha moslik ----- */
const AI_STOP = new Set("va bilan uchun bo'yicha ga da ni dan ham yoki bu shu bir har kerak qilish etish bo'lish olish berish yangi ishlar ishi orqali hamda kuni kun".split(" "));
function aiToks(s) {
  return normQ(s).split(/[^a-z0-9'а-яёўқғҳ]+/).filter(w => w.length >= 3 && !AI_STOP.has(w)).map(w => w.replace(/'/g, "").slice(0, 5));
}
/* kam uchraydigan so'z ko'proq og'irlikka ega (IDF): «mijoz» hamma joyda bor, «tender» esa bitta lavozimda */
function localMatch(task) {
  const list = positions(); if (!list.length) return null;
  const sets = list.map(p => new Set(aiToks([p.title, p.summary, ...(p.duties || []), ...(p.daily || [])].join(" "))));
  const N = list.length, df = {};
  sets.forEach(st => st.forEach(t => { df[t] = (df[t] || 0) + 1; }));
  const idf = t => Math.log((N + 1) / ((df[t] || 0) + 1)) + .05;
  const T = [...new Set(aiToks(`${task.title} ${task.desc || ""}`))];
  const w = s => { const st = new Set(aiToks(s)); return T.reduce((a, t) => a + (st.has(t) ? idf(t) : 0), 0); };
  const scored = list.map(p => {
    const dl = (p.duties || []).map(w); let best = 0; dl.forEach((v, i) => { if (v > dl[best]) best = i; });
    const score = w(p.title) * 2 + Math.max(0, ...dl) * 1.5 + dl.reduce((a, b) => a + b, 0) * .5 + w(p.summary) * .7 + (p.daily || []).map(w).reduce((a, b) => a + b, 0) * .3;
    return { p, score, duty: dl.length && dl[best] > 0 ? best + 1 : 0 };
  }).filter(x => x.score > .3).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const top = scored[0];
  const helpers = scored.slice(1).filter(x => x.score >= top.score * .45).slice(0, 3);
  const pick = x => ({ pos: x.p.id, duty: x.duty, why: "Yo'riqnomadagi mos so'zlar bo'yicha" });
  return { owner: pick(top), helpers: helpers.map(pick), gap: null, understanding: "", confidence: top.score >= 9 ? "medium" : "low", src: "local" };
}

/* ----- natija: lavozimlardan aniq odamlar ----- */
function buildPeople(res, task) {
  const taken = new Set(), notes = [];
  const slot = (x, role) => {
    const pk = pickFor(x.pos, task.start, taken);
    const best = pk.pool[0] || null;
    if (best) taken.add(best.p.id);
    const pos = posMap()[x.pos];
    if (!best) notes.push(`«${pos.title}» lavozimida bo'sh xodim yo'q: xodim kartasida lavozim biriktiring.`);
    else {
      if (pk.fallback === "head") notes.push(`«${pos.title}» lavozimida hali hech kim yo'q, shuning uchun bo'lim boshlig'i ${best.p.name} taklif qilindi.`);
      const skipped = posHolders(x.pos).map(h => candInfo(h.id, task.start)).filter(c => c.p.id !== best.p.id && (c.absentNow || c.away));
      skipped.forEach(c => notes.push(`${c.p.name} ${c.away ? `${c.streak} kundan beri ishga kelmayapti` : "bugun ishga kelmagan"}, shuning uchun ${best.p.name} tanlandi.`));
      if (best.over) notes.push(`${best.p.name}da allaqachon ${best.total} ta faol task bor${pk.pool.length > 1 ? "" : " va bu lavozimda boshqa xodim yo'q"}.`);
    }
    return { ...x, role, pos, pick: best, alts: pk.pool.slice(1), on: !!best };
  };
  const owner = slot(res.owner, "owner");
  const helpers = res.helpers.map(h => slot(h, "helper"));
  return { ...res, owner, helpers, notes };
}

/* ----- UI ----- */
function aiIdleHTML() {
  return `<button type="button" class="ai-btn" data-action="ai-suggest"><span class="ai-spark" aria-hidden="true">✦</span><span class="ai-txt"><b>Kim bajarsin?</b><small>Nizom va lavozim yo'riqnomalari bo'yicha tavsiya. Yuklama va davomat hisobga olinadi.</small></span><span class="ai-go" aria-hidden="true">›</span></button>`;
}
function aiSignals(c) {
  if (!c) return "";
  const load = `<span class="sig ${c.over ? "warn" : ""}" title="${c.own} tasida mas'ul, ${c.exec} tasida ijrochi">${c.total ? `${c.total} faol task` : "Bo'sh"}</span>`;
  const att = c.away ? `<span class="sig crit">${c.streak} kundan beri kelmayapti</span>`
    : c.absentNow ? `<span class="sig crit">Bugun kelmadi</span>`
    : c.a.in ? `<span class="sig ok">${c.a.out ? "Bugun ishladi" : "Ishda"}</span>`
    : c.a.key === "wait" ? `<span class="sig">Hali kelmagan</span>` : "";
  const od = c.overdue ? `<span class="sig crit">${c.overdue} ta muddati o'tgan</span>` : "";
  return load + att + od;
}
function aiPersonHTML(it, i) {
  const c = it.pick, owner = it.role === "owner";
  const duty = it.duty && it.pos.duties ? it.pos.duties[it.duty - 1] : "";
  const d = getDept(it.pos.deptId);
  const alts = it.alts.length ? `<label class="sr" for="ai-alt-${i}">Boshqa xodim</label><select class="ai-alt" id="ai-alt-${i}" data-change="ai-alt" data-i="${i}">${[c, ...it.alts].map(x => `<option value="${esc(x.p.id)}"${x === c ? " selected" : ""}>${esc(shortName(x.p.name))} · ${x.total} task${x.away || x.absentNow ? " · kelmagan" : ""}</option>`).join("")}</select>` : "";
  return `<div class="ai-person${it.on ? "" : " off"}${c ? "" : " empty"}">
    ${owner ? `<span class="ai-star" aria-hidden="true">★</span>` : `<input type="checkbox" class="ai-check" data-change="ai-check" data-i="${i}"${it.on ? " checked" : ""}${c ? "" : " disabled"} aria-label="${esc(c ? c.p.name : it.pos.title)}: ijrochilarga qo'shish">`}
    ${c ? avatar(c.p, "sm") : `<span class="av sm sys">?</span>`}
    <div class="ai-pmain">
      <div class="ai-name"><b>${esc(c ? c.p.name : "Xodim yo'q")}</b><small>${esc(it.pos.title)}${d ? ` · ${esc(d.name)}` : ""}</small></div>
      ${it.why ? `<div class="ai-why">${esc(it.why)}</div>` : ""}
      ${duty ? `<div class="ai-duty"><span>Yo'riqnoma, ${it.duty}-band:</span> «${esc(duty)}»</div>` : ""}
      <div class="ai-sigs">${aiSignals(c)}${alts}</div>
    </div>
  </div>`;
}
function aiResultHTML(s) {
  const conf = { high: "Ishonch yuqori", medium: "Ishonch o'rtacha", low: "Taxminiy" }[s.confidence];
  const canGap = s.gap && s.gap.pos && can.docs();
  const gapPos = s.gap && s.gap.pos ? posMap()[s.gap.pos] : null;
  return `<div class="ai-card" role="region" aria-label="Ijrochilar tavsiyasi">
    <div class="ai-head"><span class="ai-spark" aria-hidden="true">✦</span><b>Tavsiya</b><span class="ai-conf ${s.confidence}">${conf}</span><span class="ai-src">${s.src === "claude" ? "Claude tahlili" : "Kalit so'zlar bo'yicha"}</span><button type="button" class="icon-btn sm" data-action="ai-close" aria-label="Tavsiyani yopish">×</button></div>
    ${s.understanding ? `<p class="ai-under">${esc(s.understanding)}</p>` : ""}
    ${s.srcNote ? `<p class="ai-note">${esc(s.srcNote)}</p>` : ""}
    <div class="ai-role">Mas'ul</div>
    ${aiPersonHTML(s.owner, -1)}
    ${s.helpers.length ? `<div class="ai-role">Ijrochilar <small>belgini olib tashlasangiz, formaga qo'shilmaydi</small></div>${s.helpers.map((h, i) => aiPersonHTML(h, i)).join("")}` : `<p class="ai-note">Bu ishni bitta lavozim o'zi bajara oladi.</p>`}
    ${s.notes.length ? `<ul class="ai-notes">${s.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    ${s.gap ? `<div class="ai-gap"><b>Yo'riqnomalarda bo'shliq</b><p>Bu ishning bir qismi hech bir yo'riqnomada yozilmagan: «${esc(s.gap.text)}»${gapPos ? `. Eng yaqin lavozim: ${esc(gapPos.title)}.` : ""}</p>${canGap ? `<button type="button" class="btn tiny" data-action="ai-gap-add"${s.gapAdded ? " disabled" : ""}>${s.gapAdded ? "✓ Yo'riqnomaga qo'shildi" : `«${esc(gapPos.title)}» yo'riqnomasiga qo'shish`}</button>` : ""}</div>` : ""}
    <div class="ai-actions"><button type="button" class="btn primary tiny" data-action="ai-apply"${s.owner.pick ? "" : " disabled"}>Formaga qo'llash</button>${s.src === "claude" ? `<button type="button" class="btn ghost tiny" data-action="ai-retry">Qayta tahlil</button>` : ""}<span class="ai-foot">Oxirgi qaror sizda: hech kim avtomatik tayinlanmaydi.</span></div>
  </div>`;
}
function aiZone(html) { const z = dlg.querySelector("#ai-zone"); if (z) z.innerHTML = html; }
function aiTaskFromForm() {
  return { title: ($("#f-title", dlg)?.value || "").trim(), desc: ($("#f-desc", dlg)?.value || "").trim(), start: $("#f-start", dlg)?.value || "", due: $("#f-due", dlg)?.value || "" };
}
async function aiSuggest(fresh) {
  if (!modalCtx || modalCtx.type !== "task") return;
  const task = aiTaskFromForm();
  if (task.title.length < 5) { setErr("Avval task nomini yozing: tavsiya shu matnga qarab beriladi."); $("#f-title", dlg)?.focus(); return; }
  setErr("");
  if (!positions().length) { aiZone(`<div class="ai-card"><p class="ai-note">Lavozim yo'riqnomalari hali kiritilmagan. Avval Nizom bo'limida lavozimlarni yozing.</p></div>`); return; }
  const finish = (res, note) => {
    clearInterval(modalCtx && modalCtx.aiTimer);
    if (!modalCtx || modalCtx.type !== "task") return;
    if (!res) { aiZone(`<div class="ai-card"><div class="ai-head"><span class="ai-spark" aria-hidden="true">✦</span><b>Mos lavozim topilmadi</b><button type="button" class="icon-btn sm" data-action="ai-close" aria-label="Yopish">×</button></div><p class="ai-note">${esc(note || "Task matni hech bir yo'riqnomaga mos kelmadi. Tavsifni batafsilroq yozing yoki yo'riqnomalarni to'ldiring.")}</p></div>`); return; }
    const s = buildPeople(res, task); s.srcNote = note || ""; modalCtx.ai = s; aiZone(aiResultHTML(s));
  };
  if (!S.sample || S.aiOff) { finish(localMatch(task), S.sample ? "Claude'dan foydalanishga ruxsat berilmagan, shuning uchun kalit so'zlar bo'yicha taxminiy tavsiya." : "Claude bu yerda ulanmagan, shuning uchun kalit so'zlar bo'yicha taxminiy tavsiya. claude.ai ichida ochilganda aniqroq tahlil ishlaydi."); return; }
  const ctl = new AbortController(); modalCtx.aiCtl = ctl;
  let step = 0;
  aiZone(`<div class="ai-card loading" aria-live="polite"><div class="ai-head"><span class="ai-spark spin" aria-hidden="true">✦</span><b id="ai-step">${AI_STEPS[0]}</b><button type="button" class="link-plain" data-action="ai-stop">To'xtatish</button></div><div class="ai-skel"><i></i><i></i><i></i></div><p class="ai-note">Birinchi marta Claude ruxsat so'rashi mumkin.</p></div>`);
  modalCtx.aiTimer = setInterval(() => { step = Math.min(step + 1, AI_STEPS.length - 1); const el = dlg.querySelector("#ai-step"); if (el) el.textContent = AI_STEPS[step]; }, 2600);
  try {
    const raw = await S.sample.json(aiPrompt(task), { signal: ctl.signal, modelTier: "default", ...(fresh ? { cache: false } : {}) });
    const res = cleanAi(raw);
    if (!res) throw { code: "invalid_json" };
    finish(res);
  } catch (e) {
    clearInterval(modalCtx && modalCtx.aiTimer);
    const code = e && e.code;
    if (code === "cancelled") { aiZone(aiIdleHTML()); return; }
    if (AI_OFF_CODES.includes(code)) { S.aiOff = true; finish(localMatch(task), "Claude'dan foydalanishga ruxsat berilmagan, shuning uchun kalit so'zlar bo'yicha taxminiy tavsiya."); return; }
    aiZone(`<div class="ai-card"><div class="ai-head"><span class="ai-spark" aria-hidden="true">✦</span><b>Tavsiya olinmadi</b><button type="button" class="icon-btn sm" data-action="ai-close" aria-label="Yopish">×</button></div><p class="ai-note">${esc(AI_ERR[code] || "Aloqa uzildi. Biroz kutib qayta urining.")}</p><div class="ai-actions"><button type="button" class="btn tiny" data-action="ai-suggest">Qayta urinish</button><button type="button" class="btn ghost tiny" data-action="ai-local">Kalit so'zlar bo'yicha ko'rish</button></div></div>`);
  } finally { if (modalCtx) modalCtx.aiCtl = null; }
}
function aiLocal() { const task = aiTaskFromForm(); const res = localMatch(task); if (!res) { aiZone(`<div class="ai-card"><p class="ai-note">Kalit so'zlar bo'yicha ham mos lavozim topilmadi.</p></div>`); return; } const s = buildPeople(res, task); modalCtx.ai = s; aiZone(aiResultHTML(s)); }
function aiSlot(i) { const s = modalCtx && modalCtx.ai; return s ? (Number(i) < 0 ? s.owner : s.helpers[Number(i)]) : null; }
function aiPickAlt(el) {
  const it = aiSlot(el.dataset.i); if (!it) return;
  const all = [it.pick, ...it.alts]; const nx = all.find(x => x.p.id === el.value); if (!nx) return;
  it.alts = all.filter(x => x !== nx); it.pick = nx;
  aiZone(aiResultHTML(modalCtx.ai));
}
function aiCheck(el) { const it = aiSlot(el.dataset.i); if (!it) return; it.on = el.checked; el.closest(".ai-person")?.classList.toggle("off", !el.checked); }
function aiApply() {
  const s = modalCtx && modalCtx.ai; if (!s || !s.owner.pick) return;
  const form = dlg.querySelector('form[data-form="task"]');
  // oldingi holatni saqlaymiz: «Qaytarish» bosilsa, forma aynan shunday bo'ladi
  modalCtx.aiUndo = { depts: $$('input[name="dept"]:checked', dlg).map(i => i.value), staff: $$('input[name="staff"]:checked', dlg).map(i => i.value), owner: $("#f-owner", dlg).value };
  const ownerId = s.owner.pick.p.id;
  const exec = s.helpers.filter(h => h.on && h.pick).map(h => h.pick.p.id);
  const need = new Set([ownerId, ...exec].map(pid => S.org.staff[pid]?.deptId).filter(Boolean));
  $$('input[name="dept"]', dlg).forEach(i => { if (need.has(i.value) && !i.disabled) i.checked = true; });
  renderStaffPicks([...new Set([...modalCtx.aiUndo.staff, ...exec])], ownerId);
  if (form) form.dataset.ai = "1";
  aiZone(`<div class="ai-applied"><span class="ai-spark" aria-hidden="true">✦</span><span>Tavsiya formaga qo'yildi: mas'ul <b>${esc(s.owner.pick.p.name)}</b>${exec.length ? `, ${exec.length} ta ijrochi` : ""}. Tekshirib, «Saqlash»ni bosing.</span><button type="button" class="link-plain" data-action="ai-undo">Qaytarish</button><button type="button" class="link-plain" data-action="ai-show">Tavsiyani ko'rish</button></div>`);
  dlg.querySelector(".owner-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
}
function aiUndo() {
  const u = modalCtx && modalCtx.aiUndo; if (!u) return;
  $$('input[name="dept"]', dlg).forEach(i => { if (!i.disabled) i.checked = u.depts.includes(i.value); });
  renderStaffPicks(u.staff, u.owner);
  const form = dlg.querySelector('form[data-form="task"]'); if (form) delete form.dataset.ai;
  modalCtx.aiUndo = null;
  aiZone(modalCtx.ai ? aiResultHTML(modalCtx.ai) : aiIdleHTML());
}
async function aiGapAdd() {
  const s = modalCtx && modalCtx.ai; if (!s || !s.gap || !s.gap.pos || !can.docs()) return;
  const p = posMap()[s.gap.pos]; if (!p) return;
  const duties = [...(p.duties || []), s.gap.text];
  const ok = await dbUpdate("docs/lavozimlar", { pos: { [s.gap.pos]: { duties, v: num(p.v) + 1, updatedAt: iso() } } }, () => ({ pos: {} }));
  if (!ok) return;
  s.gapAdded = true; aiZone(aiResultHTML(s));
  logEvent({ k: "nizom", txt: `lavozim yo'riqnomasiga yangi band qo'shdi: «${p.title}»`, to: posHolders(s.gap.pos).map(x => x.id), dept: [p.deptId] });
  toast(`«${p.title}» yo'riqnomasiga qo'shildi. Shu lavozimdagilardan qayta tasdiq so'raladi.`);
}
