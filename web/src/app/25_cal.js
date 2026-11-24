/* ================= liquid glass calendar ================= */
const CAL_STATE = { open: false, input: null, host: null, el: null, viewYear: 2026, viewMonth: 0, mode: "days" };
const CAL_MONTH_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
const CAL_WD = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function calEnsureEl(targetInput) {
  const modalEl = document.getElementById("modal");
  const inModal = !!(modalEl && modalEl.open && modalEl.contains(targetInput));
  const host = inModal ? modalEl : document.body;
  if (CAL_STATE.el && (CAL_STATE.host !== host || !CAL_STATE.el.isConnected)) {
    CAL_STATE.el.remove();
    CAL_STATE.el = null;
  }
  if (!CAL_STATE.el) {
    const box = document.createElement("div");
    box.id = "lg-cal";
    box.className = "lg-cal";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Kalendar");
    box.hidden = true;
    box.addEventListener("mousedown", e => {
      // keep focus off native date picker while clicking inside calendar
      e.stopPropagation();
    });
    box.addEventListener("click", calHandleClick);
    host.appendChild(box);
    CAL_STATE.el = box;
    CAL_STATE.host = host;
  }
  return CAL_STATE.el;
}

function calPosition() {
  const el = CAL_STATE.el, inp = CAL_STATE.input;
  if (!el || !inp || el.hidden) return;
  const r = inp.getBoundingClientRect();
  const mw = Math.min(312, window.innerWidth - 20);
  el.style.width = `${mw}px`;
  const estH = el.offsetHeight || 348;
  const spaceBelow = window.innerHeight - r.bottom - 12;
  const spaceAbove = r.top - 12;
  const placeAbove = spaceBelow < estH && spaceAbove > spaceBelow;
  let top = placeAbove ? r.top - estH - 8 : r.bottom + 8;
  top = Math.max(10, Math.min(window.innerHeight - estH - 10, Math.round(top)));
  let left = Math.round(r.left);
  if (left + mw > window.innerWidth - 10) left = Math.round(r.right - mw);
  left = Math.max(10, Math.min(window.innerWidth - mw - 10, left));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.classList.toggle("is-above", placeAbove);
}

function calRender() {
  const el = CAL_STATE.el, inp = CAL_STATE.input;
  if (!el || !inp) return;
  const y = CAL_STATE.viewYear, m = CAL_STATE.viewMonth;
  const today = todayStr();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : "";
  const canClear = inp.id !== "att-date";
  const chevLeft = `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>`;
  const chevRight = `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>`;

  let bodyHTML = "";
  if (CAL_STATE.mode === "months") {
    bodyHTML = `
      <div class="lg-cal-yearbar">
        <button type="button" class="lg-cal-nav" data-cal="year-prev" aria-label="Oldingi yil">${chevLeft}</button>
        <span class="lg-cal-yearlbl">${y}</span>
        <button type="button" class="lg-cal-nav" data-cal="year-next" aria-label="Keyingi yil">${chevRight}</button>
      </div>
      <div class="lg-cal-months">
        ${CAL_MONTH_SHORT.map((lbl, idx) => {
          const isCur = idx === m;
          const isNow = y === new Date().getFullYear() && idx === new Date().getMonth();
          return `<button type="button" class="lg-cal-mbtn${isCur ? " is-selected" : ""}${isNow ? " is-today" : ""}" data-cal="pick-month" data-m="${idx}">${esc(lbl)}</button>`;
        }).join("")}
      </div>`;
  } else {
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday = 0 .. Sunday = 6
    const gridStart = new Date(y, m, 1 - startDow);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const val = ymd(d);
      const out = d.getMonth() !== m;
      const isToday = val === today;
      const isSel = val === selected;
      const wknd = (i % 7) >= 5;
      const cls = [
        "lg-cal-day",
        out ? "is-out" : "",
        isToday ? "is-today" : "",
        isSel ? "is-selected" : "",
        wknd ? "is-wknd" : "",
      ].filter(Boolean).join(" ");
      cells.push(`<button type="button" class="${cls}" data-cal="pick-day" data-v="${val}" aria-label="${esc(fmtDate(val))} ${d.getFullYear()}" aria-pressed="${isSel}">${d.getDate()}</button>`);
    }
    bodyHTML = `
      <div class="lg-cal-wd" aria-hidden="true">${CAL_WD.map((w, i) => `<span class="${i >= 5 ? "is-wknd" : ""}">${w}</span>`).join("")}</div>
      <div class="lg-cal-grid" role="grid">${cells.join("")}</div>`;
  }

  el.innerHTML = `
    <div class="lg-cal-head">
      <button type="button" class="lg-cal-title" data-cal="toggle-mode" aria-expanded="${CAL_STATE.mode === "months"}">
        <span>${esc(cap(MONTHS[m]))} ${y}</span>
        <svg class="lg-cal-caret" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
      </button>
      <div class="lg-cal-arrows">
        <button type="button" class="lg-cal-nav" data-cal="prev" aria-label="Oldingi oy">${chevLeft}</button>
        <button type="button" class="lg-cal-nav" data-cal="next" aria-label="Keyingi oy">${chevRight}</button>
      </div>
    </div>
    ${bodyHTML}
    <div class="lg-cal-foot">
      ${canClear ? `<button type="button" class="lg-cal-footbtn ghost" data-cal="clear">Tozalash</button>` : `<span></span>`}
      <button type="button" class="lg-cal-footbtn accent" data-cal="today">Bugun</button>
    </div>`;
}

function calApplyValue(val) {
  const inp = CAL_STATE.input;
  if (!inp) return;
  const changed = inp.value !== val;
  inp.value = val;
  calClose();
  if (changed) inp.dispatchEvent(new Event("change", { bubbles: true }));
}

function calOpen(inp) {
  if (!inp || inp.disabled || inp.readOnly) return;
  if (CAL_STATE.open && CAL_STATE.input === inp) {
    calClose();
    return;
  }
  const base = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? parseYmd(inp.value) : parseYmd(todayStr());
  CAL_STATE.input = inp;
  CAL_STATE.viewYear = base.getFullYear();
  CAL_STATE.viewMonth = base.getMonth();
  CAL_STATE.mode = "days";
  CAL_STATE.open = true;

  if (typeof selClose === "function" && typeof SEL_STATE !== "undefined" && SEL_STATE.open) selClose();
  if (typeof simMenuOpen !== "undefined" && simMenuOpen) toggleSimMenu(false);
  if (typeof notifOpen !== "undefined" && notifOpen) toggleNotif(false);
  if (typeof bgPickOpen !== "undefined" && bgPickOpen) toggleBgPick(false);

  const el = calEnsureEl(inp);
  calRender();
  el.hidden = false;
  el.classList.remove("is-open");
  void el.offsetWidth;
  el.classList.add("is-open");
  inp.classList.add("lg-cal-active");
  calPosition();
}

function calClose() {
  if (CAL_STATE.input) CAL_STATE.input.classList.remove("lg-cal-active");
  if (CAL_STATE.el) {
    CAL_STATE.el.hidden = true;
    CAL_STATE.el.classList.remove("is-open");
  }
  CAL_STATE.open = false;
  CAL_STATE.input = null;
}

function calHandleClick(e) {
  const btn = e.target.closest("[data-cal]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const act = btn.dataset.cal;
  if (act === "prev") {
    CAL_STATE.viewMonth -= 1;
    if (CAL_STATE.viewMonth < 0) { CAL_STATE.viewMonth = 11; CAL_STATE.viewYear -= 1; }
    calRender(); calPosition();
  } else if (act === "next") {
    CAL_STATE.viewMonth += 1;
    if (CAL_STATE.viewMonth > 11) { CAL_STATE.viewMonth = 0; CAL_STATE.viewYear += 1; }
    calRender(); calPosition();
  } else if (act === "year-prev") {
    CAL_STATE.viewYear -= 1;
    calRender(); calPosition();
  } else if (act === "year-next") {
    CAL_STATE.viewYear += 1;
    calRender(); calPosition();
  } else if (act === "toggle-mode") {
    CAL_STATE.mode = CAL_STATE.mode === "days" ? "months" : "days";
    calRender(); calPosition();
  } else if (act === "pick-month") {
    CAL_STATE.viewMonth = Number(btn.dataset.m);
    CAL_STATE.mode = "days";
    calRender(); calPosition();
  } else if (act === "pick-day") {
    calApplyValue(btn.dataset.v);
  } else if (act === "today") {
    calApplyValue(todayStr());
  } else if (act === "clear") {
    calApplyValue("");
  }
}

document.addEventListener("mousedown", e => {
  const inp = e.target.closest && e.target.closest('input[type="date"]');
  if (inp && !inp.disabled && !inp.readOnly) {
    e.preventDefault();
    calOpen(inp);
    return;
  }
  if (CAL_STATE.open && CAL_STATE.el && !CAL_STATE.el.contains(e.target)) {
    calClose();
  }
}, true);

document.addEventListener("click", e => {
  const inp = e.target.closest && e.target.closest('input[type="date"]');
  if (inp && !inp.disabled && !inp.readOnly) {
    e.preventDefault();
  }
}, true);

document.addEventListener("keydown", e => {
  const inp = e.target && e.target.matches && e.target.matches('input[type="date"]') ? e.target : null;
  if (inp && !inp.disabled && !inp.readOnly && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
    e.preventDefault();
    calOpen(inp);
    return;
  }
  if (e.key === "Escape" && CAL_STATE.open) {
    e.preventDefault();
    e.stopPropagation();
    calClose();
  }
}, true);

window.addEventListener("resize", () => { if (CAL_STATE.open) calPosition(); }, { passive: true });
window.addEventListener("scroll", () => { if (CAL_STATE.open) calPosition(); }, true);
