"""Nizom-based assignee recommendation: Claude path, availability logic, apply/undo, gap, fallback."""
import asyncio, copy, json, sys
sys.path.insert(0, "/home/claude/tugun/test")
from t1_owner import new_page, check, URL, OUT, SEED
from playwright.async_api import async_playwright

def seed_away():
    s = copy.deepcopy(SEED)
    for d in ("2026-11-09", "2026-11-10"):
        s[f"att/{d}"]["recs"].pop("b2b-bluecoll-2", None)
    return s

async def open_new(pg):
    await pg.goto(URL + "#tasklar"); await pg.wait_for_timeout(700)
    await pg.click("#top-new"); await pg.wait_for_timeout(300)
    await pg.fill("#f-title", "Yangi obyektga 12 kub taxta yetkazish")
    await pg.fill("#f-desc", "Mijoz bilan narx kelishilgan, payshanba kuni yetkazish kerak")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        allerr = []
        ctx, pg, errs = await new_page(b, {}, seed=seed_away())
        await open_new(pg)
        check("assist button visible", await pg.is_visible('[data-action="ai-suggest"]'))
        await pg.screenshot(path=f"{OUT}/a01_button.png")
        await pg.click('[data-action="ai-suggest"]'); await pg.wait_for_timeout(150)
        check("loading state shown", await pg.is_visible(".ai-card.loading"))
        await pg.screenshot(path=f"{OUT}/a02_loading.png")
        await pg.wait_for_timeout(700)
        prompt = await pg.evaluate("window.__samplePrompt")
        check("prompt carries positions, not staff names", "[p-logist]" in prompt and "Malika" not in prompt)
        names = await pg.eval_on_selector_all(".ai-person .ai-name b", "els => els.map(e => e.textContent)")
        check("owner is the logist", names[0] == "Malika Ergasheva", names)
        check("invalid position from Claude dropped", len(names) == 3, names)
        check("absent usta skipped for present one", "Shoxrux Nazarov" in names and "Anvar Sobirov" not in names, names)
        notes = await pg.inner_text(".ai-notes")
        check("note explains the swap", "Anvar Sobirov 2 kundan beri" in notes, notes)
        check("duty line quoted", "Yetkazib berish jadvalini tuzish" in await pg.inner_text(".ai-card"))
        check("gap offered to rahbar", await pg.is_visible('[data-action="ai-gap-add"]'))
        await pg.screenshot(path=f"{OUT}/a03_result.png")
        # alternative swap back to Anvar
        await pg.select_option("#ai-alt-1", "b2b-bluecoll-2"); await pg.wait_for_timeout(150)
        names2 = await pg.eval_on_selector_all(".ai-person .ai-name b", "els => els.map(e => e.textContent)")
        check("manual swap works", "Anvar Sobirov" in names2, names2)
        await pg.select_option("#ai-alt-1", "b2b-bluecoll-3"); await pg.wait_for_timeout(150)
        # uncheck the omborchi, apply
        await pg.click('.ai-check[data-i="0"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-action="ai-apply"]'); await pg.wait_for_timeout(300)
        owner = await pg.eval_on_selector("#f-owner", "e => e.value")
        staff = await pg.eval_on_selector_all('input[name="staff"]:checked', "els => els.map(e => e.value)")
        depts = await pg.eval_on_selector_all('input[name="dept"]:checked', "els => els.map(e => e.value)")
        check("owner applied", owner == "b2b-supplies-2", owner)
        check("only checked helpers applied", "b2b-bluecoll-3" in staff and "b2b-supplies-3" not in staff, staff)
        check("departments ticked", set(depts) >= {"b2b-supplies", "b2b-bluecoll"}, depts)
        await pg.screenshot(path=f"{OUT}/a04_applied.png")
        await pg.click('[data-action="ai-undo"]'); await pg.wait_for_timeout(200)
        owner2 = await pg.eval_on_selector("#f-owner", "e => e.value")
        check("undo restores form", owner2 == "" and not await pg.eval_on_selector_all('input[name="dept"]:checked', "els => els.length"), owner2)
        await pg.click('[data-action="ai-apply"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-action="ai-show"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-action="ai-gap-add"]'); await pg.wait_for_timeout(400)
        pos = await pg.evaluate("JSON.parse(JSON.stringify(window.__store.get('docs/lavozimlar'))).pos['p-logist']")
        check("gap duty added with new version", pos["duties"][-1].startswith("Mijozdan") and pos["v"] == 2, pos["v"])
        await pg.click("#task-save"); await pg.wait_for_timeout(500)
        tasks = await pg.evaluate("[...window.__store.entries()].filter(([k,v]) => k.startsWith('tasks/') && k.split('/').length==2 && v.title.startsWith('Yangi obyektga')).map(([k,v]) => v)")
        check("task saved with ai history", tasks and any(h["k"] == "ai" for h in tasks[0]["history"].values()), len(tasks))
        allerr += errs; await ctx.close()
        # fallback: no Claude in this view
        ctx, pg, errs = await new_page(b, {"sample": "none"})
        await open_new(pg)
        await pg.click('[data-action="ai-suggest"]'); await pg.wait_for_timeout(300)
        src = await pg.inner_text(".ai-card .ai-src")
        owner_pos = await pg.inner_text(".ai-person .ai-name small")
        check("keyword fallback works", "Kalit so'zlar" in src, owner_pos)
        await pg.screenshot(path=f"{OUT}/a05_fallback.png")
        allerr += errs; await ctx.close()
        # declined consent
        ctx, pg, errs = await new_page(b, {"sample": "deny"})
        await open_new(pg)
        await pg.click('[data-action="ai-suggest"]'); await pg.wait_for_timeout(900)
        check("declined consent falls back with a note", "ruxsat berilmagan" in await pg.inner_text(".ai-card"))
        allerr += errs; await ctx.close()
        # stop button
        ctx, pg, errs = await new_page(b, {"sampleDelay": 6000})
        await open_new(pg)
        await pg.click('[data-action="ai-suggest"]'); await pg.wait_for_timeout(600)
        await pg.click('[data-action="ai-stop"]', force=True); await pg.wait_for_timeout(200)
        check("stop returns to idle", await pg.is_visible('[data-action="ai-suggest"]'))
        # xodim (no full edit) never sees the button
        allerr += errs; await ctx.close()
        ctx, pg, errs = await new_page(b, {"me": {"id": "u-x", "isOwner": False, "canEdit": False}}, seed=(lambda s: (s["org/structure"]["staff"]["b2b-sales-2"].__setitem__("userId", "u-x"), s)[1])(copy.deepcopy(SEED)))
        await pg.goto(URL + "#tasklar"); await pg.wait_for_timeout(700)
        await pg.click('table.tasks button.link'); await pg.wait_for_timeout(300)
        check("employee without edit rights gets no assist", await pg.locator('[data-action="ai-suggest"]').count() == 0)
        allerr += errs; await ctx.close()
        await b.close()
        print("\n".join(e for e in allerr if "ERR_FILE" not in e) or "no console errors")
asyncio.run(main())
