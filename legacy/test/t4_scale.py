"""Scale check: 100 staff, 60 tasks, a month of attendance. Measures render time of each view."""
import asyncio, copy, json, random, sys
sys.path.insert(0, "/home/claude/tugun/test")
from t1_owner import new_page, check, URL, OUT, SEED
from playwright.async_api import async_playwright

random.seed(7)
FIRST = ["Aziz", "Dilnoza", "Sardor", "Jasur", "Malika", "Bekzod", "Rustam", "Anvar", "Shoxrux", "Nigora", "Kamola", "Otabek", "Farhod", "Zarina", "Madina", "Behruz", "Gulnoza", "Islom", "Doniyor", "Sherzod", "Laylo", "Akmal", "Sanjar", "Mansur", "Nodira", "Umid", "Feruza", "Javlon"]
LAST = ["Karimov", "Yusupova", "Rahimov", "Toshmatov", "Ergasheva", "Qodirov", "Xolmatov", "Sobirov", "Nazarov", "Alimova", "Saidova", "Mirzayev", "Umarov", "Hasanova"]

def big_seed(n_staff=100, n_tasks=60):
    s = copy.deepcopy(SEED)
    org = s["org/structure"]; depts = list(org["departments"].keys())
    org["staff"] = {}
    for i in range(n_staff):
        d = depts[i % len(depts)]; k = i // len(depts) + 1
        org["staff"][f"{d}-{k}"] = {"name": f"{random.choice(FIRST)} {random.choice(LAST)}", "role": "Mutaxassis", "deptId": d, "order": k, "access": "xodim", "userId": "", "demo": True}
    for d in depts: org["departments"][d]["headId"] = f"{d}-1"
    ids = list(org["staff"].keys())
    for k in [k for k in s if k.startswith("tasks/")]: del s[k]
    for i in range(n_tasks):
        ds = random.sample(depts, random.randint(1, 4)); team = [x for x in ids if org["staff"][x]["deptId"] in ds]
        staff = random.sample(team, min(len(team), random.randint(2, 7)))
        start = f"2026-11-{random.randint(1, 12):02d}"; due = f"2026-11-{random.randint(8, 30):02d}"
        if due < start: start, due = due, start
        st = random.choice(["new", "progress", "progress", "review", "done"])
        s[f"tasks/t{i}"] = {"title": f"Vazifa {i + 1}: bo'limlararo ish", "desc": "", "deptIds": ds, "staffIds": staff, "ownerId": staff[0], "start": start, "due": due, "status": st, "progress": 100 if st == "done" else random.randint(0, 95), "doneAt": due if st == "done" else "", "history": {}, "files": {}, "demo": True}
    for k in [k for k in s if k.startswith("att/")]: del s[k]
    for day in range(1, 11):
        ds_ = f"2026-11-{day:02d}"
        import datetime; wd = datetime.date(2026, 11, day).weekday()
        if wd >= 5: continue
        recs = {}
        for x in ids:
            if random.random() < .93:
                h = 8 + random.random() * 1.3; o = 17 + random.random() * 1.5
                recs[x] = {"in": f"{int(h):02d}:{int(h % 1 * 60):02d}", "src": "kiosk"}
                if day < 10: recs[x]["out"] = f"{int(o):02d}:{int(o % 1 * 60):02d}"
        s[f"att/{ds_}"] = {"day": ds_, "month": "2026-11", "recs": recs, "demo": True}
    s["secure/pins"]["pins"] = {}
    return s

async def main():
    seed = big_seed()
    size = max(len(json.dumps(v)) for k, v in seed.items())
    print(f"  largest document: {size:,} bytes (limit 262,144)")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx, pg, errs = await new_page(b, {}, seed=seed)
        await pg.goto(URL + "#tuzilma"); await pg.wait_for_timeout(1200)
        for view in ["tuzilma", "dashboard", "tasklar", "davomat", "sozlamalar", "bolim-b2b-sales"]:
            await pg.goto(URL + "#" + view); await pg.wait_for_timeout(500)
            ms = await pg.evaluate("(() => { const t = performance.now(); window.dispatchEvent(new HashChangeEvent('hashchange')); return performance.now() - t; })()")
            check(f"render {view} under 120 ms", ms < 120, f"{ms:.1f} ms")
        await pg.goto(URL + "#tuzilma"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{OUT}/b01_board100.png", full_page=True)
        await pg.goto(URL + "#bolim-b2b-sales"); await pg.wait_for_timeout(400)
        check("big department uses compact layout", await pg.locator(".dept-wide").count() == 1)
        await pg.screenshot(path=f"{OUT}/b02_dept_compact.png", full_page=True)
        await pg.goto(URL + "#davomat"); await pg.wait_for_timeout(400)
        await pg.select_option("#att-dept", "b2c-works"); await pg.wait_for_timeout(200)
        rows = await pg.locator("table.att tbody tr").count()
        check("attendance department filter", rows == 11, rows)
        await pg.fill("#att-q", "aziz"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f"{OUT}/b03_att_filter.png")
        await pg.goto(URL + "#sozlamalar"); await pg.wait_for_timeout(300)
        cap = await pg.inner_text(".capacity")
        check("capacity shows 100/100", "100 / 100" in cap, cap)
        dis = await pg.locator('[data-action="new-staff"][disabled]').count()
        check("adding staff disabled at the limit", dis >= 9, dis)
        await pg.goto(URL + "#dashboard"); await pg.wait_for_timeout(600)
        await pg.screenshot(path=f"{OUT}/b04_dash100.png", full_page=True)
        await ctx.close(); await b.close()
        print("\n".join(errs) or "no console errors")

asyncio.run(main())
