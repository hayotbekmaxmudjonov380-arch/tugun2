# Tugun web ilova (PWA)

Vite + `@supabase/supabase-js`. Ko'rinish va xatti-harakat eski ilovadan (`legacy/`) olingan.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
npm run smoke      # build'ni ochib tekshiradi (Playwright kerak)
```

- `src/app/*.js` — eski ilova modullari. Ular fayl nomi tartibida bitta ES modulga qo'shiladi
  (`vite.config.js` dagi `tugun-app` plagini), xuddi `legacy/build.py` kabi.
- `src/app/10_db.js` — ma'lumotlar qatlami. Hozir namuna ma'lumotlar bilan sinov rejimida ishlaydi;
  4-qadamda Supabase so'rovlari + Realtime bilan almashtiriladi.
- `src/supabase.js` — Supabase mijozi. URL va publishable key `../.env.example`dan olinadi
  (`.env.local` yoki hosting sozlamalari ustun turadi). Maxfiy kalitlar bu yerga hech qachon yozilmaydi.
- `public/` — PWA manifest, ikonkalar, `sw.js` (sahifa: avval tarmoq; `/assets/*` va shriftlar: avval kesh;
  Supabase so'rovlari keshlanmaydi).
- Joylash: Vercel, Root Directory = `web` (`vercel.json` tayyor). Boshqa hosting ham bo'ladi: `dist/` oddiy statik papka.
