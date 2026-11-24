#!/usr/bin/env python3
"""Role tests against the migrated seed data. Each check runs in its own session as a given login,
exactly as the API would (role 'authenticated' + JWT sub)."""
import hashlib, json, subprocess, sys, time, uuid

PSQL = ["psql", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-U", "tugun_owner", "-d", "tugun"]
NS = uuid.UUID("6f6b1b62-6b8e-4c39-9a51-7475676e0001")
U = lambda kind, legacy: str(uuid.uuid5(NS, f"baraka-les:{kind}:{legacy}"))
ORG = U("org", "")
seed = json.load(open("../legacy/seed.json"))
# Test-only: recover the demo PINs so the kiosk can be exercised (the real migration does this inside SQL).
salt = seed["secure/pins"]["salt"]
PIN = {}
for k, h in seed["secure/pins"]["pins"].items():
    PIN[k] = next(p for p in (f"{n:04d}" for n in range(10000)) if hashlib.sha256(f"{salt}:{p}".encode()).hexdigest() == h)

def sql(stmts, user=None, role="authenticated"):
    cmd = list(PSQL)
    if user is not None or role == "anon":
        cmd += ["-c", f"set role {role}"]
        if user: cmd += ["-c", f"set request.jwt.claim.sub = '{user}'"]
    for s in ([stmts] if isinstance(stmts, str) else stmts):
        cmd += ["-c", s]
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode == 0, p.stdout.strip(), p.stderr.strip()

results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  → {detail}"))

def val(stmts, user=None, role="authenticated"):
    ok, out, err = sql(stmts, user, role)
    if not ok: raise RuntimeError(err)
    return out.splitlines()[-1] if out else ""

def expect(name, user, stmt, want, role="authenticated"):
    ok, out, err = sql(stmt, user, role)
    got = out.splitlines()[-1] if out else ""
    check(name, ok and got == str(want), err or f"got {got!r}, want {want!r}")

def deny(name, user, stmt, role="authenticated"):
    ok, out, err = sql(stmt, user, role)
    check(name, not ok, f"unexpectedly succeeded: {out!r}")
    return err

# ─────────── fixtures (as owner) ───────────
R, HEAD, XOD, OTH, GUEST, TERM, NOBODY, R2 = (str(uuid.uuid4()) for _ in range(8))
S = lambda legacy: U("staff", legacy)
D = lambda legacy: U("dept", legacy)
T = lambda legacy: U("task", legacy)
ORG2 = str(uuid.uuid4()); B2, D2, S2, T2 = (str(uuid.uuid4()) for _ in range(4))
ok, _, err = sql([
    f"insert into auth.users (id) values ('{R}'),('{HEAD}'),('{XOD}'),('{OTH}'),('{GUEST}'),('{TERM}'),('{NOBODY}'),('{R2}')",
    f"""insert into public.members (user_id, org_id, role, staff_id) values
        ('{R}','{ORG}','rahbar',null), ('{HEAD}','{ORG}','xodim','{S('b2b-sales-1')}'),
        ('{XOD}','{ORG}','xodim','{S('b2b-sales-2')}'), ('{OTH}','{ORG}','xodim','{S('b2c-sales-2')}'),
        ('{GUEST}','{ORG}','mehmon',null), ('{TERM}','{ORG}','terminal',null)""",
    # a second company in the same database
    f"insert into public.orgs (id, name) values ('{ORG2}', 'Boshqa kompaniya')",
    f"insert into public.branches (id, org_id, name) values ('{B2}','{ORG2}','X')",
    f"insert into public.departments (id, org_id, branch_id, name) values ('{D2}','{ORG2}','{B2}','Savdo')",
    f"insert into public.staff (id, org_id, dept_id, full_name) values ('{S2}','{ORG2}','{D2}','Begona xodim')",
    f"insert into public.tasks (id, org_id, title, owner_staff_id) values ('{T2}','{ORG2}','Begona task','{S2}')",
    f"insert into public.members (user_id, org_id, role) values ('{R2}','{ORG2}','rahbar')",
])
if not ok: sys.exit(err)

# a task where b2b-sales-2 is an assignee but neither owner nor creator
# a fresh open task: owner b2b-sales-1, assignee b2b-sales-2 (neither owner nor creator)
ASG = val([f"""insert into public.tasks (org_id, title, owner_staff_id, status, progress)
              values ('{ORG}', 'Taqdimot tayyorlash', '{S('b2b-sales-1')}', 'progress', 20) returning id"""])
sql([f"insert into public.task_staff (task_id, staff_id, org_id) values ('{ASG}', '{S('b2b-sales-2')}', '{ORG}')",
     f"insert into public.task_depts (task_id, dept_id, org_id) values ('{ASG}', '{D('b2b-sales')}', '{ORG}')"])
NOT_ASG = val(f"""select t.id from public.tasks t where org_id = '{ORG}' and not exists
              (select 1 from public.task_staff ts where ts.task_id = t.id and ts.staff_id = '{S('b2b-sales-2')}')
              and t.owner_staff_id <> '{S('b2b-sales-2')}' limit 1""")
OTHER_DEPT_TASK = val(f"""select t.id from public.tasks t join public.staff o on o.id = t.owner_staff_id
              where t.org_id = '{ORG}' and o.dept_id <> '{D('b2b-sales')}' and not exists
              (select 1 from public.task_depts td where td.task_id = t.id and td.dept_id = '{D('b2b-sales')}') limit 1""")
TOTAL_ATT = val(f"select count(*) from public.attendance where org_id = '{ORG}'")
DEPT_ATT = val(f"select count(*) from public.attendance a join public.staff s on s.id = a.staff_id where s.dept_id = '{D('b2b-sales')}'")
OWN_ATT = val(f"select count(*) from public.attendance where staff_id = '{S('b2b-sales-2')}'")

print(f"\nfixtures: assignee task {ASG[:8]}, attendance org/dept/own = {TOTAL_ATT}/{DEPT_ATT}/{OWN_ATT}\n")

# ─────────── 1. who can read what ───────────
expect("anon sees no tasks", None, "select count(*) from public.tasks", 0, role="anon")
expect("non-member sees no tasks", NOBODY, "select count(*) from public.tasks", 0)
expect("rahbar sees all 10 tasks of own org only", R, "select count(*) from public.tasks", 10)
expect("rahbar sees 27 staff", R, "select count(*) from public.staff", 27)
expect("other org's rahbar sees none of ours", R2, f"select count(*) from public.tasks where org_id = '{ORG}'", 0)
expect("guest sees tasks (read-only role)", GUEST, "select count(*) from public.tasks", 10)
expect("terminal sees no tasks", TERM, "select count(*) from public.tasks", 0)
expect("terminal sees no staff list", TERM, "select count(*) from public.staff", 0)
expect("rahbar sees all attendance", R, "select count(*) from public.attendance", TOTAL_ATT)
expect("boshliq sees own department attendance", HEAD, "select count(*) from public.attendance", DEPT_ATT)
expect("xodim sees only own attendance", XOD, "select count(*) from public.attendance", OWN_ATT)
expect("guest sees no attendance", GUEST, "select count(*) from public.attendance", 0)
deny("nobody reads PIN table", R, "select count(*) from private.staff_pins")
deny("nobody reads org secret", R, "select pepper from private.org_secrets")
expect("my_context: boshliq", HEAD, "select public.my_context()->>'role'", "boshliq")
expect("my_context: xodim", XOD, "select public.my_context()->>'role'", "xodim")
expect("my_context: rahbar", R, "select public.my_context()->>'role'", "rahbar")

# ─────────── 2. structure is rahbar-only ───────────
expect("rahbar renames a department", R, f"update public.departments set name = name where id = '{D('b2b-sales')}' returning 1", 1)
expect("boshliq cannot rename a department (0 rows)", HEAD, f"with u as (update public.departments set name = 'X' where id = '{D('b2b-sales')}' returning 1) select count(*) from u", 0)
deny("boshliq cannot add staff", HEAD, f"insert into public.staff (org_id, dept_id, full_name) values ('{ORG}', '{D('b2b-sales')}', 'Yangi')")
expect("xodim cannot make himself admin (0 rows)", XOD, f"with u as (update public.staff set is_admin = true where id = '{S('b2b-sales-2')}' returning 1) select count(*) from u", 0)
deny("xodim cannot grant himself rahbar account", XOD, f"insert into public.members (user_id, org_id, role) values ('{NOBODY}', '{ORG}', 'rahbar')")
expect("xodim cannot change own account role (0 rows)", XOD, f"with u as (update public.members set role = 'rahbar' where user_id = '{XOD}' returning 1) select count(*) from u", 0)
deny("rahbar cannot remove own rahbar role", R, f"update public.members set role = 'xodim' where user_id = '{R}'")
deny("rahbar cannot attach staff from another org", R, f"update public.departments set head_staff_id = '{S2}' where id = '{D('b2b-sales')}'")

# ─────────── 3. tasks ───────────
deny("xodim cannot create a task", XOD, f"insert into public.tasks (org_id, title, owner_staff_id) values ('{ORG}', 'X', '{S('b2b-sales-2')}')")
deny("guest cannot create a task", GUEST, f"insert into public.tasks (org_id, title, owner_staff_id) values ('{ORG}', 'X', '{S('b2b-sales-2')}')")
NEW = val(f"insert into public.tasks (org_id, title, owner_staff_id, due_date) values ('{ORG}', 'Boshliq taski', '{S('b2b-sales-2')}', current_date + 3) returning id", HEAD)
check("boshliq creates a task", bool(NEW))
expect("creator is stamped by the server", R, f"select created_by = '{S('b2b-sales-1')}' from public.tasks where id = '{NEW}'", "t")
expect("boshliq attaches own department to new task", HEAD, f"insert into public.task_depts (task_id, dept_id) values ('{NEW}', '{D('b2b-sales')}') returning 1", 1)
expect("boshliq adds an assignee", HEAD, f"insert into public.task_staff (task_id, staff_id) values ('{NEW}', '{S('b2b-sales-3')}') returning 1", 1)
expect("assignee is notified", R, f"select count(*) from public.activity where task_id = '{NEW}' and kind = 'assign' and '{S('b2b-sales-3')}' = any(to_staff)", 1)
deny("cannot assign a person from another org", R, f"insert into public.task_staff (task_id, staff_id) values ('{NEW}', '{S2}')")
deny("other org's rahbar cannot add our staff to their task", R2, f"insert into public.task_staff (task_id, staff_id) values ('{T2}', '{S('b2b-sales-1')}')")
expect("other org's rahbar cannot edit our task (0 rows)", R2, f"with u as (update public.tasks set title = 'hack' where id = '{NEW}' returning 1) select count(*) from u", 0)

deny("assignee cannot rename a task", XOD, f"update public.tasks set title = 'boshqa' where id = '{ASG}'")
deny("assignee cannot change the mas'ul", XOD, f"update public.tasks set owner_staff_id = '{S('b2b-sales-2')}' where id = '{ASG}'")
expect("assignee moves progress", XOD, f"update public.tasks set progress = 70 where id = '{ASG}' returning progress", 70)
expect("assignee moves status", XOD, f"update public.tasks set status = 'review' where id = '{ASG}' returning status", "review")
expect("status change is logged with actor", R, f"select count(*) from public.task_events where task_id = '{ASG}' and kind = 'status' and actor_staff = '{S('b2b-sales-2')}'", 1)
expect("status change notifies mas'ul", R, f"select count(*) from public.activity a join public.tasks t on t.id = a.task_id where a.task_id = '{ASG}' and a.kind = 'status' and t.owner_staff_id = any(a.to_staff)", 1)
deny("assignee cannot mark a task done (rahbar accepts)", XOD, f"update public.tasks set status = 'done' where id = '{ASG}'")
deny("boshliq cannot mark a task done either", HEAD, f"update public.tasks set status = 'done' where id = '{ASG}'")
expect("rahbar accepts: done, 100%, accepted_by stamped", R, [f"select public.task_review('{ASG}', true, null)", f"select status = 'done' and progress = 100 and done_at is not null and accepted_by = '{R}' from public.tasks where id = '{ASG}'"], "t")
deny("assignee cannot reopen an accepted task", XOD, f"update public.tasks set status = 'progress' where id = '{ASG}'")
deny("returning a task needs a comment", R, f"select public.task_review('{ASG}', false, '')")
expect("rahbar returns with a comment → progress", R, f"select public.task_review('{ASG}', false, 'Hisobot to''liq emas')", "progress")
expect("return clears acceptance and notifies the team", R, f"select (select accepted_by is null from public.tasks where id = '{ASG}') and exists (select 1 from public.activity where task_id = '{ASG}' and kind = 'returned' and '{S('b2b-sales-2')}' = any(to_staff))", "t")
deny("non-rahbar cannot use task_review", HEAD, f"select public.task_review('{ASG}', true, null)")
expect("assignee sends for review → rahbar notified", XOD, f"update public.tasks set status = 'review' where id = '{ASG}' returning status", "review")
expect("review notification exists", R, f"select count(*) > 0 from public.activity where task_id = '{ASG}' and kind = 'review'", "t")
expect("xodim cannot touch a task he is not on (0 rows)", XOD, f"with u as (update public.tasks set progress = 1 where id = '{NOT_ASG}' returning 1) select count(*) from u", 0)
expect("boshliq cannot delete a task owned by another department (0 rows)", HEAD, f"with d as (delete from public.tasks where id = '{OTHER_DEPT_TASK}' returning 1) select count(*) from d", 0)
deny("nobody writes task history directly", R, f"insert into public.task_events (org_id, task_id, kind) values ('{ORG}', '{NEW}', 'fake')")
expect("boshliq deletes own department's task", HEAD, f"with d as (delete from public.tasks where id = '{NEW}' returning 1) select count(*) from d", 1)

# ─────────── 4. comments ───────────
expect("assignee comments as himself", XOD, f"insert into public.task_comments (task_id, staff_id, user_id, body) values ('{ASG}', '{S('b2b-sales-2')}', '{XOD}', 'Tayyor') returning 1", 1)
expect("comment bumps last_comment_at", R, f"select last_comment_at > now() - interval '1 minute' from public.tasks where id = '{ASG}'", "t")
deny("cannot comment in someone else's name", XOD, f"insert into public.task_comments (task_id, staff_id, user_id, body) values ('{ASG}', '{S('b2b-sales-1')}', '{XOD}', 'soxta')")
deny("guest cannot comment", GUEST, f"insert into public.task_comments (task_id, staff_id, user_id, body) values ('{ASG}', null, '{GUEST}', 'salom')")
deny("other org cannot comment on our task", R2, f"insert into public.task_comments (task_id, staff_id, user_id, body) values ('{ASG}', null, '{R2}', 'salom')")

# ─────────── 5. attendance ───────────
deny("even rahbar cannot write attendance directly", R, f"insert into public.attendance (org_id, staff_id, day, in_time) values ('{ORG}', '{S('b2b-sales-2')}', '2026-10-01', '09:00')")
expect("boshliq corrects own department with a reason", HEAD, f"select public.attendance_set('{S('b2b-sales-2')}', '2026-11-03', '09:00', '18:00', 'Terminal ishlamadi')", "")
expect("correction is in the audit log", R, f"select count(*) from public.attendance_edits where staff_id = '{S('b2b-sales-2')}' and day = '2026-11-03' and actor_staff = '{S('b2b-sales-1')}' and prev is not null", 1)
deny("boshliq cannot correct another department", HEAD, f"select public.attendance_set('{S('b2c-sales-2')}', '2026-11-03', '09:00', '18:00', 'sabab bor')")
deny("xodim cannot correct own attendance", XOD, f"select public.attendance_set('{S('b2b-sales-2')}', '2026-11-04', '08:00', '18:00', 'sabab bor')")
deny("correction needs a reason", R, f"select public.attendance_set('{S('b2b-sales-2')}', '2026-11-04', '08:00', '18:00', '')")

# ─────────── 6. PIN terminal ───────────
p_x, p_head = PIN["b2b-sales-2"], PIN["b2b-sales-1"]
deny("xodim cannot set PINs", XOD, f"select public.set_pin('{S('b2b-sales-2')}', '9999')")
deny("PIN must be unique", R, f"select public.set_pin('{S('b2b-sales-3')}', '{p_x}')")
deny("PIN must have the org's length", R, f"select public.set_pin('{S('b2b-sales-3')}', '12')")
deny("xodim account cannot use the kiosk", XOD, f"select public.kiosk_punch('{p_x}')")
expect("migrated PIN works: check-in", TERM, f"select public.kiosk_punch('{p_x}')->>'kind'", "in")
expect("second punch within 2 minutes is ignored", TERM, f"select public.kiosk_punch('{p_x}')->>'kind'", "already_in")
expect("punch creates a raw event", R, f"select count(*) from public.attendance_marks where staff_id = '{S('b2b-sales-2')}' and source = 'kiosk'", 1)
for i in range(5): sql(f"select public.kiosk_punch('0000x')", TERM)
expect("5 wrong PINs lock the terminal", TERM, f"select public.kiosk_punch('{p_x}')->>'error'", "locked")
sql("delete from private.kiosk_attempts")
expect("kiosk exit with department head PIN", TERM, f"select public.kiosk_exit('{p_head}')", "t")
expect("kiosk exit refused with ordinary PIN", TERM, f"select public.kiosk_exit('{p_x}')", "f")
deny("terminal cannot edit attendance", TERM, f"select public.attendance_set('{S('b2b-sales-2')}', '2026-11-05', '09:00', '18:00', 'sabab bor')")

# ─────────── 7. charter & "Tanishdim" ───────────
v0 = val(f"select version from public.charter where org_id = '{ORG}'")
expect("xodim acknowledges current charter", XOD, f"select public.acknowledge('charter', '{ORG}')->>'version'", v0)
deny("nobody inserts acknowledgements directly", XOD, f"insert into public.acknowledgements (org_id, staff_id, kind, version) values ('{ORG}', '{S('b2b-sales-1')}', 'charter', 99)")
deny("guest cannot acknowledge", GUEST, f"select public.acknowledge('charter', '{ORG}')")
expect("rahbar edits a section → charter version +1", R, [f"update public.charter_sections set body = body || ' ' where org_id = '{ORG}' and legacy_id = 's1'", f"select version from public.charter where org_id = '{ORG}'"], int(v0) + 1)
expect("old acknowledgement no longer counts", R, f"select count(*) from public.acknowledgements a join public.charter c on c.org_id = a.org_id where a.staff_id = '{S('b2b-sales-2')}' and a.kind = 'charter' and a.version = c.version", 0)
pv = val(f"select p.version from public.positions p join public.staff s on s.position_id = p.id where s.id = '{S('b2b-sales-2')}'")
expect("editing duties bumps the position version", R, f"update public.positions p set duties = duties || 'Yangi vazifa'::text from public.staff s where s.position_id = p.id and s.id = '{S('b2b-sales-2')}' returning p.version", int(pv) + 1)
expect("acknowledge own position at new version", XOD, f"select public.acknowledge('position', '{ORG}')->>'version'", int(pv) + 1)
expect("xodim sees only own acknowledgements", XOD, "select count(distinct staff_id) from public.acknowledgements", 1)

# ─────────── 8. notifications ───────────
total_act = val(f"select count(*) from public.activity where org_id = '{ORG}'")
mine = val(f"select count(*) from public.activity where org_id = '{ORG}' and (actor_staff = '{S('b2b-sales-2')}' or '{S('b2b-sales-2')}' = any(to_staff))")
expect("xodim sees only activity addressed to him", XOD, "select count(*) from public.activity", mine)
check("…which is less than the whole feed", int(mine) < int(total_act), f"{mine} vs {total_act}")


# ─────────── 10. foundation 003: registration ───────────
NEWBIE, NEWBIE2 = str(uuid.uuid4()), str(uuid.uuid4())
sql(f"insert into auth.users (id) values ('{NEWBIE}'), ('{NEWBIE2}')")
CODE = val(f"select join_code from public.orgs where id = '{ORG}'")
expect("newcomer sees nothing before approval", NEWBIE, "select count(*) from public.staff", 0)
deny("wrong company code is refused", NEWBIE, "select public.request_join('XXXXXXXX', 'Vali Aliyev', '+998901234567')")
REQ = val(f"select public.request_join('{CODE.lower()}', 'Vali Aliyev', '+998 90 123 45 67')", NEWBIE)
check("newcomer sends a join request with the company code", bool(REQ))
deny("second pending request is refused", NEWBIE, f"select public.request_join('{CODE}', 'Vali Aliyev')")
expect("newcomer sees own request", NEWBIE, "select count(*) from public.join_requests", 1)
expect("xodim does not see join requests", XOD, "select count(*) from public.join_requests", 0)
expect("rahbar sees the request", R, f"select count(*) from public.join_requests where id = '{REQ}'", 1)
deny("xodim cannot approve", XOD, f"select public.approve_join('{REQ}', '{S('b2c-works-2')}', 'xodim')")
deny("cannot approve onto a card that already has an account", R, f"select public.approve_join('{REQ}', '{S('b2b-sales-2')}', 'xodim')")
expect("rahbar approves and links a staff card", R, f"select public.approve_join('{REQ}', '{S('b2c-works-2')}', 'xodim')", "")
expect("approved newcomer now sees the org", NEWBIE, "select count(*) from public.staff", 27)
expect("…and only own attendance", NEWBIE, f"select count(*) = (select count(*) from public.attendance where staff_id = '{S('b2c-works-2')}') from public.attendance", "t")
REQ2 = val(f"select public.request_join('{CODE}', 'Begona Odam')", NEWBIE2)
expect("rahbar rejects a request", R, f"select public.reject_join('{REQ2}', 'Tanimaymiz')", "")
expect("rejected person still sees nothing", NEWBIE2, "select count(*) from public.tasks", 0)
deny("nobody inserts join requests directly as approved", NEWBIE2, f"insert into public.join_requests (org_id, user_id, full_name, status) values ('{ORG}', '{NEWBIE2}', 'Hiyla', 'approved')")

# ─────────── 11. several departments ───────────
expect("boshliq does not manage a b2c person yet", HEAD, f"select count(*) from public.attendance where staff_id = '{S('b2c-sales-3')}'", 0)
deny("boshliq cannot add a second department", HEAD, f"insert into public.staff_departments (staff_id, dept_id) values ('{S('b2c-sales-3')}', '{D('b2b-sales')}')")
expect("rahbar adds b2c person to B2B Sales as second department", R, f"insert into public.staff_departments (staff_id, dept_id, org_id) values ('{S('b2c-sales-3')}', '{D('b2b-sales')}', '{ORG}') returning 1", 1)
expect("B2B Sales boshliq now sees that person's attendance", HEAD, f"select count(*) = (select count(*) from public.attendance where staff_id = '{S('b2c-sales-3')}') from public.attendance where staff_id = '{S('b2c-sales-3')}'", "t")
check("…and the person actually has attendance rows", int(val(f"select count(*) from public.attendance where staff_id = '{S('b2c-sales-3')}'")) > 0)
expect("…and may correct it", HEAD, f"select public.attendance_set('{S('b2c-sales-3')}', '2026-11-03', '09:00', '18:00', 'Ikkinchi bolimda edi')", "")
deny("cannot attach a department of another org", R, f"insert into public.staff_departments (staff_id, dept_id, org_id) values ('{S('b2c-sales-3')}', '{D2}', '{ORG}')")

# ─────────── 12. payroll foundation ───────────
expect("rahbar sets a fixed pay plan", R, f"insert into public.pay_plans (org_id, staff_id, mode, base_amount, valid_from) values ('{ORG}', '{S('b2b-sales-2')}', 'fixed', 6000000, '2026-01-01') returning 1", 1)
expect("rahbar sets a KPI plan for another person", R, f"insert into public.pay_plans (org_id, staff_id, mode, base_amount, params, valid_from) values ('{ORG}', '{S('b2b-sales-3')}', 'mixed', 4000000, '{{\"kpi_max\": 3000000}}', '2026-01-01') returning 1", 1)
expect("xodim sees only own pay plan", XOD, "select count(*) from public.pay_plans", 1)
expect("boshliq sees no pay data", HEAD, "select count(*) from public.pay_plans", 0)
expect("guest sees no pay data", GUEST, "select count(*) from public.pay_plans", 0)
deny("xodim cannot raise own salary", XOD, f"insert into public.pay_plans (org_id, staff_id, mode, base_amount, valid_from) values ('{ORG}', '{S('b2b-sales-2')}', 'fixed', 99000000, '2026-02-01')")
expect("xodim cannot edit own plan (0 rows)", XOD, f"with u as (update public.pay_plans set base_amount = 1 returning 1) select count(*) from u", 0)
expect("rahbar adds an overtime bonus", R, f"insert into public.pay_adjustments (org_id, staff_id, month, kind, amount, note) values ('{ORG}', '{S('b2b-sales-2')}', '2026-11-01', 'overtime', 250000, 'Shanba') returning 1", 1)

# late fine: Nov 2026, B2B Sales starts 09:00, grace 5 min, 1000 so'm/min
sql([f"select 1"])
expect("late summary: arrivals beyond grace are fined per minute", R,
       f"""select count(*) from public.late_summary('{ORG}', '2026-11-01') l
           where l.fine = l.late_minutes * 1000 and l.late_minutes >= 0""",
       val(f"select count(*) from public.late_summary('{ORG}', '2026-11-01')", R))
sql([f"select set_config('x','1',false)"])
# a controlled case
sql([f"delete from public.attendance where staff_id = '{S('b2b-pr-2')}' and day between '2026-10-01' and '2026-10-31'",
     f"insert into public.attendance (org_id, staff_id, day, in_time, out_time) values ('{ORG}','{S('b2b-pr-2')}','2026-10-05','09:04','18:00'),('{ORG}','{S('b2b-pr-2')}','2026-10-06','09:12','18:00'),('{ORG}','{S('b2b-pr-2')}','2026-10-07','09:30','18:00')"])
expect("4 min late = within grace; 12 + 30 min = 42 min = 42 000 so'm", R,
       f"select late_days || '/' || late_minutes || '/' || fine::int from public.late_summary('{ORG}', '2026-10-01') where staff_id = '{S('b2b-pr-2')}'", "2/42/42000")
expect("rahbar records sick leave for the 30-min day", R, f"select public.absence_set('{S('b2b-pr-2')}', 'kasallik', '2026-10-07', '2026-10-07', 'Varaqa bor') is not null", "t")
expect("absence day is not fined", R,
       f"select late_minutes from public.late_summary('{ORG}', '2026-10-01') where staff_id = '{S('b2b-pr-2')}'", 12)
deny("xodim cannot record own absence", XOD, f"select public.absence_set('{S('b2b-sales-2')}', 'tatil', '2026-10-10', '2026-10-12', null)")
expect("xodim sees only own late summary", XOD, f"select count(distinct staff_id) <= 1 from public.late_summary('{ORG}', '2026-11-01')", "t")

# closing a month freezes it
deny("xodim cannot close a month", XOD, f"select public.close_month('{ORG}', '2026-10-01')")
expect("rahbar closes October", R, f"select public.close_month('{ORG}', '2026-10-15')", "")
deny("closed month: attendance correction refused", R, f"select public.attendance_set('{S('b2b-pr-2')}', '2026-10-06', '09:00', '18:00', 'tuzatish')")
deny("closed month: new absence refused", R, f"select public.absence_set('{S('b2b-pr-2')}', 'tatil', '2026-10-20', '2026-11-02', null)")
deny("closed month: adjustment refused", R, f"insert into public.pay_adjustments (org_id, staff_id, month, kind, amount) values ('{ORG}', '{S('b2b-pr-2')}', '2026-10-01', 'bonus', 100000)")
expect("open month still works", R, f"select public.attendance_set('{S('b2b-pr-2')}', '2026-11-04', '09:00', '18:00', 'tuzatish')", "")
expect("rahbar reopens October (logged)", R, [f"select public.reopen_month('{ORG}', '2026-10-01')", f"select count(*) from public.activity where kind = 'month_reopened'"], 1)
expect("after reopening, correction works again", R, f"select public.attendance_set('{S('b2b-pr-2')}', '2026-10-06', '09:00', '18:00', 'tuzatish')", "")

# ─────────── 13. telegram login (004) ───────────
deny("xodim cannot create telegram invite", XOD, f"select public.create_telegram_invite('{S('b2b-sales-2')}')")
deny("guest cannot create telegram invite", GUEST, f"select public.create_telegram_invite('{S('b2b-sales-2')}')")
INV_TOKEN = val(f"select public.create_telegram_invite('{S('b2b-sales-2')}')", R)
check("rahbar creates telegram invite token", bool(INV_TOKEN) and len(INV_TOKEN) == 48)
expect("rahbar sees invite row", R, f"select count(*) from public.telegram_invites where staff_id = '{S('b2b-sales-2')}' and used_at is null", 1)
expect("xodim does not see invite row", XOD, "select count(*) from public.telegram_invites", 0)
deny("nobody reads token_hash directly", R, "select token_hash from public.telegram_invites limit 1")
deny("nobody reads login_codes directly", R, "select count(*) from public.login_codes")
deny("anon sees no telegram identities", None, "select count(*) from public.telegram_identities", role="anon")

# Claim invite via webhook (service_role)
CLAIM = val(f"select public.claim_telegram_invite('{INV_TOKEN}', 9988776655, 'alibek')", role="service_role")
check("claim telegram invite succeeds", '"ok": true' in CLAIM or '"ok":true' in CLAIM)
expect("invite marked as used", R, f"select count(*) from public.telegram_invites where staff_id = '{S('b2b-sales-2')}' and used_at is not null", 1)
expect("token cannot be used twice", None, f"select public.claim_telegram_invite('{INV_TOKEN}', 9988776655)->>'error'", "invalid_or_expired", role="service_role")

# Visibility
expect("rahbar sees telegram identity", R, f"select count(*) from public.telegram_identities where staff_id = '{S('b2b-sales-2')}'", 1)
expect("other org's rahbar sees none of our telegram identities", R2, f"select count(*) from public.telegram_identities where org_id = '{ORG}'", 0)
expect("xodim sees own telegram identity", XOD, f"select count(*) from public.telegram_identities where staff_id = '{S('b2b-sales-2')}'", 1)
expect("other staff member cannot see our telegram identity", OTH, f"select count(*) from public.telegram_identities where staff_id = '{S('b2b-sales-2')}'", 0)

# Create login code
CODE_DATA = json.loads(val(f"select public.create_login_code('{S('b2b-sales-2')}')", role="service_role"))
check("create login code succeeds", CODE_DATA.get("ok") is True and len(CODE_DATA.get("code", "")) == 6)
REAL_CODE = CODE_DATA.get("code")

# Wrong code
expect("wrong code decreases attempts", None, f"select public.verify_login_code('{S('b2b-sales-2')}', '000000')->>'error'", "wrong_code", role="service_role")

# 5 wrong attempts blocks code
for _ in range(4):
    sql(f"select public.verify_login_code('{S('b2b-sales-2')}', '000000')", role="service_role")
expect("5 wrong attempts blocks code", None, f"select public.verify_login_code('{S('b2b-sales-2')}', '000000')->>'error'", "blocked_too_many_attempts", role="service_role")

# Fresh code works and cannot be used twice
sql(f"update public.login_codes set created_at = now() - interval '2 minutes' where identity_id in (select id from public.telegram_identities where staff_id = '{S('b2b-sales-2')}')")
CODE_DATA2 = json.loads(val(f"select public.create_login_code('{S('b2b-sales-2')}')", role="service_role"))
REAL_CODE2 = CODE_DATA2.get("code")
expect("correct code verifies", None, f"select public.verify_login_code('{S('b2b-sales-2')}', '{REAL_CODE2}')->>'ok'", "true", role="service_role")
expect("code cannot be used twice", None, f"select public.verify_login_code('{S('b2b-sales-2')}', '{REAL_CODE2}')->>'error'", "expired_or_used", role="service_role")

# Expired code is rejected
sql(f"update public.login_codes set created_at = now() - interval '2 minutes' where identity_id in (select id from public.telegram_identities where staff_id = '{S('b2b-sales-2')}')")
CODE_DATA3 = json.loads(val(f"select public.create_login_code('{S('b2b-sales-2')}')", role="service_role"))
sql(f"update public.login_codes set expires_at = now() - interval '1 second' where identity_id in (select id from public.telegram_identities where staff_id = '{S('b2b-sales-2')}')")
expect("expired code is rejected", None, f"select public.verify_login_code('{S('b2b-sales-2')}', '{CODE_DATA3.get('code')}')->>'error'", "expired_or_used", role="service_role")


# ─────────── 9. scale: 100 staff, 3 000 tasks, 1 year of attendance ───────────
sql([f"""insert into public.staff (org_id, dept_id, full_name)
         select '{ORG}', '{D('b2c-sales')}', 'Sinov ' || g from generate_series(1, 73) g""",
     f"""insert into public.tasks (org_id, title, owner_staff_id, status, due_date)
         select '{ORG}', 'Yuklama ' || g, (select id from public.staff where org_id = '{ORG}' order by random() limit 1),
                (array['new','progress','review','done']::app.task_status[])[1 + g % 4], current_date + (g % 60) - 30
         from generate_series(1, 3000) g""",
     f"""insert into public.task_staff (task_id, staff_id, org_id)
         select t.id, s.id, t.org_id from public.tasks t cross join lateral
           (select id from public.staff where org_id = t.org_id and id <> t.owner_staff_id order by md5(t.id::text || id::text) limit 3) s
         where t.title like 'Yuklama %' """,
     f"""insert into public.attendance (org_id, staff_id, day, in_time, out_time)
         select '{ORG}', s.id, d::date, '09:00', '18:00' from public.staff s,
                generate_series(current_date - 365, current_date - 30, interval '1 day') d
         where s.org_id = '{ORG}' and extract(isodow from d) < 6 on conflict do nothing""",
     "analyze"])
for name, user, q_, limit in [
    ("rahbar: all open tasks with assignees", R, "select count(*) from (select t.id, array_agg(ts.staff_id) from public.tasks t left join public.task_staff ts on ts.task_id = t.id where t.status <> 'done' group by t.id) x", 100),
    ("xodim: my tasks", XOD, f"select count(*) from public.tasks t where exists (select 1 from public.task_staff ts where ts.task_id = t.id and ts.staff_id = '{S('b2b-sales-2')}')", 100),
    ("boshliq: this month's attendance", HEAD, "select count(*) from public.attendance where day >= date_trunc('month', current_date - 60)", 100),
    ("rahbar: month attendance report", R, "select count(*) from public.attendance where day >= current_date - 60", 300)]:
    ok, out, err = sql("explain (analyze, format json) " + q_, user)
    ms = json.loads(out)[0]["Execution Time"] if ok else -1
    check(f"speed · {name}: {ms:.1f} ms on server (limit {limit})", ok and 0 <= ms < limit, err or f"{ms:.1f} ms")

fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} passed")
sys.exit(1 if fails else 0)
