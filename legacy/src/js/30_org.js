/* ----- Tuzilma ----- */
function viewOrg() {
  if (!S.loaded.org) return loadingBlock();
  const bl = branches();
  if (!bl.length) return emptyOrg();
  const all = tasks();
  const active = all.filter(t => t.status !== "done");
  const focus = S.focusTask && S.tasks[S.focusTask] ? { ...S.tasks[S.focusTask], id: S.focusTask } : null;
  if (S.focusTask && !focus) S.focusTask = null;
  const today = todayStr();
  const people = allStaff();
  const came = people.filter(p => rec(today, p.id)?.in).length;
  const overdue = active.filter(t => stateOf(t) === "overdue").length;
  const week = active.filter(t => t.due && t.due >= today && t.due <= addDays(today, 7)).length;
  let welcomeSeen = S.welcomeHidden; try { welcomeSeen = welcomeSeen || localStorage.getItem("tg-welcome") === "1"; } catch (e) {}
  return `
  ${welcomeSeen ? "" : `<section class="welcome" aria-label="Xush kelibsiz">
    <div><h2>Tugun'ga xush kelibsiz</h2><p>Har bir xodimning o'z bo'limi bor, bo'limlararo har bir ish esa tugun: unda bir nechta bo'lim bog'lanadi, lekin javobgar bitta. Bo'lim nomi ustiga kursorni olib boring yoki o'ngdagi taskni tanlang.</p></div>
    <div class="actions"><a class="btn primary" href="#qollanma">Qo'llanma</a><button type="button" class="btn" data-action="dismiss-welcome">Tushunarli</button></div>
  </section>`}
  <section class="summary" aria-label="Bugungi holat">
    ${stat(people.length, "xodim")}
    ${stat(`${came}/${people.length}`, "bugun keldi")}
    ${stat(active.length, "faol task")}
    ${stat(overdue, "muddati o'tgan", overdue ? "crit" : "")}
    ${stat(week, "7 kun ichida tugaydi")}
  </section>
  <div class="org-layout">
    <section class="org-board" aria-label="Kompaniya tuzilmasi">
      ${focus ? focusBar(focus) : `<p class="board-hint">Bo'lim nomi ustiga kursorni olib borsangiz, xodimlar ro'yxati ochiladi. Nomini bossangiz, bo'lim ichiga kirasiz. Taskni tanlasangiz, uni bajarayotgan bo'limlar va mas'ul shaxs sxemada ajralib turadi.</p>`}
      <div class="board-scroll">
        <div class="branches${focus ? " is-focus" : ""}">
          ${bl.map((b, i) => branchHTML(b, i % 2 === 1, focus)).join("")}
        </div>
      </div>
      <div class="legend" aria-label="Belgilar"><span><i class="dot dot-in"></i>Ishda</span><span><i class="dot dot-late"></i>Kechikib keldi</span><span><i class="dot dot-out"></i>Ketdi</span><span><i class="dot dot-wait"></i>Hali kelmagan</span><span><i class="dot dot-absent"></i>Kelmadi</span><span><i class="crown">★</i>Mas'ul</span></div>
    </section>
    ${railHTML(active, all.length - active.length, focus)}
  </div>`;
}
function emptyOrg() {
  return `<div class="empty-state"><h2>Tuzilma hali kiritilmagan</h2>
    <p>Sxemangizdagi B2B va B2C tarmoqlarini 9 ta bo'lim bilan bir bosishda yaratish mumkin. Keyin xodimlarni qo'shasiz.</p>
    ${can.structure() ? `<div class="actions"><button type="button" class="btn primary" data-action="make-template">B2B va B2C tuzilmasini yaratish</button><a class="btn" href="#sozlamalar">Qo'lda sozlash</a></div>` : `<p>Tuzilmani rahbar kiritadi.</p>`}
  </div>`;
}
function branchHTML(b, mirror, focus) {
  const ds = depts(b.id);
  const n = ds.reduce((s, d) => s + staffOf(d.id).length, 0);
  return `<section class="branch${mirror ? " mirror" : ""}" aria-label="${esc(b.name)}">
    <div class="branch-top"><span class="elbow" aria-hidden="true"></span><h2 class="branch-head">${esc(b.name)}</h2><span class="branch-meta">${ds.length} bo'lim · ${n} xodim</span></div>
    <ul class="spine">
      ${ds.map(d => deptNode(d, focus)).join("")}
      ${can.structure() ? `<li class="dept-node"><div class="node-body"><button type="button" class="dept-tab add" data-action="new-dept" data-branch="${esc(b.id)}">+ Bo'lim qo'shish</button></div></li>` : ""}
    </ul>
  </section>`;
}
function deptNode(d, focus) {
  const ppl = staffOf(d.id); const today = todayStr();
  const dt = tasksOfDept(d.id).filter(t => t.status !== "done");
  const over = dt.filter(t => stateOf(t) === "overdue").length;
  const on = !!focus && hasDept(focus, d.id);
  const hitSet = new Set(on && Array.isArray(focus.staffIds) ? focus.staffIds : []);
  const hits = ppl.filter(p => hitSet.has(p.id)).length;
  const isLead = on && focus.ownerId && S.org.staff[focus.ownerId]?.deptId === d.id;
  const sum = deptDay(d, today);
  const open = S.openDept === d.id;
  const head = d.headId ? getPerson(d.headId) : null;
  const rows = ppl.map((p, i) => {
    const a = attInfo(p, today); const owner = on && focus.ownerId === p.id;
    return `<li class="${hitSet.has(p.id) ? "is-hit" : ""}"><span class="idx">${i + 1}.</span><span class="dot dot-${a.dot}" title="${esc(a.label)}"></span><span class="nm">${esc(p.name)}${owner ? ` <i class="crown" title="Mas'ul">★</i>` : ""}${head && head.id === p.id ? ` <small class="tag-head">boshliq</small>` : ""}</span><span class="tm">${esc(a.in)}</span>${p.role ? `<span class="rl">${esc(p.role)}</span>` : ""}</li>`;
  }).join("");
  const meta = on
    ? `<span class="hit-badge">${isLead ? "Yetakchi bo'lim · " : ""}${hits ? hits + " xodim" : "butun bo'lim"}</span>`
    : `${sum.came}/${sum.total} keldi · ${dt.length} faol task${over ? ` · <span class="flag">${over} kechikkan</span>` : ""}`;
  return `<li class="dept-node${on ? " is-on" : ""}${isLead ? " is-lead" : ""}${open ? " open" : ""}" data-dept="${esc(d.id)}">
    <div class="node-body">
      <a class="dept-tab" href="#bolim-${esc(d.id)}">${esc(d.name)}<span class="cnt">${ppl.length}</span></a>
      <span class="node-meta">${meta}</span>
      <button type="button" class="node-toggle" data-action="toggle-dept" data-id="${esc(d.id)}" aria-expanded="${open}" aria-controls="pop-${esc(d.id)}" aria-label="${esc(d.name)}: xodimlar ro'yxati">▾</button>
      <div class="staff-card" id="pop-${esc(d.id)}" data-action="go" data-href="#bolim-${esc(d.id)}">
        <div class="pop-head"><strong>${esc(d.name)} xodimlari</strong><span>${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</span></div>
        ${ppl.length ? `<ol class="staff-list">${rows}</ol>` : `<p class="card-empty">Xodim qo'shilmagan</p>`}
        <div class="card-foot"><span>${dt.length} faol task</span>${over ? `<span class="flag">${over} kechikkan</span>` : ""}<span class="foot-att">${sum.came}/${sum.total} keldi</span></div>
        <span class="pop-cta">Bo'limni ochish →</span>
      </div>
    </div>
  </li>`;
}
function focusBar(t) {
  const st = stateOf(t); const info = dueInfo(t); const o = t.ownerId ? getPerson(t.ownerId) : null;
  return `<div class="focus-bar">
    <span class="pill s-${st}">${STATE_LABEL[st]}</span>
    <strong class="fb-title">${esc(t.title)}</strong>
    <span class="fb-meta">${o ? `Mas'ul: <b>${esc(o.name)}</b> · ` : `<b class="warn-t">Mas'ul yo'q</b> · `}${tDepts(t).length} ta bo'lim · ${tStaff(t).length} xodim · ${esc(fmtDate(t.due))} (${esc(info.text)})</span>
    <span class="fb-actions"><button type="button" class="btn tiny" data-action="open-task" data-id="${esc(t.id)}">Batafsil</button><button type="button" class="icon-btn" data-action="clear-focus" aria-label="Tanlovni bekor qilish">×</button></span>
  </div>`;
}
function railHTML(active, doneCount, focus) {
  const mine = myStaffId();
  const list = active.slice().sort((a, b) => ((b.ownerId === mine) - (a.ownerId === mine)) || byDue(a, b));
  return `<aside class="task-rail" aria-label="Faol tasklar">
    <div class="rail-head"><h2>Faol tasklar</h2><p>Taskni bossangiz, uni bajarayotgan bo'limlar sxemada belgilanadi.</p></div>
    <div class="rail-wrap at-start" id="rail-wrap">
    <button type="button" class="rail-nav prev" data-action="rail-scroll" data-dir="-1" aria-label="Oldingi tasklar">‹</button>
    <div class="rail-list" id="rail-list">${list.length ? list.map(t => {
      const st = stateOf(t), info = dueInfo(t), on = !!focus && focus.id === t.id;
      return `<button type="button" class="rail-task s-${st}${on ? " is-active" : ""}" data-action="focus-task" data-id="${esc(t.id)}" aria-pressed="${on}">
        <span class="rt-title">${esc(t.title)}</span>
        <span class="rt-meta"><span class="rt-depts">${tDepts(t).length} bo'lim</span>${ownerChip(t)}</span>
        <span class="rt-meta"><span class="bar"><i style="width:${pct(t)}%"></i></span><span class="due ${info.cls}">${esc(info.text)}</span></span>
      </button>`; }).join("") : `<p class="muted">Faol task yo'q.</p>`}</div>
    <button type="button" class="rail-nav next" data-action="rail-scroll" data-dir="1" aria-label="Keyingi tasklar">›</button>
    </div>
    <div class="rail-dots" id="rail-dots" aria-hidden="true"></div>
    <div class="rail-foot">${can.createTask() ? `<button type="button" class="btn tiny" data-action="new-task">+ Yangi task</button>` : ""}<a href="#tasklar">Barcha tasklar${doneCount ? ` (${doneCount} bajarilgan)` : ""}</a></div>
  </aside>`;
}

/* ----- Bo'lim ichki ko'rinishi ----- */
function runs(arr) { const out = []; let s = arr[0], p = arr[0]; for (let i = 1; i < arr.length; i++) { if (arr[i] === p + 1) { p = arr[i]; continue; } out.push([s, p]); s = p = arr[i]; } out.push([s, p]); return out; }
function viewDept() {
  if (!S.loaded.org) return loadingBlock();
  const d = getDept(S.deptId);
  if (!d) return `<div class="empty-state"><h2>Bo'lim topilmadi</h2><p>U o'chirilgan yoki nomi o'zgargan bo'lishi mumkin.</p><div class="actions"><a class="btn" href="#tuzilma">Tuzilmaga qaytish</a></div></div>`;
  const ppl = staffOf(d.id);
  const today = todayStr();
  const mine = tasksOfDept(d.id);
  const active = mine.filter(t => t.status !== "done").sort(byDue);
  const done = mine.filter(t => t.status === "done").sort((a, b) => String(b.doneAt || b.due || "").localeCompare(String(a.doneAt || a.due || "")));
  const sum = deptDay(d, today);
  const partners = new Map();
  active.forEach(t => (t.deptIds || []).forEach(id => { if (id !== d.id && getDept(id)) partners.set(id, (partners.get(id) || 0) + 1); }));
  const bn = branchName(d.branch);
  const head = d.headId ? getPerson(d.headId) : null;
  const led = active.filter(t => S.org.staff[t.ownerId]?.deptId === d.id).length;
  const side = `<div class="dept-hero">
        ${bn ? `<span class="branch-tag">${esc(bn)}</span>` : ""}
        <h2>${esc(d.name)}</h2>
        ${head ? `<div class="hero-head">${avatar(head, "sm")}<span><small>Bo'lim boshlig'i</small><b>${esc(head.name)}</b></span></div>` : `<div class="hero-head muted">Bo'lim boshlig'i tayinlanmagan</div>`}
        <dl class="hero-facts">
          <div><dt>Ish vaqti</dt><dd>${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</dd></div>
          <div><dt>Bugun keldi</dt><dd>${sum.came}/${sum.total}</dd></div>
          <div><dt>Faol task</dt><dd>${active.length}</dd></div>
          <div><dt>Yetakchilik</dt><dd>${led} ta</dd></div>
        </dl>
        <div class="hero-actions">
          ${can.createTask() ? `<button type="button" class="btn primary tiny" data-action="new-task" data-dept="${esc(d.id)}">+ Task</button>` : ""}
          ${can.structure() ? `<button type="button" class="btn tiny" data-action="new-staff" data-dept="${esc(d.id)}">+ Xodim</button><button type="button" class="btn tiny ghost" data-action="edit-dept" data-id="${esc(d.id)}">Tahrirlash</button>` : ""}
        </div>
      </div>
      <aside class="partners">
        <h3>Birga ishlayotgan bo'limlar</h3>
        ${partners.size ? `<ul>${[...partners].sort((a, b) => b[1] - a[1]).map(([id, n]) => { const pd = getDept(id); return `<li><a class="chip" href="#bolim-${esc(id)}">${esc(pd.name)}<small>${esc(branchName(pd.branch))}</small></a><span class="muted">${n} ta umumiy task</span></li>`; }).join("")}</ul>` : `<p class="muted">Faol tasklar boshqa bo'limlar bilan bo'lishilmagan.</p>`}
      </aside>`;
  const doneHTML = done.length ? `<details class="done-list" id="done-list"${S.doneOpen ? " open" : ""}><summary>Bajarilgan tasklar (${done.length})</summary><ul>${done.map(t => `<li><button type="button" class="link" data-action="open-task" data-id="${esc(t.id)}">${esc(t.title)}</button><span class="muted">${esc(fmtDate(t.start))} → ${esc(fmtDate(t.due))}</span>${ownerChip(t)}</li>`).join("")}</ul></details>` : `<div style="height:40px"></div>`;
  const crumbs = `<nav class="crumbs" aria-label="Joylashuv"><a href="#tuzilma">Tuzilma</a><span aria-hidden="true">/</span><span>${esc(bn || "—")}</span><span aria-hidden="true">/</span><strong>${esc(d.name)}</strong></nav>`;
  if (ppl.length > 8) {
    // compact layout for big departments: people grid + task cards
    return `${crumbs}
    <div class="dept-wide">
      <div class="dept-side">${side}</div>
      <div class="dept-main">
        <section class="people-grid">${ppl.map((p, i) => staffTile(p, i, today, active, true)).join("")}</section>
        <h3 class="sec-title">Faol tasklar <span class="muted">${active.length}</span></h3>
        <section class="task-cards">${active.length ? active.map(t => blockHTML({ t, a: 0, b: 0, r: 0, cont: false, whole: false }, d, true)).join("") : `<div class="no-tasks"><p>Bu bo'limda faol task yo'q.</p></div>`}</section>
      </div>
    </div>${doneHTML}`;
  }
  const N = Math.max(ppl.length, 1);
  const col = new Map(ppl.map((p, i) => [p.id, i]));
  const rows = [], blocks = [];
  for (const t of active) {
    const cs = [...new Set((t.staffIds || []).map(id => col.get(id)).filter(i => i !== undefined))].sort((a, b) => a - b);
    const segs = cs.length ? runs(cs) : [[0, N - 1]];
    const busy = r => rows[r] && segs.some(([a, b]) => { for (let c = a; c <= b; c++) if (rows[r].has(c)) return true; return false; });
    let r = 0; while (busy(r)) r++;
    if (!rows[r]) rows[r] = new Set();
    segs.forEach(([a, b]) => { for (let c = a; c <= b; c++) rows[r].add(c); });
    segs.forEach(([a, b], k) => blocks.push({ t, a, b, r, cont: k > 0, whole: !cs.length }));
  }
  const R = Math.max(rows.length, 1);
  return `${crumbs}
  <div class="dept-scroll" id="dept-scroll" data-keep-scroll>
    <div class="dept-board" style="--cols:${N};--rows:${R}">
      <div class="dept-side" style="grid-column:1;grid-row:1 / -1">${side}</div>
      ${ppl.length ? ppl.map((p, i) => staffTile(p, i, today, active)).join("") : `<div class="staff-tile empty" style="grid-column:2;grid-row:1">Bu bo'limda hali xodim yo'q.</div>`}
      ${blocks.map(x => blockHTML(x, d)).join("")}
      ${active.length ? "" : `<div class="no-tasks" style="grid-column:2 / -1;grid-row:2"><p>Bu bo'limda faol task yo'q.</p>${can.createTask() ? `<button type="button" class="btn" data-action="new-task" data-dept="${esc(d.id)}">+ Yangi task</button>` : ""}</div>`}
    </div>
  </div>${doneHTML}`;
}
function staffTile(p, i, today, active, compact) {
  const a = attInfo(p, today);
  const load = active.filter(t => (t.staffIds || []).includes(p.id) || t.ownerId === p.id).length;
  const owns = active.filter(t => t.ownerId === p.id).length;
  const isHead = !!idx().headOf[p.id];
  let btn = "";
  if (can.editAtt(p) && !a.in) btn = `<button type="button" class="btn tiny" data-action="att-edit" data-id="${esc(p.id)}" data-date="${today}" data-preset="in">Keldi</button>`;
  else if (can.editAtt(p) && !a.out) btn = `<button type="button" class="btn tiny" data-action="att-edit" data-id="${esc(p.id)}" data-date="${today}" data-preset="out">Ketdi</button>`;
  return `<div class="staff-tile" ${compact ? "" : `style="grid-column:${i + 2};grid-row:1"`}>
    <div class="st-head"><span class="idx">${i + 1}</span><button type="button" class="nm link" data-action="open-person" data-id="${esc(p.id)}">${esc(p.name)}</button>${can.structure() ? `<button type="button" class="icon-btn sm" data-action="edit-staff" data-id="${esc(p.id)}" aria-label="${esc(p.name)}: tahrirlash">✎</button>` : ""}</div>
    <div class="st-role">${esc(p.role || "")}${isHead ? ` <small class="tag-head">boshliq</small>` : ""}</div>
    <div class="st-att"><span class="dot dot-${a.dot}"></span><span>${esc(a.label)}</span></div>
    <div class="st-times"><span>Keldi <b>${esc(a.in || "—")}</b></span><span>Ketdi <b>${esc(a.out || "—")}</b></span></div>
    <div class="st-foot"><span>${load} faol task${owns ? `, ${owns} tasi mas'ul` : ""}</span>${btn}</div>
  </div>`;
}
function blockHTML(x, d, card) {
  const t = x.t, st = stateOf(t), info = dueInfo(t);
  const others = tDepts(t).filter(o => o.id !== d.id);
  const mine = tStaff(t).filter(p => p.deptId === d.id);
  const lead = S.org.staff[t.ownerId]?.deptId === d.id;
  const style = card ? "" : ` style="grid-column:${x.a + 2} / ${x.b + 3};grid-row:${x.r + 2}"`;
  return `<button type="button" class="task-block s-${st}${card ? " card" : ""}"${style} data-action="open-task" data-id="${esc(t.id)}">
    <span class="tb-top"><span class="pill s-${st}">${STATE_LABEL[st]}</span>${lead ? `<span class="tb-lead">Yetakchi</span>` : ""}${x.cont ? `<span class="tb-cont">davomi</span>` : ""}</span>
    <span class="tb-title">${esc(t.title)}</span>
    <span class="tb-owner">${ownerChip(t)}</span>
    <span class="tb-due"><span>${esc(fmtDate(t.start))} → ${esc(fmtDate(t.due))}</span><span class="due ${info.cls}">${esc(info.text)}</span></span>
    <span class="tb-prog"><span class="bar"><i style="width:${pct(t)}%"></i></span><span>${pct(t)}%</span></span>
    <span class="tb-who">${x.whole ? "Butun bo'lim" : mine.map(p => esc(shortName(p.name))).join(", ")}</span>
    <span class="tb-others">${others.length ? `Yana ${others.length} bo'lim: ${others.map(o => `<span class="chip">${esc(o.name)}<small>${esc(branchName(o.branch))}</small></span>`).join(" ")}` : "Faqat shu bo'lim"}</span>
  </button>`;
}
