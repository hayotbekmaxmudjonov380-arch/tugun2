"""Starting data for Tugun (v3 data model): structure + clearly-marked sample staff, tasks with one owner each,
day-per-document attendance captured at the terminal, comments, activity feed and demo PIN hashes."""
import json, random, datetime, hashlib

SRC = json.load(open("/home/claude/jamoa-test/seed.json"))   # v2 sample data (same people, tasks, attendance)
TODAY = datetime.date(2026, 11, 10)
SALT = "tugun-namuna-7f3a"

org = SRC["org/structure"]
org["settings"] = {"grace": 5, "workDays": [1, 2, 3, 4, 5], "pinLen": 4, "maxStaff": 100}
# department heads = first person of each department (also stated in their job title)
for did, d in org["departments"].items():
    d["headId"] = f"{did}-1"
for pid, p in org["staff"].items():
    p["access"] = "xodim"

# demo PINs 1001.. in board order
branch_order = sorted(org["branches"], key=lambda b: org["branches"][b]["order"])
ordered = []
for b in branch_order:
    for did in sorted([k for k, v in org["departments"].items() if v["branch"] == b], key=lambda k: org["departments"][k]["order"]):
        ordered += sorted([k for k, v in org["staff"].items() if v["deptId"] == did], key=lambda k: org["staff"][k]["order"])
pins = {pid: hashlib.sha256(f"{SALT}:{1001 + i}".encode()).hexdigest() for i, pid in enumerate(ordered)}
secure = {"salt": SALT, "len": 4, "pins": pins, "demo": True}

owners = {
    "t-tender": "b2b-b2g-1", "t-material": "b2b-supplies-1", "t-reklama": "b2b-pr-1", "t-skript": "b2c-operators-1",
    "t-tom": "b2c-works-2", "t-xavfsizlik": "b2b-bluecoll-1", "t-taqdimot": "b2b-sales-1", "t-crm": "b2c-sales-2",
    "t-smeta": "b2c-works-3",
}
docs = {"org/structure": org, "secure/pins": secure}
for key, t in SRC.items():
    if not key.startswith("tasks/"):
        continue
    tid = key.split("/")[1]
    t = dict(t)
    t["ownerId"] = owners[tid]
    if t["ownerId"] not in t["staffIds"]:
        t["staffIds"] = [t["ownerId"]] + t["staffIds"]
    od = org["staff"][t["ownerId"]]["deptId"]
    if od not in t["deptIds"]:
        t["deptIds"] = [od] + t["deptIds"]
    # a task cannot be created in the future; t-smeta's creation matches its feed event
    if t["createdAt"][:10] > "2026-11-10":
        t["createdAt"] = "2026-11-09T09:00:00.000Z"
    if tid == "t-smeta":
        t["createdAt"] = "2026-11-10T05:30:00.000Z"
    if t["updatedAt"] < t["createdAt"]:
        t["updatedAt"] = t["createdAt"]
    hist = {"h1": {"t": t["createdAt"], "by": t["ownerId"], "k": "create", "txt": "taskni yaratdi"}}
    if t["status"] in ("progress", "review", "done"):
        hist["h2"] = {"t": t["start"] + "T10:30:00.000Z", "by": t["ownerId"], "k": "status", "txt": "holatni «Jarayonda» qildi"}
    if t["status"] == "review":
        hist["h3"] = {"t": "2026-11-08T12:10:00.000Z", "by": t["ownerId"], "k": "status", "txt": "holatni «Tekshiruvda» qildi"}
    if t["status"] == "done":
        hist["h3"] = {"t": t["doneAt"] + "T16:00:00.000Z", "by": t["ownerId"], "k": "status", "txt": "holatni «Bajarildi» qildi"}
    t["history"] = hist
    t["files"] = {}
    docs[key] = t

comments = {
    "tasks/t-tender/comments/c1": {"text": "Moliyaviy hujjatlar tayyor, texnik qismi qoldi. Juma kuni topshiramiz.", "staffId": "b2b-b2g-2", "uid": "", "t": "2026-11-09T11:20:00.000Z"},
    "tasks/t-tender/comments/c2": {"text": "Narxlar jadvalini Supplies'dan bugun kutyapmiz.", "staffId": "b2b-b2g-1", "uid": "", "t": "2026-11-10T06:40:00.000Z"},
    "tasks/t-skript/comments/c1": {"text": "Skript tayyor, rahbar tasdig'ini kutyapti. Muddat o'tib ketdi, tezlashtirish kerak.", "staffId": "b2c-operators-1", "uid": "", "t": "2026-11-09T09:15:00.000Z"},
    "tasks/t-material/comments/c1": {"text": "2-reys ertaga ertalab 9:00 da chiqadi.", "staffId": "b2b-supplies-3", "uid": "", "t": "2026-11-10T07:05:00.000Z"},
}
docs.update(comments)
docs["tasks/t-tender"]["lastCommentAt"] = "2026-11-10T06:40:00.000Z"
docs["tasks/t-skript"]["lastCommentAt"] = "2026-11-09T09:15:00.000Z"
docs["tasks/t-material"]["lastCommentAt"] = "2026-11-10T07:05:00.000Z"

# attendance: one document per day
att = SRC["attendance/2026-11"]["days"]
for day, recs in att.items():
    out = {}
    for pid, r in recs.items():
        rr = dict(r); rr["src"] = "kiosk"
        out[pid] = rr
    docs[f"att/{day}"] = {"day": day, "month": day[:7], "recs": out, "demo": True}
# one transparent manual correction, as an example of the edit trail
e = docs["att/2026-11-09"]["recs"]["b2b-supplies-2"]
e["edits"] = {"e1": {"t": "2026-11-09T13:05:00.000Z", "by": "rahbar", "f": "in", "prev": {"in": "", "out": ""}, "next": {"in": "09:20", "out": e.get("out", "")}, "why": "Terminalda belgilashni unutgan"}}
e["src"] = "manual"

# activity feed (today and yesterday)
docs["activity/2026-11-09"] = {"day": "2026-11-09", "demo": True, "events": {
    "a1": {"t": "2026-11-09T09:15:00.000Z", "by": "b2c-operators-1", "k": "comment", "task": "t-skript", "txt": "izoh qoldirdi: «Qo'ng'iroqlar skriptini yangilash»", "to": ["b2c-operators-2", "b2c-sales-1"], "dept": ["b2c-operators", "b2c-sales"]},
    "a2": {"t": "2026-11-09T11:20:00.000Z", "by": "b2b-b2g-2", "k": "comment", "task": "t-tender", "txt": "izoh qoldirdi: «Davlat tenderi hujjatlarini topshirish»", "to": ["b2b-b2g-1", "b2b-sales-1", "b2b-supplies-2"], "dept": ["b2b-b2g", "b2b-sales", "b2b-supplies"]},
    "a3": {"t": "2026-11-09T13:05:00.000Z", "by": "rahbar", "k": "att", "txt": "Malika Ergasheva davomatini tuzatdi (09-noyabr): terminalda belgilashni unutgan", "to": ["b2b-supplies-2"], "dept": ["b2b-supplies"]},
    "a4": {"t": "2026-11-09T15:40:00.000Z", "by": "b2c-sales-2", "k": "create", "task": "t-crm", "txt": "yangi task yaratdi: «Mijozlar bazasini tartibga solish»", "to": ["b2c-sales-3", "b2c-operators-3"], "dept": ["b2c-sales", "b2c-operators"]},
}}
docs["activity/2026-11-10"] = {"day": "2026-11-10", "demo": True, "events": {
    "a1": {"t": "2026-11-10T06:40:00.000Z", "by": "b2b-b2g-1", "k": "comment", "task": "t-tender", "txt": "izoh qoldirdi: «Davlat tenderi hujjatlarini topshirish»", "to": ["b2b-b2g-2", "b2b-sales-1", "b2b-supplies-2"], "dept": ["b2b-b2g", "b2b-sales", "b2b-supplies"]},
    "a2": {"t": "2026-11-10T07:05:00.000Z", "by": "b2b-supplies-3", "k": "comment", "task": "t-material", "txt": "izoh qoldirdi: «2-obyektga materiallar yetkazish»", "to": ["b2b-supplies-1", "b2b-bluecoll-1", "b2c-works-1"], "dept": ["b2b-supplies", "b2b-bluecoll", "b2c-works"]},
    "a3": {"t": "2026-11-10T05:30:00.000Z", "by": "b2c-works-3", "k": "create", "task": "t-smeta", "txt": "yangi task yaratdi: «Smeta va narxlarni kelishish»", "to": ["b2c-sales-1", "b2b-supplies-1"], "dept": ["b2c-works", "b2c-sales", "b2b-supplies"]},
    "a4": {"t": "2026-11-10T08:15:00.000Z", "by": "b2c-works-2", "k": "progress", "task": "t-tom", "txt": "bajarilishni 40% ga yetkazdi: «Obyektda tom yopish ishlari»", "to": ["b2c-worker-1", "b2c-worker-2", "b2b-bluecoll-2", "b2b-bluecoll-3"], "dept": ["b2c-works", "b2c-worker", "b2b-bluecoll"]},
}}

# nizom, lavozim yo'riqnomalari va «Tanishdim» tasdiqlari
import sys; sys.path.insert(0, "/home/claude/tugun")
import make_nizom as NZ
for sid, pid in NZ.STAFF_POS.items():
    org["staff"][sid]["posId"] = pid
docs["docs/nizom"] = NZ.nizom_doc()
docs["docs/lavozimlar"] = NZ.positions_doc()
docs.update(NZ.demo_acks())

json.dump(docs, open("/home/claude/tugun/seed.json", "w"), ensure_ascii=False)
ops = [{"op": "set", "path": k, "data": v} for k, v in docs.items()]
json.dump(ops, open("/home/claude/tugun/ops.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(docs), "docs;", sum(len(json.dumps(v)) for v in docs.values()), "bytes; demo PIN 1001 =", ordered[0], org["staff"][ordered[0]]["name"])
