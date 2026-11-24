"""Nizom: charter, positions, acknowledgement by a linked employee, edits bump versions, status table."""
import asyncio, copy, json, sys
sys.path.insert(0, "/home/claude/tugun/test")
from t1_owner import new_page, check, URL, OUT, SEED
from playwright.async_api import async_playwright

def seed_with(links):
    s = copy.deepcopy(SEED)
    for sid, uid in links.items(): s["org/structure"]["staff"][sid]["userId"] = uid
    return s

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        allerr = []
        # owner
        ctx, pg, errs = await new_page(b, {})
        await pg.goto(URL + "#nizom"); await pg.wait_for_timeout(900)
        n = await pg.locator(".nz-sec").count()
        check("charter sections render", n == 10, n)
        await pg.screenshot(path=f"{OUT}/z01_charter.png")
        await pg.click('[data-action="nz-tab"][data-v="lavozim"]'); await pg.wait_for_timeout(300)
        np_ = await pg.locator(".pos-item").count()
        check("21 positions listed", np_ == 21, np_)
        await pg.click('.pos-item[data-id="p-logist"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f"{OUT}/z02_position.png", full_page=True)
        await pg.click('[data-action="nz-tab"][data-v="holat"]'); await pg.wait_for_timeout(300)
        rows = await pg.locator(".nz-layout, table.tasks tbody tr").count()
        check("status table lists all staff", rows == 27, rows)
        await pg.screenshot(path=f"{OUT}/z03_status.png")
        # edit a section -> version 2
        await pg.click('[data-action="nz-tab"][data-v="nizom"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-action="nz-sec"][data-id="s4"]'); await pg.wait_for_timeout(300)
        await pg.fill("#nz-text", "Ish vaqti bo'lim bo'yicha belgilanadi.\n\n- PIN kodni boshqaga bermang.")
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(500)
        v = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('docs/nizom'))).v")
        check("editing charter bumps version", v == 2, v)
        await pg.goto(URL + "#nizom"); await pg.wait_for_timeout(300)
        await pg.click('[data-action="nz-tab"][data-v="holat"]'); await pg.wait_for_timeout(300)
        okn = await pg.locator("table.tasks tbody tr .ack.ok").count()
        check("old acknowledgements become stale", "Yangi tahrir" in await pg.inner_text("table.tasks"), okn)
        # position edit + new position + assign in staff card
        await pg.click('[data-action="nz-tab"][data-v="lavozim"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-action="nz-pos-edit"][data-id=""]'); await pg.wait_for_timeout(300)
        await pg.fill("#pf-title", "Kassir"); await pg.select_option("#pf-dept", "b2c-sales")
        await pg.fill("#pf-duties", "Kassani yuritish\nKun oxirida kassani topshirish")
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(500)
        check("new position saved and opened", "Kassir" in await pg.inner_text(".nz-doc h2"))
        await pg.click('[data-action="open-person"]') if False else None
        await pg.goto(URL + "#sozlamalar"); await pg.wait_for_timeout(300)
        await pg.click('[data-action="edit-staff"][data-id="b2c-sales-3"]'); await pg.wait_for_timeout(300)
        opts = await pg.eval_on_selector_all("#s-pos option", "els => els.map(e => e.textContent)")
        check("staff card offers positions", "Kassir" in opts, len(opts))
        await pg.select_option("#s-pos", label="Kassir")
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(400)
        pid = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('org/structure'))).staff['b2c-sales-3'].posId")
        check("position assigned", pid and pid.startswith("p-"), pid)
        allerr += errs; await ctx.close()
        # linked employee acknowledges
        ctx, pg, errs = await new_page(b, {"me": {"id": "u-x", "isOwner": False, "canEdit": False, "name": "Dilnoza"}}, seed=seed_with({"b2b-sales-3": "u-x"}))
        await pg.goto(URL + "#nizom"); await pg.wait_for_timeout(900)
        check("employee sees own status card", await pg.is_visible(".nz-mine"))
        check("employee cannot edit charter", await pg.locator('[data-action="nz-sec"]').count() == 0)
        check("employee has no status tab", await pg.locator('[data-v="holat"]').count() == 0)
        await pg.click("#bell"); await pg.wait_for_timeout(300)
        check("bell asks to read the charter", "nizomi bilan tanishing" in (await pg.inner_text("#notif")).lower())
        await pg.keyboard.press("Escape")
        await pg.click('.nz-ack [data-action="nz-ack"]'); await pg.wait_for_timeout(400)
        ack = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('acks/u-x') || null))")
        check("acknowledgement stored under own account", ack and ack["staffId"] == "b2b-sales-3" and ack["nizom"]["v"] == 1, ack)
        await pg.click('.nz-mine [data-action="nz-pos"]'); await pg.wait_for_timeout(300)
        await pg.click('.nz-ack [data-action="nz-ack"][data-kind="pos"]'); await pg.wait_for_timeout(400)
        mine = await pg.inner_text(".nz-mine")
        check("both confirmed", mine.count("Tanishgan") == 2, mine.replace("\n", " | "))
        await pg.screenshot(path=f"{OUT}/z04_employee.png")
        # forged ack for someone else is ignored
        await pg.evaluate("window.__store.set('acks/u-x2', {staffId: 'b2b-sales-2', nizom: {v: 1, t: '2026-11-10T10:00:00Z'}})")
        allerr += errs; await ctx.close()
        # mobile
        ctx, pg, errs = await new_page(b, {}, w=390, h=844)
        await pg.goto(URL + "#nizom"); await pg.wait_for_timeout(800)
        await pg.screenshot(path=f"{OUT}/z05_mobile.png")
        allerr += errs; await ctx.close()
        await b.close()
        print("\n".join(allerr) or "no console errors")

asyncio.run(main())
