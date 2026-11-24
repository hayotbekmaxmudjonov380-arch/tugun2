/* ================= rendering core ================= */
let rafId = 0;
function schedule() { if (rafId) return; rafId = requestAnimationFrame(() => { rafId = 0; render(); }); }
const main = () => document.getElementById("view");
function render() {
  const view = main();
  const ae = document.activeElement;
  const keep = ae && ae.id && view.contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
  const scrolls = $$("[data-keep-scroll]", view).map(el => [el.id, el.scrollLeft, el.scrollTop]);
  S.lastMinute = nowHM();
  document.body.classList.toggle("kiosk-on", S.view === "kiosk");
  renderChrome();
  let html = "";
  if (S.view === "bolim") html = viewDept();
  else if (S.view === "tasklar") html = viewTasks();
  else if (S.view === "davomat") html = viewAtt();
  else if (S.view === "sozlamalar") html = viewSettings();
  else if (S.view === "qollanma") html = viewHelp();
  else if (S.view === "dashboard") html = viewDash();
  else if (S.view === "nizom") html = viewNizom();
  else if (S.view === "kiosk") html = viewKiosk();
  else html = viewOrg();
  view.innerHTML = html;
  scrolls.forEach(([id, l, t]) => { const el = document.getElementById(id); if (el) { el.scrollLeft = l; el.scrollTop = t; } });
  postRender();
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus({ preventScroll: true }); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
  if (notifOpen) renderNotif();
  if (dlg.open && modalCtx && modalCtx.type === "task") refreshTaskModal();
}
function renderChrome() {
  $$("[data-nav]").forEach(a => { const on = a.dataset.nav === S.view || (S.view === "bolim" && a.dataset.nav === "tuzilma"); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  const role = myRole(), pid = myStaffId();
  const who = $("#whoami");
  if (who) {
    const p = pid ? getPerson(pid) : null;
    who.innerHTML = `<span class="av sm">${esc(p ? initials(p.name) : role === "rahbar" ? "R" : "?")}</span><span class="who-txt"><b>${esc(p ? shortName(p.name) : ROLE_LABEL[role])}</b><small>${esc(S.sandbox ? "Sinov rejimi" : S.conn === "live" ? (p ? ROLE_LABEL[role] : (S.canWrite ? "Jonli, saqlanadi" : "Faqat ko'rish")) : "Ulanmoqda")}</small></span>`;
    who.className = "whoami" + (S.sandbox ? " demo" : S.conn === "live" ? " live" : "");
  }
  const nb = $("#top-new"); if (nb) nb.hidden = !(can.createTask() && Object.keys(S.org.departments).length);
  const bell = $("#bell-n"); if (bell) { const n = notifData().unread; bell.textContent = n > 9 ? "9+" : String(n); bell.hidden = !n; }
  const msgs = [];
  if (S.sandbox) {
    const opts = [`<option value="rahbar|"${S.sim && S.sim.role === "rahbar" ? " selected" : ""}>Rahbar (hamma narsa)</option>`]
      .concat(deptsOrdered().map(d => {
        const ppl = staffOf(d.id); if (!ppl.length) return "";
        return `<optgroup label="${esc(d.name)} · ${esc(branchName(d.branch))}">${ppl.map(p => { const r = idx().headOf[p.id] ? "boshliq" : (p.access === "rahbar" ? "rahbar" : "xodim"); const v = `${r}|${p.id}`; const sel = S.sim && S.sim.staffId === p.id ? " selected" : ""; return `<option value="${esc(v)}"${sel}>${esc(p.name)} · ${esc(ROLE_LABEL[r])}</option>`; }).join("")}</optgroup>`;
      })).join("");
    msgs.push(["warn", S.sandboxAuto
      ? "Sinov rejimi: namuna ma'lumotlar. Hamma tugmalar ishlaydi, o'zgarishlar faqat shu oynada qoladi."
      : "Sinov rejimi: bemalol bosib ko'ring, o'zgarishlar hech kimga ta'sir qilmaydi.",
      `<label class="sim"><span>Kim sifatida ko'rish:</span><select id="sim-role" data-change="sim-role">${opts}</select></label>${S.sandboxAuto ? "" : `<button type="button" class="btn tiny" data-action="exit-sandbox">Haqiqiy ma'lumotlarga qaytish</button>`}`]);
  } else {
    if (S.slow && !allLoaded()) msgs.push(["warn", "Ma'lumotlar hali yuklanmadi. Internet aloqasini tekshiring, sahifa o'zi qayta urinadi."]);
    if (Object.keys(S.errors).length) msgs.push(["crit", "Ma'lumotlarning bir qismini o'qib bo'lmadi. Sahifani keyinroq qayta oching."]);
    if (S.conn === "live" && !S.canWrite) msgs.push(["info", "Sizda faqat ko'rish huquqi bor. Dasturni o'zingiz sinab ko'rmoqchi bo'lsangiz, sinov rejimini yoqing: o'zgarishlar faqat sizning oynangizda qoladi.", `<button type="button" class="btn primary tiny" data-action="start-sandbox">Sinov rejimi</button>`]);
    else if (S.conn === "live" && S.me.known && role === "mehmon") msgs.push(["info", "Siz hali xodimlar ro'yxatiga bog'lanmagansiz. Rahbar Sozlamalarda hisobingizni xodim kartangizga ulaganda, o'z tasklaringiz va bildirishnomalaringiz ko'rinadi."]);
  }
  $("#banner").innerHTML = S.view === "kiosk" ? "" : msgs.map(([t, m, extra]) => `<div class="banner ${t}"><span>${esc(m)}</span>${extra || ""}</div>`).join("");
}
const loadingBlock = () => `<p class="loading">Ma'lumotlar yuklanmoqda…</p>`;
const stat = (v, label, cls = "") => `<span class="stat ${cls}"><b>${esc(v)}</b><span>${esc(label)}</span></span>`;
const avatar = (p, cls = "") => `<span class="av ${cls}" title="${esc(p ? p.name : "")}">${esc(p ? initials(p.name) : "?")}</span>`;
function ownerChip(t) {
  const o = t.ownerId ? getPerson(t.ownerId) : null;
  if (!o) return `<span class="owner none" title="Mas'ul tayinlanmagan">Mas'ul yo'q</span>`;
  return `<span class="owner" title="Mas'ul: ${esc(o.name)}">${avatar(o, "xs")}<span>${esc(shortName(o.name))}</span></span>`;
}
