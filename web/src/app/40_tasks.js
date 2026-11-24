/* ----- Tasklar ----- */
function filteredTasks() {
  const f = S.tf, q = normQ(f.q).trim(), me = myStaffId();
  return tasks().filter(t => {
    if (f.status !== "all" && stateOf(t) !== f.status) return false;
    if (f.mine && me && !(t.ownerId === me || (t.staffIds || []).includes(me))) return false;
    if (f.dept !== "all") {
      if (f.dept.startsWith("b:")) { const b = f.dept.slice(2); if (!tDepts(t).some(d => d.branch === b)) return false; }
      else if (!hasDept(t, f.dept.slice(2))) return false;
    }
    if (q) {
      const hay = normQ([t.title, t.desc, personName(t.ownerId), ...tStaff(t).map(p => p.name), ...tDepts(t).map(d => d.name)].join(" "));
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort(byDue);
}
function viewTasks() {
  if (!S.loaded.org || !S.loaded.tasks) return loadingBlock();
  const f = S.tf, all = tasks(), me = myStaffId();
  const counts = { all: all.length, new: 0, progress: 0, review: 0, overdue: 0, done: 0 };
  all.forEach(t => counts[stateOf(t)]++);
  const opts = [`<option value="all">Barcha bo'limlar</option>`].concat(branches().map(b => `<optgroup label="${esc(b.name)}"><option value="b:${esc(b.id)}"${f.dept === "b:" + b.id ? " selected" : ""}>${esc(b.name)}: barchasi</option>${depts(b.id).map(d => `<option value="d:${esc(d.id)}"${f.dept === "d:" + d.id ? " selected" : ""}>${esc(d.name)}</option>`).join("")}</optgroup>`)).join("");
  const noOwner = all.filter(t => t.status !== "done" && !S.org.staff[t.ownerId]).length;
  return `
  <div class="view-head"><h2>Tasklar</h2><p>Har bir task qaysi bo'limlar va xodimlar zimmasida, kim mas'ul, qachon yakunlanishi va hozirgi holati.</p></div>
  ${noOwner ? `<p class="note warn-note">${noOwner} ta faol taskning mas'uli yo'q. Har bir taskka bitta mas'ul tayinlang: shunda javobgarlik aniq bo'ladi.</p>` : ""}
  <div class="toolbar">
    <label class="sr" for="tq">Qidirish</label><input type="search" id="tq" value="${esc(f.q)}" placeholder="Task, xodim yoki bo'lim">
    ${me ? `<button type="button" class="btn tiny${f.mine ? " primary" : ""}" data-action="tf-mine" aria-pressed="${f.mine}">Mening tasklarim</button>` : ""}
    <div class="seg" role="group" aria-label="Holat bo'yicha">${["all","new","progress","review","overdue","done"].map(k => `<button type="button" data-action="tf-status" data-v="${k}" aria-pressed="${f.status === k}">${k === "all" ? "Hammasi" : STATE_LABEL[k]}<span class="n">${counts[k]}</span></button>`).join("")}</div>
    <label class="sr" for="tdept">Bo'lim</label><select id="tdept" data-change="tf-dept">${opts}</select>
    <div class="seg" role="group" aria-label="Ko'rinish"><button type="button" data-action="tf-mode" data-v="table" aria-pressed="${f.mode === "table"}">Jadval</button><button type="button" data-action="tf-mode" data-v="gantt" aria-pressed="${f.mode === "gantt"}">Muddatlar grafigi</button></div>
  </div>
  <div id="task-results">${taskResults()}</div>`;
}
function taskResults() {
  const list = filteredTasks();
  if (!list.length) return `<p class="note">${tasks().length ? "Tanlangan shartlarga mos task topilmadi." : "Hali task yo'q. «Yangi task» tugmasi bilan birinchisini qo'shing."}</p>`;
  return S.tf.mode === "gantt" ? ganttHTML(list) : tableHTML(list);
}
function tableHTML(list) {
  return `<div class="table-wrap" id="tasks-scroll" data-keep-scroll><table class="tasks">
    <thead><tr><th scope="col">Task</th><th scope="col">Mas'ul</th><th scope="col">Qaysi bo'limlar</th><th scope="col">Ijrochilar</th><th scope="col">Muddat</th><th scope="col">Holat</th><th scope="col">Bajarilish</th></tr></thead>
    <tbody>${list.map(t => {
      const st = stateOf(t), info = dueInfo(t), ds = tDepts(t), ps = tStaff(t).filter(p => p.id !== t.ownerId), o = t.ownerId ? getPerson(t.ownerId) : null;
      return `<tr class="s-${st}">
        <td><button type="button" class="link" data-action="open-task" data-id="${esc(t.id)}">${esc(t.title)}</button>${t.desc ? `<div class="sub">${esc(String(t.desc).slice(0, 110))}${String(t.desc).length > 110 ? "…" : ""}</div>` : ""}</td>
        <td>${o ? `<button type="button" class="owner-cell" data-action="open-person" data-id="${esc(o.id)}">${avatar(o)}<span><b>${esc(shortName(o.name))}</b><small>${esc(getDept(o.deptId)?.name || "")}</small></span></button>` : `<span class="owner none">Mas'ul yo'q</span>`}</td>
        <td><div class="dept-count"><strong>${ds.length}</strong> bo'lim</div><div class="chips">${ds.map(d => `<a class="chip" href="#bolim-${esc(d.id)}">${esc(d.name)}<small>${esc(branchName(d.branch))}</small></a>`).join("")}</div></td>
        <td>${ps.length ? `<div class="avatars">${ps.slice(0, 6).map(p => avatar(p)).join("")}${ps.length > 6 ? `<span class="av">+${ps.length - 6}</span>` : ""}</div>` : `<span class="muted">—</span>`}</td>
        <td><span class="mono">${esc(fmtDate(t.start))} → ${esc(fmtDate(t.due))}</span><div class="due ${info.cls}">${esc(info.text)}</div></td>
        <td>${can.progress(t) ? `<label class="sr" for="st-${esc(t.id)}">Holat</label><select id="st-${esc(t.id)}" class="status-select s-${st}" data-change="task-status" data-id="${esc(t.id)}">${EDIT_STATUSES.map(s => `<option value="${s}"${t.status === s ? " selected" : ""}>${STATE_LABEL[s]}</option>`).join("")}</select>${st === "overdue" ? `<div class="due crit">Muddati o'tgan</div>` : ""}` : `<span class="pill s-${st}">${STATE_LABEL[st]}</span>`}</td>
        <td><div class="prog-cell"><span class="bar"><i style="width:${pct(t)}%"></i></span><span>${pct(t)}%</span></div></td>
      </tr>`; }).join("")}</tbody></table></div>`;
}
function ganttHTML(list) {
  const today = todayStr();
  const pts = list.flatMap(t => [t.start, t.due]).filter(Boolean).concat([addDays(today, -3), addDays(today, 7)]).sort();
  let s = addDays(pts[0], -1), e = addDays(pts[pts.length - 1], 1);
  let D = diffDays(s, e) + 1; if (D > 370) { e = addDays(s, 369); D = 370; }
  const frac = date => diffDays(s, date) / D;
  const dense = D <= 62;
  let months = "", days = "", grid = "";
  for (let i = 0; i < D; i++) {
    const ds = addDays(s, i), dt = parseYmd(ds), wd = dt.getDay();
    const cls = `${isWorkday(ds) ? "" : "wk"}${ds === today ? " today" : ""}`;
    days += `<span class="g-day ${cls}">${dense || wd === 1 ? `<b>${dt.getDate()}</b>${dense ? `<i>${WD[wd]}</i>` : ""}` : ""}</span>`;
    grid += `<span class="${cls}"></span>`;
    if (i === 0 || (dt.getDate() === 1 && D - i >= 4)) months += `<span class="g-month" style="left:${(i / D * 100).toFixed(3)}%">${esc(cap(MONTHS[dt.getMonth()]))} ${dt.getFullYear()}</span>`;
  }
  const rows = list.map(t => {
    const st = stateOf(t);
    let a = t.start || t.due, b = t.due || t.start; if (a > b) [a, b] = [b, a];
    const left = clamp(frac(a), 0, 1) * 100, width = Math.max(0.6, Math.min(100 - left, (diffDays(a, b) + 1) / D * 100));
    let late = "", end = left + width;
    if (st === "overdue") { const l = frac(addDays(b, 1)) * 100, w = diffDays(b, today) / D * 100; late = `<span class="g-late" style="left:${l.toFixed(3)}%;width:${w.toFixed(3)}%" title="${diffDays(b, today)} kun kechikish"></span>`; end = l + w; }
    const info = dueInfo(t);
    const label = st === "done" ? esc(info.text) : `${esc(fmtDate(b))} · ${esc(info.text)}`;
    let pos, inside = "";
    if (end < 74) pos = `left:calc(${end.toFixed(3)}% + 8px)`;
    else if (left > 26) pos = `right:calc(${(100 - left).toFixed(3)}% + 8px)`;
    else { pos = `right:calc(${(100 - Math.min(end, 100)).toFixed(3)}% + 6px)`; inside = " inside"; }
    const o = t.ownerId ? getPerson(t.ownerId) : null;
    return `<div class="g-row s-${st}">
      <button type="button" class="g-label" data-action="open-task" data-id="${esc(t.id)}"><span class="g-title">${esc(t.title)}</span><span class="g-meta">${o ? `${esc(shortName(o.name))} · ` : ""}${tDepts(t).length} bo'lim · ${STATE_LABEL[st]} · ${pct(t)}%</span></button>
      <div class="g-track"><span class="g-bar" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%" title="${esc(fmtDate(a))} → ${esc(fmtDate(b))}"><i style="width:${pct(t)}%"></i></span>${late}<span class="g-due${info.cls === "crit" ? " crit" : ""}${inside}" style="${pos}">${label}</span></div>
    </div>`;
  }).join("");
  return `<div class="gantt-wrap" id="gantt-scroll" data-keep-scroll><div class="gantt" style="--days:${D};--day:${dense ? 26 : 12}px">
    <div class="g-head"><div class="g-corner">Task</div><div class="g-scale"><div class="g-months">${months}</div><div class="g-days">${days}</div></div></div>
    <div class="g-body"><div class="g-grid" aria-hidden="true">${grid}</div>${rows}</div>
  </div></div>`;
}
