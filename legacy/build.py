"""Build dist/index.html: shell + CSS + JS modules (in file-name order) + demo seed."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)

modules = sorted((SRC / "js").glob("*.js"))
js = "\n".join(m.read_text(encoding="utf-8") for m in modules)
seed = json.loads((ROOT / "seed.json").read_text(encoding="utf-8"))
seed_js = json.dumps(seed, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
seed_js = seed_js.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
assert js.count("/*__SEED__*/null") == 1, "seed placeholder missing"
js = js.replace("/*__SEED__*/null", seed_js)
js = '(() => {\n"use strict";\n' + js + "\n})();"
assert "</script" not in js.lower(), "script terminator inside JS"

css = (SRC / "style.css").read_text(encoding="utf-8") + "\n" + (SRC / "tugun.css").read_text(encoding="utf-8")
shell = (SRC / "shell.html").read_text(encoding="utf-8")
assert shell.count("/*__CSS__*/") == 1 and shell.count("/*__JS__*/") == 1
html = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)

(DIST / "index.html").write_text(html, encoding="utf-8")
(DIST / "app.js").write_text(js, encoding="utf-8")  # for syntax checks only
print(f"dist/index.html: {len(html.encode('utf-8')):,} bytes ({len(modules)} modules)")
if "--check" in sys.argv:
    import subprocess
    r = subprocess.run(["node", "--check", str(DIST / "app.js")], capture_output=True, text=True)
    print("node --check:", "OK" if r.returncode == 0 else r.stderr)
    sys.exit(r.returncode)
