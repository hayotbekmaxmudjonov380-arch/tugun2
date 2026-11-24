/* ----- Dashboard ----- */
const STATE_ORDER = ["done", "progress", "new", "review", "overdue"];
const ON_LIGHT = { new: true };
function dashData() {
  const today = todayStr(), f = S.dash, m = f.month || monthOf(today);
  const bl = branches();
  const ds = deptsOrdered().filter(d => f.branch === "all" || d.branch === f.branch);
  const dsIds = new Set(ds.map(d => d.id));
  const all = tasks();
  const tl = f.branch === "all" ? all : all.filter(t => (t.deptIds || []).some(id => dsIds.has(id)));
  const counts = { done: 0, progress: 0, new: 0, review: 0, overdue: 0 };
  tl.forEach(t => counts[stateOf(t)]++);
  const total = tl.length, active = tl.filter(t => t.status !== "done");
  const avgProg = total ? Math.round(tl.reduce((s, t) => s + pct(t), 0) / total) : 0;
  const week = active.filter(t => t.due && t.due >= today && t.due <= addDays(today, 7)).length;
  const people = ds.flatMap(d => staffOf(d.id));
  let tp = 0, ta = 0;
  people.forEach(p => { const a = attInfo(p, today); if (a.in) tp++; else if (a.key === "absent") ta++; });
  const [y, mo] = m.split("-").map(Number), last = new Date(y, mo, 0).getDate();
  const days = []; for (let i = 1; i <= last; i++) { const dd = `${m}-${pad(i)}`; if (dd > today) break; days.push(dd); }
  const deptStats = ds.map(d => {
    const ppl = staffOf(d.id); let present = 0, absent = 0, late = 0, minutes = 0;
    for (const day of days) for (const p of ppl) { const a = attInfo(p, day); if (a.in) { present++; if (a.late) late++; if (a.out && a.worked != null) minutes += a.worked; } else if (a.key === "absent") absent++; }
    const dt = all.filter(t => hasDept(t, d.id));
    const sc = { done: 0, progress: 0, new: 0, review: 0, overdue: 0 }; dt.forEach(t => sc[stateOf(t)]++);
    const act = dt.filter(t => t.status !== "done");
    const avg = act.length ? Math.round(act.reduce((s, t) => s + pct(t), 0) / act.length) : null;
    const rate = (present + absent) ? Math.round(present / (present + absent) * 100) : null;
    const score = rate == null ? avg : avg == null ? rate : Math.round((rate + avg) / 2);
    return { d, staff: ppl.length, sc, total: dt.length, active: act.length, avg, rate, present, absent, late, minutes, score };
  });
  const sumP = deptStats.reduce((s, x) => s + x.present, 0), sumA = deptStats.reduce((s, x) => s + x.absent, 0);
  const wdays = days.filter(isWorkday);
  const shown = f.branch === "all" ? bl : bl.filter(b => b.id === f.branch);
  const line = { labels: wdays, series: shown.map(b => {
    const slot = Math.max(0, bl.findIndex(x => x.id === b.id)) % 3;
    const ppl = depts(b.id).flatMap(d => staffOf(d.id));
    return { name: b.name, slot, values: wdays.map(day => { let pr = 0, ab = 0; ppl.forEach(p => { const a = attInfo(p, day); if (a.in) pr++; else if (a.key === "absent") ab++; }); return (pr + ab) ? Math.round(pr / (pr + ab) * 100) : null; }) };
  }) };
  const upcoming = active.filter(t => t.due && t.due <= addDays(today, 14)).sort(byDue).slice(0, 8);
  const noOwner = active.filter(t => !S.org.staff[t.ownerId]).length;
  const loadMap = new Map();
  active.forEach(t => {
    if (S.org.staff[t.ownerId]) { const x = loadMap.get(t.ownerId) || { own: 0, exec: 0 }; x.own++; loadMap.set(t.ownerId, x); }
    (t.staffIds || []).forEach(pid => { if (pid === t.ownerId || !S.org.staff[pid]) return; const x = loadMap.get(pid) || { own: 0, exec: 0 }; x.exec++; loadMap.set(pid, x); });
  });
  const load = [...loadMap].map(([pid, x]) => ({ p: getPerson(pid), ...x, total: x.own + x.exec }))
    .filter(x => x.p && (f.branch === "all" || S.org.departments[x.p.deptId]?.branch === f.branch))
    .sort((a, b) => b.total - a.total || b.own - a.own).slice(0, 10);
  const idle = people.filter(p => !loadMap.has(p.id)).length;
  const acts = Object.values(S.activity).sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 12);
  return { m, counts, total, active: active.length, avgProg, week, people: people.length, cameToday: tp, todayRate: (tp + ta) ? Math.round(tp / (tp + ta) * 100) : null,
    monthRate: (sumP + sumA) ? Math.round(sumP / (sumP + sumA) * 100) : null, lateTotal: deptStats.reduce((s, x) => s + x.late, 0), minutes: deptStats.reduce((s, x) => s + x.minutes, 0),
    deptStats, line, upcoming, noOwner, load, idle, acts, monthLoaded: !!S.loaded["att:" + m] };
}
const pctTxt = v => v == null ? "—" : v + "%";
function activityItem(e, unread) {
  const who = actorName(e.by);
  const p = S.org.staff[e.by] ? getPerson(e.by) : null;
  const act = e.task && S.tasks[e.task] ? `data-action="open-task" data-id="${esc(e.task)}"` : "";
  return `<li class="feed-item${unread ? " unread" : ""}">${p ? avatar(p, "sm") : `<span class="av sm sys">${esc(who === "Rahbar" ? "R" : who === "Terminal" ? "T" : "?")}</span>`}
    <span class="fi-body"><span class="fi-txt"><b>${esc(who)}</b> ${act ? `<button type="button" class="link-plain" ${act}>${esc(e.txt || "")}</button>` : esc(e.txt || "")}</span><span class="fi-time">${esc(timeAgo(e.t))}</span></span></li>`;
}
function meterHTML(v, severity) {
  if (v == null) return `<span class="muted">—</span>`;
  const cls = severity ? (v < 60 ? " crit" : v < 80 ? " warn" : "") : "";
  return `<div class="meter-cell"><span class="meter${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></span><span>${v}%</span></div>`;
}
function viewDash() {
  if (!S.loaded.org || !S.loaded.tasks) return loadingBlock();
  if (!S.dash.month) S.dash.month = monthOf(todayStr());
  const D = dashData(); S.dashData = D;
  const f = S.dash, curM = monthOf(todayStr()), mName = fmtMonth(D.m);
  const tile = (label, value, sub, cls = "") => `<div class="dash-tile ${cls}"><span class="dc-label">${esc(label)}</span><b>${esc(value)}</b><span class="dc-sub">${esc(sub)}</span></div>`;
  const present = STATE_ORDER.filter(k => D.counts[k]);
  const seg = present.map(k => { const share = Math.round(D.counts[k] / D.total * 100); return `<span class="blk k-${k}${ON_LIGHT[k] ? " on-light" : ""}" style="flex:${D.counts[k]} 1 0" tabindex="0" data-tip="${esc(STATE_LABEL[k])}" data-tip-value="${D.counts[k]} ta task" data-tip-label="${share}%" data-tip-key="k-${k}" aria-label="${esc(STATE_LABEL[k])}: ${D.counts[k]} ta task, ${share}%"><span class="lbl">${share}%</span></span>`; }).join("");
  const maxT = Math.max(1, ...D.deptStats.map(x => x.total));
  const bars = D.deptStats.map(x => {
    const ks = STATE_ORDER.filter(k => x.sc[k]);
    const rows = JSON.stringify(ks.map(k => [`k-${k}`, `${x.sc[k]} ta`, STATE_LABEL[k]]));
    return `<div class="sbar-row" tabindex="0" data-tip="${esc(x.d.name)} (${esc(branchName(x.d.branch))})" data-tip-rows="${esc(rows)}" aria-label="${esc(x.d.name)}: ${x.total} ta task. ${ks.map(k => `${STATE_LABEL[k]} ${x.sc[k]}`).join(", ")}">
      <span class="sbar-name">${esc(x.d.name)}<small>${esc(branchName(x.d.branch))}</small></span>
      <span class="sbar-track">${x.total ? `<span class="sbar-bar" style="width:${(x.total / maxT * 88).toFixed(2)}%">${ks.map(k => `<span class="seg k-${k}" style="flex:${x.sc[k]} 1 0" data-tip="${esc(x.d.name)} · ${esc(STATE_LABEL[k])}" data-tip-value="${x.sc[k]} ta task" data-tip-key="k-${k}"></span>`).join("")}</span><span class="sbar-val">${x.total}</span>` : `<span class="sbar-empty">Task yo'q</span>`}</span>
    </div>`; }).join("");
  const ranked = D.deptStats.slice().sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const lineTable = D.line.labels.map((d, i) => `<tr><td>${esc(fmtDate(d))}</td>${D.line.series.map(s => `<td>${pctTxt(s.values[i])}</td>`).join("")}</tr>`).join("");
  const today = todayStr();
  return `
  <div class="view-head"><h2>Dashboard</h2><p>Tasklar qanday bajarilayotgani va bo'limlar faolligi bir sahifada. Filtrlar sahifadagi barcha ko'rsatkichlarga birdek ta'sir qiladi.</p></div>
  <div class="toolbar dash-filters">
    <div class="seg" role="group" aria-label="Tarmoq">${[["all", "Hammasi"], ...branches().map(b => [b.id, b.name])].map(([v, l]) => `<button type="button" data-action="dash-branch" data-v="${esc(v)}" aria-pressed="${f.branch === v}">${esc(l)}</button>`).join("")}</div>
    <div class="date-nav"><button type="button" class="btn tiny" data-action="dash-month" data-dir="-1" aria-label="Oldingi oy">‹</button><span class="date-label">${esc(mName)}</span><button type="button" class="btn tiny" data-action="dash-month" data-dir="1" aria-label="Keyingi oy"${D.m >= curM ? " disabled" : ""}>›</button></div>
    <span class="muted dash-note">Davomat tanlangan oy bo'yicha, tasklar hozirgi holati bo'yicha.</span>
  </div>
  <section class="dash-top">
    <article class="dash-card hero-card" aria-label="Tasklarning umumiy bajarilishi">
      <span class="dc-label">Tasklarning umumiy bajarilishi</span>
      <span class="hero-num">${D.avgProg}%</span>
      <span class="dc-sub">${D.total} ta taskning o'rtacha bajarilish foizi. ${D.counts.done} tasi to'liq yakunlangan.</span>
      ${D.total ? `<div class="segbar" role="group" aria-label="Tasklar holati bo'yicha taqsimot">${seg}</div>
      <div class="viz-legend">${present.map(k => `<span><i class="key k-${k}"></i>${STATE_LABEL[k]}</span>`).join("")}</div>` : `<p class="muted">Hali task yo'q.</p>`}
    </article>
    <div class="dash-stats">
      ${tile("Faol tasklar", D.active, `${D.counts.progress} jarayonda, ${D.counts.review} tekshiruvda, ${D.counts.new} yangi`)}
      ${tile("Muddati o'tgan", D.counts.overdue, D.counts.overdue ? "Darhol e'tibor kerak" : "Kechikkan task yo'q", D.counts.overdue ? "crit" : "")}
      ${tile("7 kun ichida tugaydi", D.week, "Yaqin muddatlar pastda")}
      ${tile("Bugungi davomat", pctTxt(D.todayRate), `${D.cameToday}/${D.people} xodim keldi`)}
      ${tile("Oylik davomat", pctTxt(D.monthRate), `${mName}, ${D.lateTotal} ta kechikish`)}
      ${tile("Mas'ulsiz tasklar", D.noOwner, D.noOwner ? "Har biriga bitta mas'ul tayinlang" : "Har bir taskning egasi bor", D.noOwner ? "crit" : "")}
    </div>
  </section>
  <section class="dash-grid">
    <article class="dash-card span-7">
      <header class="dc-head"><h3>Bo'limlar bo'yicha tasklar</h3><p>Har bir bo'lim qatnashayotgan tasklar holati bilan. Bir nechta bo'lim bajaradigan task har birida hisoblanadi.</p></header>
      <div class="viz-legend">${STATE_ORDER.map(k => `<span><i class="key k-${k}"></i>${STATE_LABEL[k]}</span>`).join("")}</div>
      <div class="sbars">${bars || `<p class="muted">Bo'lim yo'q.</p>`}</div>
    </article>
    <article class="dash-card span-5">
      <header class="dc-head"><h3>Kunlik davomat</h3><p>Ish kunlarida kelgan xodimlar ulushi, ${esc(mName)}.</p></header>
      ${D.line.series.length > 1 ? `<div class="viz-legend">${D.line.series.map(s => `<span><i class="key line k-s${s.slot}"></i>${esc(s.name)}</span>`).join("")}</div>` : ""}
      ${D.monthLoaded || S.conn !== "live" ? `<div class="linechart" id="dash-line" tabindex="0" role="img" aria-label="Kunlik davomat grafigi, ${esc(mName)}. Qiymatlar jadval ko'rinishida ham bor."></div>
      <details class="table-view"><summary>Jadval ko'rinishi</summary><table><thead><tr><th>Sana</th>${D.line.series.map(s => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${lineTable}</tbody></table></details>` : loadingBlock()}
    </article>
    <article class="dash-card span-12">
      <header class="dc-head"><h3>Bo'limlar faolligi</h3><p>Faollik balli: bu oy davomati va faol tasklar o'rtacha bajarilishining o'rtachasi. Faol taski yo'q bo'limda faqat davomat olinadi.</p></header>
      <div class="table-scroll"><table class="activity">
        <thead><tr><th>#</th><th>Bo'lim</th><th class="num">Xodim</th><th class="num">Faol task</th><th class="num">Bajarilgan</th><th>O'rtacha bajarilish</th><th class="num">Muddati o'tgan</th><th>Oylik davomat</th><th class="num">Kechikishlar</th><th class="num">Ishlangan</th><th class="num">Faollik balli</th></tr></thead>
        <tbody>${ranked.map((x, i) => `<tr>
          <td><span class="rank">${i + 1}</span></td>
          <td><a class="chip" href="#bolim-${esc(x.d.id)}">${esc(x.d.name)}<small>${esc(branchName(x.d.branch))}</small></a></td>
          <td class="num">${x.staff}</td><td class="num">${x.active}</td><td class="num">${x.sc.done}</td>
          <td>${meterHTML(x.avg, false)}</td>
          <td class="num">${x.sc.overdue ? `<span class="flag-dot">${x.sc.overdue}</span>` : "—"}</td>
          <td>${meterHTML(x.rate, true)}</td>
          <td class="num">${x.late || "—"}</td>
          <td class="num">${Math.round(x.minutes / 60)} s</td>
          <td class="num"><span class="score">${x.score ?? "—"}</span></td>
        </tr>`).join("")}</tbody>
      </table></div>
    </article>
    <article class="dash-card span-7">
      <header class="dc-head"><h3>Xodimlar yuklamasi</h3><p>Eng ko'p faol taskka ega 10 xodim. ${D.idle ? `${D.idle} xodimda hozir faol task yo'q.` : "Hammaning faol taski bor."}</p></header>
      <div class="viz-legend"><span><i class="key k-own"></i>Mas'ul</span><span><i class="key k-exec"></i>Ijrochi</span></div>
      <div class="sbars">${(() => { const mx = Math.max(1, ...D.load.map(x => x.total)); return D.load.map(x => `<div class="sbar-row" tabindex="0" data-tip="${esc(x.p.name)}" data-tip-rows="${esc(JSON.stringify([["k-own", `${x.own} ta`, "mas'ul"], ["k-exec", `${x.exec} ta`, "ijrochi"]]))}" aria-label="${esc(x.p.name)}: ${x.own} ta taskda mas'ul, ${x.exec} ta taskda ijrochi">
        <span class="sbar-name"><button type="button" class="link" data-action="open-person" data-id="${esc(x.p.id)}">${esc(shortName(x.p.name))}</button><small>${esc(getDept(x.p.deptId)?.name || "")}</small></span>
        <span class="sbar-track"><span class="sbar-bar" style="width:${(x.total / mx * 88).toFixed(2)}%">${x.own ? `<span class="seg k-own" style="flex:${x.own} 1 0"></span>` : ""}${x.exec ? `<span class="seg k-exec" style="flex:${x.exec} 1 0"></span>` : ""}</span><span class="sbar-val">${x.total}</span></span>
      </div>`).join("") || `<p class="muted">Faol task yo'q.</p>`; })()}</div>
    </article>
    <article class="dash-card span-5">
      <header class="dc-head"><h3>So'nggi faoliyat</h3><p>Oxirgi 7 kundagi o'zgarishlar: yangi tasklar, izohlar, holatlar va davomat tuzatishlari.</p></header>
      ${D.acts.length ? `<ul class="feed">${D.acts.map(e => activityItem(e)).join("")}</ul>` : `<p class="muted">Hali faoliyat yo'q.</p>`}
    </article>
    <article class="dash-card span-12">
      <header class="dc-head"><h3>Yaqin muddatlar</h3><p>Muddati o'tgan va keyingi 14 kunda tugaydigan tasklar.</p></header>
      ${D.upcoming.length ? `<ul class="upcoming">${D.upcoming.map(t => { const st = stateOf(t), info = dueInfo(t), dt = parseYmd(t.due); return `<li>
        <span class="cal"><b>${dt.getDate()}</b><small>${esc(MONTHS[dt.getMonth()].slice(0, 3))}</small></span>
        <span class="up-main"><button type="button" class="link" data-action="open-task" data-id="${esc(t.id)}">${esc(t.title)}</button>${ownerChip(t)}<span class="chips">${tDepts(t).map(d => `<span class="chip">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></span>`).join("")}</span></span>
        <span class="up-side"><span class="pill s-${st}">${STATE_LABEL[st]}</span><span class="due ${info.cls}">${esc(info.text)}</span></span>
      </li>`; }).join("")}</ul>` : `<p class="muted">Yaqin ikki haftada tugaydigan task yo'q.</p>`}
    </article>
  </section>`;
}
function drawLine(el, data) {
  const n = data.labels.length;
  if (!n || !data.series.length) { el.innerHTML = `<p class="muted" style="margin:16px 0">Bu oyda hali ish kuni yo'q.</p>`; el._geo = null; return; }
  const W = Math.max(300, Math.floor(el.clientWidth)), H = 236, m = { l: 40, r: 78, t: 12, b: 28 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const X = i => m.l + (n === 1 ? iw / 2 : i * iw / (n - 1));
  const Y = v => m.t + ih - v / 100 * ih;
  let g = "";
  [25, 50, 75, 100].forEach(v => { g += `<line class="lc-grid" x1="${m.l}" x2="${m.l + iw}" y1="${Y(v)}" y2="${Y(v)}"/>`; });
  g += `<line class="lc-base" x1="${m.l}" x2="${m.l + iw}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  [0, 25, 50, 75, 100].forEach(v => { g += `<text class="lc-tick" x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v}%</text>`; });
  const step = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 40))));
  const lastShown = Math.floor((n - 1) / step) * step;
  data.labels.forEach((d, i) => { if (i % step === 0 || (i === n - 1 && n - 1 - lastShown >= Math.ceil(step / 2))) g += `<text class="lc-tick" x="${X(i)}" y="${H - 8}" text-anchor="middle">${parseYmd(d).getDate()}</text>`; });
  const ends = [];
  data.series.forEach(s => {
    let d = "", pen = false;
    s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`; pen = true; });
    g += `<path class="lc-line lc-s${s.slot}" d="${d}"/>`;
    s.values.forEach((v, i) => { if (v != null && s.values[i - 1] == null && s.values[i + 1] == null) g += `<circle class="lc-d${s.slot}" cx="${X(i)}" cy="${Y(v)}" r="3"/>`; });
    let li = -1; for (let i = s.values.length - 1; i >= 0; i--) if (s.values[i] != null) { li = i; break; }
    if (li >= 0) ends.push({ s, x: X(li), y: Y(s.values[li]), v: s.values[li] });
  });
  ends.forEach(e => { g += `<circle class="lc-dot lc-d${e.s.slot}" cx="${e.x}" cy="${e.y}" r="4"/>`; });
  const collide = ends.some((a, i) => ends.some((b, j) => j > i && Math.abs(a.y - b.y) < 15));
  if (!collide) ends.forEach(e => { g += `<text class="lc-end" x="${e.x + 10}" y="${e.y + 4}">${esc(e.s.name)} ${e.v}%</text>`; });
  g += `<line class="lc-cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/><g class="lc-hover"></g>`;
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}</svg>`;
  el._geo = { X, Y, n, m, iw, data };
  if (el._idx != null && el._idx >= n) el._idx = n - 1;
}
const vizTip = document.getElementById("viz-tip");
function showTip(x, y, title, rows) {
  vizTip.textContent = "";
  const t = document.createElement("div"); t.className = "tt-title"; t.textContent = title; vizTip.appendChild(t);
  rows.forEach(r => {
    const row = document.createElement("div"); row.className = "tt-row";
    const k = document.createElement("span"); k.className = `tt-key ${r.box ? "box " : ""}${r.key || ""}`;
    const b = document.createElement("b"); b.textContent = r.value;
    const l = document.createElement("span"); l.textContent = r.label || "";
    row.append(k, b, l); vizTip.appendChild(row);
  });
  vizTip.classList.add("show");
  const w = vizTip.offsetWidth, h = vizTip.offsetHeight;
  let left = x + 14, top = y + 14;
  if (left + w > innerWidth - 8) left = x - w - 14;
  if (top + h > innerHeight - 8) top = y - h - 14;
  vizTip.style.left = Math.max(8, left) + "px"; vizTip.style.top = Math.max(8, top) + "px";
}
function hideTip() { vizTip.classList.remove("show"); }
function tipFor(el, x, y) {
  let rows;
  if (el.dataset.tipRows) { try { rows = JSON.parse(el.dataset.tipRows).map(([key, value, label]) => ({ key, value, label, box: true })); } catch (e) { rows = []; } }
  else rows = [{ key: el.dataset.tipKey, value: el.dataset.tipValue || "", label: el.dataset.tipLabel || "", box: true }];
  showTip(x, y, el.dataset.tip, rows);
}
let activeLine = null;
function lineAt(el, i, x, y) {
  const g = el._geo; if (!g) return;
  i = clamp(i, 0, g.n - 1); el._idx = i;
  const svg = el.querySelector("svg"), cross = svg.querySelector(".lc-cross"), hov = svg.querySelector(".lc-hover");
  cross.setAttribute("x1", g.X(i)); cross.setAttribute("x2", g.X(i)); cross.setAttribute("visibility", "visible");
  hov.innerHTML = g.data.series.map(s => s.values[i] == null ? "" : `<circle class="lc-dot lc-d${s.slot}" cx="${g.X(i)}" cy="${g.Y(s.values[i])}" r="4.5"/>`).join("");
  const d = g.data.labels[i];
  if (x == null) { const r = svg.getBoundingClientRect(); x = r.left + g.X(i); y = r.top + g.m.t + 10; }
  showTip(x, y, `${WD_LONG[parseYmd(d).getDay()]}, ${fmtDate(d)}`, g.data.series.map(s => ({ key: `k-s${s.slot}`, value: pctTxt(s.values[i]), label: s.name })));
  activeLine = el;
}
function clearLine() {
  if (!activeLine) return;
  const svg = activeLine.querySelector("svg");
  if (svg) { svg.querySelector(".lc-cross")?.setAttribute("visibility", "hidden"); const h = svg.querySelector(".lc-hover"); if (h) h.innerHTML = ""; }
  activeLine = null; hideTip();
}
document.addEventListener("pointermove", e => {
  const lc = e.target.closest && e.target.closest(".linechart");
  if (lc && lc._geo) {
    const g = lc._geo, r = lc.querySelector("svg").getBoundingClientRect();
    const px = e.clientX - r.left;
    if (px >= g.m.l - 12 && px <= g.m.l + g.iw + 12) { lineAt(lc, g.n === 1 ? 0 : Math.round((px - g.m.l) / (g.iw / (g.n - 1))), e.clientX, e.clientY); return; }
  }
  if (activeLine && !(lc && lc === activeLine && document.activeElement === lc)) clearLine();
  const el = e.target.closest && e.target.closest("[data-tip]");
  if (el) tipFor(el, e.clientX, e.clientY);
  else if (!activeLine && !(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.tip)) hideTip();
});
document.addEventListener("focusin", e => {
  const el = e.target;
  if (el.classList && el.classList.contains("linechart") && el._geo) { lineAt(el, el._idx ?? el._geo.n - 1); return; }
  if (el.dataset && el.dataset.tip) { const r = el.getBoundingClientRect(); tipFor(el, r.left + Math.min(r.width / 2, 120), r.bottom - 6); }
});
document.addEventListener("focusout", e => { if (e.target === activeLine) clearLine(); else if (e.target.dataset && e.target.dataset.tip) hideTip(); });
document.addEventListener("keydown", e => {
  const el = e.target;
  if (el.classList && el.classList.contains("linechart") && el._geo && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); lineAt(el, (el._idx ?? el._geo.n - 1) + (e.key === "ArrowRight" ? 1 : -1)); }
});
addEventListener("scroll", () => { if (vizTip.classList.contains("show")) { clearLine(); hideTip(); } }, { passive: true });
function railState() {
  const l = document.getElementById("rail-list"), w = document.getElementById("rail-wrap"), d = document.getElementById("rail-dots");
  if (!l || !w) return;
  const max = l.scrollWidth - l.clientWidth;
  w.classList.toggle("at-start", l.scrollLeft <= 4);
  w.classList.toggle("at-end", l.scrollLeft >= max - 4);
  if (d) {
    const pages = max > 4 ? Math.ceil(l.scrollWidth / l.clientWidth) : 0;
    if (d.childElementCount !== pages) d.innerHTML = "<i></i>".repeat(pages);
    const cur = pages ? Math.round(l.scrollLeft / Math.max(1, max) * (pages - 1)) : 0;
    [...d.children].forEach((i, k) => i.classList.toggle("on", k === cur));
  }
}
document.addEventListener("scroll", e => { if (e.target && e.target.id === "rail-list") railState(); }, true);
addEventListener("resize", () => railState());
function postRender() {
  railState();
  if (S.view !== "dashboard") return;
  activeLine = null; hideTip();
  const el = document.getElementById("dash-line");
  if (el && S.dashData) drawLine(el, S.dashData.line);
  $$(".segbar .blk").forEach(b => { const l = b.querySelector(".lbl"); if (l) l.style.visibility = (l.scrollWidth + 14 <= b.clientWidth) ? "visible" : "hidden"; });
}


/* ----- fon rejimi: kunduzgi / kechki / avto ----- */
function applyMode(mode) {
  if (mode === "day" || mode === "night") document.documentElement.setAttribute("data-mode", mode);
  else { mode = "auto"; document.documentElement.removeAttribute("data-mode"); }
  document.querySelectorAll("[data-mode-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.modeSet === mode)));
  try { localStorage.setItem("tg-mode", mode); } catch (e) {}
}
(function () { let m = "auto"; try { m = localStorage.getItem("tg-mode") || "auto"; } catch (e) {} applyMode(m); })();
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-mode-set]"); if (b) applyMode(b.dataset.modeSet); const g = e.target.closest && e.target.closest("[data-bg-set]"); if (g) applyBg(g.dataset.bgSet); });

/* ----- orqa fon: 4 uslub (har bir foydalanuvchi o'zi tanlaydi, brauzerida saqlanadi) ----- */
const BG_STYLES = [
  { id: "neon", name: "Neon to'lqin", sub: "Sony uslubidagi yorug' iplar" },
  { id: "aurora", name: "Aurora", sub: "Sekin suzuvchi rangli nur" },
  { id: "ipak", name: "Ipak", sub: "Bir rangli yumshoq chiziqlar" },
  { id: "toza", name: "Toza", sub: "Harakatsiz, faqat rang" }
];
function applyBg(id) {
  if (!BG_STYLES.some(b => b.id === id)) id = "neon";
  document.documentElement.setAttribute("data-bg", id);
  try { localStorage.setItem("tg-bg", id); } catch (e) {}
  $$("[data-bg-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.bgSet === id)));
}
(function () { let b = "neon"; try { b = localStorage.getItem("tg-bg") || "neon"; } catch (e) {} applyBg(b); })();
function bgPickerHTML() {
  const cur = document.documentElement.getAttribute("data-bg") || "neon";
  return `<div class="np-head"><h3>Orqa fon</h3><button type="button" class="icon-btn sm" data-action="close-bgpick" aria-label="Yopish">×</button></div>
    <div class="bg-grid">${BG_STYLES.map(b => `<button type="button" class="bg-opt" data-bg-set="${b.id}" aria-pressed="${b.id === cur}"><span class="bg-sw sw-${b.id}"></span><b>${esc(b.name)}</b><small>${esc(b.sub)}</small></button>`).join("")}</div>
    <p class="hint" style="padding:4px 18px 0">Tanlov faqat sizning qurilmangizda saqlanadi. Kunduzgi va kechki rejimda ham ishlaydi.</p>`;
}
let bgPickOpen = false;
function toggleBgPick(force) {
  bgPickOpen = force != null ? force : !bgPickOpen;
  const box = $("#bgpick"), btn = $("#bg-btn"); if (!box) return;
  if (bgPickOpen) { box.innerHTML = bgPickerHTML(); if (notifOpen) toggleNotif(false); }
  box.hidden = !bgPickOpen; if (btn) btn.setAttribute("aria-expanded", String(bgPickOpen));
}

function startWaves() {
  const c = document.getElementById("bg-waves"); if (!c || !c.getContext) return;
  const ctx = c.getContext("2d"); if (!ctx) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, cfg = null, last = 0, slow = 0, frames = 0, stopped = false, running = false;
  const style = () => document.documentElement.getAttribute("data-bg") || "neon";
  const readCfg = () => { const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim(); cfg = { c: [v("--wave-1"), v("--wave-2"), v("--wave-3")], a: parseFloat(v("--wave-alpha")) || .3, dark: v("--wave-mode") === "dark" }; };
  const resize = () => { const k = .75; W = innerWidth; H = innerHeight; c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k)); ctx.setTransform(k, 0, 0, k, 0, 0); };
  const ribbons = [
    { y: .24, amp: .085, f: 1.1, sp: .05, ci: 0, n: 26, spread: 70, ph: 0 },
    { y: .56, amp: .11, f: .8, sp: .035, ci: 1, n: 26, spread: 92, ph: 2.1 },
    { y: .82, amp: .07, f: 1.5, sp: .065, ci: 2, n: 20, spread: 58, ph: 4.2 }
  ];
  const silk = [
    { y: .34, amp: .16, f: .55, sp: .022, n: 46, spread: 150, ph: .4 },
    { y: .72, amp: .13, f: .7, sp: .028, n: 38, spread: 120, ph: 3.1 }
  ];
  const blobs = [
    { x: .18, y: .22, r: .55, ci: 0, fx: .07, fy: .05, ph: 0 },
    { x: .82, y: .2, r: .5, ci: 1, fx: .05, fy: .08, ph: 1.7 },
    { x: .7, y: .85, r: .6, ci: 2, fx: .06, fy: .04, ph: 3.3 },
    { x: .25, y: .8, r: .45, ci: 0, fx: .04, fy: .07, ph: 4.6 }
  ];
  const drawRibbons = (list, time, mono) => {
    for (const r of list) for (let k = 0; k < r.n; k++) {
      const u = k / (r.n - 1) - .5;
      const col = cfg.c[mono ? 0 : r.ci];
      ctx.strokeStyle = `rgba(${col}, ${(cfg.a * (mono ? .75 : 1) * (.22 + .78 * (1 - Math.abs(u) * 2))).toFixed(3)})`;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 14) {
        const p = x / W * Math.PI * 2 * r.f + time * r.sp * 6 + r.ph;
        const yy = H * r.y + Math.sin(p + u * .9) * H * r.amp * (1 + u * .6) + Math.sin(p * .5 + time * r.sp * 3) * H * .03 + u * r.spread;
        if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  };
  const draw = t => {
    ctx.clearRect(0, 0, W, H);
    const st = style(), time = t / 1000;
    if (st === "toza") return;
    ctx.globalCompositeOperation = cfg.dark ? "lighter" : "source-over";
    if (st === "aurora") {
      const R = Math.max(W, H);
      for (const b of blobs) {
        const x = W * (b.x + Math.sin(time * b.fx + b.ph) * .12), y = H * (b.y + Math.cos(time * b.fy + b.ph) * .1), r = R * b.r;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const a = Math.min(.85, cfg.a * (cfg.dark ? 1.1 : 1.9));
        g.addColorStop(0, `rgba(${cfg.c[b.ci]}, ${a.toFixed(3)})`); g.addColorStop(1, `rgba(${cfg.c[b.ci]}, 0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      return;
    }
    ctx.lineWidth = st === "ipak" ? .8 : 1.1;
    if (st === "ipak") drawRibbons(silk, time, true); else drawRibbons(ribbons, time, false);
  };
  const loop = t => {
    if (stopped || style() === "toza") { running = false; return; }
    const dt = t - last;
    if (dt >= 45) {
      last = t; draw(t); frames++;
      if (frames > 15 && dt > 110 && dt < 1000) slow++;
      if (slow > 12) { stopped = true; running = false; return; }
    }
    requestAnimationFrame(loop);
  };
  const kick = () => { if (!reduce && !stopped && !running && style() !== "toza") { running = true; requestAnimationFrame(loop); } };
  readCfg(); resize(); draw(performance.now());
  addEventListener("resize", () => { resize(); draw(performance.now()); });
  const themeChange = () => { readCfg(); draw(performance.now()); kick(); };
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", themeChange); } catch (e) {}
  try { new MutationObserver(themeChange).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode", "data-bg", "class", "style"] }); } catch (e) {}
  kick();
}
