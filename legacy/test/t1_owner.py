"""Owner walkthrough: board, focus, tasks, task modal tabs, comments, files, attendance edit, kiosk, search, settings."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

ROOT = "/home/claude/tugun"
OUT = f"{ROOT}/test/shots"
URL = f"file://{ROOT}/dist/index.html"
SEED = json.load(open(f"{ROOT}/seed.json"))
MOCK = open(f"{ROOT}/test/mock.js").read()

def mock(cfg, seed=SEED):
    return MOCK.replace("__SEED__", json.dumps(seed)).replace("__CFG__", json.dumps(cfg))

async def new_page(b, cfg, scheme="light", w=1480, h=1000, seed=SEED):
    ctx = await b.new_context(viewport={"width": w, "height": h}, timezone_id="Asia/Qyzylorda", color_scheme=scheme)
    await ctx.add_init_script(mock(cfg, seed))
    pg = await ctx.new_page()
    errs = []
    pg.on("console", lambda m: errs.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    return ctx, pg, errs

def check(label, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra != "" else ""))

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx, pg, errs = await new_page(b, {})
        await pg.goto(URL + "#tuzilma"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=f"{OUT}/o01_tuzilma.png", full_page=True)
        who = await pg.eval_on_selector("#whoami", "e => e.textContent")
        check("owner role shown", "Rahbar" in who, who.replace("\n", " | "))
        check("new task button visible", await pg.is_visible("#top-new"))
        # focus a task: lead department and crown
        await pg.click('[data-action="focus-task"][data-id="t-tom"]'); await pg.wait_for_timeout(300)
        lead = await pg.locator(".dept-node.is-lead").count()
        check("focus marks one lead department", lead == 1, lead)
        await pg.screenshot(path=f"{OUT}/o02_focus.png", full_page=False)
        # dept view
        await pg.goto(URL + "#bolim-b2b-supplies"); await pg.wait_for_timeout(400)
        check("dept head shown in hero", "Bo'lim boshlig'i" in await pg.inner_text(".dept-hero"))
        await pg.screenshot(path=f"{OUT}/o03_dept.png", full_page=True)
        # tasks table
        await pg.goto(URL + "#tasklar"); await pg.wait_for_timeout(400)
        rows = await pg.locator("table.tasks tbody tr").count()
        check("tasks table rows", rows == 9, rows)
        check("owner column filled", await pg.locator("table.tasks .owner-cell").count() == 9)
        await pg.fill("#tq", "aziz"); await pg.wait_for_timeout(150)
        n = await pg.locator("table.tasks tbody tr").count()
        check("search by owner/executor name", n >= 1, n)
        await pg.fill("#tq", ""); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f"{OUT}/o04_tasks.png", full_page=True)
        await pg.click('[data-action="tf-mode"][data-v="gantt"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/o05_gantt.png", full_page=True)
        await pg.click('[data-action="tf-mode"][data-v="table"]'); await pg.wait_for_timeout(200)
        # quick status change writes history
        await pg.select_option('select[data-id="t-smeta"]', "progress"); await pg.wait_for_timeout(300)
        h = await pg.evaluate("Object.values(JSON.parse(JSON.stringify(window.__store.get('tasks/t-smeta'))).history||{}).length")
        check("status change adds history", h == 2, h)
        # open task modal, tabs
        await pg.click('button.link[data-id="t-tender"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{OUT}/o06_modal_main.png")
        own = await pg.eval_on_selector("#f-owner", "e => e.value")
        check("owner preselected", own == "b2b-b2g-1", own)
        await pg.click('[data-action="task-tab"][data-v="comments"]'); await pg.wait_for_timeout(300)
        nc = await pg.locator("#cm-list .comment").count()
        check("existing comments load", nc == 2, nc)
        check("save hidden on comments tab", not await pg.is_visible("#task-save"))
        await pg.fill("#cm-text", "Hujjatlar tayyor, ertaga topshiramiz."); await pg.click('[data-action="send-comment"]'); await pg.wait_for_timeout(400)
        nc2 = await pg.locator("#cm-list .comment").count()
        check("comment posted", nc2 == 3, nc2)
        await pg.screenshot(path=f"{OUT}/o07_modal_comments.png")
        await pg.click('[data-action="task-tab"][data-v="files"]'); await pg.wait_for_timeout(200)
        await pg.set_input_files("#file-in", files=[{"name": "smeta.csv", "mimeType": "", "buffer": b"a,b\n1,2\n"}, {"name": "rasm.png", "mimeType": "image/png", "buffer": bytes.fromhex("89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415478DA63F8FFFF3F0005FE02FEA7D6A4F50000000049454E44AE426082")}])
        await pg.wait_for_timeout(700)
        nf = await pg.locator("#files-box .files li").count()
        check("files attached", nf == 2, nf)
        types = await pg.evaluate("window.__assets.map(a=>a[2])")
        check("csv uploaded with explicit type", "text/csv" in types, types)
        await pg.screenshot(path=f"{OUT}/o08_modal_files.png")
        await pg.click('[data-action="task-tab"][data-v="history"]'); await pg.wait_for_timeout(200)
        nh = await pg.locator("#hist-box .timeline li").count()
        check("history shows file events", nh >= 4, nh)
        await pg.screenshot(path=f"{OUT}/o09_modal_history.png")
        await pg.click('[data-action="task-tab"][data-v="main"]'); await pg.wait_for_timeout(100)
        # change owner and due -> history + activity
        await pg.select_option("#f-owner", "b2b-sales-1"); await pg.wait_for_timeout(100)
        await pg.fill("#f-due", "2026-11-18")
        await pg.click("#task-save"); await pg.wait_for_timeout(500)
        t = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('tasks/t-tender')))")
        check("owner changed", t["ownerId"] == "b2b-sales-1", t["ownerId"])
        check("owner added to executors", "b2b-sales-1" in t["staffIds"])
        kinds = sorted(x["k"] for x in t["history"].values())
        check("history has owner+due", "owner" in kinds and "due" in kinds, kinds)
        # new task without owner -> error
        await pg.click("#top-new"); await pg.wait_for_timeout(300)
        await pg.fill("#f-title", "Test task")
        await pg.click('#modal input[value="b2c-works"]', force=True); await pg.wait_for_timeout(100)
        await pg.click("#task-save"); await pg.wait_for_timeout(200)
        err = await pg.inner_text("#modal .m-error")
        check("owner required", "Mas'ul" in err, err)
        await pg.select_option("#f-owner", "b2c-works-1"); await pg.wait_for_timeout(100)
        star = await pg.locator("#staff-picks .pick.is-owner").count()
        check("owner pick marked", star == 1, star)
        await pg.click("#task-save"); await pg.wait_for_timeout(400)
        check("modal closed after save", not await pg.evaluate("document.getElementById('modal').open"))
        # attendance
        await pg.goto(URL + "#davomat"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"{OUT}/o10_att.png", full_page=False)
        await pg.click('.clock-btn[data-id="b2b-pr-2"][data-preset="out"]'); await pg.wait_for_timeout(300)
        await pg.fill("#a-in", "8:40"); await pg.fill("#a-out", "")
        await pg.select_option("#a-why", "Boshqa sabab")
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(200)
        e2 = await pg.inner_text("#modal .m-error")
        check("other reason needs note", "izoh" in e2.lower(), e2)
        await pg.fill("#a-note", "Mijozda uchrashuv")
        await pg.screenshot(path=f"{OUT}/o11_att_modal.png")
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(400)
        r = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('att/' + new Date().toLocaleDateString('sv')))).recs['b2b-pr-2']")
        check("manual edit saved with audit", r.get("src") == "manual" and len(r.get("edits", {})) == 1, json.dumps(r)[:160])
        await pg.click('[data-action="att-issues"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f"{OUT}/o12_att_issues.png", full_page=False)
        await pg.click('[data-action="att-mode"][data-v="month"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/o13_att_month.png", full_page=False)
        # kiosk
        await pg.goto(URL + "#kiosk"); await pg.wait_for_timeout(400)
        check("kiosk hides topbar", not await pg.is_visible(".topbar"))
        await pg.screenshot(path=f"{OUT}/o14_kiosk.png")
        for k in "9999": await pg.keyboard.press(k)
        await pg.wait_for_timeout(300)
        check("wrong PIN error", "noto'g'ri" in await pg.inner_text(".k-err"))
        # PIN of someone who has not come yet: find a staff without 'in' today
        recs = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('att/' + new Date().toLocaleDateString('sv')))).recs")
        order = await pg.evaluate("(() => { const s = JSON.parse(JSON.stringify(window.__store.get('org/structure'))); return Object.keys(s.staff); })()")
        print("  staff without in today:", [k for k in order if k not in recs or not recs[k] or not recs[k].get('in')][:5])
        await ctx.close()
        print("\n".join(errs) or "no console errors")
        await b.close()

if __name__ == "__main__":
    asyncio.run(main())
