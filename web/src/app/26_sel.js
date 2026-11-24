/* ================= liquid glass select dropdown ================= */
const SEL_STATE = { open: false, select: null, host: null, el: null, hiIdx: -1 };
const SEL_STATUS_COLORS = { new: "var(--new)", progress: "var(--progress)", review: "var(--review)", done: "var(--done)" };

function selEnsureEl(targetSelect) {
  const modalEl = document.getElementById("modal");
  const inModal = !!(modalEl && modalEl.open && modalEl.contains(targetSelect));
  const host = inModal ? modalEl : document.body;
  if (SEL_STATE.el && (SEL_STATE.host !== host || !SEL_STATE.el.isConnected)) {
    SEL_STATE.el.remove();
    SEL_STATE.el = null;
  }
  if (!SEL_STATE.el) {
    const box = document.createElement("div");
    box.id = "lg-sel";
    box.className = "lg-sel";
    box.setAttribute("role", "listbox");
    box.hidden = true;
    box.addEventListener("mousedown", e => {
      e.preventDefault();
      e.stopPropagation();
    });
    box.addEventListener("click", selHandleClick);
    host.appendChild(box);
    SEL_STATE.el = box;
    SEL_STATE.host = host;
  }
  return SEL_STATE.el;
}

function selPosition() {
  const el = SEL_STATE.el, sel = SEL_STATE.select;
  if (!el || !sel || el.hidden) return;
  const r = sel.getBoundingClientRect();
  const minW = sel.classList.contains("status-select") || sel.classList.contains("ai-alt") ? 184 : 200;
  const mw = Math.min(window.innerWidth - 20, Math.max(Math.round(r.width), minW));
  el.style.width = `${mw}px`;

  const list = el.querySelector(".lg-sel-list");
  if (list) list.style.maxHeight = "";
  const rawH = el.offsetHeight || 220;
  const spaceBelow = window.innerHeight - r.bottom - 12;
  const spaceAbove = r.top - 12;
  const placeAbove = spaceBelow < Math.min(rawH, 240) && spaceAbove > spaceBelow;
  const availH = Math.max(140, Math.min(320, placeAbove ? spaceAbove - 8 : spaceBelow - 8));
  if (list) list.style.maxHeight = `${availH}px`;

  const estH = el.offsetHeight || Math.min(rawH, availH + 12);
  let top = placeAbove ? r.top - estH - 6 : r.bottom + 6;
  top = Math.max(10, Math.min(window.innerHeight - estH - 10, Math.round(top)));
  let left = Math.round(r.left);
  if (left + mw > window.innerWidth - 10) left = Math.round(r.right - mw);
  left = Math.max(10, Math.min(window.innerWidth - mw - 10, left));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.classList.toggle("is-above", placeAbove);
}

function selRender() {
  const el = SEL_STATE.el, sel = SEL_STATE.select;
  if (!el || !sel) return;
  const isStatus = sel.id === "f-status" || sel.classList.contains("status-select");
  const chkSvg = `<svg class="lg-sel-chk" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>`;
  const allOpts = [...sel.options];
  const optHTML = opt => {
    const idx = allOpts.indexOf(opt);
    const active = idx === sel.selectedIndex;
    const hi = idx === SEL_STATE.hiIdx;
    const dotColor = isStatus ? SEL_STATUS_COLORS[opt.value] : "";
    const dot = dotColor ? `<i class="lg-sel-dot" style="background:${dotColor}" aria-hidden="true"></i>` : "";
    return `<button type="button" class="lg-sel-opt${active ? " is-selected" : ""}${hi ? " is-hi" : ""}${opt.disabled ? " is-disabled" : ""}" role="option" aria-selected="${active}" data-sel-idx="${idx}"${opt.disabled ? " disabled" : ""}>${dot}<span class="lg-sel-lbl">${esc(opt.textContent)}</span>${active ? chkSvg : ""}</button>`;
  };

  const parts = [];
  for (const child of sel.children) {
    if (child.tagName === "OPTGROUP") {
      const inner = [...child.children].filter(c => c.tagName === "OPTION").map(optHTML).join("");
      if (inner) parts.push(`<div class="lg-sel-grp">${esc(child.label)}</div>${inner}`);
    } else if (child.tagName === "OPTION") {
      parts.push(optHTML(child));
    }
  }
  el.innerHTML = `<div class="lg-sel-list">${parts.join("") || `<div class="lg-sel-empty">Tanlov yo'q</div>`}</div>`;

  const selectedBtn = el.querySelector(".lg-sel-opt.is-selected");
  if (selectedBtn) requestAnimationFrame(() => selectedBtn.scrollIntoView({ block: "nearest" }));
}

function selPick(idx) {
  const sel = SEL_STATE.select;
  if (!sel || idx < 0 || idx >= sel.options.length) return;
  const opt = sel.options[idx];
  if (!opt || opt.disabled) return;
  const prev = sel.selectedIndex;
  sel.selectedIndex = idx;
  selClose();
  if (prev !== idx) sel.dispatchEvent(new Event("change", { bubbles: true }));
}

function selOpen(sel) {
  if (!sel || sel.disabled || sel.multiple) return;
  if (SEL_STATE.open && SEL_STATE.select === sel) {
    selClose();
    return;
  }
  if (typeof calClose === "function" && typeof CAL_STATE !== "undefined" && CAL_STATE.open) calClose();
  if (typeof simMenuOpen !== "undefined" && simMenuOpen) toggleSimMenu(false);
  if (typeof notifOpen !== "undefined" && notifOpen) toggleNotif(false);
  if (typeof bgPickOpen !== "undefined" && bgPickOpen) toggleBgPick(false);

  SEL_STATE.select = sel;
  SEL_STATE.open = true;
  SEL_STATE.hiIdx = sel.selectedIndex;

  const el = selEnsureEl(sel);
  selRender();
  el.hidden = false;
  el.classList.remove("is-open");
  void el.offsetWidth;
  el.classList.add("is-open");
  sel.classList.add("lg-sel-active");
  selPosition();
}

function selClose() {
  if (SEL_STATE.select) SEL_STATE.select.classList.remove("lg-sel-active");
  if (SEL_STATE.el) {
    SEL_STATE.el.hidden = true;
    SEL_STATE.el.classList.remove("is-open");
  }
  SEL_STATE.open = false;
  SEL_STATE.select = null;
  SEL_STATE.hiIdx = -1;
}

function selHandleClick(e) {
  const btn = e.target.closest("[data-sel-idx]");
  if (!btn || btn.disabled) return;
  e.preventDefault();
  e.stopPropagation();
  selPick(Number(btn.dataset.selIdx));
}

function selMoveHi(dir) {
  const sel = SEL_STATE.select;
  if (!sel || !sel.options.length) return;
  const n = sel.options.length;
  let idx = SEL_STATE.hiIdx;
  for (let step = 0; step < n; step++) {
    idx = (idx + dir + n) % n;
    if (!sel.options[idx].disabled) break;
  }
  SEL_STATE.hiIdx = idx;
  if (!SEL_STATE.el) return;
  SEL_STATE.el.querySelectorAll(".lg-sel-opt").forEach(b => {
    const on = Number(b.dataset.selIdx) === idx;
    b.classList.toggle("is-hi", on);
    if (on) b.scrollIntoView({ block: "nearest" });
  });
}

document.addEventListener("mousedown", e => {
  const sel = e.target.closest && e.target.closest("select");
  if (sel && !sel.disabled && !sel.multiple) {
    e.preventDefault();
    sel.focus({ preventScroll: true });
    selOpen(sel);
    return;
  }
  if (SEL_STATE.open && SEL_STATE.el && !SEL_STATE.el.contains(e.target)) {
    selClose();
  }
}, true);

document.addEventListener("keydown", e => {
  if (SEL_STATE.open) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); selClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); selMoveHi(1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); selMoveHi(-1); return; }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); e.stopPropagation();
      if (SEL_STATE.hiIdx >= 0) selPick(SEL_STATE.hiIdx);
      return;
    }
    if (e.key === "Tab") { selClose(); }
    return;
  }
  const sel = e.target && e.target.tagName === "SELECT" ? e.target : null;
  if (sel && !sel.disabled && !sel.multiple && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    selOpen(sel);
  }
}, true);

window.addEventListener("resize", () => { if (SEL_STATE.open) selPosition(); }, { passive: true });
window.addEventListener("scroll", () => { if (SEL_STATE.open) selPosition(); }, true);
const _selModal = document.getElementById("modal");
if (_selModal) {
  _selModal.addEventListener("close", () => {
    if (typeof calClose === "function") calClose();
    selClose();
  });
}
