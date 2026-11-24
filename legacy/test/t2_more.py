"""Kiosk flows, notifications, spotlight, settings (PIN, account link, head), dashboard, help, dark mode, clear demo."""
import asyncio, hashlib, json, os, sys
sys.path.insert(0, "/home/claude/tugun/test")
from t1_owner import new_page, check, URL, OUT, SEED
from playwright.async_api import async_playwright

def pin_of(staff_id, seed=SEED):
    p = seed["secure/pins"]
    for n in range(1000, 10000):
        if hashlib.sha256(f"{p['salt']}:{n}".encode()).hexdigest() == p["pins"].get(staff_id):
            return str(n)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx, pg, errs = await new_page(b, {})
        # ---- kiosk
        await pg.goto(URL + "#kiosk"); await pg.wait_for_timeout(700)
        who = "b2c-operators-3"; pin = pin_of(who)
        print("  PIN for", who, "=", pin)
        for k in pin: await pg.click(f'.k-key[data-k="{k}"]')
        await pg.wait_for_timeout(500)
        txt = await pg.inner_text(".k-panel")
        check("check-in greeting", "Xush kelibsiz" in txt, txt.replace("\n", " | ")[:120])
        await pg.screenshot(path=f"{OUT}/k01_checkin.png")
        rec = await pg.evaluate(f"JSON.parse(JSON.stringify(window.__store.get('att/' + new Date().toLocaleDateString('sv')))).recs['{who}']")
        check("terminal record saved", rec and rec.get("src") == "kiosk" and rec.get("in"), rec)
        await pg.wait_for_timeout(4400)
        for k in pin: await pg.keyboard.press(k)
        await pg.wait_for_timeout(400)
        txt = await pg.inner_text(".k-panel")
        check("second PIN within 5 min is ignored", "hozirgina" in txt, txt.replace("\n", " | ")[:100])
        await pg.wait_for_timeout(4400)
        # exit needs a manager PIN
        await pg.click('[data-action="kiosk-exit"]'); await pg.wait_for_timeout(200)
        check("exit asks for manager PIN", "rahbar" in (await pg.inner_text(".k-panel")).lower())
        await pg.screenshot(path=f"{OUT}/k02_exit.png")
        npin = pin_of("b2b-sales-2")  # not a head
        for k in npin: await pg.keyboard.press(k)
        await pg.wait_for_timeout(300)
        check("non-manager PIN refused", "chiqib bo'lmaydi" in await pg.inner_text(".k-err"))
        for k in pin_of("b2b-sales-1"): await pg.keyboard.press(k)  # head of Sales
        await pg.wait_for_timeout(400)
        check("manager PIN exits to attendance", pg.url.endswith("#davomat"), pg.url)
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/k03_after_exit_att.png")
        # ---- notifications
        await pg.click("#bell"); await pg.wait_for_timeout(300)
        check("notification popover opens", await pg.is_visible("#notif"))
        n_alerts = await pg.locator("#notif .alerts li").count()
        n_feed = await pg.locator("#notif .feed-item").count()
        check("alerts and feed present", n_alerts >= 1 and n_feed >= 1, f"{n_alerts} alerts, {n_feed} events")
        await pg.screenshot(path=f"{OUT}/n01_notif.png")
        await pg.wait_for_timeout(1700)
        badge_hidden = await pg.evaluate("document.getElementById('bell-n').hidden")
        check("badge cleared after viewing", badge_hidden)
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
        check("Esc closes popover", not await pg.is_visible("#notif"))
        # ---- spotlight
        await pg.keyboard.press("Control+k"); await pg.wait_for_timeout(250)
        check("spotlight opens", await pg.evaluate("document.getElementById('spot').open"))
        await pg.screenshot(path=f"{OUT}/s01_spot_empty.png")
        await pg.keyboard.type("malika"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f"{OUT}/s02_spot_query.png")
        await pg.keyboard.press("Enter"); await pg.wait_for_timeout(300)
        title = await pg.inner_text("#modal #m-title")
        check("Enter opens person profile", "Malika" in title, title)
        await pg.screenshot(path=f"{OUT}/s03_person.png")
        await pg.click('#modal [data-action="close-modal"]'); await pg.wait_for_timeout(150)
        # ---- settings: staff card
        await pg.goto(URL + "#sozlamalar"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{OUT}/c01_settings.png", full_page=True)
        await pg.click('[data-action="new-staff"][data-dept="b2b-pr"]'); await pg.wait_for_timeout(250)
        await pg.fill("#s-name", "Yangi Hamkasb"); await pg.fill("#s-role", "Kopirayter")
        await pg.click('#modal input[name="s-access"][value="boshliq"]', force=True)
        await pg.fill("#s-pin", "1111")
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(200)
        check("trivial PIN refused", "oddiy" in await pg.inner_text("#modal .m-error"))
        await pg.click('[data-action="gen-pin"]'); await pg.wait_for_timeout(100)
        gen = await pg.eval_on_selector("#s-pin", "e => e.value")
        check("random PIN generated", len(gen) == 4 and gen.isdigit(), gen)
        await pg.click("#acct-q"); await pg.wait_for_timeout(200)
        await pg.fill("#acct-q", "yangi"); await pg.wait_for_timeout(400)
        hits = await pg.locator("#acct-res .acct-hit").count()
        check("account search finds people", hits >= 1, hits)
        await pg.click("#acct-res .acct-hit"); await pg.wait_for_timeout(150)
        check("account linked in form", (await pg.eval_on_selector("#s-uid", "e => e.value")) == "u-new")
        await pg.screenshot(path=f"{OUT}/c02_staff_modal.png")
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(500)
        org = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('org/structure')))")
        new_id = [k for k, v in org["staff"].items() if v and v.get("name") == "Yangi Hamkasb"]
        check("staff saved", len(new_id) == 1)
        nid = new_id[0]
        check("made head of PR", org["departments"]["b2b-pr"]["headId"] == nid, org["departments"]["b2b-pr"]["headId"])
        check("account id stored", org["staff"][nid].get("userId") == "u-new")
        pins = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('secure/pins')))")
        h = hashlib.sha256(f"{pins['salt']}:{gen}".encode()).hexdigest()
        check("PIN hash stored", pins["pins"].get(nid) == h)
        # duplicate PIN refused
        await pg.click('[data-action="new-staff"][data-dept="b2b-pr"]'); await pg.wait_for_timeout(250)
        await pg.fill("#s-name", "Ikkinchi"); await pg.fill("#s-pin", gen)
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(200)
        check("duplicate PIN refused", "boshqa xodimda" in await pg.inner_text("#modal .m-error"))
        await pg.click('#modal [data-action="close-modal"]'); await pg.wait_for_timeout(150)
        # ---- dashboard + help
        await pg.goto(URL + "#dashboard"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f"{OUT}/d01_dash.png", full_page=True)
        await pg.goto(URL + "#qollanma"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/h01_help.png", full_page=True)
        # ---- clear demo
        await pg.goto(URL + "#sozlamalar"); await pg.wait_for_timeout(300)
        await pg.click('[data-action="clear-demo"]'); await pg.wait_for_timeout(200)
        await pg.click('#modal button[type="submit"]'); await pg.wait_for_timeout(2500)
        keys = await pg.evaluate("[...window.__store.keys()]")
        org = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('org/structure')))")
        live_staff = [k for k, v in org["staff"].items() if v]
        check("demo staff removed, own staff kept", live_staff == [nid], live_staff)
        check("demo tasks and comments removed", not [k for k in keys if k.startswith("tasks/")], [k for k in keys if k.startswith("tasks/")])
        check("demo attendance and feed removed", not [k for k in keys if k.startswith("att/") or (k.startswith("activity/") and "-" not in k[9:])], [k for k in keys if k.startswith(("att/", "activity/"))])
        pins = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('secure/pins')))")
        check("demo PINs removed", [k for k, v in pins["pins"].items() if v] == [nid] and not pins.get("demo"))
        await pg.goto(URL + "#tuzilma"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{OUT}/c03_after_clear.png", full_page=True)
        await ctx.close()
        # ---- dark mode
        ctx, pg, errs2 = await new_page(b, {}, scheme="dark", w=1280, h=900)
        await pg.goto(URL + "#tuzilma"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f"{OUT}/x01_dark.png")
        await pg.goto(URL + "#dashboard"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f"{OUT}/x02_dark_dash.png", full_page=True)
        await pg.goto(URL + "#kiosk"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"{OUT}/x03_dark_kiosk.png")
        await ctx.close()
        errs += errs2
        await b.close()
        print("\n".join(e for e in errs if "ERR_FILE_NOT_FOUND" not in e) or "no console errors")

asyncio.run(main())
