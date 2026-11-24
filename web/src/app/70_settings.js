/* ----- brand ----- */
function brandMark(size = 34) {
  // a knot: two threads (departments) crossing at one node (the owner)
  return `<svg width="${size}" height="${size}" viewBox="0 0 34 34" aria-hidden="true" class="brand-mark">
    <rect width="34" height="34" rx="9" fill="var(--ink)"/>
    <path d="M7 10.5C13 10.5 14 23.5 27 23.5" stroke="#34C759" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M7 23.5C13 23.5 14 10.5 27 10.5" stroke="#0A84FF" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="17" cy="17" r="4.2" fill="var(--paper)"/><circle cx="17" cy="17" r="2" fill="var(--ink)"/>
  </svg>`;
}

/* ----- Sozlamalar ----- */
function viewSettings() {
  if (!S.loaded.org) return loadingBlock();
  const ro = !can.structure(), dis = ro ? " disabled" : "";
  const bl = branches(), st = settings();
  const nStaff = allStaff().length;
  const demoStaff = Object.values(S.org.staff).filter(p => p.demo).length;
  const demoTasks = tasks().filter(t => t.demo).length;
  const pins = S.pins && S.pins.pins ? S.pins.pins : {};
  const capPct = Math.min(100, Math.round(nStaff / st.maxStaff * 100));
  return `
  <div class="view-head"><h2>Sozlamalar</h2><p>Tuzilma, xodimlar, rollar, davomat terminali va qoidalar. Bu yerdagi o'zgarishlar hammaga darhol ko'rinadi.</p></div>
  ${ro && S.conn === "live" ? `<p class="note">Sozlamalarni faqat rahbar o'zgartira oladi. Sizning rolingiz: <b>${esc(ROLE_LABEL[myRole()])}</b>.</p>` : ""}
  <div class="settings-grid">
    <section class="panel wide">
      <div class="panel-head"><h3>Bo'limlar va xodimlar</h3>
        <div class="capacity" title="Tugun ${st.maxStaff} xodimgacha bo'lgan korxonalar uchun mo'ljallangan"><span>${nStaff} / ${st.maxStaff} xodim</span><span class="meter${capPct >= 90 ? " warn" : ""}"><i style="width:${capPct}%"></i></span></div>
      </div>
      <p class="muted">★ belgisi bo'lim boshlig'ini bildiradi. Har bir xodim yonida PIN (terminal uchun) va bog'langan Claude hisobi holati ko'rsatilgan.</p>
      <div class="set-branches">${bl.map(b => `<div class="set-branch"><h4>${esc(b.name)}</h4>
        ${depts(b.id).map((d, i, arr) => `<div class="set-dept">
          <div class="set-dept-head"><span class="dept-tab sm">${esc(d.name)}</span><span class="muted">${esc(d.workStart || "09:00")}–${esc(d.workEnd || "18:00")}</span>
            ${ro ? "" : `<span class="set-actions"><button type="button" class="icon-btn sm" data-action="move-dept" data-id="${esc(d.id)}" data-dir="-1" aria-label="${esc(d.name)}: yuqoriga"${i === 0 ? " disabled" : ""}>↑</button><button type="button" class="icon-btn sm" data-action="move-dept" data-id="${esc(d.id)}" data-dir="1" aria-label="${esc(d.name)}: pastga"${i === arr.length - 1 ? " disabled" : ""}>↓</button><button type="button" class="btn tiny ghost" data-action="edit-dept" data-id="${esc(d.id)}">Tahrirlash</button><button type="button" class="btn tiny" data-action="new-staff" data-dept="${esc(d.id)}"${nStaff >= st.maxStaff ? " disabled" : ""}>+ Xodim</button></span>`}
          </div>
          <ol class="set-staff">${staffOf(d.id).map((p, j, arr2) => `<li><div>
            <button type="button" class="link" data-action="open-person" data-id="${esc(p.id)}">${esc(p.name)}</button>${d.headId === p.id ? `<i class="crown" title="Bo'lim boshlig'i">★</i>` : ""}${p.access === "rahbar" ? `<span class="tag role">Rahbar</span>` : ""}
            ${p.role ? `<span class="muted">${esc(p.role)}</span>` : ""}
            <span class="flags">${pins[p.id] ? `<span class="tag ok" title="Terminal PIN'i o'rnatilgan">PIN</span>` : `<span class="tag" title="Terminal PIN'i yo'q">PIN yo'q</span>`}${p.userId ? `<span class="tag ok" title="Claude hisobi bog'langan">Hisob</span>` : ""}${p.demo ? `<span class="tag demo">namuna</span>` : ""}</span>
            ${ro ? "" : `<span class="set-actions"><button type="button" class="icon-btn sm" data-action="move-staff" data-id="${esc(p.id)}" data-dir="-1" aria-label="${esc(p.name)}: yuqoriga"${j === 0 ? " disabled" : ""}>↑</button><button type="button" class="icon-btn sm" data-action="move-staff" data-id="${esc(p.id)}" data-dir="1" aria-label="${esc(p.name)}: pastga"${j === arr2.length - 1 ? " disabled" : ""}>↓</button><button type="button" class="btn tiny ghost" data-action="edit-staff" data-id="${esc(p.id)}">Tahrirlash</button></span>`}
          </div></li>`).join("") || `<li class="muted">Xodim yo'q</li>`}</ol>
        </div>`).join("")}
        ${ro ? "" : `<button type="button" class="btn tiny" data-action="new-dept" data-branch="${esc(b.id)}" style="justify-self:start">+ Bo'lim qo'shish (${esc(b.name)})</button>`}
      </div>`).join("") || `<p class="muted">Tarmoq yo'q.</p>`}</div>
    </section>
    <section class="panel roles-panel">
      <h3>Rollar va huquqlar</h3>
      <table class="roles">
        <thead><tr><th></th><th>Rahbar</th><th>Bo'lim boshlig'i</th><th>Xodim</th></tr></thead>
        <tbody>
          <tr><td>Tuzilma, xodimlar, PIN</td><td>✓</td><td>—</td><td>—</td></tr>
          <tr><td>Task yaratish</td><td>✓</td><td>✓</td><td>—</td></tr>
          <tr><td>Taskni tahrirlash</td><td>hammasi</td><td>o'z bo'limi</td><td>mas'ul bo'lganlari</td></tr>
          <tr><td>Holat va foiz</td><td>✓</td><td>✓</td><td>ijrochi bo'lganlari</td></tr>
          <tr><td>Izoh va fayl</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>Davomatni tuzatish</td><td>✓</td><td>o'z bo'limi*</td><td>—</td></tr>
          <tr><td>Nizom va yo'riqnomalarni yozish</td><td>✓</td><td>—</td><td>—</td></tr>
          <tr><td>Tanishuv holatini ko'rish</td><td>✓</td><td>o'z bo'limi</td><td>o'zi</td></tr>
        </tbody>
      </table>
      ${S.sandbox ? "" : `<button type="button" class="btn tiny" data-action="start-sandbox" style="justify-self:start">Boshqa rol ko'zi bilan ko'rish</button>`}
      <p class="hint">Rol xodim kartasi orqali beriladi: rahbar xodimning Claude hisobini uning kartasiga bog'laydi. * Davomat va PIN server darajasida himoyalangan: ularni o'zgartirish uchun sahifada «Editor» huquqi kerak. Bo'lim boshlig'iga davomatni tuzatish ishonib topshirilsa, unga «Editor» huquqini bering.</p>
    </section>
    <section class="panel">
      <h3>Davomat terminali</h3>
      <p>Kirish eshigi yoniga planshet qo'ying va unda terminalni oching. Xodim kelganda va ketganda shaxsiy PIN kodini teradi. Vaqtni xodimning o'zi o'zgartira olmaydi.</p>
      <ol class="steps"><li>Har bir xodim kartasida PIN o'rnating (${st.pinLen} raqam).</li><li>Planshet uchun alohida Claude hisobi oching va unga sahifada «Editor» huquqini bering.</li><li>Planshetda Tugun'ni ochib, «Terminalni ochish»ni bosing.</li></ol>
      <label class="field"><span>PIN uzunligi</span><select id="set-pinlen" data-change="set-pinlen"${dis}>${[4, 5, 6].map(n => `<option value="${n}"${st.pinLen === n ? " selected" : ""}>${n} raqam</option>`).join("")}</select></label>
      ${can.kiosk() ? `<a class="btn primary" href="#kiosk" style="justify-self:start">Terminalni ochish</a>` : ""}
    </section>
    <section class="panel">
      <h3>Davomat qoidalari</h3>
      <label class="field"><span>Kechikish hisoblanmaydigan vaqt, daqiqa</span><input type="number" id="set-grace" min="0" max="120" step="1" value="${st.grace}" data-change="set-grace"${dis}></label>
      <fieldset class="field"><legend>Ish kunlari</legend><div class="wd-picks">${WD_ORDER.map(w => `<label class="pick"><input type="checkbox" value="${w}" data-change="set-wd"${st.workDays.includes(w) ? " checked" : ""}${dis}><span>${WD_LONG[w]}</span></label>`).join("")}</div></fieldset>
    </section>
    <section class="panel">
      <h3>Tarmoqlar</h3>
      <p class="muted">Sxemadagi asosiy bloklar. Juft tartibdagi tarmoq sxemada o'ng tomonda, ko'zgu ko'rinishida chiziladi.</p>
      <ul class="plain">${bl.map(b => `<li class="row"><label class="sr" for="br-${esc(b.id)}">Tarmoq nomi</label><input type="text" id="br-${esc(b.id)}" value="${esc(b.name)}" data-change="branch-name" data-id="${esc(b.id)}" maxlength="24"${dis}><span class="muted">${depts(b.id).length} bo'lim</span>${!ro && !depts(b.id).length ? `<button type="button" class="btn tiny danger" data-action="del-branch" data-id="${esc(b.id)}">O'chirish</button>` : ""}</li>`).join("")}</ul>
      ${ro ? "" : `<button type="button" class="btn tiny" data-action="add-branch" style="justify-self:start">+ Tarmoq qo'shish</button>`}
    </section>
    ${demoStaff || demoTasks ? `<section class="panel">
      <h3>Namuna ma'lumotlar</h3>
      <p>Tanishish uchun ${demoStaff} ta namuna xodim, ${demoTasks} ta namuna task, ularning davomati, PIN'lari va nizom tasdiqlari kiritilgan. Nizom va lavozim yo'riqnomalari o'chirilmaydi: ular sizning loyihangiz. Siz tahrirlagan yozuvlar namuna hisoblanmaydi va o'chirilmaydi.</p>
      ${ro ? "" : `<button type="button" class="btn danger" data-action="clear-demo" style="justify-self:start">Namunalarni o'chirish</button>`}
    </section>` : ""}
  </div>`;
}

/* ----- Qo'llanma ----- */
function viewHelp() {
  const card = (n, title, items, href, label) => `<article class="help-card"><span class="num-badge">${n}</span><h3>${title}</h3><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>${href ? `<a class="btn" href="${href}">${label}</a>` : ""}</article>`;
  return `
  <div class="view-head"><h2>Tugun usuli</h2><p>Tugun matritsali tashkilot g'oyasiga qurilgan: xodim o'z bo'limida ishlaydi, lekin bir nechta bo'lim birga bajaradigan ishlarda ham qatnashadi. Shunday har bir umumiy ish bu tugun.</p></div>
  <section class="method">
    <div class="rule"><b>1</b><h3>Har bir xodimning bitta uyi bor</h3><p>Bu uning bo'limi. Ish vaqti, davomat va bo'lim boshlig'i shu yerdan keladi.</p></div>
    <div class="rule"><b>2</b><h3>Bo'limlararo ish bu tugun</h3><p>Bir task bir nechta bo'limni bog'laydi. Sxemada taskni bossangiz, tugunga kirgan bo'limlar yonadi.</p></div>
    <div class="rule"><b>3</b><h3>Har bir tugunning bitta egasi bor</h3><p>Ijrochilar ko'p bo'lishi mumkin, javobgar esa bitta: mas'ul. Uning bo'limi yetakchi bo'lim hisoblanadi.</p></div>
  </section>
  <div class="help-grid">
    ${card(1, "Tuzilma", ["Chapda <b>B2B</b>, o'ngda <b>B2C</b>. Bo'lim nomi ustiga <b>kursorni olib boring</b>: xodimlar ro'yxati ochiladi (telefonda ▾ tugmasi).", "Taskni tanlasangiz, unga kirgan bo'limlar va <b>★ mas'ul</b> ajralib turadi.", "<b>⌘K</b> yoki <b>Ctrl+K</b> bilan istalgan xodim, bo'lim yoki taskni bir zumda toping."], "#tuzilma", "Tuzilmani ochish")}
    ${card(2, "Tasklar", ["Har bir taskda bitta <b>mas'ul</b>, bir nechta ijrochi va bo'lim bo'ladi.", "Task ichida <b>izohlar</b>, <b>fayllar</b> (rasm, PDF) va o'zgarishlar <b>tarixi</b> bor.", "«Mening tasklarim» tugmasi faqat siz qatnashgan tasklarni ko'rsatadi."], "#tasklar", "Tasklarni ochish")}
    ${card(3, "Davomat terminali", ["Kirishdagi planshetda xodim <b>PIN</b> teradi: birinchi marta kelish, ikkinchi marta ketish belgilanadi.", "Qo'lda tuzatish faqat <b>sabab bilan</b> va «Qo'lda» belgisi bilan saqlanadi.", "Oylik hisobotda har bir xodimning qo'lda tuzatilgan kunlari soni ko'rinadi."], "#davomat", "Davomatni ochish")}
    ${card(4, "Bildirishnomalar", ["Yuqoridagi <b>qo'ng'iroqcha</b>: sizga tegishli yangi tasklar, izohlar, muddati yaqinlashganlar.", "Bo'lim boshlig'i o'z bo'limi kechikishlarini, rahbar butun kompaniyani ko'radi.", "Hozircha faqat dastur ichida. Telegram yoki SMS uchun alohida o'rnatiladigan versiya kerak."], "", "")}
    ${card(5, "Dashboard", ["Umumiy bajarilish, holatlar, bo'limlar faolligi reytingi.", "<b>Xodimlar yuklamasi</b>: kim nechta taskda mas'ul va ijrochi.", "<b>So'nggi faoliyat</b>: 7 kunlik o'zgarishlar lentasi."], "#dashboard", "Dashboardni ochish")}
    ${card(7, "Nizom", ["<b>Kompaniya nizomi</b> va har bir <b>lavozim yo'riqnomasi</b>: vazifalar, kunlik tartib, natija ko'rsatkichlari, birinchi hafta.", "Xodim o'qib, <b>«Tanishdim»</b> tugmasini bosadi. Matn o'zgarsa, qayta tasdiq so'raladi.", "Rahbar «Tanishuv holati»da kim o'qigan, kim o'qimaganini ko'radi."], "#nizom", "Nizomni ochish")}
    ${card(6, "Rollar", ["<b>Rahbar</b>: hamma narsa. <b>Bo'lim boshlig'i</b>: o'z bo'limi tasklari va davomati. <b>Xodim</b>: o'z tasklari va izohlar.", "Rol xodim kartasiga Claude hisobini bog'lash orqali beriladi.", "Sinov rejimida «Kim sifatida ko'rish» orqali har bir rolni sinab ko'ring."], "#sozlamalar", "Sozlamalarni ochish")}
  </div>`;
}
